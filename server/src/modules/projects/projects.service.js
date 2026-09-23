const prisma = require('../../config/prisma');

// Create a project by snapshotting the latest published SOP version and generating initial workflow stages
const createProject = async ({ name, description, sopTemplateId, ownerId }) => {
  const template = await prisma.sopTemplate.findUnique({
    where: { id: sopTemplateId }
  });

  if (!template) {
    const error = new Error('SOP Template not found');
    error.statusCode = 404;
    throw error;
  }

  // Pull the latest published version to guarantee stages match an authorized, immutable SOP snapshot
  const latestVersion = await prisma.sopVersion.findFirst({
    where: { sopTemplateId },
    orderBy: { versionNumber: 'desc' }
  });

  if (!latestVersion) {
    const error = new Error('Cannot create project: This SOP template does not have any published versions yet.');
    error.statusCode = 400;
    throw error;
  }

  const stagesData = Array.isArray(latestVersion.stagesData) ? latestVersion.stagesData : [];

  // Transactionally persist the project and generate workflow stages to ensure complete workflow initialization
  return await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name,
        description,
        sopTemplateId,
        sopVersionId: latestVersion.id, // Store permanent version reference so future publishes do not alter this project
        ownerId: ownerId || null
      }
    });

    // Auto-generate project stage rows from the frozen SOP version snapshot
    if (stagesData.length > 0) {
      const stagesToCreate = stagesData.map((stage) => ({
        projectId: project.id,
        name: stage.name,
        order: stage.order,
        clientVisible: Boolean(stage.clientVisible),
        status: 'NOT_STARTED',
        ownerId: ownerId || null
      }));

      await tx.projectWorkflowStage.createMany({
        data: stagesToCreate
      });
    }

    return await tx.project.findUnique({
      where: { id: project.id },
      include: {
        sopTemplate: { select: { title: true } },
        sopVersion: { select: { versionNumber: true } },
        owner: { select: { id: true, name: true, email: true } },
        stages: { orderBy: { order: 'asc' } }
      }
    });
  });
};

// Retrieve projects filtered by user scope (IT Members and Clients see only projects they are involved with)
const getProjects = async (user) => {
  const where = {};

  // Restrict non-administrative users to projects where they are assigned as owner or assigned to stages
  if (user && (user.role === 'IT_MEMBER' || user.role === 'CLIENT')) {
    where.OR = [
      { ownerId: user.id },
      { stages: { some: { ownerId: user.id } } }
    ];
  }

  return await prisma.project.findMany({
    where,
    include: {
      sopTemplate: { select: { title: true } },
      sopVersion: { select: { versionNumber: true } },
      owner: { select: { id: true, name: true, email: true } },
      stages: {
        orderBy: { order: 'asc' },
        include: {
          owner: { select: { id: true, name: true, email: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

// Fetch project details and stage sequence
const getProjectById = async (id) => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      sopTemplate: { select: { title: true } },
      sopVersion: { select: { versionNumber: true } },
      owner: { select: { id: true, name: true, email: true } },
      stages: {
        orderBy: { order: 'asc' },
        include: {
          owner: { select: { id: true, name: true, email: true } }
        }
      }
    }
  });

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  return project;
};

// Update high-level project metadata
const updateProject = async (id, { name, description, ownerId }) => {
  const data = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (ownerId !== undefined) data.ownerId = ownerId;

  return await prisma.project.update({
    where: { id },
    data,
    include: {
      owner: { select: { id: true, name: true, email: true } },
      stages: { orderBy: { order: 'asc' } }
    }
  });
};

// Remove a project and cascade removal of associated workflow stages
const deleteProject = async (id) => {
  return await prisma.project.delete({
    where: { id }
  });
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
};
