'use client';

import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import CartSheet from '@/app/components/CartSheet';
import Message from '@/app/components/Message';

export default function ChatPage() {
  const { t } = useI18n();
  
  return (
    <Suspense fallback={<LoadingSpinner t={t} />}>
      <ChatContent />
    </Suspense>
  );
}

function LoadingSpinner({ t }) {
  return (
    <div className="min-h-dvh flex items-center justify-center" style={{
      backgroundColor: '#343541',
      backgroundImage: `
        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.01) 2px, rgba(255, 255, 255, 0.01) 4px),
        repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 255, 255, 0.01) 2px, rgba(255, 255, 255, 0.01) 4px)
      `,
      backgroundSize: '20px 20px'
    }}>
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-(--primary)" />
        <p className="mt-4 text-(--text-secondary)">{t('loading')}</p>
      </div>
    </div>
  );
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { user, userType, internalUserId, loading: authLoading, isAuthenticated, logout } = useAuth();

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef(null);


  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/sessions?userId=${internalUserId}`);
      const data = await response.json();
      const normalized = Array.isArray(data) ? data : data?.sessions || [];
      setSessions(normalized);
      return normalized;
    } catch (error) {
      setSessions([]);
      return [];
    }
  }, [internalUserId]);

  const loadChatHistory = useCallback(async (session) => {
    try {
      if (!session) {
        setChatMessages([]);
        return;
      }
      
      const response = await fetch(`/api/chat/sessions/${session}?userId=${internalUserId}`);
      if (!response.ok) {
        throw new Error(`Failed to load history: ${response.status}`);
      }
      
      const data = await response.json();
      const messages = Array.isArray(data) ? data : (data?.messages || []);
      
      if (messages && messages.length > 0) {
        setChatMessages(messages.map(msg => ({
          text: msg.content,
          isUser: msg.role === 'user',
          products: msg.products,
          cartAction: msg.cart_action,
          isNewMessage: false  // Loaded from history - no animation
        })));
      } else {
        // Session exists but has no messages yet
        setChatMessages([]);
      }
    } catch (error) {
      setChatMessages([]);
    }
  }, [internalUserId]);

  const createNewSession = useCallback(async ({ preserveMessages = false } = {}) => {
    try {
      if (!internalUserId) throw new Error('internalUserId not set');
      
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': internalUserId,
        },
        body: JSON.stringify({ title: 'New Chat', userId: internalUserId })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (!data.session_id) throw new Error('No session_id');
      
      setSessionId(data.session_id);
      // OPTIMIZED: Reload sessions asynchronously (non-blocking)
      loadSessions().catch(() => {});
      if (!preserveMessages) {
        setChatMessages([]);
      }
      window.history.replaceState({}, '', `/customer/chat?session=${data.session_id}`);
      return data.session_id;
    } catch (error) {
      if (!preserveMessages) {
        setChatMessages([]);
      }
      return null;
    }
  }, [internalUserId, loadSessions]);

  const deleteAllSessions = useCallback(async () => {
    try {
      const current = await loadSessions();
      await Promise.all(
        current.map((s) =>
          fetch(`/api/chat/sessions/${s.id}?userId=${internalUserId}`, { method: 'DELETE' })
        )
      );
      setSessions([]);
      setSessionId(null);
      setChatMessages([]);
      await createNewSession();
    } catch (error) {
      console.error('Clear history failed:', error);
    }
  }, [internalUserId, loadSessions, createNewSession]);

  const deleteSession = useCallback(async (sessionToDelete) => {
    try {
      await fetch(`/api/chat/sessions/${sessionToDelete}?userId=${internalUserId}`, { method: 'DELETE' });
      const updated = await loadSessions();
      // If we deleted the active session, switch to the next available or make a new one
      if (sessionId === sessionToDelete) {
        if (updated.length > 0) {
          const first = updated[0].id;
          setSessionId(first);
          await loadChatHistory(first);
        } else {
          await createNewSession();
        }
      }
    } catch (error) {
      console.error('Delete session failed:', error);
    }
  }, [internalUserId, loadSessions, sessionId, loadChatHistory, createNewSession]);

  const switchSession = useCallback((newSessionId) => {
    setSessionId(newSessionId);
    setChatMessages([]);
    loadChatHistory(newSessionId);
    router.push(`/customer/chat?session=${newSessionId}`);
    setShowSidebar(false);
  }, [router, loadChatHistory]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const handleAddToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const handleUpdateQuantity = useCallback((productId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== productId));
    } else {
      setCart(prev => prev.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      ));
    }
  }, []);

  const handleRemoveFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  }, []);

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return;
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vat = subtotal * 0.21;
    const total = subtotal + vat;
    
    // Get supplier_id from first item (assuming all items are from same supplier)
    const supplierId = cart[0]?.supplier_id || '';
    
    // Save to sessionStorage
    sessionStorage.setItem('checkoutData', JSON.stringify({
      items: cart,
      supplierId: supplierId,
      totalAmount: total
    }));
    
    // Navigate to checkout
    router.push('/customer/checkout');
  }, [cart, router]);

  const handleChatSend = useCallback(async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsTyping(true);

    try {
      let activeSession = sessionId;
      if (!activeSession) {
        activeSession = await createNewSession({ preserveMessages: true });
        if (!activeSession) throw new Error('No session available');
      }

      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          userId: internalUserId,
          cartItems: cart,
          sessionId: activeSession
        })
      });

      if (!response.ok) throw new Error('RAG failed');
      const data = await response.json();
      
      // Handle checkout action from RAG
      if (data.checkout_action && data.checkout_action.action === 'redirect') {
        // Navigate to checkout
        handleCheckout();
        return;
      }
      
      // Handle cart actions
      if (data.cart_action) {
        if (data.cart_action.action === 'add') {
          setCart(prev => {
            const existing = prev.find(item => item.id === data.cart_action.product.id);
            if (existing) {
              return prev.map(item =>
                item.id === data.cart_action.product.id 
                  ? { ...item, quantity: item.quantity + data.cart_action.quantity }
                  : item
              );
            }
            return [...prev, { ...data.cart_action.product, quantity: data.cart_action.quantity }];
          });
        } else if (data.cart_action.action === 'add_multiple') {
          setCart(prev => {
            let updated = [...prev];
            data.cart_action.items.forEach(({ product, quantity }) => {
              const existing = updated.find(item => item.id === product.id);
              if (existing) {
                updated = updated.map(item =>
                  item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
              } else {
                updated.push({ ...product, quantity });
              }
            });
            return updated;
          });
        } else if (data.cart_action.action === 'remove') {
          setCart(prev => prev.filter(item => item.id !== data.cart_action.product_id));
        } else if (data.cart_action.action === 'remove_multiple') {
          setCart(prev => prev.filter(item => !data.cart_action.product_ids.includes(item.id)));
        } else if (data.cart_action.action === 'update_quantity') {
          setCart(prev => prev.map(item =>
            item.id === data.cart_action.product_id
              ? { ...item, quantity: data.cart_action.quantity }
              : item
          ).filter(item => item.quantity > 0));
        }
      }
      
      setChatMessages(prev => [...prev, {
        text: data.response,
        isUser: false,
        products: data.products,
        cartAction: data.cart_action,
        isNewMessage: true  // Mark as new message to trigger typing animation
      }]);
      // OPTIMIZED: Refresh sessions in background (don't block UI)
      loadSessions().catch(err => console.error('Failed to refresh sessions:', err));
    } catch (error) {
      console.error('Chat send failed:', error);
      setChatMessages(prev => [...prev, {
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        isNewMessage: true  // Mark as new message to trigger typing animation
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [chatInput, isTyping, sessionId, internalUserId, cart, createNewSession, loadSessions, handleCheckout]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

  // Initialize session from URL or create new one
  useEffect(() => {
    if (authLoading) return;
    if (!internalUserId) return;
    if (!isAuthenticated || userType !== 'customer') {
      router.replace('/');
      return;
    }

    const initializeChat = async () => {
      try {
        const paramSessionId = searchParams.get('session');
        const existingSessions = await loadSessions();

        if (paramSessionId && paramSessionId !== 'undefined') {
          setSessionId(paramSessionId);
          // Load history in background - don't block UI
          loadChatHistory(paramSessionId).catch(err => console.error('Failed to load chat history:', err));
          return;
        }

        if (existingSessions.length > 0) {
          const firstSessionId = existingSessions[0].id;
          setSessionId(firstSessionId);
          // Load history in background - don't block UI
          loadChatHistory(firstSessionId).catch(err => console.error('Failed to load chat history:', err));
          // Update URL to reflect the active session
          window.history.replaceState({}, '', `/customer/chat?session=${firstSessionId}`);
          return;
        }

        // No sessions yet: stay empty; first send will create
        setSessionId(null);
        setChatMessages([]);
      } catch (err) {
        console.error('Chat init failed:', err);
        setChatMessages([]);
      }
    };

    initializeChat();
  }, [authLoading, internalUserId, isAuthenticated, userType, searchParams, router, loadSessions, loadChatHistory]);

  if (authLoading) return <LoadingSpinner t={t} />;

  return (
    <div className="min-h-dvh flex flex-col overflow-hidden" style={{
      backgroundColor: '#343541',
      backgroundImage: `
        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.01) 2px, rgba(255, 255, 255, 0.01) 4px),
        repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 255, 255, 0.01) 2px, rgba(255, 255, 255, 0.01) 4px)
      `,
      backgroundSize: '20px 20px'
    }}>
      {/* Header - Mobile Optimized */}
      <header className="flex-shrink-0 border-b border-(--border) glass-light sticky top-0 z-40 shadow-lg">
        <div className="px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2.5 hover:bg-(--surface) rounded-lg text-(--text-secondary) hover:text-(--primary) transition-all hover:shadow-lg hover:shadow-(--primary)/20 touch-manipulation"
                aria-label="Toggle sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold gradient-text truncate">{t('chat')}</h1>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => setShowCart(true)}
                className="relative px-3 sm:px-4 py-2 btn-primary font-semibold rounded-lg transition-all hover:scale-105 text-sm sm:text-base touch-manipulation"
              >
                <span className="hidden sm:inline">Cart</span>
                <span className="sm:hidden">🛒</span>
                <span className="ml-1.5 inline-block px-2 py-0.5 bg-white/20 rounded text-xs font-bold">{cart.length}</span>
              </button>

              {/* Menu */}
              <div className="relative group">
                <button className="p-2 hover:bg-(--surface) rounded-lg text-(--text-secondary) hover:text-(--primary) transition-all hover:shadow-lg hover:shadow-(--primary)/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-44 glass border border-(--border) rounded-lg shadow-2xl shadow-(--primary)/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button onClick={() => router.push('/customer/dashboard')} className="w-full text-left px-4 py-2.5 hover:bg-(--surface) hover:text-(--primary) text-sm transition-all rounded-t-lg">{t('orders')}</button>
                  <button onClick={() => router.push('/customer/settings')} className="w-full text-left px-4 py-2.5 hover:bg-(--surface) hover:text-(--primary) text-sm border-t border-(--border) transition-all">{t('settings')}</button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 hover:bg-(--error) hover:text-white text-sm border-t border-(--border) text-(--error) transition-all rounded-b-lg">{t('logout')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      {showSidebar && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setShowSidebar(false)} />
          <div className="fixed left-0 top-0 z-50 h-screen w-full sm:w-64 glass border-r border-(--border) shadow-2xl shadow-(--primary)/10 overflow-y-auto">
            <div className="p-4 border-b border-(--border) sticky top-0 glass">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold gradient-text">History</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await createNewSession();
                      setShowSidebar(false);
                    }}
                    className="text-xs px-2 py-1 rounded-md bg-(--surface) hover:bg-(--primary)/10 border border-(--border) hover:border-(--primary)"
                  >
                    New
                  </button>
                  <button onClick={() => setShowSidebar(false)} className="p-1.5 hover:bg-(--surface) rounded hover:text-(--primary) transition-all" aria-label="Close">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {sessions.length === 0 ? (
                <p className="text-(--text-secondary) text-sm text-center py-8">No chats</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => switchSession(s.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchSession(s.id); } }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm truncate cursor-pointer ${
                      sessionId === s.id 
                        ? 'btn-primary text-white shadow-lg' 
                        : 'hover:bg-(--surface) hover:border hover:border-(--primary)/30 hover:shadow-md hover:shadow-(--primary)/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{s.title}</p>
                        <p className="text-xs opacity-70">{new Date(s.updated_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(s.id);
                        }}
                        className="p-2 sm:p-1 rounded hover:bg-(--surface) text-(--text-secondary) hover:text-(--error) transition-all touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                        aria-label="Delete chat"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <main className="flex-1 overflow-hidden flex flex-col relative" style={{
        backgroundColor: '#343541',
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.01) 2px, rgba(255, 255, 255, 0.01) 4px),
          repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 255, 255, 0.01) 2px, rgba(255, 255, 255, 0.01) 4px)
        `,
        backgroundSize: '20px 20px'
      }}>
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 relative z-10">
          {chatMessages.map((msg, i) => (
            <Message key={i} text={msg.text} isUser={msg.isUser} products={msg.products} onAddToCart={handleAddToCart} cartAction={msg.cartAction} isNewMessage={msg.isNewMessage} />
          ))}
          {isTyping && <Message text="" isUser={false} isTyping={true} />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-(--border) glass-light p-3 sm:p-4 shadow-2xl shadow-(--primary)/10 relative z-10">
          <form onSubmit={handleChatSend} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={t('typeSomething')}
              disabled={isTyping}
              className="flex-1 bg-(--surface) border border-(--border) rounded-lg px-3 sm:px-4 py-3 sm:py-2 text-base sm:text-sm focus:outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/30 focus:shadow-lg focus:shadow-(--primary)/20 disabled:opacity-50 transition-all placeholder:text-(--text-secondary) touch-manipulation"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
            <button
              type="submit"
              disabled={isTyping || !chatInput.trim()}
              className="px-4 sm:px-6 py-3 sm:py-2 btn-primary rounded-lg font-semibold text-base sm:text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed touch-manipulation min-w-[80px]"
            >
              Send
            </button>
          </form>
        </div>
      </main>

      {/* Cart Sheet */}
      {showCart && (
        <CartSheet 
          items={cart} 
          isOpen={showCart} 
          onClose={() => setShowCart(false)}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={handleRemoveFromCart}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
}
