import os
import re
import asyncio
import logging
from typing import Optional, List, Dict, Tuple
import httpx
from lib.embedding_utils import generate_query_embedding, get_http_client
from lib.vector_search import search_products_by_embedding
from lib.product_handler import update_product_stock, update_product, get_products
# CONFIGURATION
# ============================================================================
logger = logging.getLogger("supplier_rag_handler")
logging.basicConfig(level=logging.INFO)

# ============================================================================
# CONFIGURATION
# ============================================================================
MAX_HISTORY_LENGTH = int(os.getenv('CONVO_HISTORY_LENGTH', '6'))  # Same as customer RAG
PRODUCT_LIMIT = int(os.getenv('PRODUCT_LIMIT', '10'))  # More products for suppliers
LLM_MAX_RETRIES = 2  # Quick fail for speed
LLM_RETRY_DELAY = 0.3  # Faster retry
LLM_TIMEOUT = 10.0  # Reduced from 15s

# ============================================================================
# CONVERSATION HISTORY MANAGEMENT
# ============================================================================

# In-memory conversation history storage (supplierId -> list of messages)
conversation_history: Dict[str, List[Dict]] = {}

def get_conversation_history(supplierId: str) -> List[Dict]:
    """Get conversation history for a supplier."""
    return conversation_history.get(supplierId, [])

def add_to_conversation_history(supplierId: str, role: str, content: str, products: Optional[List[dict]] = None):
    """Add a message to conversation history."""
    if supplierId not in conversation_history:
        conversation_history[supplierId] = []
    
    message = {
        "role": role,
        "content": content
    }

    # Persist any products shown so we can recover IDs on follow-up actions
    if products:
        shown_products = []
        for product in products:
            product_id = product.get("id")
            if product_id:
                shown_products.append({
                    "id": product_id,
                    "name": product.get("name", "")
                })
        if shown_products:
            message["products"] = shown_products

    conversation_history[supplierId].append(message)
    
    # Keep only last MAX_HISTORY_LENGTH exchanges
    if len(conversation_history[supplierId]) > MAX_HISTORY_LENGTH * 2:
        conversation_history[supplierId] = conversation_history[supplierId][-(MAX_HISTORY_LENGTH * 2):]

def clear_conversation_history(supplierId: str):
    """Clear conversation history for a supplier."""
    if supplierId in conversation_history:
        conversation_history[supplierId] = []

# ============================================================================
# MAIN SUPPLIER RAG QUERY HANDLER
# ============================================================================

def extract_product_ids_from_history(history: List[Dict]) -> List[str]:
    """
    Extract product IDs from conversation history.
    Looks for UUID patterns in assistant messages that showed products.
    """
    product_ids = []
    
    # UUID pattern
    uuid_pattern = r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
    
    # Check the last few assistant messages for product IDs
    for msg in reversed(history):
        if msg.get("role") == "assistant":
            content = msg.get("content", "")
            # Capture any stored product IDs from prior responses
            if msg.get("products"):
                for product in msg.get("products", []):
                    pid = product.get("id")
                    if pid:
                        product_ids.append(pid)
            # Look for "ID: <uuid>" pattern
            matches = re.findall(rf'ID:\s*({uuid_pattern})', content, re.IGNORECASE)
            product_ids.extend(matches)
            # Also look for product IDs in action tags
            action_matches = re.findall(rf'\[UPDATE_\w+:\s*({uuid_pattern})', content, re.IGNORECASE)
            product_ids.extend(action_matches)
            # Limit to avoid too many products
            if len(product_ids) >= 5:
                break
    
    # Return unique IDs
    return list(set(product_ids))


async def get_products_by_ids(product_ids: List[str], supplier_id: str) -> List[dict]:
    """Get products by their IDs."""
    if not product_ids:
        return []
    
    from lib.db import get_db_connection, release_db_connection
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Use raw strings to avoid psycopg adapting UUID objects
        id_list = [str(pid) for pid in product_ids if pid]
        if not id_list:
            return []

        placeholders = ','.join(['%s'] * len(id_list))
        cursor.execute(f"""
            SELECT id, supplier_id, name, category, description, price, 
                   image_url, stock_quantity, embedding, created_at, updated_at
            FROM products
            WHERE id IN ({placeholders}) AND supplier_id = %s
        """, tuple(id_list) + (supplier_id,))
        
        rows = cursor.fetchall()
        products = []
        for row in rows:
            product = dict(row)
            product['id'] = str(product['id'])
            product['price'] = float(product['price']) if product['price'] else 0.0
            if 'supplier_id' in product and product['supplier_id']:
                product['supplier_id'] = str(product['supplier_id'])
            products.append(product)
        
        return products
    finally:
        release_db_connection(conn)


