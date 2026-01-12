import os
import re
import asyncio
import httpx
from typing import Optional, List, Dict, Tuple
from lib.embedding_utils import generate_query_embedding, get_http_client
from lib.vector_search import search_products_by_embedding
import hashlib
from datetime import datetime

# ============================================================================
# CONFIGURATION
# ============================================================================
MAX_HISTORY_LENGTH = int(os.getenv('CONVO_HISTORY_LENGTH', '20'))  # Optimized for speed
PRODUCT_LIMIT = int(os.getenv('PRODUCT_LIMIT', '3'))
LLM_MAX_RETRIES = 1
LLM_RETRY_DELAY = 0.1  # Reduced for faster retries
LLM_TIMEOUT = 6.0  # Optimized: reduced from 7.0s for faster responses

# Response cache
response_cache = {}
CACHE_EXPIRY_MINUTES = 10

# ============================================================================
# CONVERSATION HISTORY MANAGEMENT
# ============================================================================

conversation_history: Dict[str, List[Dict]] = {}

def get_conversation_history(userId: str) -> List[Dict]:
    """Get conversation history for a user."""
    return conversation_history.get(userId, [])

def add_to_conversation_history(userId: str, role: str, content: str):
    """Add a message to conversation history."""
    if userId not in conversation_history:
        conversation_history[userId] = []
    
    conversation_history[userId].append({"role": role, "content": content})
    
    # Keep only last MAX_HISTORY_LENGTH exchanges
    if len(conversation_history[userId]) > MAX_HISTORY_LENGTH * 2:
        conversation_history[userId] = conversation_history[userId][-(MAX_HISTORY_LENGTH * 2):]

def clear_conversation_history(userId: str):
    """Clear conversation history for a user."""
    if userId in conversation_history:
        del conversation_history[userId]


def extract_context_summary(history: List[Dict], cart_items: List[dict]) -> str:
    """Create a concise context summary for the LLM."""
    if not history:
        return "First interaction with customer."
    
    summary = []
    
    # Conversation count
    if len(history) > 3:
        summary.append(f"{len(history)//2} previous queries")
    
    # Cart analysis
    if cart_items:
        total_items = sum(item.get('quantity', 1) for item in cart_items)
        summary.append(f"{total_items} items in cart")
    
    return " | ".join(summary) if summary else "New customer"


def build_smart_history_context(history: List[Dict]) -> str:
    """
    Build context-aware conversation history for LLM.
    Uses ChatGPT-style intelligent compression:
    - Recent 4 messages: Full detail
    - Messages 5-10: Compressed/summarized
    - Messages 11+: Key decisions/preferences only
    """
    if not history:
        return ""
    
    context = []
    total_messages = len(history)
    
    # Determine which messages get full vs compressed detail
    recent_threshold = min(4, total_messages)  # Last 4 are always full detail
    compressed_threshold = min(10, total_messages)  # Next 6 are compressed
    
    # Build compressed section for older messages (if any)
    if total_messages > recent_threshold:
        older_messages = history[:-recent_threshold]
        
        # Extract key themes from older messages
        older_user_msgs = [msg['content'] for msg in older_messages if msg['role'] == 'user']
        older_assistant_msgs = [msg['content'] for msg in older_messages if msg['role'] == 'assistant']
        
        if older_user_msgs or older_assistant_msgs:
            context.append("## Earlier Conversation Summary")
            context.append(f"(Compressed from {len(older_messages)} earlier messages)")
            
            # Extract key decision points
            key_decisions = []
            for msg in older_messages:
                content = msg['content']
                if 'add' in content.lower() and 'cart' in content.lower():
                    key_decisions.append(f"✓ Added items to cart")
                if 'remove' in content.lower() or 'don\'t' in content.lower():
                    key_decisions.append(f"✗ Rejected items")
                if 'compare' in content.lower():
                    key_decisions.append(f"⚖ Compared products")
            
            if key_decisions:
                # Remove duplicates while preserving order
                unique_decisions = []
                for decision in key_decisions:
                    if decision not in unique_decisions:
                        unique_decisions.append(decision)
                context.append("Key Actions: " + ", ".join(unique_decisions[:3]))
            
            # Summarize topics discussed
            topics = []
            for msg in older_user_msgs:
                # Extract product/category mentions
                words = msg.lower().split()
                for word in ['dress', 'shirt', 'shoes', 'pants', 'jacket', 'coat', 'accessory', 'jewelry']:
                    if word in words and word not in topics:
                        topics.append(word)
            
            if topics:
                context.append(f"Topics discussed: {', '.join(topics[:5])}")
            
            context.append("")  # Blank line separator
    
    # Add recent messages in full detail (most recent are most important)
    recent_messages = history[-recent_threshold:]
    context.append("## Recent Conversation (Full Detail)")
    for msg in recent_messages:
        role = "Customer" if msg["role"] == "user" else "Assistant"
        content = msg['content']
        # Truncate extremely long messages but keep them readable
        if len(content) > 300:
            content = content[:297] + "..."
        context.append(f"{role}: {content}")
    
    return "\n".join(context)


