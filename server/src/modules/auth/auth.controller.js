const authService = require('./auth.service');
const { setRefreshTokenCookie, clearRefreshTokenCookie } = require('../../utils/token.utils');

// Handle login HTTP requests, parse input, attach refresh cookie, and return user payload with permissions
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const { accessToken, refreshToken, user } = await authService.login(email, password);

    // Keep refresh token safe in httpOnly cookie while exposing access token to in-memory frontend store
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      accessToken,
      user
    });
  } catch (error) {
    next(error);
  }
};

// Handle token renewal requests reading the secure cookie and rotating tokens
const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided in cookies' });
    }

    const { accessToken, refreshToken: newRefreshToken, user } = await authService.refresh(refreshToken);

    setRefreshTokenCookie(res, newRefreshToken);

    return res.status(200).json({
      accessToken,
      user
    });
  } catch (error) {
    next(error);
  }
};

// Invalidate server-side session and wipe the httpOnly cookie on user sign out
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refresh,
  logout
};
