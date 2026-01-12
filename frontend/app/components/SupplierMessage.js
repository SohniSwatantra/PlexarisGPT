'use client';

// Simple function to convert **text** to bold
function formatText(text) {
  if (!text) return text;
  
  // Split by ** and wrap every other segment in <strong>
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-bold">{part}</strong>;
    }
    return part;
  });
}

export default function SupplierMessage({ text, isUser, isTyping, products, action }) {
  if (isTyping) {
    return (
      <div className="animate-fade-up flex justify-start">
        <div className="bg-(--bg-secondary)/60 backdrop-blur-xl border border-(--border) shadow-lg shadow-(--primary)/10 rounded-2xl px-4 py-3">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-(--primary) rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-(--accent) rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-(--green) rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-fade-up flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`
        max-w-[85%] rounded-2xl px-4 py-3 shadow-lg shadow-(--primary)/10 border
        ${isUser 
          ? 'bg-gradient-to-r from-(--primary) to-(--accent) text-white border-transparent'
          : 'bg-(--bg-secondary)/70 backdrop-blur-xl border-(--border) text-(--text)'
        }
      `}>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-inherit">{formatText(text)}</p>
      </div>

      {/* Action Success Message */}
      {!isUser && action && action.success && (
        <div className="mt-2 max-w-[85%] bg-green-500/10 border border-green-400/50 rounded-lg px-4 py-2 text-green-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">{action.message}</span>
          </div>
        </div>
      )}

      {/* Action Error Message */}
      {!isUser && action && !action.success && (
        <div className="mt-2 max-w-[85%] bg-red-500/10 border border-red-400/50 rounded-lg px-4 py-2 text-red-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm font-medium">{action.message}</span>
          </div>
        </div>
      )}

      {/* Product Cards */}
      {!isUser && products && products.length > 0 && (
        <div className="mt-3 space-y-2 w-full max-w-[85%]">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-(--bg-secondary)/70 backdrop-blur-xl border border-(--border) rounded-xl p-4 hover:border-(--primary) hover:shadow-(--primary)/20 hover:shadow-lg transition-all"
            >
              <div className="flex gap-3">
                {/* Product Image */}
                {product.image_url && (
                  <div className="w-16 h-16 shrink-0 bg-(--bg-card) rounded-lg border border-(--border) overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-(--primary) mb-1 truncate tracking-[0.08em] uppercase">
                    {product.name}
                  </h4>
                  {product.category && (
                    <p className="text-xs text-(--text-secondary) mb-1">
                      {product.category}
                    </p>
                  )}
                  {product.description && (
                    <p className="text-sm text-(--text-secondary) line-clamp-2 mb-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-(--primary)">
                      €{typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                    </span>
                    <span className="text-sm text-(--text-secondary)">
                      Stock: <span className="font-semibold text-(--primary)">{product.stock_quantity || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


