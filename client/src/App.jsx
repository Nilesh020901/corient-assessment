import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { refreshToken, logoutUser } from './redux/slices/authSlice';
import usePermission from './hooks/usePermission';
import PermissionGuard from './components/common/PermissionGuard';
import StatusBadge from './components/common/StatusBadge';
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
  Workflow,
  Bell,
  CheckCheck,
  Menu,
  X,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';

export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isInitialized } = useSelector((state) => state.auth);

  // Bonus 3: Notifications Scaffold state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Probe for active session cookie on first application load
  useEffect(() => {
    dispatch(refreshToken());
  }, [dispatch]);

  // Close mobile menu whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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

  // Derive user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Permission hooks for navigation visibility
  const canReadSop = usePermission('SOP', 'READ');
  const canReadUsers = usePermission('USERS', 'READ');
  const canReadProjects = usePermission('PROJECTS', 'READ');
  const canReadAudit = usePermission('AUDIT', 'READ');
  const isClientRole = user?.role === 'CLIENT';

  const navLinks = [
    ...(canReadProjects && !isClientRole ? [{ to: '/projects', label: 'Projects', icon: FolderKanban }] : []),
    ...(isClientRole ? [{ to: '/client-view', label: 'Delivery Portal', icon: Layers }] : []),
    ...(canReadSop ? [{ to: '/sop-builder', label: 'SOP Builder', icon: FileText }] : []),
    ...(canReadUsers ? [{ to: '/users', label: 'Users & Roles', icon: Users }] : []),
    ...(canReadAudit ? [{ to: '/audit', label: 'Audit Trail', icon: ShieldCheck }] : [])
  ];

  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--color-bg)',
        gap: '1rem'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 16px rgba(37, 99, 235, 0.3)',
          animation: 'pulseGlow 2s infinite'
        }}>
          <Workflow size={28} color="#ffffff" />
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
          Initializing IT Workflow Enterprise...
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
      {isAuthenticated && (
        <header style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 900,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{
            maxWidth: '1360px',
            margin: '0 auto',
            padding: '0.65rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {/* Left Brand & Desktop Nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.28)'
                }}>
                  <Workflow size={20} color="#ffffff" strokeWidth={2.4} />
                </div>
                <div>
                  <div style={{
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    letterSpacing: '-0.02em',
                    color: 'var(--color-text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    lineHeight: 1.2
                  }}>
                    IT Workflow
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      backgroundColor: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      padding: '0.12rem 0.4rem',
                      borderRadius: '4px'
                    }}>
                      PRO
                    </span>
                  </div>
                </div>
              </Link>

              {/* Desktop Nav Items */}
              <nav className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 600 : 500,
                        padding: '0.45rem 0.8rem',
                        borderRadius: 'var(--radius-md)',
                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                        transition: 'all var(--transition-fast)',
                        textDecoration: 'none'
                      }}
                    >
                      <Icon size={16} strokeWidth={isActive ? 2.3 : 1.9} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Controls: Notifications, User Chip & Mobile Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {/* Notifications Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="btn-secondary"
                  style={{
                    width: '38px',
                    height: '38px',
                    padding: 0,
                    borderRadius: 'var(--radius-md)',
                    position: 'relative'
                  }}
                  title="Workflow Notifications"
                >
                  <Bell size={17} color={unreadCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      backgroundColor: 'var(--color-danger)',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      minWidth: '17px',
                      height: '17px',
                      borderRadius: 'var(--radius-full)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 2px',
                      boxShadow: '0 0 0 2px #ffffff'
                    }}>
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
                      width: '340px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-xl)',
                      zIndex: 1100,
                      maxHeight: '420px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      animation: 'slideUp 0.15s ease-out'
                    }}
                  >
                    <div style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--color-bg-alt)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Notifications</span>
                        {unreadCount > 0 && (
                          <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <CheckCheck size={13} />
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                          <Bell size={28} color="var(--color-text-subtle)" style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.825rem', margin: 0 }}>
                            No notifications right now.
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            style={{
                              padding: '0.85rem 1rem',
                              borderBottom: '1px solid var(--color-border-subtle)',
                              backgroundColor: n.isRead ? 'transparent' : 'var(--color-primary-light)',
                              fontSize: '0.8125rem',
                              transition: 'background var(--transition-fast)'
                            }}
                          >
                            <div style={{
                              fontWeight: 600,
                              color: 'var(--color-text-main)',
                              marginBottom: '0.2rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <span>{n.title}</span>
                              {!n.isRead && (
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
                              )}
                            </div>
                            <div style={{ color: 'var(--color-text-secondary)', marginBottom: '0.4rem', lineHeight: 1.35 }}>
                              {n.message}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span>•</span>
                              <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Pill (Desktop) */}
              <div className="hide-on-mobile" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.3rem 0.5rem 0.3rem 0.4rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  boxShadow: 'var(--shadow-xs)'
                }}>
                  {getUserInitials(user?.name)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                    {user?.name}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                    {user?.role}
                  </span>
                </div>

                <StatusBadge status={user?.role} size="sm" />

                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                  style={{
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.75rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--color-border)'
                  }}
                  title="Sign out"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="btn-secondary show-on-mobile"
                style={{
                  display: 'none',
                  width: '38px',
                  height: '38px',
                  padding: 0
                }}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Drawer */}
          {mobileMenuOpen && (
            <div style={{
              backgroundColor: 'var(--color-surface)',
              borderTop: '1px solid var(--color-border)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: 'var(--shadow-lg)'
            }}>
              {/* User info in mobile menu */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--color-border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}>
                    {getUserInitials(user?.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{user?.email}</div>
                  </div>
                </div>
                <StatusBadge status={user?.role} size="sm" />
              </div>

              {/* Mobile Nav Links */}
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
                        backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                        textDecoration: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <Icon size={17} strokeWidth={isActive ? 2.3 : 1.9} />
                        <span>{link.label}</span>
                      </div>
                      <ChevronRight size={15} color="var(--color-text-subtle)" />
                    </Link>
                  );
                })}
              </nav>

              <button
                onClick={handleLogout}
                className="btn-danger"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.6rem' }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </header>
      )}

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: '1.75rem 1.25rem',
        maxWidth: '1360px',
        margin: '0 auto',
        width: '100%'
      }}>
        <Routes>
          <Route path="/" element={
            <div className="card" style={{
              maxWidth: '680px',
              margin: '2rem auto',
              textAlign: 'center',
              padding: '3rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.28)'
              }}>
                <Sparkles size={32} color="#ffffff" />
              </div>
              <div>
                <h2>Enterprise IT Workflow System</h2>
                <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.925rem', maxWidth: '480px' }}>
                  {isAuthenticated
                    ? `Welcome back, ${user?.name}. You are logged in with ${user?.role} privileges. Access your workspace via the navigation bar.`
                    : 'A comprehensive, role-governed workflow orchestrator featuring immutable SOP version snapshots and live tracking.'}
                </p>
              </div>

              {!isAuthenticated ? (
                <Link to="/login" className="btn-primary" style={{ padding: '0.65rem 1.75rem', fontSize: '0.9rem' }}>
                  Go to Secure Login
                </Link>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link key={link.to} to={link.to} className="btn-secondary" style={{ padding: '0.55rem 1.1rem' }}>
                        <Icon size={16} />
                        <span>Open {link.label}</span>
                      </Link>
                    );
                  })}
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
