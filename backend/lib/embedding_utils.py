import os
import hashlib
import httpx
from cachetools import TTLCache

# Cache for embeddings (1000 items, 1 hour TTL)
embedding_cache = TTLCache(maxsize=1000, ttl=3600)

# Shared async HTTP client with connection pooling
http_client = None

def get_http_client():
    """Get or create shared HTTP client with keep-alive."""
    global http_client
    if http_client is None:
        # Connection pooling: reuse connections for speed
        http_client = httpx.AsyncClient(
            timeout=30.0,
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20)
        )
    return http_client

def get_cache_key(text: str) -> str:
    """Generate cache key for text."""
    return hashlib.md5(text.encode()).hexdigest()

async def generate_query_embedding(text: str):
    cache_key = get_cache_key(text)
    if cache_key in embedding_cache:
        return embedding_cache[cache_key]
    
    try:
        api_url = os.getenv('OPENROUTER_API_URL', 'https://openrouter.ai/api/v1')
        embedding_model = os.getenv('EMBEDDING_MODEL', 'openai/text-embedding-3-small')
        
        client = get_http_client()
        response = await client.post(
            f"{api_url}/embeddings",
            headers={
                "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                "Content-Type": "application/json",
            },
            json={
                "model": embedding_model,
                "input": text
            }
        )
        response.raise_for_status()
        data = response.json()
        embedding = data["data"][0]["embedding"]
        
        embedding_cache[cache_key] = embedding
        
        return embedding
    except Exception as e:
        return None

async def generate_product_embedding(name: str, category: str = None, description: str = None):
    """Generate embedding for product data.

    Creates a text representation of the product combining name, category, and description,
    then generates an embedding vector for semantic search.
    """
    # Build product text - prioritize name, then add category and description if available
    parts = [name]
    if category:
        parts.append(category)
    if description:
        parts.append(description)

    product_text = " ".join(parts)

    # Use the same embedding generation as queries
    return await generate_query_embedding(product_text)


async def close_http_client():
    """Close the shared HTTP client on shutdown."""
    global http_client
    if http_client:
        await http_client.aclose()
        http_client = None

