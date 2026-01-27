"""
Chat session and message persistence handler.
Manages saving and loading chat history from database.
"""

import json
from typing import List, Dict, Optional
from lib.db import get_db_connection, release_db_connection
import logging

logger = logging.getLogger(__name__)

_tables_verified = False

def _ensure_tables_exist(cursor, conn):
    """Create chat tables if they don't exist."""
    global _tables_verified
    if _tables_verified:
        return

    try:
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name IN ('chat_sessions', 'chat_messages')
        """)
        existing = [row['table_name'] for row in cursor.fetchall()]

        if 'chat_sessions' not in existing:
            logger.info("Creating chat_sessions table...")
            cursor.execute("""
                CREATE TABLE chat_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id VARCHAR(255) NOT NULL,
                    title VARCHAR(255) DEFAULT 'New Chat',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    deleted_at TIMESTAMP WITH TIME ZONE
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC)")
            conn.commit()

        if 'chat_messages' not in existing:
            logger.info("Creating chat_messages table...")
            cursor.execute("""
                CREATE TABLE chat_messages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                    role VARCHAR(20) NOT NULL,
                    content TEXT NOT NULL,
                    products JSONB,
                    cart_action JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at)")
            conn.commit()

        _tables_verified = True
    except Exception as e:
        logger.error(f"Failed to ensure tables exist: {str(e)}")
        raise


def create_chat_session(user_id: str, title: str = "New Chat") -> Optional[str]:
    """
    Create a new chat session for a user.
    
    Args:
        user_id: UUID of the user
        title: Optional title for the chat session
    
    Returns:
        Session ID (UUID string) or None if creation failed
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Ensure tables exist on first use
        _ensure_tables_exist(cursor, conn)

        cursor.execute("""
            INSERT INTO chat_sessions (user_id, title)
            VALUES (%s, %s)
            RETURNING id
        """, (user_id, title))
        
        result = cursor.fetchone()
        session_id = str(result['id']) if result else None
        conn.commit()
        
        return session_id
    except Exception as e:
        import traceback
        logger.error(f"Failed to create chat session: {str(e)}\n{traceback.format_exc()}")
        if conn:
            try:
                conn.rollback()
            except:
                pass
        return None
    finally:
        if conn:
            release_db_connection(conn)


def get_chat_sessions(user_id: str, limit: int = 50) -> List[Dict]:
    """
    Get all chat sessions for a user, ordered by most recent.
    
    Args:
        user_id: UUID of the user
        limit: Maximum number of sessions to return
    
    Returns:
        List of chat session dicts with id, title, created_at, updated_at
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Optimized query without subquery for faster performance
        cursor.execute("""
            SELECT 
                cs.id, 
                cs.title, 
                cs.created_at, 
                cs.updated_at,
                COALESCE(cm.message_count, 0) as message_count
            FROM chat_sessions cs
            LEFT JOIN LATERAL (
                SELECT COUNT(*) as message_count
                FROM chat_messages
                WHERE session_id = cs.id
            ) cm ON true
            WHERE cs.user_id = %s AND cs.deleted_at IS NULL
            ORDER BY cs.updated_at DESC
            LIMIT %s
        """, (user_id, limit))
        
        sessions = [dict(row) for row in cursor.fetchall()]
        return sessions
    except Exception as e:
        logger.error(f"Failed to fetch chat sessions: {str(e)}")
        return []
    finally:
        if conn:
            release_db_connection(conn)


def get_chat_history(session_id: str, user_id: str) -> List[Dict]:
    """
    Get all messages for a chat session.
    Verifies user owns the session for security.
    
    Args:
        session_id: UUID of the chat session
        user_id: UUID of the user (for verification)
    
    Returns:
        List of messages with role, content, products, cart_action, created_at
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify user owns this session
        cursor.execute("""
            SELECT user_id FROM chat_sessions WHERE id = %s
        """, (session_id,))
        
        session = cursor.fetchone()
        if not session or str(session['user_id']) != user_id:
            logger.warning(f"Unauthorized access attempt to session {session_id} by user {user_id}")
            return []
        
        # Optimized: Fetch messages with index usage
        cursor.execute("""
            SELECT id, role, content, products, cart_action, created_at
            FROM chat_messages
            WHERE session_id = %s
            ORDER BY created_at ASC
            -- Uses idx_chat_messages_session_created index
        """, (session_id,))
        
        messages = [dict(row) for row in cursor.fetchall()]
        return messages
    except Exception as e:
        logger.error(f"Failed to fetch chat history: {str(e)}")
        return []
    finally:
        if conn:
            release_db_connection(conn)


def save_chat_message(
    session_id: str,
    role: str,
    content: str,
    products: Optional[List] = None,
    cart_action: Optional[Dict] = None
) -> Optional[str]:
    """
    Save a message to a chat session.
    
    Args:
        session_id: UUID of the chat session
        role: 'user' or 'assistant'
        content: Message text
        products: Optional list of product objects
        cart_action: Optional cart action object
    
    Returns:
        Message ID or None if save failed
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Also update the session's updated_at timestamp
        cursor.execute("""
            INSERT INTO chat_messages (session_id, role, content, products, cart_action)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (
            session_id,
            role,
            content,
            json.dumps(products) if products else None,
            json.dumps(cart_action) if cart_action else None
        ))
        
        result = cursor.fetchone()
        message_id = str(result['id']) if result else None
        
        # Update session updated_at
        cursor.execute("""
            UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (session_id,))
        
        conn.commit()
        return message_id
    except Exception as e:
        logger.error(f"Failed to save chat message: {str(e)}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            release_db_connection(conn)


def update_session_title(session_id: str, user_id: str, title: str) -> bool:
    """
    Update a chat session's title.
    Auto-generates title from first user message if not provided.
    
    Args:
        session_id: UUID of the chat session
        user_id: UUID of the user (for verification)
        title: New title for the session
    
    Returns:
        True if successful, False otherwise
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify user owns this session
        cursor.execute("""
            SELECT user_id FROM chat_sessions WHERE id = %s
        """, (session_id,))
        
        session = cursor.fetchone()
        if not session or str(session['user_id']) != user_id:
            return False
        
        cursor.execute("""
            UPDATE chat_sessions SET title = %s
            WHERE id = %s
        """, (title, session_id))
        
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to update session title: {str(e)}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            release_db_connection(conn)


def delete_chat_session(session_id: str, user_id: str) -> bool:
    """
    Permanently delete a chat session and its messages.

    Args:
        session_id: UUID of the chat session
        user_id: UUID of the user (for verification)

    Returns:
        True if successful, False otherwise
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # First delete messages associated with this session
        cursor.execute("""
            DELETE FROM chat_messages
            WHERE session_id = %s
        """, (session_id,))

        # Then delete the session itself (with user verification)
        cursor.execute("""
            DELETE FROM chat_sessions
            WHERE id = %s AND user_id = %s
        """, (session_id, user_id))

        # Check if session was actually deleted
        session_deleted = cursor.rowcount > 0
        conn.commit()

        return session_deleted
    except Exception as e:
        logger.error(f"Failed to delete chat session: {str(e)}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            release_db_connection(conn)


def auto_generate_session_title(session_id: str) -> bool:
    """
    Auto-generate session title from first user message.
    Takes first 50 characters of first user message as title.
    
    Args:
        session_id: UUID of the chat session
    
    Returns:
        True if title was generated and updated, False otherwise
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get first user message
        cursor.execute("""
            SELECT content FROM chat_messages
            WHERE session_id = %s AND role = 'user'
            ORDER BY created_at ASC
            LIMIT 1
        """, (session_id,))
        
        result = cursor.fetchone()
        if not result:
            return False
        
        # Generate title (first 50 chars or first sentence)
        content = result['content']
        title = content[:50] if len(content) > 50 else content
        
        # If it ends mid-word, truncate to last space
        if len(content) > 50 and ' ' in title:
            title = title.rsplit(' ', 1)[0]
        
        # Update session title
        cursor.execute("""
            UPDATE chat_sessions SET title = %s
            WHERE id = %s AND title = 'New Chat'
        """, (title, session_id))
        
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to auto-generate session title: {str(e)}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            release_db_connection(conn)
