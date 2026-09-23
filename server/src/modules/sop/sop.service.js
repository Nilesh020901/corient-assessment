const prisma = require('../../config/prisma');

// Create a new SOP template in draft status to allow safe iterative authoring before publication
const createTemplate = async ({ title, description }) => {
  return await prisma.sopTemplate.create({
    data: {
      title,
      description,
      isDraft: true,
      currentVersion: 0
    },
    include: {
      stages: { orderBy: { order: 'asc' } }
    }
  });
};

// Retrieve all SOP templates with stage counts and published version summary for the template catalogue
const getTemplates = async () => {
  return await prisma.sopTemplate.findMany({
    include: {
      stages: { orderBy: { order: 'asc' } },
      versions: { orderBy: { versionNumber: 'desc' } }
    },
    orderBy: { createdAt: 'desc' }
  });
};

// Fetch full details of an SOP template including its full stage sequence and version history
const getTemplateById = async (id) => {
  const template = await prisma.sopTemplate.findUnique({
    where: { id },
    include: {
      stages: { orderBy: { order: 'asc' } },
      versions: { orderBy: { versionNumber: 'desc' } }
    }
  });

  if (!template) {
    const error = new Error('SOP Template not found');
    error.statusCode = 404;
    throw error;
  }

  return template;
};

// Update template metadata like title and description
const updateTemplate = async (id, { title, description }) => {
  return await prisma.sopTemplate.update({
    where: { id },
    data: { title, description }
  });
};

// Delete SOP template only if no active projects depend on it
const deleteTemplate = async (id) => {
  const projectCount = await prisma.project.count({
    where: { sopTemplateId: id }
  });

  if (projectCount > 0) {
    const error = new Error('Cannot delete an SOP Template that is used by active projects');
    error.statusCode = 400;
    throw error;
  }

  return await prisma.sopTemplate.delete({
    where: { id }
  });
};

// Add a new stage to an SOP template, defaulting client visibility to false for safety
const addStage = async (sopTemplateId, { name, order, clientVisible }) => {
  // Determine highest order if not explicitly passed to maintain consecutive ordering
  let stageOrder = order;
  if (stageOrder === undefined || stageOrder === null) {
    const lastStage = await prisma.sopStage.findFirst({
      where: { sopTemplateId },
      orderBy: { order: 'desc' }
    });
    stageOrder = lastStage ? lastStage.order + 1 : 1;
  }

  return await prisma.sopStage.create({
    data: {
      sopTemplateId,
      name,
      order: stageOrder,
      clientVisible: Boolean(clientVisible)
    }
  });
};

// Update stage details such as stage name or client visibility flag
const updateStage = async (stageId, { name, clientVisible }) => {
  const data = {};
  if (name !== undefined) data.name = name;
  if (clientVisible !== undefined) data.clientVisible = Boolean(clientVisible);

  return await prisma.sopStage.update({
    where: { id: stageId },
    data
  });
};

// Enforce rule that stage deletion is strictly blocked once an SOP is published and no longer in draft
const deleteStage = async (sopTemplateId, stageId) => {
  const template = await prisma.sopTemplate.findUnique({
    where: { id: sopTemplateId }
  });

  if (!template) {
    const error = new Error('SOP Template not found');
    error.statusCode = 404;
    throw error;
  }

  if (!template.isDraft) {
    const error = new Error('Stage deletion is only allowed while the SOP is in draft status');
    error.statusCode = 400;
    throw error;
  }

  return await prisma.sopStage.delete({
    where: { id: stageId }
  });
};

// Batch update stage order numbers inside a transaction so stages can be freely rearranged without collisions
const reorderStages = async (sopTemplateId, stageOrders) => {
  return await prisma.$transaction(
    stageOrders.map((item) =>
      prisma.sopStage.update({
        where: { id: item.id },
        data: { order: item.order }
      })
    )
  );
};

// Freeze the current template definition into an immutable SopVersion record so existing projects remain unaffected
const publishTemplate = async (sopTemplateId) => {
  const template = await prisma.sopTemplate.findUnique({
    where: { id: sopTemplateId },
    include: {
      stages: { orderBy: { order: 'asc' } }
    }
  });

  if (!template) {
    const error = new Error('SOP Template not found');
    error.statusCode = 404;
    throw error;
  }

  if (!template.stages || template.stages.length === 0) {
    const error = new Error('Cannot publish an SOP Template without any stages');
    error.statusCode = 400;
    throw error;
  }

  const nextVersionNumber = template.currentVersion + 1;

  // Snapshot the current stages as JSON to ensure the version remains forever immutable even if template is modified later
  const stagesSnapshot = template.stages.map((stage) => ({
    name: stage.name,
    order: stage.order,
    clientVisible: stage.clientVisible
  }));

  const [newVersion, updatedTemplate] = await prisma.$transaction([
    prisma.sopVersion.create({
      data: {
        sopTemplateId,
        versionNumber: nextVersionNumber,
        stagesData: stagesSnapshot
      }
    }),
    prisma.sopTemplate.update({
      where: { id: sopTemplateId },
      data: {
        currentVersion: nextVersionNumber,
        isDraft: false
      },
      include: {
        stages: { orderBy: { order: 'asc' } },
        versions: { orderBy: { versionNumber: 'desc' } }
      }
    })
  ]);

  return {
    version: newVersion,
    template: updatedTemplate
  };
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  addStage,
  updateStage,
  deleteStage,
  reorderStages,
  publishTemplate
};
