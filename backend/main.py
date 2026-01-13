"""
Plexaris API - Unified Backend
Consolidated from Main App, Supplier Portal, and Customer Portal
"""
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
import stripe
import time
import hashlib
import json
from uuid import uuid4
from datetime import datetime

from lib.rag_handler import handle_rag_query
from lib.supplier_rag_handler import handle_supplier_rag_query
from lib.product_handler import get_products, search_products, create_product, update_product, delete_product, update_product_stock
from lib.supplier_handler import get_all_suppliers, get_supplier_by_id
from lib.user_handler import get_user_by_id
from lib.order_handler import create_order, get_user_orders, get_supplier_orders, get_order_by_id
from lib.chat_handler import (
    create_chat_session, get_chat_sessions, get_chat_history,
    save_chat_message, update_session_title, delete_chat_session, auto_generate_session_title
)

# Load .env file
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# In-memory stores for ChatGPT Action prototype
cart_store: Dict[str, Dict] = {}
orders_store: Dict[str, Dict] = {}

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Plexaris API...")
    from lib.db import get_connection_pool
    try:
        pool = get_connection_pool()
        logger.info("Database connection pool initialized")

        conn = pool.getconn()
        cursor = conn.cursor()
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        logger.info(f"Database connected: {version.get('version', 'Unknown')[:50]}...")

        # Ensure chat tables exist
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name IN ('chat_sessions', 'chat_messages')
        """)
        existing_tables = [row['table_name'] for row in cursor.fetchall()]

        if 'chat_sessions' not in existing_tables:
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
            cursor.execute("CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id)")
            cursor.execute("CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC)")
            conn.commit()
            logger.info("chat_sessions table created")

        if 'chat_messages' not in existing_tables:
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
            cursor.execute("CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id)")
            cursor.execute("CREATE INDEX idx_chat_messages_session_created ON chat_messages(session_id, created_at)")
            conn.commit()
            logger.info("chat_messages table created")

        pool.putconn(conn)
    except Exception as e:
        logger.error(f"Database connection pool initialization failed: {str(e)}")
        app.state.db_unavailable = True

    if not os.getenv('OPENROUTER_API_KEY'):
        logger.warning("OPENROUTER_API_KEY not set - AI features will not work")
    else:
        logger.info("OpenRouter API key configured")

    logger.info("Plexaris API ready")
    yield

    logger.info("Shutting down Plexaris API...")
    from lib.db import close_all_connections
    from lib.embedding_utils import close_http_client
    close_all_connections()
    await close_http_client()
    logger.info("Cleanup completed")

app = FastAPI(
    title="Plexaris API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
    openapi_url="/api/openapi.json",
    response_model_exclude_unset=True,
    response_model_exclude_none=True,
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        if process_time > 0.2:
            logger.warning(f"Slow request: {request.method} {request.url.path} - {process_time:.3f}s")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Request failed: {request.method} {request.url.path} - {process_time:.3f}s - {str(e)}")
        raise

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {request.method} {request.url.path} - {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal error occurred. Please try again later.",
            "error_id": hashlib.md5(f"{time.time()}{request.url.path}".encode()).hexdigest()[:8]
        }
    )

# CORS middleware
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
    max_age=3600,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

API_ACCESS_KEY = os.getenv("API_ACCESS_KEY")
ALLOWED_PATHS = {"/", "/health", "/api/docs", "/api/redoc"}

@app.middleware("http")
async def api_key_guard(request: Request, call_next):
    if not API_ACCESS_KEY:
        return await call_next(request)
    if request.method == "OPTIONS":
        return await call_next(request)
    path = request.url.path
    if path in ALLOWED_PATHS or not path.startswith("/api"):
        return await call_next(request)
    header_key = request.headers.get("x-api-key")
    if header_key != API_ACCESS_KEY:
        return JSONResponse(status_code=401, content={"detail": "Invalid or missing API key"})
    return await call_next(request)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class RAGRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    userId: str = Field(..., min_length=1)
    supplierId: Optional[str] = None
    cartItems: Optional[List[dict]] = None
    sessionId: Optional[str] = None

    @field_validator('query')
    @classmethod
    def validate_query(cls, v):
        if not v or not v.strip():
            raise ValueError('Query cannot be empty')
        return v.strip()

class RAGResponse(BaseModel):
    response: str
    products: List[dict]
    query: str
    userId: str
    cart_action: Optional[dict] = None
    checkout_action: Optional[dict] = None

class SupplierRAGRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    supplierId: str = Field(..., min_length=1)
    history: Optional[List[Dict[str, str]]] = None

    @field_validator('query')
    @classmethod
    def validate_query(cls, v):
        if not v or not v.strip():
            raise ValueError('Query cannot be empty')
        return v.strip()

class SupplierRAGResponse(BaseModel):
    response: str
    products: List[dict]
    query: str
    supplierId: str
    action: Optional[dict] = None

class ProductSearchRequest(BaseModel):
    query: str
    filters: Optional[Dict] = None
    limit: Optional[int] = 5

class ProductSearchResponse(BaseModel):
    products: List[dict]
    query: str
    count: int
    total_results: Optional[int] = None

class OrderRequest(BaseModel):
    userId: str = Field(..., min_length=1)
    items: List[dict] = Field(..., min_length=1)
    totalAmount: float = Field(..., gt=0)

    @field_validator('totalAmount')
    @classmethod
    def validate_total(cls, v):
        if v <= 0:
            raise ValueError('Total amount must be greater than 0')
        if v > 1000000:
            raise ValueError('Total amount exceeds maximum allowed')
        return round(v, 2)

class CreateChatSessionRequest(BaseModel):
    userId: Optional[str] = None
    title: Optional[str] = "New Chat"

class SaveChatMessageRequest(BaseModel):
    role: str = Field(...)
    content: str = Field(...)
    products: Optional[List[dict]] = None
    cart_action: Optional[dict] = None

class UpdateChatTitleRequest(BaseModel):
    title: str = Field(..., min_length=1)

class CartAddRequest(BaseModel):
    user_id: str
    product_id: str
    quantity: int = Field(..., gt=0)
    size: Optional[str] = None
    color: Optional[str] = None

class CartUpdateRequest(BaseModel):
    user_id: str
    item_id: str
    quantity: int = Field(..., gt=0)

class CartRemoveRequest(BaseModel):
    user_id: str
    item_id: str

class ShippingAddress(BaseModel):
    name: str
    street: str
    city: str
    state: str
    zip: str
    country: str

class ChatGPTOrderRequest(BaseModel):
    user_id: str
    shipping_address: ShippingAddress

class CheckoutRequest(BaseModel):
    items: List[dict]
    supplierId: str

class SupplierCreate(BaseModel):
    email: str
    name: str
    website_url: Optional[str] = None
    address: Optional[str] = None
    business_name: Optional[str] = None
    auth_provider: Optional[str] = None

# ============================================================================
# HEALTH ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    return {"message": "Plexaris API", "status": "running", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    from lib.db import get_db_connection, release_db_connection

    db_healthy = False
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        db_healthy = True
        release_db_connection(conn)
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")

    return {
        "status": "healthy" if db_healthy else "degraded",
        "database": "connected" if db_healthy else "disconnected",
        "stripe_configured": bool(os.getenv('STRIPE_SECRET_KEY')),
        "openrouter_configured": bool(os.getenv('OPENROUTER_API_KEY')),
        "version": "2.0.5",
    }

@app.get("/api/debug/fix-chat-tables")
async def fix_chat_tables():
    """Fix chat tables - drop FK constraint and alter user_id to VARCHAR."""
    from lib.db import get_db_connection, release_db_connection

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        actions = []

        # Drop FK constraint if exists
        cursor.execute("""
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_name = 'chat_sessions' AND constraint_type = 'FOREIGN KEY'
        """)
        fk_constraints = cursor.fetchall()

        for fk in fk_constraints:
            constraint_name = fk['constraint_name']
            cursor.execute(f"ALTER TABLE chat_sessions DROP CONSTRAINT {constraint_name}")
            actions.append(f"Dropped constraint: {constraint_name}")

        # Alter user_id to VARCHAR(255) if it's UUID
        cursor.execute("""
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'chat_sessions' AND column_name = 'user_id'
        """)
        col_type = cursor.fetchone()
        if col_type and col_type['data_type'] == 'uuid':
            cursor.execute("ALTER TABLE chat_sessions ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::text")
            actions.append("Changed user_id from UUID to VARCHAR(255)")

        conn.commit()
        release_db_connection(conn)
        return {"actions": actions, "status": "success"}
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
            release_db_connection(conn)
        return {"error": str(e), "traceback": error_detail, "status": "failed"}

@app.get("/api/debug/setup-chat-tables")
async def setup_chat_tables():
    """Debug endpoint to check and create chat tables if missing."""
    from lib.db import get_db_connection, release_db_connection

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check existing tables
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name IN ('chat_sessions', 'chat_messages')
        """)
        existing_tables = [row['table_name'] for row in cursor.fetchall()]

        created = []

        if 'chat_sessions' not in existing_tables:
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
            created.append('chat_sessions')

        if 'chat_messages' not in existing_tables:
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
            created.append('chat_messages')

        release_db_connection(conn)

        return {
            "existing_tables": existing_tables,
            "created_tables": created,
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Setup chat tables failed: {str(e)}")
        if conn:
            try:
                conn.rollback()
            except:
                pass
            release_db_connection(conn)
        return {"error": str(e), "status": "failed"}

# ============================================================================
# AUTH ENDPOINTS
# ============================================================================

class AuthSyncRequest(BaseModel):
    email: str
    name: Optional[str] = None
    desired_role: Optional[str] = None

@app.post("/api/auth/sync-user")
async def sync_user(request: AuthSyncRequest):
    """
    Sync user after Neon Auth login/signup.
    Creates user if not exists, returns user info with role.
    Note: users table has columns: id, email, business_name, address, contact_phone
    Role is determined by checking if email exists in suppliers table.
    """
    from lib.db import get_db_connection, release_db_connection
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        email = request.email.lower().strip()
        name = request.name or email.split('@')[0]
        desired_role = request.desired_role

        # Check if user exists in users table
        cursor.execute("SELECT id, email, business_name FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        # Check if this email is a supplier
        cursor.execute("SELECT id, name, email FROM suppliers WHERE email = %s", (email,))
        supplier = cursor.fetchone()

        # Determine role based on supplier status
        user_role = 'supplier' if supplier else (desired_role or 'customer')
        supplier_id = str(supplier['id']) if supplier else None

        if user:
            # Existing user - return their info
            display_name = user.get('business_name') or name

            return {
                "user_id": str(user['id']),
                "email": user['email'],
                "name": display_name,
                "user_role": user_role,
                "supplier_id": supplier_id
            }
        else:
            # New user - create them
            cursor.execute("""
                INSERT INTO users (email, business_name)
                VALUES (%s, %s)
                RETURNING id, email, business_name
            """, (email, name))

            new_user = cursor.fetchone()
            conn.commit()

            return {
                "user_id": str(new_user['id']),
                "email": new_user['email'],
                "name": new_user.get('business_name') or name,
                "user_role": user_role,
                "supplier_id": supplier_id
            }

    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error syncing user: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)

# ============================================================================
# CHAT SESSION ROUTES (Customer Portal)
# ============================================================================

@app.post("/api/chat/sessions")
def create_chat_session_endpoint(request: Request, body: CreateChatSessionRequest = None):
    try:
        body = body or CreateChatSessionRequest()
        user_id = body.userId or request.query_params.get("userId") or request.headers.get("x-user-id")
        if not user_id:
            raise HTTPException(status_code=422, detail="userId is required")

        title = body.title or "New Chat"
        session_id = create_chat_session(user_id, title)
        if not session_id:
            raise HTTPException(status_code=500, detail="Failed to create chat session - check server logs")
        return {"session_id": session_id, "title": title}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create chat session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create chat session: {str(e)}")

@app.get("/api/chat/sessions")
def list_chat_sessions_endpoint(userId: str, limit: int = 50):
    try:
        sessions = get_chat_sessions(userId, limit)
        return sessions
    except Exception as e:
        logger.error(f"Failed to fetch chat sessions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch chat sessions")

@app.get("/api/chat/sessions/{session_id}")
def get_chat_history_endpoint(session_id: str, userId: str):
    try:
        messages = get_chat_history(session_id, userId)
        return messages
    except Exception as e:
        logger.error(f"Failed to fetch chat history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch chat history")

@app.post("/api/chat/sessions/{session_id}/messages")
def save_chat_message_endpoint(session_id: str, userId: str, request: SaveChatMessageRequest):
    try:
        message_id = save_chat_message(session_id, request.role, request.content, request.products, request.cart_action)
        if not message_id:
            raise HTTPException(status_code=500, detail="Failed to save message")
        return {"message_id": message_id, "success": True}
    except Exception as e:
        logger.error(f"Failed to save message: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save message")

@app.put("/api/chat/sessions/{session_id}/title")
def update_chat_title_endpoint(session_id: str, userId: str, request: UpdateChatTitleRequest):
    try:
        success = update_session_title(session_id, userId, request.title)
        if not success:
            raise HTTPException(status_code=403, detail="Failed to update session")
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update session title: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update session title")

@app.delete("/api/chat/sessions/{session_id}")
def delete_chat_session_endpoint(session_id: str, userId: str):
    try:
        success = delete_chat_session(session_id, userId)
        if not success:
            raise HTTPException(status_code=403, detail="Failed to delete session")
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to delete session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete session")

# ============================================================================
# RAG ENDPOINTS
# ============================================================================

async def save_messages_async(session_id: str, user_query: str, assistant_response: str, products: List, cart_action: Dict):
    try:
        save_chat_message(session_id, "user", user_query, None, None)
        save_chat_message(session_id, "assistant", assistant_response, products, cart_action)
        auto_generate_session_title(session_id)
    except Exception as e:
        logger.warning(f"Failed to save chat messages asynchronously: {str(e)}")

@app.post("/api/rag", response_model=RAGResponse)
async def rag_endpoint(request: RAGRequest, background_tasks: BackgroundTasks):
    try:
        logger.info(f"RAG request from user {request.userId}: {request.query[:50]}...")
        result = await handle_rag_query(request.query, request.userId, request.supplierId, request.cartItems)

        if request.sessionId:
            background_tasks.add_task(
                save_messages_async,
                request.sessionId,
                request.query,
                result.get('response'),
                result.get('products'),
                result.get('cart_action')
            )

        return result
    except ValueError as e:
        logger.warning(f"RAG validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"RAG endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process query. Please try again.")

@app.post("/api/supplier-rag", response_model=SupplierRAGResponse)
async def supplier_rag_endpoint(request: SupplierRAGRequest):
    try:
        logger.info(f"Supplier RAG request from supplier {request.supplierId}: {request.query[:50]}...")
        result = await handle_supplier_rag_query(request.query, request.supplierId, request.history)
        return result
    except ValueError as e:
        logger.warning(f"Supplier RAG validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Supplier RAG endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process query. Please try again.")

# ============================================================================
# PRODUCT ENDPOINTS
# ============================================================================

def format_product_payload(product: Dict) -> Dict:
    if not product:
        return {}
    return {
        "id": product.get("id"),
        "name": product.get("name"),
        "brand": product.get("brand") or product.get("supplier_name"),
        "category": product.get("category"),
        "description": product.get("description"),
        "price": float(product.get("price") or 0),
        "currency": product.get("currency") or "EUR",
        "sizes": product.get("sizes") or product.get("size") or [],
        "colors": product.get("colors") or product.get("color") or [],
        "image_url": product.get("image_url"),
        "in_stock": (product.get("stock_quantity") or 0) > 0,
        "stock_quantity": product.get("stock_quantity") or 0,
    }

@app.post("/api/products/search", response_model=ProductSearchResponse)
async def search_products_endpoint(request: ProductSearchRequest):
    try:
        result = await search_products(request.query, request.limit)
        formatted = [format_product_payload(p) for p in result.get("products", [])]
        return {
            "products": formatted,
            "query": request.query,
            "count": len(formatted),
            "total_results": result.get("count", len(formatted)),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products")
async def get_products_endpoint(category: Optional[str] = None, supplier_id: Optional[str] = None, limit: int = 50):
    try:
        return await get_products({"category": category, "supplierId": supplier_id, "limit": limit})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/products")
async def create_product_endpoint(product_data: dict):
    try:
        return await create_product(product_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/products/{product_id}")
async def update_product_endpoint(product_id: str, product_data: dict):
    try:
        return await update_product(product_id, product_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/products/{product_id}")
async def delete_product_endpoint(product_id: str):
    try:
        return await delete_product(product_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/products/{product_id}/stock")
async def update_product_stock_endpoint(product_id: str, data: dict):
    try:
        stock_quantity = data.get('stock_quantity', 0)
        return await update_product_stock(product_id, stock_quantity)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# CART ENDPOINTS (Main App - ChatGPT Action prototype)
# ============================================================================

def fetch_product_by_id(product_id: str) -> Optional[Dict]:
    from lib.db import get_db_connection, release_db_connection
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        row = cursor.fetchone()
        if not row:
            return None
        product = dict(row)
        product["id"] = str(product["id"])
        if product.get("supplier_id"):
            product["supplier_id"] = str(product["supplier_id"])
        if product.get("price") is not None:
            product["price"] = float(product["price"])
        if product.get("stock_quantity") is None:
            product["stock_quantity"] = 0
        return product
    except Exception as e:
        logger.warning(f"Could not load product {product_id}: {str(e)}")
        return None
    finally:
        if conn:
            release_db_connection(conn)

def get_cart_state(user_id: str) -> Dict:
    cart = cart_store.get(user_id, {"items": []})
    items = cart.get("items", [])
    item_count = sum(item.get("quantity", 0) for item in items)
    subtotal = round(sum(item.get("line_total", 0) for item in items), 2)
    return {"user_id": user_id, "items": items, "item_count": item_count, "subtotal": subtotal}

def upsert_cart_item(user_id: str, product: Dict, quantity: int, size: Optional[str], color: Optional[str]) -> Dict:
    cart = cart_store.setdefault(user_id, {"items": []})
    for item in cart["items"]:
        if item["product_id"] == product["id"] and item.get("size") == size and item.get("color") == color:
            item["quantity"] += quantity
            item["line_total"] = round(item["quantity"] * item["unit_price"], 2)
            return item

    item = {
        "item_id": f"item_{uuid4().hex[:8]}",
        "product_id": product["id"],
        "name": product.get("name"),
        "brand": product.get("brand"),
        "size": size,
        "color": color,
        "quantity": quantity,
        "unit_price": float(product.get("price") or 0),
        "line_total": round(quantity * float(product.get("price") or 0), 2),
        "image_url": product.get("image_url"),
    }
    cart["items"].append(item)
    return item

@app.get("/api/cart")
async def get_cart(user_id: str):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    return {"success": True, "cart": get_cart_state(user_id)}

@app.post("/api/cart/add")
async def add_to_cart(request: CartAddRequest):
    product = fetch_product_by_id(request.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    upsert_cart_item(request.user_id, product, request.quantity, request.size, request.color)
    return {"success": True, "cart": get_cart_state(request.user_id)}

@app.put("/api/cart/update")
async def update_cart(request: CartUpdateRequest):
    cart = cart_store.get(request.user_id, {"items": []})
    updated = False
    for item in cart.get("items", []):
        if item["item_id"] == request.item_id:
            item["quantity"] = request.quantity
            item["line_total"] = round(item["unit_price"] * request.quantity, 2)
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Cart item not found")
    return {"success": True, "cart": get_cart_state(request.user_id)}

@app.delete("/api/cart/remove")
async def remove_from_cart(request: CartRemoveRequest):
    cart = cart_store.get(request.user_id, {"items": []})
    new_items = [item for item in cart.get("items", []) if item["item_id"] != request.item_id]
    cart_store[request.user_id] = {"items": new_items}
    return {"success": True, "cart": get_cart_state(request.user_id)}

@app.delete("/api/cart/clear")
async def clear_cart(user_id: str):
    cart_store[user_id] = {"items": []}
    return {"success": True, "cart": get_cart_state(user_id)}

# ============================================================================
# SUPPLIER ENDPOINTS (Supplier Portal)
# ============================================================================

@app.get("/api/suppliers/check-email/{email}")
async def check_supplier_email(email: str):
    from lib.db import get_db_connection, release_db_connection
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, onboarding_step FROM suppliers WHERE email = %s", (email.lower(),))
        supplier = cursor.fetchone()

        if not supplier:
            conn.commit()
            return {"exists": False, "onboarding_step": None, "auth_provider": None}

        cursor.execute("SELECT id, name, status FROM businesses WHERE owner_supplier_id = %s", (supplier["id"],))
        business = cursor.fetchone()
        conn.commit()

        return {
            "exists": True,
            "supplier_id": str(supplier["id"]),
            "onboarding_step": supplier["onboarding_step"],
            "auth_provider": supplier.get("auth_provider"),
            "business": {"id": str(business["id"]), "name": business["name"], "status": business["status"]} if business else None
        }
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error checking supplier email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)

@app.post("/api/suppliers")
async def create_supplier(supplier: SupplierCreate):
    from lib.db import get_db_connection, release_db_connection
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        email = supplier.email.lower()
        name = supplier.name
        website_url = supplier.website_url or ''
        address = supplier.address
        business_name = supplier.business_name or name
        auth_provider = (supplier.auth_provider or "").lower() or None

        cursor.execute("SELECT id, name, email, auth_provider FROM suppliers WHERE email = %s", (email,))
        existing = cursor.fetchone()

        if existing:
            existing_provider = existing.get('auth_provider')
            provider_to_set = existing_provider or auth_provider

            cursor.execute("""
                UPDATE suppliers
                SET name = %s, website_url = %s, address = %s, business_name = %s, auth_provider = COALESCE(auth_provider, %s)
                WHERE email = %s
                RETURNING id, name, email, auth_provider
            """, (name, website_url, address, business_name, provider_to_set, email))
            result = cursor.fetchone()
            conn.commit()

            return {"success": True, "supplier_id": str(result['id']), "name": result['name'], "email": result['email'], "auth_provider": result.get('auth_provider'), "updated": True}
        else:
            provider_to_set = auth_provider or "google"
            cursor.execute("""
                INSERT INTO suppliers (name, website_url, email, address, business_name, created_at, onboarding_completed, auth_provider)
                VALUES (%s, %s, %s, %s, %s, NOW(), FALSE, %s)
                RETURNING id, name, email, auth_provider
            """, (name, website_url, email, address, business_name, provider_to_set))

            result = cursor.fetchone()
            conn.commit()

            return {"success": True, "supplier_id": str(result['id']), "name": result['name'], "email": result['email'], "auth_provider": result.get('auth_provider'), "created": True}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error creating/updating supplier: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)

@app.patch("/api/suppliers/{supplier_id}/complete-onboarding")
async def complete_supplier_onboarding(supplier_id: str):
    from lib.db import get_db_connection, release_db_connection
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE suppliers SET onboarding_completed = TRUE, onboarding_step = 'completed'
            WHERE id = %s RETURNING id, onboarding_completed, onboarding_step
        """, (supplier_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Supplier not found")

        conn.commit()
        return {"success": True, "supplier_id": str(result['id']), "onboarding_completed": result.get('onboarding_completed', False)}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error completing onboarding: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)

@app.post("/api/suppliers/onboarding-status")
async def supplier_onboarding_status(payload: dict):
    from lib.db import get_db_connection, release_db_connection

    email = payload.get("email")
    if not email:
        raise HTTPException(400, "Email required")

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, onboarding_step, onboarding_completed, claimed_business_id FROM suppliers WHERE email = %s", (email,))
        supplier = cursor.fetchone()

        if not supplier:
            conn.commit()
            raise HTTPException(403, "Supplier not found")

        conn.commit()
        return {
            "supplier_id": supplier["id"],
            "onboarding_step": supplier["onboarding_step"],
            "onboarding_completed": supplier["onboarding_completed"],
            "business_id": supplier["claimed_business_id"],
        }
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error getting onboarding status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)

@app.put("/api/suppliers/{supplier_id}")
async def update_supplier_endpoint(supplier_id: str, data: dict):
    from lib.db import get_db_connection, release_db_connection
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE suppliers SET name = %s, website_url = %s WHERE id = %s", (data.get('name'), data.get('website_url'), supplier_id))
        conn.commit()
        return {"success": True, "message": "Supplier updated"}
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error updating supplier: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            release_db_connection(conn)

@app.patch("/api/suppliers/{supplier_id}/auth-provider")
async def set_auth_provider(supplier_id: str, data: dict):
    from lib.db import get_db_connection, release_db_connection
    conn = None
    cursor = None
    provider = (data.get("auth_provider") or "").strip().lower()

    if provider not in ("google", "email_password"):
        raise HTTPException(status_code=400, detail="auth_provider must be 'google' or 'email_password'")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT auth_provider FROM suppliers WHERE id = %s", (supplier_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Supplier not found")

        existing = row.get("auth_provider")

        if existing and existing != provider:
            raise HTTPException(status_code=409, detail=f"Account already linked to {existing}. Use that login method.")

        if existing == provider:
            return {"success": True, "auth_provider": existing, "updated": False}

        cursor.execute("UPDATE suppliers SET auth_provider = %s WHERE id = %s RETURNING auth_provider", (provider, supplier_id))
        result = cursor.fetchone()
        conn.commit()
        return {"success": True, "auth_provider": result.get("auth_provider"), "updated": True}
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error setting auth provider: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)

@app.get("/api/suppliers/{supplier_id}")
async def get_supplier_by_id_endpoint(supplier_id: str):
    supplier = await get_supplier_by_id(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@app.get("/api/suppliers")
async def get_all_suppliers_endpoint():
    try:
        suppliers = await get_all_suppliers()
        return {"suppliers": suppliers, "count": len(suppliers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# USER ENDPOINTS
# ============================================================================

@app.get("/api/users/{user_id}")
async def get_user_by_id_endpoint(user_id: str):
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/api/users/{user_id}")
async def update_user_profile_endpoint(user_id: str, data: dict):
    from lib.db import get_db_connection, release_db_connection
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        fields = {
            'name': data.get('name'),
            'email': data.get('email'),
            'business_name': data.get('business_name'),
            'address': data.get('address'),
            'contact_phone': data.get('contact_phone'),
        }
        set_parts = []
        values = []
        for col, val in fields.items():
            if val is not None:
                set_parts.append(f"{col} = %s")
                values.append(val)
        if not set_parts:
            raise HTTPException(status_code=400, detail="No fields to update")
        values.append(user_id)
        sql = f"UPDATE users SET {', '.join(set_parts)} WHERE id = %s"
        cursor.execute(sql, tuple(values))
        conn.commit()

        logger.info(f"User {user_id} profile updated successfully")
        return {"success": True, "message": "User profile updated"}
    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error updating user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            release_db_connection(conn)

# ============================================================================
# ORDER ENDPOINTS
# ============================================================================

def create_mock_order_from_cart(user_id: str, shipping: ShippingAddress) -> Dict:
    cart = get_cart_state(user_id)
    if not cart["items"]:
        raise HTTPException(status_code=400, detail="Cart is empty")

    subtotal = cart["subtotal"]
    tax = round(subtotal * 0.09, 2)
    total = round(subtotal + tax, 2)
    order_id = f"ord_{uuid4().hex[:8]}"
    now_iso = datetime.utcnow().isoformat() + "Z"

    order = {
        "order_id": order_id,
        "user_id": user_id,
        "status": "pending_payment",
        "items": cart["items"],
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "shipping_address": shipping.model_dump(),
        "created_at": now_iso,
    }
    orders_store[order_id] = order
    cart_store[user_id] = {"items": []}
    return order

@app.post("/api/orders")
async def create_order_endpoint(request: Request):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    if "user_id" in payload and "shipping_address" in payload and "items" not in payload:
        try:
            order_req = ChatGPTOrderRequest(**payload)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
        order = create_mock_order_from_cart(order_req.user_id, order_req.shipping_address)
        return order

    try:
        order_req = OrderRequest(**payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        result = create_order(order_req.userId, order_req.items, order_req.totalAmount)
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=400, detail=result['message'])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders")
async def list_orders(user_id: str):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    proto_orders = [o for o in orders_store.values() if o.get("user_id") == user_id]
    if proto_orders:
        return {"orders": proto_orders}
    try:
        orders = get_user_orders(user_id)
        return {"orders": orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/user/{user_id}")
async def get_user_orders_endpoint(user_id: str):
    try:
        orders = get_user_orders(user_id)
        return {"orders": orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/supplier/{supplier_id}")
async def get_supplier_orders_endpoint(supplier_id: str):
    try:
        orders = get_supplier_orders(supplier_id)
        return {"orders": orders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/{order_id}")
async def get_order_endpoint(order_id: str):
    try:
        if order_id in orders_store:
            return orders_store[order_id]
        order = get_order_by_id(order_id)
        if order:
            return order
        else:
            raise HTTPException(status_code=404, detail="Order not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/{order_id}/items")
async def get_order_items_endpoint(order_id: str):
    try:
        from lib.db import get_db_connection, release_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, p.name, p.image_url
            FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = %s ORDER BY oi.created_at
        """, (order_id,))

        rows = cursor.fetchall()
        release_db_connection(conn)

        items = []
        for row in rows:
            item = dict(row)
            item['id'] = str(item.get('id', ''))
            item['product_id'] = str(item.get('product_id', ''))
            items.append(item)

        return items
    except Exception as e:
        logger.error(f"Failed to get order items for {order_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# CHECKOUT ENDPOINTS (Stripe)
# ============================================================================

@app.post("/api/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest):
    try:
        line_items = []
        for item in request.items:
            line_items.append({
                'price_data': {
                    'currency': 'eur',
                    'product_data': {
                        'name': item['name'],
                        'description': f"Product ID: {item['id']}",
                    },
                    'unit_amount': int(item['price'] * 100),
                },
                'quantity': item['quantity'],
            })

        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/checkout",
            metadata={'supplier_id': request.supplierId}
        )

        return {"sessionId": session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/checkout")
async def mock_checkout(payload: Dict):
    order_id = payload.get("order_id")
    success_url = payload.get("success_url", f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/success")
    cancel_url = payload.get("cancel_url", f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/checkout")
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id is required")

    order = orders_store.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found in prototype store")

    session_id = f"sess_mock_{uuid4().hex[:8]}"
    checkout_url = f"{success_url}?order={order_id}&session={session_id}"
    order["status"] = "pending_payment"
    order["mock_checkout_session"] = session_id
    order["success_url"] = success_url
    order["cancel_url"] = cancel_url

    return {"checkout_url": checkout_url, "session_id": session_id}

# ============================================================================
# BUSINESS ENDPOINTS (Supplier Portal)
# ============================================================================

@app.get("/api/businesses/search")
async def search_businesses(q: str):
    from lib.db import get_db_connection, release_db_connection
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, address, status FROM businesses WHERE name ILIKE %s LIMIT 10", (f"%{q}%",))
        results = cursor.fetchall()
        conn.commit()
        return {"results": results}
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error searching businesses: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)

@app.get("/api/businesses/{business_id}")
async def get_business_by_id(business_id: str):
    from lib.db import get_db_connection, release_db_connection
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM businesses WHERE id = %s", (business_id,))
        business = cursor.fetchone()

        if not business:
            conn.commit()
            raise HTTPException(status_code=404, detail="Business not found")

        business["id"] = str(business["id"])
        if business.get("owner_supplier_id"):
            business["owner_supplier_id"] = str(business["owner_supplier_id"])

        conn.commit()
        return business
    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error getting business: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor:
            cursor.close()
        if conn:
            release_db_connection(conn)

@app.put("/api/businesses/{business_id}")
async def update_business(business_id: str, data: dict):
    from lib.db import get_db_connection, release_db_connection
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE businesses SET address = %s, contact_info = %s::jsonb, social_links = %s::jsonb
            WHERE id = %s RETURNING *
        """, (data.get("address"), json.dumps(data.get("contact_info") or {}), json.dumps(data.get("social_links") or {}), business_id))

        business = cursor.fetchone()
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")

        conn.commit()

        business["id"] = str(business["id"])
        if business.get("owner_supplier_id"):
            business["owner_supplier_id"] = str(business["owner_supplier_id"])

        return business
    except:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)

@app.post("/api/businesses/{business_id}/claim")
async def claim_business(business_id: str, supplier_id: str):
    from lib.db import get_db_connection, release_db_connection
    conn = get_db_connection()

    try:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM businesses WHERE owner_supplier_id = %s", (supplier_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="Supplier may only claim one business")

        cursor.execute("SELECT status FROM businesses WHERE id = %s", (business_id,))
        row = cursor.fetchone()
        if not row or row["status"] != "unclaimed":
            raise HTTPException(409, "Business already claimed")

        cursor.execute("UPDATE suppliers SET onboarding_step = 'claim_pending', claimed_business_id = %s WHERE id = %s", (business_id, supplier_id))
        conn.commit()
        return {"success": True, "status": "claim_pending"}

    finally:
        release_db_connection(conn)

@app.post("/api/businesses/{business_id}/approve")
async def approve_claim(business_id: str, supplier_id: str):
    from lib.db import get_db_connection, release_db_connection
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE businesses SET status = 'claimed', owner_supplier_id = %s WHERE id = %s", (supplier_id, business_id))
        cursor.execute("UPDATE suppliers SET onboarding_step = 'edit_profile' WHERE id = %s", (supplier_id,))
        conn.commit()
        return {"success": True}
    finally:
        release_db_connection(conn)

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv('PORT', '8000'))
    host = os.getenv('HOST', '0.0.0.0')
    uvicorn.run(app, host=host, port=port, log_level="info", access_log=True)
