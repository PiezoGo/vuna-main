import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Search, MapPin, Calendar, MessageSquare, ShoppingBag, X, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import OrderConfirmationPopup from '../components/OrderConfirmationPopup';

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('marketplace'); // marketplace, orders, chats
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search/Filters State
  const [filters, setFilters] = useState({
    city: '',
    commodity: '',
  });

  // Buy Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState('');

  // Active Delivered Order for Confirmation Popup
  const [deliveredOrder, setDeliveredOrder] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchChats();
  }, [filters]);

  // Polling for delivered orders (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      checkDeliveredOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, [orders]);

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
      
      // Check if any order is 'delivered' to show the popup immediately
      const firstDelivered = response.data.find(o => o.status === 'delivered');
      if (firstDelivered) {
        setDeliveredOrder(firstDelivered);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const checkDeliveredOrders = async () => {
    try {
      const response = await api.get('orders/');
      const updatedOrders = response.data;
      setOrders(updatedOrders);
      
      // If we don't currently have a popup open, find the first delivered one
      if (!deliveredOrder) {
        const firstDelivered = updatedOrders.find(o => o.status === 'delivered');
        if (firstDelivered) {
          setDeliveredOrder(firstDelivered);
        }
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

  const handleOpenBuy = (product) => {
    setSelectedProduct(product);
    setBuyQuantity(1);
    setBuyError('');
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setBuyError('');
    setBuyLoading(true);

    try {
      await api.post('orders/', {
        product: selectedProduct.id,
        quantity: buyQuantity,
      });
      setSelectedProduct(null);
      fetchOrders();
      alert('Order placed successfully!');
    } catch (err) {
      console.error(err);
      setBuyError(err.response?.data?.error || 'Failed to place order.');
    } finally {
      setBuyLoading(false);
    }
  };

  const handleResolveOrder = (orderId, newStatus) => {
    setDeliveredOrder(null);
    fetchOrders();
    fetchProducts(); // Refresh listings (completed archives the product)
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Order Confirmation Overlay Popup */}
      {deliveredOrder && (
        <OrderConfirmationPopup
          order={deliveredOrder}
          onResolve={handleResolveOrder}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Vuna Marketplace</h1>
        <p className="text-xs text-gray-500">Buy fresh farm commodities directly from Kenyan farmers</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {['marketplace', 'orders', 'chats'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 sm:flex-initial py-3 px-6 text-sm font-semibold capitalize border-b-2 transition duration-200 ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'marketplace' ? 'Browse' : tab === 'orders' ? `My Orders (${orders.length})` : `Inbox (${chats.length})`}
          </button>
        ))}
      </div>

      {/* MARKETPLACE TAB */}
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

          {/* Feed */}
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
                <div key={product.id} className="bg-white border border-primary/10 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                  <div>
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-44 object-cover"
                      />
                    ) : (
                      <div className="w-full h-44 bg-primary-accent flex items-center justify-center text-primary-light">
                        <ShoppingBag size={40} />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{product.title}</h3>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
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

                  <div className="p-4 pt-0 flex gap-2">
                    <button
                      onClick={() => handleOpenBuy(product)}
                      className="flex-1 py-2.5 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl shadow-md shadow-primary/15 flex items-center justify-center space-x-1 transition duration-200"
                    >
                      <ShoppingBag size={14} />
                      <span>Buy Now</span>
                    </button>
                    <button
                      onClick={() => navigate(`/chat/${product.farmer}`)}
                      className="py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 flex items-center justify-center space-x-1 transition duration-200"
                    >
                      <MessageSquare size={14} />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-primary-accent border border-primary/10 rounded-2xl p-4 text-xs text-primary font-medium">
            <span className="font-bold">MVP Note:</span> Payments and delivery logistics are not integrated in v1. Below are your currently placed orders.
          </div>

          {orders.length === 0 ? (
            <div className="bg-white border border-primary/10 rounded-2xl p-8 text-center text-sm text-gray-500">
              You haven't placed any orders yet.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-white border border-primary/10 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900 text-sm">Order #{order.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center space-x-1 ${
                        order.status === 'completed'
                          ? 'bg-green-50 text-green-600'
                          : order.status === 'delivered'
                          ? 'bg-blue-50 text-blue-600'
                          : order.status === 'disputed'
                          ? 'bg-red-50 text-red-600'
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/chat/${order.farmer}`)}
                      className="w-full sm:w-auto py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 flex items-center justify-center space-x-1"
                    >
                      <MessageSquare size={14} />
                      <span>Chat Farmer</span>
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

      {/* CHATS TAB */}
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

      {/* BUY MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-primary/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Place Order</h2>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {buyError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3">
                {buyError}
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <div className="bg-primary-accent p-3.5 rounded-xl border border-primary/5">
                <h4 className="font-bold text-gray-800 text-sm">{selectedProduct.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">Price: KES {selectedProduct.price_per_unit} / {selectedProduct.unit}</p>
                <p className="text-xs text-gray-500">Available: {selectedProduct.quantity} {selectedProduct.unit}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Purchase Quantity ({selectedProduct.unit})</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedProduct.quantity}
                  value={buyQuantity}
                  onChange={(e) => setBuyQuantity(Math.min(parseInt(e.target.value) || 1, selectedProduct.quantity))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-baseline justify-between">
                <span className="text-xs text-gray-500 font-semibold">Total Price:</span>
                <span className="text-xl font-black text-primary">KES {(selectedProduct.price_per_unit * buyQuantity).toFixed(2)}</span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={buyLoading}
                  className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary-light transition shadow-lg shadow-primary/20 text-sm"
                >
                  {buyLoading ? 'Placing Order...' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
