import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  Search, MapPin, Calendar, MessageSquare, ShoppingBag, X,
  CheckCircle, AlertTriangle, Clock, Video, Package, History,
  Truck, Star
} from 'lucide-react';
import OrderConfirmationPopup from '../components/OrderConfirmationPopup';

/* ─────────────────────────────────────────────────────────────
   localStorage helpers — purely front-end order history store
   ───────────────────────────────────────────────────────────── */
const LS_KEY = 'vuna_local_orders';

function getLocalOrders() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalOrder(order) {
  const existing = getLocalOrders();
  existing.unshift(order); // newest first
  localStorage.setItem(LS_KEY, JSON.stringify(existing));
}

export default function BuyerDashboard() {
  const navigate = useNavigate();
  // Tab options: marketplace | orders | local-history | chats
  const [activeTab, setActiveTab] = useState('marketplace');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  // Local order history (localStorage)
  const [localOrders, setLocalOrders] = useState(getLocalOrders());

  // Search/Filters State
  const [filters, setFilters] = useState({ city: '', commodity: '' });

  // ── Order Now Modal State ──────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState(null);
  // Pre-fill buyer name from localStorage profile
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [orderForm, setOrderForm] = useState({
    buyerName: currentUser.full_name || '',
    quantity: 1,
    shippingAddress: currentUser.city ? `${currentUser.city}, Kenya` : '',
    notes: ''
  });
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState('');

  // ── Success Toast State ────────────────────────────────────
  const [successToast, setSuccessToast] = useState(null); // { title, body }

  // Active Delivered Order for Confirmation Popup
  const [deliveredOrder, setDeliveredOrder] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchChats();
  }, [filters]);

  // Polling for delivered orders (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => { checkDeliveredOrders(); }, 10000);
    return () => clearInterval(interval);
  }, [orders]);

  // Auto-dismiss success toast after 5 seconds
  useEffect(() => {
    if (successToast) {
      const t = setTimeout(() => setSuccessToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [successToast]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.city) params.city = filters.city;
      if (filters.commodity) params.commodity = filters.commodity;
      const response = await api.get('products/', { params });
      setProducts(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('orders/');
      setOrders(response.data);
      const firstDelivered = response.data.find(o => o.status === 'delivered');
      if (firstDelivered) setDeliveredOrder(firstDelivered);
    } catch (err) {
      console.error(err);
    }
  };

  const checkDeliveredOrders = async () => {
    try {
      const response = await api.get('orders/');
      const updatedOrders = response.data;
      setOrders(updatedOrders);
      if (!deliveredOrder) {
        const firstDelivered = updatedOrders.find(o => o.status === 'delivered');
        if (firstDelivered) setDeliveredOrder(firstDelivered);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChats = async () => {
    try {
      const response = await api.get('messages/chats/');
      setChats(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // ── Open "Order Now" modal ────────────────────────────────
  const handleOpenOrderModal = (product) => {
    const fresh = JSON.parse(localStorage.getItem('user') || '{}');
    setOrderForm({
      buyerName: fresh.full_name || '',
      quantity: 1,
      shippingAddress: fresh.city ? `${fresh.city}, Kenya` : '',
      notes: ''
    });
    setBuyError('');
    setSelectedProduct(product);
  };

  // ── Place Order ───────────────────────────────────────────
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setBuyError('');
    setBuyLoading(true);

    const qty = Math.max(1, parseInt(orderForm.quantity) || 1);
    const total = (parseFloat(selectedProduct.price_per_unit) * qty).toFixed(2);

    try {
      // 1. Post to backend API (real order)
      await api.post('orders/', {
        product: selectedProduct.id,
        quantity: qty,
      });
      fetchOrders();
    } catch (err) {
      console.error('Backend order error (saving locally anyway):', err);
      // Non-blocking — if API is down we still save locally
      if (err.response?.data?.error) {
        setBuyError(err.response.data.error);
        setBuyLoading(false);
        return;
      }
    }

    // 2. Always save a snapshot to localStorage for order history demo
    const localRecord = {
      id: `LOCAL-${Date.now()}`,
      productName: selectedProduct.title,
      productUnit: selectedProduct.unit,
      pricePerUnit: selectedProduct.price_per_unit,
      quantity: qty,
      total,
      buyerName: orderForm.buyerName,
      shippingAddress: orderForm.shippingAddress,
      notes: orderForm.notes,
      farmerName: selectedProduct.farmer_name,
      farmerCity: selectedProduct.farmer_city,
      placedAt: new Date().toISOString(),
      status: 'pending'
    };
    saveLocalOrder(localRecord);
    setLocalOrders(getLocalOrders());

    // 3. Show success toast
    setSuccessToast({
      title: `Order placed for ${selectedProduct.title}!`,
      body: `Quantity: ${qty} ${selectedProduct.unit} — Total: KES ${total}`
    });

    setSelectedProduct(null);
    setBuyLoading(false);
  };

  const handleResolveOrder = () => {
    setDeliveredOrder(null);
    fetchOrders();
    fetchProducts();
  };

  const TAB_LABELS = {
    marketplace: 'Browse',
    orders: `My Orders (${orders.length})`,
    'local-history': `Order History (${localOrders.length})`,
    chats: `Inbox (${chats.length})`
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Delivered Order Confirmation Popup */}
      {deliveredOrder && (
        <OrderConfirmationPopup order={deliveredOrder} onResolve={handleResolveOrder} />
      )}

      {/* ── SUCCESS TOAST ──────────────────────────────── */}
      {successToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm animate-scaleIn">
          <div className="bg-white border border-green-200 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">{successToast.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{successToast.body}</p>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Vuna Marketplace</h1>
        <p className="text-xs text-gray-500">Buy fresh farm commodities directly from Kenyan farmers</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {Object.keys(TAB_LABELS).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 py-3 px-5 text-sm font-semibold capitalize border-b-2 transition duration-200 ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ── MARKETPLACE TAB ─────────────────────────── */}
      {activeTab === 'marketplace' && (
        <div>
          {/* Filters */}
          <div className="bg-white border border-primary/10 p-4 rounded-2xl shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <MapPin size={18} />
              </span>
              <input
                type="text"
                name="city"
                placeholder="Filter by city (e.g. Nairobi)"
                value={filters.city}
                onChange={handleFilterChange}
                className="pl-10 block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-gray-50/50"
              />
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                name="commodity"
                placeholder="Filter by commodity (e.g. Potato)"
                value={filters.commodity}
                onChange={handleFilterChange}
                className="pl-10 block w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-gray-50/50"
              />
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">Loading feed...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white border border-primary/10 rounded-2xl p-12 text-center text-sm text-gray-500">
              No active listings found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product) => (
                <div key={product.id} className="bg-white border border-primary/10 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group hover:shadow-md hover:border-primary/20 transition duration-200">
                  <div>
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-44 object-cover group-hover:brightness-95 transition"
                      />
                    ) : (
                      <div className="w-full h-44 bg-primary-accent flex items-center justify-center text-primary-light">
                        <ShoppingBag size={40} />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{product.title}</h3>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ml-2">
                          {product.commodity}
                        </span>
                      </div>

                      <div className="space-y-1 mb-4">
                        <p className="text-xs text-gray-600 flex items-center space-x-1">
                          <span className="font-semibold text-gray-800">Farmer:</span>
                          <span>{product.farmer_name}</span>
                        </p>
                        <p className="text-xs text-gray-500 flex items-center space-x-1">
                          <MapPin size={12} className="text-gray-400" />
                          <span>{product.farmer_city} • {product.farmer_market}</span>
                        </p>
                        <p className="text-xs text-gray-500 flex items-center space-x-1">
                          <Calendar size={12} className="text-gray-400" />
                          <span>Delivery: {product.delivery_time_varies ? 'Varies' : `Usually ${product.delivery_time_manual} days`}</span>
                        </p>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-xl font-black text-primary">KES {product.price_per_unit}</span>
                          <span className="text-xs text-gray-500"> / {product.unit}</span>
                        </div>
                        <span className="text-xs text-gray-700 font-medium bg-gray-100 px-2.5 py-1 rounded-lg">
                          Qty: {product.quantity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 pt-0 flex gap-2">
                    {/* ── ORDER NOW button ── */}
                    <button
                      onClick={() => handleOpenOrderModal(product)}
                      className="flex-1 py-2.5 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl shadow-md shadow-primary/15 flex items-center justify-center space-x-1.5 transition duration-200"
                      id={`order-now-${product.id}`}
                    >
                      <Package size={14} />
                      <span>Order Now</span>
                    </button>
                    <button
                      onClick={() => navigate(`/chat/${product.farmer}`)}
                      className="py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 flex items-center justify-center space-x-1 transition duration-200"
                    >
                      <MessageSquare size={14} />
                      <span>Chat</span>
                    </button>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('initiate-call', {
                          detail: {
                            userId: product.farmer,
                            userName: product.farmer_name,
                            userAvatar: '🌾'
                          }
                        }));
                      }}
                      className="py-2.5 px-3 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-xl border border-green-200 flex items-center justify-center transition duration-200"
                      title={`Video call ${product.farmer_name}`}
                    >
                      <Video size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MY ORDERS TAB (Backend) ──────────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-primary-accent border border-primary/10 rounded-2xl p-4 text-xs text-primary font-medium">
            <span className="font-bold">MVP Note:</span> Payments and delivery logistics are not integrated in v1. Below are your currently placed orders.
          </div>

          {orders.length === 0 ? (
            <div className="bg-white border border-primary/10 rounded-2xl p-8 text-center text-sm text-gray-500">
              You haven't placed any orders yet. Browse the marketplace and click <strong>Order Now</strong>.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-white border border-primary/10 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900 text-sm">Order #{order.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center space-x-1 ${
                        order.status === 'completed' ? 'bg-green-50 text-green-600'
                        : order.status === 'delivered' ? 'bg-blue-50 text-blue-600'
                        : order.status === 'disputed' ? 'bg-red-50 text-red-600'
                        : 'bg-yellow-50 text-yellow-600'
                      }`}>
                        {order.status === 'completed' && <CheckCircle size={10} className="mr-0.5" />}
                        {order.status === 'disputed' && <AlertTriangle size={10} className="mr-0.5" />}
                        {order.status === 'pending' && <Clock size={10} className="mr-0.5" />}
                        <span>{order.status}</span>
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 text-base mt-1">{order.product_title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Farmer: <span className="font-medium text-gray-700">{order.farmer_name} ({order.farmer_phone})</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Quantity: <span className="font-medium text-gray-700">{order.quantity} {order.product_unit}</span> | Total Price: <span className="font-bold text-primary">KES {order.total_price}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/chat/${order.farmer}`)}
                      className="w-full sm:w-auto py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 flex items-center justify-center space-x-1"
                    >
                      <MessageSquare size={14} />
                      <span>Chat Farmer</span>
                    </button>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('initiate-call', {
                          detail: {
                            userId: order.farmer,
                            userName: order.farmer_name,
                            userAvatar: '🌾'
                          }
                        }));
                      }}
                      className="py-2 px-3 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-xl border border-green-200 flex items-center justify-center space-x-1 transition"
                      title={`Call ${order.farmer_name}`}
                    >
                      <Video size={14} />
                      <span className="hidden sm:inline">Call</span>
                    </button>
                    {order.status === 'delivered' && (
                      <button
                        onClick={() => setDeliveredOrder(order)}
                        className="w-full sm:w-auto py-2 px-4 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-light transition shadow-md shadow-primary/10"
                      >
                        Confirm Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LOCAL ORDER HISTORY TAB (localStorage) ──── */}
      {activeTab === 'local-history' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700 font-medium flex items-start gap-2">
            <History size={14} className="shrink-0 mt-0.5" />
            <span>
              <span className="font-bold">Order History (Local):</span> These are orders captured in your browser's local storage for demo purposes. They persist across sessions on this device.
            </span>
          </div>

          {localOrders.length === 0 ? (
            <div className="bg-white border border-primary/10 rounded-2xl p-10 text-center text-sm text-gray-500">
              <History size={36} className="mx-auto text-gray-300 mb-3" />
              No order history yet. Place an order from the Browse tab!
            </div>
          ) : (
            <div className="space-y-3">
              {localOrders.map((order) => (
                <div key={order.id} className="bg-white border border-primary/10 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-gray-900 text-base">{order.productName}</span>
                        <span className="text-[10px] bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                          <Clock size={9} />
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Farmer: <span className="font-medium text-gray-700">{order.farmerName}</span>
                        {order.farmerCity && <span> · {order.farmerCity}</span>}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Package size={11} className="text-primary" />
                          {order.quantity} {order.productUnit} × KES {order.pricePerUnit}
                        </span>
                        <span className="flex items-center gap-1">
                          <Truck size={11} className="text-blue-500" />
                          {order.shippingAddress || 'No address'}
                        </span>
                      </div>
                      {order.notes && (
                        <p className="text-xs text-gray-400 italic mt-1">"{order.notes}"</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-black text-primary">KES {order.total}</span>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(order.placedAt).toLocaleDateString()} at {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] text-gray-400">{order.id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CHATS TAB ──────────────────────────────── */}
      {activeTab === 'chats' && (
        <div>
          {chats.length === 0 ? (
            <div className="bg-white border border-primary/10 rounded-2xl p-12 text-center text-sm text-gray-500">
              No active conversations yet. Find a product and click "Chat" to message a farmer.
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

      {/* ── ORDER NOW MODAL ──────────────────────────── */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-primary/10 overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 flex justify-between items-center border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Package size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">Order Now</h2>
                  <p className="text-[11px] text-gray-500">Fill in your details to place this order</p>
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
              {/* Product summary card */}
              <div className="bg-primary-accent p-4 rounded-xl border border-primary/10 mb-5 flex gap-3 items-start">
                {selectedProduct.images && selectedProduct.images.length > 0 ? (
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.title}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 border border-primary/10"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingBag size={22} className="text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-sm leading-tight">{selectedProduct.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">by {selectedProduct.farmer_name} · {selectedProduct.farmer_city}</p>
                  <div className="flex gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs font-bold text-primary">KES {selectedProduct.price_per_unit} / {selectedProduct.unit}</span>
                    <span className="text-xs text-gray-500">Stock: {selectedProduct.quantity} {selectedProduct.unit}</span>
                  </div>
                </div>
              </div>

              {buyError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3">
                  {buyError}
                </div>
              )}

              <form onSubmit={handlePlaceOrder} className="space-y-4" id="order-now-form">
                {/* Buyer Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={orderForm.buyerName}
                    onChange={(e) => setOrderForm({ ...orderForm, buyerName: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm"
                    placeholder="Your full name"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Quantity ({selectedProduct.unit})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderForm(f => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                      className="w-9 h-9 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 font-bold text-lg flex items-center justify-center transition shrink-0"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      required
                      min="1"
                      max={selectedProduct.quantity}
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm({ ...orderForm, quantity: Math.min(parseInt(e.target.value) || 1, selectedProduct.quantity) })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setOrderForm(f => ({ ...f, quantity: Math.min(f.quantity + 1, selectedProduct.quantity) }))}
                      className="w-9 h-9 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 font-bold text-lg flex items-center justify-center transition shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Shipping / Delivery Address
                  </label>
                  <input
                    type="text"
                    required
                    value={orderForm.shippingAddress}
                    onChange={(e) => setOrderForm({ ...orderForm, shippingAddress: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm"
                    placeholder="e.g. Muthurwa Market, Nairobi"
                  />
                </div>

                {/* Notes (optional) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Notes / Special Instructions <span className="normal-case font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    rows="2"
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm resize-none"
                    placeholder="e.g. Please pack in 10kg bags..."
                  />
                </div>

                {/* Order Total Summary */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    <p>{orderForm.quantity} {selectedProduct.unit} × KES {selectedProduct.price_per_unit}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Simulated — no real payment</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-semibold">TOTAL</p>
                    <p className="text-2xl font-black text-primary">
                      KES {(parseFloat(selectedProduct.price_per_unit) * Math.max(1, parseInt(orderForm.quantity) || 1)).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Confirm Button */}
                <button
                  type="submit"
                  disabled={buyLoading}
                  className="w-full py-3 px-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-light transition shadow-lg shadow-primary/20 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {buyLoading ? (
                    <span>Placing Order...</span>
                  ) : (
                    <>
                      <Star size={15} />
                      <span>Confirm Order</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
