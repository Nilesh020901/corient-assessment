import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import usePermission from '../../hooks/usePermission';

// Gate access to components and routes strictly using granular permissions rather than role names
export const PermissionGuard = ({ module, action, children, fallback = null }) => {
  const { isAuthenticated, isInitialized } = useSelector((state) => state.auth);
  const hasPermission = usePermission(module, action);

  // Wait until session refresh completes on page reloads before making routing decisions
  if (!isInitialized) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        Verifying authorization...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission) {
    if (fallback) return fallback;
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <h3>Access Denied</h3>
        <p>You do not possess the required permission [{module}:{action}] to view this page.</p>
      </div>
    );
  }

  return children;
};

export default PermissionGuard;
