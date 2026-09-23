const usersService = require('./users.service');

// Handle creating new user accounts
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, roleId } = req.body;
    if (!name || !email || !password || !roleId) {
      return res.status(400).json({ message: 'Name, email, password, and roleId are required' });
    }

    const user = await usersService.createUser({ name, email, password, roleId });
    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

// Handle listing all system users
const getUsers = async (req, res, next) => {
  try {
    const users = await usersService.getUsers();
    return res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// Handle fetching details for a specific user
const getUserById = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id);
    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Handle updating user profile information
const updateUser = async (req, res, next) => {
  try {
    const { name, email, roleId, isActive } = req.body;
    const user = await usersService.updateUser(req.params.id, { name, email, roleId, isActive });
    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Handle deactivation attempt, returning 409 with pending stages if user is still actively assigned
const deactivateUser = async (req, res, next) => {
  try {
    const user = await usersService.deactivateUser(req.params.id);
    return res.status(200).json({
      message: 'User deactivated successfully',
      user
    });
  } catch (error) {
    // Return explicit 409 payload with blocking active assignments so frontend can launch the Reassign Modal
    if (error.statusCode === 409) {
      return res.status(409).json({
        message: error.message,
        activeAssignments: error.activeAssignments
      });
    }
    next(error);
  }
};

// Handle transferring stage assignments from one user to another
const reassignStages = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: 'targetUserId is required' });
    }

    const result = await usersService.reassignStages(req.params.id, targetUserId);
    return res.status(200).json({
      message: 'Assignments successfully reassigned',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deactivateUser,
  reassignStages
};
