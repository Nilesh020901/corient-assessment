import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  fetchProjects,
  createProject,
  deleteProject,
  clearProjectMessages
} from '../redux/slices/projectsSlice';
import { fetchTemplates } from '../redux/slices/sopSlice';
import { fetchUsers } from '../redux/slices/usersSlice';
import usePermission from '../hooks/usePermission';

// Provide project portfolio oversight and SOP-driven project creation with live stage preview
export default function Projects() {
  const dispatch = useDispatch();
  const { projects, loading, error, successMessage } = useSelector((state) => state.projects);
  const { templates } = useSelector((state) => state.sop);
  const { users } = useSelector((state) => state.users);

  const canCreate = usePermission('PROJECTS', 'CREATE');
  const canDelete = usePermission('PROJECTS', 'DELETE');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sopTemplateId, setSopTemplateId] = useState('');
  const [ownerId, setOwnerId] = useState('');

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchTemplates());
    dispatch(fetchUsers());
  }, [dispatch]);

  // Filter templates that have at least one published version available for project instantiation
  const publishedTemplates = templates.filter(
    (t) => Array.isArray(t.versions) && t.versions.length > 0
  );

  // Derive preview stages from the chosen template's latest published version snapshot
  const selectedTemplateObj = templates.find((t) => t.id === sopTemplateId);
  const latestPublishedVersion = selectedTemplateObj?.versions?.[0]; // ordered desc by versionNumber
  const previewStages = Array.isArray(latestPublishedVersion?.stagesData)
    ? latestPublishedVersion.stagesData
    : [];

  const handleOpenCreate = () => {
    setName('');
    setDescription('');
    setSopTemplateId(publishedTemplates[0]?.id || '');
    setOwnerId(users[0]?.id || '');
    setShowCreateModal(true);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!name.trim() || !sopTemplateId) return;

    const result = await dispatch(createProject({
      name: name.trim(),
      description: description.trim(),
      sopTemplateId,
      ownerId: ownerId || null
    }));

    if (!result.error) {
      setShowCreateModal(false);
    }
  };

  const handleDeleteProject = (id) => {
    if (window.confirm('Are you sure you want to delete this project? All associated workflow stages will be removed.')) {
      dispatch(deleteProject(id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Projects Directory</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Active initiatives instantiated from immutable SOP version snapshots
          </p>
        </div>

        {canCreate && (
          <button onClick={handleOpenCreate} className="btn-primary">
            + Create Project
          </button>
        )}
      </div>

      {successMessage && (
        <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Projects Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Project Name</th>
              <th>SOP Template</th>
              <th>Version Used</th>
              <th>Owner</th>
              <th>Stages Count</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                  No projects found. Click &quot;+ Create Project&quot; to launch an initiative.
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>
                    <Link to={`/workflow-board?projectId=${p.id}`}>
                      {p.name}
                    </Link>
                  </td>
                  <td style={{ color: '#475569' }}>{p.sopTemplate?.title || 'Unknown'}</td>
                  <td>
                    <span className="badge badge-blue">
                      v{p.sopVersion?.versionNumber || '1'}
                    </span>
                  </td>
                  <td>{p.owner?.name || 'Unassigned'}</td>
                  <td>
                    <span style={{ fontWeight: 500 }}>
                      {p.stages?.length || 0} stages
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <Link
                        to={`/workflow-board?projectId=${p.id}`}
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Workflow Board
                      </Link>

                      {canDelete && (
                        <button
                          onClick={() => handleDeleteProject(p.id)}
                          className="btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Delete
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

      {/* Create Project Modal with Stage Generation Preview */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Create Project From SOP</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Select an authorized SOP template. Its stages will be automatically generated and bound to this project.
            </p>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Cloud Migration"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Description (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Goals, client requirements, or context"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    SOP Template (Published Only)
                  </label>
                  <select
                    value={sopTemplateId}
                    onChange={(e) => setSopTemplateId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Template --</option>
                    {publishedTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} (v{t.currentVersion})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Project Lead / Owner
                  </label>
                  <select
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {users.filter((u) => u.isActive).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role?.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stage Generation Live Preview */}
              <div style={{ marginTop: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', backgroundColor: '#f8fafc' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                  PREVIEW: WORKFLOW STAGES TO BE AUTO-GENERATED (FROM v{latestPublishedVersion?.versionNumber || '?'})
                </span>

                {previewStages.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    {sopTemplateId
                      ? 'No stages found in this published version snapshot.'
                      : 'Select a template above to inspect the stages that will be generated.'}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '150px', overflowY: 'auto' }}>
                    {previewStages.map((s, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#ffffff',
                          padding: '0.35rem 0.6rem',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.8rem'
                        }}
                      >
                        <span>
                          <strong>{idx + 1}.</strong> {s.name}
                        </span>
                        <span className={`badge ${s.clientVisible ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                          {s.clientVisible ? 'Client Visible' : 'Internal'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !sopTemplateId || previewStages.length === 0}
                >
                  {loading ? 'Generating Stages...' : 'Create & Generate Stages'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