def extract_mentioned_products(history: List[Dict]) -> List[str]:
    """
    Extract product names/types mentioned in previous messages.
    Helps understand what products user has already seen/rejected.
    """
    mentioned = []
    product_markers = ['product', 'item', 'dress', 'shoe', 'shirt', 'pants', 'jacket', 'coat', 'bag']
    
    for msg in history:
        content = msg.get('content', '')
        # Look for product references
        for marker in product_markers:
            if marker in content.lower():
                # Extract surrounding context
                idx = content.lower().find(marker)
                snippet = content[max(0, idx-20):min(len(content), idx+50)]
                if snippet not in mentioned:
                    mentioned.append(snippet)
    
    return mentioned[:5]  # Return last 5 unique product mentions

# ============================================================================
# MAIN RAG QUERY HANDLER
# ============================================================================


def extract_numbered_products_from_history(history):
    # Look for the last assistant message with a numbered list
    import re
    for msg in reversed(history):
        if msg["role"] == "assistant":
            # Find lines like '1. Product Name for €Price'
            lines = msg["content"].splitlines()
            numbered = []
            for line in lines:
                m = re.match(r"\s*\d+\.\s*(.+?)\s+for\s+€([\d\.]+)", line)
                if m:
                    name = m.group(1).strip()
                    price = float(m.group(2))
                    numbered.append((name, price))
            if numbered:
                return numbered
    return None


def detect_comparison_intent(query: str) -> bool:
    """Detect if user is asking for product comparison."""
    comparison_keywords = [
        'compare', 'which is better', 'difference', 'vs', 'versus',
        'better than', 'cheaper than', 'more expensive', 'same as',
        'similar to', 'like', 'instead of'
    ]
    query_lower = query.lower()
    return any(kw in query_lower for kw in comparison_keywords)


def detect_context_reference(query: str, history: List[Dict]) -> Optional[str]:
    """
    Detect if user is referring to something from conversation history.
    Returns context snippet if found, None otherwise.
    
    Examples: "it", "that one", "this", "the one you showed", "like that"
    """
    context_refs = ['it', 'that', 'this', 'that one', 'the one', 'like that', 'similar to that', 'instead']
    query_lower = query.lower()
    
    # Check if query contains context reference
    has_context_ref = any(ref in query_lower for ref in context_refs)
    
    if has_context_ref and history:
        # Find last assistant message with product information
        for msg in reversed(history):
            if msg['role'] == 'assistant' and ('Product' in msg['content'] or '€' in msg['content']):
                # Return last product mentioned
                lines = msg['content'].split('\n')
                for line in reversed(lines):
                    if 'Product' in line or '€' in line:
                        return line.strip()
    
    return None


def score_history_relevance(history: List[Dict], query: str) -> List[tuple]:
    """
    Score each history entry's relevance to current query.
    Returns list of (index, score, message) tuples sorted by relevance.
    
    Uses keyword matching to identify most relevant context.
    """
    query_lower = query.lower()
    query_words = set(query_lower.split())
    
    # Keywords that indicate high relevance
    high_relevance_words = {'cart', 'add', 'remove', 'price', 'compare', 'size', 'color', 'style', 'like', 'want', 'prefer'}
    
    scored = []
    for idx, msg in enumerate(history):
        content = msg['content'].lower()
        content_words = set(content.split())
        
        # Calculate relevance score
        score = 0
        
        # Direct word matches
        common_words = query_words & content_words
        score += len(common_words) * 2
        
        # High-relevance keyword matches
        high_rel_matches = high_relevance_words & content_words
        score += len(high_rel_matches) * 3
        
        # Recent messages get bonus
        recency_bonus = max(0, (len(history) - idx) / len(history)) * 5
        score += recency_bonus
        
        if score > 0:
            scored.append((idx, score, msg))
    
    # Sort by relevance score (descending)
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


def detect_filter_intent(query: str) -> tuple:
    """Detect price range and feature filters in query."""
    import re
    query_lower = query.lower()
    
    # Price range detection
    price_pattern = r'([€$]|euro|dollar)?[\s]?(\d+(?:\.?\d+)?)\s*(?:to|-|and)\s*([€$]|euro|dollar)?[\s]?(\d+(?:\.?\d+)?)'
    price_match = re.search(price_pattern, query_lower)
    
    budget_keywords = {
        'budget': (0, 50),
        'cheap': (0, 30),
        'expensive': (100, 10000),
        'premium': (80, 10000),
    }
    
    for keyword, (min_price, max_price) in budget_keywords.items():
        if keyword in query_lower:
            return ('price_range', min_price, max_price)
    
    if price_match:
        min_price = float(price_match.group(2))
        max_price = float(price_match.group(4))
        return ('price_range', min_price, max_price)
    
    return None

