import { Router } from 'express';
import {
  requestBrokerOtp,
  verifyBrokerOtp
} from '../controllers/broker-auth.controller.js';
import {
  requestOtpValidator,
  verifyOtpValidator
} from '../validators/broker-auth.validator.js';
import { validateRequest } from '../middlewares/validate-request.js';

export const brokerAuthRouter = Router();

brokerAuthRouter.post('/request-otp', requestOtpValidator, validateRequest, requestBrokerOtp);
brokerAuthRouter.post('/verify-otp', verifyOtpValidator, validateRequest, verifyBrokerOtp);
