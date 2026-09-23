// Enforce DB-driven access control by matching granted module and action pairs rather than checking static role names
const requirePermission = (moduleName, actionName) => {
  return (req, res, next) => {
    if (!req.user || !Array.isArray(req.user.permissions)) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Match required module and action against the user's active permissions array
    const hasPermission = req.user.permissions.some(
      (p) => p.module === moduleName && p.action === actionName
    );

    if (!hasPermission) {
      return res.status(403).json({
        message: `Forbidden: Missing required permission [${moduleName}:${actionName}]`
      });
    }

    next();
  };
};

module.exports = {
  requirePermission
};