async def handle_rag_query(query: str, userId: str, supplier_id: Optional[str] = None, cart_items: List[dict] = None):

    """
    Main RAG handler: embedding → search → LLM response → parse intent
    
    Returns response with products and cart actions.
    Enhanced with comparison detection and personalization.
    Includes query caching for faster repeated queries.
    """
    # Validate inputs
    if not userId:
        raise ValueError('userId is required')
    if not query or not query.strip():
        raise ValueError('Query is required')
    
    # Check cache for repeated queries (5 minute cache)
    cache_key = hashlib.md5(f"{query.lower().strip()}_{supplier_id}".encode()).hexdigest()
    if cache_key in response_cache:
        cached = response_cache[cache_key]
        if (datetime.now() - cached['timestamp']).seconds < CACHE_EXPIRY_MINUTES * 60:
            # Return cached response but with updated user context
            return cached['response']
    

    # Step 1: Check for price-based queries FIRST (before vector search)
    import re
    from lib.db import get_db_connection, release_db_connection
    query_lower = query.lower()
    products = []
    is_price_query = False
    
    # Check for most expensive queries
    if any(kw in query_lower for kw in ["most expensive", "highest price", "premium", "most costly", "costliest", "expensive"]):
        is_price_query = True
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            # Cast price to numeric to ensure proper ordering
            if supplier_id:
                cursor.execute("""
                    SELECT id, name, category, description, price, image_url, source_url, stock_quantity, supplier_id
                    FROM products
                    WHERE supplier_id = %s AND stock_quantity > 0 AND price IS NOT NULL
                    ORDER BY CAST(price AS NUMERIC) DESC LIMIT 1
                """, (supplier_id,))
            else:
                cursor.execute("""
                    SELECT id, name, category, description, price, image_url, source_url, stock_quantity, supplier_id
                    FROM products
                    WHERE stock_quantity > 0 AND price IS NOT NULL
                    ORDER BY CAST(price AS NUMERIC) DESC LIMIT 1
                """)
            row = cursor.fetchone()
            if row:
                special_product = dict(row)
                special_product['id'] = str(special_product['id'])
                special_product['price'] = float(special_product['price']) if special_product['price'] else 0.0
                products = [special_product]
        finally:
            release_db_connection(conn)
    
    # Check for cheapest queries
    elif any(kw in query_lower for kw in ["cheapest", "lowest price", "least expensive", "most affordable", "lowest cost", "cheap"]):
        is_price_query = True
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            # Cast price to numeric to ensure proper ordering
            if supplier_id:
                cursor.execute("""
                    SELECT id, name, category, description, price, image_url, source_url, stock_quantity, supplier_id
                    FROM products
                    WHERE supplier_id = %s AND stock_quantity > 0 AND price IS NOT NULL
                    ORDER BY CAST(price AS NUMERIC) ASC LIMIT 1
                """, (supplier_id,))
            else:
                cursor.execute("""
                    SELECT id, name, category, description, price, image_url, source_url, stock_quantity, supplier_id
                    FROM products
                    WHERE stock_quantity > 0 AND price IS NOT NULL
                    ORDER BY CAST(price AS NUMERIC) ASC LIMIT 1
                """)
            row = cursor.fetchone()
            if row:
                special_product = dict(row)
                special_product['id'] = str(special_product['id'])
                special_product['price'] = float(special_product['price']) if special_product['price'] else 0.0
                products = [special_product]
        finally:
            release_db_connection(conn)
    
    # Step 2: Only do vector search if NOT a price query
    if not is_price_query:
        # Generate embedding
        embedding = await generate_query_embedding(query)
        if not embedding:
            raise ValueError('Failed to generate embedding')

        # Check if user wants comparisons - fetch more products for comparison view
        is_comparison = detect_comparison_intent(query)
        fetch_limit = min(5, PRODUCT_LIMIT * 2) if is_comparison else PRODUCT_LIMIT

        # Search products using vector similarity
        products = await search_products_by_embedding(
            embedding, 
            limit=fetch_limit, 
            supplier_id=supplier_id
        )

    # Step 3: Get conversation history for context
    history = get_conversation_history(userId)

    # Step 4: Generate LLM response with intent analysis
    context = format_products_context(products)
    response_text, products_to_show, cart_action = await generate_llm_response(
        query, context, products, history, cart_items or []
    )

    # Step 5: Ensure response is never empty
    if not response_text or not response_text.strip():
        # Provide contextual fallback based on query
        if any(word in query.lower() for word in ['remove', 'delete', 'take off', 'cancel']):
            response_text = "I'd be happy to help remove items. Can you tell me which product you'd like to remove?"
        elif any(word in query.lower() for word in ['update', 'change', 'make it', 'modify']):
            response_text = "I can help update quantities. Which item would you like to adjust?"
        else:
            response_text = "I'm here to help! What would you like to do?"

    # Handle checkout action - convert cart_action checkout to checkout_action
    # Frontend handles navigation, so we just signal the redirect action
    checkout_action = None
    if cart_action and cart_action.get('action') == 'checkout':
        checkout_action = {
            "action": "redirect"
        }
        cart_action = None

    add_to_conversation_history(userId, "user", query)
    add_to_conversation_history(userId, "assistant", response_text)

    # Prepare response
    result = {
        "response": response_text,
        "products": products_to_show,
        "cart_action": cart_action,
        "checkout_action": checkout_action,
        "query": query,
        "userId": userId
    }
    
    # Cache the response (only cache product queries, not cart actions)
    if not cart_action and not checkout_action:
        response_cache[cache_key] = {
            'response': result,
            'timestamp': datetime.now()
        }
        # Cleanup old cache entries (keep last 100)
        if len(response_cache) > 100:
            oldest_keys = sorted(response_cache.keys(), 
                               key=lambda k: response_cache[k]['timestamp'])[:20]
            for k in oldest_keys:
                del response_cache[k]
    
    return result

