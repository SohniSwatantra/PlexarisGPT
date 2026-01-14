"""
Excel Import Module for Plexaris
Handles parsing Excel files and importing product data into the database and RAG pipeline.
"""
import logging
from typing import Dict, List, Tuple, Optional
from openpyxl import load_workbook
from openpyxl.utils.exceptions import InvalidFileException
from io import BytesIO

logger = logging.getLogger(__name__)

# Expected column mappings (case-insensitive)
COLUMN_MAPPINGS = {
    'name': ['name', 'product name', 'product_name', 'title', 'product'],
    'category': ['category', 'type', 'product category', 'product_category'],
    'description': ['description', 'desc', 'product description', 'details'],
    'price': ['price', 'cost', 'unit price', 'unit_price', 'amount'],
    'stock_quantity': ['stock', 'stock_quantity', 'quantity', 'qty', 'inventory', 'stock quantity'],
    'image_url': ['image', 'image_url', 'image url', 'photo', 'picture', 'img'],
    'source_url': ['source', 'source_url', 'url', 'link', 'product url', 'product_url'],
}

# Required fields for product creation
REQUIRED_FIELDS = ['name']


def normalize_column_name(col_name: str) -> Optional[str]:
    """Map Excel column name to database field name."""
    if not col_name:
        return None

    col_lower = col_name.lower().strip()

    for field, aliases in COLUMN_MAPPINGS.items():
        if col_lower in aliases:
            return field

    return None


def parse_excel_file(file_content: bytes) -> Tuple[List[Dict], List[Dict]]:
    """
    Parse Excel file and extract product data.

    Args:
        file_content: Raw bytes of the Excel file

    Returns:
        Tuple of (valid_products, errors)
        - valid_products: List of product dictionaries ready for database insertion
        - errors: List of error dictionaries with row numbers and error messages
    """
    valid_products = []
    errors = []

    try:
        # Load workbook from bytes
        workbook = load_workbook(filename=BytesIO(file_content), read_only=True, data_only=True)
        sheet = workbook.active

        if not sheet:
            return [], [{"row": 0, "error": "No active sheet found in Excel file"}]

        # Get header row (first row)
        headers = []
        header_row = next(sheet.iter_rows(min_row=1, max_row=1, values_only=True), None)

        if not header_row:
            return [], [{"row": 0, "error": "Empty Excel file - no header row found"}]

        # Map headers to field names
        column_map = {}  # {column_index: field_name}
        for idx, header in enumerate(header_row):
            if header:
                field_name = normalize_column_name(str(header))
                if field_name:
                    column_map[idx] = field_name
                    headers.append(field_name)

        if not column_map:
            return [], [{"row": 1, "error": f"No recognized columns found. Expected columns: {list(COLUMN_MAPPINGS.keys())}"}]

        # Check for required fields
        found_fields = set(column_map.values())
        missing_required = set(REQUIRED_FIELDS) - found_fields
        if missing_required:
            return [], [{"row": 1, "error": f"Missing required columns: {missing_required}"}]

        logger.info(f"Found columns: {list(column_map.values())}")

        # Process data rows (starting from row 2)
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                # Extract product data based on column mapping
                product = {}
                for col_idx, field_name in column_map.items():
                    if col_idx < len(row):
                        value = row[col_idx]
                        if value is not None:
                            product[field_name] = value

                # Skip empty rows
                if not product or not product.get('name'):
                    if any(row):  # Row has some data but no name
                        errors.append({
                            "row": row_idx,
                            "error": "Missing required field: name",
                            "data": str(row)[:100]
                        })
                    continue

                # Validate and clean product data
                validated_product, validation_error = validate_product(product, row_idx)

                if validation_error:
                    errors.append(validation_error)
                else:
                    valid_products.append(validated_product)

            except Exception as e:
                errors.append({
                    "row": row_idx,
                    "error": f"Failed to parse row: {str(e)}",
                    "data": str(row)[:100] if row else "empty"
                })

        workbook.close()

    except InvalidFileException as e:
        return [], [{"row": 0, "error": f"Invalid Excel file format: {str(e)}"}]
    except Exception as e:
        logger.error(f"Error parsing Excel file: {str(e)}")
        return [], [{"row": 0, "error": f"Failed to parse Excel file: {str(e)}"}]

    return valid_products, errors


def validate_product(product: Dict, row_idx: int) -> Tuple[Optional[Dict], Optional[Dict]]:
    """
    Validate and clean product data.

    Args:
        product: Raw product dictionary from Excel
        row_idx: Row number for error reporting

    Returns:
        Tuple of (validated_product, error)
        - If valid: (product_dict, None)
        - If invalid: (None, error_dict)
    """
    validated = {}

    # Name (required)
    name = product.get('name')
    if not name or not str(name).strip():
        return None, {"row": row_idx, "error": "Name is required and cannot be empty"}
    validated['name'] = str(name).strip()[:500]  # Limit length

    # Category (optional but recommended)
    category = product.get('category')
    if category:
        validated['category'] = str(category).strip()[:100]

    # Description (optional)
    description = product.get('description')
    if description:
        validated['description'] = str(description).strip()[:2000]

    # Price (optional, must be numeric and positive)
    price = product.get('price')
    if price is not None:
        try:
            price_float = float(price)
            if price_float < 0:
                return None, {"row": row_idx, "error": f"Price cannot be negative: {price}"}
            validated['price'] = round(price_float, 2)
        except (ValueError, TypeError):
            return None, {"row": row_idx, "error": f"Invalid price value: {price}"}

    # Stock quantity (optional, must be integer and non-negative)
    stock = product.get('stock_quantity')
    if stock is not None:
        try:
            stock_int = int(float(stock))  # Handle "10.0" etc
            if stock_int < 0:
                return None, {"row": row_idx, "error": f"Stock quantity cannot be negative: {stock}"}
            validated['stock_quantity'] = stock_int
        except (ValueError, TypeError):
            return None, {"row": row_idx, "error": f"Invalid stock quantity value: {stock}"}
    else:
        validated['stock_quantity'] = 0  # Default to 0

    # Image URL (optional)
    image_url = product.get('image_url')
    if image_url:
        validated['image_url'] = str(image_url).strip()[:500]

    # Source URL (optional)
    source_url = product.get('source_url')
    if source_url:
        validated['source_url'] = str(source_url).strip()[:500]

    return validated, None


def get_import_summary(valid_count: int, error_count: int, errors: List[Dict]) -> Dict:
    """Generate a summary of the import operation."""
    summary = {
        "total_processed": valid_count + error_count,
        "successful": valid_count,
        "failed": error_count,
        "success_rate": round(valid_count / (valid_count + error_count) * 100, 1) if (valid_count + error_count) > 0 else 0
    }

    if errors:
        # Include first 10 errors in summary
        summary["sample_errors"] = errors[:10]
        if len(errors) > 10:
            summary["additional_errors"] = len(errors) - 10

    return summary
