from typing import Optional, Dict, List
from lib.db import get_db_connection
from lib.embedding_utils import generate_query_embedding, generate_product_embedding
from lib.vector_search import search_products_by_embedding
import uuid
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

async def get_products(filters: Dict = None):
    """Get products with optional filters."""
    if filters is None:
        filters = {}
    
    category = filters.get('category')
    supplier_id = filters.get('supplierId')
    limit = filters.get('limit', 50)
    
    conn = get_db_connection()
    try:
        query = 'SELECT * FROM products WHERE stock_quantity > 0'
        params = []

        if category:
            query += ' AND category = %s'
            params.append(category)

        if supplier_id:
            query += ' AND supplier_id = %s'
            params.append(supplier_id)

        query += ' ORDER BY created_at DESC LIMIT %s'
        params.append(limit)

        cursor = conn.cursor()
        cursor.execute(query, tuple(params))
        
        rows = cursor.fetchall()
        
        products = []
        for row in rows:
            product = dict(row)
            # Convert UUID and Decimal to strings/float
            product['id'] = str(product['id'])
            product['price'] = float(product['price']) if product['price'] else 0.0
            if 'supplier_id' in product and product['supplier_id']:
                product['supplier_id'] = str(product['supplier_id'])
            products.append(product)
        
        return {
            "products": products,
            "count": len(products)
        }
    finally:
        from lib.db import release_db_connection
        release_db_connection(conn)

async def search_products(query: str, limit: int = 5):
    """Semantic product search using embeddings."""
    if not query:
        raise ValueError('Query is required')

    # Generate embedding for the query
    embedding = await generate_query_embedding(query)
    
    if not embedding:
        raise ValueError('Failed to generate embedding')

    # Search products using vector similarity
    products = await search_products_by_embedding(embedding, limit)

    return {
        "products": products,
        "query": query,
        "count": len(products)
    }


async def create_product(product_data: Dict) -> Dict:
    """Create a new product with embedding for RAG search."""
    conn = get_db_connection()
    try:
        product_id = str(uuid.uuid4())
        name = product_data.get('name')
        category = product_data.get('category')
        description = product_data.get('description')

        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO products
            (id, supplier_id, name, category, description, price, image_url, stock_quantity, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            product_id,
            product_data.get('supplier_id'),
            name,
            category,
            description,
            product_data.get('price'),
            product_data.get('image_url'),
            product_data.get('stock_quantity', 0),
            datetime.now(),
            datetime.now()
        ))
        conn.commit()

        # Generate embedding for RAG search (non-blocking - product still created if this fails)
        try:
            embedding = await generate_product_embedding(name, category, description)
            if embedding:
                cursor.execute(
                    "UPDATE products SET embedding = %s WHERE id = %s",
                    (embedding, product_id)
                )
                conn.commit()
                logger.info(f"Generated embedding for product {product_id}")
            else:
                logger.warning(f"Failed to generate embedding for product {product_id}")
        except Exception as e:
            logger.error(f"Error generating embedding for product {product_id}: {e}")

        return {"id": product_id, "message": "Product created successfully"}
    finally:
        from lib.db import release_db_connection
        release_db_connection(conn)