# ============================================================================
# PRODUCT FORMATTING & CONTEXT
# ============================================================================

def format_products_context(products: list) -> str:
    """
    Format products for LLM context with all details including stock quantities and IDs.
    Indexed 0-based for LLM decision making.
    """
    if not products:
        return "No products matched this query."
    
    context = []
    for i, product in enumerate(products):
        stock = product.get('stock_quantity', 0)
        product_id = product.get('id', 'unknown')
        info = f"""Product {i}: {product.get('name', 'Unknown')}
  ID: {product_id}
  Category: {product.get('category', 'N/A')}
  Price: €{product.get('price', 0)}
  Description: {product.get('description', 'Premium quality product')}
  Stock: {stock} in stock"""
        context.append(info)
    
    return '\n\n'.join(context)

# ============================================================================
# LLM RESPONSE GENERATION
# ============================================================================

def build_system_prompt() -> str:
    """Build the optimized system prompt for the LLM - concise but maintains quality."""
    return """You're a shopping assistant at Plexaris. Help customers find products, manage cart, and checkout.

PERSONALITY: Friendly, engaging. Remember preferences, avoid rejected items, suggest complementary products.

RULES:
1. Always respond in English
2. Use ONLY provided product info - don't invent details
3. Use ALL conversation history (recent detailed, older summarized)
4. Be concise (1-2 sentences max)
5. ALWAYS end with action tag

# RETRIEVED CONTEXT USAGE
The system provides you with:
- **Products available**: A numbered list of products matching the customer's query (0-indexed)
- **Current cart**: Items already in the customer's shopping cart (if any)
- **Conversation history**: Recent messages for context

**YOU MUST:**
- Use ONLY products from the "Products available" list
- Reference products by their INDEX number (0, 1, 2, etc.) when adding to cart
- Reference products by their ID (UUID) when removing or updating cart items
- Check stock quantities before adding items
- Respect exclusion requests (e.g., "not cake", "anything beside X")

# INTENT CLASSIFICATION

## 1. PRODUCT SEARCH/RECOMMENDATION
**Triggers:** Product queries, "show me", "find", "recommend", "cheapest", "most expensive", "best", questions about products
**Action:** Show relevant products using tags: [SHOW_ONE: index], [SHOW_TWO: i1, i2], or [SHOW_MATCHES]
**Price-Based Queries:** When customer asks for "most expensive", "cheapest", "highest price", or "lowest price", the system provides ONLY that product (filtered by price). Always use [SHOW_ONE: 0] since there will be exactly one product.
**Examples:**
- "show me shoes" → [SHOW_MATCHES]
- "cheapest item" → [SHOW_ONE: 0] (system provides ONLY the lowest price product)
- "most expensive" → [SHOW_ONE: 0] (system provides ONLY the highest price product)
- "anything beside cake" → Filter out cakes, show others with [SHOW_MATCHES]

## 2. ADD TO CART
**Triggers:** "add to cart", "add it", "I'll take it", "yes" (after showing product), "give me X", "put it in cart"
**Action:** [ADD_TO_CART: index, quantity] or [ADD_TO_CART_MULTI: i1:q1, i2:q2]
**Stock Validation:** ALWAYS check stock first. If customer wants 5 but only 3 available, add 3 and inform them.
**IMPORTANT:** This is DIFFERENT from checkout! "Add to cart" only adds items - it does NOT proceed to checkout/payment.
**Examples:**
- "add to cart" → [ADD_TO_CART: 0, 1]
- "I want 3" (only 2 in stock) → "We only have 2 available. Adding 2 to your cart! [ADD_TO_CART: 0, 2]"
- "add both" → [ADD_TO_CART_MULTI: 0:1, 1:1]
- "put it in my cart" → [ADD_TO_CART: 0, 1]

## 3. REMOVE FROM CART
**Triggers:** "remove", "delete", "take off", "don't want", "cancel" (when referring to entire item)
**Action:** [REMOVE_FROM_CART: product_id] or [REMOVE_FROM_CART_MULTI: id1, id2]
**Important:** "remove 1" or "remove 2" = UPDATE_QUANTITY, NOT remove! Only use REMOVE when customer wants to delete entire item.
**Examples:**
- "remove that product" → [REMOVE_FROM_CART: product-id]
- "clear my cart" → [REMOVE_FROM_CART_MULTI: id1, id2, id3]

## 4. UPDATE QUANTITY
**Triggers:** "change to X", "make it X", "update quantity", "remove X of it", "add X more"
**Action:** [UPDATE_QUANTITY: product_id, new_quantity]
**Calculation:** 
- "remove 1" with 2 in cart → new_qty = 2 - 1 = 1 → [UPDATE_QUANTITY: id, 1]
- "add 2 more" with 1 in cart → new_qty = 1 + 2 = 3 → [UPDATE_QUANTITY: id, 3]
- If new_qty <= 0, use REMOVE_FROM_CART instead
**Examples:**
- "make it 3" → [UPDATE_QUANTITY: product-id, 3]
- "remove 1 of it" (has 2) → [UPDATE_QUANTITY: product-id, 1]
- "add 2 more" (has 1) → [UPDATE_QUANTITY: product-id, 3]

## 5. CHECKOUT / PROCEED TO CHECKOUT
**Triggers:** "checkout", "proceed to checkout", "go to checkout", "pay", "finish order", "complete purchase", "I'm done", "place order", "I want to pay"
**Action:** [CHECKOUT] (ONLY if cart has items)
**Validation:** If cart is empty, say "Your cart is empty. Add some items first!" and use [SHOW_NONE]
**IMPORTANT:** This is DIFFERENT from "add to cart"! Checkout means the customer wants to proceed to payment/checkout page. "Add to cart" only adds items without proceeding to checkout.
**Examples:**
- "checkout" (cart has items) → "Perfect! Let me take you to checkout. [CHECKOUT]"
- "proceed to checkout" (cart has items) → "Perfect! Let me take you to checkout. [CHECKOUT]"
- "I want to pay" (cart has items) → "Perfect! Let me take you to checkout. [CHECKOUT]"
- "checkout" (empty cart) → "Your cart is empty. Add some items first! [SHOW_NONE]"

## 6. GREETINGS & GENERAL CHAT
**Triggers:** "hi", "hello", "how are you", general conversation
**Action:** [SHOW_NONE]
**Examples:**
- "hi" → "Hello! How can I help you find products today? [SHOW_NONE]"

# ACTION TAGS REFERENCE

**Product Display:**
- `[SHOW_NONE]` - No products to display (greetings, general chat)
- `[SHOW_ONE: index]` - Show single product (index from Products available list)
- `[SHOW_TWO: i1, i2]` - Show two products
- `[SHOW_MATCHES]` - Show top 2 matching products

**Cart Actions:**
- `[ADD_TO_CART: index, qty]` - Add product by index (0-based) with quantity
- `[ADD_TO_CART_MULTI: i1:q1, i2:q2]` - Add multiple products (e.g., "0:1, 1:2")
- `[REMOVE_FROM_CART: product_id]` - Remove product by UUID
- `[REMOVE_FROM_CART_MULTI: id1, id2]` - Remove multiple products
- `[UPDATE_QUANTITY: product_id, new_qty]` - Update quantity by UUID
- `[CHECKOUT]` - Proceed to checkout (only if cart has items)

# CRITICAL RULES

1. **TAG PLACEMENT:** The action tag MUST be at the very END of your response - no exceptions!
2. **STOCK CHECK:** Always validate stock before adding. Never add more than available.
3. **INDEX vs ID:** 
   - Use INDEX (0, 1, 2...) for ADD_TO_CART (from "Products available")
   - Use ID (UUID) for REMOVE/UPDATE (from "Current items in customer's cart")
4. **CONTEXT REFERENCES:** When customer says "it", "that", "this", "them" - refer to the last products you showed
5. **EXCLUSIONS:** If customer says "not X" or "anything beside X", filter those products out
6. **NO ASSUMPTIONS:** Don't add to cart unless customer explicitly asks. Don't invent product details.
7. **ADD TO CART vs CHECKOUT:** 
   - "Add to cart" / "put in cart" / "I'll take it" = ADD_TO_CART (just adds items, doesn't proceed to checkout)
   - "Checkout" / "proceed to checkout" / "pay" / "I want to pay" = CHECKOUT (proceeds to payment page)
   - These are COMPLETELY DIFFERENT actions - never confuse them!
8. **FOLLOW-UP ENGAGEMENT:** After showing products, suggest helpful next steps:
   - For price queries: "Want to compare prices?" or "Should I show you alternatives at different price points?"
   - For category queries: "Want to filter by [feature]?" or "Would you like to see something similar?"
   - For cart items: "This would pair nicely with what you have! Want to see it?" or "Great choice! Want to check out or keep shopping?"
   - For single results: Always ask "Want to compare with alternatives?" or "Should I find something cheaper/more premium?"

# RESPONSE FORMAT

**Structure:**
1. Brief, helpful response (1-2 sentences max)
2. Action tag at the end

**Good Examples:**
- "Here's our most affordable option! Want to see something more premium? [SHOW_ONE: 0]"
- "Added to your cart! This would pair great with what you have. [ADD_TO_CART: 0, 1]"
- "We only have 2 in stock. Adding 2 to your cart! Would you like to see alternatives? [ADD_TO_CART: 0, 2]"
- "Removed from your cart! [REMOVE_FROM_CART: abc-123-def]"
- "Updated quantity to 3! Anything else you'd like to add? [UPDATE_QUANTITY: abc-123-def, 3]"
- "Perfect! Let me take you to checkout. [CHECKOUT]"
- "Here are your top matches! Want to compare prices or see more options? [SHOW_MATCHES]"

**Bad Examples (WRONG):**
- "I'll add it to your cart" (missing tag!)
- "Added!" (missing tag!)
- "Sure!" (missing tag!)

# EDGE CASES

- **No products found:** "I couldn't find any products matching your request. Could you try different keywords? [SHOW_NONE]"
- **Out of stock:** "Sorry, that product is out of stock. [SHOW_NONE]"
- **Empty cart checkout:** "Your cart is empty. Add some items first! [SHOW_NONE]"
- **Ambiguous reference:** "Which product would you like? I can show you options. [SHOW_MATCHES]"

Remember: Be concise, helpful, and ALWAYS end with an action tag!"""