async def get_supplier_product_count(supplier_id: str) -> int:
    """Return total number of in-stock products for a supplier."""
    from lib.db import get_db_connection, release_db_connection

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) AS count
            FROM products
            WHERE supplier_id = %s AND stock_quantity > 0
        """, (supplier_id,))
        row = cursor.fetchone()
        if not row:
            return 0
        # RealDictCursor returns a dict with "count"
        return int(row.get("count", 0))
    finally:
        release_db_connection(conn)


async def handle_supplier_rag_query(query: str, supplier_id: str):
    """
    Main Supplier RAG handler: embedding → search → LLM response → parse intent → execute actions
    
    Returns response with products and action results.
    """
    # Validate inputs
    if not supplier_id:
        raise ValueError('supplier_id is required')
    if not query or not query.strip():
        raise ValueError('Query is required')
    
    query_lower = query.lower()
    
    # Step 1: Get conversation history early
    history = get_conversation_history(supplier_id)
    
    # Step 2: Check if query is an action command (rename, update stock, etc.)
    is_action_command = any(keyword in query_lower for keyword in [
        'rename', 'change name', 'update name', 'set name',
        'update stock', 'change stock', 'set stock', 'stock to',
        'update price', 'change price', 'set price', 'price to',
        'update category', 'change category', 'set category',
        'update description', 'change description', 'set description',
        'delete', 'remove product'
    ])
    
    # Step 3: Search for products using vector similarity
    embedding = await generate_query_embedding(query)
    if not embedding:
        raise ValueError('Failed to generate embedding')

    products = await search_products_by_embedding(
        embedding, 
        limit=PRODUCT_LIMIT, 
        supplier_id=supplier_id
    )
    try:
        total_products = await get_supplier_product_count(supplier_id)
    except Exception:
        total_products = len(products)
    
    # Step 4: If it's an action command and we have history, also include products from history
    if is_action_command and history:
        history_product_ids = extract_product_ids_from_history(history)
        if history_product_ids:
            history_products = await get_products_by_ids(history_product_ids, supplier_id)
            # Merge with existing products, avoiding duplicates
            existing_ids = {p['id'] for p in products}
            for hp in history_products:
                if hp['id'] not in existing_ids:
                    products.append(hp)
                    if len(products) >= PRODUCT_LIMIT:
                        break
    
    # Step 5: Generate LLM response with intent analysis
    context = format_products_context(products, total_products)
    response_text, products_to_show, action = await generate_llm_response(
        query, context, products, history, supplier_id
    )
    
    # Step 4: Execute action if any
    action_result = None
    if action:
        action_result = await execute_supplier_action(action, supplier_id)
    
    # Step 5: Ensure response is never empty
    if not response_text or not response_text.strip():
        response_text = "I'm here to help you manage your products! What would you like to do?"
    
    add_to_conversation_history(supplier_id, "user", query)
    add_to_conversation_history(supplier_id, "assistant", response_text, products_to_show)
    
    return {
        "response": response_text,
        "products": products_to_show,
        "action": action_result,
        "query": query,
        "supplierId": supplier_id
    }

# ============================================================================
# PRODUCT FORMATTING & CONTEXT
# ============================================================================

def format_products_context(products: list, total_products: Optional[int] = None) -> str:
    """
    Format products for LLM context with all details including stock quantities and IDs.
    Indexed 0-based for LLM decision making.
    Same format as customer RAG for consistency.
    """
    header = ""
    if total_products is not None:
        header = (
            f"Total products for this supplier: {total_products}. "
            f"Showing up to {min(PRODUCT_LIMIT, len(products))} relevant matches below.\n\n"
        )

    if not products:
        return header + "No products matched this query."
    
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
    
    return header + '\n\n'.join(context)

# ============================================================================
# LLM RESPONSE GENERATION
# ============================================================================

def build_system_prompt() -> str:
    """Build the system prompt for supplier operations using RAG best practices."""
    return """# ROLE & CONTEXT
You are an expert inventory management assistant helping suppliers manage their product catalog. Your role is to help suppliers update product information, manage stock levels, and organize their inventory.

