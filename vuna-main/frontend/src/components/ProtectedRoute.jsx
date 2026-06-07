import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');

  if (!token || !userString) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userString);

  // If the user's role is not in allowedRoles, and their role is not 'both' (which is allowed everywhere)
  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'both') {
    if (user.role === 'farmer') {
      return <Navigate to="/farmer/dashboard" replace />;
    } else {
      return <Navigate to="/buyer/dashboard" replace />;
    }
  }

  return children;
}
