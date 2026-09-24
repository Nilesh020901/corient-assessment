import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { refreshToken, logoutUser } from './redux/slices/authSlice';
import usePermission from './hooks/usePermission';
import PermissionGuard from './components/common/PermissionGuard';
import api from './api/axios';
import Login from './pages/Login';
import SopBuilder from './pages/SopBuilder';
import UserManagement from './pages/UserManagement';
import Projects from './pages/Projects';
import WorkflowBoard from './pages/WorkflowBoard';
import ClientView from './pages/ClientView';
import AuditLog from './pages/AuditLog';

import {
  FolderKanban,
  FileText,
  Users,
  ShieldCheck,
  LogOut,
  User,
  Workflow,
  Bell,
  CheckCheck
} from 'lucide-react';

// Main application skeleton providing navigation header and route container
export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, isInitialized } = useSelector((state) => state.auth);

  // Bonus 3: Notifications Scaffold state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Probe for active session cookie on first application load
  useEffect(() => {
    dispatch(refreshToken());
  }, [dispatch]);

  // Load user notifications when authenticated
  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch {
      // Quiet fail if session expired
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-text-muted)' }}>
        Loading IT Workflow System...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {isAuthenticated && (
        <header style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontWeight: '700', fontSize: '1.125rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Workflow size={20} color="var(--color-primary)" />
              IT Workflow
            </span>
            <nav style={{ display: 'flex', gap: '1.25rem', fontSize: '0.875rem' }}>
              {canReadProjects && (
                <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-main)' }}>
                  <FolderKanban size={15} color="var(--color-text-muted)" />
                  <span>Projects</span>
                </Link>
              )}
              {canReadSop && (
                <Link to="/sop-builder" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-main)' }}>
                  <FileText size={15} color="var(--color-text-muted)" />
                  <span>SOP Builder</span>
                </Link>
              )}
              {canReadUsers && (
                <Link to="/users" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-main)' }}>
                  <Users size={15} color="var(--color-text-muted)" />
                  <span>Users</span>
                </Link>
              )}
              {canReadAudit && (
                <Link to="/audit" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-main)' }}>
                  <ShieldCheck size={15} color="var(--color-text-muted)" />
                  <span>Audit Log</span>
                </Link>
              )}
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Bonus 3: Notifications Bell Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.5rem', position: 'relative' }}
                title="Workflow Notifications"
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: 'var(--color-danger)',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '320px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    zIndex: 1100,
                    maxHeight: '380px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {notifications.length === 0 ? (
                      <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: '0.8rem', fontStyle: 'italic', margin: 0 }}>
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid var(--color-border-subtle)',
                            backgroundColor: n.isRead ? 'transparent' : 'var(--color-primary-light)',
                            fontSize: '0.8rem'
                          }}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.2rem' }}>
                            {n.title}
                          </div>
                          <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                            {n.message}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <User size={14} />
              {user?.name}
            </span>
            <span className="badge badge-blue">
              {user?.role}
            </span>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              <LogOut size={13} />
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
