import React from 'react';
import { Navigate } from 'react-router-dom';

const ROLE_DASHBOARDS = {
  farmer: '/farmer/dashboard',
  buyer: '/buyer/dashboard',
  admin: '/admin/dashboard',
  driver: '/driver/dashboard',
};

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');

  if (!token || !userString) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userString);

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectPath = ROLE_DASHBOARDS[user.role] || '/login';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
