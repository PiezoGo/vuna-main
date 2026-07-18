import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, ShoppingBag, DollarSign, Edit2, Trash2, Loader2, ImagePlus, X, MessageSquare } from 'lucide-react';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import OrderCard from '../components/OrderCard';

const TABS = [
  { key: 'products', label: 'My Products', icon: <Package className="w-4 h-4" /> },
  { key: 'orders', label: 'My Orders', icon: <ShoppingBag className="w-4 h-4" /> },
  { key: 'earnings', label: 'Earnings', icon: <DollarSign className="w-4 h-4" /> },
];

const UNITS = ['kg', 'sack', 'piece', 'bunch', 'litre'];

export default function FarmerDashboard() {
  const [tab, setTab] = useState('products');
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Farmer Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your produce, orders, and earnings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto hide-scrollbar">
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
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fadeIn">
        {tab === 'products' && <ProductsTab />}
        {tab === 'orders' && <OrdersTab navigate={navigate} />}
        {tab === 'earnings' && <EarningsTab />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Products Tab
   ═══════════════════════════════════════ */
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('products/', { params: { my_listings: 'true' } });
      setProducts(res.data.results || res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`products/${id}/`);
      fetchProducts();
    } catch {}
  };

  const handleEdit = (product) => {
    setEditing(product);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {products.length} Product{products.length !== 1 ? 's' : ''}
        </h2>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {showForm && (
        <ProductForm
          product={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); fetchProducts(); }}
        />
      )}

      {loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState icon={<Package className="w-12 h-12" />} title="No products yet" desc="Add your first product to start selling." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete }) {
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
        {!product.is_active && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Inactive</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-1">{product.title}</h3>
        {product.commodity && <p className="text-xs text-gray-400 mb-2">{product.commodity}</p>}
        <div className="flex flex-col gap-0.5 mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-medium text-gray-500">Listed:</span>
            <span className="text-base font-bold text-primary">KSh {Number(product.listed_price_per_unit || 0).toLocaleString()}</span>
            <span className="text-xs text-gray-400">/{product.unit}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-gray-400">Your Base:</span>
            <span className="text-xs font-semibold text-gray-600">KSh {Number(product.base_price_per_unit || 0).toLocaleString()}</span>
          </div>
        </div>
        {product.harvest_date && <p className="text-xs text-green-600 mb-2">Harvest: {product.harvest_date}</p>}
        <p className="text-xs text-gray-500 mb-3">Stock: {product.quantity} {product.unit}</p>
        <div className="flex gap-2">
          <button onClick={() => onEdit(product)} className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={() => onDelete(product.id)} className="flex items-center justify-center gap-1 py-2 px-3 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductForm({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: product?.title || '',
    commodity: product?.commodity || '',
    unit: product?.unit || 'kg',
    base_price_per_unit: product?.base_price_per_unit || '',
    quantity: product?.quantity || '',
    harvest_date: product?.harvest_date || '',
  });
  const [files, setFiles] = useState({ image1: null, image2: null, image3: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));
    Object.entries(files).forEach(([k, v]) => { if (v) formData.append(k, v); });

    try {
      if (product) {
        await api.patch(`products/${product.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('products/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      onSaved();
    } catch (err) {
      setError('Failed to save product.');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-md p-5 mb-6 animate-scaleIn">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{product ? 'Edit Product' : 'Add New Product'}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
            <input required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g., Fresh Tomatoes" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Commodity</label>
            <input value={form.commodity} onChange={(e) => setForm({...form, commodity: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g., Vegetables" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unit *</label>
            <select required value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Base Price (KSh) *</label>
            <input type="number" required min="1" value={form.base_price_per_unit} onChange={(e) => setForm({...form, base_price_per_unit: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {form.base_price_per_unit && (
              <p className="text-[10px] text-gray-500 mt-1">Listed: KSh {(Number(form.base_price_per_unit) * 1.2).toFixed(2)} (+20% logistics)</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
            <input type="number" required min="1" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Harvest Date</label>
            <input type="date" value={form.harvest_date} onChange={(e) => setForm({...form, harvest_date: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* Image uploads */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Images (up to 3)</label>
          <div className="grid grid-cols-3 gap-3">
            {['image1', 'image2', 'image3'].map((key) => (
              <label key={key} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all text-gray-400">
                {files[key] ? (
                  <img src={URL.createObjectURL(files[key])} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <>
                    <ImagePlus className="w-5 h-5 mb-1" />
                    <span className="text-xs">Upload</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setFiles({...files, [key]: e.target.files[0]})} />
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary hover:bg-primary-dark disabled:bg-primary-light text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {product ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════
   Orders Tab
   ═══════════════════════════════════════ */
function OrdersTab({ navigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('orders/');
        setOrders(res.data.results || res.data);
      } catch {}
      setLoading(false);
    };
    fetchOrders();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (orders.length === 0) return <EmptyState icon={<ShoppingBag className="w-12 h-12" />} title="No orders yet" desc="Orders from buyers will appear here." />;

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          showBuyer
          showDriver
          actions={
            <button
              onClick={() => navigate(`/chat/${order.buyer}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Chat with Buyer
            </button>
          }
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   Earnings Tab
   ═══════════════════════════════════════ */
function EarningsTab() {
  const [data, setData] = useState({ total_earnings: 0, completed_orders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await api.get('farmer/earnings/');
        setData(res.data);
      } catch {}
      setLoading(false);
    };
    fetchEarnings();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* Total Earnings Card */}
      <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 text-white mb-6 shadow-lg shadow-primary/20">
        <p className="text-sm text-white/70 mb-1">Total Earnings</p>
        <p className="text-3xl font-bold">KSh {Number(data.total_earnings).toLocaleString()}</p>
        <p className="text-sm text-white/60 mt-2">{data.completed_orders.length} completed order{data.completed_orders.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Completed Orders */}
      {data.completed_orders.length === 0 ? (
        <EmptyState icon={<DollarSign className="w-12 h-12" />} title="No earnings yet" desc="Completed orders with farmer payment will appear here." />
      ) : (
        <div className="space-y-4">
          {data.completed_orders.map((order) => (
            <OrderCard key={order.id} order={order} showBuyer showDriver />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   Shared components
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