# CRITICAL INSTRUCTIONS
1. **ALWAYS respond in English**, regardless of the supplier's language
2. **USE ONLY the retrieved product information** provided in the context - do not invent or assume product details
3. **If no relevant products are found**, clearly state this and suggest alternative search terms
4. **Be concise and helpful** - keep responses brief and actionable
5. **ALWAYS end your response with an action tag** - this is required for the system to function

# RETRIEVED CONTEXT USAGE
The system provides you with:
- **Products available**: A numbered list of products matching the supplier's query (0-indexed)
- **Conversation history**: Recent messages for context - USE THIS TO UNDERSTAND WHAT PRODUCT THE SUPPLIER IS REFERRING TO

**YOU MUST:**
- Use ONLY products from the "Products available" list
- Reference products by their INDEX number (0, 1, 2, etc.) when showing products
- Reference products by their ID (UUID) when updating/deleting
- Always confirm the product name before making changes
- **CRITICAL: Use conversation history to understand context!** If the supplier says "rename to X" or "change stock to Y" without specifying a product, look at the conversation history to see which product was just shown or discussed. The most recently shown product is likely what they're referring to.

# INTENT CLASSIFICATION

## 1. PRODUCT SEARCH/SHOW
**Triggers:** "show me", "find", "list", "what products", "search for"
**Action:** Show relevant products using tags: [SHOW_ONE: index], [SHOW_TWO: i1, i2], or [SHOW_MATCHES]
**Examples:**
- "show me all cakes" → [SHOW_MATCHES]
- "find Goutier Cake" → [SHOW_ONE: 0] (if found)
- "list products in category X" → [SHOW_MATCHES]

## 2. UPDATE STOCK
**Triggers:** "set stock", "update stock", "change stock", "stock to X", "set inventory", "update inventory"
**Action:** [UPDATE_STOCK: product_id, new_quantity]
**Examples:**
- "set stock of Product 0 to 50" → [UPDATE_STOCK: product-id, 50]
- "update stock for Goutier Cake to 100" → [UPDATE_STOCK: product-id, 100]
- "change stock to 25" (after showing product) → [UPDATE_STOCK: product-id-from-history, 25]
**Context Usage:** If the supplier says "change stock to X" without specifying a product, check the conversation history. If you just showed a product in the previous message, that's the product they want to update.

## 3. UPDATE PRODUCT NAME
**Triggers:** "rename", "change name", "update name", "set name to"
**Action:** [UPDATE_NAME: product_id, new_name]
**Examples:**
- "rename Product 0 to New Cake Name" → [UPDATE_NAME: product-id, New Cake Name]
- "change name of Goutier Cake to Premium Cake" → [UPDATE_NAME: product-id, Premium Cake]
- "rename to Best food" (after showing a product) → [UPDATE_NAME: product-id-from-history, Best food]
**Context Usage:** If the supplier says "rename to X" without specifying a product, check the conversation history. If you just showed a product in the previous message, that's the product they want to rename.

## 4. UPDATE CATEGORY
**Triggers:** "change category", "update category", "set category", "move to category"
**Action:** [UPDATE_CATEGORY: product_id, new_category]
**Examples:**
- "change category of Product 0 to Desserts" → [UPDATE_CATEGORY: product-id, Desserts]
- "move Goutier Cake to Cakes category" → [UPDATE_CATEGORY: product-id, Cakes]

## 5. UPDATE PRICE
**Triggers:** "change price", "update price", "set price", "price to"
**Action:** [UPDATE_PRICE: product_id, new_price]
**Examples:**
- "set price of Product 0 to 35.50" → [UPDATE_PRICE: product-id, 35.50]
- "change price to €40" → [UPDATE_PRICE: product-id, 40]

## 6. UPDATE DESCRIPTION
**Triggers:** "change description", "update description", "set description"
**Action:** [UPDATE_DESCRIPTION: product_id, new_description]
**Examples:**
- "update description of Product 0 to Premium quality cake" → [UPDATE_DESCRIPTION: product-id, Premium quality cake]

## 7. DELETE PRODUCT
**Triggers:** "delete", "remove product", "remove from catalog"
**Action:** [DELETE_PRODUCT: product_id]
**Examples:**
- "delete Product 0" → [DELETE_PRODUCT: product-id]
- "remove Goutier Cake" → [DELETE_PRODUCT: product-id]

## 8. GREETINGS & GENERAL CHAT
**Triggers:** "hi", "hello", "help", general conversation
**Action:** [SHOW_NONE]
**Examples:**
- "hi" → "Hello! How can I help you manage your products today? [SHOW_NONE]"

# ACTION TAGS REFERENCE

