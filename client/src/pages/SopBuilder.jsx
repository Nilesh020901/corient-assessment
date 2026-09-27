import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTemplates,
  fetchTemplateById,
  createTemplate,
  addStage,
  updateStage,
  deleteStage,
  reorderStages,
  publishTemplate
} from '../redux/slices/sopSlice';
import usePermission from '../hooks/usePermission';
import StatusBadge from '../components/common/StatusBadge';
import {
  Plus,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Trash2,
  Send,
  History,
  FileText,
  Layers,
  X,
  Sparkles,
  Info
} from 'lucide-react';

export default function SopBuilder() {
  const dispatch = useDispatch();
  const { templates, selectedTemplate, loading, error, actionSuccess } = useSelector((state) => state.sop);

  const canPublish = usePermission('SOP', 'PUBLISH');
  const canUpdate = usePermission('SOP', 'UPDATE');

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [stageName, setStageName] = useState('');
  const [stageClientVisible, setStageClientVisible] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  const handleSelectTemplate = (e) => {
    const templateId = e.target.value;
    if (templateId) {
      dispatch(fetchTemplateById(templateId));
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await dispatch(createTemplate({ title: newTitle.trim(), description: newDescription.trim() }));
    setNewTitle('');
    setNewDescription('');
    setShowCreateModal(false);
  };

  const handleAddStage = async (e) => {
    e.preventDefault();
    if (!stageName.trim() || !selectedTemplate) return;
    await dispatch(addStage({
      templateId: selectedTemplate.id,
      stageData: {
        name: stageName.trim(),
        clientVisible: stageClientVisible
      }
    }));
    setStageName('');
    setStageClientVisible(false);
  };

  const handleToggleClientVisible = (stage) => {
    if (!canUpdate || !selectedTemplate) return;
    dispatch(updateStage({
      templateId: selectedTemplate.id,
      stageId: stage.id,
      updateData: { clientVisible: !stage.clientVisible }
    }));
  };

  const handleDeleteStage = (stageId, name) => {
    if (!canUpdate || !selectedTemplate) return;
    if (window.confirm(`Are you sure you want to remove stage "${name}"?`)) {
      dispatch(deleteStage({ templateId: selectedTemplate.id, stageId }));
    }
  };

  const handleMoveStage = (index, direction) => {
    if (!canUpdate || !selectedTemplate || !selectedTemplate.stages) return;
    const stages = [...selectedTemplate.stages];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const temp = stages[index];
    stages[index] = stages[targetIndex];
    stages[targetIndex] = temp;

    const stageOrders = stages.map((s, idx) => ({
      id: s.id,
      order: idx + 1
    }));

    dispatch(reorderStages({
      templateId: selectedTemplate.id,
      stageOrders
    }));
  };

  const handlePublish = async () => {
    if (!canPublish || !selectedTemplate) return;
    if (window.confirm('Publishing will freeze this stage configuration as a permanent immutable snapshot for project instantiation. Proceed?')) {
      await dispatch(publishTemplate(selectedTemplate.id));
    }
  };

  const stages = selectedTemplate?.stages || [];
  const versions = selectedTemplate?.versions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header and New Template button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>SOP Template Builder</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.15rem' }}>
            Author standardized workflow sequences, toggle client visibility, and freeze immutable versions
          </p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus size={16} strokeWidth={2.4} />
          <span>New SOP Template</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Template Selector Bar */}
      <div className="card" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        flexWrap: 'wrap',
        padding: '1.25rem'
      }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
            <FileText size={13} color="var(--color-text-muted)" />
            <span>Select Active Template</span>
          </label>
          <select
            value={selectedTemplate?.id || ''}
            onChange={handleSelectTemplate}
            style={{ fontWeight: 600 }}
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.title} ({tpl.isDraft ? 'Draft' : `v${tpl.currentVersion} Active`})
              </option>
            ))}
          </select>
        </div>

        {selectedTemplate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                Status
              </span>
              <StatusBadge
                status={selectedTemplate.isDraft ? 'DRAFT' : 'PUBLISHED'}
                label={selectedTemplate.isDraft ? 'Draft (Editable)' : `v${selectedTemplate.currentVersion} Published`}
              />
            </div>

            {canPublish && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'transparent', display: 'block', marginBottom: '0.3rem' }}>
                  Action
                </span>
                <button
                  onClick={handlePublish}
                  disabled={loading || stages.length === 0}
                  className="btn-success"
                  title="Freeze configuration into an immutable version snapshot"
                >
                  <Send size={14} />
                  <span>Publish New Version</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedTemplate && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          {/* Main Stage Configuration Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Workflow Stages</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                    Order of execution and client portal visibility settings
                  </p>
                </div>
                <span className="badge badge-blue">
                  {stages.length} stage{stages.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Add Stage Inline Form */}
              {canUpdate && (
                <form
                  onSubmit={handleAddStage}
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.65rem',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                  }}
                >
                  <div style={{ flex: '1 1 200px' }}>
                    <input
                      type="text"
                      placeholder="Stage Name (e.g. Security Audit, QA Sign-Off)"
                      value={stageName}
                      onChange={(e) => setStageName(e.target.value)}
                      required
                    />
                  </div>

                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    margin: 0
                  }}>
                    <input
                      type="checkbox"
                      checked={stageClientVisible}
                      onChange={(e) => setStageClientVisible(e.target.checked)}
                      style={{ width: 'auto', cursor: 'pointer' }}
                    />
                    <span>Client Visible</span>
                  </label>

                  <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.45rem 0.85rem' }}>
                    <Plus size={14} />
                    <span>Add Stage</span>
                  </button>
                </form>
              )}

              {/* Stage List */}
              {stages.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  <Layers size={36} color="var(--color-text-subtle)" style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
                  <div style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '0.9rem' }}>No stages in this template</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Add your first execution step above.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {stages.map((stage, idx) => (
                    <div
                      key={stage.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-surface)',
                        transition: 'all var(--transition-fast)',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {idx + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-main)' }}>
                            {stage.name}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          type="button"
                          className={`badge ${stage.clientVisible ? 'badge-blue' : 'badge-gray'}`}
                          style={{
                            cursor: canUpdate ? 'pointer' : 'default',
                            border: 'none',
                            padding: '0.25rem 0.65rem'
                          }}
                          onClick={() => handleToggleClientVisible(stage)}
                          title="Click to toggle visibility in Client Delivery Portal"
                        >
                          {stage.clientVisible ? <Eye size={11} /> : <EyeOff size={11} />}
                          <span>{stage.clientVisible ? 'Client Visible' : 'Internal Only'}</span>
                        </button>

                        {canUpdate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <button
                              onClick={() => handleMoveStage(idx, 'UP')}
                              disabled={idx === 0}
                              className="btn-secondary"
                              style={{ padding: '0.25rem 0.45rem' }}
                              title="Move Up"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              onClick={() => handleMoveStage(idx, 'DOWN')}
                              disabled={idx === stages.length - 1}
                              className="btn-secondary"
                              style={{ padding: '0.25rem 0.45rem' }}
                              title="Move Down"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteStage(stage.id, stage.name)}
                              className="btn-danger"
                              style={{ padding: '0.25rem 0.45rem' }}
                              title="Remove Stage"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Version History Sidebar */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
              <History size={16} color="var(--color-primary)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Version History</h3>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginBottom: '1.1rem' }}>
              Published version snapshots are immutable. New projects use the latest published snapshot.
            </p>

            {versions.length === 0 ? (
              <div style={{
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--color-border)',
                color: 'var(--color-text-subtle)'
              }}>
                <Info size={20} style={{ margin: '0 auto 0.35rem' }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  No published versions yet. Click &quot;Publish New Version&quot; when your draft is ready.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '420px', overflowY: 'auto' }}>
                {versions.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      padding: '0.85rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-bg)',
                      boxShadow: 'var(--shadow-xs)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                        Version {v.versionNumber}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-subtle)' }}>
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                      <Layers size={12} color="var(--color-text-muted)" />
                      <span>{Array.isArray(v.stagesData) ? `${v.stagesData.length} stages snapshotted` : '0 stages'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Template Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create New SOP Template</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.825rem', marginTop: '0.2rem' }}>
                  Define a new workflow architecture template.
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

            <form onSubmit={handleCreateTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Template Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Infrastructure Deployment Standard Workflow"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Description (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="Outline the scope, regulatory context, or standard operating targets..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Plus size={14} />
                  <span>Create Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
