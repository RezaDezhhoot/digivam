import { Router } from 'express';
import { requestCustomerOtp, verifyCustomerOtp } from '../controllers/customer-auth.controller.js';
import { validateRequest } from '../middlewares/validate-request.js';
import { requestCustomerOtpValidator, verifyCustomerOtpValidator } from '../validators/customer-auth.validator.js';

export const customerAuthRouter = Router();

customerAuthRouter.post('/request-otp', requestCustomerOtpValidator, validateRequest, requestCustomerOtp);
customerAuthRouter.post('/verify-otp', verifyCustomerOtpValidator, validateRequest, verifyCustomerOtp);