**Product Display:**
- `[SHOW_NONE]` - No products to display (greetings, general chat)
- `[SHOW_ONE: index]` - Show single product (index from Products available list)
- `[SHOW_TWO: i1, i2]` - Show two products
- `[SHOW_MATCHES]` - Show top matching products (up to 10)

**Product Management Actions:**
- `[UPDATE_STOCK: product_id, quantity]` - Update stock quantity
- `[UPDATE_NAME: product_id, new_name]` - Update product name
- `[UPDATE_CATEGORY: product_id, new_category]` - Update product category
- `[UPDATE_PRICE: product_id, new_price]` - Update product price (numeric, no € symbol)
- `[UPDATE_DESCRIPTION: product_id, new_description]` - Update product description
- `[DELETE_PRODUCT: product_id]` - Delete product from catalog

# CRITICAL RULES

1. **TAG PLACEMENT:** The action tag MUST be at the very END of your response - no exceptions!
2. **PRODUCT ID:** Always use the UUID from the product ID field, NOT the index number
3. **PRICE FORMAT:** Prices should be numeric only (e.g., 35.50, not €35.50)
4. **CONFIRMATION:** Always confirm which product you're updating by name before making changes
5. **NO ASSUMPTIONS:** Don't update products unless supplier explicitly asks. Verify product exists first.

# RESPONSE FORMAT

**Structure:**
1. Brief, helpful response (1-2 sentences max)
2. Action tag at the end

**Good Examples:**
- "Here are your cake products! [SHOW_MATCHES]"
- "Updated stock of Goutier Cake to 50! [UPDATE_STOCK: abc-123-def, 50]"
- "Changed category to Desserts! [UPDATE_CATEGORY: abc-123-def, Desserts]"
- "Renamed to Premium Cake! [UPDATE_NAME: abc-123-def, Premium Cake]"

**Bad Examples (WRONG):**
- "I'll update the stock" (missing tag!)
- "Updated!" (missing tag!)
- "Sure!" (missing tag!)

# EDGE CASES

- **No products found:** "I couldn't find any products matching your request. Could you try different keywords? [SHOW_NONE]"
- **Ambiguous product:** "Which product would you like to update? I found multiple matches. [SHOW_MATCHES]"
- **Invalid operation:** "I can help you update products. What would you like to change? [SHOW_NONE]"

Remember: Be concise, helpful, and ALWAYS end with an action tag!"""


def build_user_prompt(query: str, context: str, history: List[Dict], supplier_id: str) -> str:
    """Build the user prompt with clear structure using RAG best practices."""
    # Count products in context (each product line starts with "Product X:")
    product_count = context.count('Product ')
    max_idx = max(0, product_count - 1)
    
    prompt = f"""# SUPPLIER QUERY
"{query}"

# CONVERSATION HISTORY (READ THIS FIRST - Use for context!)
"""
    
    # Add conversation history for context - make it prominent
    if history and len(history) > 0:
        recent_history = history[-6:] if len(history) > 6 else history
        for i, msg in enumerate(recent_history):
            role = "Supplier" if msg["role"] == "user" else "Assistant"
            # Mark the most recent message
            marker = " ← MOST RECENT" if i == len(recent_history) - 1 else ""
            prompt += f"{role}: {msg['content']}{marker}\n"
    else:
        prompt += "No previous conversation.\n"
    
    prompt += f"""
# RETRIEVED PRODUCTS (Use these for management operations)
{context if context else "No products found matching this query."}

# YOUR TASK
Analyze the supplier's intent. If they mention a product action (rename, update stock, etc.) without specifying which product, check the conversation history to see which product was just shown or discussed. Use the retrieved product information and conversation context to determine the correct product ID. Respond with an appropriate action tag at the end."""
    return prompt


async def generate_llm_response(
    query: str, 
    context: str, 
    products: list, 
    history: List[Dict] = None,
    supplier_id: str = None
) -> Tuple[str, List[dict], Optional[dict]]:
    """
    Generate LLM response and parse intent tags with retry logic.
    
    Returns: (response_text, products_to_show, action)
    """
    # Build prompts once
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(query, context, history or [], supplier_id or "")
    
    # Configure API - same as customer RAG
    api_url = os.getenv('OPENROUTER_API_URL', 'https://openrouter.ai/api/v1')
    llm_model = os.getenv('LLM_MODEL', 'openai/gpt-4o')
    temperature = float(os.getenv('LLM_TEMPERATURE', '0.3'))  # Lower = faster, more consistent
    max_tokens = int(os.getenv('LLM_MAX_TOKENS', '150'))  # Reduced for speed
    
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
            
            clean_text, products_to_show, action = parse_llm_response(
                full_response, products
            )
            
            return clean_text, products_to_show, action
            
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
            return "I'm here to help! What would you like to do?", [], None
    
    # Fallback if all retries fail
    return "I'm having trouble right now. Please try again.", [], None


