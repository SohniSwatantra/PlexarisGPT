'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';

export default function CartSheet({ items, isOpen, onClose, onUpdateQuantity, onRemove, onCheckout, shouldAutoCheckout, onAutoCheckoutComplete }) {
  const { t } = useI18n();
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vat = subtotal * 0.21;
  const total = subtotal + vat;
  const checkoutButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen && shouldAutoCheckout && items.length > 0 && checkoutButtonRef.current) {
      const timer = setTimeout(() => {
        checkoutButtonRef.current?.click();
        if (onAutoCheckoutComplete) {
          onAutoCheckoutComplete();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldAutoCheckout, items.length, onAutoCheckoutComplete]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0, 0, 0, 0.2)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed right-0 top-0 h-full w-full sm:max-w-md z-50 flex flex-col animate-in slide-in-from-right duration-200"
        style={{ background: '#ffffff' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid #e5e3e0' }}
        >
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#1a1a1a' }}>Your cart</h2>
            <p className="text-sm" style={{ color: '#6b6b6b' }}>{items.length} {items.length === 1 ? 'item' : 'items'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#6b6b6b' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f4f2'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                style={{ background: '#f5f4f2' }}
              >
                <svg className="w-7 h-7" style={{ color: '#999999' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="font-medium text-[15px]" style={{ color: '#1a1a1a' }}>Your cart is empty</p>
              <p className="text-sm mt-1" style={{ color: '#6b6b6b' }}>Add items to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl p-4 transition-all"
                  style={{ background: '#f5f4f2', border: '1px solid #e5e3e0' }}
                >
                  <div className="flex gap-3">
                    {/* Product Image */}
                    {item.image_url && (
                      <div
                        className="w-16 h-16 shrink-0 rounded-lg overflow-hidden"
                        style={{ background: '#ffffff', border: '1px solid #e5e3e0' }}
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
                          alt={item.name}
                          className="w-full h-full object-cover"
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

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-[14px] truncate" style={{ color: '#1a1a1a' }}>{item.name}</p>
                          {item.category && (
                            <p className="text-[12px] mt-0.5" style={{ color: '#6b6b6b' }}>{item.category}</p>
                          )}
                        </div>
                        <button
                          onClick={() => onRemove(item.id)}
                          className="shrink-0 p-1 rounded transition-colors"
                          style={{ color: '#999999' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <p className="font-semibold text-[15px]" style={{ color: '#1a1a1a' }}>
                          €{(item.price * item.quantity).toFixed(2)}
                        </p>
                        <div
                          className="flex items-center rounded-lg"
                          style={{ background: '#ffffff', border: '1px solid #e5e3e0' }}
                        >
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-[14px] transition-colors rounded-l-lg"
                            style={{ color: '#6b6b6b' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f4f2'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-[13px] font-medium" style={{ color: '#1a1a1a' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center text-[14px] transition-colors rounded-r-lg"
                            style={{ color: '#6b6b6b' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f4f2'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5" style={{ borderTop: '1px solid #e5e3e0' }}>
            <div className="space-y-2 text-[14px] mb-4">
              <div className="flex justify-between" style={{ color: '#6b6b6b' }}>
                <span>Subtotal</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between" style={{ color: '#6b6b6b' }}>
                <span>VAT (21%)</span>
                <span>€{vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2" style={{ borderTop: '1px solid #e5e3e0' }}>
                <span className="font-semibold" style={{ color: '#1a1a1a' }}>Total</span>
                <span className="font-semibold text-[16px]" style={{ color: '#1a1a1a' }}>€{total.toFixed(2)}</span>
              </div>
            </div>
            <button
              ref={checkoutButtonRef}
              onClick={onCheckout}
              className="w-full py-3.5 rounded-xl text-[15px] font-medium transition-all"
              style={{ background: '#1a1a1a', color: '#ffffff' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#333333'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
            >
              Proceed to checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
