import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchUsers,
  fetchRoles,
  createUser,
  updateUser,
  deactivateUser,
  reassignStages,
  closeReassignModal,
  clearUserMessages
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
  RefreshCw
} from 'lucide-react';

// Provide user administration, role assignment, and the mandatory 409 reassignment deactivation safeguard
export default function UserManagement() {
  const dispatch = useDispatch();
  const { users, roles, loading, error, successMessage, reassignModal } = useSelector((state) => state.users);

  const canCreate = usePermission('USERS', 'CREATE');
  const canUpdate = usePermission('USERS', 'UPDATE');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

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
      await dispatch(createUser({ name, email, password, roleId }));
      setShowCreateModal(false);
    }
  };

  const handleDeactivate = (userId) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>User Management</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Manage staff accounts, assign system roles, and safely handle employee deactivations
          </p>
        </div>

        {canCreate && (
          <button onClick={handleOpenCreate} className="btn-primary">
            <UserPlus size={15} />
            Add New User
          </button>
        )}
      </div>

      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* User Roster Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-subtle)', padding: '2.5rem' }}>
                  <Users size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.6 }} />
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{u.email}</td>
                  <td>
                    <span className="badge badge-blue">
                      {u.role?.name || 'No Role'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'}`}>
                      {u.isActive ? <Check size={11} /> : <X size={11} />}
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      {canUpdate && (
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                      )}

                      {canUpdate && u.isActive && (
                        <button
                          onClick={() => handleDeactivate(u.id)}
                          className="btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          disabled={loading}
                        >
                          <UserX size={12} />
                          Deactivate
                        </button>
                      )}

                      {canUpdate && !u.isActive && (
                        <button
                          onClick={() => handleActivate(u.id)}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-success)' }}
                          disabled={loading}
                        >
                          <UserCheck size={12} />
                          Activate
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
            <h3 style={{ marginBottom: '1rem' }}>
              {editingUser ? 'Edit User Account' : 'Create New User Account'}
            </h3>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>

              {!editingUser && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Role Assignment
                </label>
                <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
                  <option value="">Select a role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
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
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 409 Conflict Reassignment Modal */}
      {reassignModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={20} color="var(--color-danger)" />
              <h3 style={{ margin: 0, color: 'var(--color-danger)' }}>Cannot Deactivate: Active Stages Assigned</h3>
            </div>

            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              <strong>{reassignModal.userToDeactivate?.name}</strong> is currently assigned to the following active workflow stages. You must reassign these stages to another active user before deactivation can proceed.
            </p>

            {reassignModal.error && (
              <div className="alert alert-error" style={{ padding: '0.5rem', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                <AlertCircle size={14} />
                <span>{reassignModal.error}</span>
              </div>
            )}

            {/* List of Blocking Active Assignments */}
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px', marginBottom: '1rem' }}>
              <table style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Stage</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reassignModal.activeAssignments.map((a) => (
                    <tr key={a.stageId}>
                      <td style={{ fontWeight: 500 }}>{a.projectName}</td>
                      <td>{a.stageName}</td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Reassign All Stages To:
              </label>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
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
                <RefreshCw size={13} />
                {reassignModal.loading ? 'Reassigning & Deactivating...' : 'Reassign & Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
