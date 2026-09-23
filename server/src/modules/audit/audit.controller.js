const auditService = require('./audit.service');

// Handle fetching paginated audit logs with optional query filters
const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, entityType, action, startDate, endDate } = req.query;

    const result = await auditService.getAuditLogs({
      page,
      limit,
      entityType,
      action,
      startDate,
      endDate
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
