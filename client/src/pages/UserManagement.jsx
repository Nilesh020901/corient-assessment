import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchUsers,
  fetchRoles,
  createUser,
  updateUser,
  deactivateUser,
  reassignStages,
  closeReassignModal
} from '../redux/slices/usersSlice';
import usePermission from '../hooks/usePermission';
import StatusBadge from '../components/common/StatusBadge';
import {
  UserPlus,
  Pencil,
  UserX,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  Check,
  X,
  RefreshCw,
  Search,
  Mail,
  Lock,
  Shield,
  User as UserIcon,
  Filter
} from 'lucide-react';

export default function UserManagement() {
  const dispatch = useDispatch();
  const { users, roles, loading, error, successMessage, reassignModal } = useSelector((state) => state.users);

  const canCreate = usePermission('USERS', 'CREATE');
  const canUpdate = usePermission('USERS', 'UPDATE');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');

  // Reassignment target
  const [targetUserId, setTargetUserId] = useState('');

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchRoles());
  }, [dispatch]);

  const handleOpenCreate = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRoleId(roles[0]?.id || '');
    setShowCreateModal(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRoleId(user.roleId || roles.find((r) => r.name === user.role?.name)?.id || '');
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (editingUser) {
      await dispatch(updateUser({
        id: editingUser.id,
        updateData: { name, email, roleId }
      }));
      setEditingUser(null);
    } else {
      if (!password) return;
      await dispatch(createUser({ name, email, password, roleId }));
      setShowCreateModal(false);
    }
  };

  const handleDeactivate = (userId, userName) => {
    if (window.confirm(`Are you sure you want to deactivate ${userName}? If they have active workflow stages, reassignment will be required.`)) {
      dispatch(deactivateUser(userId));
    }
  };

  const handleActivate = (userId) => {
    dispatch(updateUser({
      id: userId,
      updateData: { isActive: true }
    }));
  };

  // Reassign all active stages and immediately retry user deactivation once clear
  const handleReassignAndDeactivate = async () => {
    if (!targetUserId || !reassignModal.userToDeactivate) return;

    const userId = reassignModal.userToDeactivate.id;
    const reassignResult = await dispatch(reassignStages({ userId, targetUserId }));

    if (!reassignResult.error) {
      // Reassignment succeeded; immediately retry deactivation
      dispatch(deactivateUser(userId));
    }
  };

  // Filter candidates who can take over orphaned stage assignments (active accounts only)
  const eligibleAssignees = users.filter(
    (u) => u.isActive && u.id !== reassignModal.userToDeactivate?.id
  );

  const getUserInitials = (userName) => {
    if (!userName) return '?';
    const p = userName.trim().split(' ');
    if (p.length >= 2) return `${p[0][0]}${p[1][0]}`.toUpperCase();
    return userName.slice(0, 2).toUpperCase();
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    const matchesRole = !roleFilter || (u.role?.name === roleFilter);
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header and Add User */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>User & Access Control</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.15rem' }}>
            Staff directory, RBAC privilege assignment, and safe 409 stage reassignment guard
          </p>
        </div>

        {canCreate && (
          <button onClick={handleOpenCreate} className="btn-primary">
            <UserPlus size={16} strokeWidth={2.4} />
            <span>New User Account</span>
          </button>
        )}
      </div>

      {/* KPI Stat Cards */}
      <div className="grid-responsive-stats">
        <div className="stat-card">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Accounts
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
              {users.length}
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Users size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Staff
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
              {users.filter((u) => u.isActive).length}
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            <UserCheck size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              System Roles
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
              {roles.length}
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
            <Shield size={22} />
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', maxWidth: '500px' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.3rem' }}
            />
            <div style={{
              position: 'absolute',
              left: '0.8rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-subtle)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none'
            }}>
              <Search size={15} />
            </div>
          </div>

          <div style={{ width: '170px' }}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users
        </div>
      </div>

      {/* User Roster Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>System Role</th>
              <th>Account Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3.5rem 1rem' }}>
                  <Users size={36} color="var(--color-text-subtle)" style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
                  <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>No users match your criteria</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Try clearing the search or filter.</div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: u.isActive
                          ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                          : '#cbd5e1',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {getUserInitials(u.name)}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '0.875rem' }}>
                        {u.name}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                    {u.email}
                  </td>
                  <td>
                    <StatusBadge status={u.role?.name || 'USER'} label={u.role?.name || 'No Role'} size="sm" />
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.7rem' }}>
                      {u.isActive ? <Check size={11} /> : <X size={11} />}
                      <span>{u.isActive ? 'Active' : 'Deactivated'}</span>
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      {canUpdate && (
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', gap: '0.3rem' }}
                        >
                          <Pencil size={13} />
                          <span>Edit</span>
                        </button>
                      )}

                      {canUpdate && u.isActive && (
                        <button
                          onClick={() => handleDeactivate(u.id, u.name)}
                          className="btn-danger"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', gap: '0.3rem' }}
                          disabled={loading}
                          title="Safeguard will trigger if active workflow stages are owned"
                        >
                          <UserX size={13} />
                          <span>Deactivate</span>
                        </button>
                      )}

                      {canUpdate && !u.isActive && (
                        <button
                          onClick={() => handleActivate(u.id)}
                          className="btn-success"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', gap: '0.3rem' }}
                          disabled={loading}
                        >
                          <UserCheck size={13} />
                          <span>Reactivate</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit User Modal */}
      {(showCreateModal || editingUser) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  {editingUser ? 'Edit User Account' : 'Create New User Account'}
                </h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.825rem', marginTop: '0.2rem' }}>
                  {editingUser ? 'Update account details and role permissions.' : 'Provision credentials and access role for new staff.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingUser(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>

              <div>
                <label>Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@workflow.local"
                  required
                />
              </div>

              {!editingUser && (
                <div>
                  <label>Initial Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />
                </div>
              )}

              <div>
                <label>System Role *</label>
                <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
                  <option value="">-- Choose a Role --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} - {r.description || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingUser(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Check size={14} />
                  <span>{editingUser ? 'Save Updates' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 409 Conflict Reassignment Modal */}
      {reassignModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-danger)',
                flexShrink: 0
              }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-danger)' }}>
                  Deactivation Safeguard Triggered
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  HTTP 409 Active Stage Assignment Guard
                </span>
              </div>
            </div>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.4 }}>
              <strong>{reassignModal.userToDeactivate?.name}</strong> is currently assigned to the following active workflow stages. You must reassign these stages to another active member before this account can be safely deactivated.
            </p>

            {reassignModal.error && (
              <div className="alert alert-error" style={{ padding: '0.65rem', fontSize: '0.8rem', marginBottom: '0.85rem' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{reassignModal.error}</span>
              </div>
            )}

            {/* List of Blocking Active Assignments */}
            <div className="table-container" style={{ maxHeight: '180px', marginBottom: '1rem' }}>
              <table style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Stage Name</th>
                    <th>Current Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reassignModal.activeAssignments.map((a) => (
                    <tr key={a.stageId}>
                      <td style={{ fontWeight: 600 }}>{a.projectName}</td>
                      <td>{a.stageName}</td>
                      <td>
                        <StatusBadge status={a.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <label>Reassign All Owned Stages To: *</label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                required
              >
                <option value="">-- Choose an active team member --</option>
                {eligibleAssignees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role?.name})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => dispatch(closeReassignModal())}
                className="btn-secondary"
                disabled={reassignModal.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassignAndDeactivate}
                className="btn-danger"
                disabled={!targetUserId || reassignModal.loading}
              >
                <RefreshCw size={14} className={reassignModal.loading ? 'animate-spin' : ''} />
                <span>{reassignModal.loading ? 'Reassigning...' : 'Reassign & Deactivate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
