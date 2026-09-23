const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken
} = require('../../utils/token.utils');

// Authenticate user credentials and return tokens with populated RBAC permissions for the UI
const login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
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

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Prevent deactivated employees from obtaining active session tokens
  if (!user.isActive) {
    const error = new Error('Account has been deactivated. Contact an administrator.');
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Flatten nested permission rows into a clean { module, action } structure for frontend route guards
  const permissions = user.role.rolePermissions.map((rp) => ({
    module: rp.permission.module,
    action: rp.permission.action
  }));

  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);

  // Store refresh token in DB so compromised sessions can be revoked immediately
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt
    }
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions
    }
  };
};

// Implement refresh token rotation to detect token theft and provide seamless 15-minute access token renewal
const refresh = async (rawRefreshToken) => {
  if (!rawRefreshToken) {
    const error = new Error('Refresh token is required');
    error.statusCode = 401;
    throw error;
  }

  const tokenHash = hashToken(rawRefreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true }
              }
            }
          }
        }
      }
    }
  });

  // Reject expired or revoked tokens to block replay attacks
  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  const user = storedToken.user;
  if (!user || !user.isActive) {
    const error = new Error('User account is inactive or not found');
    error.statusCode = 403;
    throw error;
  }

  // Revoke used token immediately to enforce one-time usage (rotation)
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() }
  });

  const permissions = user.role.rolePermissions.map((rp) => ({
    module: rp.permission.module,
    action: rp.permission.action
  }));

  const newAccessToken = generateAccessToken(user);
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      tokenHash: newTokenHash,
      userId: user.id,
      expiresAt
    }
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions
    }
  };
};

// Revoke refresh token in database so it cannot be used again even before its 7-day expiration
const logout = async (rawRefreshToken) => {
  if (!rawRefreshToken) return;

  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
};

module.exports = {
  login,
  refresh,
  logout
};
