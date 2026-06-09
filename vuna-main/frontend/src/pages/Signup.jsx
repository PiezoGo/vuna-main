import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import PasswordField from '../components/PasswordField';
import { syncAuthUser } from '../utils/dataBridge';

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    role: 'farmer',
    country: 'Kenya',
    city: '',
    market: 'Muthurwa',
    customMarket: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const submitMarket = formData.market === 'Other' ? formData.customMarket : formData.market;
    if (!submitMarket) {
      setError('Please specify your market.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        role: formData.role,
        country: formData.country,
        city: formData.city,
        market: submitMarket,
      };

      const response = await api.post('register/', payload);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      syncAuthUser(response.data.user);

      // Redirect based on role
      if (response.data.user.role === 'farmer') {
        navigate('/farmer/dashboard');
      } else {
        navigate('/buyer/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data
          ? Object.entries(err.response.data)
              .map(([key, val]) => `${key}: ${val}`)
              .join(', ')
          : 'Registration failed. Please try again.'
      );
    } finally {
      setFormData({ ...formData, password: '' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-bg flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-4xl font-extrabold text-primary tracking-tight">
          Vuna
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Connecting Kenyan Farmers and Buyers
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-primary/10 rounded-2xl sm:px-10">
          <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">Create your account</h3>
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Jane Doe"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Email address</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="jane@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Password</label>
              <div className="mt-1">
                <PasswordField
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone Number</label>
              <input
                type="text"
                name="phone_number"
                required
                value={formData.phone_number}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="0712345678"
              />
            </div>

            {/* Role selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Are you a Farmer or a Buyer?</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {['farmer', 'buyer', 'both'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r })}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border capitalize ${
                      formData.role === r
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Location (Country / City) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Country</label>
                <input
                  type="text"
                  name="country"
                  disabled
                  value={formData.country}
                  className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-xl sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">City</label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Nairobi"
                />
              </div>
            </div>

            {/* Market Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Market</label>
              <select
                name="market"
                value={formData.market}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm bg-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="Muthurwa">Muthurwa</option>
                <option value="Wakulima">Wakulima</option>
                <option value="Marikiti">Marikiti</option>
                <option value="Other">Other (Specify below)</option>
              </select>
            </div>

            {formData.market === 'Other' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Specify Market</label>
                <input
                  type="text"
                  name="customMarket"
                  required
                  value={formData.customMarket}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Enter market name"
                />
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-semibold text-white bg-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Sign up'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
