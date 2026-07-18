import React, { useState } from 'react';
import { X, Phone, CheckCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';

export default function MPesaModal({ order, onClose, onSuccess }) {
  const [code, setCode] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!code.trim()) {
      setError('Please enter a confirmation code.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await api.post(`orders/${order.id}/mock_pay/`, { code });
      setSuccess(true);
      setTimeout(() => {
        onSuccess(res.data.order);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modalOverlay"
         style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-modalContent overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">M-PESA Payment</h3>
              <p className="text-green-100 text-xs">Simulated — No real money</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="animate-checkmark">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mt-4">Payment Successful!</h4>
              <p className="text-sm text-gray-500 mt-1">Your mock M-PESA payment has been processed.</p>
            </div>
          ) : (
            <>
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Order</span>
                  <span className="text-sm font-medium text-gray-700">#{order.id}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Product</span>
                  <span className="text-sm font-medium text-gray-700">{order.product_title}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Quantity</span>
                  <span className="text-sm font-medium text-gray-700">{order.quantity} {order.product_unit}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Subtotal</span>
                  <span className="text-sm font-medium text-gray-700">KSh {(Number(order.total_price) - Number(order.platform_fee || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Platform Fee</span>
                  <span className="text-sm font-medium text-gray-700">KSh {Number(order.platform_fee || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div className="border-t border-gray-200 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-green-700">KSh {Number(order.total_price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
                <p className="text-xs text-amber-800">
                  <strong>Simulated M-PESA:</strong> Enter any confirmation code below (e.g., 123456). 
                  No real money will be charged.
                </p>
              </div>

              {/* Code Input */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirmation Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter code (e.g., 123456)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 mb-4 text-center">{error}</p>
              )}

              {/* Pay Button */}
              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Pay KSh {Number(order.total_price).toLocaleString()}</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