def build_user_prompt(query: str, context: str, history: List[Dict], cart_items: List[dict]) -> str:
    """Build the user prompt with context understanding."""
    prompt = f"""# CUSTOMER QUERY
"{query}"

# CUSTOMER CONTEXT"""
    
    # Add context summary
    context_summary = extract_context_summary(history, cart_items or [])
    if context_summary != "New customer":
        prompt += f"\n{context_summary}\n"
    
    # Detect context references
    context_ref = detect_context_reference(query, history)
    if context_ref:
        prompt += f"\n⚡ Referring to: {context_ref}\n"
    
    # Mentioned products
    if history:
        mentioned = extract_mentioned_products(history)
        if mentioned:
            prompt += f"Previously discussed: {', '.join([m.split()[-1] for m in mentioned[:2]])}\n"
        if mentioned:
            prompt += f"Previously discussed: {', '.join([m.split()[-1] for m in mentioned[:3]])}\n"
    
    prompt += f"""
# RETRIEVED PRODUCTS (Use these for recommendations and cart actions)
{context if context else "No products found matching this query."}

# CURRENT CART STATUS"""
    
    # Add current cart items if any
    if cart_items and len(cart_items) > 0:
        prompt += "\nThe customer currently has these items in their cart:\n"
        for item in cart_items:
            prompt += f"- {item.get('name', 'Unknown')} (ID: {item.get('id')}) - Quantity: {item.get('quantity', 1)} - €{item.get('price', '?')}\n"
        
        # Add personalization hint based on cart contents
        cart_categories = set()
        cart_value = 0
        for item in cart_items:
            if 'category' in item:
                cart_categories.add(item['category'])
            try:
                cart_value += float(item.get('price', 0)) * item.get('quantity', 1)
            except:
                pass
        
        if cart_categories:
            prompt += f"\nCart Analysis: Customer is building a {', '.join(cart_categories)} collection (€{cart_value:.2f} total). Look for complementary or similar items.\n"
    else:
        prompt += "\nThe customer's cart is currently empty. First-time browser or starting fresh.\n"
    
    # Add full conversation history using smart compression (ChatGPT-style)
    if history and len(history) > 0:
        smart_history = build_smart_history_context(history)
        prompt += f"\n{smart_history}\n"
    
    prompt += """
TASK: Analyze context, intent, preferences. Provide personalized recommendations. Use action tags at end."""
    return prompt


