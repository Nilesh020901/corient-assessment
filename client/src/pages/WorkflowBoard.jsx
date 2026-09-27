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
  ExternalLink,
  FolderKanban,
  FileUp,
  MessageSquare,
  HelpCircle,
  Layers
} from 'lucide-react';

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
  const [activeModalTab, setActiveModalTab] = useState('STATUS'); // 'STATUS' | 'DOCS' | 'INTEGRATIONS' | 'HISTORY'
  const [status, setStatus] = useState('NOT_STARTED');
  const [blocker, setBlocker] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [remarks, setRemarks] = useState('');

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
    setActiveModalTab('STATUS');
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

  const handleTabChange = (tab) => {
    setActiveModalTab(tab);
    if (tab === 'HISTORY' && selectedStage && (!history[selectedStage.id] || history[selectedStage.id].length === 0)) {
      dispatch(fetchStageHistory({ projectId: selectedProjectId, stageId: selectedStage.id }));
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

  const getUserInitials = (userName) => {
    if (!userName) return '?';
    const p = userName.trim().split(' ');
    if (p.length >= 2) return `${p[0][0]}${p[1][0]}`.toUpperCase();
    return userName.slice(0, 2).toUpperCase();
  };

  const getStatusBorderColor = (s) => {
    switch (s) {
      case 'COMPLETED': return 'var(--color-success)';
      case 'IN_PROGRESS': return 'var(--color-primary)';
      case 'ON_HOLD': return 'var(--color-warning)';
      case 'BLOCKED': return 'var(--color-danger)';
      default: return 'var(--color-border)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header and Project Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        backgroundColor: 'var(--color-surface)',
        padding: '1.25rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-xs)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2>Workflow Board</h2>
            <span className="badge badge-blue">Live Execution</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Interactive stage cards, instant optimistic transitions, and prerequisite enforcement
          </p>
        </div>

        {/* Project Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: '280px' }}>
          <FolderKanban size={18} color="var(--color-primary)" />
          <select
            value={selectedProjectId}
            onChange={handleSelectProject}
            disabled={projects.length === 0}
            style={{ fontWeight: 600, fontSize: '0.875rem' }}
          >
            {projects.length === 0 ? (
              <option value="">No Projects Available</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
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

      {/* Workflow Analytics Progress Card */}
      {project && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-text-main)' }}>
                {project.name}
              </span>
              <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                SOP v{project.sopVersion?.versionNumber || '1'}
              </span>
            </div>

            {/* Quick status counter pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <StatusBadge status="NOT_STARTED" label={`Not Started: ${stats.notStarted}`} size="sm" />
              <StatusBadge status="IN_PROGRESS" label={`In Progress: ${stats.inProgress}`} size="sm" />
              <StatusBadge status="ON_HOLD" label={`On Hold: ${stats.onHold}`} size="sm" />
              <StatusBadge status="BLOCKED" label={`Blocked: ${stats.blocked}`} size="sm" />
              <StatusBadge status="COMPLETED" label={`Completed: ${stats.completed}`} size="sm" />
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: '0.35rem',
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.02em'
            }}>
              <span style={{ textTransform: 'uppercase' }}>Overall Workflow Completion</span>
              <span style={{ color: stats.percentComplete === 100 ? 'var(--color-success)' : 'var(--color-primary)' }}>
                {stats.percentComplete}% ({stats.completed} of {stats.total} stages complete)
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '9px',
              backgroundColor: 'var(--color-border)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  width: `${stats.percentComplete}%`,
                  height: '100%',
                  background: stats.percentComplete === 100
                    ? 'linear-gradient(90deg, #16a34a, #15803d)'
                    : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stage Cards Grid */}
      {stages.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--color-text-muted)' }}>
          <Layers size={40} color="var(--color-text-subtle)" style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-main)' }}>No stages generated for this project</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Select a project with an active SOP version template.</p>
        </div>
      ) : (
        <div className="grid-responsive-stages">
          {stages.map((stage) => {
            const locked = isStageLocked(stage);
            const statusColor = getStatusBorderColor(stage.status);

            return (
              <div
                key={stage.id}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  borderTop: `4px solid ${statusColor}`,
                  borderRadius: 'var(--radius-lg)'
                }}
                onClick={() => canUpdateStatus && handleOpenStatusModal(stage)}
              >
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.65rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--color-text-muted)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase'
                      }}>
                        STAGE {stage.order}
                      </span>
                      {locked && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          fontSize: '0.65rem',
                          color: '#b45309',
                          backgroundColor: '#fef3c7',
                          padding: '0.12rem 0.4rem',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          <Lock size={10} /> Pre-req: Stage {stage.order - 1}
                        </span>
                      )}
                    </div>
                    <StatusBadge status={stage.status} size="sm" />
                  </div>

                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--color-text-main)',
                    lineHeight: 1.35,
                    marginBottom: '0.5rem'
                  }}>
                    {stage.name}
                  </h4>

                  {/* Document badge */}
                  {stage.documents && stage.documents.length > 0 && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                      backgroundColor: 'var(--color-primary-light)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '0.5rem'
                    }}>
                      <FileText size={11} />
                      <span>{stage.documents.length} doc{stage.documents.length > 1 ? 's' : ''} (v{stage.documents[stage.documents.length - 1]?.version || 1})</span>
                    </div>
                  )}

                  {/* Conditional Blocker or Hold Alert Badges */}
                  {stage.status === 'BLOCKED' && stage.blocker && (
                    <div className="alert alert-error" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', marginBottom: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span><strong>Blocker:</strong> {stage.blocker}</span>
                    </div>
                  )}

                  {stage.status === 'ON_HOLD' && stage.holdReason && (
                    <div className="alert alert-warning" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', marginBottom: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                      <PauseCircle size={13} style={{ flexShrink: 0 }} />
                      <span><strong>On Hold:</strong> {stage.holdReason}</span>
                    </div>
                  )}

                  {stage.remarks && (
                    <p style={{
                      fontSize: '0.78rem',
                      color: 'var(--color-text-secondary)',
                      fontStyle: 'italic',
                      lineHeight: 1.3,
                      marginBottom: '0.5rem',
                      backgroundColor: 'var(--color-bg-alt)',
                      padding: '0.35rem 0.55rem',
                      borderRadius: 'var(--radius-xs)'
                    }}>
                      &quot;{stage.remarks}&quot;
                    </p>
                  )}
                </div>

                <div style={{
                  borderTop: '1px solid var(--color-border-subtle)',
                  paddingTop: '0.65rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)'
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#e2e8f0',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6rem',
                      fontWeight: 700
                    }}>
                      {getUserInitials(stage.owner?.name)}
                    </div>
                    <span>{stage.owner?.name || 'Unassigned'}</span>
                  </span>

                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Calendar size={12} />
                    <span>
                      {stage.completionDate
                        ? `Done: ${new Date(stage.completionDate).toLocaleDateString()}`
                        : (stage.dueDate ? `Due: ${new Date(stage.dueDate).toLocaleDateString()}` : 'No deadline')}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Status Transition & Stage Management Modal */}
      {selectedStage && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{selectedStage.name}</h3>
                  <StatusBadge status={selectedStage.status} size="sm" />
                </div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  Stage {selectedStage.order} &bull; Project Lead: {selectedStage.owner?.name || 'Unassigned'}
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

            {/* Stage Dependency Warning */}
            {isStageLocked(selectedStage) && (status === 'IN_PROGRESS' || status === 'COMPLETED') && (
              <div className="alert alert-warning" style={{ fontSize: '0.8rem', padding: '0.65rem 0.85rem', marginBottom: '0.75rem' }}>
                <Lock size={15} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Stage Dependency Rule:</strong> Preceding stage &quot;{getPrecedingStage(selectedStage)?.name}&quot; (Stage {selectedStage.order - 1}) is not Completed. Starting or completing this stage will be rejected by backend rules.
                </span>
              </div>
            )}

            {/* Sub-tab Navigation */}
            <div style={{
              display: 'flex',
              gap: '0.35rem',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '0.5rem',
              marginBottom: '1rem',
              overflowX: 'auto'
            }}>
              <button
                type="button"
                onClick={() => handleTabChange('STATUS')}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeModalTab === 'STATUS' ? 'var(--color-primary-light)' : 'transparent',
                  color: activeModalTab === 'STATUS' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  border: 'none',
                  fontWeight: activeModalTab === 'STATUS' ? 700 : 500
                }}
              >
                Status & Notes
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('DOCS')}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeModalTab === 'DOCS' ? 'var(--color-primary-light)' : 'transparent',
                  color: activeModalTab === 'DOCS' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  border: 'none',
                  fontWeight: activeModalTab === 'DOCS' ? 700 : 500
                }}
              >
                Documents ({selectedStage.documents?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('INTEGRATIONS')}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeModalTab === 'INTEGRATIONS' ? 'var(--color-primary-light)' : 'transparent',
                  color: activeModalTab === 'INTEGRATIONS' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  border: 'none',
                  fontWeight: activeModalTab === 'INTEGRATIONS' ? 700 : 500
                }}
              >
                Integrations (Phase 2)
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('HISTORY')}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeModalTab === 'HISTORY' ? 'var(--color-primary-light)' : 'transparent',
                  color: activeModalTab === 'HISTORY' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  border: 'none',
                  fontWeight: activeModalTab === 'HISTORY' ? 700 : 500
                }}
              >
                Audit History
              </button>
            </div>

            {/* TAB 1: STATUS & NOTES */}
            {activeModalTab === 'STATUS' && (
              <form onSubmit={handleSubmitStatus} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label>Target Status *</label>
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
                    <label style={{ color: 'var(--color-danger)', fontWeight: 700 }}>
                      Blocker Description (Required) *
                    </label>
                    <textarea
                      rows="2"
                      placeholder="Explain the technical obstacle impeding execution..."
                      value={blocker}
                      onChange={(e) => setBlocker(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Conditional Required Field for On Hold */}
                {status === 'ON_HOLD' && (
                  <div>
                    <label style={{ color: 'var(--color-warning)', fontWeight: 700 }}>
                      Reason for Hold (Required) *
                    </label>
                    <textarea
                      rows="2"
                      placeholder="State the justification for placing this stage on hold..."
                      value={holdReason}
                      onChange={(e) => setHoldReason(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Conditional Required Field for Completed */}
                {status === 'COMPLETED' && (
                  <div>
                    <label style={{ color: 'var(--color-success)', fontWeight: 700 }}>
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
                  <label>Remarks / Operational Notes</label>
                  <textarea
                    rows="2"
                    placeholder="Enter any pertinent context or handoff details..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setSelectedStage(null)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <Check size={14} />
                    <span>Save Status Transition</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: DOCUMENTS */}
            {activeModalTab === 'DOCS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Versioned Attachments
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                    Upload or revise specifications. Uploading a document with the same filename automatically increments its version.
                  </p>

                  {selectedStage.documents && selectedStage.documents.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedStage.documents.map((doc, idx) => (
                        <div
                          key={doc.id || idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.65rem 0.85rem',
                            backgroundColor: 'var(--color-bg)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            fontSize: '0.825rem'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <FileText size={14} color="var(--color-primary)" />
                              <span style={{ fontWeight: 700 }}>{doc.name}</span>
                              <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
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
                                style={{ fontSize: '0.75rem', color: 'var(--color-primary)', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.15rem' }}
                              >
                                <span>{doc.url}</span>
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>
                            {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)' }}>
                      <FileUp size={24} color="var(--color-text-subtle)" style={{ margin: '0 auto 0.35rem' }} />
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No documents attached yet.</p>
                    </div>
                  )}
                </div>

                {canUpdateWorkflow && (
                  <form onSubmit={handleAddDocument} style={{
                    backgroundColor: 'var(--color-bg-alt)',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem'
                  }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                      Add or Revise Document
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Document Name (e.g. Architecture.pdf)"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        required
                      />
                      <input
                        type="url"
                        placeholder="URL (e.g. https://storage.corp/doc)"
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isSavingDoc}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                      >
                        <Upload size={13} />
                        <span>{isSavingDoc ? 'Uploading...' : 'Attach / Revise'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: INTEGRATIONS (PHASE 2) */}
            {activeModalTab === 'INTEGRATIONS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Phase 2 Integration Stubs: Sync external ticketing or track labor hours for this stage.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  {/* OpenProject Work Package Sync Stub */}
                  <div style={{
                    padding: '0.85rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        OpenProject Work Package
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                        Sync status and metadata to external project tracking packages.
                      </p>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={handleSyncOpenProject}
                        disabled={syncingOP}
                        className="btn-secondary"
                        style={{ width: '100%', fontSize: '0.78rem' }}
                      >
                        <RefreshCw size={13} />
                        <span>{syncingOP ? 'Syncing...' : 'Sync to OpenProject'}</span>
                      </button>
                      {opSyncResult && (
                        <div style={{
                          marginTop: '0.5rem',
                          fontSize: '0.72rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: opSyncResult.error ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
                          color: opSyncResult.error ? 'var(--color-danger-text)' : 'var(--color-success-text)'
                        }}>
                          {opSyncResult.error ? opSyncResult.error : `WP #${opSyncResult.workPackageId} Synced (${opSyncResult.status})`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timesheet Hours Log Stub */}
                  <div style={{
                    padding: '0.85rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-bg)'
                  }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      Timesheet Labor Hours
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.65rem' }}>
                      Log billable hours against this workflow stage.
                    </p>

                    <form onSubmit={handleLogTimesheet} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '0.35rem' }}>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          placeholder="Hrs"
                          value={timesheetHours}
                          onChange={(e) => setTimesheetHours(e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          placeholder="Activity notes"
                          value={timesheetActivity}
                          onChange={(e) => setTimesheetActivity(e.target.value)}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loggingTime}
                        className="btn-secondary"
                        style={{ fontSize: '0.78rem' }}
                      >
                        <Clock size={13} />
                        <span>{loggingTime ? 'Logging...' : 'Record Labor Hours'}</span>
                      </button>
                    </form>

                    {timeLogResult && (
                      <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.72rem',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: timeLogResult.error ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
                        color: timeLogResult.error ? 'var(--color-danger-text)' : 'var(--color-success-text)'
                      }}>
                        {timeLogResult.error ? timeLogResult.error : `Logged ${timeLogResult.hours}h (${timeLogResult.referenceCode})`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: AUDIT HISTORY */}
            {activeModalTab === 'HISTORY' && (
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Stage Status Transition History
                </div>
                {!history[selectedStage.id] || history[selectedStage.id].length === 0 ? (
                  <p style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic', fontSize: '0.8rem', padding: '1rem', textAlign: 'center' }}>
                    No prior status transitions recorded.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                    {history[selectedStage.id].map((h) => (
                      <div
                        key={h.id}
                        style={{
                          padding: '0.65rem 0.85rem',
                          backgroundColor: 'var(--color-bg)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.78rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{h.newStatus}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>
                            {new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ color: 'var(--color-text-muted)' }}>
                          Transitioned by <strong>{h.changedBy?.name || 'Authorized User'}</strong>
                        </div>
                        {h.blocker && <div style={{ color: 'var(--color-danger)', marginTop: '0.2rem' }}><strong>Blocker:</strong> {h.blocker}</div>}
                        {h.holdReason && <div style={{ color: 'var(--color-warning)', marginTop: '0.2rem' }}><strong>Reason:</strong> {h.holdReason}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
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
