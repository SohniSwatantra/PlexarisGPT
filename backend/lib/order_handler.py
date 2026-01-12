import json
import uuid
from datetime import datetime
from .db import get_db_connection, release_db_connection
import logging

logger = logging.getLogger(__name__)

def create_order(user_id: str, items: list, total_amount: float):
    """
    Create a new order with items.
    Creates one row in order_history and multiple rows in order_items.
    
    Args:
        user_id: Customer's UUID
        items: List of {product_id, name, quantity, price, supplier_id, image_url}
        total_amount: Total order amount
    
    Returns:
        dict: {success: bool, order_id: str, message: str, total_amount: float}
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Generate order ID
        order_id = str(uuid.uuid4())
        
        # Get supplier_id from first item (assuming all items from same supplier)
        supplier_id = items[0].get('supplier_id') if items else None
        
        # Validate stock availability for all items first
        for item in items:
            cursor.execute(
                "SELECT stock_quantity FROM products WHERE id = %s",
                (item['product_id'],)
            )
            result = cursor.fetchone()
            
            if not result:
                return {
                    'success': False,
                    'message': f"Product {item['name']} not found"
                }
            
            current_stock = result['stock_quantity']
            if current_stock < item['quantity']:
                return {
                    'success': False,
                    'message': f"Insufficient stock for {item['name']}. Available: {current_stock}"
                }
        
        # Step 1: Create order in order_history
        cursor.execute(
            """
            INSERT INTO order_history 
            (id, user_id, supplier_id, total_amount, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (order_id, user_id, supplier_id, total_amount, 'completed')
        )
        
        # Step 2: Create order items
        for item in items:
            cursor.execute(
                """
                INSERT INTO order_items 
                (id, order_id, product_id, name, quantity, price, image_url, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    str(uuid.uuid4()),
                    order_id,
                    item['product_id'],
                    item['name'],
                    item['quantity'],
                    item['price'],
                    item.get('image_url')
                )
            )
        
        # Step 3: Reduce stock for each product
        for item in items:
            cursor.execute(
                """
                UPDATE products 
                SET stock_quantity = stock_quantity - %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (item['quantity'], item['product_id'])
            )
        
        conn.commit()
        release_db_connection(conn)
        
        return {
            'success': True,
            'order_id': order_id,
            'total_amount': total_amount,
            'message': 'Order placed successfully!'
        }
        
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}", exc_info=True)
        conn.rollback()
        release_db_connection(conn)
        return {
            'success': False,
            'message': f'Failed to create order: {str(e)}'
        }


