import React, { useState, useEffect, useCallback } from 'react';
import { Truck, ClipboardList, Package, Users, Plus, Trash2, Loader2, CheckCircle, UserCheck, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import OrderCard from '../components/OrderCard';

const TABS = [
  { key: 'drivers', label: 'Manage Drivers', icon: <Truck className="w-4 h-4" /> },
  { key: 'assign', label: 'Assign Driver', icon: <ClipboardList className="w-4 h-4" /> },
  { key: 'orders', label: 'All Orders', icon: <Package className="w-4 h-4" /> },
  { key: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
];

const STATUSES = ['', 'pending', 'paid', 'assigned', 'collected', 'in_transit', 'delivered', 'completed', 'cancelled'];

export default function AdminDashboard() {
  const [tab, setTab] = useState('drivers');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage drivers, assignments, orders, and users</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto hide-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
              tab === t.key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="animate-fadeIn">
        {tab === 'drivers' && <DriversTab />}
        {tab === 'assign' && <AssignTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'users' && <UsersTab />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Manage Drivers Tab
   ═══════════════════════════════════════ */
function DriversTab() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone_number: '', vehicle_type: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await api.get('admin/drivers/');
      setDrivers(res.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('admin/drivers/', form);
      setForm({ full_name: '', phone_number: '', vehicle_type: '' });
      setShowForm(false);
      fetchDrivers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add driver.');
    }
    setSaving(false);
  };

  const handleDelete = async (driverId) => {
    if (!confirm('Deactivate this driver?')) return;
    try {
      await api.delete('admin/drivers/', { data: { driver_id: driverId } });
      fetchDrivers();
    } catch {}
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{drivers.length} Driver{drivers.length !== 1 ? 's' : ''}</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add Driver
        </button>
      </div>

      {/* Add Driver Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-5 mb-6 animate-scaleIn">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Driver</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                <input required value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Driver name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
                <input required value={form.phone_number} onChange={(e) => setForm({...form, phone_number: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="+254 7XX XXX XXX" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Type</label>
                <input value={form.vehicle_type} onChange={(e) => setForm({...form, vehicle_type: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g., Motorcycle, Pickup" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-primary-light text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Driver
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Drivers Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Current Order</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {drivers.map((d) => (
                <tr key={d.uid} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{d.phone_number}</td>
                  <td className="px-4 py-3 text-gray-600">{d.vehicle_type || '—'}</td>
                  <td className="px-4 py-3">
                    {!d.is_driver_active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                        <AlertCircle className="w-3 h-3" /> Inactive
                      </span>
                    ) : d.current_order ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                        <Truck className="w-3 h-3" /> On Delivery
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle className="w-3 h-3" /> Available
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {d.current_order_product ? `#${d.current_order_id} — ${d.current_order_product}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.is_driver_active && (
                      <button onClick={() => handleDelete(d.uid)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {drivers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No drivers registered yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Assign Driver Tab
   ═══════════════════════════════════════ */
function AssignTab() {
  const [paidOrders, setPaidOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState({});
  const [assigning, setAssigning] = useState(null);
  const [feedback, setFeedback] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, driversRes] = await Promise.all([
        api.get('admin/orders/', { params: { status: 'paid' } }),
        api.get('admin/drivers/'),
      ]);
      setPaidOrders(ordersRes.data);
      setDrivers(driversRes.data.filter((d) => d.is_driver_active && !d.current_order));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssign = async (orderId) => {
    const driverId = assignments[orderId];
    if (!driverId) return;

    setAssigning(orderId);
    setFeedback('');
    try {
      await api.post('admin/assign_driver/', { order_id: orderId, driver_id: driverId });
      setFeedback(`Driver assigned to Order #${orderId}`);
      fetchData();
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Assignment failed.');
    }
    setAssigning(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Paid Orders Awaiting Assignment ({paidOrders.length})
      </h2>

      {feedback && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-2.5 rounded-xl mb-4 animate-slideDown">
          {feedback}
        </div>
      )}

      {paidOrders.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-12 h-12" />} title="No paid orders" desc="Paid orders waiting for driver assignment will appear here." />
      ) : (
        <div className="space-y-4">
          {paidOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{order.product_title}</h4>
                  <p className="text-xs text-gray-500">Order #{order.id} · {order.buyer_name} → {order.farmer_name}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div><span className="text-gray-400 text-xs">Quantity:</span> <span className="font-medium">{order.quantity} {order.product_unit}</span></div>
                <div><span className="text-gray-400 text-xs">Total:</span> <span className="font-bold text-primary">KSh {Number(order.total_price).toLocaleString()}</span></div>
                <div><span className="text-gray-400 text-xs">Buyer:</span> <span className="font-medium">{order.buyer_name} ({order.buyer_city})</span></div>
                <div><span className="text-gray-400 text-xs">Farmer:</span> <span className="font-medium">{order.farmer_name} ({order.farmer_city})</span></div>
              </div>

              {/* Assign Driver */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pt-3 border-t border-gray-100">
                <select
                  value={assignments[order.id] || ''}
                  onChange={(e) => setAssignments({...assignments, [order.id]: e.target.value})}
                  className="flex-1 w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  <option value="">Select driver...</option>
                  {drivers.map((d) => (
                    <option key={d.uid} value={d.uid}>
                      {d.full_name} — {d.vehicle_type || 'No vehicle'} ({d.phone_number})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleAssign(order.id)}
                  disabled={!assignments[order.id] || assigning === order.id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  {assigning === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  Assign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {drivers.length === 0 && paidOrders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl mt-4">
          <strong>No available drivers.</strong> All drivers are either on delivery or inactive. Add more drivers in the Manage Drivers tab.
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   All Orders Tab
   ═══════════════════════════════════════ */
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [completing, setCompleting] = useState(null);
  const [feedback, setFeedback] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('admin/orders/', { params });
      setOrders(res.data);
    } catch {}
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleMarkPaid = async (orderId) => {
    setCompleting(orderId);
    setFeedback('');
    try {
      await api.post('admin/complete_order/', { order_id: orderId });
      setFeedback(`Order #${orderId} completed. Farmer marked as paid.`);
      fetchOrders();
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Failed to complete order.');
    }
    setCompleting(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">All Orders ({orders.length})</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      {feedback && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-xl mb-4 animate-slideDown">
          {feedback}
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState icon={<Package className="w-12 h-12" />} title="No orders" desc="Orders will appear here." />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              showFarmer
              showBuyer
              showDriver
              actions={
                order.status === 'delivered' && !order.farmer_paid ? (
                  <button
                    onClick={() => handleMarkPaid(order.id)}
                    disabled={completing === order.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 rounded-lg transition-colors shadow-sm"
                  >
                    {completing === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Mark Farmer Paid
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   Users Tab
   ═══════════════════════════════════════ */
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('admin/users/', { params });
      setUsers(res.data);
    } catch {}
    setLoading(false);
  }, [roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (userId, name) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete('admin/users/', { data: { user_id: userId } });
      fetchUsers();
    } catch {}
  };

  if (loading) return <LoadingSpinner />;

  const ROLE_COLORS = {
    farmer: 'bg-green-50 text-green-700',
    buyer: 'bg-blue-50 text-blue-700',
    admin: 'bg-purple-50 text-purple-700',
    driver: 'bg-amber-50 text-amber-700',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Users ({users.length})</h2>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        >
          <option value="">All Roles</option>
          <option value="farmer">Farmers</option>
          <option value="buyer">Buyers</option>
          <option value="admin">Admins</option>
          <option value="driver">Drivers</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">City</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[u.role] || ''}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.phone_number}</td>
                  <td className="px-4 py-3 text-gray-600">{u.city || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'admin' && (
                      <button onClick={() => handleDelete(u.uid, u.full_name)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