async def generate_llm_response(
    query: str, 
    context: str, 
    products: list, 
    history: List[Dict] = None,
    cart_items: List[dict] = None
) -> Tuple[str, List[dict], Optional[dict]]:
    """
    Generate LLM response and parse intent tags with retry logic.
    
    Returns: (response_text, products_to_show, cart_action)
    """
    # Build prompts once
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(query, context, history or [], cart_items or [])
    
    # Configure API
    api_url = os.getenv('OPENROUTER_API_URL', 'https://openrouter.ai/api/v1')
    llm_model = os.getenv('LLM_MODEL', 'openai/gpt-4o')
    temperature = float(os.getenv('LLM_TEMPERATURE', '0.3'))  # Lower = faster, more consistent
    max_tokens = int(os.getenv('LLM_MAX_TOKENS', '120'))  # Optimized: reduced from 150 for faster responses
    
    # Retry loop
    for attempt in range(LLM_MAX_RETRIES):
        try:
            client = get_http_client()
            response = await client.post(
                f"{api_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": llm_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": temperature,
                    "max_tokens": max_tokens
                },
                timeout=LLM_TIMEOUT
            )
            response.raise_for_status()
            
            full_response = response.json()["choices"][0]["message"]["content"]
            
            clean_text, products_to_show, cart_action = parse_llm_response(
                full_response, products
            )
            
            return clean_text, products_to_show, cart_action
            
        except (httpx.TimeoutException, httpx.ConnectTimeout):
            if attempt < LLM_MAX_RETRIES - 1:
                delay = LLM_RETRY_DELAY * (2 ** attempt)
                await asyncio.sleep(delay)
            else:
                return "I'm having trouble connecting. Please try again.", [], None
        
        except httpx.HTTPStatusError as e:
            if attempt < LLM_MAX_RETRIES - 1 and e.response.status_code >= 500:
                delay = LLM_RETRY_DELAY * (2 ** attempt)
                await asyncio.sleep(delay)
            else:
                return "I encountered an error. Please try again.", [], None
        
        except Exception as e:
            return "I'm here to help! What would you like to find?", [], None
    
    # Fallback if all retries fail
    return "I'm having trouble right now. Please try again.", [], None


