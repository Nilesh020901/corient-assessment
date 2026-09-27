import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAuditLogs } from '../redux/slices/auditSlice';
import {
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  ArrowRightCircle,
  Send,
  History,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Layers,
  User,
  Activity
} from 'lucide-react';

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

  const renderActionBadge = (act) => {
    switch (act) {
      case 'CREATE':
        return (
          <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
            <Plus size={11} strokeWidth={2.5} />
            <span>CREATE</span>
          </span>
        );
      case 'UPDATE':
        return (
          <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
            <Pencil size={11} strokeWidth={2.5} />
            <span>UPDATE</span>
          </span>
        );
      case 'DELETE':
        return (
          <span className="badge badge-red" style={{ fontSize: '0.72rem' }}>
            <Trash2 size={11} strokeWidth={2.5} />
            <span>DELETE</span>
          </span>
        );
      case 'STATUS_CHANGE':
        return (
          <span className="badge badge-yellow" style={{ fontSize: '0.72rem' }}>
            <ArrowRightCircle size={11} strokeWidth={2.5} />
            <span>STATUS CHANGE</span>
          </span>
        );
      case 'PUBLISH':
        return (
          <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
            <Send size={11} strokeWidth={2.5} />
            <span>PUBLISH</span>
          </span>
        );
      default:
        return (
          <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
            <History size={11} strokeWidth={2.5} />
            <span>{act}</span>
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2>System Audit Trail</h2>
            <span className="badge badge-blue">
              <ShieldCheck size={11} />
              <span>Immutable</span>
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.15rem' }}>
            Tamper-evident chronological record of all create, update, delete, and workflow state transitions
          </p>
        </div>

        <span className="badge badge-gray" style={{ fontSize: '0.78rem' }}>
          {total} Total Audit Records
        </span>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <form onSubmit={handleFilterSubmit} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-end'
        }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Layers size={13} color="var(--color-text-muted)" />
              <span>Entity Type</span>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Activity size={13} color="var(--color-text-muted)" />
              <span>Action Performed</span>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={13} color="var(--color-text-muted)" />
              <span>From Date</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={13} color="var(--color-text-muted)" />
              <span>To Date</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              <Filter size={14} />
              <span>Filter</span>
            </button>
            <button type="button" onClick={handleResetFilters} className="btn-secondary">
              <RotateCcw size={14} />
              <span>Reset</span>
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
              <th>Previous State</th>
              <th>New State</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3.5rem 1rem' }}>
                  <ShieldCheck size={36} color="var(--color-text-subtle)" style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.6 }} />
                  <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                    {loading ? 'Querying audit records...' : 'No audit records match the current filter'}
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    Adjust or reset filter parameters to view the broader historical log.
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.7rem' }}>
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>
                      <User size={13} color="var(--color-text-muted)" />
                      <span>{log.actor?.name || 'System / Automated'}</span>
                    </div>
                  </td>
                  <td>
                    {renderActionBadge(log.action)}
                  </td>
                  <td>
                    <span className="badge badge-gray" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                      {log.entityType}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', display: 'block', marginTop: '0.15rem' }}>
                      #{log.entityId}
                    </span>
                  </td>
                  <td style={{ maxWidth: '240px' }}>
                    {log.oldValue ? (
                      <pre style={{
                        margin: 0,
                        fontSize: '0.7rem',
                        maxHeight: '85px',
                        overflowY: 'auto',
                        backgroundColor: 'var(--color-bg)',
                        border: '1px solid var(--color-border-subtle)',
                        padding: '0.4rem',
                        borderRadius: 'var(--radius-xs)',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'monospace'
                      }}>
                        {JSON.stringify(log.oldValue, null, 2)}
                      </pre>
                    ) : (
                      <span style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ maxWidth: '240px' }}>
                    {log.newValue ? (
                      <pre style={{
                        margin: 0,
                        fontSize: '0.7rem',
                        maxHeight: '85px',
                        overflowY: 'auto',
                        backgroundColor: 'var(--color-bg)',
                        border: '1px solid var(--color-border-subtle)',
                        padding: '0.4rem',
                        borderRadius: 'var(--radius-xs)',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'monospace'
                      }}>
                        {JSON.stringify(log.newValue, null, 2)}
                      </pre>
                    ) : (
                      <span style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        fontSize: '0.85rem',
        color: 'var(--color-text-muted)'
      }}>
        <span>
          Showing page <strong>{page}</strong> of <strong>{totalPages || 1}</strong> ({total} total audit records)
        </span>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => loadLogs(page - 1)}
            disabled={page <= 1 || loading}
            className="btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>
          <button
            onClick={() => loadLogs(page + 1)}
            disabled={page >= totalPages || loading}
            className="btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
