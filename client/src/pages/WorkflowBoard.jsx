import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  fetchProjectStages,
  updateStageStatus,
  optimisticStatusChange,
  fetchStageHistory,
  selectWorkflowStats,
  clearStageToast
} from '../redux/slices/stagesSlice';
import { fetchProjects } from '../redux/slices/projectsSlice';
import usePermission from '../hooks/usePermission';

// Provide IT Team Members with interactive stage cards, optimistic status transitions, and history auditing
export default function WorkflowBoard() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { projects } = useSelector((state) => state.projects);
  const { project, stages, history, loading, toastMessage } = useSelector((state) => state.stages);

  // Derive workflow completion analytics using the memoized selector
  const stats = useSelector(selectWorkflowStats);

  const canUpdateStatus = usePermission('WORKFLOW', 'STATUS_UPDATE');

  const selectedProjectId = searchParams.get('projectId') || projects[0]?.id || '';

  // Modal states
  const [selectedStage, setSelectedStage] = useState(null);
  const [status, setStatus] = useState('NOT_STARTED');
  const [blocker, setBlocker] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    if (selectedProjectId) {
      dispatch(fetchProjectStages(selectedProjectId));
    }
  }, [dispatch, selectedProjectId]);

  const handleSelectProject = (e) => {
    const pId = e.target.value;
    setSearchParams({ projectId: pId });
  };

  const handleOpenStatusModal = (stage) => {
    setSelectedStage(stage);
    setStatus(stage.status);
    setBlocker(stage.blocker || '');
    setHoldReason(stage.holdReason || '');
    setCompletionDate(stage.completionDate ? stage.completionDate.split('T')[0] : '');
    setRemarks(stage.remarks || '');
    setShowHistory(false);
  };

  // Perform optimistic update locally, immediately close modal, and dispatch network request in background
  const handleSubmitStatus = (e) => {
    e.preventDefault();
    if (!selectedStage || !selectedProjectId) return;

    // Validate conditional requirements before firing updates
    if (status === 'BLOCKED' && !blocker.trim()) {
      alert('A blocker explanation is required when setting status to Blocked');
      return;
    }
    if (status === 'ON_HOLD' && !holdReason.trim()) {
      alert('A reason is required when setting status to On Hold');
      return;
    }
    if (status === 'COMPLETED' && !completionDate) {
      alert('A completion date is required when setting status to Completed');
      return;
    }

    const payload = {
      status,
      blocker: status === 'BLOCKED' ? blocker.trim() : null,
      holdReason: status === 'ON_HOLD' ? holdReason.trim() : null,
      completionDate: status === 'COMPLETED' ? completionDate : null,
      remarks: remarks.trim() || null
    };

    // Keep snapshot for state rollback if server rejects
    const previousStage = { ...selectedStage };

    // 1. Instantly mutate local state for zero latency UI update
    dispatch(optimisticStatusChange({
      stageId: selectedStage.id,
      ...payload
    }));

    // 2. Dispatch async thunk to persist change on backend
    dispatch(updateStageStatus({
      projectId: selectedProjectId,
      stageId: selectedStage.id,
      payload,
      previousStage
    }));

    setSelectedStage(null);
  };

  const handleViewHistory = (stageId) => {
    setShowHistory(!showHistory);
    if (!showHistory && (!history[stageId] || history[stageId].length === 0)) {
      dispatch(fetchStageHistory({ projectId: selectedProjectId, stageId }));
    }
  };

  // Status badge styling helper
  const getBadgeClass = (st) => {
    switch (st) {
      case 'COMPLETED': return 'badge-green';
      case 'IN_PROGRESS': return 'badge-blue';
      case 'ON_HOLD': return 'badge-yellow';
      case 'BLOCKED': return 'badge-red';
      default: return 'badge-gray';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Workflow Board</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Track stage progress, inspect ownership, and record manual status transitions
          </p>
        </div>

        {/* Project Selector */}
        <div style={{ minWidth: '260px' }}>
          <select value={selectedProjectId} onChange={handleSelectProject}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Toast Alert for Optimistic Update Confirmations / Rollbacks */}
      {toastMessage && (
        <div
          style={{
            backgroundColor: toastMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: toastMessage.type === 'success' ? '#166534' : '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{toastMessage.text}</span>
          <button
            onClick={() => dispatch(clearStageToast())}
            style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Workflow Stats Bar Calculated via createSelector */}
      {project && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{project.name}</span>
              <span style={{ color: '#64748b', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                (SOP v{project.sopVersion?.versionNumber || '1'})
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-gray">Not Started: {stats.notStarted}</span>
              <span className="badge badge-blue">In Progress: {stats.inProgress}</span>
              <span className="badge badge-yellow">On Hold: {stats.onHold}</span>
              <span className="badge badge-red">Blocked: {stats.blocked}</span>
              <span className="badge badge-green">Completed: {stats.completed}</span>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#475569' }}>
              <span>WORKFLOW COMPLETION</span>
              <span>{stats.percentComplete}% ({stats.completed} of {stats.total} stages)</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${stats.percentComplete}%`,
                  height: '100%',
                  backgroundColor: stats.percentComplete === 100 ? '#10b981' : '#2563eb',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stage Cards Grid */}
      {stages.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          No workflow stages found for this project.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
                borderLeft: `4px solid ${
                  stage.status === 'COMPLETED' ? '#10b981' :
                  stage.status === 'BLOCKED' ? '#ef4444' :
                  stage.status === 'ON_HOLD' ? '#f59e0b' :
                  stage.status === 'IN_PROGRESS' ? '#3b82f6' : '#cbd5e1'
                }`,
                cursor: canUpdateStatus ? 'pointer' : 'default'
              }}
              onClick={() => canUpdateStatus && handleOpenStatusModal(stage)}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    STAGE {stage.order}
                  </span>
                  <span className={`badge ${getBadgeClass(stage.status)}`}>
                    {stage.status.replace('_', ' ')}
                  </span>
                </div>

                <h4 style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                  {stage.name}
                </h4>

                {/* Conditional Blocker or Hold Alert Badges */}
                {stage.status === 'BLOCKED' && stage.blocker && (
                  <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    <strong>Blocker:</strong> {stage.blocker}
                  </div>
                )}

                {stage.status === 'ON_HOLD' && stage.holdReason && (
                  <div style={{ backgroundColor: '#fef9c3', color: '#854d0e', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    <strong>Reason on hold:</strong> {stage.holdReason}
                  </div>
                )}

                {stage.remarks && (
                  <p style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                    &quot;{stage.remarks}&quot;
                  </p>
                )}
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                <span>👤 {stage.owner?.name || 'Unassigned'}</span>
                <span>
                  {stage.completionDate
                    ? `Done: ${new Date(stage.completionDate).toLocaleDateString()}`
                    : (stage.dueDate ? `Due: ${new Date(stage.dueDate).toLocaleDateString()}` : 'No due date')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Status Transition Modal with Conditional Required Fields */}
      {selectedStage && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <h3 style={{ marginBottom: '0.25rem' }}>Update Stage Status</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Stage: <strong>{selectedStage.name}</strong>
            </p>

            <form onSubmit={handleSubmitStatus} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Target Status
                </label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="NOT_STARTED">NOT STARTED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="ON_HOLD">ON HOLD</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              {/* Conditional Required Field for Blocked */}
              {status === 'BLOCKED' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#dc2626', marginBottom: '0.25rem' }}>
                    Blocker Description (Required) *
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Describe what is impeding progress on this stage"
                    value={blocker}
                    onChange={(e) => setBlocker(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Conditional Required Field for On Hold */}
              {status === 'ON_HOLD' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#d97706', marginBottom: '0.25rem' }}>
                    Reason for Hold (Required) *
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Explain why this stage is being paused"
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Conditional Required Field for Completed */}
              {status === 'COMPLETED' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#16a34a', marginBottom: '0.25rem' }}>
                    Completion Date (Required) *
                  </label>
                  <input
                    type="date"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Remarks / Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Optional operational updates"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              {/* Status History Collapsible */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => handleViewHistory(selectedStage.id)}
                  className="btn-secondary"
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem' }}
                >
                  {showHistory ? 'Hide Status History' : 'View Status Change History'}
                </button>

                {showHistory && (
                  <div style={{ marginTop: '0.5rem', maxHeight: '140px', overflowY: 'auto', fontSize: '0.75rem', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    {!history[selectedStage.id] || history[selectedStage.id].length === 0 ? (
                      <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No prior status changes recorded.</p>
                    ) : (
                      history[selectedStage.id].map((h) => (
                        <div key={h.id} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600 }}>{h.newStatus}</span> by {h.changedBy?.name || 'User'} on {new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {h.blocker && <div style={{ color: '#dc2626' }}>Blocker: {h.blocker}</div>}
                          {h.holdReason && <div style={{ color: '#d97706' }}>Reason: {h.holdReason}</div>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedStage(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Status (Optimistic)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
