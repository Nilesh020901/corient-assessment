const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');

// Helper to sanitize user objects and exclude password hashes from API responses
const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

// Create a new user with securely hashed credentials and assigned role
const createUser = async ({ name, email, password, roleId }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const error = new Error('A user with this email already exists');
    error.statusCode = 400;
    throw error;
  }

  // Cost factor of 10 balances cryptographic resistance against brute force with request responsiveness
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      roleId
    },
    include: {
      role: true
    }
  });

  return sanitizeUser(user);
};

// Retrieve all user accounts to populate the admin user management table
const getUsers = async () => {
  const users = await prisma.user.findMany({
    include: {
      role: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return users.map(sanitizeUser);
};

// Fetch specific user profile including their current project assignments
const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
      assignedStages: {
        where: { status: { not: 'COMPLETED' } },
        include: { project: true }
      }
    }
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return sanitizeUser(user);
};

// Update user details like name, email, role, or active status
const updateUser = async (id, { name, email, roleId, isActive }) => {
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (roleId !== undefined) updateData.roleId = roleId;
  if (isActive !== undefined) updateData.isActive = isActive;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { role: true }
  });

  return sanitizeUser(user);
};

// Inspect whether a user has pending or in-progress workflow stages before allowing deactivation
const checkActiveAssignments = async (userId) => {
  return await prisma.projectWorkflowStage.findMany({
    where: {
      ownerId: userId,
      status: { not: 'COMPLETED' }
    },
    include: {
      project: {
        select: { id: true, name: true }
      }
    }
  });
};

// Prevent orphan workflow stages by blocking deactivation (HTTP 409) if any active stages remain assigned
const deactivateUser = async (userId) => {
  const activeAssignments = await checkActiveAssignments(userId);

  if (activeAssignments.length > 0) {
    const error = new Error('Cannot deactivate user with active stage assignments. Please reassign them first.');
    error.statusCode = 409;
    error.activeAssignments = activeAssignments.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      status: stage.status,
      projectId: stage.project.id,
      projectName: stage.project.name
    }));
    throw error;
  }

  // Deactivate user and revoke all active refresh tokens immediately to prevent subsequent session renewals
  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      include: { role: true }
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ]);

  return sanitizeUser(updatedUser);
};

// Reassign all active stages to a new designated user so the original user can be safely deactivated
const reassignStages = async (userId, targetUserId) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId }
  });

  if (!targetUser || !targetUser.isActive) {
    const error = new Error('Target user must exist and be an active account');
    error.statusCode = 400;
    throw error;
  }

  // Reassign all non-completed stages owned by userId to targetUserId
  const result = await prisma.projectWorkflowStage.updateMany({
    where: {
      ownerId: userId,
      status: { not: 'COMPLETED' }
    },
    data: {
      ownerId: targetUserId
    }
  });

  // Bonus 3: Notifications Scaffold - Alert target team member of reassigned workflow stages
  const notificationsService = require('../notifications/notifications.service');
  await notificationsService.createNotification({
    userId: targetUserId,
    type: 'REASSIGNMENT',
    title: 'Workflow Stages Reassigned to You',
    message: `${result.count} active workflow stages have been reassigned to you.`,
    entityId: targetUserId
  });

  return {
    reassignedCount: result.count,
    targetUserId,
    targetUserName: targetUser.name
  };
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  checkActiveAssignments,
  deactivateUser,
  reassignStages
};
