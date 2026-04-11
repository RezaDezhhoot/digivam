import { Router } from 'express';
import {
  getBrokerNotificationSummary,
  listBrokerNotifications,
  markAllBrokerNotificationsRead,
  markBrokerNotificationRead
} from '../controllers/broker-notification.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate-request.js';
import { brokerNotificationIdValidator } from '../validators/broker-notification.validator.js';

export const brokerNotificationRouter = Router();

brokerNotificationRouter.use(requireAuth('broker'));

brokerNotificationRouter.get('/summary', getBrokerNotificationSummary);
brokerNotificationRouter.get('/', listBrokerNotifications);
brokerNotificationRouter.patch('/read-all', markAllBrokerNotificationsRead);
brokerNotificationRouter.patch('/:id/read', brokerNotificationIdValidator, validateRequest, markBrokerNotificationRead);