'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import SupplierMessage from '@/app/components/SupplierMessage';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function SupplierDashboard() {
  const router = useRouter();
  const { user, userType, internalUserId, loading: authLoading, isAuthenticated, logout } = useAuth();
  
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
        
        // If supplier hasn't completed onboarding, redirect
        if (!supplierData.name) {
          router.replace('/supplier/onboarding');
          return;
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

  // Check authentication
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !internalUserId || userType !== 'supplier') {
      router.replace('/login');
      return;
    }

    loadSupplierData(internalUserId);
  }, [router, authLoading, isAuthenticated, userType, internalUserId, loadSupplierData]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/suppliers/${internalUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setIsEditingProfile(false);
        loadSupplierData(internalUserId);
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

    if (!internalUserId) return;

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        image_url: formData.image_url,
        supplier_id: internalUserId
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
          loadSupplierData(internalUserId);
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
          loadSupplierData(internalUserId);
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

    if (!internalUserId) return;

    try {
      const response = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Product deleted successfully!');
        loadSupplierData(internalUserId);
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

    if (!internalUserId) return;

    try {
      const response = await fetch(`${API_URL}/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: newStock })
      });

      if (response.ok) {
        setSuccess('Stock updated!');
        loadSupplierData(internalUserId);
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
    if (!chatInput.trim() || isTyping || !internalUserId) return;

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
          supplierId: internalUserId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Reload products if action was successful
      if (data.action && data.action.success) {
        setTimeout(() => loadSupplierData(internalUserId), 500);
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

  if (loading) {
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
      <header className="bg-white border-b border-(--border) flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-(--primary)">{supplier?.name || 'Supplier'}</h1>
              <p className="text-sm text-(--text-secondary)">{products.length} products • {orders.length} orders</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                activeTab === 'products'
                  ? 'bg-(--primary) text-white'
                  : 'bg-(--background) text-(--text-secondary) hover:bg-gray-200'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                activeTab === 'orders'
                  ? 'bg-(--primary) text-white'
                  : 'bg-(--background) text-(--text-secondary) hover:bg-gray-200'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                activeTab === 'chat'
                  ? 'bg-(--primary) text-white'
                  : 'bg-(--background) text-(--text-secondary) hover:bg-gray-200'
              }`}
            >
              Chat Assistant
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-(--primary) text-white'
                  : 'bg-(--background) text-(--text-secondary) hover:bg-gray-200'
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <main className="max-w-7xl mx-auto w-full px-4 py-4">
          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-4">
              {success}
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <>
              {/* Add/Edit Product Form */}
              {isAddingProduct ? (
                <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                  <h2 className="text-xl font-bold mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="px-4 py-2 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="px-4 py-2 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price (€)"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="px-4 py-2 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Stock Quantity"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="px-4 py-2 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
                    required
                  />
                </div>

                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
                  rows="3"
                  required
                />

                <input
                  type="url"
                  placeholder="Image URL"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-2 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
                />

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-(--primary) hover:bg-(--primary-light) text-white font-medium py-2 rounded-lg transition-colors"
                  >
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-(--border) hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingProduct(true)}
              className="mb-6 px-6 py-3 bg-(--primary) hover:bg-(--primary-light) text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Product
            </button>
          )}

          {/* Products List */}
          <div className="space-y-4 pb-8">
            {products.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                <svg className="w-16 h-16 text-(--text-secondary) opacity-50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">No Products Yet</h3>
                <p className="text-(--text-secondary)">Add your first product to get started</p>
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="bg-white rounded-xl p-6 shadow-sm border border-(--border) hover:shadow-md transition-shadow">
                  <div className="flex gap-6 items-start">
                    {/* Product Image */}
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-24 h-24 rounded-lg bg-(--background) flex items-center justify-center text-3xl flex-shrink-0 hidden"
                      style={!product.image_url ? { display: 'flex' } : {}}
                    >
                      🍰
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold mb-1">{product.name}</h3>
                      <p className="text-sm text-(--text-secondary) mb-2">{product.category}</p>
                      <p className="text-sm mb-3 line-clamp-2">{product.description}</p>
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="text-lg font-bold text-(--primary)">€{parseFloat(product.price).toFixed(2)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-(--text-secondary) font-medium">Stock: <span className="font-bold text-(--primary)">{product.stock_quantity}</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(product)}
                        className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
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
                <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                  <svg className="w-16 h-16 text-(--text-secondary) opacity-50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
                  <p className="text-(--text-secondary)">Orders containing your products will appear here</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl p-6 shadow-sm border border-(--border)">
                    {/* Order Header */}
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-(--border)">
                      <div>
                        <p className="text-sm text-(--text-secondary)">Order ID</p>
                        <p className="font-mono text-sm">{order.id}</p>
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
                      <div className="text-right">
                        <p className="text-sm text-(--text-secondary)">Order Total</p>
                        <p className="text-2xl font-bold text-(--primary)">€{parseFloat(order.total_amount || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Order Items (only supplier's items) */}
                    <div className="space-y-3">
                      <p className="text-sm font-semibold">Your Items ({order.order_items?.length || 0})</p>
                      {order.order_items?.map((item, index) => (
                        <div key={index} className="flex gap-4 items-start">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-16 h-16 rounded-lg object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="w-16 h-16 rounded-lg bg-(--background) flex items-center justify-center text-2xl hidden"
                            style={!item.image_url ? { display: 'flex' } : {}}
                          >
                            🍰
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-(--text-secondary)">Quantity: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">€{parseFloat(item.price).toFixed(2)}</p>
                            <p className="text-xs text-(--text-secondary)">each</p>
                            <p className="text-sm font-bold text-(--primary) mt-1">
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
            <div className="h-[calc(100vh-200px)] flex flex-col bg-white rounded-xl border border-(--border)">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              <form onSubmit={handleChatSend} className="p-4 border-t border-(--border)">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about your products..."
                      className="w-full px-4 py-2 pr-12 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
                      disabled={isTyping}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isTyping || !chatInput.trim()}
                    className="px-6 py-2 bg-(--primary) hover:bg-(--primary-light) text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Supplier Profile</h2>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-4 py-2 bg-(--primary) hover:bg-(--primary-light) text-white font-medium rounded-lg transition-colors"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Business Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Website URL</label>
                      <input
                        type="url"
                        value={profileData.website_url}
                        onChange={(e) => setProfileData({ ...profileData, website_url: e.target.value })}
                        className="w-full px-4 py-3 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
                        placeholder="https://www.example.com"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-(--primary) hover:bg-(--primary-light) text-white font-medium rounded-lg transition-colors"
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
                        className="px-6 py-3 border-2 border-(--border) hover:border-(--primary) text-(--primary) font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-(--text-secondary) mb-1">Business Name</p>
                      <p className="text-lg font-semibold">{supplier?.name || 'Not set'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-(--text-secondary) mb-1">Website</p>
                      {supplier?.website_url ? (
                        <a
                          href={supplier.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-(--primary) hover:underline"
                        >
                          {supplier.website_url}
                        </a>
                      ) : (
                        <p className="text-(--text-secondary)">Not set</p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-(--text-secondary) mb-1">Email</p>
                      <p className="text-lg">{supplier?.email || 'Not set'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-(--text-secondary) mb-1">Supplier ID</p>
                      <p className="font-mono text-sm">{internalUserId}</p>
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