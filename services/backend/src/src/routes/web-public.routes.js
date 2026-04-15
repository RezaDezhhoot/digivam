import { Router } from 'express';
import { getWebFacilityBySlug, getWebHome, listWebFacilities, listPublicTutorials, getAboutUs, getLicenses, getSiteConfig } from '../controllers/web-public.controller.js';
import { trackPageView } from '../middlewares/track-page-view.js';
import { optionalAuth } from '../middlewares/auth.js';

export const webPublicRouter = Router();

webPublicRouter.use(trackPageView);

webPublicRouter.get('/home', getWebHome);
webPublicRouter.get('/site-config', getSiteConfig);
webPublicRouter.get('/facilities', listWebFacilities);
webPublicRouter.get('/facilities/:slug', optionalAuth, getWebFacilityBySlug);
webPublicRouter.get('/tutorials', listPublicTutorials);
webPublicRouter.get('/about-us', getAboutUs);
webPublicRouter.get('/licenses', getLicenses);