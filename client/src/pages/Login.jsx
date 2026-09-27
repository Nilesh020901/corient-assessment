import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../redux/slices/authSlice';
import {
  LogIn,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Workflow,
  ShieldCheck,
  UserCheck,
  CheckCircle2
} from 'lucide-react';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user, loading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(null);

  // Guide users directly to their designated workspace immediately following authentication
  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case 'SUPER_ADMIN':
          navigate('/sop-builder');
          break;
        case 'ADMIN':
          navigate('/projects');
          break;
        case 'IT_MEMBER':
          navigate('/workflow-board');
          break;
        case 'CLIENT':
          navigate('/client-view');
          break;
        default:
          navigate('/');
          break;
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    dispatch(loginUser({ email, password }));
  };

  const handleDemoFill = (roleName, demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setSelectedDemo(roleName);
  };

  const demoAccounts = [
    { role: 'SUPER_ADMIN', title: 'Super Admin', email: 'superadmin@workflow.local', pass: 'Password123!', color: '#7e22ce' },
    { role: 'ADMIN', title: 'Administrator', email: 'admin@workflow.local', pass: 'Password123!', color: '#2563eb' },
    { role: 'IT_MEMBER', title: 'IT Member', email: 'itmember@workflow.local', pass: 'Password123!', color: '#16a34a' },
    { role: 'CLIENT', title: 'Client / Ops', email: 'client@workflow.local', pass: 'Password123!', color: '#d97706' }
  ];

  return (
    <div style={{
      maxWidth: '440px',
      margin: '2.5rem auto',
      padding: '0 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    }}>
      <div className="card" style={{ padding: '2.25rem 2rem', boxShadow: 'var(--shadow-lg)' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            margin: '0 auto 1rem',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.28)'
          }}>
            <Workflow size={28} color="#ffffff" strokeWidth={2.4} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.02em' }}>
            IT Workflow System
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Enterprise RBAC Authentication Portal
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem', fontSize: '0.825rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
              <Mail size={13} color="var(--color-text-muted)" />
              <span>Work Email</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@workflow.local"
                required
                style={{ paddingLeft: '2.4rem' }}
              />
              <div style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-subtle)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none'
              }}>
                <Mail size={15} />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
              <Lock size={13} color="var(--color-text-muted)" />
              <span>Password</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{ paddingLeft: '2.4rem', paddingRight: '2.4rem' }}
              />
              <div style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-subtle)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none'
              }}>
                <Lock size={15} />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: '0.35rem',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.65rem 1rem',
              fontSize: '0.9rem',
              fontWeight: 700
            }}
          >
            <LogIn size={16} />
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Accounts Quick-Fill Section */}
        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--color-border-subtle)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              One-Click Demo Accounts
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>
              Click to autofill
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {demoAccounts.map((acc) => {
              const isSelected = selectedDemo === acc.role;
              return (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleDemoFill(acc.role, acc.email, acc.pass)}
                  style={{
                    backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-bg)',
                    border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.45rem 0.6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    gap: '0.15rem',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: acc.color }}>
                      {acc.title}
                    </span>
                    {isSelected && <CheckCircle2 size={12} color="var(--color-primary)" />}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                    {acc.email}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{
        textAlign: 'center',
        color: 'var(--color-text-subtle)',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem'
      }}>
        <ShieldCheck size={14} color="var(--color-success)" />
        <span>Role-Based Access Control • JWT Security Active</span>
      </div>
    </div>
  );
}
