const prisma = require('../../config/prisma');

// Retrieve all roles along with their dynamic permission associations to populate the RBAC management UI
const getAllRoles = async () => {
  return await prisma.role.findMany({
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });
};

// Return catalog of available permissions so administrators can grant or revoke specific granular capabilities
const getAllPermissions = async () => {
  return await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { action: 'asc' }]
  });
};

// Atomically overwrite role permissions inside a transaction to prevent partial authorization states
const updateRolePermissions = async (roleId, permissionIds) => {
  return await prisma.$transaction(async (tx) => {
    // Delete existing mappings before applying updated list
    await tx.rolePermission.deleteMany({
      where: { roleId }
    });

    if (permissionIds && permissionIds.length > 0) {
      const data = permissionIds.map((pId) => ({
        roleId,
        permissionId: pId
      }));

      await tx.rolePermission.createMany({
        data
      });
    }

    return await tx.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: { permission: true }
        }
      }
    });
  });
};

module.exports = {
  getAllRoles,
  getAllPermissions,
  updateRolePermissions
};
