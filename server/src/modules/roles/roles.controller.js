const rolesService = require('./roles.service');

// Handle fetching all roles and their linked permissions
const getRoles = async (req, res, next) => {
  try {
    const roles = await rolesService.getAllRoles();
    return res.status(200).json(roles);
  } catch (error) {
    next(error);
  }
};

// Handle fetching the full system permission catalog
const getPermissions = async (req, res, next) => {
  try {
    const permissions = await rolesService.getAllPermissions();
    return res.status(200).json(permissions);
  } catch (error) {
    next(error);
  }
};

// Handle updating role permission assignments
const updateRolePermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ message: 'permissionIds must be an array' });
    }

    const updatedRole = await rolesService.updateRolePermissions(id, permissionIds);
    return res.status(200).json(updatedRole);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRoles,
  getPermissions,
  updateRolePermissions
};
