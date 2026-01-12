#!/usr/bin/env python3
"""
Backfill Embeddings Script
Generates embeddings for existing products that don't have them.
Run this once after deploying the embedding generation updates.
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib.db import get_db_connection, release_db_connection
from lib.embedding_utils import generate_product_embedding


async def backfill_embeddings():
    """Generate embeddings for all products without them."""
    print("=" * 60)
    print("BACKFILL EMBEDDINGS SCRIPT")
    print("=" * 60)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Find products without embeddings
        cursor.execute("""
            SELECT id, name, category, description
            FROM products
            WHERE embedding IS NULL
        """)
        products = cursor.fetchall()

        total = len(products)
        print(f"\nFound {total} products without embeddings\n")

        if total == 0:
            print("All products already have embeddings!")
            return

        success = 0
        failed = 0

        for i, product in enumerate(products, 1):
            product_id = str(product['id'])
            name = product['name']
            category = product['category']
            description = product['description']

            print(f"[{i}/{total}] Processing: {name[:50]}...", end=" ")

            try:
                embedding = await generate_product_embedding(name, category, description)

                if embedding:
                    cursor.execute(
                        "UPDATE products SET embedding = %s WHERE id = %s",
                        (embedding, product_id)
                    )
                    conn.commit()
                    print("OK")
                    success += 1
                else:
                    print("FAILED (no embedding returned)")
                    failed += 1
            except Exception as e:
                print(f"ERROR: {e}")
                failed += 1

            # Small delay to avoid rate limiting
            await asyncio.sleep(0.1)

        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total products:  {total}")
        print(f"Success:         {success}")
        print(f"Failed:          {failed}")
        print("=" * 60)

    finally:
        release_db_connection(conn)


if __name__ == "__main__":
    asyncio.run(backfill_embeddings())
