import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  fetchProjectStages,
  updateStageStatus,
  optimisticStatusChange,
  fetchStageHistory,
  selectWorkflowStats,
  clearStageToast,
  addRemarksOrDocs
} from '../redux/slices/stagesSlice';
import { fetchProjects } from '../redux/slices/projectsSlice';
import usePermission from '../hooks/usePermission';
import StatusBadge from '../components/common/StatusBadge';
import api from '../api/axios';
import {
  CheckCircle2,
  Clock,
  PauseCircle,
  AlertCircle,
  CircleDot,
  User,
  Calendar,
  X,
  History,
  Check,
  Lock,
  FileText,
  Upload,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

// Provide IT Team Members with interactive stage cards, optimistic status transitions, and history auditing
export default function WorkflowBoard() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { projects } = useSelector((state) => state.projects);
  const { project, stages, history, loading, toastMessage } = useSelector((state) => state.stages);

  // Derive workflow completion analytics using the memoized selector
  const stats = useSelector(selectWorkflowStats);

  const canUpdateStatus = usePermission('WORKFLOW', 'STATUS_UPDATE');
  const canUpdateWorkflow = usePermission('WORKFLOW', 'UPDATE');

  const selectedProjectId = searchParams.get('projectId') || projects[0]?.id || '';

  // Modal states
  const [selectedStage, setSelectedStage] = useState(null);
  const [status, setStatus] = useState('NOT_STARTED');
  const [blocker, setBlocker] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Bonus 2: Document Versioning state
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // Bonus 4: Phase 2 Integration Stubs state
  const [syncingOP, setSyncingOP] = useState(false);
  const [opSyncResult, setOpSyncResult] = useState(null);
  const [timesheetHours, setTimesheetHours] = useState('');
  const [timesheetActivity, setTimesheetActivity] = useState('');
  const [loggingTime, setLoggingTime] = useState(false);
  const [timeLogResult, setTimeLogResult] = useState(null);

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

  // Bonus 1: Stage Dependency Helper
  const isStageLocked = (stage) => {
    if (!stage || stage.order <= 1) return false;
    const prev = stages.find((s) => s.order === stage.order - 1);
    return prev ? prev.status !== 'COMPLETED' : false;
  };

  const getPrecedingStage = (stage) => {
    if (!stage || stage.order <= 1) return null;
    return stages.find((s) => s.order === stage.order - 1) || null;
  };

  const handleOpenStatusModal = (stage) => {
    setSelectedStage(stage);
    setStatus(stage.status);
    setBlocker(stage.blocker || '');
    setHoldReason(stage.holdReason || '');
    setCompletionDate(stage.completionDate ? stage.completionDate.split('T')[0] : '');
    setRemarks(stage.remarks || '');
    setShowHistory(false);
    setDocName('');
    setDocUrl('');
    setOpSyncResult(null);
    setTimeLogResult(null);
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

  // Bonus 2: Document attachment with automatic version revision
  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!docName.trim() || !docUrl.trim() || !selectedStage) return;
    setIsSavingDoc(true);
    try {
      const res = await dispatch(addRemarksOrDocs({
        projectId: selectedProjectId,
        stageId: selectedStage.id,
        payload: {
          documents: [{ name: docName.trim(), url: docUrl.trim() }]
        }
      })).unwrap();

      setSelectedStage(res);
      setDocName('');
      setDocUrl('');
    } catch (err) {
      alert(err || 'Failed to save document');
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Bonus 4: OpenProject Work Package Sync Stub
  const handleSyncOpenProject = async () => {
    if (!selectedStage) return;
    setSyncingOP(true);
    try {
      const res = await api.post(`/integrations/openproject/sync/${selectedStage.id}`);
      setOpSyncResult(res.data);
    } catch (err) {
      setOpSyncResult({ error: err.response?.data?.message || 'Sync failed' });
    } finally {
      setSyncingOP(false);
    }
  };

  // Bonus 4: Timesheet Labor Hour Logging Stub
  const handleLogTimesheet = async (e) => {
    e.preventDefault();
    if (!timesheetHours || !selectedStage) return;
    setLoggingTime(true);
    try {
      const res = await api.post('/integrations/timesheet/log', {
        stageId: selectedStage.id,
        projectId: selectedProjectId,
        hours: parseFloat(timesheetHours),
        activity: timesheetActivity.trim() || 'Workflow stage execution'
      });
      setTimeLogResult(res.data);
      setTimesheetHours('');
      setTimesheetActivity('');
    } catch (err) {
      setTimeLogResult({ error: err.response?.data?.message || 'Labor logging failed' });
    } finally {
      setLoggingTime(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Workflow Board</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
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
          className={`alert ${toastMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => dispatch(clearStageToast())}
            style={{ background: 'none', border: 'none', color: 'inherit', padding: '0.2rem', display: 'flex', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Workflow Stats Bar Calculated via createSelector */}
      {project && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{project.name}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                (SOP v{project.sopVersion?.versionNumber || '1'})
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <StatusBadge status="NOT_STARTED" label={`Not Started: ${stats.notStarted}`} />
              <StatusBadge status="IN_PROGRESS" label={`In Progress: ${stats.inProgress}`} />
              <StatusBadge status="ON_HOLD" label={`On Hold: ${stats.onHold}`} />
              <StatusBadge status="BLOCKED" label={`Blocked: ${stats.blocked}`} />
              <StatusBadge status="COMPLETED" label={`Completed: ${stats.completed}`} />
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--color-text-muted)' }}>
              <span>WORKFLOW COMPLETION</span>
              <span>{stats.percentComplete}% ({stats.completed} of {stats.total} stages)</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${stats.percentComplete}%`,
                  height: '100%',
                  backgroundColor: stats.percentComplete === 100 ? 'var(--color-success)' : 'var(--color-primary)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stage Cards Grid */}
      {stages.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-subtle)' }}>
          No workflow stages found for this project.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {stages.map((stage) => {
            const locked = isStageLocked(stage);
            return (
              <div
                key={stage.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  borderLeft: `4px solid ${
                    stage.status === 'COMPLETED' ? 'var(--color-success)' :
                    stage.status === 'BLOCKED' ? 'var(--color-danger)' :
                    stage.status === 'ON_HOLD' ? 'var(--color-warning)' :
                    stage.status === 'IN_PROGRESS' ? 'var(--color-primary)' : 'var(--color-border)'
                  }`,
                  cursor: canUpdateStatus ? 'pointer' : 'default'
                }}
                onClick={() => canUpdateStatus && handleOpenStatusModal(stage)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        STAGE {stage.order}
                      </span>
                      {locked && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          fontSize: '0.68rem',
                          color: '#b45309',
                          backgroundColor: '#fef3c7',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          <Lock size={10} /> Pre-req: Stage {stage.order - 1}
                        </span>
                      )}
                    </div>
                    <StatusBadge status={stage.status} />
                  </div>

                  <h4 style={{ fontSize: '1rem', color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
                    {stage.name}
                  </h4>

                  {/* Document count badge */}
                  {stage.documents && stage.documents.length > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                      <FileText size={12} />
                      <span>{stage.documents.length} doc{stage.documents.length > 1 ? 's' : ''} (latest: v{stage.documents[stage.documents.length - 1]?.version || 1})</span>
                    </div>
                  )}

                  {/* Conditional Blocker or Hold Alert Badges */}
                  {stage.status === 'BLOCKED' && stage.blocker && (
                    <div className="alert alert-error" style={{ padding: '0.5rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                      <AlertCircle size={14} />
                      <span><strong>Blocker:</strong> {stage.blocker}</span>
                    </div>
                  )}

                  {stage.status === 'ON_HOLD' && stage.holdReason && (
                    <div className="alert alert-warning" style={{ padding: '0.5rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                      <PauseCircle size={14} />
                      <span><strong>Reason on hold:</strong> {stage.holdReason}</span>
                    </div>
                  )}

                  {stage.remarks && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                      &quot;{stage.remarks}&quot;
                    </p>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <User size={12} />
                    {stage.owner?.name || 'Unassigned'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} />
                    {stage.completionDate
                      ? `Done: ${new Date(stage.completionDate).toLocaleDateString()}`
                      : (stage.dueDate ? `Due: ${new Date(stage.dueDate).toLocaleDateString()}` : 'No due date')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Status Transition & Bonus Management Modal */}
      {selectedStage && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <h3 style={{ marginBottom: '0.25rem' }}>Manage Stage: {selectedStage.name}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                  Stage {selectedStage.order} &bull; Current Status: <strong>{selectedStage.status}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStage(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Stage Dependency Warning if Preceding stage is incomplete */}
            {isStageLocked(selectedStage) && (status === 'IN_PROGRESS' || status === 'COMPLETED') && (
              <div className="alert alert-warning" style={{ fontSize: '0.8rem', padding: '0.6rem', marginBottom: '0.75rem' }}>
                <Lock size={15} />
                <span>
                  <strong>Stage Dependency Rule:</strong> Preceding stage &quot;{getPrecedingStage(selectedStage)?.name}&quot; (Stage {selectedStage.order - 1}) is not Completed. Starting or completing this stage will be rejected by backend dependencies.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmitStatus} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
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
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '0.25rem' }}>
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
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-warning)', marginBottom: '0.25rem' }}>
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
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-success)', marginBottom: '0.25rem' }}>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="submit" className="btn-primary" style={{ fontSize: '0.85rem' }}>
                  <Check size={14} />
                  Save Status (Optimistic)
                </button>
              </div>
            </form>

            {/* Bonus 2: Document Versioning Section */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.875rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <FileText size={15} /> Attached Documents & Version History
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  Rule 1: Status untouched
                </span>
              </div>

              {/* Document List */}
              {selectedStage.documents && selectedStage.documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {selectedStage.documents.map((doc, idx) => (
                    <div
                      key={doc.id || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem',
                        backgroundColor: 'var(--color-bg)',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 600 }}>{doc.name}</span>
                          <span style={{
                            backgroundColor: 'var(--color-primary-light, #e0e7ff)',
                            color: 'var(--color-primary)',
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            fontWeight: 600
                          }}>
                            v{doc.version || 1}
                          </span>
                          {doc.history && doc.history.length > 0 && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                              ({doc.history.length} prev revision{doc.history.length > 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.72rem', color: 'var(--color-primary)', wordBreak: 'break-all' }}
                          >
                            {doc.url}
                          </a>
                        )}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-text-subtle)' }}>
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                  No documents attached yet.
                </p>
              )}

              {/* Upload / Revise Document Form */}
              {canUpdateWorkflow && (
                <form onSubmit={handleAddDocument} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Document Name (e.g., Specs.pdf)"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                    required
                  />
                  <input
                    type="url"
                    placeholder="URL (e.g., https://...)"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.5rem' }}
                    required
                  />
                  <button
                    type="submit"
                    className="btn-secondary"
                    disabled={isSavingDoc}
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem', whiteSpace: 'nowrap' }}
                  >
                    <Upload size={13} />
                    {isSavingDoc ? 'Saving...' : 'Add / Revise'}
                  </button>
                </form>
              )}
            </div>

            {/* Bonus 4: Phase 2 Integration Stubs */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.875rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                <ExternalLink size={15} /> Phase 2 Integration Stubs
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {/* OpenProject Sync Stub */}
                <div style={{ padding: '0.65rem', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    OpenProject Work Package
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                    Sync this stage to simulate external project tracking work packages.
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncOpenProject}
                    disabled={syncingOP}
                    className="btn-secondary"
                    style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem' }}
                  >
                    <RefreshCw size={12} className={syncingOP ? 'animate-spin' : ''} />
                    {syncingOP ? 'Syncing...' : 'Sync to OpenProject'}
                  </button>
                  {opSyncResult && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', padding: '0.4rem', borderRadius: '4px', backgroundColor: opSyncResult.error ? '#fee2e2' : '#dcfce7', color: opSyncResult.error ? '#991b1b' : '#166534' }}>
                      {opSyncResult.error ? (
                        <span>{opSyncResult.error}</span>
                      ) : (
                        <span>WP #{opSyncResult.workPackageId} Synced ({opSyncResult.status})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Timesheet Hours Log Stub */}
                <div style={{ padding: '0.65rem', border: '1px solid var(--color-border)', borderRadius: '6px', backgroundColor: 'var(--color-bg)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Timesheet Labor Logging
                  </div>
                  <form onSubmit={handleLogTimesheet} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.35rem' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="24"
                        placeholder="Hours"
                        value={timesheetHours}
                        onChange={(e) => setTimesheetHours(e.target.value)}
                        style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Activity description"
                        value={timesheetActivity}
                        onChange={(e) => setTimesheetActivity(e.target.value)}
                        style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loggingTime}
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem' }}
                    >
                      <Clock size={12} />
                      {loggingTime ? 'Logging...' : 'Log Hours'}
                    </button>
                  </form>
                  {timeLogResult && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', padding: '0.4rem', borderRadius: '4px', backgroundColor: timeLogResult.error ? '#fee2e2' : '#dcfce7', color: timeLogResult.error ? '#991b1b' : '#166534' }}>
                      {timeLogResult.error ? (
                        <span>{timeLogResult.error}</span>
                      ) : (
                        <span>Logged {timeLogResult.hours}h ({timeLogResult.referenceCode})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status History Collapsible */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleViewHistory(selectedStage.id)}
                className="btn-secondary"
                style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem' }}
              >
                <History size={13} />
                {showHistory ? 'Hide Status History' : 'View Status Change History'}
              </button>

              {showHistory && (
                <div style={{ marginTop: '0.5rem', maxHeight: '140px', overflowY: 'auto', fontSize: '0.75rem', backgroundColor: 'var(--color-bg)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                  {!history[selectedStage.id] || history[selectedStage.id].length === 0 ? (
                    <p style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>No prior status changes recorded.</p>
                  ) : (
                    history[selectedStage.id].map((h) => (
                      <div key={h.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600 }}>{h.newStatus}</span> by {h.changedBy?.name || 'User'} on {new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {h.blocker && <div style={{ color: 'var(--color-danger)' }}>Blocker: {h.blocker}</div>}
                        {h.holdReason && <div style={{ color: 'var(--color-warning)' }}>Reason: {h.holdReason}</div>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedStage(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

