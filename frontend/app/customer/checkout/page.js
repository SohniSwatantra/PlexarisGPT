'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { Suspense } from 'react';

export default function CheckoutPage() {
  const { t } = useI18n();
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-(--bg)">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-(--primary)" />
          <p className="mt-4 text-(--text-secondary)">{t('loadingCheckout')}</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { user, userType, internalUserId, loading: authLoading, isAuthenticated } = useAuth();

  const [items, setItems] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Get cart data from session storage or query params
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !internalUserId || userType !== 'customer') {
      router.replace('/');
      return;
    }

    // Get cart data from sessionStorage
    const cartData = sessionStorage.getItem('checkoutData');
    if (cartData) {
      try {
        const data = JSON.parse(cartData);
        setItems(data.items || []);
        setSupplierId(data.supplierId || '');
        setTotalAmount(data.totalAmount || 0);
        // Clear after reading
        sessionStorage.removeItem('checkoutData');
      } catch (e) {
        console.error('Failed to parse checkout data:', e);
        router.replace('/customer/shop');
      }
    } else {
      // No cart data, redirect back
      router.replace('/customer/chat');
    }
  }, [router, authLoading, isAuthenticated, userType, internalUserId]);

  const handleCheckout = async () => {
    if (!items.length || !internalUserId) return;

    setIsProcessing(true);
    setError('');

    try {
      // Format items with product_id
      const formattedItems = items.map(item => ({
        ...item,
        product_id: item.id
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: internalUserId,
          supplierId: supplierId,
          items: formattedItems,
          totalAmount: totalAmount,
          status: 'completed'
        })
      });

      if (res.ok) {
        const orderData = await res.json();
        router.push('/customer/dashboard?purchased=true');
      } else {
        const error = await res.json();
        setError(error.message || 'Failed to process order');
      }
    } catch (err) {
      setError('Failed to process checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const subtotal = totalAmount / 1.21;
  const vat = totalAmount - subtotal;

  return (
    <div className="min-h-screen bg-(--bg) text-(--text)">
      {/* Header */}
      <nav className="bg-(--panel) backdrop-blur-xl border-b border-(--border)">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs tracking-[0.14em] uppercase text-(--text-secondary)">{t('plexaris')}</p>
              <h1 className="text-2xl font-semibold tracking-[0.08em]">{t('checkout')}</h1>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-(--bg-secondary) border border-(--border) text-(--text-secondary) hover:text-(--primary) hover:border-(--primary) rounded-lg transition-all font-semibold text-sm"
          >
            {t('back')}
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-400/50 text-red-100 rounded-lg p-4 mb-6">
            ✕ {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="md:col-span-2">
            <div className="bg-(--bg-secondary)/80 backdrop-blur-xl rounded-2xl border border-(--border) shadow-lg shadow-(--primary)/10 p-6">
              <h2 className="text-xl font-semibold mb-4">{t('orderSummary')}</h2>
              
              {items.length === 0 ? (
                <p className="text-(--text-secondary)">{t('noItemsInOrder')}</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-(--surface)/50 border border-(--border)/50 rounded-lg">
                      {item.image_url && (
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
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded border border-(--border)/50"
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
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-(--text)">{item.name}</p>
                        <p className="text-sm text-(--text-secondary)">{t('quantity')}: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-(--primary)">€{(item.quantity * item.price).toFixed(2)}</p>
                        <p className="text-xs text-(--text-secondary)">€{item.price.toFixed(2)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Price Breakdown & Payment */}
          <div className="space-y-4">
            <div className="bg-(--bg-secondary)/80 backdrop-blur-xl rounded-2xl border border-(--border) shadow-lg shadow-(--primary)/10 p-6">
              <h3 className="text-lg font-semibold mb-4">Price Breakdown</h3>
              
              <div className="space-y-3 text-sm mb-6 pb-6 border-b border-(--border)/30">
                <div className="flex justify-between text-(--text-secondary)">
                  <span>{t('subtotal')}</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-(--text-secondary)">
                  <span>{t('vat')}</span>
                  <span>€{vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 text-lg font-bold text-(--primary)">
                  <span>{t('total')}</span>
                  <span>€{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessing || items.length === 0}
                className="w-full bg-gradient-to-r from-(--primary) to-(--accent) hover:from-(--primary-light) hover:to-(--accent-light) disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-(--primary)/20 uppercase tracking-[0.08em] text-sm"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    {t('processing')}
                  </span>
                ) : (
                  t('placeOrder')
                )}
              </button>

              <p className="text-xs text-(--text-secondary) text-center mt-4">
                Your order will be created immediately upon confirmation.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
