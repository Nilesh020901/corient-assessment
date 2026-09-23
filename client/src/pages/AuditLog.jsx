import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAuditLogs } from '../redux/slices/auditSlice';

// Provide an immutable, display-only audit trail to inspect historical events across the platform
export default function AuditLog() {
  const dispatch = useDispatch();
  const { logs, total, page, limit, totalPages, loading, error } = useSelector((state) => state.audit);

  // Filter criteria states
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadLogs = (targetPage = 1) => {
    dispatch(fetchAuditLogs({
      page: targetPage,
      limit,
      entityType,
      action,
      startDate,
      endDate
    }));
  };

  useEffect(() => {
    loadLogs(1);
  }, [dispatch]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadLogs(1);
  };

  const handleResetFilters = () => {
    setEntityType('');
    setAction('');
    setStartDate('');
    setEndDate('');
    dispatch(fetchAuditLogs({ page: 1, limit }));
  };

  const getActionBadgeClass = (act) => {
    switch (act) {
      case 'CREATE': return 'badge-green';
      case 'UPDATE': return 'badge-blue';
      case 'DELETE': return 'badge-red';
      case 'STATUS_CHANGE': return 'badge-yellow';
      case 'PUBLISH': return 'badge-blue';
      default: return 'badge-gray';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2>System Audit Trail</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Immutable log of all create, update, delete, and workflow state transitions across the platform
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card">
        <form onSubmit={handleFilterSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              ENTITY TYPE
            </label>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">All Entities</option>
              <option value="USER">USER</option>
              <option value="SOP">SOP</option>
              <option value="PROJECT">PROJECT</option>
              <option value="STAGE">STAGE</option>
              <option value="ROLE">ROLE</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              ACTION
            </label>
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="STATUS_CHANGE">STATUS CHANGE</option>
              <option value="PUBLISH">PUBLISH</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              FROM DATE
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              TO DATE
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              Filter
            </button>
            <button type="button" onClick={handleResetFilters} className="btn-secondary">
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Paginated Audit Log Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Old Value</th>
              <th>New Value</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '2.5rem' }}>
                  {loading ? 'Loading audit records...' : 'No audit entries match the current filter criteria.'}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: '#64748b' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    {log.actor?.name || 'System / Automated'}
                  </td>
                  <td>
                    <span className={`badge ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <strong>{log.entityType}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                      ID: {log.entityId}
                    </span>
                  </td>
                  <td style={{ maxWidth: '240px' }}>
                    {log.oldValue ? (
                      <pre style={{ margin: 0, fontSize: '0.7rem', maxHeight: '80px', overflowY: 'auto', backgroundColor: '#f1f5f9', padding: '0.35rem', borderRadius: '4px' }}>
                        {JSON.stringify(log.oldValue, null, 2)}
                      </pre>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>none</span>
                    )}
                  </td>
                  <td style={{ maxWidth: '240px' }}>
                    {log.newValue ? (
                      <pre style={{ margin: 0, fontSize: '0.7rem', maxHeight: '80px', overflowY: 'auto', backgroundColor: '#f1f5f9', padding: '0.35rem', borderRadius: '4px' }}>
                        {JSON.stringify(log.newValue, null, 2)}
                      </pre>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>none</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: '#64748b' }}>
        <span>
          Showing page <strong>{page}</strong> of <strong>{totalPages || 1}</strong> ({total} total audit entries)
        </span>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => loadLogs(page - 1)}
            disabled={page <= 1 || loading}
            className="btn-secondary"
          >
            ← Previous
          </button>
          <button
            onClick={() => loadLogs(page + 1)}
            disabled={page >= totalPages || loading}
            className="btn-secondary"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
