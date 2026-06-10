import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, ShoppingCart, Filter, Loader2, ImagePlus, MessageSquare, CreditCard, X, User } from 'lucide-react';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import OrderCard from '../components/OrderCard';
import MPesaModal from '../components/MPesaModal';

const TABS = [
  { key: 'browse', label: 'Browse Products', icon: <ShoppingBag className="w-4 h-4" /> },
  { key: 'orders', label: 'My Orders', icon: <ShoppingCart className="w-4 h-4" /> },
];

export default function BuyerDashboard() {
  const [tab, setTab] = useState('browse');
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Buyer Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Browse fresh produce and track your orders</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
              tab === t.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fadeIn">
        {tab === 'browse' && <BrowseTab navigate={navigate} />}
        {tab === 'orders' && <OrdersTab navigate={navigate} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Browse Tab
   ═══════════════════════════════════════ */
function BrowseTab({ navigate }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [orderModal, setOrderModal] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (cityFilter) params.city = cityFilter;
      if (search) params.commodity = search;
      const res = await api.get('products/', { params });
      setProducts(res.data.results || res.data);
    } catch {}
    setLoading(false);
  }, [search, cityFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return (
    <div>
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by commodity..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Filter by city..."
            className="w-full sm:w-48 pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="w-12 h-12" />} title="No products found" desc="Try a different search or filter." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <BrowseProductCard key={p.id} product={p} onOrder={() => setOrderModal(p)} onChat={() => navigate(`/chat/${p.farmer}`)} />
          ))}
        </div>
      )}

      {/* Order Modal */}
      {orderModal && (
        <PlaceOrderModal
          product={orderModal}
          onClose={() => setOrderModal(null)}
          onSuccess={() => { setOrderModal(null); fetchProducts(); }}
        />
      )}
    </div>
  );
}

function BrowseProductCard({ product, onOrder, onChat }) {
  const img = product.images?.[0];
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
        {img ? (
          <img src={img} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ImagePlus className="w-10 h-10" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-1">{product.title}</h3>
        {product.commodity && <p className="text-xs text-gray-400 mb-1">{product.commodity}</p>}

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <User className="w-3 h-3" />
          <span>{product.farmer_name}</span>
          <span>·</span>
          <span>{product.farmer_city}</span>
        </div>

        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-lg font-bold text-primary">KSh {Number(product.price_per_unit).toLocaleString()}</span>
          <span className="text-xs text-gray-400">/{product.unit}</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Available: {product.quantity} {product.unit}</p>

        <div className="flex gap-2">
          <button
            onClick={onOrder}
            disabled={product.quantity <= 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-white bg-primary hover:bg-primary-dark disabled:bg-gray-300 rounded-lg transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Order
          </button>
          <button
            onClick={onChat}
            className="flex items-center justify-center gap-1 py-2 px-3 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceOrderModal({ product, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = quantity * Number(product.price_per_unit);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('orders/', { product: product.id, quantity });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modalOverlay" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-modalContent p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 text-lg">Place Order</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <h4 className="font-medium text-gray-900">{product.title}</h4>
          <p className="text-sm text-gray-500">{product.farmer_name} · {product.farmer_city}</p>
          <p className="text-primary font-bold mt-1">KSh {Number(product.price_per_unit).toLocaleString()} / {product.unit}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity ({product.unit})</label>
          <input
            type="number"
            min="1"
            max={product.quantity}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(product.quantity, parseInt(e.target.value) || 1)))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-xs text-gray-400 mt-1">Max available: {product.quantity}</p>
        </div>

        <div className="bg-primary/5 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-900">Total</span>
            <span className="text-xl font-bold text-primary">KSh {total.toLocaleString()}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-primary-light text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Orders Tab
   ═══════════════════════════════════════ */
function OrdersTab({ navigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingOrder, setPayingOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('orders/');
      setOrders(res.data.results || res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handlePaySuccess = (updatedOrder) => {
    setPayingOrder(null);
    setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
  };

  if (loading) return <LoadingSpinner />;
  if (orders.length === 0) return <EmptyState icon={<ShoppingCart className="w-12 h-12" />} title="No orders yet" desc="Browse products and place your first order." />;

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          showFarmer
          showDriver
          actions={
            <div className="flex flex-wrap gap-2">
              {order.status === 'pending' && (
                <button
                  onClick={() => setPayingOrder(order)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Pay with M-PESA
                </button>
              )}
              <button
                onClick={() => navigate(`/chat/${order.farmer}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Chat with Farmer
              </button>
            </div>
          }
        />
      ))}

      {payingOrder && (
        <MPesaModal
          order={payingOrder}
          onClose={() => setPayingOrder(null)}
          onSuccess={handlePaySuccess}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   Shared
   ═══════════════════════════════════════ */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

function EmptyState({ icon, title, desc }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="mx-auto mb-3 opacity-50">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-600">{title}</h3>
      <p className="text-sm mt-1">{desc}</p>
    </div>
  );
}
