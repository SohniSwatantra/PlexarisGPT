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
    <div className="min-h-dvh flex items-center justify-center" style={{ background: '#141414' }}>
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#333333] border-t-[#F5C042]" />
        <p className="mt-4 text-sm" style={{ color: '#777777' }}>{t('loading')}</p>
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
  const [showVoice, setShowVoice] = useState(false);
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
    <div className="min-h-dvh flex" style={{ background: '#141414' }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-200 ease-out lg:relative lg:translate-x-0 ${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#1a1a1a', borderRight: '1px solid #333333' }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #333333' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#F5C042' }}>
                <span className="text-[#1a1a1a] text-sm font-bold">P</span>
              </div>
              <span className="font-semibold text-[15px]" style={{ color: '#f5f0e1', letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>Plexaris</span>
            </div>
            <button
              onClick={() => setShowSidebar(false)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: '#777777' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f5f0e1'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#777777'}
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
              className="w-full flex items-center gap-2 px-4 py-3 rounded-full text-[14px] font-semibold transition-all uppercase tracking-wide"
              style={{ background: '#F5C042', color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFD060';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 192, 66, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F5C042';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider px-2 py-2" style={{ color: '#777777', fontFamily: 'var(--font-space-grotesk)' }}>
              Recent
            </p>
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <p className="text-sm px-2 py-8 text-center" style={{ color: '#777777' }}>No conversations yet</p>
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
                      background: sessionId === s.id ? '#252525' : 'transparent',
                      borderLeft: sessionId === s.id ? '2px solid #F5C042' : '2px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (sessionId !== s.id) {
                        e.currentTarget.style.background = '#1e1e1e';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sessionId !== s.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] truncate" style={{ color: sessionId === s.id ? '#f5f0e1' : '#b8b8b8' }}>{s.title || 'Untitled'}</p>
                      <p className="text-[12px]" style={{ color: '#777777' }}>{new Date(s.updated_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(s.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all"
                      style={{ color: '#777777' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#777777'}
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
          <div className="p-3" style={{ borderTop: '1px solid #333333' }}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] transition-all"
              style={{ color: '#777777' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1e1e1e';
                e.currentTarget.style.color = '#f5f0e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#777777';
              }}
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
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #333333', background: '#1a1a1a' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: '#777777' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#252525';
                e.currentTarget.style.color = '#f5f0e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#777777';
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-[15px] font-semibold uppercase tracking-wide" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>Chat</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Supplier Dashboard Button */}
            <button
              onClick={() => router.push('/supplier/dashboard')}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all uppercase tracking-wide"
              style={{ background: '#252525', color: '#b8b8b8', border: '1px solid #333333' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#F5C042';
                e.currentTarget.style.color = '#F5C042';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#333333';
                e.currentTarget.style.color = '#b8b8b8';
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="hidden sm:inline">Supplier</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all uppercase tracking-wide"
              style={{ background: '#F5C042', color: '#1a1a1a' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFD060';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 192, 66, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F5C042';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {cart.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: '#1a1a1a', color: '#F5C042' }}>
                  {cart.length}
                </span>
              )}
            </button>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#777777' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#252525';
                  e.currentTarget.style.color = '#f5f0e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#777777';
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2" />
                </svg>
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div
                    className="absolute right-0 mt-2 w-48 py-1 rounded-xl shadow-lg z-50"
                    style={{ background: '#1e1e1e', border: '1px solid #333333' }}
                  >
                    <button
                      onClick={() => { router.push('/customer/dashboard'); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] transition-colors"
                      style={{ color: '#b8b8b8' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#252525';
                        e.currentTarget.style.color = '#f5f0e1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#b8b8b8';
                      }}
                    >
                      Orders
                    </button>
                    <button
                      onClick={() => { router.push('/customer/settings'); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] transition-colors"
                      style={{ color: '#b8b8b8' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#252525';
                        e.currentTarget.style.color = '#f5f0e1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#b8b8b8';
                      }}
                    >
                      Settings
                    </button>
                    <div style={{ height: '1px', background: '#333333', margin: '4px 0' }} />
                    <button
                      onClick={() => { handleLogout(); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-[14px] transition-colors"
                      style={{ color: '#ef4444' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
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
        <main className="flex-1 overflow-y-auto" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {chatMessages.length === 0 && !isTyping && (
              <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto mb-6 rounded-xl flex items-center justify-center" style={{ background: '#1e1e1e', border: '1px solid #333333' }}>
                  <svg className="w-8 h-8" style={{ color: '#F5C042' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-3 uppercase" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>How Can I Help You?</h2>
                <p className="text-[15px]" style={{ color: '#777777' }}>Ask me about our products or what you're looking for</p>
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
        <div className="px-4 py-4" style={{ borderTop: '1px solid #333333', background: '#1a1a1a' }}>
          <form onSubmit={handleChatSend} className="max-w-3xl mx-auto">
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2"
              style={{ background: '#1e1e1e', border: '1px solid #333333' }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isTyping}
                className="flex-1 bg-transparent text-[15px] focus:outline-none disabled:opacity-50"
                style={{ color: '#f5f0e1' }}
                autoComplete="off"
              />
              {/* Voice Button */}
              <button
                type="button"
                onClick={() => setShowVoice(true)}
                className="p-2.5 rounded-full transition-all"
                style={{ background: '#252525', color: '#b8b8b8' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#333333';
                  e.currentTarget.style.color = '#F5C042';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#252525';
                  e.currentTarget.style.color = '#b8b8b8';
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
              {/* Send Button */}
              <button
                type="submit"
                disabled={isTyping || !chatInput.trim()}
                className="p-2.5 rounded-full transition-all disabled:opacity-30"
                style={{ background: '#F5C042', color: '#1a1a1a' }}
                onMouseEnter={(e) => {
                  if (!isTyping && chatInput.trim()) {
                    e.currentTarget.style.background = '#FFD060';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(245, 192, 66, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F5C042';
                  e.currentTarget.style.boxShadow = 'none';
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

      {/* Voice Chat Modal - ElevenLabs */}
      {showVoice && (
        <VoiceModal onClose={() => setShowVoice(false)} />
      )}
    </div>
  );
}

function VoiceModal({ onClose }) {
  useEffect(() => {
    // Load ElevenLabs widget script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[500px] sm:h-[600px] z-50 rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#1a1a1a', border: '1px solid #333333' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #333333' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#F5C042' }}>
              <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[16px] font-bold uppercase" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>Voice Assistant</h2>
              <p className="text-[13px]" style={{ color: '#777777' }}>Powered by ElevenLabs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#777777' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#252525';
              e.currentTarget.style.color = '#f5f0e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#777777';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ElevenLabs Widget Container */}
        <div className="flex-1 h-[calc(100%-72px)] flex items-center justify-center p-6">
          <div className="text-center w-full h-full flex flex-col items-center justify-center">
            <elevenlabs-convai agent-id="agent_5601ket2xcyke17tcxzg6bxjwe0t"></elevenlabs-convai>
            <p className="mt-4 text-[13px]" style={{ color: '#777777' }}>
              Click the microphone to start talking
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
