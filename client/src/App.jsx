import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { refreshToken, logoutUser } from './redux/slices/authSlice';
import usePermission from './hooks/usePermission';
import PermissionGuard from './components/common/PermissionGuard';
import Login from './pages/Login';
import SopBuilder from './pages/SopBuilder';
import UserManagement from './pages/UserManagement';
import Projects from './pages/Projects';
import WorkflowBoard from './pages/WorkflowBoard';
import ClientView from './pages/ClientView';
import AuditLog from './pages/AuditLog';

// Main application skeleton providing navigation header and route container
export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, isInitialized } = useSelector((state) => state.auth);

  // Probe for active session cookie on first application load
  useEffect(() => {
    dispatch(refreshToken());
  }, [dispatch]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  // Use permission hooks to conditionally display navigation links
  const canReadSop = usePermission('SOP', 'READ');
  const canReadUsers = usePermission('USERS', 'READ');
  const canReadProjects = usePermission('PROJECTS', 'READ');
  const canReadAudit = usePermission('AUDIT', 'READ');

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>
        Loading IT Workflow System...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {isAuthenticated && (
        <header style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#1e293b' }}>
              IT Workflow
            </span>
            <nav style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
              {canReadProjects && <Link to="/projects">Projects</Link>}
              {canReadSop && <Link to="/sop-builder">SOP Builder</Link>}
              {canReadUsers && <Link to="/users">Users</Link>}
              {canReadAudit && <Link to="/audit">Audit Log</Link>}
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              {user?.name}
            </span>
            <span className="badge badge-blue">
              {user?.role}
            </span>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.35rem 0.75rem' }}>
              Logout
            </button>
          </div>
        </header>
      )}

      <main style={{ flex: 1, padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/" element={
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <h2>Welcome to IT Workflow Management System</h2>
              <p style={{ marginTop: '0.5rem', color: '#64748b' }}>
                {isAuthenticated ? `Logged in as ${user?.role}. Choose a module from the menu.` : 'Please sign in to proceed.'}
              </p>
              {!isAuthenticated && (
                <div style={{ marginTop: '1.5rem' }}>
                  <Link to="/login" className="btn-primary" style={{ display: 'inline-block', padding: '0.5rem 1.5rem' }}>
                    Go to Login
                  </Link>
                </div>
              )}
            </div>
          } />
          <Route path="/login" element={<Login />} />
          <Route
            path="/sop-builder"
            element={
              <PermissionGuard module="SOP" action="READ">
                <SopBuilder />
              </PermissionGuard>
            }
          />
          <Route
            path="/users"
            element={
              <PermissionGuard module="USERS" action="READ">
                <UserManagement />
              </PermissionGuard>
            }
          />
          <Route
            path="/projects"
            element={
              <PermissionGuard module="PROJECTS" action="READ">
                <Projects />
              </PermissionGuard>
            }
          />
          <Route
            path="/workflow-board"
            element={
              <PermissionGuard module="WORKFLOW" action="READ">
                <WorkflowBoard />
              </PermissionGuard>
            }
          />
          <Route
            path="/client-view"
            element={
              <PermissionGuard module="PROJECTS" action="READ">
                <ClientView />
              </PermissionGuard>
            }
          />
          <Route
            path="/audit"
            element={
              <PermissionGuard module="AUDIT" action="READ">
                <AuditLog />
              </PermissionGuard>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
