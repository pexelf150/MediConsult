import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import * as notificationService from '../services/notificationService.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, unreadOnly } = req.query;

  const result = await notificationService.getUserNotifications(req.user._id, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
    unreadOnly: unreadOnly === 'true',
  });

  res.status(200).json(new ApiResponse(200, 'Notifications retrieved', result));
});

export const markRead = asyncHandler(async (req, res) => {
  try {
    const notification = await notificationService.markNotificationRead(
      req.params.id,
      req.user._id
    );

    res.status(200).json(new ApiResponse(200, 'Notification marked as read', { notification }));
  } catch {
    throw new ApiError(404, 'Notification not found');
  }
});

export const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllNotificationsRead(req.user._id);

  res.status(200).json(new ApiResponse(200, 'All notifications marked as read'));
});

export default { getNotifications, markRead, markAllRead };
