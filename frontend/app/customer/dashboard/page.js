'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { Suspense } from 'react';

export default function CustomerDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#faf9f7' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-800" />
          <p className="mt-4 text-sm" style={{ color: '#6b6b6b' }}>Loading dashboard...</p>
        </div>
      </div>
    }>
      <CustomerDashboardContent />
    </Suspense>
  );
}

function CustomerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchased = searchParams.get('purchased');

  const { user, userType, internalUserId, loading: authLoading, isAuthenticated, logout } = useAuth();
  const { t } = useI18n();

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !internalUserId || userType !== 'customer') {
      router.replace('/');
      return;
    }

    loadCustomerData();
  }, [router, authLoading, isAuthenticated, userType, internalUserId]);

  useEffect(() => {
    if (purchased) {
      setSuccessMessage('Order placed successfully! Your order is being processed.');
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [purchased]);

  const loadCustomerData = async () => {
    try {
      const [ordersRes, userRes] = await Promise.all([
        fetch(`/api/orders?userId=${internalUserId}`),
        fetch(`/api/users/${internalUserId}`)
      ]);

      let ordersList = [];
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        ordersList = Array.isArray(ordersData) ? ordersData : (ordersData.orders || []);
      }

      const supplierIds = [...new Set(ordersList.map(o => o.supplier_id))];
      const suppliersMap = {};

      if (supplierIds.length > 0) {
        const supplierPromises = supplierIds.map(id =>
          fetch(`/api/suppliers/${id}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => data ? [id, data.name] : [id, 'Unknown Supplier'])
            .catch(() => [id, 'Unknown Supplier'])
        );

        const results = await Promise.all(supplierPromises);
        results.forEach(([id, name]) => {
          suppliersMap[id] = name;
        });
      }

      setSuppliers(suppliersMap);
      setOrders(ordersList);

      if (userRes.ok) {
        const userData = await userRes.json();
        const actualData = userData.user || userData;
        setUserInfo(actualData);
      } else {
        setUserInfo({ id: internalUserId });
      }
    } catch (err) {
      setError('Failed to load orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderItems = async (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    setExpandedOrder(orderId);

    setOrders(prev =>
      prev.map(order =>
        order.id === orderId && !order.items
          ? { ...order, itemsLoading: true }
          : order
      )
    );

    try {
      const itemsRes = await fetch(`/api/orders/${orderId}/items`);
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setOrders(prev =>
          prev.map(order =>
            order.id === orderId
              ? { ...order, items: Array.isArray(itemsData) ? itemsData : (itemsData.items || []), itemsLoading: false }
              : order
          )
        );
      }
    } catch (e) {
      console.error(`Failed to fetch items for order ${orderId}:`, e);
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, itemsLoading: false } : order
        )
      );
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#faf9f7' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-800" />
          <p className="mt-4 text-sm" style={{ color: '#6b6b6b' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#faf9f7' }}>
      {/* Navigation */}
      <nav style={{ background: '#ffffff', borderBottom: '1px solid #e5e3e0' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1a1a1a' }}>
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <div>
              <span className="font-semibold text-[15px]" style={{ color: '#1a1a1a' }}>Plexaris</span>
              <span className="text-[13px] ml-2" style={{ color: '#6b6b6b' }}>Orders</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/customer/chat')}
              className="px-4 py-2 text-[14px] font-medium rounded-lg transition-all"
              style={{ background: '#1a1a1a', color: '#ffffff' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#333333'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
            >
              Chat
            </button>
            <button
              onClick={() => router.push('/customer/settings')}
              className="px-4 py-2 text-[14px] font-medium rounded-lg transition-colors"
              style={{ color: '#6b6b6b' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f5f4f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-[14px] font-medium rounded-lg transition-colors"
              style={{ color: '#ef4444' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div
            className="rounded-lg p-4 mb-6 text-[14px]"
            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            className="rounded-lg p-4 mb-6 text-[14px]"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}
          >
            {successMessage}
          </div>
        )}

        <div className="rounded-xl p-6" style={{ background: '#ffffff', border: '1px solid #e5e3e0' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[24px] font-semibold" style={{ color: '#1a1a1a' }}>Your orders</h1>
              <p className="text-[14px] mt-1" style={{ color: '#6b6b6b' }}>View and track all your past orders</p>
            </div>
            <span
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium"
              style={{ background: '#f5f4f2', color: '#6b6b6b' }}
            >
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: '#f5f4f2' }}>
                <svg className="w-7 h-7" style={{ color: '#999999' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="font-medium text-[16px] mb-1" style={{ color: '#1a1a1a' }}>No orders yet</p>
              <p className="text-[14px] mb-6" style={{ color: '#6b6b6b' }}>Start chatting to place your first order</p>
              <button
                onClick={() => router.push('/customer/chat')}
                className="px-5 py-2.5 text-[14px] font-medium rounded-lg transition-all"
                style={{ background: '#1a1a1a', color: '#ffffff' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#333333'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
              >
                Start shopping
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl overflow-hidden transition-all"
                  style={{ background: '#faf9f7', border: '1px solid #e5e3e0' }}
                >
                  <button
                    onClick={() => loadOrderItems(order.id)}
                    className="w-full text-left p-4 flex items-start justify-between cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium text-[15px]" style={{ color: '#1a1a1a' }}>
                          {suppliers[order.supplier_id] || 'Loading...'}
                        </p>
                        <span
                          className="px-2 py-0.5 rounded text-[12px] font-medium"
                          style={{
                            background: order.status === 'completed' ? '#f0fdf4' : order.status === 'pending' ? '#fffbeb' : '#f5f4f2',
                            color: order.status === 'completed' ? '#16a34a' : order.status === 'pending' ? '#d97706' : '#6b6b6b',
                            border: `1px solid ${order.status === 'completed' ? '#bbf7d0' : order.status === 'pending' ? '#fde68a' : '#e5e3e0'}`
                          }}
                        >
                          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                        </span>
                      </div>
                      <p className="text-[13px]" style={{ color: '#6b6b6b' }}>
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="font-semibold text-[16px]" style={{ color: '#1a1a1a' }}>€{order.total_amount?.toFixed(2) || '0.00'}</p>
                      <p className="text-[12px]" style={{ color: '#999999' }}>
                        {order.itemsLoading ? 'Loading...' : (expandedOrder === order.id ? 'Hide details' : 'Show details')}
                      </p>
                    </div>
                  </button>

                  {expandedOrder === order.id && order.items && order.items.length > 0 && (
                    <div className="p-4 space-y-3" style={{ borderTop: '1px solid #e5e3e0', background: '#ffffff' }}>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-start">
                          {item.image_url && (
                            <div
                              className="w-14 h-14 rounded-lg overflow-hidden shrink-0"
                              style={{ background: '#f5f4f2', border: '1px solid #e5e3e0' }}
                            >
                              <img
                                src={(() => {
                                  try {
                                    const url = item.image_url.trim();
                                    if (url.startsWith('http://') || url.startsWith('https://')) {
                                      return url;
                                    }
                                    if (url.startsWith('/')) {
                                      return url;
                                    }
                                    return encodeURI(url);
                                  } catch (e) {
                                    return item.image_url;
                                  }
                                })()}
                                alt={item.name || 'Item'}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  const container = e.target.closest('div');
                                  if (container) {
                                    container.style.display = 'none';
                                  }
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[14px]" style={{ color: '#1a1a1a' }}>{item.name || 'Item'}</p>
                            <p className="text-[12px]" style={{ color: '#6b6b6b' }}>
                              {item.quantity} × €{item.price?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                          <p className="font-medium text-[14px] shrink-0" style={{ color: '#1a1a1a' }}>
                            €{(item.quantity * item.price)?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
