'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function OrdersPage() {
  const router = useRouter();
  const { user, userType, internalUserId, loading: authLoading, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !internalUserId || userType !== 'customer') {
      router.replace('/login');
      return;
    }

    loadOrders(internalUserId);
  }, [authLoading, isAuthenticated, userType, internalUserId, router]);

  const loadOrders = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        setError('Failed to load orders');
      }
    } catch (err) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-(--background)">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-(--text-secondary)">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-(--background)">
      {/* Header */}
      <header className="bg-white border-b border-(--border)">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -m-2 hover:bg-(--background) rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-(--primary)">Order History</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <svg className="w-16 h-16 text-(--text-secondary) opacity-50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
            <p className="text-(--text-secondary) mb-4">Start shopping to see your order history</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-(--primary) hover:bg-(--primary-light) text-white font-medium rounded-lg transition-colors"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl p-6 shadow-sm border border-(--border)">
                {/* Order Header */}
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-(--border)">
                  <div>
                    <p className="text-sm text-(--text-secondary)">Order Date</p>
                    <p className="font-medium">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-(--text-secondary) mt-1">
                      {new Date(order.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-(--text-secondary)">Total</p>
                    <p className="text-2xl font-bold text-(--primary)">
                      €{parseFloat(order.total_amount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Items ({order.order_items?.length || 0})</p>
                  {order.order_items?.map((item, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="w-16 h-16 rounded-lg bg-(--background) flex items-center justify-center text-2xl hidden"
                        style={!item.image_url ? { display: 'flex' } : {}}
                      >
                        🍰
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-(--text-secondary)">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">€{parseFloat(item.price).toFixed(2)}</p>
                        <p className="text-xs text-(--text-secondary)">each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
