import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Plus, Trash2, Edit3, X, HelpCircle, Check, AlertCircle, Video, MessageSquare, Truck, Eye, ShoppingBag } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import LocalChatModal from '../components/LocalChatModal';
import { getProductStock, isOutOfStock, formatStatus, statusBadgeClass, isUserOnline } from '../utils/marketplaceStore';

export default function FarmerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);
  const [stockToast, setStockToast] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Create Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    commodity: 'Vegetables',
    unit: 'kg',
    price_per_unit: '',
    quantity: '',
    delivery_time_manual: '',
    delivery_time_varies: false,
  });
  const [imageFiles, setImageFiles] = useState([null, null, null]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Calculator State
  const [calcData, setCalcData] = useState({
    productId: '',
    quantity: '',
    customPrice: '',
    customUnit: 'kg',
  });
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchAllProducts();
    fetchOrders();
    fetchChats();
  }, []);

  useEffect(() => {
    if (stockToast) {
      const t = setTimeout(() => setStockToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [stockToast]);

  const fetchChats = async () => {
    try {
      const response = await api.get('messages/chats/');
      setChats(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('products/?my_listings=true');
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await api.get('products/');
      setAllProducts(response.data);
    } catch (err) {
      console.error('Failed to fetch all products', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('orders/');
      setOrders(response.data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleFileChange = (index, e) => {
    const file = e.target.files[0];
    const newFiles = [...imageFiles];
    newFiles[index] = file;
    setImageFiles(newFiles);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      commodity: 'Vegetables',
      unit: 'kg',
      price_per_unit: '',
      quantity: '',
      delivery_time_manual: '',
      delivery_time_varies: false,
    });
    setImageFiles([null, null, null]);
    setEditingProduct(null);
    setFormError('');
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      commodity: product.commodity || 'Vegetables',
      unit: product.unit,
      price_per_unit: product.price_per_unit,
      quantity: product.quantity,
      delivery_time_manual: product.delivery_time_manual || '',
      delivery_time_varies: product.delivery_time_varies,
    });
    setShowCreateModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    if (!formData.delivery_time_varies && !formData.delivery_time_manual) {
      setFormError('Please specify delivery days or choose "Varies".');
      setFormLoading(false);
      return;
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('commodity', formData.commodity);
    data.append('unit', formData.unit);
    data.append('price_per_unit', formData.price_per_unit);
    data.append('quantity', formData.quantity);
    data.append('delivery_time_varies', formData.delivery_time_varies);
    if (!formData.delivery_time_varies) {
      data.append('delivery_time_manual', formData.delivery_time_manual);
    }

    imageFiles.forEach((file, idx) => {
      if (file) {
        data.append(`image${idx + 1}`, file);
      }
    });

    try {
      if (editingProduct) {
        await api.patch(`products/${editingProduct.id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('products/', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      resetForm();
      setShowCreateModal(false);
      fetchProducts();
      fetchAllProducts();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save listing.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await api.delete(`products/${id}/`);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to delete product.');
    }
  };

  const handleMakeDelivery = async (order) => {
    try {
      await api.patch(`orders/${order.id}/`, { status: 'delivery_in_progress' });
      const updated = await api.get('products/?my_listings=true');
      setProducts(updated.data);
      fetchAllProducts();
      const product = updated.data.find((p) => p.id === order.product);
      if (product && getProductStock(product) <= 0) {
        setStockToast(`Product "${order.product_title}" is now out of stock`);
      }
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start delivery');
    }
  };

  const handleMarkDelivered = async (orderId) => {
    try {
      await api.patch(`orders/${orderId}/`, { status: 'delivered' });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update order status');
    }
  };

  const handleCallBuyer = (order) => {
    if (!isUserOnline(order.buyer)) {
      alert('User offline — the buyer is not currently online.');
      return;
    }
    window.dispatchEvent(new CustomEvent('initiate-call', {
      detail: {
        userId: order.buyer,
        userName: order.buyer_name,
        userAvatar: '👤',
      },
    }));
  };

  const renderStockBadge = (product) => {
    if (!isOutOfStock(product)) return null;
    return (
      <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-bold uppercase">
        Out of Stock
      </span>
    );
  };

  const renderProductCard = (product, isOwn) => (
    <div key={product.id} className="bg-white border border-primary/10 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
      <div>
        {product.images?.length > 0 ? (
          <img src={product.images[0]} alt={product.title} className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-40 bg-primary-accent flex items-center justify-center text-primary-light">
            <ShoppingBag size={36} />
          </div>
        )}
        <div className="p-4">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-gray-900 text-lg leading-tight">{product.title}</h3>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">{product.commodity}</span>
              {renderStockBadge(product)}
            </div>
          </div>
          {!isOwn && (
            <p className="text-xs text-gray-500 mt-1">Seller: {product.farmer_name}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Stock: {getProductStock(product)} {product.unit}</p>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-lg font-black text-primary">KES {product.price_per_unit}</span>
            <span className="text-xs text-gray-500">/ {product.unit}</span>
          </div>
        </div>
      </div>
      <div className="p-4 pt-0 flex gap-2">
        {isOwn ? (
          <>
            <button
              onClick={() => handleOpenEdit(product)}
              className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 flex items-center justify-center gap-1"
            >
              <Edit3 size={14} />
              Edit
            </button>
            <button
              onClick={() => handleDeleteProduct(product.id)}
              className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-100"
            >
              <Trash2 size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setViewProduct(product)}
            className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
          >
            <Eye size={14} />
            View Details
          </button>
        )}
      </div>
    </div>
  );

  // Calculator Handler
  const handleCalcSubmit = (e) => {
    e.preventDefault();
    if (!calcData.productId && !calcData.customPrice) {
      alert('Please select a product or enter a custom price.');
      return;
    }

    let price = 0;
    let unit = calcData.customUnit;
    let name = 'Custom Commodity';

    if (calcData.productId) {
      const selectedProd = products.find(p => p.id === parseInt(calcData.productId));
      if (selectedProd) {
        price = parseFloat(selectedProd.price_per_unit);
        unit = selectedProd.unit;
        name = selectedProd.title;
      }
    } else {
      price = parseFloat(calcData.customPrice);
    }

    const qty = parseFloat(calcData.quantity);
    const earnings = price * qty;
    
    setCalcResult({
      name,
      price,
      quantity: qty,
      unit,
      earnings: earnings.toFixed(2),
    });
  };

  const activeOrders = orders.filter(o => o.status !== 'completed');
  const pastOrders = orders.filter(o => o.status === 'completed');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header and Add button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Farmer Dashboard</h1>
          <p className="text-xs text-gray-500">Manage your farm listings and track your sales</p>
        </div>
        
        {activeTab === 'my-products' && (
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="flex items-center space-x-1 bg-primary hover:bg-primary-light text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary/20 transition duration-200"
          >
            <Plus size={16} />
            <span>List Product</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { id: 'orders', label: `Orders (${orders.length})` },
          { id: 'my-products', label: 'My Products' },
          { id: 'all-products', label: 'All Products' },
          { id: 'chats', label: `Inbox (${chats.length})` },
          { id: 'calculator', label: 'Calculator' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 sm:flex-initial py-3 px-4 text-sm font-semibold border-b-2 transition duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {stockToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-orange-50 border border-orange-200 text-orange-800 text-sm font-semibold px-4 py-3 rounded-xl shadow-lg">
          {stockToast}
        </div>
      )}

      {activeTab === 'my-products' && (
        <div>
          {products.length === 0 ? (
            <div className="text-center py-12 bg-white border border-primary/10 rounded-2xl p-6">
              <p className="text-gray-500 text-sm mb-4">You don&apos;t have any active listings yet.</p>
              <button
                onClick={() => { resetForm(); setShowCreateModal(true); }}
                className="bg-primary/10 text-primary font-bold text-xs py-2 px-4 rounded-xl hover:bg-primary/20 transition"
              >
                Create your first listing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product) => renderProductCard(product, true))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'all-products' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {allProducts.map((product) => renderProductCard(product, product.farmer === currentUser.uid))}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Active Orders */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Active Sales</h2>
            {activeOrders.length === 0 ? (
              <div className="bg-white border border-primary/10 rounded-2xl p-6 text-center text-sm text-gray-500">
                No active orders at this time.
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map((order) => (
                  <div key={order.id} className="bg-white border border-primary/10 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-3">
                      <UserAvatar userId={order.buyer} name={order.buyer_name} size="md" />
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">Order #{order.id}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusBadgeClass(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-800 text-base mt-1">{order.product_title}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Buyer: <span className="font-medium text-gray-700">{order.buyer_name}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Qty: {order.quantity} {order.product_unit} | Total: <span className="font-semibold text-primary">KES {order.total_price}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setChatPartner({ uid: order.buyer, full_name: order.buyer_name })}
                        className="py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 flex items-center gap-1"
                        title="Chat with buyer"
                      >
                        <MessageSquare size={14} />
                        <span className="hidden md:inline">Chat</span>
                      </button>
                      <button
                        onClick={() => handleCallBuyer(order)}
                        className="py-2 px-3 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-xl border border-green-200 flex items-center gap-1"
                        title={`Call ${order.buyer_name}`}
                      >
                        <Video size={14} />
                        <span className="hidden md:inline">Call</span>
                      </button>
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleMakeDelivery(order)}
                          className="flex items-center gap-1 py-2 px-4 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-light shadow-md shadow-primary/10"
                        >
                          <Truck size={14} />
                          Make Delivery
                        </button>
                      )}
                      {order.status === 'delivery_in_progress' && (
                        <button
                          onClick={() => handleMarkDelivered(order.id)}
                          className="flex items-center gap-1 py-2 px-4 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700"
                        >
                          <Check size={14} />
                          Mark Delivered
                        </button>
                      )}
                      {order.status === 'disputed' && (
                        <button
                          onClick={() => handleMarkDelivered(order.id)}
                          className="flex items-center gap-1 py-2 px-4 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700"
                        >
                          <Check size={14} />
                          Resolve (Mark Delivered)
                        </button>
                      )}
                      {order.status === 'delivered' && (
                        <span className="text-xs text-blue-600 font-semibold bg-blue-50 border border-blue-100 py-1.5 px-3 rounded-lg">
                          Awaiting buyer confirmation
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Orders */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Past Orders (Completed)</h2>
            {pastOrders.length === 0 ? (
              <div className="bg-white border border-primary/10 rounded-2xl p-6 text-center text-sm text-gray-500">
                No completed orders yet.
              </div>
            ) : (
              <div className="bg-white border border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Buyer</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pastOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3.5 text-xs text-gray-600">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-medium text-gray-800">
                            {order.buyer_name}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-700">
                            {order.product_title}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-600">
                            {order.quantity} {order.product_unit}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-bold text-primary">
                            KES {order.total_price}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHATS TAB */}
      {activeTab === 'chats' && (
        <div>
          {chats.length === 0 ? (
            <div className="bg-white border border-primary/10 rounded-2xl p-12 text-center text-sm text-gray-500">
              No active conversations yet.
            </div>
          ) : (
            <div className="bg-white border border-primary/10 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
              {chats.map((chat) => (
                <div
                  key={chat.partner.uid}
                  onClick={() => navigate(`/chat/${chat.partner.uid}`)}
                  className="p-4 hover:bg-gray-50/50 cursor-pointer flex items-center justify-between transition duration-150"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                      {chat.partner.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline space-x-2">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{chat.partner.full_name}</h4>
                        <span className="text-[9px] text-gray-400 font-medium capitalize">({chat.partner.role})</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{chat.last_message.message}</p>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end shrink-0">
                    <span className="text-[10px] text-gray-400">
                      {new Date(chat.last_message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {!chat.last_message.is_read && chat.last_message.receiver === JSON.parse(localStorage.getItem('user')).uid && (
                      <span className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5 animate-pulse" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CALCULATOR TAB */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white border border-primary/10 p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Earnings Estimator</h2>
            <form onSubmit={handleCalcSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Select Commodity</label>
                <select
                  value={calcData.productId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCalcData({
                      ...calcData,
                      productId: val,
                      // Reset custom input fields if a product is selected
                      customPrice: val ? '' : calcData.customPrice,
                    });
                  }}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm bg-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                  <option value="">-- Use Custom Price --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (KES {p.price_per_unit}/{p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {!calcData.productId && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit Price (KES)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={calcData.customPrice}
                      onChange={(e) => setCalcData({ ...calcData, customPrice: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</label>
                    <select
                      value={calcData.customUnit}
                      onChange={(e) => setCalcData({ ...calcData, customUnit: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm bg-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    >
                      <option value="kg">kg</option>
                      <option value="sack">sack</option>
                      <option value="piece">piece</option>
                      <option value="bunch">bunch</option>
                      <option value="litre">litre</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Estimated Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={calcData.quantity}
                  onChange={(e) => setCalcData({ ...calcData, quantity: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="e.g. 50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary-light transition shadow-lg shadow-primary/20 text-sm"
              >
                Calculate Earnings
              </button>
            </form>
          </div>

          {/* Result */}
          <div className="bg-primary-accent border border-primary/15 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
            {calcResult ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Estimated Profit</h3>
                <span className="block text-4xl font-black text-primary mt-2">KES {calcResult.earnings}</span>
                
                <div className="mt-6 text-sm text-gray-600 space-y-1 bg-white/50 py-3 px-6 rounded-xl border border-primary/5 inline-block">
                  <p>Commodity: <span className="font-bold text-gray-800">{calcResult.name}</span></p>
                  <p>Calculation: <span className="font-medium text-gray-800">{calcResult.quantity} {calcResult.unit} × KES {calcResult.price}</span></p>
                </div>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 text-primary mx-auto shadow-sm">
                  <HelpCircle size={28} />
                </div>
                <h3 className="font-bold text-gray-700">Calculate Estimated Revenue</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Fill in the commodity quantity and pricing details to see your potential earnings instantly.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {viewProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setViewProduct(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-primary/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-gray-900">{viewProduct.title}</h2>
              <button onClick={() => setViewProduct(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {viewProduct.images?.[0] && (
              <img src={viewProduct.images[0]} alt={viewProduct.title} className="w-full h-44 object-cover rounded-xl mb-4" />
            )}
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Seller:</strong> {viewProduct.farmer_name}</p>
              <p><strong>Category:</strong> {viewProduct.commodity}</p>
              <p><strong>Price:</strong> KES {viewProduct.price_per_unit} / {viewProduct.unit}</p>
              <p><strong>Stock:</strong> {getProductStock(viewProduct)} {viewProduct.unit}</p>
              <p><strong>Delivery:</strong> {viewProduct.delivery_time_varies ? 'Varies' : `${viewProduct.delivery_time_manual} days`}</p>
            </div>
          </div>
        </div>
      )}

      {chatPartner && (
        <LocalChatModal
          partner={chatPartner}
          currentUserId={currentUser.uid}
          onClose={() => setChatPartner(null)}
        />
      )}

      {/* CREATE/EDIT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-primary/10 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingProduct ? 'Edit Listing' : 'List New Product'}
              </h2>
              <button onClick={() => { resetForm(); setShowCreateModal(false); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Product Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Product Name</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="e.g. Potatoes, Sweet Cabbage"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Commodity Category</label>
                  <select
                    name="commodity"
                    value={formData.commodity}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm bg-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  >
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Grains">Grains</option>
                    <option value="Tubers">Tubers</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm bg-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  >
                    <option value="kg">kg</option>
                    <option value="sack">sack</option>
                    <option value="piece">piece</option>
                    <option value="bunch">bunch</option>
                    <option value="litre">litre</option>
                  </select>
                </div>
              </div>

              {/* Price & Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Price per Unit (KES)</label>
                  <input
                    type="number"
                    name="price_per_unit"
                    required
                    min="1"
                    value={formData.price_per_unit}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="e.g. 100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Stock Available</label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="e.g. 25"
                  />
                </div>
              </div>

              {/* Delivery Time */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Delivery Time</label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="number"
                      name="delivery_time_manual"
                      disabled={formData.delivery_time_varies}
                      value={formData.delivery_time_manual}
                      onChange={handleInputChange}
                      placeholder="Usually X days"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                  <label className="flex items-center space-x-2 text-sm text-gray-700 font-medium">
                    <input
                      type="checkbox"
                      name="delivery_time_varies"
                      checked={formData.delivery_time_varies}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span>Varies</span>
                  </label>
                </div>
              </div>

              {/* Images upload (1-3) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Upload Images (1-3)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="relative border border-dashed border-gray-300 rounded-xl p-2 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center text-center cursor-pointer min-h-[90px]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(idx, e)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {imageFiles[idx] ? (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <span className="text-[10px] text-gray-700 truncate max-w-full font-medium">{imageFiles[idx].name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newFiles = [...imageFiles];
                              newFiles[idx] = null;
                              setImageFiles(newFiles);
                            }}
                            className="mt-1 text-[10px] text-red-600 font-bold hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                          <Plus size={20} />
                          <span className="text-[9px] mt-1">Image {idx + 1}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary-light transition shadow-lg shadow-primary/20 text-sm"
                >
                  {formLoading ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
