import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects, fetchProjectById } from '../redux/slices/projectsSlice';
import StatusBadge from '../components/common/StatusBadge';
import { FolderKanban, Calendar } from 'lucide-react';

// Provide Client/Ops roles with a clean, read-only view of authorized milestone stages sanitized by the API
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Client Delivery Portal</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Milestone tracking and execution status for authorized initiatives
          </p>
        </div>

        {/* Project Selector */}
        {projects.length > 1 && (
          <div style={{ minWidth: '240px' }}>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
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
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-subtle)' }}>
          <FolderKanban size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.6 }} />
          No active projects are currently linked to your organization.
        </div>
      ) : (
        <>
          {/* Executive Summary Card */}
          {currentProject && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-main)' }}>{currentProject.name}</h3>
                  {currentProject.description && (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      {currentProject.description}
                    </p>
                  )}
                </div>

                <span className="badge badge-blue" style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}>
                  {currentProject.sopTemplate?.title || 'Workflow'} (v{currentProject.sopVersion?.versionNumber || '1'})
                </span>
              </div>

              {/* Progress Metric */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                  <span>DELIVERY COMPLETION</span>
                  <span>{progressPercent}% ({completedStages} of {stages.length} milestones complete)</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      backgroundColor: progressPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Client-Visible Stages List */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Project Milestones</h3>

            {stages.length === 0 ? (
              <p style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic', textAlign: 'center', padding: '1.5rem' }}>
                No client-visible milestones are configured for this initiative yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stages.map((stage, idx) => (
                  <div
                    key={stage.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-surface)',
                      borderLeft: `4px solid ${
                        stage.status === 'COMPLETED' ? 'var(--color-success)' :
                        stage.status === 'BLOCKED' ? 'var(--color-danger)' :
                        stage.status === 'ON_HOLD' ? 'var(--color-warning)' :
                        stage.status === 'IN_PROGRESS' ? 'var(--color-primary)' : 'var(--color-border)'
                      }`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
                          {stage.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} />
                          <span>
                            {stage.completionDate
                              ? `Completed on ${new Date(stage.completionDate).toLocaleDateString()}`
                              : (stage.dueDate ? `Target date: ${new Date(stage.dueDate).toLocaleDateString()}` : 'Scheduled')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <StatusBadge status={stage.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
