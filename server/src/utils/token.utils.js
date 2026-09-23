const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate short-lived access tokens to minimize window of vulnerability if a token is intercepted
const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role.name },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
};

// Generate an opaque cryptographically random string for refresh tokens rather than stateless JWTs so we can revoke them
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Store only SHA-256 hash in DB so stolen database snapshots cannot be used to forge sessions
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Protect refresh token from XSS attacks by keeping it strictly in an httpOnly cookie
const setRefreshTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  res.cookie('refreshToken', token, cookieOptions);
};

// Ensure cookie is scrubbed on client logout to invalidate local session state
const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie
};
