import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getLocalUser } from '../utils/localDataService';
import { isUserOnline, getProductStock, isOutOfStock } from '../utils/marketplaceStore';
import UserAvatar from './UserAvatar';
import {
  X, MapPin, Phone, MessageSquare, Video, ShoppingBag,
  Star, Package, CheckCircle, Loader2
} from 'lucide-react';

export default function SellerProfileModal({ sellerId, onClose, onOrderProduct }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sellerId) return;
    fetchProfile();
  }, [sellerId]);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`profile/${sellerId}/`);
      setProfile(res.data);
    } catch (err) {
      console.error(err);
      // Fallback to local user data
      const localUser = getLocalUser(sellerId);
      if (localUser) {
        setProfile({
          ...localUser,
          products: [],
          completed_sales: 0,
          total_listings: 0,
        });
      } else {
        setError('Could not load seller profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChat = () => {
    onClose();
    navigate(`/chat/${sellerId}`);
  };

  const handleCall = () => {
    if (!isUserOnline(sellerId)) {
      alert('User offline — the farmer is not currently online.');
      return;
    }
    window.dispatchEvent(new CustomEvent('initiate-call', {
      detail: {
        userId: sellerId,
        userName: profile?.full_name || 'Farmer',
        userAvatar: profile?.avatar || '👤',
      },
    }));
  };

  if (!sellerId) return null;

  const online = isUserOnline(sellerId);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-primary/10 overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary-accent to-white px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition"
          >
            <X size={20} />
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : profile && (
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <UserAvatar
                  userId={profile.uid}
                  avatar={profile.avatar}
                  name={profile.full_name}
                  size="lg"
                  className="w-20 h-20 text-3xl border-4 border-white shadow-lg"
                />
                {online && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>

              <h2 className="text-xl font-black text-gray-900 mt-3 leading-tight">
                {profile.full_name}
              </h2>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-0.5 rounded-full mt-1.5">
                {profile.role === 'both' ? 'Farmer & Buyer' : profile.role}
              </span>

              {profile.bio && (
                <p className="text-xs text-gray-600 mt-3 max-w-xs leading-relaxed italic">
                  "{profile.bio}"
                </p>
              )}

              {/* Location & Contact */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs text-gray-500">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-primary" />
                    {profile.city}, Kenya
                  </span>
                )}
                {profile.market && (
                  <span className="flex items-center gap-1">
                    <ShoppingBag size={12} className="text-primary" />
                    {profile.market}
                  </span>
                )}
                {profile.phone_number && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-primary" />
                    {profile.phone_number}
                  </span>
                )}
              </div>

              {/* Stats Row */}
              <div className="flex gap-4 mt-4">
                <div className="bg-white rounded-xl border border-gray-100 px-4 py-2 text-center shadow-sm">
                  <span className="block text-lg font-black text-primary">{profile.total_listings || 0}</span>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">Listings</span>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 px-4 py-2 text-center shadow-sm">
                  <span className="block text-lg font-black text-green-600">{profile.completed_sales || 0}</span>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">Sales</span>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 px-4 py-2 text-center shadow-sm">
                  <span className="block text-lg font-black text-gray-800">
                    {online ? '🟢' : '⚪'}
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">
                    {online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 w-full max-w-xs">
                <button
                  onClick={handleChat}
                  className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 flex items-center justify-center gap-1.5 transition"
                >
                  <MessageSquare size={14} />
                  Chat
                </button>
                <button
                  onClick={handleCall}
                  className="flex-1 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-xl border border-green-200 flex items-center justify-center gap-1.5 transition"
                >
                  <Video size={14} />
                  Video Call
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Products Section */}
        {!loading && !error && profile?.products?.length > 0 && (
          <div className="flex-1 overflow-y-auto px-6 py-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Package size={12} />
              Active Listings ({profile.products.length})
            </h3>
            <div className="space-y-2">
              {profile.products.map((product) => {
                const outOfStock = isOutOfStock(product);
                const stock = getProductStock(product);
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary/20 hover:bg-gray-50/50 transition group"
                  >
                    {/* Product thumbnail */}
                    {product.images?.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary-accent flex items-center justify-center shrink-0">
                        <ShoppingBag size={18} className="text-primary-light" />
                      </div>
                    )}

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{product.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-primary">KES {product.price_per_unit}/{product.unit}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${outOfStock ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                          {outOfStock ? 'Out of Stock' : `${stock} available`}
                        </span>
                      </div>
                    </div>

                    {/* Order button */}
                    {!outOfStock && onOrderProduct && (
                      <button
                        onClick={() => {
                          onClose();
                          onOrderProduct(product);
                        }}
                        className="shrink-0 py-2 px-3 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary-light transition opacity-0 group-hover:opacity-100"
                      >
                        Order
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && !error && profile && (!profile.products || profile.products.length === 0) && (
          <div className="px-6 py-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">No active listings at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
