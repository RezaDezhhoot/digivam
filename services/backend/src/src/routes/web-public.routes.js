import { Router } from 'express';
import { getWebFacilityBySlug, getWebHome, listWebFacilities } from '../controllers/web-public.controller.js';
import { trackPageView } from '../middlewares/track-page-view.js';
import { optionalAuth } from '../middlewares/auth.js';

export const webPublicRouter = Router();

webPublicRouter.use(trackPageView);

webPublicRouter.get('/home', getWebHome);
webPublicRouter.get('/facilities', listWebFacilities);
webPublicRouter.get('/facilities/:slug', optionalAuth, getWebFacilityBySlug);