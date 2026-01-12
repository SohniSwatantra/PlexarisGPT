'use client';

import { useEffect, memo, useState } from 'react';

// Simple function to convert **text** to bold
function formatText(text) {
  if (!text) return text;
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-bold">{part}</strong>;
    }
    return part;
  });
}

function MessageComponent({ text, isUser, isTyping, products, onAddToCart, cartAction, isNewMessage = false }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingAnimation, setIsTypingAnimation] = useState(false);

  // Typing animation for assistant messages - only for new messages
  useEffect(() => {
    if (isUser || !text) {
      setDisplayedText(text || '');
      setIsTypingAnimation(false);
      return;
    }

    // Only animate if this is a new message, otherwise show immediately
    if (!isNewMessage) {
      setDisplayedText(text);
      setIsTypingAnimation(false);
      return;
    }

    // Start typing animation for new messages only
    setIsTypingAnimation(true);
    setDisplayedText('');
    let currentIndex = 0;

    const typeChar = () => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
        // Variable speed: faster for spaces, normal for text
        const delay = text[currentIndex - 1] === ' ' ? 10 : 20;
        setTimeout(typeChar, delay);
      } else {
        setIsTypingAnimation(false);
      }
    };

    typeChar();
  }, [text, isUser, isNewMessage]);
  // Auto-add items to cart when cartAction indicates add
  useEffect(() => {
    if (cartAction && onAddToCart && products && products.length > 0) {
      if (cartAction.action === 'add' && cartAction.product) {
        // Single item add
        for (let i = 0; i < cartAction.quantity; i++) {
          onAddToCart(cartAction.product);
        }
      } else if (cartAction.action === 'add_multiple' && cartAction.items) {
        // Multiple items add
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
      <div className="animate-fade-up flex justify-start">
        <div className="glass border border-(--border) shadow-xl shadow-(--primary)/20 rounded-2xl px-4 py-3">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-(--primary) rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-(--accent) rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-(--success) rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-fade-up flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`
        max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 sm:px-4 py-3 sm:py-3 border transition-all
        ${isUser 
          ? 'btn-primary text-white border-transparent shadow-lg'
          : 'glass border-(--border) bg-white/5 text-white shadow-md shadow-(--primary)/10'
        }
      `}>
        <p className="text-sm sm:text-sm leading-relaxed whitespace-pre-wrap break-words text-white">
          {isUser ? formatText(text) : formatText(displayedText)}
          {isTypingAnimation && !isUser && (
            <span className="inline-block w-2 h-4 ml-1 bg-white animate-pulse" />
          )}
        </p>
      </div>

      {/* Product Cards */}
      {!isUser && products && products.length > 0 && (
        <div className="mt-3 space-y-2 w-full max-w-[90%] sm:max-w-[85%]">
          {products.map((product) => {
            // Check if this product was auto-added (single or multi)
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
              className={`glass border rounded-xl p-4 transition-all shadow-lg hover:shadow-xl bg-white/5 ${
                wasAutoAdded 
                  ? 'border-green-400 bg-green-400/10 shadow-green-400/20' 
                  : 'border-gray-600 hover:border-cyan-400 shadow-cyan-400/10 hover:shadow-cyan-400/20'
              }`}
            >
                {/* Auto-added badge */}
                {wasAutoAdded && (
                  <div className="flex items-center gap-2 mb-3 text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-white">
                      Added {addedQuantity > 1 ? `${addedQuantity}x` : ''} to cart!
                    </span>
                  </div>
                )}
                
              <div className="flex gap-3">
                {/* Product Image - Mobile optimized */}
                {product.image_url && (
                  <div className="w-20 h-20 sm:w-16 sm:h-16 shrink-0 bg-(--bg-card) rounded-lg border-2 border-(--primary)/30 overflow-hidden hover:border-(--primary)/60 transition-all shadow-md shadow-(--primary)/10">
                    <img
                      src={(() => {
                        try {
                          // Handle URL encoding and validation
                          const url = product.image_url.trim();
                          // If it's already a full URL, use it
                          if (url.startsWith('http://') || url.startsWith('https://')) {
                            return url;
                          }
                          // If it's a relative path, make it absolute
                          if (url.startsWith('/')) {
                            return url;
                          }
                          // Otherwise, try to encode it
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
                        // Hide the image container on error
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
                  <h4 className="font-semibold text-white mb-1 truncate">
                    {product.name}
                  </h4>
                  {product.category && (
                    <p className="text-xs text-gray-300 mb-1">{product.category}</p>
                  )}
                  {product.description && (
                    <p className="text-xs text-gray-300 line-clamp-2 mb-2">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-white">
                      €{typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                    </span>
                      {wasAutoAdded ? (
                        <button
                          onClick={() => onAddToCart && onAddToCart(product)}
                          className="px-4 py-2.5 sm:py-1.5 bg-(--success) hover:bg-(--success)/80 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-(--success)/30 hover:shadow-xl hover:shadow-(--success)/50 hover:scale-105 touch-manipulation min-h-[44px] sm:min-h-auto"
                        >
                          + Add More
                        </button>
                      ) : (
                    <button
                      onClick={() => onAddToCart && onAddToCart(product)}
                      className="px-4 py-2.5 sm:py-1.5 btn-primary text-white text-sm font-semibold rounded-lg transition-all hover:scale-105 touch-manipulation min-h-[44px] sm:min-h-auto"
                    >
                      Add to Cart
                    </button>
                      )}
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
