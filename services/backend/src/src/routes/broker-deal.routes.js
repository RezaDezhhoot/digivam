import { Router } from 'express';
import {
  getBrokerDeal,
  getBrokerDealSummary,
  listBrokerDeals,
  requestBrokerDealContractOtp,
  reviewBrokerDeal,
  signBrokerDealContract,
  submitBrokerDealTransfer
} from '../controllers/broker-deal.controller.js';
import {
  getBrokerDealMessages,
  sendBrokerDealMessage,
  getBrokerUnreadCount
} from '../controllers/deal-chat.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { uploadDocuments } from '../middlewares/upload.js';
import { validateRequest } from '../middlewares/validate-request.js';
import {
  brokerDealContractOtpValidator,
  brokerDealContractSignValidator,
  brokerDealIdValidator,
  brokerDealTransferSubmitValidator,
  reviewBrokerDealValidator
} from '../validators/broker-deal.validator.js';

export const brokerDealRouter = Router();

brokerDealRouter.use(requireAuth('broker'));

brokerDealRouter.get('/summary', getBrokerDealSummary);
brokerDealRouter.get('/', listBrokerDeals);
brokerDealRouter.get('/:id', brokerDealIdValidator, validateRequest, getBrokerDeal);
brokerDealRouter.patch('/:id/review', [...brokerDealIdValidator, ...reviewBrokerDealValidator], validateRequest, reviewBrokerDeal);
brokerDealRouter.post('/:id/transfer', uploadDocuments.array('files', 10), brokerDealTransferSubmitValidator, validateRequest, submitBrokerDealTransfer);
brokerDealRouter.post('/:id/contract/request-otp', brokerDealContractOtpValidator, validateRequest, requestBrokerDealContractOtp);
brokerDealRouter.post('/:id/contract/sign', brokerDealContractSignValidator, validateRequest, signBrokerDealContract);
brokerDealRouter.get('/:id/messages', brokerDealIdValidator, validateRequest, getBrokerDealMessages);
brokerDealRouter.post('/:id/messages', brokerDealIdValidator, validateRequest, sendBrokerDealMessage);
brokerDealRouter.get('/:id/messages/unread', brokerDealIdValidator, validateRequest, getBrokerUnreadCount);