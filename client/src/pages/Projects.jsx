import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  fetchProjects,
  createProject,
  deleteProject
} from '../redux/slices/projectsSlice';
import { fetchTemplates } from '../redux/slices/sopSlice';
import { fetchUsers } from '../redux/slices/usersSlice';
import usePermission from '../hooks/usePermission';
import StatusBadge from '../components/common/StatusBadge';
import {
  Plus,
  Trash2,
  ArrowUpRight,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  FileText,
  Users,
  Check,
  X,
  Layers,
  Sparkles
} from 'lucide-react';

export default function Projects() {
  const dispatch = useDispatch();
  const { projects, loading, error, successMessage } = useSelector((state) => state.projects);
  const { templates } = useSelector((state) => state.sop);
  const { users } = useSelector((state) => state.users);

  const canCreate = usePermission('PROJECTS', 'CREATE');
  const canDelete = usePermission('PROJECTS', 'DELETE');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleDeleteProject = (id, projName) => {
    if (window.confirm(`Are you sure you want to delete "${projName}"? All associated workflow stages and logs will be permanently removed.`)) {
      dispatch(deleteProject(id));
    }
  };

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    const q = searchTerm.toLowerCase();
    const pName = (p.name || '').toLowerCase();
    const tName = (p.sopTemplate?.title || '').toLowerCase();
    const oName = (p.owner?.name || '').toLowerCase();
    return pName.includes(q) || tName.includes(q) || oName.includes(q);
  });

  const getUserInitials = (userName) => {
    if (!userName) return '?';
    const p = userName.trim().split(' ');
    if (p.length >= 2) return `${p[0][0]}${p[1][0]}`.toUpperCase();
    return userName.slice(0, 2).toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Projects Directory</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.15rem' }}>
            Active initiatives instantiated from immutable SOP version snapshots
          </p>
        </div>

        {canCreate && (
          <button onClick={handleOpenCreate} className="btn-primary">
            <Plus size={16} strokeWidth={2.4} />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid-responsive-stats">
        <div className="stat-card">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Projects
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
              {projects.length}
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <FolderKanban size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Available Templates
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
              {publishedTemplates.length}
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            <FileText size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Team Users
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
              {users.filter((u) => u.isActive).length}
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
          <input
            type="text"
            placeholder="Search projects, SOP or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.3rem' }}
          />
          <div style={{
            position: 'absolute',
            left: '0.8rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-subtle)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          }}>
            <Search size={15} />
          </div>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                padding: '0.2rem',
                color: 'var(--color-text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Showing <strong>{filteredProjects.length}</strong> of <strong>{projects.length}</strong> projects
        </div>
      </div>

      {/* Projects Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Project Name</th>
              <th>SOP Template</th>
              <th>Version Used</th>
              <th>Project Lead</th>
              <th>Stages Generated</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3.5rem 1rem' }}>
                  <FolderKanban size={36} color="var(--color-text-subtle)" style={{ margin: '0 auto 0.65rem', display: 'block', opacity: 0.6 }} />
                  <div style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '0.95rem' }}>No projects match your filter</div>
                  <div style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>
                    {projects.length === 0 ? 'Click "New Project" to launch your first initiative.' : 'Try adjusting your search criteria.'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredProjects.map((p) => {
                const stagesCount = p.stages?.length || 0;
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <FolderKanban size={16} />
                        </div>
                        <div>
                          <Link
                            to={`/workflow-board?projectId=${p.id}`}
                            style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '0.875rem' }}
                          >
                            {p.name}
                          </Link>
                          {p.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      {p.sopTemplate?.title || 'Unknown Template'}
                    </td>
                    <td>
                      <span className="badge badge-blue">
                        v{p.sopVersion?.versionNumber || '1'}
                      </span>
                    </td>
                    <td>
                      {p.owner ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#e2e8f0',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 700
                          }}>
                            {getUserInitials(p.owner.name)}
                          </div>
                          <span style={{ fontSize: '0.825rem', fontWeight: 500 }}>{p.owner.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic', fontSize: '0.8rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-gray">
                        <Layers size={11} />
                        <span>{stagesCount} stages</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <Link
                          to={`/workflow-board?projectId=${p.id}`}
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', gap: '0.3rem' }}
                        >
                          <ArrowUpRight size={14} />
                          <span>Board</span>
                        </Link>

                        {canDelete && (
                          <button
                            onClick={() => handleDeleteProject(p.id, p.name)}
                            className="btn-danger"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', gap: '0.3rem' }}
                            title="Delete project"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Project Modal with Stage Generation Live Preview */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Create Project From SOP</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.825rem', marginTop: '0.2rem' }}>
                  Select an authorized SOP template to automatically instantiate bound workflow stages.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Cloud Security & Migration"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Project Description</label>
                <textarea
                  rows="2"
                  placeholder="Objectives, deliverables, or team requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>SOP Template (Published Only) *</label>
                  <select
                    value={sopTemplateId}
                    onChange={(e) => setSopTemplateId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Template --</option>
                    {publishedTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} (v{t.currentVersion})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Project Lead / Owner</label>
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
              <div style={{
                marginTop: '0.25rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                backgroundColor: 'var(--color-bg)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Preview: Stages to be Generated (from v{latestPublishedVersion?.versionNumber || '?'})
                  </span>
                  {previewStages.length > 0 && (
                    <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                      {previewStages.length} stages
                    </span>
                  )}
                </div>

                {previewStages.length === 0 ? (
                  <p style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic', fontSize: '0.8rem', margin: '0.5rem 0' }}>
                    {sopTemplateId
                      ? 'No stages found in this published version snapshot.'
                      : 'Select a template above to preview the stages that will be generated.'}
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
                          backgroundColor: 'var(--color-surface)',
                          padding: '0.45rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border-subtle)',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-bg-alt)',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-muted)'
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{s.name}</span>
                        </div>
                        <span className={`badge ${s.clientVisible ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: '0.68rem' }}>
                          {s.clientVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                          <span>{s.clientVisible ? 'Client Visible' : 'Internal'}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
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
                  <Plus size={15} />
                  <span>{loading ? 'Generating...' : 'Create & Generate Stages'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
