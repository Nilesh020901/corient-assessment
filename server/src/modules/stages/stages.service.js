const prisma = require('../../config/prisma');

// Normalize status string to uppercase format with underscores for consistent database comparisons
const normalizeStatus = (status) => {
  return String(status).trim().toUpperCase().replace(/\s+/g, '_');
};

// Manually update stage status and enforce conditional validation rules based on target state
const updateStageStatus = async (stageId, { status, blocker, holdReason, completionDate, remarks }, actorId) => {
  const currentStage = await prisma.projectWorkflowStage.findUnique({
    where: { id: stageId }
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
  return await prisma.$transaction(async (tx) => {
    const updatedStage = await tx.projectWorkflowStage.update({
      where: { id: stageId },
      data: {
        status: normalizedStatus,
        blocker: normalizedStatus === 'BLOCKED' ? blocker.trim() : null,
        holdReason: normalizedStatus === 'ON_HOLD' ? holdReason.trim() : null,
        completionDate: parsedCompletionDate,
        remarks: remarks !== undefined ? remarks : currentStage.remarks
      },
      include: {
        owner: { select: { id: true, name: true, email: true } }
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

    return updatedStage;
  });
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
  return await prisma.projectWorkflowStage.update({
    where: { id: stageId },
    data: { ownerId },
    include: {
      owner: { select: { id: true, name: true, email: true } }
    }
  });
};

// Update remarks or attach documents WITHOUT altering status, strictly upholding Rule 1
const addStageRemarksOrDocs = async (stageId, { remarks, documents }) => {
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

  // Append new document metadata to existing documents array
  if (documents !== undefined) {
    const existingDocs = Array.isArray(currentStage.documents) ? currentStage.documents : [];
    updateData.documents = [...existingDocs, ...(Array.isArray(documents) ? documents : [documents])];
  }

  // Intentionally leaves 'status' untouched so document uploads never trigger implicit status changes
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
