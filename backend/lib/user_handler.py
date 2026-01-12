from lib.db import get_db_connection

async def get_user_by_id(id: str):
    """
    Get user by id (no auth logic).
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, email, business_name, address, contact_phone
            FROM users
            WHERE id = %s
        """, (id,))
        
        result = cursor.fetchone()
        if result:
            return {
                "id": str(result['id']),
                "email": result['email'],
                "business_name": result.get('business_name'),
                "address": result.get('address'),
                "contact_phone": result.get('contact_phone'),
            }
        return None
    finally:
        if conn:
            from lib.db import release_db_connection
            release_db_connection(conn)
