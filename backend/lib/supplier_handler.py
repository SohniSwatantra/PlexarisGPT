from lib.db import get_db_connection

async def get_all_suppliers():
    """Get all suppliers from suppliers table."""
    import psycopg2
    import asyncio
    from lib.db import release_db_connection
    
    max_retries = 3
    for attempt in range(max_retries):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    s.id,
                    s.name,
                    s.website_url,
                    COUNT(p.id) as product_count
                FROM suppliers s
                LEFT JOIN products p ON s.id = p.supplier_id AND p.stock_quantity > 0
                GROUP BY s.id, s.name, s.website_url
                ORDER BY product_count DESC, s.name
            """)
            
            suppliers = []
            for row in cursor.fetchall():
                suppliers.append({
                    "id": str(row['id']),
                    "name": row['name'],
                    "website_url": row['website_url'],
                    "product_count": row['product_count'] or 0
                })
            
            return suppliers
        except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
            error_msg = str(e)
            is_connection_error = ('SSL connection has been closed' in error_msg or 
                                  'connection' in error_msg.lower() or
                                  'closed' in error_msg.lower())
            
            # Clean up bad connection - don't try to release it, just close it
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                # Don't try to rollback or release bad connections - just close them
                try:
                    conn.close()
                except:
                    pass
                conn = None
            
            # Retry on SSL connection errors
            if is_connection_error and attempt < max_retries - 1:
                # Small delay before retry
                await asyncio.sleep(0.1 * (attempt + 1))
                continue
            raise
        except Exception as e:
            # Clean up on any error - close connection instead of releasing
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                # Close bad connection instead of trying to release it
                try:
                    conn.close()
                except:
                    pass
                conn = None
            
            # Only retry on connection errors
            if attempt < max_retries - 1 and isinstance(e, (psycopg2.OperationalError, psycopg2.InterfaceError)):
                error_msg = str(e)
                is_connection_error = ('SSL connection has been closed' in error_msg or 
                                      'connection' in error_msg.lower() or
                                      'closed' in error_msg.lower())
                if is_connection_error:
                    await asyncio.sleep(0.1 * (attempt + 1))
                    continue
            raise
        finally:
            # Only release connection if we successfully completed the operation
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    # Try to release connection, but catch SSL errors
                    if not conn.closed:
                        try:
                            release_db_connection(conn)
                        except (psycopg2.OperationalError, psycopg2.InterfaceError):
                            # If release fails due to SSL/connection error, just close it
                            try:
                                conn.close()
                            except:
                                pass
                    else:
                        conn.close()
                except:
                    # If anything fails, just try to close it
                    try:
                        conn.close()
                    except:
                        pass
    
    return []

async def get_supplier_by_id(supplier_id: str):
    """Get supplier information by ID from suppliers table."""
    import psycopg2
    import asyncio
    import uuid
    from lib.db import release_db_connection

    # Validate UUID format to prevent database errors
    if not supplier_id or supplier_id == 'undefined' or supplier_id == 'null':
        return None
    try:
        uuid.UUID(supplier_id)
    except (ValueError, AttributeError):
        return None

    max_retries = 3
    for attempt in range(max_retries):
        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    s.id,
                    s.name,
                    s.website_url,
                    COUNT(p.id) as product_count
                FROM suppliers s
                LEFT JOIN products p ON s.id = p.supplier_id AND p.stock_quantity > 0
                WHERE s.id = %s
                GROUP BY s.id, s.name, s.website_url
            """, (supplier_id,))
            
            result = cursor.fetchone()
            if result:
                return {
                    "id": str(result['id']),
                    "name": result['name'],
                    "website_url": result['website_url'],
                    "product_count": result['product_count'] or 0
                }
            return None
        except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
            error_msg = str(e)
            # Clean up bad connection
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    if not conn.closed:
                        conn.rollback()
                    release_db_connection(conn)
                except:
                    try:
                        conn.close()
                    except:
                        pass
                conn = None
            
            # Retry on SSL connection errors
            if ('SSL connection has been closed' in error_msg or 
                'connection' in error_msg.lower() or
                'closed' in error_msg.lower()) and attempt < max_retries - 1:
                # Small delay before retry
                await asyncio.sleep(0.1 * (attempt + 1))
                continue
            raise
        except Exception as e:
            # Clean up on any error - close connection instead of releasing
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                # Close bad connection instead of trying to release it
                try:
                    conn.close()
                except:
                    pass
                conn = None
            
            # Only retry on connection errors
            if attempt < max_retries - 1 and isinstance(e, (psycopg2.OperationalError, psycopg2.InterfaceError)):
                error_msg = str(e)
                is_connection_error = ('SSL connection has been closed' in error_msg or 
                                      'connection' in error_msg.lower() or
                                      'closed' in error_msg.lower())
                if is_connection_error:
                    await asyncio.sleep(0.1 * (attempt + 1))
                    continue
            raise
        finally:
            # Only release connection if we successfully completed the operation
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    # Try to release connection, but catch SSL errors
                    if not conn.closed:
                        try:
                            release_db_connection(conn)
                        except (psycopg2.OperationalError, psycopg2.InterfaceError):
                            # If release fails due to SSL/connection error, just close it
                            try:
                                conn.close()
                            except:
                                pass
                    else:
                        conn.close()
                except:
                    # If anything fails, just try to close it
                    try:
                        conn.close()
                    except:
                        pass
    
    return None
