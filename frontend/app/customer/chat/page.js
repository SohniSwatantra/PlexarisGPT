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
    <div className="min-h-dvh flex items-center justify-center" style={{ background: '#faf9f7' }}>
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-800" />
        <p className="mt-4 text-sm" style={{ color: '#6b6b6b' }}>{t('loading')}</p>
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
  const [showMenu, setShowMenu] = useState(false);
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
          isNewMessage: false
        })));
      } else {
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

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vat = subtotal * 0.21;
    const total = subtotal + vat;
    const supplierId = cart[0]?.supplier_id || '';

    sessionStorage.setItem('checkoutData', JSON.stringify({
      items: cart,
      supplierId: supplierId,
      totalAmount: total
    }));

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

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://plexarisgpt-production.up.railway.app';
      const response = await fetch(`${backendUrl}/api/rag`, {
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

      if (data.checkout_action && data.checkout_action.action === 'redirect') {
        handleCheckout();
        return;
      }

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
        isNewMessage: true
      }]);
      loadSessions().catch(err => console.error('Failed to refresh sessions:', err));
    } catch (error) {
      console.error('Chat send failed:', error);
      setChatMessages(prev => [...prev, {
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        isNewMessage: true
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [chatInput, isTyping, sessionId, internalUserId, cart, createNewSession, loadSessions, handleCheckout]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

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
          loadChatHistory(paramSessionId).catch(err => console.error('Failed to load chat history:', err));
          return;
        }

        if (existingSessions.length > 0) {
          const firstSessionId = existingSessions[0].id;
          setSessionId(firstSessionId);
          loadChatHistory(firstSessionId).catch(err => console.error('Failed to load chat history:', err));
          window.history.replaceState({}, '', `/customer/chat?session=${firstSessionId}`);
          return;
        }

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
    <div className="min-h-dvh flex" style={{ background: '#faf9f7' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-200 ease-out lg:relative lg:translate-x-0 ${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#ffffff', borderRight: '1px solid #e5e3e0' }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #e5e3e0' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                <span className="text-white text-sm font-semibold">P</span>
              </div>
              <span className="font-semibold text-[15px]" style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}>Plexaris</span>
            </div>
            <button
              onClick={() => setShowSidebar(false)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: '#6b6b6b' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={async () => {
                await createNewSession();
                setShowSidebar(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-[14px] font-medium transition-all"
              style={{ background: '#f5f4f2', color: '#1a1a1a', border: '1px solid #e5e3e0' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#eeecea';
                e.currentTarget.style.borderColor = '#999999';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f5f4f2';
                e.currentTarget.style.borderColor = '#e5e3e0';
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New chat
            </button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <p className="text-[11px] font-medium uppercase tracking-wider px-2 py-2" style={{ color: '#999999' }}>
              Recent
            </p>
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <p className="text-sm px-2 py-8 text-center" style={{ color: '#999999' }}>No conversations yet</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => switchSession(s.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchSession(s.id); } }}
                    className="group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                    style={{
                      background: sessionId === s.id ? '#f5f4f2' : 'transparent',
                      color: sessionId === s.id ? '#1a1a1a' : '#6b6b6b'
                    }}
                    onMouseEnter={(e) => {
                      if (sessionId !== s.id) {
                        e.currentTarget.style.background = '#f5f4f2';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sessionId !== s.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] truncate" style={{ color: '#1a1a1a' }}>{s.title || 'Untitled'}</p>
                      <p className="text-[12px]" style={{ color: '#999999' }}>{new Date(s.updated_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(s.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all"
                      style={{ color: '#999999' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* User Section */}
          <div className="p-3" style={{ borderTop: '1px solid #e5e3e0' }}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] transition-all"
              style={{ color: '#6b6b6b' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f5f4f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #e5e3e0', background: '#ffffff' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: '#6b6b6b' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f5f4f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-[15px] font-medium" style={{ color: '#1a1a1a' }}>Chat</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Supplier Dashboard Button */}
            <button
              onClick={() => router.push('/supplier/dashboard')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-all"
              style={{ background: '#1a1a1a', color: '#ffffff' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#333333'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="hidden sm:inline">Supplier</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-all"
              style={{ background: '#1a1a1a', color: '#ffffff' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#333333'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {cart.length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[12px] font-semibold" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  {cart.length}
                </span>
              )}
            </button>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#6b6b6b' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f4f2'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2" />
                </svg>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div
                    className="absolute right-0 mt-2 w-48 py-1 rounded-lg shadow-lg z-50"
                    style={{ background: '#ffffff', border: '1px solid #e5e3e0' }}
                  >
                    <button
                      onClick={() => { router.push('/customer/dashboard'); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] transition-colors"
                      style={{ color: '#1a1a1a' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f5f4f2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Orders
                    </button>
                    <button
                      onClick={() => { router.push('/customer/settings'); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] transition-colors"
                      style={{ color: '#1a1a1a' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f5f4f2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Settings
                    </button>
                    <div style={{ height: '1px', background: '#e5e3e0', margin: '4px 0' }} />
                    <button
                      onClick={() => { handleLogout(); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] transition-colors"
                      style={{ color: '#ef4444' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {chatMessages.length === 0 && !isTyping && (
              <div className="text-center py-20">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: '#f5f4f2' }}>
                  <svg className="w-6 h-6" style={{ color: '#6b6b6b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: '#1a1a1a' }}>How can I help you?</h2>
                <p className="text-[15px]" style={{ color: '#6b6b6b' }}>Ask me about our products or what you're looking for</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <Message key={i} text={msg.text} isUser={msg.isUser} products={msg.products} onAddToCart={handleAddToCart} cartAction={msg.cartAction} isNewMessage={msg.isNewMessage} />
            ))}
            {isTyping && <Message text="" isUser={false} isTyping={true} />}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Area */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid #e5e3e0', background: '#ffffff' }}>
          <form onSubmit={handleChatSend} className="max-w-3xl mx-auto">
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-2"
              style={{ background: '#f5f4f2', border: '1px solid #e5e3e0' }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isTyping}
                className="flex-1 bg-transparent text-[15px] focus:outline-none disabled:opacity-50"
                style={{ color: '#1a1a1a' }}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isTyping || !chatInput.trim()}
                className="p-2 rounded-lg transition-all disabled:opacity-30"
                style={{ background: '#1a1a1a', color: '#ffffff' }}
                onMouseEnter={(e) => {
                  if (!isTyping && chatInput.trim()) e.currentTarget.style.background = '#333333';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1a1a1a';
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

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
