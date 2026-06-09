import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import FarmerDashboard from './pages/FarmerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import ChatPage from './pages/ChatPage';
import MyOrders from './pages/MyOrders';
import About from './pages/About';
import Terms from './pages/Terms';
import Team from './pages/Team';

// Root redirect handler based on authenticated role
function RootRedirect() {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');

  if (!token || !userString) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userString);
  if (user.role === 'farmer') {
    return <Navigate to="/farmer/dashboard" replace />;
  } else {
    return <Navigate to="/buyer/dashboard" replace />;
  }
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-primary-bg flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Role-specific Routes */}
            <Route
              path="/farmer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <FarmerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['buyer']}>
                  <BuyerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:userId"
              element={
                <ProtectedRoute allowedRoles={['farmer', 'buyer', 'both']}>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-orders"
              element={
                <ProtectedRoute allowedRoles={['buyer', 'both']}>
                  <MyOrders />
                </ProtectedRoute>
              }
            />

            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/team" element={<Team />} />

            {/* Root Redirection */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* Fallback to Root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
