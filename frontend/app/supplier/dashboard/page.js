'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getNeonAuthClient } from '@/lib/neonAuthClient';
import SupplierMessage from '@/app/components/SupplierMessage';
import LogoutButton from '@/app/components/LogoutButton';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function SupplierDashboard() {
  const router = useRouter();
  const neonClient = getNeonAuthClient();
  
  const [userEmail, setUserEmail] = useState(null);
  const [supplierId, setSupplierId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
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

  // Chat interface state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Form state
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
      // Get supplier info
      const supplierRes = await fetch(`${API_URL}/api/suppliers/${supplierId}`);
      if (supplierRes.ok) {
        const supplierData = await supplierRes.json();
        
        // If supplier hasn't completed onboarding, flag UI instead of redirect loop
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

      // Get supplier's products
      const productsRes = await fetch(`${API_URL}/api/products?supplier_id=${supplierId}&limit=100`);
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
      }

      // Get supplier's orders
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
  }, [router]);

  // Check authentication with Neon Auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const sessionResponse = await neonClient.getSession();
        
        if (sessionResponse?.data?.user?.email) {
          const email = sessionResponse.data.user.email;
          setUserEmail(email);
          
          // Get supplier ID from email
          const response = await fetch(
            `${API_URL}/api/suppliers/check-email/${encodeURIComponent(email)}`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            if (!data.exists) {
              router.replace('/auth/callback');
              return;
            }

            // Supplier exists
            setSupplierId(data.supplier_id);
            setAuthLoading(false);
            loadSupplierData(data.supplier_id);

          } else {
            console.error('Failed to check supplier status');
            router.replace('/login');
          }
        } else {
          router.replace('/login');
        }
      } catch (err) {
        console.error('Auth check error:', err);
        router.replace('/login');
      }
    };
    
    checkAuth();
  }, [router, loadSupplierData]);

  // const handleLogout = async () => {
  //   try {
  //     await neonClient.signOut();
  //     router.push('/login');
  //   } catch (err) {
  //     console.error('Logout error:', err);
  //     router.push('/login');
  //   }
  // };

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
        // Update product
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
        // Add new product
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
    if (!window.confirm('Edit this product?')) return;
    
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

  const handleStockUpdate = async (productId, currentStock, newStock) => {
    if (newStock === currentStock) return; // No change
    
    if (!window.confirm(`Are you sure you want to change stock from ${currentStock} to ${newStock}?`)) {
      return;
    }

    if (!supplierId) return;

    try {
      const response = await fetch(`${API_URL}/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: newStock })
      });

      if (response.ok) {
        setSuccess('Stock updated!');
        loadSupplierData(supplierId);
      } else {
        setError('Failed to update stock');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  // Chat handler
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
      
      // Reload products if action was successful
      if (data.action && data.action.success) {
        setTimeout(() => loadSupplierData(supplierId), 500);
      }
      
      setChatMessages(prev => [...prev, {
        text: data.response,
        isUser: false,
        products: data.products,
        action: data.action
      }]);
        // ...existing code...
    } catch (error) {
      setChatMessages(prev => [...prev, {
        text: `Sorry, I'm having trouble: ${error.message}`,
        isUser: false
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  if (loading || authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-(--background)">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-(--text-secondary)">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-(--background) flex flex-col">
      {/* Header */}
      <header className="bg-(--bg-card)/80 backdrop-blur-xl border-b border-(--border) shrink-0 sticky top-0 z-50 shadow-lg shadow-(--primary)/5">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <img 
                src="/logo.svg" 
                alt="Plexaris" 
                className="h-8 sm:h-10 lg:h-12 w-auto"
              />
              <div className="min-w-0 flex-1 sm:flex-none">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-(--text) truncate">{supplier?.name || 'Supplier'}</h1>
                <p className="text-xs sm:text-sm text-(--text-secondary)">{products.length} products • {orders.length} orders</p>
              </div>
            </div>
            <div className="w-full sm:w-auto flex justify-end">
              <LogoutButton />
            </div>
          </div>

          {/* Tabs - Mobile optimized */}
          <div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 pb-1">
            {[
              { id: 'products', label: 'Products', icon: '📦' },
              { id: 'orders', label: 'Orders', icon: '📋' },
              { id: 'chat', label: 'Chat', icon: '💬' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-(--primary) to-(--accent) text-white shadow-lg shadow-(--primary)/30'
                    : 'bg-(--bg-secondary)/60 backdrop-blur-sm text-(--text-secondary) hover:bg-(--bg-secondary) hover:text-(--text) border border-(--border)'
                }`}
              >
                <span className="hidden sm:inline mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <main className="max-w-7xl mx-auto w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          {needsOnboarding && (
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-xl border border-yellow-400/30 text-yellow-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 animate-fade-up">
              <div className="flex-1">
                <p className="font-semibold text-base sm:text-lg mb-1">Complete your profile</p>
                <p className="text-sm text-yellow-300/80">Finish onboarding so buyers see your business name.</p>
              </div>
              <button
                onClick={goToOnboarding}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-(--primary) to-(--accent) hover:from-(--primary-light) hover:to-(--accent-light) text-white rounded-lg text-sm sm:text-base font-semibold transition-all shadow-lg shadow-(--primary)/30 hover:shadow-(--primary)/50 hover:scale-105 whitespace-nowrap"
              >
                Continue onboarding
              </button>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 text-red-300 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6 animate-fade-up flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1">{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 backdrop-blur-xl border border-green-500/30 text-green-300 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6 animate-fade-up flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1">{success}</span>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <>
              {/* Add/Edit Product Form */}
              {isAddingProduct ? (
                <div className="bg-(--bg-card)/80 backdrop-blur-xl border border-(--border) rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 shadow-lg shadow-(--primary)/5 animate-fade-up">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6 text-(--text) uppercase tracking-[0.08em]">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="px-4 py-3 bg-(--bg-secondary)/60 backdrop-blur-sm border border-(--border) rounded-xl focus:outline-none focus:ring-2 focus:ring-(--primary)/50 focus:border-(--primary) text-(--text) placeholder-(--text-secondary) transition-all text-sm sm:text-base"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="px-4 py-3 bg-(--bg-secondary)/60 backdrop-blur-sm border border-(--border) rounded-xl focus:outline-none focus:ring-2 focus:ring-(--primary)/50 focus:border-(--primary) text-(--text) placeholder-(--text-secondary) transition-all text-sm sm:text-base"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price (€)"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="px-4 py-3 bg-(--bg-secondary)/60 backdrop-blur-sm border border-(--border) rounded-xl focus:outline-none focus:ring-2 focus:ring-(--primary)/50 focus:border-(--primary) text-(--text) placeholder-(--text-secondary) transition-all text-sm sm:text-base"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Stock Quantity"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="px-4 py-3 bg-(--bg-secondary)/60 backdrop-blur-sm border border-(--border) rounded-xl focus:outline-none focus:ring-2 focus:ring-(--primary)/50 focus:border-(--primary) text-(--text) placeholder-(--text-secondary) transition-all text-sm sm:text-base"
                    required
                  />
                </div>

                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-(--bg-secondary)/60 backdrop-blur-sm border border-(--border) rounded-xl focus:outline-none focus:ring-2 focus:ring-(--primary)/50 focus:border-(--primary) text-(--text) placeholder-(--text-secondary) transition-all text-sm sm:text-base resize-none"
                  rows="3"
                  required
                />

                <input
                  type="url"
                  placeholder="Image URL"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-3 bg-(--bg-secondary)/60 backdrop-blur-sm border border-(--border) rounded-xl focus:outline-none focus:ring-2 focus:ring-(--primary)/50 focus:border-(--primary) text-(--text) placeholder-(--text-secondary) transition-all text-sm sm:text-base"
                />

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-(--primary) to-(--accent) hover:from-(--primary-light) hover:to-(--accent-light) text-white font-semibold py-3 sm:py-3.5 rounded-xl transition-all shadow-lg shadow-(--primary)/30 hover:shadow-(--primary)/50 hover:scale-[1.02] text-sm sm:text-base tracking-[0.08em] uppercase"
                  >
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 sm:flex-none px-6 bg-(--bg-secondary)/60 backdrop-blur-sm border border-(--border) hover:border-(--primary)/50 text-(--text) font-medium py-3 sm:py-3.5 rounded-xl transition-all text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingProduct(true)}
              className="mb-4 sm:mb-6 px-4 sm:px-6 py-3 bg-gradient-to-r from-(--primary) to-(--accent) hover:from-(--primary-light) hover:to-(--accent-light) text-white font-semibold rounded-xl transition-all shadow-lg shadow-(--primary)/30 hover:shadow-(--primary)/50 hover:scale-[1.02] flex items-center justify-center gap-2 text-sm sm:text-base tracking-[0.08em] uppercase w-full sm:w-auto animate-fade-up"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Product
            </button>
          )}

          {/* Products List */}
          <div className="space-y-3 sm:space-y-4 pb-8">
            {products.length === 0 ? (
              <div className="bg-(--bg-card)/80 backdrop-blur-xl border border-(--border) rounded-2xl p-8 sm:p-12 text-center shadow-lg shadow-(--primary)/5 animate-fade-up">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-(--text-secondary) opacity-50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-base sm:text-lg font-semibold mb-2 text-(--text)">No Products Yet</h3>
                <p className="text-sm sm:text-base text-(--text-secondary)">Add your first product to get started</p>
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="bg-(--bg-card)/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-(--border) hover:border-(--primary)/50 hover:shadow-lg hover:shadow-(--primary)/20 transition-all group animate-fade-up">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                    {/* Product Image */}
                    <div className="w-full sm:w-24 h-48 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-(--bg-secondary)/50 border border-(--border)">
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
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                      <div
                        className="w-full h-full flex items-center justify-center text-4xl sm:text-3xl hidden"
                        style={!product.image_url ? { display: 'flex' } : {}}
                      >
                        🍰
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <h3 className="text-base sm:text-lg font-semibold mb-1 text-(--text) truncate">{product.name}</h3>
                      <p className="text-xs sm:text-sm text-(--text-secondary) mb-2">{product.category}</p>
                      <p className="text-xs sm:text-sm mb-3 line-clamp-2 text-(--text-secondary)">{product.description}</p>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-(--primary) to-(--accent) bg-clip-text text-transparent">€{parseFloat(product.price).toFixed(2)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm text-(--text-secondary) font-medium">Stock: <span className="font-bold text-(--primary)">{product.stock_quantity}</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto sm:ml-4 shrink-0">
                      <button
                        onClick={() => handleEdit(product)}
                        className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-(--primary)/20 hover:bg-(--primary)/30 border border-(--primary)/30 text-(--primary) font-medium rounded-lg transition-all text-sm whitespace-nowrap touch-manipulation min-h-[44px] sm:min-h-auto"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-medium rounded-lg transition-all text-sm whitespace-nowrap touch-manipulation min-h-[44px] sm:min-h-auto"
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
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="bg-(--bg-card)/80 backdrop-blur-xl border border-(--border) rounded-2xl p-12 text-center shadow-lg shadow-(--primary)/5">
                  <svg className="w-16 h-16 text-(--text-secondary) opacity-50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
                  <p className="text-(--text-secondary)">Orders containing your products will appear here</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-(--bg-card)/80 backdrop-blur-xl rounded-2xl p-6 border border-(--border) hover:border-(--primary)/50 transition-all">
                    {/* Order Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 pb-4 border-b border-(--border)">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-(--text-secondary) mb-1">Customer Email</p>
                        <p className="text-sm sm:text-base font-medium break-all text-(--text)">
                          {order.user_email || 'Unknown'}
                        </p>
                        <p className="text-xs text-(--text-secondary) mt-1">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <p className="text-xs sm:text-sm text-(--text-secondary) mb-1">Order Total</p>
                        <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-(--primary) to-(--accent) bg-clip-text text-transparent">€{parseFloat(order.total_amount || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Order Items (only supplier's items) */}
                    <div className="space-y-3">
                      <p className="text-sm sm:text-base font-semibold text-(--text) uppercase tracking-[0.08em]">Your Items ({order.order_items?.length || 0})</p>
                      {order.order_items?.map((item, index) => (
                        <div key={index} className="flex gap-3 sm:gap-4 items-start p-3 bg-(--bg-secondary)/30 rounded-xl border border-(--border)/50">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-(--bg-secondary)/50 border border-(--border)">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                                crossOrigin="anonymous"
                                referrerPolicy="no-referrer"
                              />
                            ) : null}
                            <div
                              className="w-full h-full flex items-center justify-center text-2xl hidden"
                              style={!item.image_url ? { display: 'flex' } : {}}
                            >
                              🍰
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm sm:text-base text-(--text) truncate">{item.name}</p>
                            <p className="text-xs sm:text-sm text-(--text-secondary) mt-1">Quantity: {item.quantity}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-sm sm:text-base text-(--text)">€{parseFloat(item.price).toFixed(2)}</p>
                            <p className="text-xs text-(--text-secondary)">each</p>
                            <p className="text-sm sm:text-base font-bold bg-gradient-to-r from-(--primary) to-(--accent) bg-clip-text text-transparent mt-1">
                              €{(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </p>
                          </div>
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
            <div className="h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)] flex flex-col bg-(--bg-card)/80 backdrop-blur-xl rounded-2xl border border-(--border) shadow-lg shadow-(--primary)/5 animate-fade-up">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center text-(--text-secondary) py-8">
                    <p>Ask me to help manage your products!</p>
                    <p className="text-sm mt-2">Try: &quot;show me all products&quot; or &quot;set stock of [product] to 50&quot;</p>
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

              {/* Input */}
              <form onSubmit={handleChatSend} className="p-3 sm:p-4 border-t border-(--border) bg-(--bg-secondary)/60 backdrop-blur-xl rounded-b-2xl">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about your products..."
                      className="w-full px-4 py-3 pr-12 bg-(--bg-card)/70 text-(--text) placeholder-(--text-secondary) border border-(--border) rounded-xl focus:outline-none focus:ring-2 focus:ring-(--primary)/50 focus:border-(--primary) transition-all text-sm sm:text-base"
                      disabled={isTyping}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isTyping || !chatInput.trim()}
                    className="px-4 sm:px-6 py-3 bg-gradient-to-r from-(--primary) to-(--accent) hover:from-(--primary-light) hover:to-(--accent-light) text-white rounded-xl font-semibold tracking-[0.08em] uppercase transition-all shadow-lg shadow-(--primary)/20 disabled:opacity-50 disabled:shadow-none text-sm sm:text-base touch-manipulation min-w-[80px] sm:min-w-[100px]"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-(--bg-card)/80 backdrop-blur-xl border border-(--border) rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg shadow-(--primary)/5 animate-fade-up">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-(--text) uppercase tracking-[0.08em]">Supplier Profile</h2>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-(--primary) to-(--accent) hover:from-(--primary-light) hover:to-(--accent-light) text-white font-semibold rounded-lg transition-all shadow-lg shadow-(--primary)/30 hover:shadow-(--primary)/50 hover:scale-105 text-sm sm:text-base tracking-[0.08em] uppercase w-full sm:w-auto"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4 sm:space-y-6">
                    <div>
                      <label className="block text-sm sm:text-base font-medium mb-2 text-(--text)">Business Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-(--bg-secondary)/60 backdrop-blur-sm border border-(--border) rounded-xl focus:outline-none focus:ring-2 focus:ring-(--primary)/50 focus:border-(--primary) text-(--text) placeholder-(--text-secondary) transition-all text-sm sm:text-base"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm sm:text-base font-medium mb-2 text-(--text)">Website URL</label>
                      <input
                        type="url"
                        value={profileData.website_url}
                        onChange={(e) => setProfileData({ ...profileData, website_url: e.target.value })}
                        className="w-full px-4 py-3 bg-(--bg-secondary)/60 backdrop-blur-sm border border-(--border) rounded-xl focus:outline-none focus:ring-2 focus:ring-(--primary)/50 focus:border-(--primary) text-(--text) placeholder-(--text-secondary) transition-all text-sm sm:text-base"
                        placeholder="https://www.example.com"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-(--primary) to-(--accent) hover:from-(--primary-light) hover:to-(--accent-light) text-white font-semibold rounded-xl transition-all shadow-lg shadow-(--primary)/30 hover:shadow-(--primary)/50 hover:scale-105 text-sm sm:text-base tracking-[0.08em] uppercase"
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileData({
                            name: supplier?.name || '',
                            website_url: supplier?.website_url || ''
                          });
                        }}
                        className="flex-1 sm:flex-none px-6 py-3 border-2 border-(--border) hover:border-(--primary) text-(--text) font-medium rounded-xl transition-all text-sm sm:text-base"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <p className="text-xs sm:text-sm text-(--text-secondary) mb-1 uppercase tracking-[0.08em]">Business Name</p>
                      <p className="text-base sm:text-lg font-semibold text-(--text)">{supplier?.name || 'Not set'}</p>
                    </div>

                    <div>
                      <p className="text-xs sm:text-sm text-(--text-secondary) mb-1 uppercase tracking-[0.08em]">Website</p>
                      {supplier?.website_url ? (
                        <a
                          href={supplier.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-(--primary) hover:underline text-sm sm:text-base break-all"
                        >
                          {supplier.website_url}
                        </a>
                      ) : (
                        <p className="text-sm sm:text-base text-(--text-secondary)">Not set</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs sm:text-sm text-(--text-secondary) mb-1 uppercase tracking-[0.08em]">Email</p>
                      <p className="text-base sm:text-lg text-(--text) break-all">{supplier?.email || userEmail || 'Not set'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