def validate_stock(product: dict, requested_qty: int) -> int:
    """
    Validate stock and return the allowed quantity.
    
    Args:
        product: Product dict with 'stock_quantity' field
        requested_qty: Quantity customer wants
    
    Returns:
        Actual quantity to add (min of requested and available)
    """
    available = product.get('stock_quantity', 0)
    if requested_qty > available:
        return max(0, available)  
    return requested_qty


def parse_llm_response(
    full_response: str, 
    products: list
) -> Tuple[str, List[dict], Optional[dict]]:
    """
    Parse LLM response and extract intent tags.
    
    Tags: [SHOW_NONE], [SHOW_ONE: idx], [SHOW_TWO: i1, i2], 
          [SHOW_MATCHES], [ADD_TO_CART: idx, qty], [ADD_TO_CART_MULTI: i1:q1, i2:q2],
          [REMOVE_FROM_CART: product_id], [REMOVE_FROM_CART_MULTI: id1, id2],
          [UPDATE_QUANTITY: product_id, new_qty]
    
    Returns: (clean_text, products_to_show, cart_action)
    """
    products_to_show = []
    cart_action = None
    clean_text = full_response
    
    try:
        # Check for CHECKOUT first (highest priority - takes precedence over all other actions)
        if '[CHECKOUT]' in full_response:
            products_to_show = []
            cart_action = {
                "action": "checkout"
            }
            clean_text = re.sub(r'\[CHECKOUT\]', '', full_response).strip()
            # Return early since checkout takes precedence
            if not clean_text or not clean_text.strip():
                clean_text = "Perfect! Let me take you to checkout."
            return clean_text.strip(), products_to_show, cart_action
        
        # Check for REMOVE_FROM_CART_MULTI (remove multiple products)
        if '[REMOVE_FROM_CART_MULTI:' in full_response:
            match = re.search(r'\[REMOVE_FROM_CART_MULTI:\s*([^\]]+)\]', full_response)
            if match:
                product_ids = [id.strip() for id in match.group(1).split(',')]
                if product_ids:
                    cart_action = {
                        "action": "remove_multiple",
                        "product_ids": product_ids
                    }
            clean_text = re.sub(r'\[REMOVE_FROM_CART_MULTI:[^\]]+\]', '', full_response).strip()
        
        # Check for single REMOVE_FROM_CART
        elif '[REMOVE_FROM_CART:' in full_response:
            match = re.search(r'\[REMOVE_FROM_CART:\s*([a-f0-9\-]+)\]', full_response)
            if match:
                product_id = match.group(1).strip()
                cart_action = {
                    "action": "remove",
                    "product_id": product_id
                }
            clean_text = re.sub(r'\[REMOVE_FROM_CART:\s*[a-f0-9\-]+\]', '', full_response).strip()
        
        # Check for UPDATE_QUANTITY
        elif '[UPDATE_QUANTITY:' in full_response:
            match = re.search(r'\[UPDATE_QUANTITY:\s*([a-f0-9\-]+)\s*,\s*(\d+)\]', full_response)
            if match:
                product_id = match.group(1).strip()
                new_qty = int(match.group(2))
                
                # Find product to validate stock
                product_for_validation = None
                for p in products:
                    if str(p.get('id')) == product_id:
                        product_for_validation = p
                        break
                
                # Validate quantity
                if product_for_validation:
                    validated_qty = validate_stock(product_for_validation, new_qty)
                else:
                    # If product not in current list, trust the value
                    validated_qty = new_qty
                
                cart_action = {
                    "action": "update_quantity",
                    "product_id": product_id,
                    "quantity": validated_qty
                }
            clean_text = re.sub(r'\[UPDATE_QUANTITY:\s*[a-f0-9\-]+\s*,\s*\d+\]', '', full_response).strip()
        
        # Check for ADD_TO_CART_MULTI (multiple products)
        elif '[ADD_TO_CART_MULTI:' in full_response:
            match = re.search(r'\[ADD_TO_CART_MULTI:\s*([^\]]+)\]', full_response)
            if match and products:
                items = parse_multi_cart_action(match.group(1), products)
                if items:
                    # Validate stock for each item
                    validated_items = []
                    for item in items:
                        validated_qty = validate_stock(item["product"], item["quantity"])
                        if validated_qty > 0:
                            validated_items.append({
                                "product": item["product"],
                                "quantity": validated_qty
                            })
                    
                    if validated_items:
                        cart_action = {
                            "action": "add_multiple",
                            "items": validated_items
                        }
                        products_to_show = [item["product"] for item in validated_items]
            clean_text = re.sub(r'\[ADD_TO_CART_MULTI:[^\]]+\]', '', full_response).strip()
            
        # Check for single ADD_TO_CART
        elif '[ADD_TO_CART:' in full_response:
            match = re.search(r'\[ADD_TO_CART:\s*(\d+)\s*,\s*(\d+)\]', full_response)
            if match and products:
                idx = int(match.group(1))
                quantity = int(match.group(2))
                if 0 <= idx < len(products):
                    # Validate stock
                    validated_qty = validate_stock(products[idx], quantity)
                    if validated_qty > 0:
                        cart_action = {
                            "action": "add",
                            "product": products[idx],
                            "quantity": validated_qty
                        }
                        products_to_show = [products[idx]]
            clean_text = re.sub(r'\[ADD_TO_CART:\s*\d+\s*,\s*\d+\]', '', full_response).strip()
            
        # Check for SHOW_NONE
        elif '[SHOW_NONE]' in full_response:
            products_to_show = []
            clean_text = full_response.replace('[SHOW_NONE]', '').strip()
            
        # Check for SHOW_ONE
        elif '[SHOW_ONE:' in full_response:
            match = re.search(r'\[SHOW_ONE:\s*(\d+)\]', full_response)
            if match and products:
                idx = int(match.group(1))
                if 0 <= idx < len(products):
                    products_to_show = [products[idx]]
            clean_text = re.sub(r'\[SHOW_ONE:\s*\d+\]', '', full_response).strip()
            
        # Check for SHOW_TWO
        elif '[SHOW_TWO:' in full_response:
            match = re.search(r'\[SHOW_TWO:\s*(\d+)\s*,\s*(\d+)\]', full_response)
            if match and products:
                idx1, idx2 = int(match.group(1)), int(match.group(2))
                if 0 <= idx1 < len(products) and 0 <= idx2 < len(products):
                    products_to_show = [products[idx1], products[idx2]]
            clean_text = re.sub(r'\[SHOW_TWO:\s*\d+\s*,\s*\d+\]', '', full_response).strip()
            
        # Check for SHOW_MATCHES
        elif '[SHOW_MATCHES]' in full_response:
            products_to_show = products[:2] if products else []
            clean_text = full_response.replace('[SHOW_MATCHES]', '').strip()
        
        if not clean_text or not clean_text.strip():
            clean_text = "How can I help you?"
        
        return clean_text.strip(), products_to_show, cart_action
        
    except Exception as e:
        return "How can I help you?", [], None


def parse_multi_cart_action(items_str: str, products: list) -> List[dict]:
    """
    Parse ADD_TO_CART_MULTI format: "0:1, 1:2, 2:1"
    
    Returns list of {"product": {...}, "quantity": N}
    """
    items = []
    try:
        for item in items_str.split(','):
            item = item.strip()
            if ':' in item:
                idx_str, qty_str = item.split(':')
                idx = int(idx_str.strip())
                qty = int(qty_str.strip())
                if 0 <= idx < len(products):
                    items.append({
                        "product": products[idx],
                        "quantity": qty
                    })
    except Exception as e:
        pass
    return items
