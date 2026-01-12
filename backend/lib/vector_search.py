from lib.db import get_db_connection

async def search_products_by_embedding(embedding: list, limit: int = 5, supplier_id: str = None):
    """Search products using vector similarity with pgvector."""
    conn = get_db_connection()
    try:
        embedding_str = '[' + ','.join(map(str, embedding)) + ']'
        
        cursor = conn.cursor()
        
        if supplier_id:
            # Optimized query - uses idx_products_supplier and idx_products_embedding
            cursor.execute("""
                SELECT 
                    id,
                    name,
                    category,
                    description,
                    price,
                    image_url,
                    source_url,
                    stock_quantity,
                    supplier_id,
                    1 - (embedding <=> %s::vector) as similarity
                FROM products
                WHERE supplier_id = %s
                    AND embedding IS NOT NULL
                    AND stock_quantity > 0
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (embedding_str, supplier_id, embedding_str, limit))
        else:
            # Optimized query - uses idx_products_embedding
            cursor.execute("""
                SELECT 
                    id,
                    name,
                    category,
                    description,
                    price,
                    image_url,
                    source_url,
                    stock_quantity,
                    supplier_id,
                    1 - (embedding <=> %s::vector) as similarity
                FROM products
                WHERE embedding IS NOT NULL
                    AND stock_quantity > 0
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (embedding_str, embedding_str, limit))
        
        rows = cursor.fetchall()
        
        products = []
        for row in rows:
            product = dict(row)
            product['id'] = str(product['id'])
            product['price'] = float(product['price']) if product['price'] else 0.0
            product['similarity'] = float(product['similarity']) if product['similarity'] else 0.0
            if 'supplier_id' in product and product['supplier_id']:
                product['supplier_id'] = str(product['supplier_id'])
            products.append(product)
        
        return products
    finally:
        from lib.db import release_db_connection
        release_db_connection(conn)

