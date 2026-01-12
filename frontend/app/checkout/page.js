'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState([]);
  const [supplierId, setSupplierId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Load cart and user id from sessionStorage
    const cart = sessionStorage.getItem('checkoutCart');
    const supplier = sessionStorage.getItem('checkoutSupplier');
    const id = sessionStorage.getItem('userId');

    if (!cart || !supplier || !id) {
      router.push('/login');
      return;
    }

    try {
      setCartItems(JSON.parse(cart));
      setSupplierId(supplier);
      setUserId(id);
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  const subtotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return sum + (price * quantity);
  }, 0);
  const vat = subtotal * 0.21;
  const total = subtotal + vat;

  const handlePlaceOrder = () => {
    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirmOrder = async () => {
    setLoading(true);
    setError(null);
    setShowConfirmation(false);

    try {
      if (!userId) {
        throw new Error('Please login to place an order');
      }

      // Prepare order items with all necessary fields
      const orderItems = cartItems.map(item => ({
        product_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        supplier_id: supplierId,
        image_url: item.image_url || null,
      }));

      // Create order
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          items: orderItems,
          totalAmount: total,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create order');
      }

      const result = await response.json();

      // Clear cart
      sessionStorage.removeItem('checkoutCart');
      sessionStorage.removeItem('checkoutSupplier');

      // Redirect to success page with order ID
      router.push(`/success?order_id=${result.order_id}`);
    } catch (err) {
      setError(err.message || 'Failed to place order');
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-(--background)">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-(--text-secondary)">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-(--background) p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 -m-2 hover:bg-white rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-(--primary)">Checkout</h1>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-16 h-16 shrink-0 bg-background rounded-lg border border-(--border) flex items-center justify-center">
                  <span className="text-2xl">🍰</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-(--text-secondary) mt-1">
                    Quantity: {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-(--primary)">
                  €{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-(--border) mt-6 pt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-(--text-secondary)">Subtotal</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-(--text-secondary)">VAT (21%)</span>
              <span>€{vat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-(--border)">
              <span>Total</span>
              <span className="text-(--primary)">€{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-6">
            <p className="font-medium">Order Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
              <h2 className="text-2xl font-bold text-(--primary) mb-4">Confirm Your Order</h2>
              <p className="text-(--text-secondary) mb-6">
                Are you sure you want to place this order for <span className="font-bold text-(--primary)">€{total.toFixed(2)}</span>?
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleConfirmOrder}
                  disabled={loading}
                  className="w-full bg-(--primary) hover:bg-(--primary-light) text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Confirm Order</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={loading}
                  className="w-full border-2 border-(--border) hover:border-(--primary) text-(--primary) font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={loading || showConfirmation}
          className="w-full bg-(--primary) hover:bg-(--primary-light) text-white font-medium py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Place Order</span>
        </button>
      </div>
    </div>
  );
}
