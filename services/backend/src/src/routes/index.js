import { Router } from 'express';
import { brokerAuthRouter } from './broker-auth.routes.js';
import { adminAuthRouter } from './admin-auth.routes.js';
import { adminPanelRouter } from './admin-panel.routes.js';
import { brokerProfileRouter } from './broker-profile.routes.js';
import { brokerFacilityRouter } from './broker-facility.routes.js';
import { brokerDealRouter } from './broker-deal.routes.js';
import { brokerNotificationRouter } from './broker-notification.routes.js';
import { brokerTicketRouter } from './broker-ticket.routes.js';
import { brokerWalletRouter } from './broker-wallet.routes.js';
import { customerAuthRouter } from './customer-auth.routes.js';
import { customerNotificationRouter } from './customer-notification.routes.js';
import { customerDealRouter } from './customer-deal.routes.js';
import { customerPanelRouter } from './customer-panel.routes.js';
import { customerProfileRouter } from './customer-profile.routes.js';
import { customerTicketRouter } from './customer-ticket.routes.js';
import { customerValidationRouter } from './customer-validation.routes.js';
import { webPublicRouter } from './web-public.routes.js';

export const apiRouter = Router();

apiRouter.get('/status', (_req, res) => {
  res.status(200).json({ service: 'بک اند', ready: true, panel: String(_req.query.panel || '').trim() || null });
});

apiRouter.use('/broker/auth', brokerAuthRouter);
apiRouter.use('/broker/profile', brokerProfileRouter);
apiRouter.use('/broker/facilities', brokerFacilityRouter);
apiRouter.use('/broker/deals', brokerDealRouter);
apiRouter.use('/broker/notifications', brokerNotificationRouter);
apiRouter.use('/broker/tickets', brokerTicketRouter);
apiRouter.use('/broker/wallet', brokerWalletRouter);
apiRouter.use('/admin/auth', adminAuthRouter);
apiRouter.use('/admin/panel', adminPanelRouter);
apiRouter.use('/customer/auth', customerAuthRouter);
apiRouter.use('/customer/profile', customerProfileRouter);
apiRouter.use('/customer/notifications', customerNotificationRouter);
apiRouter.use('/customer/deals', customerDealRouter);
apiRouter.use('/customer/panel', customerPanelRouter);
apiRouter.use('/customer', customerTicketRouter);
apiRouter.use('/customer/validations', customerValidationRouter);
apiRouter.use('/web', webPublicRouter);
