import { Router } from 'express';
import { getCustomerDashboard } from '../controllers/customer-panel.controller.js';
import { toggleBookmark, getBookmarkStatus, getMyBookmarks } from '../controllers/customer-bookmark.controller.js';
import { getMyRecentlyViewed } from '../controllers/customer-recently-viewed.controller.js';
import { requireAuth } from '../middlewares/auth.js';

export const customerPanelRouter = Router();

customerPanelRouter.use(requireAuth('customer'));

customerPanelRouter.get('/dashboard', getCustomerDashboard);

customerPanelRouter.get('/bookmarks', getMyBookmarks);
customerPanelRouter.post('/bookmarks/:facilityId', toggleBookmark);
customerPanelRouter.get('/bookmarks/:facilityId/status', getBookmarkStatus);

customerPanelRouter.get('/recently-viewed', getMyRecentlyViewed);