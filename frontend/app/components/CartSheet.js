'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n';

export default function CartSheet({ items, isOpen, onClose, onUpdateQuantity, onRemove, onCheckout, shouldAutoCheckout, onAutoCheckoutComplete }) {
  const { t } = useI18n();
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vat = subtotal * 0.21;
  const total = subtotal + vat;
  const checkoutButtonRef = useRef(null);

  // Auto-trigger checkout when cart opens with shouldAutoCheckout flag
  useEffect(() => {
    if (isOpen && shouldAutoCheckout && items.length > 0 && checkoutButtonRef.current) {
      // Small delay to ensure cart is fully rendered
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      
      <div className="fixed right-0 top-0 h-full w-full sm:max-w-md bg-(--bg) z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 text-(--text)">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-(--border) bg-(--bg-secondary)/50">
          <div>
            <p className="text-xs tracking-[0.12em] uppercase text-(--text-secondary)">{t('viewCart')}</p>
            <h2 className="text-2xl font-semibold text-(--primary) tracking-[0.04em]">{t('yourCart')}</h2>
          </div>
          <button onClick={onClose} className="p-2 -m-2 hover:bg-(--surface) rounded-lg transition-colors text-(--text-secondary) hover:text-(--primary)">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-(--surface) rounded-2xl flex items-center justify-center mb-4 border border-(--border)">
                <svg className="w-8 h-8 text-(--primary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-(--text) font-medium text-lg">{t('cartEmpty')}</p>
              <p className="text-(--text-secondary) text-sm mt-2">{t('addItemsToStart')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="bg-(--surface)/50 border border-(--border)/50 rounded-xl p-4 hover:border-(--primary)/30 hover:bg-(--surface) transition-all">
                  <div className="flex gap-3">
                    {/* Product Image */}
                    {item.image_url && (
                      <div className="w-20 h-20 shrink-0 bg-(--bg-secondary) rounded-lg border border-(--border) overflow-hidden">
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
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <p className="font-semibold text-(--text) truncate text-sm">{item.name}</p>
                        {item.supplier_name && (
                          <p className="text-xs text-(--text-secondary) mt-0.5">
                            {item.supplier_name}
                          </p>
                        )}
                        {item.category && (
                          <p className="text-xs text-(--text-secondary) mt-0.5">
                            {item.category}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="font-bold text-(--primary)">€{(item.price * item.quantity).toFixed(2)}</p>
                        <div className="flex items-center gap-1 bg-(--bg-secondary) rounded-lg p-1 border border-(--border)">
                          <button 
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 sm:w-6 sm:h-6 rounded transition-colors flex items-center justify-center text-base sm:text-sm text-(--text-secondary) hover:text-(--primary) hover:bg-(--surface) touch-manipulation"
                          >
                            −
                          </button>
                          <span className="w-8 sm:w-6 text-center text-sm sm:text-xs font-bold text-(--text)">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 sm:w-6 sm:h-6 rounded transition-colors flex items-center justify-center text-base sm:text-sm text-(--text-secondary) hover:text-(--primary) hover:bg-(--surface) touch-manipulation"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => onRemove(item.id)}
                      className="self-start p-1.5 text-(--text-secondary) hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="flex-shrink-0 p-6 border-t border-(--border) bg-(--bg-secondary)/30 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-(--text-secondary)">
                <span>{t('subtotal')}</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-(--text-secondary)">
                <span>{t('vat')}</span>
                <span>€{vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-(--border)/30">
                <span className="font-semibold text-(--text)">{t('total')}</span>
                <span className="text-lg font-bold text-(--primary)">€{total.toFixed(2)}</span>
              </div>
            </div>
            <button
              ref={checkoutButtonRef}
              onClick={onCheckout}
              className="w-full btn-primary text-white font-semibold py-4 rounded-xl transition-all uppercase tracking-[0.08em] text-sm touch-manipulation min-h-[52px]"
            >
              {t('proceedToCheckout')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
