// Phase 2 Integration Service Stub: OpenProject Work Package Integration
// Simulates integration with OpenProject REST API v3
const prisma = require('../../config/prisma');

// Simulates mapping an IT workflow stage to an OpenProject WorkPackage
const syncWorkPackage = async (stageId, user) => {
  const stage = await prisma.projectWorkflowStage.findUnique({
    where: { id: stageId },
    include: { project: true, owner: true }
  });

  if (!stage) {
    const error = new Error('Stage not found');
    error.statusCode = 404;
    throw error;
  }

  // Generate simulated OpenProject external work package ID and sync response
  const simulatedWorkPackageId = 4000 + Math.floor(Math.random() * 1000);
  const syncTimestamp = new Date().toISOString();

  const syncResult = {
    integration: 'OpenProject',
    status: 'SYNCHRONIZED',
    externalId: simulatedWorkPackageId,
    externalUrl: `https://openproject.workflow.local/work_packages/${simulatedWorkPackageId}`,
    stageId: stage.id,
    stageName: stage.name,
    projectName: stage.project.name,
    mappedStatus: stage.status === 'COMPLETED' ? 'Closed' : stage.status === 'IN_PROGRESS' ? 'In specification' : 'New',
    assignee: stage.owner?.name || 'Unassigned',
    syncedAt: syncTimestamp,
    syncedBy: user?.name || 'System'
  };

  return syncResult;
};

// Return project-level OpenProject synchronization status overview
const getProjectSyncStatus = async (projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { stages: { select: { id: true, name: true, status: true, order: true } } }
  });

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    integration: 'OpenProject',
    projectId: project.id,
    projectName: project.name,
    projectIdentifier: project.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    externalProjectUrl: `https://openproject.workflow.local/projects/${project.id}`,
    totalStages: project.stages.length,
    synchronizedStages: project.stages.length,
    syncHealth: 'HEALTHY',
    lastSyncCheck: new Date().toISOString()
  };
};

module.exports = {
  syncWorkPackage,
  getProjectSyncStatus
};
