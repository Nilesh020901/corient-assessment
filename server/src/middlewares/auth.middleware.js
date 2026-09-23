const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

// Authenticate incoming requests via short-lived JWT Bearer token and attach verified user permissions
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract Bearer token

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Fetch the latest user record and permissions to ensure real-time validity (e.g. not deactivated)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true }
            }
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User is inactive or no longer exists' });
    }

    // Attach user identity and permission rows for subsequent route guards and controllers
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions: user.role.rolePermissions.map((rp) => ({
        module: rp.permission.module,
        action: rp.permission.action
      }))
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }
};

module.exports = {
  authenticateToken
};
