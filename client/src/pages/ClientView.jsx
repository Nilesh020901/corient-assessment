import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects, fetchProjectById } from '../redux/slices/projectsSlice';
import StatusBadge from '../components/common/StatusBadge';
import {
  FolderKanban,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

export default function ClientView() {
  const dispatch = useDispatch();
  const { projects, currentProject, loading } = useSelector((state) => state.projects);

  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  // Set default selected project upon initial load
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Fetch full project structure when active selection shifts
  useEffect(() => {
    if (selectedProjectId) {
      dispatch(fetchProjectById(selectedProjectId));
    }
  }, [dispatch, selectedProjectId]);

  const stages = currentProject?.stages || [];

  // Calculate simple delivery progress based solely on client-visible stages provided by the server
  const completedStages = stages.filter((s) => s.status === 'COMPLETED').length;
  const progressPercent = stages.length > 0 ? Math.round((completedStages / stages.length) * 100) : 0;

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
      {/* Header and Project Switcher */}
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
            <h2>Client Delivery Portal</h2>
            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
              <ShieldCheck size={11} />
              <span>Verified Client Access</span>
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Sanitized milestone tracking and delivery status for authorized stakeholder initiatives
          </p>
        </div>

        {/* Project Selector */}
        {projects.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '260px' }}>
            <FolderKanban size={18} color="var(--color-primary)" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{ fontWeight: 600 }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--color-text-muted)' }}>
          <FolderKanban size={40} color="var(--color-text-subtle)" style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-main)' }}>No Active Initiatives</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>No active projects are currently linked to your stakeholder view.</p>
        </div>
      ) : (
        <>
          {/* Executive Summary Card */}
          {currentProject && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                    {currentProject.name}
                  </h3>
                  {currentProject.description && (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem', maxWidth: '600px' }}>
                      {currentProject.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-blue">
                    {currentProject.sopTemplate?.title || 'Workflow'} v{currentProject.sopVersion?.versionNumber || '1'}
                  </span>
                  <span className="badge badge-gray">
                    {stages.length} Milestones
                  </span>
                </div>
              </div>

              {/* Progress Metric */}
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '0.4rem',
                  letterSpacing: '0.03em'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <TrendingUp size={14} color="var(--color-primary)" />
                    <span style={{ textTransform: 'uppercase' }}>Delivery Completion Progress</span>
                  </div>
                  <span style={{ color: progressPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)', fontSize: '0.85rem' }}>
                    {progressPercent}% ({completedStages} of {stages.length} completed)
                  </span>
                </div>

                <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      background: progressPercent === 100
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

          {/* Client-Visible Stages List */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Project Milestones & Deliverables</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                  Sanitized, executive view of delivery phases authorized for client review
                </p>
              </div>
              <span className="badge badge-blue">
                {stages.length} Visible
              </span>
            </div>

            {stages.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <Layers size={36} color="var(--color-text-subtle)" style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
                <p style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                  No client-visible milestones are configured for this initiative yet.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stages.map((stage, idx) => {
                  const isDone = stage.status === 'COMPLETED';
                  const borderCol = getStatusBorderColor(stage.status);

                  return (
                    <div
                      key={stage.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem 1.25rem',
                        border: '1px solid var(--color-border)',
                        borderLeft: `5px solid ${borderCol}`,
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-surface)',
                        boxShadow: 'var(--shadow-xs)',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isDone ? 'var(--color-success-bg)' : 'var(--color-bg)',
                          color: isDone ? 'var(--color-success)' : 'var(--color-text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          flexShrink: 0
                        }}>
                          {isDone ? <CheckCircle2 size={18} /> : idx + 1}
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.975rem', color: 'var(--color-text-main)' }}>
                            {stage.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={13} />
                            <span>
                              {stage.completionDate
                                ? `Delivered on ${new Date(stage.completionDate).toLocaleDateString()}`
                                : (stage.dueDate ? `Target date: ${new Date(stage.dueDate).toLocaleDateString()}` : 'Scheduled Milestone')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <StatusBadge status={stage.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
