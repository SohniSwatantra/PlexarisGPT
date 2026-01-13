'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import SupplierMessage from '@/app/components/SupplierMessage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://plexarisgpt-production.up.railway.app';

export default function SupplierDashboard() {
  const router = useRouter();
  const { user, loading: authHookLoading, isAuthenticated, logout } = useAuth();

  const [userEmail, setUserEmail] = useState(null);
  const [supplierId, setSupplierId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notSupplier, setNotSupplier] = useState(false);

  const [supplier, setSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    website_url: ''
  });
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    stock_quantity: '',
    image_url: ''
  });

  const loadSupplierData = useCallback(async (supplierId) => {
    try {
      const supplierRes = await fetch(`${API_URL}/api/suppliers/${supplierId}`);
      if (supplierRes.ok) {
        const supplierData = await supplierRes.json();
        if (!supplierData.name) {
          setNeedsOnboarding(true);
        } else {
          setNeedsOnboarding(false);
        }
        setSupplier(supplierData);
        setProfileData({
          name: supplierData.name || '',
          website_url: supplierData.website_url || ''
        });
      }

      const productsRes = await fetch(`${API_URL}/api/products?supplier_id=${supplierId}&limit=100`);
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
      }

      const ordersRes = await fetch(`${API_URL}/api/orders/supplier/${supplierId}`);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }
    } catch (err) {
      setError('Failed to load supplier data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for auth hook to finish loading
      if (authHookLoading) return;

      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        router.replace('/login');
        return;
      }

      try {
        // Get email from localStorage (set during demo login)
        const email = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail');

        if (!email) {
          router.replace('/login');
          return;
        }

        setUserEmail(email);

        // Check if this email is a supplier
        const response = await fetch(
          `${API_URL}/api/suppliers/check-email/${encodeURIComponent(email)}`
        );

        if (response.ok) {
          const data = await response.json();

          if (!data.exists) {
            // User is not a supplier - show message instead of redirect loop
            setNotSupplier(true);
            setAuthLoading(false);
            setLoading(false);
            return;
          }

          setSupplierId(data.supplier_id);
          setAuthLoading(false);
          loadSupplierData(data.supplier_id);

        } else {
          setNotSupplier(true);
          setAuthLoading(false);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setNotSupplier(true);
        setAuthLoading(false);
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, loadSupplierData, authHookLoading, isAuthenticated]);

  const handleLogout = () => {
    logout();
  };

  const goToOnboarding = () => {
    router.push('/supplier/onboarding');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setIsEditingProfile(false);
        loadSupplierData(supplierId);
      } else {
        setError('Failed to update profile');
      }
    } catch (err) {
      setError('An error occurred while updating profile');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      description: '',
      price: '',
      stock_quantity: '',
      image_url: ''
    });
    setIsAddingProduct(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!supplierId) return;

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        image_url: formData.image_url,
        supplier_id: supplierId
      };

      if (editingProduct) {
        const response = await fetch(`${API_URL}/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          setSuccess('Product updated successfully!');
          loadSupplierData(supplierId);
          resetForm();
        } else {
          setError('Failed to update product');
        }
      } else {
        const response = await fetch(`${API_URL}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          setSuccess('Product added successfully!');
          loadSupplierData(supplierId);
          resetForm();
        } else {
          setError('Failed to add product');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    if (!supplierId) return;

    try {
      const response = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Product deleted successfully!');
        loadSupplierData(supplierId);
      } else {
        setError('Failed to delete product');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price,
      stock_quantity: product.stock_quantity,
      image_url: product.image_url || ''
    });
    setIsAddingProduct(true);
  };

  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping || !supplierId) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { text: userMessage, isUser: true }]);

    setIsTyping(true);
    try {
      const response = await fetch(`${API_URL}/api/supplier-rag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          supplierId: supplierId,
          history: chatMessages.slice(-10).map((msg) => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      if (data.action && data.action.success) {
        setTimeout(() => loadSupplierData(supplierId), 500);
      }

      setChatMessages(prev => [...prev, {
        text: data.response,
        isUser: false,
        products: data.products,
        action: data.action
      }]);
    } catch (error) {
      setChatMessages(prev => [...prev, {
        text: `Sorry, I'm having trouble: ${error.message}`,
        isUser: false
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  if (loading || authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#141414' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#333333] border-t-[#F5C042]" />
          <p className="mt-4 text-sm" style={{ color: '#777777' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (notSupplier) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#141414' }}>
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#1e1e1e', border: '1px solid #333333' }}>
            <svg className="w-8 h-8" style={{ color: '#F5C042' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 uppercase" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>Not a Supplier</h2>
          <p className="mb-6" style={{ color: '#b8b8b8' }}>
            Your account ({userEmail}) is not registered as a supplier. Would you like to become one?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/supplier/onboarding')}
              className="w-full py-3 px-4 rounded-full font-semibold transition-all uppercase tracking-wide"
              style={{ background: '#F5C042', color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FFD060'; e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 192, 66, 0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F5C042'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              Become a Supplier
            </button>
            <button
              onClick={() => router.push('/customer/chat')}
              className="w-full py-3 px-4 rounded-full font-semibold transition-all uppercase tracking-wide"
              style={{ background: 'transparent', color: '#f5f0e1', border: '1px solid #333333', fontFamily: 'var(--font-space-grotesk)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.borderColor = '#F5C042'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#333333'; }}
            >
              Back to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#141414' }}>
      {/* Header */}
      <header style={{ background: '#1a1a1a', borderBottom: '1px solid #333333' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F5C042' }}>
                <span className="text-[#1a1a1a] text-sm font-bold">P</span>
              </div>
              <div>
                <h1 className="text-[16px] font-semibold" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>{supplier?.name || 'Supplier'}</h1>
                <p className="text-[13px]" style={{ color: '#777777' }}>{products.length} products</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-[14px] font-medium rounded-lg transition-colors"
              style={{ color: '#ef4444' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Sign out
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {[
              { id: 'products', label: 'Products' },
              { id: 'orders', label: 'Orders' },
              { id: 'chat', label: 'Chat' },
              { id: 'settings', label: 'Settings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 text-[14px] font-medium rounded-lg transition-all"
                style={{
                  background: activeTab === tab.id ? '#F5C042' : 'transparent',
                  color: activeTab === tab.id ? '#1a1a1a' : '#777777',
                  fontFamily: 'var(--font-space-grotesk)'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) e.currentTarget.style.background = '#252525';
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent';
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {needsOnboarding && (
            <div
              className="rounded-xl p-4 mb-6 flex items-center justify-between"
              style={{ background: 'rgba(245, 192, 66, 0.1)', border: '1px solid rgba(245, 192, 66, 0.3)' }}
            >
              <div>
                <p className="font-medium text-[15px]" style={{ color: '#F5C042' }}>Complete your profile</p>
                <p className="text-[13px]" style={{ color: '#b8b8b8' }}>Finish onboarding so buyers see your business name.</p>
              </div>
              <button
                onClick={goToOnboarding}
                className="px-4 py-2 text-[14px] font-semibold rounded-full transition-all"
                style={{ background: '#F5C042', color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#FFD060'; e.currentTarget.style.boxShadow = '0 0 15px rgba(245, 192, 66, 0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#F5C042'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                Continue
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg p-4 mb-4 text-[14px]" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg p-4 mb-4 text-[14px]" style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ADE80' }}>
              {success}
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <>
              {isAddingProduct ? (
                <div className="rounded-xl p-6 mb-6" style={{ background: '#1e1e1e', border: '1px solid #333333' }}>
                  <h2 className="text-[18px] font-semibold mb-4 uppercase" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Product Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="px-4 py-3 text-[15px] rounded-lg transition-all"
                        style={{ background: '#141414', border: '1px solid #333333', color: '#f5f0e1', outline: 'none' }}
                        onFocus={(e) => { e.target.style.borderColor = '#F5C042'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 192, 66, 0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.boxShadow = 'none'; }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="px-4 py-3 text-[15px] rounded-lg transition-all"
                        style={{ background: '#141414', border: '1px solid #333333', color: '#f5f0e1', outline: 'none' }}
                        onFocus={(e) => { e.target.style.borderColor = '#F5C042'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 192, 66, 0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.boxShadow = 'none'; }}
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price (€)"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="px-4 py-3 text-[15px] rounded-lg transition-all"
                        style={{ background: '#141414', border: '1px solid #333333', color: '#f5f0e1', outline: 'none' }}
                        onFocus={(e) => { e.target.style.borderColor = '#F5C042'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 192, 66, 0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.boxShadow = 'none'; }}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Stock Quantity"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                        className="px-4 py-3 text-[15px] rounded-lg transition-all"
                        style={{ background: '#141414', border: '1px solid #333333', color: '#f5f0e1', outline: 'none' }}
                        onFocus={(e) => { e.target.style.borderColor = '#F5C042'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 192, 66, 0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.boxShadow = 'none'; }}
                        required
                      />
                    </div>
                    <textarea
                      placeholder="Description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 text-[15px] rounded-lg transition-all resize-none"
                      style={{ background: '#141414', border: '1px solid #333333', color: '#f5f0e1', outline: 'none' }}
                      onFocus={(e) => { e.target.style.borderColor = '#F5C042'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 192, 66, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.boxShadow = 'none'; }}
                      rows="3"
                      required
                    />
                    <input
                      type="url"
                      placeholder="Image URL (e.g., https://images.unsplash.com/...)"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-4 py-3 text-[15px] rounded-lg transition-all"
                      style={{ background: '#141414', border: '1px solid #333333', color: '#f5f0e1', outline: 'none' }}
                      onFocus={(e) => { e.target.style.borderColor = '#F5C042'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 192, 66, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.boxShadow = 'none'; }}
                    />
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 py-3 text-[15px] font-semibold rounded-full transition-all uppercase tracking-wide"
                        style={{ background: '#F5C042', color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FFD060'; e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 192, 66, 0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#F5C042'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {editingProduct ? 'Update Product' : 'Add Product'}
                      </button>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-6 py-3 text-[15px] font-semibold rounded-full transition-all uppercase tracking-wide"
                        style={{ background: 'transparent', color: '#f5f0e1', border: '1px solid #333333', fontFamily: 'var(--font-space-grotesk)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#252525'; e.currentTarget.style.borderColor = '#F5C042'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#333333'; }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingProduct(true)}
                  className="mb-6 px-5 py-3 text-[14px] font-semibold rounded-full flex items-center gap-2 transition-all uppercase tracking-wide"
                  style={{ background: '#F5C042', color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#FFD060'; e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 192, 66, 0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#F5C042'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Product
                </button>
              )}

              {/* Products List */}
              <div className="space-y-3">
                {products.length === 0 ? (
                  <div className="rounded-xl p-12 text-center" style={{ background: '#1e1e1e', border: '1px solid #333333' }}>
                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: '#252525', border: '1px solid #333333' }}>
                      <svg className="w-7 h-7" style={{ color: '#F5C042' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="font-medium text-[16px] mb-1 uppercase" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>No Products Yet</p>
                    <p className="text-[14px]" style={{ color: '#777777' }}>Add your first product to get started</p>
                  </div>
                ) : (
                  products.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-xl p-4 transition-all"
                      style={{ background: '#1e1e1e', border: '1px solid #333333' }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#F5C042'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333333'}
                    >
                      <div className="flex gap-4 items-start">
                        {/* Product Image */}
                        <div
                          className="w-20 h-20 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                          style={{ background: '#252525', border: '1px solid #333333' }}
                        >
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                              crossOrigin="anonymous"
                            />
                          ) : null}
                          <div
                            className="w-full h-full items-center justify-center text-2xl"
                            style={{ display: product.image_url ? 'none' : 'flex', color: '#777777' }}
                          >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[15px] truncate" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>{product.name}</h3>
                          <p className="text-[13px] mb-1" style={{ color: '#b8b8b8' }}>{product.category}</p>
                          <p className="text-[13px] line-clamp-2 mb-2" style={{ color: '#777777' }}>{product.description}</p>
                          <div className="flex items-center gap-4">
                            <span className="font-semibold text-[16px]" style={{ color: '#F5C042' }}>€{parseFloat(product.price).toFixed(2)}</span>
                            <span className="text-[13px]" style={{ color: '#b8b8b8' }}>Stock: {product.stock_quantity}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleEdit(product)}
                            className="px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all"
                            style={{ background: '#252525', color: '#f5f0e1', border: '1px solid #333333' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#333333'; e.currentTarget.style.borderColor = '#F5C042'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#252525'; e.currentTarget.style.borderColor = '#333333'; }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all"
                            style={{ color: '#ef4444' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="rounded-xl p-12 text-center" style={{ background: '#1e1e1e', border: '1px solid #333333' }}>
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: '#252525', border: '1px solid #333333' }}>
                    <svg className="w-7 h-7" style={{ color: '#F5C042' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="font-medium text-[16px] mb-1 uppercase" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>No Orders Yet</p>
                  <p className="text-[14px]" style={{ color: '#777777' }}>Orders containing your products will appear here</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="rounded-xl p-5" style={{ background: '#1e1e1e', border: '1px solid #333333' }}>
                    <div className="flex justify-between items-start mb-4 pb-4" style={{ borderBottom: '1px solid #333333' }}>
                      <div>
                        <p className="text-[13px] mb-1" style={{ color: '#777777' }}>Customer</p>
                        <p className="font-medium text-[15px]" style={{ color: '#f5f0e1' }}>{order.user_email || 'Unknown'}</p>
                        <p className="text-[12px] mt-1" style={{ color: '#777777' }}>
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] mb-1" style={{ color: '#777777' }}>Total</p>
                        <p className="font-semibold text-[20px]" style={{ color: '#F5C042' }}>€{parseFloat(order.total_amount || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {order.order_items?.map((item, index) => (
                        <div key={index} className="flex gap-3 items-center p-3 rounded-lg" style={{ background: '#252525' }}>
                          <div className="flex-1">
                            <p className="font-medium text-[14px]" style={{ color: '#f5f0e1' }}>{item.name}</p>
                            <p className="text-[12px]" style={{ color: '#b8b8b8' }}>Qty: {item.quantity}</p>
                          </div>
                          <p className="font-medium text-[14px]" style={{ color: '#4ADE80' }}>€{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="h-[calc(100vh-220px)] flex flex-col rounded-xl" style={{ background: '#1e1e1e', border: '1px solid #333333' }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: '#252525', border: '1px solid #333333' }}>
                      <svg className="w-6 h-6" style={{ color: '#F5C042' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="font-medium text-[15px] mb-1" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>Ask me to help manage your products!</p>
                    <p className="text-[14px]" style={{ color: '#777777' }}>Try: "show me all products" or "set stock of [product] to 50"</p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <SupplierMessage
                    key={idx}
                    text={msg.text}
                    isUser={msg.isUser}
                    products={msg.products}
                    action={msg.action}
                  />
                ))}
                {isTyping && <SupplierMessage text="" isUser={false} isTyping={true} />}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleChatSend} className="p-4" style={{ borderTop: '1px solid #333333' }}>
                <div className="flex gap-2 items-center rounded-full px-4 py-2" style={{ background: '#141414', border: '1px solid #333333' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about your products..."
                    className="flex-1 bg-transparent text-[15px] focus:outline-none"
                    style={{ color: '#f5f0e1' }}
                    disabled={isTyping}
                  />
                  <button
                    type="submit"
                    disabled={isTyping || !chatInput.trim()}
                    className="p-2 rounded-full transition-all disabled:opacity-30"
                    style={{ background: '#F5C042', color: '#1a1a1a' }}
                    onMouseEnter={(e) => { if (!isTyping && chatInput.trim()) { e.currentTarget.style.background = '#FFD060'; e.currentTarget.style.boxShadow = '0 0 15px rgba(245, 192, 66, 0.3)'; }}}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#F5C042'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-xl">
              <div className="rounded-xl p-6" style={{ background: '#1e1e1e', border: '1px solid #333333' }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[18px] font-semibold uppercase" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>Supplier Profile</h2>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-4 py-2 text-[14px] font-semibold rounded-full transition-all uppercase tracking-wide"
                      style={{ background: '#F5C042', color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FFD060'; e.currentTarget.style.boxShadow = '0 0 15px rgba(245, 192, 66, 0.3)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#F5C042'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="block text-[14px] font-medium mb-2" style={{ color: '#b8b8b8' }}>Business Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full px-4 py-3 text-[15px] rounded-lg transition-all"
                        style={{ background: '#141414', border: '1px solid #333333', color: '#f5f0e1', outline: 'none' }}
                        onFocus={(e) => { e.target.style.borderColor = '#F5C042'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 192, 66, 0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.boxShadow = 'none'; }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-medium mb-2" style={{ color: '#b8b8b8' }}>Website URL</label>
                      <input
                        type="url"
                        value={profileData.website_url}
                        onChange={(e) => setProfileData({ ...profileData, website_url: e.target.value })}
                        className="w-full px-4 py-3 text-[15px] rounded-lg transition-all"
                        style={{ background: '#141414', border: '1px solid #333333', color: '#f5f0e1', outline: 'none' }}
                        onFocus={(e) => { e.target.style.borderColor = '#F5C042'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 192, 66, 0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.boxShadow = 'none'; }}
                        placeholder="https://www.example.com"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-3 text-[15px] font-semibold rounded-full transition-all uppercase tracking-wide"
                        style={{ background: '#F5C042', color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FFD060'; e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 192, 66, 0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#F5C042'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileData({ name: supplier?.name || '', website_url: supplier?.website_url || '' });
                        }}
                        className="px-6 py-3 text-[15px] font-semibold rounded-full transition-all uppercase tracking-wide"
                        style={{ background: 'transparent', color: '#f5f0e1', border: '1px solid #333333', fontFamily: 'var(--font-space-grotesk)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#252525'; e.currentTarget.style.borderColor = '#F5C042'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#333333'; }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[13px] mb-1" style={{ color: '#777777' }}>Business Name</p>
                      <p className="text-[15px] font-medium" style={{ color: '#f5f0e1' }}>{supplier?.name || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-[13px] mb-1" style={{ color: '#777777' }}>Website</p>
                      {supplier?.website_url ? (
                        <a href={supplier.website_url} target="_blank" rel="noopener noreferrer" className="text-[15px]" style={{ color: '#F5C042' }}>
                          {supplier.website_url}
                        </a>
                      ) : (
                        <p className="text-[15px]" style={{ color: '#777777' }}>Not set</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[13px] mb-1" style={{ color: '#777777' }}>Email</p>
                      <p className="text-[15px]" style={{ color: '#f5f0e1' }}>{supplier?.email || userEmail || 'Not set'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
