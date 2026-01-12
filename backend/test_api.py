#!/usr/bin/env python3
"""
Plexaris API Test Suite
Tests all backend API endpoints deployed on Railway
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://plexarisgpt-production.up.railway.app"
TEST_USER_ID = "2dc9283f-03d4-48aa-92c9-049976ffa72f"  # Demo user
TEST_EMAIL = "sohni.swatantra@gmail.com"

# Test results
results = {
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "tests": []
}

def test(name, method, endpoint, expected_status=200, data=None, params=None, headers=None):
    """Run a single API test"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, params=params, headers=headers, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=30)
        elif method == "PATCH":
            response = requests.patch(url, json=data, headers=headers, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, params=params, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unknown method: {method}")

        success = response.status_code == expected_status

        result = {
            "name": name,
            "method": method,
            "endpoint": endpoint,
            "status_code": response.status_code,
            "expected": expected_status,
            "success": success,
            "response_preview": str(response.text)[:200]
        }

        if success:
            results["passed"] += 1
            print(f"✅ PASS: {name}")
        else:
            results["failed"] += 1
            print(f"❌ FAIL: {name} (got {response.status_code}, expected {expected_status})")
            print(f"   Response: {response.text[:200]}")

        results["tests"].append(result)
        return response

    except Exception as e:
        results["failed"] += 1
        print(f"❌ ERROR: {name} - {str(e)}")
        results["tests"].append({
            "name": name,
            "method": method,
            "endpoint": endpoint,
            "success": False,
            "error": str(e)
        })
        return None

def main():
    print("=" * 60)
    print("PLEXARIS API TEST SUITE")
    print(f"Backend: {BASE_URL}")
    print(f"Time: {datetime.now().isoformat()}")
    print("=" * 60)
    print()

    # ============================================================
    # 1. HEALTH & ROOT ENDPOINTS
    # ============================================================
    print("\n📋 1. HEALTH & ROOT ENDPOINTS")
    print("-" * 40)

    test("Root endpoint", "GET", "/")
    health_response = test("Health check", "GET", "/health")

    if health_response:
        health_data = health_response.json()
        print(f"   Database: {health_data.get('database', 'unknown')}")
        print(f"   OpenRouter: {health_data.get('openrouter_configured', 'unknown')}")
        print(f"   Stripe: {health_data.get('stripe_configured', 'unknown')}")

        if health_data.get('database') != 'connected':
            print("\n⚠️  WARNING: Database is not connected! Some tests may fail.")

    # ============================================================
    # 2. AUTH ENDPOINTS
    # ============================================================
    print("\n📋 2. AUTH ENDPOINTS")
    print("-" * 40)

    test("Sync user (existing)", "POST", "/api/auth/sync-user",
         data={"email": TEST_EMAIL, "name": "Test User"})

    test("Sync user (new)", "POST", "/api/auth/sync-user",
         data={"email": "newuser@test.com", "name": "New User", "desired_role": "customer"})

    # ============================================================
    # 3. PRODUCT ENDPOINTS
    # ============================================================
    print("\n📋 3. PRODUCT ENDPOINTS")
    print("-" * 40)

    test("Get products (list)", "GET", "/api/products", params={"limit": 5})

    test("Search products", "POST", "/api/products/search",
         data={"query": "apple pie", "limit": 3})

    test("Get products by category", "GET", "/api/products",
         params={"category": "Beuk Appeltaarten", "limit": 3})

    # ============================================================
    # 4. RAG/AI ENDPOINTS
    # ============================================================
    print("\n📋 4. RAG/AI ENDPOINTS")
    print("-" * 40)

    test("Customer RAG query", "POST", "/api/rag",
         data={
             "query": "Show me apple pies",
             "userId": TEST_USER_ID,
             "cartItems": []
         })

    # Note: Supplier RAG requires a valid supplier_id
    # test("Supplier RAG query", "POST", "/api/supplier-rag",
    #      data={"query": "Show my products", "supplierId": "..."})

    # ============================================================
    # 5. CHAT SESSION ENDPOINTS
    # ============================================================
    print("\n📋 5. CHAT SESSION ENDPOINTS")
    print("-" * 40)

    # Create a session
    session_response = test("Create chat session", "POST", "/api/chat/sessions",
         data={"userId": TEST_USER_ID, "title": "Test Session"},
         headers={"x-user-id": TEST_USER_ID})

    session_id = None
    if session_response and session_response.status_code == 200:
        try:
            session_id = session_response.json().get("session_id")
            print(f"   Created session: {session_id}")
        except:
            pass

    # List sessions
    test("List chat sessions", "GET", "/api/chat/sessions",
         params={"userId": TEST_USER_ID, "limit": 10})

    # Get session history (if we have a session)
    if session_id:
        test("Get chat history", "GET", f"/api/chat/sessions/{session_id}",
             params={"userId": TEST_USER_ID})

        # Save a message
        test("Save chat message", "POST", f"/api/chat/sessions/{session_id}/messages",
             params={"userId": TEST_USER_ID},
             data={"role": "user", "content": "Test message"})

        # Update title
        test("Update session title", "PUT", f"/api/chat/sessions/{session_id}/title",
             params={"userId": TEST_USER_ID},
             data={"title": "Updated Test Session"})

        # Delete session (cleanup)
        test("Delete chat session", "DELETE", f"/api/chat/sessions/{session_id}",
             params={"userId": TEST_USER_ID})

    # ============================================================
    # 6. SUPPLIER ENDPOINTS
    # ============================================================
    print("\n📋 6. SUPPLIER ENDPOINTS")
    print("-" * 40)

    test("Get all suppliers", "GET", "/api/suppliers")

    test("Check supplier email", "GET", f"/api/suppliers/check-email/{TEST_EMAIL}")

    # Create/update supplier
    test("Create/update supplier", "POST", "/api/suppliers",
         data={
             "email": "testsupplier@example.com",
             "name": "Test Supplier",
             "business_name": "Test Business"
         })

    # ============================================================
    # 7. USER ENDPOINTS
    # ============================================================
    print("\n📋 7. USER ENDPOINTS")
    print("-" * 40)

    test("Get user by ID", "GET", f"/api/users/{TEST_USER_ID}")

    test("Update user profile", "PUT", f"/api/users/{TEST_USER_ID}",
         data={"business_name": "Updated Business Name"})

    # ============================================================
    # 8. ORDER ENDPOINTS
    # ============================================================
    print("\n📋 8. ORDER ENDPOINTS")
    print("-" * 40)

    test("Get user orders", "GET", "/api/orders",
         params={"user_id": TEST_USER_ID})

    test("Get user orders (alt)", "GET", f"/api/orders/user/{TEST_USER_ID}")

    # ============================================================
    # 9. CART ENDPOINTS
    # ============================================================
    print("\n📋 9. CART ENDPOINTS")
    print("-" * 40)

    test("Get cart", "GET", "/api/cart", params={"user_id": TEST_USER_ID})

    test("Clear cart", "DELETE", "/api/cart/clear", params={"user_id": TEST_USER_ID})

    # ============================================================
    # 10. BUSINESS ENDPOINTS
    # ============================================================
    print("\n📋 10. BUSINESS ENDPOINTS")
    print("-" * 40)

    test("Search businesses", "GET", "/api/businesses/search", params={"q": "test"})

    # ============================================================
    # SUMMARY
    # ============================================================
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Passed: {results['passed']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"⏭️  Skipped: {results['skipped']}")
    print(f"📊 Total: {results['passed'] + results['failed'] + results['skipped']}")
    print()

    if results['failed'] > 0:
        print("Failed tests:")
        for t in results['tests']:
            if not t.get('success'):
                error_msg = t.get('error') or f"status {t.get('status_code')}"
                print(f"  - {t['name']}: {error_msg}")

    return 0 if results['failed'] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
