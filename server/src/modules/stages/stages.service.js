const prisma = require('../../config/prisma');
const notificationsService = require('../notifications/notifications.service');

// Normalize status string to uppercase format with underscores for consistent database comparisons
const normalizeStatus = (status) => {
  return String(status).trim().toUpperCase().replace(/\s+/g, '_');
};

// Manually update stage status and enforce conditional validation rules based on target state
const updateStageStatus = async (stageId, { status, blocker, holdReason, completionDate, remarks }, actorId) => {
  const currentStage = await prisma.projectWorkflowStage.findUnique({
    where: { id: stageId },
    include: { project: true }
  });

  if (!currentStage) {
    const error = new Error('Workflow stage not found');
    error.statusCode = 404;
    throw error;
  }

  const normalizedStatus = normalizeStatus(status);
  const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'BLOCKED', 'COMPLETED'];

  if (!validStatuses.includes(normalizedStatus)) {
    const error = new Error(`Invalid status. Allowed values are: ${validStatuses.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Bonus 1: Stage Dependency Check - Preceding stage must be COMPLETED before starting or finishing
  if (normalizedStatus === 'IN_PROGRESS' || normalizedStatus === 'COMPLETED') {
    const previousStage = await prisma.projectWorkflowStage.findFirst({
      where: {
        projectId: currentStage.projectId,
        order: { lt: currentStage.order }
      },
      orderBy: { order: 'desc' }
    });

    if (previousStage && previousStage.status !== 'COMPLETED') {
      const error = new Error(
        `Stage Dependency Rule: Cannot transition "${currentStage.name}" to ${normalizedStatus.replace('_', ' ')} because preceding stage "${previousStage.name}" (Stage ${previousStage.order}) is not yet Completed.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Require blocker explanation when marking blocked so team members can resolve impediments promptly
  if (normalizedStatus === 'BLOCKED' && (!blocker || !String(blocker).trim())) {
    const error = new Error('A blocker description is required when setting status to Blocked');
    error.statusCode = 400;
    throw error;
  }

  // Require explicit reason when putting a stage on hold to keep stakeholders informed of delays
  if (normalizedStatus === 'ON_HOLD' && (!holdReason || !String(holdReason).trim())) {
    const error = new Error('A hold reason is required when setting status to On Hold');
    error.statusCode = 400;
    throw error;
  }

  // Require completion date when marking finished to maintain verifiable project delivery milestones
  if (normalizedStatus === 'COMPLETED' && !completionDate) {
    const error = new Error('A completion date is required when setting status to Completed');
    error.statusCode = 400;
    throw error;
  }

  const parsedCompletionDate = normalizedStatus === 'COMPLETED'
    ? new Date(completionDate)
    : (normalizedStatus === 'NOT_STARTED' || normalizedStatus === 'IN_PROGRESS' ? null : currentStage.completionDate);

  // Atomically update the stage state and append to the immutable status history table
  const updatedStage = await prisma.$transaction(async (tx) => {
    const stage = await tx.projectWorkflowStage.update({
      where: { id: stageId },
      data: {
        status: normalizedStatus,
        blocker: normalizedStatus === 'BLOCKED' ? blocker.trim() : null,
        holdReason: normalizedStatus === 'ON_HOLD' ? holdReason.trim() : null,
        completionDate: parsedCompletionDate,
        remarks: remarks !== undefined ? remarks : currentStage.remarks
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, ownerId: true } }
      }
    });

    // Write immutable history record to preserve verifiable audit trail of all manual status transitions
    await tx.stageStatusHistory.create({
      data: {
        stageId,
        previousStatus: currentStage.status,
        newStatus: normalizedStatus,
        changedById: actorId,
        blocker: normalizedStatus === 'BLOCKED' ? blocker.trim() : null,
        holdReason: normalizedStatus === 'ON_HOLD' ? holdReason.trim() : null,
        remarks: remarks || null
      }
    });

    return stage;
  });

  // Bonus 3: Notifications Scaffold - Trigger alert to project lead if stage is blocked
  if (normalizedStatus === 'BLOCKED' && currentStage.project?.ownerId) {
    await notificationsService.createNotification({
      userId: currentStage.project.ownerId,
      type: 'STAGE_BLOCKED',
      title: `Stage Blocked in ${currentStage.project.name}`,
      message: `Stage "${currentStage.name}" was marked Blocked. Reason: ${blocker}`,
      entityId: stageId
    });
  }

  return updatedStage;
};

