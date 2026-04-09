import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('erp_access_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const payloadInfo = JSON.parse(atob(token.split('.')[1]));
    if (!allowedRoles.includes(payloadInfo.role)) {
      // Redirect to their actual role dashboard if they try to access someone else's
      return <Navigate to={`/${payloadInfo.role.toLowerCase()}`} replace />;
    }
  } catch (err) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
