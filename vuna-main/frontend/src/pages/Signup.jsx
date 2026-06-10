import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Sprout, ShoppingBag } from 'lucide-react';
import api from '../utils/api';

const MARKETS = ['Muthurwa', 'Wakulima', 'Marikiti', 'Other'];
const BUYER_TYPES = [
  { value: 'hotel', label: 'Hotel / Restaurant' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'wholesaler', label: 'Wholesaler' },
];

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    role: '',
    country: 'Kenya',
    city: '',
    market: '',
    buyer_type: '',
    farmer_delivery_time: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!form.role) {
      setError('Please select your role.');
      setLoading(false);
      return;
    }

    try {
      const payload = { ...form };
      if (payload.role !== 'buyer') delete payload.buyer_type;
      if (payload.role !== 'farmer') delete payload.farmer_delivery_time;

      const res = await api.post('register/', payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate(res.data.user.role === 'farmer' ? '/farmer/dashboard' : '/buyer/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.values(data).flat().join(' ');
        setError(msgs || 'Registration failed.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-primary-bg">
      <div className="w-full max-w-lg animate-slideUp">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary/20 mb-4">
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Join Vuna's farm-to-market network</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                <RoleCard
                  icon={<Sprout className="w-5 h-5" />}
                  label="Farmer"
                  desc="Sell your produce"
                  active={form.role === 'farmer'}
                  onClick={() => update('role', 'farmer')}
                />
                <RoleCard
                  icon={<ShoppingBag className="w-5 h-5" />}
                  label="Buyer"
                  desc="Buy fresh produce"
                  active={form.role === 'buyer'}
                  onClick={() => update('role', 'buyer')}
                />
              </div>
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Full Name" required value={form.full_name} onChange={(v) => update('full_name', v)} placeholder="John Kamau" />
              <InputField label="Email" type="email" required value={form.email} onChange={(v) => update('email', v)} placeholder="you@example.com" />
            </div>

            {/* Phone & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Phone Number" required value={form.phone_number} onChange={(v) => update('phone_number', v)} placeholder="+254 712 345 678" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* City & Market */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="City" value={form.city} onChange={(v) => update('city', v)} placeholder="Nairobi" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Market</label>
                <select
                  value={form.market}
                  onChange={(e) => update('market', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white"
                >
                  <option value="">Select market</option>
                  {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Buyer-specific: buyer_type */}
            {form.role === 'buyer' && (
              <div className="animate-slideDown">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Buyer Type</label>
                <select
                  value={form.buyer_type}
                  onChange={(e) => update('buyer_type', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-white"
                >
                  <option value="">Select type</option>
                  {BUYER_TYPES.map((bt) => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                </select>
              </div>
            )}

            {/* Farmer-specific: delivery time */}
            {form.role === 'farmer' && (
              <div className="animate-slideDown">
                <InputField
                  label="Estimated Delivery Time (optional)"
                  value={form.farmer_delivery_time}
                  onChange={(v) => update('farmer_delivery_time', v)}
                  placeholder="e.g., Same day, 2-3 days"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark disabled:bg-primary-light text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary-dark font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function RoleCard({ icon, label, desc, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
        active
          ? 'border-primary bg-primary/5 text-primary shadow-sm'
          : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="font-semibold text-sm">{label}</span>
      <span className="text-xs opacity-70">{desc}</span>
    </button>
  );
}

function InputField({ label, type = 'text', required = false, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
      />
    </div>
  );
}
