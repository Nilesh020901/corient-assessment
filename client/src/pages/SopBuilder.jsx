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
  publishTemplate,
  clearSopError
} from '../redux/slices/sopSlice';
import usePermission from '../hooks/usePermission';

// Provide Super Admins with full SOP template stage authoring, reordering, visibility controls, and publishing
export default function SopBuilder() {
  const dispatch = useDispatch();
  const { templates, selectedTemplate, loading, error, actionSuccess } = useSelector((state) => state.sop);

  // Strictly gate publishing and updating capabilities using permissions
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

  const handleDeleteStage = (stageId) => {
    if (!canUpdate || !selectedTemplate) return;
    if (window.confirm('Are you sure you want to delete this stage?')) {
      dispatch(deleteStage({ templateId: selectedTemplate.id, stageId }));
    }
  };

  // Reorder stages by swapping adjacent elements and persisting their new sequence numbers
  const handleMoveStage = (index, direction) => {
    if (!canUpdate || !selectedTemplate || !selectedTemplate.stages) return;
    const stages = [...selectedTemplate.stages];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= stages.length) return;

    // Swap positions in local copy
    const temp = stages[index];
    stages[index] = stages[targetIndex];
    stages[targetIndex] = temp;

    // Map new sequential order numbers
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
    if (window.confirm('Publishing will freeze this version as immutable. Continue?')) {
      await dispatch(publishTemplate(selectedTemplate.id));
    }
  };

  const stages = selectedTemplate?.stages || [];
  const versions = selectedTemplate?.versions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>SOP Template Builder</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Configure dynamic SOP workflows, toggle client visibility, and publish immutable versions
          </p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          + New SOP Template
        </button>
      </div>

      {actionSuccess && (
        <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
          {actionSuccess}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Template Selector Bar */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
            SELECT SOP TEMPLATE
          </label>
          <select value={selectedTemplate?.id || ''} onChange={handleSelectTemplate}>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.title} ({tpl.isDraft ? 'Draft' : `v${tpl.currentVersion}`})
              </option>
            ))}
          </select>
        </div>

        {selectedTemplate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block' }}>
                STATUS
              </span>
              <span className={`badge ${selectedTemplate.isDraft ? 'badge-yellow' : 'badge-green'}`}>
                {selectedTemplate.isDraft ? 'Draft' : `v${selectedTemplate.currentVersion} Published`}
              </span>
            </div>

            {canPublish && (
              <button
                onClick={handlePublish}
                disabled={loading || stages.length === 0}
                className="btn-success"
                style={{ marginTop: '0.85rem' }}
              >
                Publish New Version
              </button>
            )}
          </div>
        )}
      </div>

      {selectedTemplate && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Main Stage Configuration Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Workflow Stages</h3>

              {/* Add Stage Form */}
              {canUpdate && (
                <form onSubmit={handleAddStage} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="e.g. Requirement Gathering, QA Sign-off"
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                    style={{ flex: 1 }}
                    required
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={stageClientVisible}
                      onChange={(e) => setStageClientVisible(e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    Client Visible
                  </label>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ whiteSpace: 'nowrap' }}>
                    Add Stage
                  </button>
                </form>
              )}

              {/* Stage List */}
              {stages.length === 0 ? (
                <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                  No stages configured yet. Add your first stage above.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {stages.map((stage, idx) => (
                    <div
                      key={stage.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 600, color: '#64748b', minWidth: '1.5rem' }}>
                          {idx + 1}.
                        </span>
                        <span style={{ fontWeight: 500 }}>{stage.name}</span>
                        <span
                          className={`badge ${stage.clientVisible ? 'badge-blue' : 'badge-gray'}`}
                          style={{ cursor: canUpdate ? 'pointer' : 'default' }}
                          onClick={() => handleToggleClientVisible(stage)}
                          title="Click to toggle client visibility"
                        >
                          {stage.clientVisible ? 'Client Visible' : 'Internal Only'}
                        </span>
                      </div>

                      {canUpdate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleMoveStage(idx, 'UP')}
                            disabled={idx === 0}
                            className="btn-secondary"
                            style={{ padding: '0.2rem 0.5rem' }}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => handleMoveStage(idx, 'DOWN')}
                            disabled={idx === stages.length - 1}
                            className="btn-secondary"
                            style={{ padding: '0.2rem 0.5rem' }}
                            title="Move Down"
                          >
                            ▼
                          </button>
                          <button
                            onClick={() => handleDeleteStage(stage.id)}
                            className="btn-danger"
                            style={{ padding: '0.2rem 0.5rem' }}
                            title="Delete Stage"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Version History Sidebar */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Version History</h3>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '1rem' }}>
              Published versions are permanently immutable and protect existing projects.
            </p>

            {versions.length === 0 ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.875rem' }}>
                No published versions yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {versions.map((v) => (
                  <div key={v.id} style={{ padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Version {v.versionNumber}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                      {Array.isArray(v.stagesData) ? `${v.stagesData.length} stages snapshotted` : ''}
                    </span>
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
            <h3 style={{ marginBottom: '1rem' }}>Create New SOP Template</h3>
            <form onSubmit={handleCreateTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Template Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Infrastructure Deployment Workflow"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Description (Optional)
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe the purpose of this SOP workflow"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
