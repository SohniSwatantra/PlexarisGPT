#!/usr/bin/env python3
"""
Script to import QSTA products from CSV into the database.
Creates new supplier "QSTA" and imports all products with embeddings.
"""

import os
import sys
import csv
import uuid
import re
import asyncio
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from lib.db import get_db_connection, release_db_connection
from lib.embedding_utils import generate_product_embedding

def parse_price(price_str):
    """Parse price string like '€ 7,55 /Unit excl. BTW' to float."""
    if not price_str:
        return 0.0
    # Remove currency symbol, unit info, and convert comma to dot
    match = re.search(r'€?\s*([\d,\.]+)', price_str)
    if match:
        price = match.group(1).replace(',', '.')
        try:
            return float(price)
        except ValueError:
            return 0.0
    return 0.0

def parse_stock(stock_str):
    """Parse stock string like '161 stocks available' to int."""
    if not stock_str:
        return 0
    # Check for "Available soon" or similar
    if 'soon' in stock_str.lower() or 'bestelling' in stock_str.lower():
        return 0
    # Extract number
    match = re.search(r'(\d+)', stock_str)
    if match:
        return int(match.group(1))
    return 0

async def create_qsta_supplier(conn):
    """Create QSTA supplier and return its ID."""
    cursor = conn.cursor()

    # Check if QSTA already exists
    cursor.execute("SELECT id FROM suppliers WHERE LOWER(name) LIKE '%qsta%'")
    existing = cursor.fetchone()

    if existing:
        print(f"QSTA supplier already exists with ID: {existing['id']}")
        return str(existing['id'])

    # Create new supplier
    supplier_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO suppliers (id, name, website_url, email, created_at, onboarding_completed)
        VALUES (%s, %s, %s, %s, NOW(), TRUE)
        RETURNING id
    """, (supplier_id, 'QSTA', 'https://www.qsta.nl', 'info@qsta.nl'))

    result = cursor.fetchone()
    conn.commit()

    print(f"Created QSTA supplier with ID: {result['id']}")
    return str(result['id'])

async def import_products(csv_path, supplier_id):
    """Import products from CSV file."""
    conn = get_db_connection()

    try:
        cursor = conn.cursor()

        # Read CSV file
        products = []
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                products.append(row)

        print(f"Found {len(products)} products to import")

        imported = 0
        skipped = 0

        for i, product in enumerate(products):
            name = product.get('name', '').strip()
            if not name:
                skipped += 1
                continue

            url = product.get('url', '').strip()
            price = parse_price(product.get('price', ''))
            stock = parse_stock(product.get('stock_status', ''))
            image_url = product.get('image_url', '').strip()
            category = product.get('category', 'General').strip()

            # Create product ID
            product_id = str(uuid.uuid4())

            # Build description from name and category
            description = f"{name}. Category: {category}."

            # Insert product
            try:
                cursor.execute("""
                    INSERT INTO products
                    (id, supplier_id, name, category, description, price, image_url, source_url, stock_quantity, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    product_id,
                    supplier_id,
                    name,
                    category,
                    description,
                    price,
                    image_url,
                    url,
                    stock,
                    datetime.now(),
                    datetime.now()
                ))
                conn.commit()
                imported += 1

                # Generate embedding
                try:
                    embedding = await generate_product_embedding(name, category, description)
                    if embedding:
                        cursor.execute(
                            "UPDATE products SET embedding = %s WHERE id = %s",
                            (embedding, product_id)
                        )
                        conn.commit()
                        print(f"  [{i+1}/{len(products)}] Imported with embedding: {name[:50]}...")
                    else:
                        print(f"  [{i+1}/{len(products)}] Imported (no embedding): {name[:50]}...")
                except Exception as e:
                    print(f"  [{i+1}/{len(products)}] Imported (embedding failed): {name[:50]}... - {e}")

            except Exception as e:
                print(f"  Error importing {name}: {e}")
                conn.rollback()
                skipped += 1

        print(f"\nImport complete: {imported} products imported, {skipped} skipped")
        return imported

    finally:
        release_db_connection(conn)

async def main():
    """Main entry point."""
    csv_path = os.path.join(os.path.dirname(__file__), 'qsta_products.csv')

    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        sys.exit(1)

    print("=" * 60)
    print("QSTA Product Import Script")
    print("=" * 60)

    # Get connection for supplier creation
    conn = get_db_connection()
    try:
        supplier_id = await create_qsta_supplier(conn)
    finally:
        release_db_connection(conn)

    # Import products
    await import_products(csv_path, supplier_id)

    print("\n" + "=" * 60)
    print("Import completed successfully!")
    print("Users can now see QSTA products alongside Beuk products in chat.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
