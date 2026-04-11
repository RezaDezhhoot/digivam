import { Router } from 'express';
import { adminLogin } from '../controllers/admin-auth.controller.js';
import { adminLoginValidator } from '../validators/admin-auth.validator.js';
import { validateRequest } from '../middlewares/validate-request.js';

export const adminAuthRouter = Router();

adminAuthRouter.post('/login', adminLoginValidator, validateRequest, adminLogin);
