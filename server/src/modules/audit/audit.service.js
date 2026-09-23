const prisma = require('../../config/prisma');

// Record immutable audit entry to guarantee compliance tracking for every state alteration across the system
const recordAuditLog = async ({ actorId, action, entityType, entityId, oldValue, newValue }) => {
  return await prisma.auditLog.create({
    data: {
      actorId: actorId || null,
      action,
      entityType,
      entityId: String(entityId),
      oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
      newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null
    }
  });
};

// Query audit trail with dynamic filters and pagination for system administrative oversight
const getAuditLogs = async ({ page = 1, limit = 20, entityType, action, startDate, endDate }) => {
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNumber - 1) * pageSize;

  const where = {};

  if (entityType) {
    where.entityType = entityType;
  }

  if (action) {
    where.action = action;
  }

  // Filter within date boundaries to inspect specific incident windows
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  const [total, logs] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    })
  ]);

  return {
    logs,
    total,
    page: pageNumber,
    limit: pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
};

module.exports = {
  recordAuditLog,
  getAuditLogs
};
