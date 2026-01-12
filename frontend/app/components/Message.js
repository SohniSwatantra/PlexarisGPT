'use client';

import { useEffect, memo, useState } from 'react';

function formatText(text) {
  if (!text) return text;
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-semibold">{part}</strong>;
    }
    return part;
  });
}

function MessageComponent({ text, isUser, isTyping, products, onAddToCart, cartAction, isNewMessage = false }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingAnimation, setIsTypingAnimation] = useState(false);

  useEffect(() => {
    if (isUser || !text) {
      setDisplayedText(text || '');
      setIsTypingAnimation(false);
      return;
    }

    if (!isNewMessage) {
      setDisplayedText(text);
      setIsTypingAnimation(false);
      return;
    }

    setIsTypingAnimation(true);
    setDisplayedText('');
    let currentIndex = 0;

    const typeChar = () => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
        const delay = text[currentIndex - 1] === ' ' ? 10 : 20;
        setTimeout(typeChar, delay);
      } else {
        setIsTypingAnimation(false);
      }
    };

    typeChar();
  }, [text, isUser, isNewMessage]);

  useEffect(() => {
    if (cartAction && onAddToCart && products && products.length > 0) {
      if (cartAction.action === 'add' && cartAction.product) {
        for (let i = 0; i < cartAction.quantity; i++) {
          onAddToCart(cartAction.product);
        }
      } else if (cartAction.action === 'add_multiple' && cartAction.items) {
        cartAction.items.forEach(item => {
          for (let i = 0; i < item.quantity; i++) {
            onAddToCart(item.product);
          }
        });
      }
    }
  }, [cartAction, onAddToCart, products]);

  if (isTyping) {
    return (
      <div className="flex justify-start animate-fade-in">
        <div
          className="px-4 py-3 rounded-2xl"
          style={{ background: '#f5f4f2', border: '1px solid #e5e3e0' }}
        >
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#999999' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#999999', animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#999999', animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in`}>
      <div
        className="max-w-[85%] rounded-2xl px-4 py-3"
        style={isUser ? {
          background: '#1a1a1a',
          color: '#ffffff'
        } : {
          background: '#ffffff',
          border: '1px solid #e5e3e0',
          color: '#1a1a1a'
        }}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {isUser ? formatText(text) : formatText(displayedText)}
          {isTypingAnimation && !isUser && (
            <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse" style={{ background: '#1a1a1a' }} />
          )}
        </p>
      </div>

      {/* Product Cards */}
      {!isUser && products && products.length > 0 && (
        <div className="mt-3 space-y-2 w-full max-w-[85%]">
          {products.map((product) => {
            let wasAutoAdded = false;
            let addedQuantity = 1;

            if (cartAction?.action === 'add' && cartAction?.product?.id === product.id) {
              wasAutoAdded = true;
              addedQuantity = cartAction.quantity;
            } else if (cartAction?.action === 'add_multiple') {
              const item = cartAction.items?.find(i => i.product.id === product.id);
              if (item) {
                wasAutoAdded = true;
                addedQuantity = item.quantity;
              }
            }

            return (
              <div
                key={product.id}
                className="rounded-xl p-4 transition-all"
                style={{
                  background: '#ffffff',
                  border: wasAutoAdded ? '1px solid #10b981' : '1px solid #e5e3e0',
                  boxShadow: wasAutoAdded ? '0 0 0 3px rgba(16, 185, 129, 0.1)' : 'none'
                }}
              >
                {/* Auto-added badge */}
                {wasAutoAdded && (
                  <div className="flex items-center gap-2 mb-3" style={{ color: '#10b981' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">
                      Added {addedQuantity > 1 ? `${addedQuantity}x` : ''} to cart
                    </span>
                  </div>
                )}

                <div className="flex gap-3">
                  {/* Product Image */}
                  {product.image_url && (
                    <div
                      className="w-16 h-16 shrink-0 rounded-lg overflow-hidden"
                      style={{ background: '#f5f4f2', border: '1px solid #e5e3e0' }}
                    >
                      <img
                        src={(() => {
                          try {
                            const url = product.image_url.trim();
                            if (url.startsWith('http://') || url.startsWith('https://')) {
                              return url;
                            }
                            if (url.startsWith('/')) {
                              return url;
                            }
                            return encodeURI(url);
                          } catch (e) {
                            return product.image_url;
                          }
                        })()}
                        alt={product.name}
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
                    <h4 className="font-semibold text-[14px] truncate" style={{ color: '#1a1a1a' }}>
                      {product.name}
                    </h4>
                    {product.category && (
                      <p className="text-[12px] mt-0.5" style={{ color: '#6b6b6b' }}>{product.category}</p>
                    )}
                    {product.description && (
                      <p className="text-[12px] line-clamp-2 mt-1" style={{ color: '#6b6b6b' }}>{product.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[15px] font-semibold" style={{ color: '#1a1a1a' }}>
                        €{typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                      </span>
                      <button
                        onClick={() => onAddToCart && onAddToCart(product)}
                        className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                        style={wasAutoAdded ? {
                          background: '#10b981',
                          color: '#ffffff'
                        } : {
                          background: '#1a1a1a',
                          color: '#ffffff'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = wasAutoAdded ? '#059669' : '#333333';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = wasAutoAdded ? '#10b981' : '#1a1a1a';
                        }}
                      >
                        {wasAutoAdded ? '+ Add more' : 'Add to cart'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default memo(MessageComponent);