async def bulk_create_products(products: List[Dict], supplier_id: str) -> Dict:
    """
    Bulk create products from Excel import.

    Args:
        products: List of validated product dictionaries
        supplier_id: Supplier ID to associate with all products

    Returns:
        Dict with created product IDs and any errors
    """
    if not products:
        return {"created": [], "errors": [], "message": "No products to create"}

    conn = get_db_connection()
    created_ids = []
    errors = []

    try:
        cursor = conn.cursor()
        now = datetime.now()

        for idx, product_data in enumerate(products):
            try:
                product_id = str(uuid.uuid4())

                cursor.execute("""
                    INSERT INTO products
                    (id, supplier_id, name, category, description, price, image_url, stock_quantity, source_url, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    product_id,
                    supplier_id,
                    product_data.get('name'),
                    product_data.get('category'),
                    product_data.get('description'),
                    product_data.get('price'),
                    product_data.get('image_url'),
                    product_data.get('stock_quantity', 0),
                    product_data.get('source_url'),
                    now,
                    now
                ))

                created_ids.append({
                    "id": product_id,
                    "name": product_data.get('name')
                })

            except Exception as e:
                errors.append({
                    "index": idx,
                    "name": product_data.get('name', 'Unknown'),
                    "error": str(e)
                })
                logger.error(f"Failed to create product {product_data.get('name')}: {e}")

        conn.commit()
        logger.info(f"Bulk created {len(created_ids)} products for supplier {supplier_id}")

        return {
            "created": created_ids,
            "created_count": len(created_ids),
            "errors": errors,
            "error_count": len(errors),
            "message": f"Successfully created {len(created_ids)} products" + (f" with {len(errors)} errors" if errors else "")
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"Bulk product creation failed: {e}")
        raise
    finally:
        from lib.db import release_db_connection
        release_db_connection(conn)


async def generate_embeddings_for_products(product_ids: List[str]) -> Dict:
    """
    Generate embeddings for a list of products (background task).

    Args:
        product_ids: List of product IDs to generate embeddings for

    Returns:
        Dict with success/failure counts
    """
    if not product_ids:
        return {"success": 0, "failed": 0}

    conn = get_db_connection()
    success_count = 0
    failed_count = 0

    try:
        cursor = conn.cursor()

        for product_id in product_ids:
            try:
                # Get product data
                cursor.execute(
                    "SELECT name, category, description FROM products WHERE id = %s",
                    (product_id,)
                )
                product = cursor.fetchone()

                if not product:
                    failed_count += 1
                    continue

                # Generate embedding
                embedding = await generate_product_embedding(
                    product['name'],
                    product.get('category'),
                    product.get('description')
                )

                if embedding:
                    cursor.execute(
                        "UPDATE products SET embedding = %s WHERE id = %s",
                        (embedding, product_id)
                    )
                    conn.commit()
                    success_count += 1
                    logger.debug(f"Generated embedding for product {product_id}")
                else:
                    failed_count += 1
                    logger.warning(f"Failed to generate embedding for product {product_id}")

            except Exception as e:
                failed_count += 1
                logger.error(f"Error generating embedding for product {product_id}: {e}")

        logger.info(f"Embedding generation complete: {success_count} success, {failed_count} failed")
        return {"success": success_count, "failed": failed_count}

    finally:
        from lib.db import release_db_connection
        release_db_connection(conn)


async def update_product(product_id: str, product_data: Dict) -> Dict:
    """Update an existing product. Only updates fields that are provided."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Check if embedding-related fields are being updated
        embedding_fields_changed = any(
            field in product_data for field in ['name', 'category', 'description']
        )

        # Build dynamic UPDATE query - only update fields that are provided
        updates = []
        values = []

        if 'name' in product_data:
            updates.append("name = %s")
            values.append(product_data['name'])

        if 'category' in product_data:
            updates.append("category = %s")
            values.append(product_data['category'])

        if 'description' in product_data:
            updates.append("description = %s")
            values.append(product_data['description'])

        if 'price' in product_data:
            updates.append("price = %s")
            values.append(product_data['price'])

        if 'image_url' in product_data:
            updates.append("image_url = %s")
            values.append(product_data['image_url'])

        if 'stock_quantity' in product_data:
            updates.append("stock_quantity = %s")
            values.append(product_data['stock_quantity'])

        if 'supplier_id' in product_data:
            updates.append("supplier_id = %s")
            values.append(product_data['supplier_id'])

        # Always update updated_at
        updates.append("updated_at = %s")
        values.append(datetime.now())

        # Add product_id for WHERE clause
        values.append(product_id)

        if not updates:
            return {"id": product_id, "message": "No fields to update"}

        query = f"""
            UPDATE products
            SET {', '.join(updates)}
            WHERE id = %s
        """

        cursor.execute(query, tuple(values))
        conn.commit()

        # Regenerate embedding if name, category, or description changed
        if embedding_fields_changed:
            try:
                # Get updated product data for embedding
                cursor.execute(
                    "SELECT name, category, description FROM products WHERE id = %s",
                    (product_id,)
                )
                product = cursor.fetchone()
                if product:
                    embedding = await generate_product_embedding(
                        product['name'],
                        product['category'],
                        product['description']
                    )
                    if embedding:
                        cursor.execute(
                            "UPDATE products SET embedding = %s WHERE id = %s",
                            (embedding, product_id)
                        )
                        conn.commit()
                        logger.info(f"Regenerated embedding for product {product_id}")
                    else:
                        logger.warning(f"Failed to regenerate embedding for product {product_id}")
            except Exception as e:
                logger.error(f"Error regenerating embedding for product {product_id}: {e}")

        return {"id": product_id, "message": "Product updated successfully"}
    finally:
        from lib.db import release_db_connection
        release_db_connection(conn)


async def delete_product(product_id: str) -> Dict:
    """Delete a product."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
        conn.commit()
        
        return {"id": product_id, "message": "Product deleted successfully"}
    finally:
        from lib.db import release_db_connection
        release_db_connection(conn)


async def update_product_stock(product_id: str, stock_quantity: int) -> Dict:
    """Update product stock quantity."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE products 
            SET stock_quantity = %s, updated_at = %s
            WHERE id = %s
        """, (stock_quantity, datetime.now(), product_id))
        conn.commit()
        
        return {"id": product_id, "stock_quantity": stock_quantity, "message": "Stock updated successfully"}
    finally:
        from lib.db import release_db_connection
        release_db_connection(conn)