def get_user_orders(user_id: str):
    """
    Get all orders for a specific user with their items.
    
    Args:
        user_id: Customer's UUID
    
    Returns:
        list: Orders with nested order_items
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all orders with their items
        cursor.execute(
            """
            SELECT 
                oh.id,
                oh.user_id,
                oh.supplier_id,
                oh.total_amount,
                oh.status,
                oh.created_at,
                oi.id as item_id,
                oi.product_id,
                oi.name,
                oi.quantity,
                oi.price,
                oi.image_url
            FROM order_history oh
            LEFT JOIN order_items oi ON oi.order_id = oh.id
            WHERE oh.user_id = %s
            ORDER BY oh.created_at DESC, oi.created_at ASC
            """,
            (user_id,)
        )
        
        rows = cursor.fetchall()
        
        # Group items by order
        orders_dict = {}
        for row in rows:
            order_id = str(row['id'])
            
            if order_id not in orders_dict:
                orders_dict[order_id] = {
                    'id': order_id,
                    'user_id': str(row['user_id']),
                    'supplier_id': str(row['supplier_id']) if row['supplier_id'] else None,
                    'total_amount': float(row['total_amount']),
                    'status': row['status'],
                    'created_at': row['created_at'].isoformat(),
                    'order_items': []
                }
            
            # Add item if exists
            if row['item_id']:
                orders_dict[order_id]['order_items'].append({
                    'id': str(row['item_id']),
                    'product_id': str(row['product_id']),
                    'name': row['name'],
                    'quantity': row['quantity'],
                    'price': float(row['price']),
                    'image_url': row['image_url']
                })
        
        return list(orders_dict.values())
        
    except Exception as e:
        logger.error(f"Error getting user orders: {str(e)}")
        return []
    finally:
        release_db_connection(conn)


def get_supplier_orders(supplier_id: str):
    """
    Get all orders for a specific supplier with their items.
    
    Args:
        supplier_id: Supplier's UUID
    
    Returns:
        list: Orders with nested order_items for this supplier
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all orders with their items for this supplier
        cursor.execute(
            """
            SELECT 
                oh.id,
                oh.user_id,
                oh.supplier_id,
                oh.total_amount,
                oh.status,
                oh.created_at,
                oi.id as item_id,
                oi.product_id,
                oi.name,
                oi.quantity,
                oi.price,
                oi.image_url
            FROM order_history oh
            LEFT JOIN order_items oi ON oi.order_id = oh.id
            WHERE oh.supplier_id = %s
            ORDER BY oh.created_at DESC, oi.created_at ASC
            """,
            (supplier_id,)
        )
        
        rows = cursor.fetchall()
        
        # Group items by order
        orders_dict = {}
        for row in rows:
            order_id = str(row['id'])
            
            if order_id not in orders_dict:
                orders_dict[order_id] = {
                    'id': order_id,
                    'user_id': str(row['user_id']),
                    'supplier_id': str(row['supplier_id']) if row['supplier_id'] else None,
                    'total_amount': float(row['total_amount']),
                    'status': row['status'],
                    'created_at': row['created_at'].isoformat(),
                    'order_items': []
                }
            
            # Add item if exists
            if row['item_id']:
                orders_dict[order_id]['order_items'].append({
                    'id': str(row['item_id']),
                    'product_id': str(row['product_id']),
                    'name': row['name'],
                    'quantity': row['quantity'],
                    'price': float(row['price']),
                    'image_url': row['image_url']
                })
        
        return list(orders_dict.values())
        
    except Exception as e:
        logger.error(f"Error getting supplier orders: {str(e)}")
        return []
    finally:
        release_db_connection(conn)


def get_order_by_id(order_id: str):
    """
    Get a specific order by ID with its items.
    
    Args:
        order_id: Order UUID
    
    Returns:
        dict: Order with nested order_items or None
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """
            SELECT 
                oh.id,
                oh.user_id,
                oh.supplier_id,
                oh.total_amount,
                oh.status,
                oh.created_at,
                oi.id as item_id,
                oi.product_id,
                oi.name,
                oi.quantity,
                oi.price,
                oi.image_url
            FROM order_history oh
            LEFT JOIN order_items oi ON oi.order_id = oh.id
            WHERE oh.id = %s
            ORDER BY oi.created_at ASC
            """,
            (order_id,)
        )
        
        rows = cursor.fetchall()
        if not rows:
            return None
        
        # Build order with items
        first_row = rows[0]
        order = {
            'id': str(first_row['id']),
            'user_id': str(first_row['user_id']),
            'supplier_id': str(first_row['supplier_id']) if first_row['supplier_id'] else None,
            'total_amount': float(first_row['total_amount']) if first_row['total_amount'] is not None else 0.0,
            'status': first_row['status'],
            'created_at': first_row['created_at'].isoformat(),
            'order_items': []
        }
        
        # Add all items
        for row in rows:
            if row['item_id']:
                order['order_items'].append({
                    'id': str(row['item_id']),
                    'product_id': str(row['product_id']),
                    'name': row['name'],
                    'quantity': row['quantity'],
                    'price': float(row['price']),
                    'image_url': row['image_url']
                })
        
        return order
        
    except Exception as e:
        logger.error(f"Error getting order by id: {str(e)}")
        return None
    finally:
        release_db_connection(conn)
