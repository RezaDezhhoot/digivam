import { Router } from 'express';
import {
  getBrokerDeal,
  getBrokerDealSummary,
  listBrokerDeals,
  requestBrokerDealContractOtp,
  reviewBrokerDeal,
  signBrokerDealContract
} from '../controllers/broker-deal.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate-request.js';
import {
  brokerDealContractOtpValidator,
  brokerDealContractSignValidator,
  brokerDealIdValidator,
  reviewBrokerDealValidator
} from '../validators/broker-deal.validator.js';

export const brokerDealRouter = Router();

brokerDealRouter.use(requireAuth('broker'));

brokerDealRouter.get('/summary', getBrokerDealSummary);
brokerDealRouter.get('/', listBrokerDeals);
brokerDealRouter.get('/:id', brokerDealIdValidator, validateRequest, getBrokerDeal);
brokerDealRouter.patch('/:id/review', [...brokerDealIdValidator, ...reviewBrokerDealValidator], validateRequest, reviewBrokerDeal);
brokerDealRouter.post('/:id/contract/request-otp', brokerDealContractOtpValidator, validateRequest, requestBrokerDealContractOtp);
brokerDealRouter.post('/:id/contract/sign', brokerDealContractSignValidator, validateRequest, signBrokerDealContract);