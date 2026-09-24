const prisma = require('../../config/prisma');

// Persist a new notification alert in the database
const createNotification = async ({ userId, type, title, message, entityId }) => {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type, // STAGE_ASSIGNED, STAGE_BLOCKED, STAGE_COMPLETED, REASSIGNMENT
        title,
        message,
        entityId: entityId || null
      }
    });
  } catch (err) {
    console.error('[Notification Service Error]:', err.message);
    return null;
  }
};

// Fetch notifications for the authenticated user (newest first)
const getUserNotifications = async (userId) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30
  });
};

// Mark a single notification as read
const markAsRead = async (id, userId) => {
  return await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true }
  });
};

// Mark all notifications for a user as read
const markAllAsRead = async (userId) => {
  return await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead
};
