import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from psycopg2 import extensions
import logging

logger = logging.getLogger(__name__)

# Connection pool for better performance
_connection_pool = None

def get_connection_pool():
    """Get or create database connection pool."""
    global _connection_pool
    
    if _connection_pool is None:
        database_url = os.getenv('DATABASE_URL')
        
        if not database_url:
            raise ValueError(
                "DATABASE_URL environment variable is not set. "
                "Please create a .env file in the root directory with: DATABASE_URL=your_connection_string"
            )
        
        try:
            # Create connection pool optimized for Neon serverless
            # Use lower minconn to avoid stale connections when DB sleeps
            _connection_pool = pool.ThreadedConnectionPool(
                minconn=1,  # Low min to handle Neon sleep/wake cycles
                maxconn=10,  # Conservative max for serverless
                dsn=database_url,
                cursor_factory=RealDictCursor,
                connect_timeout=10,  # Longer timeout for cold starts
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=5
            )
            logger.info("Database connection pool created successfully")
        except psycopg2.OperationalError as e:
            logger.error(f"Failed to create connection pool: {str(e)}")
            raise ConnectionError(f"Failed to connect to database: {str(e)}. Please check your DATABASE_URL.")
    
    return _connection_pool

def get_db_connection():
    """Get database connection from pool."""
    global _connection_pool
    pool = get_connection_pool()
    max_retries = 3
    
    for attempt in range(max_retries):
        conn = None
        try:
            conn = pool.getconn()
            
            # Validate connection is still alive
            if conn.closed:
                # Connection is closed, get a new one
                try:
                    conn.close()
                except:
                    pass
                conn = None
                if attempt < max_retries - 1:
                    continue
                raise ConnectionError("Connection is closed")
            
            # Check connection status
            try:
                # Check if connection is in a bad state by checking status attribute
                status = conn.status
                if status == extensions.STATUS_IN_TRANSACTION:
                    # Connection is in a bad state, rollback and reset
                    try:
                        conn.rollback()
                    except:
                        pass
            except (psycopg2.OperationalError, psycopg2.InterfaceError, AttributeError):
                # Connection is bad, close it and retry
                try:
                    conn.close()
                except:
                    pass
                conn = None
                if attempt < max_retries - 1:
                    # Recreate pool if SSL error
                    try:
                        _connection_pool.closeall()
                    except:
                        pass
                    _connection_pool = None
                    pool = get_connection_pool()
                    continue
                raise ConnectionError("Connection status check failed")
            
            # Set autocommit to False for explicit transaction control
            conn.autocommit = False
            return conn
            
        except psycopg2.OperationalError as e:
            # Clean up bad connection
            if conn:
                try:
                    conn.close()
                except:
                    pass
                conn = None
            
            # If SSL connection closed, recreate pool and retry
            error_msg = str(e)
            if ('SSL connection has been closed' in error_msg or 
                'connection' in error_msg.lower() or
                'closed' in error_msg.lower()) and attempt < max_retries - 1:
                try:
                    _connection_pool.closeall()
                except:
                    pass
                _connection_pool = None
                pool = get_connection_pool()
                continue
            logger.error(f"OperationalError in get_db_connection: {error_msg}")
            raise
        except Exception as e:
            # Clean up on any error
            if conn:
                try:
                    conn.close()
                except:
                    pass
                conn = None
            
            if attempt < max_retries - 1:
                continue
            logger.error(f"Failed to get connection from pool: {str(e)}")
            raise
    
    raise ConnectionError("Failed to get valid database connection after retries")

def release_db_connection(conn):
    """Release connection back to pool."""
    if conn:
        try:
            # Check if connection is closed before returning to pool
            if conn.closed:
                return
            
            # Always rollback or commit before returning to pool
            try:
                if conn.status == extensions.STATUS_IN_TRANSACTION:
                    conn.rollback()
            except:
                pass
            
            pool = get_connection_pool()
            pool.putconn(conn)
        except Exception as e:
            # If we can't return to pool, just close the connection
            logger.warning(f"Failed to return connection to pool: {str(e)}")
            try:
                conn.close()
            except:
                pass

def close_all_connections():
    """Close all connections in pool (for shutdown)."""
    global _connection_pool
    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("All database connections closed")