def parse_llm_response(
    full_response: str, 
    products: list
) -> Tuple[str, List[dict], Optional[dict]]:
    """
    Parse LLM response and extract intent tags.
    
    Tags: [SHOW_NONE], [SHOW_ONE: idx], [SHOW_TWO: i1, i2], [SHOW_MATCHES],
          [UPDATE_STOCK: product_id, qty], [UPDATE_NAME: product_id, name],
          [UPDATE_CATEGORY: product_id, category], [UPDATE_PRICE: product_id, price],
          [UPDATE_DESCRIPTION: product_id, description], [DELETE_PRODUCT: product_id]
    
    Returns: (clean_text, products_to_show, action)
    """
    products_to_show = []
    action = None
    clean_text = full_response
    
    try:
        # Check for DELETE_PRODUCT first (highest priority)
        if '[DELETE_PRODUCT:' in full_response:
            match = re.search(r'\[DELETE_PRODUCT:\s*([a-f0-9\-]+)\]', full_response)
            if match:
                product_id = match.group(1).strip()
                action = {
                    "type": "delete_product",
                    "product_id": product_id
                }
            clean_text = re.sub(r'\[DELETE_PRODUCT:\s*[a-f0-9\-]+\]', '', full_response).strip()
            if not clean_text or not clean_text.strip():
                clean_text = "Product deleted successfully!"
            return clean_text.strip(), products_to_show, action
        
        # Check for UPDATE_STOCK
        if '[UPDATE_STOCK:' in full_response:
            match = re.search(r'\[UPDATE_STOCK:\s*([a-f0-9\-]+)\s*,\s*(\d+)\]', full_response)
            if match:
                product_id = match.group(1).strip()
                quantity = int(match.group(2))
                action = {
                    "type": "update_stock",
                    "product_id": product_id,
                    "stock_quantity": quantity
                }
            clean_text = re.sub(r'\[UPDATE_STOCK:\s*[a-f0-9\-]+\s*,\s*\d+\]', '', full_response).strip()
            if not clean_text or not clean_text.strip():
                clean_text = "Stock updated successfully!"
            return clean_text.strip(), products_to_show, action
        
        # Check for UPDATE_NAME
        if '[UPDATE_NAME:' in full_response:
            match = re.search(r'\[UPDATE_NAME:\s*([a-f0-9\-]+)\s*,\s*(.+?)\]', full_response)
            if match:
                product_id = match.group(1).strip()
                new_name = match.group(2).strip()
                action = {
                    "type": "update_name",
                    "product_id": product_id,
                    "name": new_name
                }
            clean_text = re.sub(r'\[UPDATE_NAME:\s*[a-f0-9\-]+\s*,\s*.+?\]', '', full_response).strip()
            if not clean_text or not clean_text.strip():
                clean_text = "Product name updated successfully!"
            return clean_text.strip(), products_to_show, action
        
        # Check for UPDATE_CATEGORY
        if '[UPDATE_CATEGORY:' in full_response:
            match = re.search(r'\[UPDATE_CATEGORY:\s*([a-f0-9\-]+)\s*,\s*(.+?)\]', full_response)
            if match:
                product_id = match.group(1).strip()
                new_category = match.group(2).strip()
                action = {
                    "type": "update_category",
                    "product_id": product_id,
                    "category": new_category
                }
            clean_text = re.sub(r'\[UPDATE_CATEGORY:\s*[a-f0-9\-]+\s*,\s*.+?\]', '', full_response).strip()
            if not clean_text or not clean_text.strip():
                clean_text = "Category updated successfully!"
            return clean_text.strip(), products_to_show, action
        
        # Check for UPDATE_PRICE
        if '[UPDATE_PRICE:' in full_response:
            match = re.search(r'\[UPDATE_PRICE:\s*([a-f0-9\-]+)\s*,\s*([\d\.]+)\]', full_response)
            if match:
                product_id = match.group(1).strip()
                new_price = float(match.group(2))
                action = {
                    "type": "update_price",
                    "product_id": product_id,
                    "price": new_price
                }
            clean_text = re.sub(r'\[UPDATE_PRICE:\s*[a-f0-9\-]+\s*,\s*[\d\.]+\]', '', full_response).strip()
            if not clean_text or not clean_text.strip():
                clean_text = "Price updated successfully!"
            return clean_text.strip(), products_to_show, action
        
        # Check for UPDATE_DESCRIPTION
        if '[UPDATE_DESCRIPTION:' in full_response:
            match = re.search(r'\[UPDATE_DESCRIPTION:\s*([a-f0-9\-]+)\s*,\s*(.+?)\]', full_response)
            if match:
                product_id = match.group(1).strip()
                new_description = match.group(2).strip()
                action = {
                    "type": "update_description",
                    "product_id": product_id,
                    "description": new_description
                }
            clean_text = re.sub(r'\[UPDATE_DESCRIPTION:\s*[a-f0-9\-]+\s*,\s*.+?\]', '', full_response).strip()
            if not clean_text or not clean_text.strip():
                clean_text = "Description updated successfully!"
            return clean_text.strip(), products_to_show, action
        
        # Check for SHOW_ONE
        if '[SHOW_ONE:' in full_response:
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
            products_to_show = products[:10] if products else []
            clean_text = full_response.replace('[SHOW_MATCHES]', '').strip()
        
        # Check for SHOW_NONE
        elif '[SHOW_NONE]' in full_response:
            products_to_show = []
            clean_text = full_response.replace('[SHOW_NONE]', '').strip()
        
        if not clean_text or not clean_text.strip():
            clean_text = "How can I help you manage your products?"
        
        return clean_text.strip(), products_to_show, action
        
    except Exception as e:
        return "How can I help you?", [], None


