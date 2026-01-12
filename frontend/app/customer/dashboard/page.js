'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { Suspense } from 'react';
import { MessageCircle, Zap, BarChart3, Clock } from 'lucide-react';

export default function CustomerDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-(--bg)">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-(--primary)" />
          <p className="mt-4 text-(--text-secondary)">Loading dashboard…</p>
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

  // Check authentication
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !internalUserId || userType !== 'customer') {
      router.replace('/');
      return;
    }

    loadCustomerData();
  }, [router, authLoading, isAuthenticated, userType, internalUserId]);

  // Show purchase success message
  useEffect(() => {
    if (purchased) {
      setSuccessMessage('✓ Order placed successfully! Your order is being processed.');
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [purchased]);

  const loadCustomerData = async () => {
    try {
      // Get user info AND orders in parallel
      const [ordersRes, userRes] = await Promise.all([
        fetch(`/api/orders?userId=${internalUserId}`),
        fetch(`/api/users/${internalUserId}`)
      ]);

      let ordersList = [];
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        ordersList = Array.isArray(ordersData) ? ordersData : (ordersData.orders || []);
      }

      // Fetch all supplier info in parallel before processing orders
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

      // Only fetch items for expanded orders (lazy load)
      setOrders(ordersList);

      // Get user info
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

  // Lazy load order items when expanded
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
      <div className="min-h-screen flex items-center justify-center bg-(--bg)">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-(--primary)" />
          <p className="mt-4 text-(--text-secondary)">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg) text-(--text)">
      {/* Main Dashboard */}
      <nav className="bg-(--panel) backdrop-blur-xl border-b border-(--border)">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs tracking-[0.14em] uppercase text-(--text-secondary)">{t('plexaris')}</p>
              <h1 className="text-2xl font-semibold tracking-[0.08em]">{t('customerPortal')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/customer/chat')}
              className="px-4 py-2 bg-(--bg-secondary) border border-(--border) text-(--text-secondary) hover:text-(--primary) hover:border-(--primary) rounded-lg transition-all font-semibold text-sm"
            >
              {t('chat')}
            </button>

            <button
              onClick={() => router.push('/customer/settings')}
              className="px-4 py-2 bg-(--bg-secondary) border border-(--border) text-(--text-secondary) hover:text-(--primary) hover:border-(--primary) rounded-lg transition-all font-semibold text-sm"
            >
              {t('settings')}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gradient-to-r from-(--primary) to-(--accent) text-white rounded-lg font-semibold transition-all shadow-lg shadow-(--primary)/20"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-400/50 text-red-100 rounded-lg p-4 mb-6">
            ✕ {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-400/50 text-emerald-100 rounded-lg p-4 mb-6 animate-in fade-in">
            {successMessage}
          </div>
        )}

        <div className="bg-(--bg-secondary)/80 backdrop-blur-xl rounded-2xl border border-(--border) shadow-lg shadow-(--primary)/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs tracking-[0.12em] uppercase text-(--text-secondary)">{t('orders')}</p>
              <h2 className="text-2xl font-semibold">{t('yourOrderHistory')}</h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-(--surface) text-(--text-secondary) text-xs border border-(--border) font-semibold">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </span>
          </div>
          
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-(--text-secondary) text-lg">No orders yet</p>
              <p className="text-(--text-secondary) text-sm mt-1">Browse suppliers and make your first purchase</p>
              <button
                onClick={() => router.push('/customer/shop')}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-(--primary) to-(--accent) text-white rounded-lg font-semibold transition-all shadow-lg shadow-(--primary)/20"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-(--surface)/50 border border-(--border)/50 rounded-xl overflow-hidden hover:border-(--primary)/30 hover:bg-(--surface) transition-all"
                >
                  <button
                    onClick={() => loadOrderItems(order.id)}
                    className="w-full text-left p-4 flex items-start justify-between cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-lg text-(--primary) uppercase tracking-[0.04em]">
                          {suppliers[order.supplier_id] || 'Loading...'}
                        </p>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                          order.status === 'completed' ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100' :
                          order.status === 'pending' ? 'border-amber-400/40 bg-amber-400/10 text-amber-100' :
                          'border-(--border) bg-(--surface) text-(--text-secondary)'
                        }`}>
                          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-(--text-secondary)">
                        {new Date(order.created_at).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {order.items && order.items.length > 0 && (
                        <p className="text-sm text-(--text-secondary) mt-1">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-lg font-semibold text-(--primary)">€{order.total_amount?.toFixed(2) || '0.00'}</p>
                      <p className="text-xs text-(--text-secondary)">
                        {order.itemsLoading ? 'Loading...' : (expandedOrder === order.id ? '▼ Hide items' : '▶ Show items')}
                      </p>
                    </div>
                  </button>

                  {expandedOrder === order.id && order.items && order.items.length > 0 && (
                    <div className="border-t border-(--border)/50 bg-(--bg)/40 p-4 space-y-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-start text-sm">
                          {item.image_url && (
                            <div className="flex-shrink-0">
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
                                className="w-20 h-20 object-cover rounded-lg border border-(--border)/50"
                                loading="lazy"
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  const container = e.target.closest('div');
                                  if (container) {
                                    container.style.display = 'none';
                                  } else {
                                    e.target.style.display = 'none';
                                  }
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-(--text) font-medium">{item.name || 'Item'}</p>
                            <p className="text-(--text-secondary) text-xs">
                              Qty: {item.quantity} × €{item.price?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                          <p className="text-(--primary) font-semibold flex-shrink-0">€{(item.quantity * item.price)?.toFixed(2) || '0.00'}</p>
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
