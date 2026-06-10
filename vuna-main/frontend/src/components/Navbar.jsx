import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, User, MessageSquare, LayoutDashboard } from 'lucide-react';
import api from '../utils/api';

const ROLE_DASHBOARDS = {
  farmer: '/farmer/dashboard',
  buyer: '/buyer/dashboard',
  admin: '/admin/dashboard',
  driver: '/driver/dashboard',
};

const ROLE_LABELS = {
  farmer: 'Farmer',
  buyer: 'Buyer',
  admin: 'Admin',
  driver: 'Driver',
};

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try { setUser(JSON.parse(userStr)); } catch { setUser(null); }
    } else {
      setUser(null);
    }
  }, [location.pathname]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMobileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    try { await api.post('logout/'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const isAuth = !!user;
  const dashboardPath = user ? ROLE_DASHBOARDS[user.role] || '/' : '/';
  const isOnAuth = ['/login', '/signup'].includes(location.pathname);

  if (isOnAuth) return null; // Hide navbar on auth pages

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6" ref={menuRef}>
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to={dashboardPath} className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Vuna
            </span>
            {user && (
              <span className="hidden sm:inline-block text-xs bg-primary-accent text-primary px-2 py-0.5 rounded-full font-medium ml-1">
                {ROLE_LABELS[user.role]}
              </span>
            )}
          </Link>

          {/* Desktop Nav */}
          {isAuth && (
            <div className="hidden md:flex items-center gap-1">
              <NavLink to={dashboardPath} icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active={location.pathname === dashboardPath} />
              {(user.role === 'farmer' || user.role === 'buyer') && (
                <NavLink to="/chat" icon={<MessageSquare className="w-4 h-4" />} label="Messages" active={location.pathname.startsWith('/chat')} />
              )}
              <NavLink to="/profile" icon={<User className="w-4 h-4" />} label="Profile" active={location.pathname === '/profile'} />

              <div className="w-px h-6 bg-gray-200 mx-2" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          {isAuth && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        {mobileOpen && isAuth && (
          <div className="md:hidden border-t border-gray-100 py-3 animate-slideDown">
            <div className="space-y-1">
              {/* Role badge */}
              <div className="px-3 py-2 mb-2">
                <p className="text-xs text-gray-400">Signed in as</p>
                <p className="text-sm font-semibold text-gray-900">{user.full_name}</p>
                <span className="inline-block text-xs bg-primary-accent text-primary px-2 py-0.5 rounded-full font-medium mt-1">
                  {ROLE_LABELS[user.role]}
                </span>
              </div>

              <MobileNavLink to={dashboardPath} icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
              {(user.role === 'farmer' || user.role === 'buyer') && (
                <MobileNavLink to="/chat" icon={<MessageSquare className="w-4 h-4" />} label="Messages" />
              )}
              <MobileNavLink to="/profile" icon={<User className="w-4 h-4" />} label="Profile" />

              <div className="border-t border-gray-100 my-2" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

function NavLink({ to, icon, label, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
        active
          ? 'bg-primary-accent text-primary font-medium'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function MobileNavLink({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
