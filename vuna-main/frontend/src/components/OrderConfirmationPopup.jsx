import React, { useState } from 'react';
import api from '../utils/api';

export default function OrderConfirmationPopup({ order, onResolve }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResponse = async (statusValue) => {
    setLoading(true);
    setError('');
    try {
      await api.patch(`orders/${order.id}/`, { status: statusValue });
      onResolve(order.id, statusValue);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-primary/20 transform transition-all scale-100">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">Delivery Confirmation</h3>
          <p className="text-gray-600 mb-6 text-sm">
            Did you receive the order from <span className="font-semibold text-primary">{order.farmer_name}</span> for <span className="font-semibold text-gray-800">{order.quantity} {order.product_unit}(s)</span> of <span className="font-semibold text-gray-800">{order.product_title}</span>?
          </p>
          
          {error && <p className="text-red-500 text-xs mb-4">{error}</p>}
          
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => handleResponse('completed')}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-light transition duration-200 disabled:opacity-50 text-sm"
            >
              Yes, complete order
            </button>
            <button
              onClick={() => handleResponse('disputed')}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl hover:bg-red-100 transition duration-200 disabled:opacity-50 text-sm"
            >
              No, report issue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
