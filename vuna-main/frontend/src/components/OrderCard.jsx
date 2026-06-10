import React from 'react';
import StatusBadge from './StatusBadge';
import { Package, User, Truck, Calendar } from 'lucide-react';

export default function OrderCard({ order, actions, showDriver = false, showFarmer = true, showBuyer = false }) {
  const date = new Date(order.created_at).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-accent rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{order.product_title}</h4>
              <p className="text-xs text-gray-500">Order #{order.id}</p>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Quantity</p>
            <p className="text-sm font-medium text-gray-700">{order.quantity} {order.product_unit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Total</p>
            <p className="text-sm font-bold text-primary">KSh {Number(order.total_price).toLocaleString()}</p>
          </div>
        </div>

        {/* People */}
        <div className="space-y-1.5 mb-3">
          {showFarmer && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User className="w-3.5 h-3.5" />
              <span>Farmer: <strong className="text-gray-700">{order.farmer_name}</strong></span>
              {order.farmer_phone && <span>· {order.farmer_phone}</span>}
            </div>
          )}
          {showBuyer && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User className="w-3.5 h-3.5" />
              <span>Buyer: <strong className="text-gray-700">{order.buyer_name}</strong></span>
              {order.buyer_phone && <span>· {order.buyer_phone}</span>}
            </div>
          )}
          {showDriver && order.driver_name && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Truck className="w-3.5 h-3.5" />
              <span>Driver: <strong className="text-gray-700">{order.driver_name}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{date}</span>
          </div>
        </div>

        {/* Mock payment badge */}
        {order.mock_payment_id && (
          <div className="bg-green-50 rounded-lg px-3 py-1.5 mb-3">
            <p className="text-xs text-green-700 font-mono">
              Payment: {order.mock_payment_id}
            </p>
          </div>
        )}

        {order.farmer_paid && (
          <div className="bg-emerald-50 rounded-lg px-3 py-1.5 mb-3">
            <p className="text-xs text-emerald-700 font-medium">✓ Farmer has been paid (mock)</p>
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
