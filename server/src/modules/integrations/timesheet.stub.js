// Phase 2 Integration Service Stub: Timesheet & Effort Tracking Integration
// Simulates recording labor hours against specific workflow stages
const prisma = require('../../config/prisma');

// In-memory store for demonstration timesheet log entries
const inMemoryTimesheets = [];

// Log time entry against a workflow stage
const logTimeEntry = async ({ stageId, hours, date, activityType, description }, user) => {
  const stage = await prisma.projectWorkflowStage.findUnique({
    where: { id: stageId },
    include: { project: true }
  });

  if (!stage) {
    const error = new Error('Workflow stage not found');
    error.statusCode = 404;
    throw error;
  }

  const numericHours = parseFloat(hours);
  if (isNaN(numericHours) || numericHours <= 0) {
    const error = new Error('Hours must be a positive number');
    error.statusCode = 400;
    throw error;
  }

  const timeEntry = {
    id: `ts-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    stageId: stage.id,
    stageName: stage.name,
    projectId: stage.project.id,
    projectName: stage.project.name,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    hours: numericHours,
    date: date || new Date().toISOString().split('T')[0],
    activityType: activityType || 'Development',
    description: description || 'Stage task execution',
    approvalStatus: 'APPROVED',
    createdAt: new Date().toISOString()
  };

  inMemoryTimesheets.unshift(timeEntry);
  return timeEntry;
};

// Retrieve timesheet entries for a stage or project
const getTimesheets = async (stageId) => {
  return inMemoryTimesheets.filter((t) => !stageId || t.stageId === stageId);
};

module.exports = {
  logTimeEntry,
  getTimesheets
};
