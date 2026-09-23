import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects, fetchProjectById } from '../redux/slices/projectsSlice';

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
          <h2>Client Delivery Portal</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
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
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          No active projects are currently linked to your organization.
        </div>
      ) : (
        <>
          {/* Executive Summary Card */}
          {currentProject && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: '#1e293b' }}>{currentProject.name}</h3>
                  {currentProject.description && (
                    <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                  <span>DELIVERY COMPLETION</span>
                  <span>{progressPercent}% ({completedStages} of {stages.length} milestones complete)</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      backgroundColor: progressPercent === 100 ? '#10b981' : '#2563eb',
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
              <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '1.5rem' }}>
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
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      borderLeft: `4px solid ${
                        stage.status === 'COMPLETED' ? '#10b981' :
                        stage.status === 'BLOCKED' ? '#ef4444' :
                        stage.status === 'ON_HOLD' ? '#f59e0b' :
                        stage.status === 'IN_PROGRESS' ? '#3b82f6' : '#cbd5e1'
                      }`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.875rem' }}>
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>
                          {stage.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {stage.completionDate
                            ? `Completed on ${new Date(stage.completionDate).toLocaleDateString()}`
                            : (stage.dueDate ? `Target date: ${new Date(stage.dueDate).toLocaleDateString()}` : 'Scheduled')}
                        </div>
                      </div>
                    </div>

                    <span className={`badge ${getBadgeClass(stage.status)}`}>
                      {stage.status.replace('_', ' ')}
                    </span>
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
