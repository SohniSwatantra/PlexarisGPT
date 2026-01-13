#!/usr/bin/env python3
"""
Setup chat tables in the database.
Run this once to create the chat_sessions and chat_messages tables.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib.db import get_db_connection, release_db_connection


def setup_chat_tables():
    """Create chat_sessions and chat_messages tables if they don't exist."""
    print("=" * 60)
    print("SETUP CHAT TABLES")
    print("=" * 60)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Check if tables exist
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name IN ('chat_sessions', 'chat_messages')
        """)
        existing_tables = [row['table_name'] for row in cursor.fetchall()]
        print(f"\nExisting tables: {existing_tables}")

        # Create chat_sessions table
        if 'chat_sessions' not in existing_tables:
            print("\nCreating chat_sessions table...")
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
            cursor.execute("""
                CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id)
            """)
            cursor.execute("""
                CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC)
            """)
            print("chat_sessions table created!")
        else:
            print("\nchat_sessions table already exists")

        # Create chat_messages table
        if 'chat_messages' not in existing_tables:
            print("\nCreating chat_messages table...")
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
            cursor.execute("""
                CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id)
            """)
            cursor.execute("""
                CREATE INDEX idx_chat_messages_session_created ON chat_messages(session_id, created_at)
            """)
            print("chat_messages table created!")
        else:
            print("\nchat_messages table already exists")

        conn.commit()
        print("\n" + "=" * 60)
        print("SETUP COMPLETE")
        print("=" * 60)

    except Exception as e:
        print(f"\nERROR: {e}")
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


if __name__ == "__main__":
    setup_chat_tables()
