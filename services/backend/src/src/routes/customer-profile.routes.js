import { Router } from 'express';
import { getCustomerProfile, updateCustomerAvatar, updateCustomerProfile } from '../controllers/customer-profile.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import { validateRequest } from '../middlewares/validate-request.js';
import { upsertCustomerProfileValidator } from '../validators/customer-profile.validator.js';

export const customerProfileRouter = Router();

customerProfileRouter.use(requireAuth('customer'));

customerProfileRouter.get('/', getCustomerProfile);
customerProfileRouter.put('/', upsertCustomerProfileValidator, validateRequest, updateCustomerProfile);
customerProfileRouter.put('/avatar', upload.single('avatar'), updateCustomerAvatar);