// Retrieve chronological history of status changes for a specific stage to track workflow progression
const getStageHistory = async (stageId) => {
  return await prisma.stageStatusHistory.findMany({
    where: { stageId },
    include: {
      changedBy: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

// Assign a dedicated team member as the owner responsible for executing this stage
const assignStageOwner = async (stageId, ownerId) => {
  const updatedStage = await prisma.projectWorkflowStage.update({
    where: { id: stageId },
    data: { ownerId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } }
    }
  });

  // Bonus 3: Notifications Scaffold - Trigger alert to newly assigned team member
  if (ownerId) {
    await notificationsService.createNotification({
      userId: ownerId,
      type: 'STAGE_ASSIGNED',
      title: 'Workflow Stage Assigned',
      message: `You were assigned to "${updatedStage.name}" in project "${updatedStage.project?.name}".`,
      entityId: stageId
    });
  }

  return updatedStage;
};

// Bonus 2: Update remarks or attach documents WITH versioning, strictly upholding Rule 1 (status untouched)
const addStageRemarksOrDocs = async (stageId, { remarks, documents }, actorId) => {
  const currentStage = await prisma.projectWorkflowStage.findUnique({
    where: { id: stageId }
  });

  if (!currentStage) {
    const error = new Error('Workflow stage not found');
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};
  if (remarks !== undefined) updateData.remarks = remarks;

  if (documents !== undefined) {
    const existingDocs = Array.isArray(currentStage.documents) ? currentStage.documents : [];
    const incomingDocs = Array.isArray(documents) ? documents : [documents];

    const updatedDocs = [...existingDocs];

    for (const doc of incomingDocs) {
      if (!doc) continue;
      const docName = doc.name || doc.fileName || 'Document Attachment';
      const docUrl = doc.url || doc.fileUrl || '';

      // Check if document with same name exists to increment version revision
      const existingIndex = updatedDocs.findIndex((d) => d.name === docName);

      if (existingIndex !== -1) {
        const existingDoc = updatedDocs[existingIndex];
        const currentVer = existingDoc.version || 1;
        const newVer = currentVer + 1;
        const historyItem = {
          version: currentVer,
          url: existingDoc.url,
          uploadedAt: existingDoc.uploadedAt || new Date().toISOString(),
          uploadedBy: existingDoc.uploadedBy || 'User'
        };
        const revHistory = Array.isArray(existingDoc.history) ? [...existingDoc.history, historyItem] : [historyItem];

        updatedDocs[existingIndex] = {
          ...existingDoc,
          url: docUrl,
          version: newVer,
          uploadedAt: new Date().toISOString(),
          uploadedBy: actorId || existingDoc.uploadedBy || 'User',
          history: revHistory
        };
      } else {
        updatedDocs.push({
          id: doc.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: docName,
          url: docUrl,
          version: 1,
          uploadedAt: new Date().toISOString(),
          uploadedBy: actorId || 'User',
          history: []
        });
      }
    }

    updateData.documents = updatedDocs;
  }

  // Intentionally leaves 'status' untouched so document uploads never trigger implicit status changes (Rule 1)
  return await prisma.projectWorkflowStage.update({
    where: { id: stageId },
    data: updateData,
    include: {
      owner: { select: { id: true, name: true, email: true } }
    }
  });
};

module.exports = {
  updateStageStatus,
  getStageHistory,
  assignStageOwner,
  addStageRemarksOrDocs
};

