import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Package, MapPin, Phone, User, ArrowRight, CheckCircle, Loader2, Clock, History } from 'lucide-react';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import OrderCard from '../components/OrderCard';

const STATUS_ACTIONS = {
  assigned: { next: 'collected', label: 'Mark as Collected', icon: <Package className="w-4 h-4" />, color: 'bg-violet-600 hover:bg-violet-700' },
  collected: { next: 'in_transit', label: 'Mark as In Transit', icon: <Truck className="w-4 h-4" />, color: 'bg-indigo-600 hover:bg-indigo-700' },
  in_transit: { next: 'delivered', label: 'Mark as Delivered', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-600 hover:bg-green-700' },
};

export default function DriverDashboard() {
  const [currentOrder, setCurrentOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('driver/orders/');
      setCurrentOrder(res.data.current_order);
      setHistory(res.data.history);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    setFeedback('');
    try {
      const res = await api.post('driver/update_status/', { status: newStatus });
      setFeedback(res.data.detail);
      fetchData();
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Status update failed.');
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const action = currentOrder ? STATUS_ACTIONS[currentOrder.status] : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your current delivery</p>
      </div>

      {feedback && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-2.5 rounded-xl mb-6 animate-slideDown">
          {feedback}
        </div>
      )}

      {/* Current Order */}
      {currentOrder ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden mb-8 animate-slideUp">
          {/* Order Header */}
          <div className="bg-gradient-to-r from-primary to-primary-dark px-5 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Current Delivery</h2>
                  <p className="text-white/70 text-sm">Order #{currentOrder.id}</p>
                </div>
              </div>
              <StatusBadge status={currentOrder.status} size="lg" />
            </div>
          </div>

          <div className="p-5">
            {/* Product Info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-gray-900">{currentOrder.product_title}</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">Quantity:</span> <span className="font-medium">{currentOrder.quantity} {currentOrder.product_unit}</span></div>
                <div><span className="text-gray-400">Value:</span> <span className="font-bold text-primary">KSh {Number(currentOrder.total_price).toLocaleString()}</span></div>
              </div>
            </div>

            {/* Route: Farmer → Buyer */}
            <div className="space-y-3 mb-5">
              {/* Pickup */}
              <div className="flex items-start gap-3 bg-green-50 rounded-xl p-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wider mb-1">Pickup (Farmer)</p>
                  <p className="font-semibold text-gray-900">{currentOrder.farmer_name}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{currentOrder.farmer_phone}</span>
                  </div>
                  {currentOrder.farmer_city && (
                    <p className="text-sm text-gray-500 mt-0.5">{currentOrder.farmer_city}</p>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
                </div>
              </div>

              {/* Dropoff */}
              <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">Dropoff (Buyer)</p>
                  <p className="font-semibold text-gray-900">{currentOrder.buyer_name}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{currentOrder.buyer_phone}</span>
                  </div>
                  {currentOrder.buyer_city && (
                    <p className="text-sm text-gray-500 mt-0.5">{currentOrder.buyer_city}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Progress */}
            <div className="flex items-center gap-2 mb-5 overflow-x-auto hide-scrollbar pb-1">
              {['assigned', 'collected', 'in_transit', 'delivered'].map((s, i) => {
                const stepOrder = ['assigned', 'collected', 'in_transit', 'delivered'];
                const currentIdx = stepOrder.indexOf(currentOrder.status);
                const isComplete = i <= currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <React.Fragment key={s}>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      isCurrent ? 'bg-primary text-white animate-statusPulse' : isComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isComplete && !isCurrent ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {s.replace('_', ' ')}
                    </div>
                    {i < 3 && <div className={`w-4 h-0.5 flex-shrink-0 ${isComplete ? 'bg-green-300' : 'bg-gray-200'}`} />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Action Button */}
            {action && (
              <button
                onClick={() => handleStatusUpdate(action.next)}
                disabled={updating}
                className={`w-full py-3.5 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${action.color} disabled:opacity-50`}
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : action.icon}
                {action.label}
              </button>
            )}

            {currentOrder.status === 'delivered' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700">Delivery complete! Waiting for admin to finalize.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center mb-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-1">No Current Delivery</h3>
          <p className="text-sm text-gray-400">You'll be notified when a new order is assigned to you.</p>
        </div>
      )}

      {/* History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Delivery History</h2>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No past deliveries yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((order) => (
              <OrderCard key={order.id} order={order} showFarmer showBuyer />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
