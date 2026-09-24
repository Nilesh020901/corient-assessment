const notificationsService = require('./notifications.service');

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationsService.getUserNotifications(req.user.id);
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await notificationsService.markAsRead(id, req.user.id);
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await notificationsService.markAllAsRead(req.user.id);
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead
};
