import { Router } from 'express';
import {
  getCustomerNotificationSummary,
  listCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead
} from '../controllers/customer-notification.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate-request.js';
import { customerNotificationIdValidator } from '../validators/customer-notification.validator.js';

export const customerNotificationRouter = Router();

customerNotificationRouter.use(requireAuth('customer'));

customerNotificationRouter.get('/summary', getCustomerNotificationSummary);
customerNotificationRouter.get('/', listCustomerNotifications);
customerNotificationRouter.patch('/read-all', markAllCustomerNotificationsRead);
customerNotificationRouter.patch('/:id/read', customerNotificationIdValidator, validateRequest, markCustomerNotificationRead);