# ============================================================================
# ACTION EXECUTION
# ============================================================================

async def execute_supplier_action(action: dict, supplier_id: str) -> dict:
    """
    Execute supplier action based on action type.
    
    Returns: {"success": bool, "message": str, "data": dict}
    """
    action_type = action.get("type")
    product_id = action.get("product_id")
    
    try:
        if action_type == "update_stock":
            stock_quantity = action.get("stock_quantity")
            logger.info(f"[RAG] Supplier {supplier_id} updating stock for product {product_id} to {stock_quantity}")
            result = await update_product_stock(product_id, stock_quantity)
            return {
                "success": True,
                "message": f"Stock updated to {stock_quantity}",
                "data": result
            }
        elif action_type == "update_name":
            name = action.get("name")
            logger.info(f"[RAG] Supplier {supplier_id} updating name for product {product_id} to '{name}'")
            result = await update_product(product_id, {"name": name})
            return {
                "success": True,
                "message": f"Product name updated to '{name}'",
                "data": result
            }
        elif action_type == "update_category":
            category = action.get("category")
            logger.info(f"[RAG] Supplier {supplier_id} updating category for product {product_id} to '{category}'")
            result = await update_product(product_id, {"category": category})
            return {
                "success": True,
                "message": f"Category updated to '{category}'",
                "data": result
            }
        elif action_type == "update_price":
            price = action.get("price")
            logger.info(f"[RAG] Supplier {supplier_id} updating price for product {product_id} to €{price}")
            result = await update_product(product_id, {"price": price})
            return {
                "success": True,
                "message": f"Price updated to €{price:.2f}",
                "data": result
            }
        elif action_type == "update_description":
            description = action.get("description")
            logger.info(f"[RAG] Supplier {supplier_id} updating description for product {product_id}")
            result = await update_product(product_id, {"description": description})
            return {
                "success": True,
                "message": "Description updated successfully",
                "data": result
            }
        elif action_type == "delete_product":
            from lib.product_handler import delete_product
            logger.info(f"[RAG] Supplier {supplier_id} deleting product {product_id}")
            result = await delete_product(product_id)
            return {
                "success": True,
                "message": "Product deleted successfully",
                "data": result
            }
        elif action_type == "create_product":
            product_data = action.get("product_data")
            logger.info(f"[RAG] Supplier {supplier_id} creating product with data: {product_data}")
            from lib.product_handler import create_product
            result = await create_product(product_data)
            return {
                "success": True,
                "message": "Product created successfully",
                "data": result
            }
        else:
            logger.warning(f"[RAG] Supplier {supplier_id} unknown action type: {action_type}")
            return {
                "success": False,
                "message": f"Unknown action type: {action_type}",
                "data": None
            }
    except Exception as e:
        logger.error(f"[RAG] Supplier {supplier_id} failed to execute action {action_type}: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to execute action: {str(e)}",
            "data": None
        }
