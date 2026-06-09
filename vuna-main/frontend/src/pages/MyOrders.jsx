import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import SellerProfileModal from '../components/SellerProfileModal';
import { fetchBuyerOrders, patchOrderStatus } from '../utils/dataBridge';
import {
  CheckCircle, AlertTriangle, Clock, MessageSquare, Video,
  Package, ArrowLeft
} from 'lucide-react';
import {
  formatStatus, statusBadgeClass, isDisputeWindowOpen, getDisputeWindowRemaining, isUserOnline
} from '../utils/marketplaceStore';

export default function MyOrders() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewSellerId, setViewSellerId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setOrders(await fetchBuyerOrders(currentUser.uid));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.uid]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (orderId, status) => {
    try {
      await patchOrderStatus(orderId, status, currentUser);
      fetchOrders();
    } catch (err) {
      alert(err.message || 'Failed to update order');
    }
  };

  const handleCall = (order) => {
    if (!isUserOnline(order.farmer)) {
      alert('User offline — the farmer is not currently online.');
      return;
    }
    window.dispatchEvent(new CustomEvent('initiate-call', {
      detail: {
        userId: order.farmer,
        userName: order.farmer_name,
        userAvatar: '👤',
      },
    }));
  };

  const handleEscalate = () => {
    alert('Your dispute has been escalated to Vuna support (demo). A team member will contact you within 24 hours.');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/buyer/dashboard" className="p-2 text-gray-500 hover:text-primary rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900">My Orders</h1>
          <p className="text-xs text-gray-500">Track deliveries, disputes, and completions</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-12">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-primary/10 rounded-2xl p-10 text-center text-sm text-gray-500">
          No orders yet. Browse the marketplace to place your first order.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const windowOpen = isDisputeWindowOpen(order);
            const remaining = getDisputeWindowRemaining(order);

            return (
              <div key={order.id} className="bg-white border border-primary/10 rounded-2xl p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <UserAvatar userId={order.farmer} name={order.farmer_name} size="md" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">Order #{order.id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 ${statusBadgeClass(order.status)}`}>
                          {order.status === 'completed' && <CheckCircle size={10} />}
                          {order.status === 'disputed' && <AlertTriangle size={10} />}
                          {order.status === 'pending' && <Clock size={10} />}
                          {formatStatus(order.status)}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-800 mt-1">{order.product_title}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Seller: <button onClick={() => setViewSellerId(order.farmer)} className="font-medium text-primary hover:underline transition">{order.farmer_name}</button> &middot; {order.quantity} {order.product_unit} &middot; KES {order.total_price}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Ordered: {new Date(order.created_at).toLocaleString()}
                      </p>
                      {order.status === 'disputed' && windowOpen && (
                        <p className="text-[10px] text-orange-600 mt-1 font-medium">
                          Resolution window: {Math.ceil(remaining / 1000)}s remaining
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/chat/${order.farmer}`}
                      className="py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 flex items-center gap-1"
                    >
                      <MessageSquare size={14} />
                      Chat
                    </Link>
                    <button
                      onClick={() => handleCall(order)}
                      className="py-2 px-3 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-xl border border-green-200 flex items-center gap-1"
                    >
                      <Video size={14} />
                      Call
                    </button>

                    {order.status === 'delivery_in_progress' && (
                      <button
                        onClick={() => updateStatus(order.id, 'disputed')}
                        className="py-2 px-3 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-xl hover:bg-red-100"
                      >
                        Dispute
                      </button>
                    )}

                    {order.status === 'disputed' && windowOpen && (
                      <button
                        onClick={() => updateStatus(order.id, 'delivered')}
                        className="py-2 px-3 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-light"
                      >
                        Mark as Complete
                      </button>
                    )}

                    {order.status === 'disputed' && !windowOpen && (
                      <button
                        onClick={handleEscalate}
                        className="py-2 px-3 bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold rounded-xl hover:bg-orange-100"
                      >
                        Escalate
                      </button>
                    )}

                    {order.status === 'delivered' && (
                      <button
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="py-2 px-3 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-light flex items-center gap-1"
                      >
                        <Package size={14} />
                        Confirm Receipt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Seller Profile Modal */}
      {viewSellerId && (
        <SellerProfileModal
          sellerId={viewSellerId}
          onClose={() => setViewSellerId(null)}
        />
      )}
    </div>
  );
}
