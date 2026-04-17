import { Router } from 'express';
import {
  confirmCustomerDealTransfer,
  createCustomerDealRequest,
  getCustomerDeal,
  getCustomerDealSummary,
  listCustomerDeals,
  requestCustomerDealAdminReview,
  requestCustomerDealContractOtp,
  requestCustomerDealTransferOtp,
  signCustomerDealContract,
  upsertCustomerDealDocuments,
  rateBrokerForDeal
} from '../controllers/customer-deal.controller.js';
import {
  advanceDealPaymentStage,
  startDealCashPayment,
  uploadCheckPaymentFile,
  verifyDealCashPayment
} from '../controllers/customer-deal-payment.controller.js';
import {
  getCustomerConversations,
  getCustomerDealMessages,
  sendCustomerDealMessage,
  getCustomerUnreadCount
} from '../controllers/deal-chat.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { uploadDocuments } from '../middlewares/upload.js';
import { validateRequest } from '../middlewares/validate-request.js';
import {
  createCustomerDealValidator,
  customerDealAdminReviewRequestValidator,
  customerDealTransferConfirmValidator,
  customerDealContractOtpValidator,
  customerDealContractSignValidator,
  dealIdValidator,
  saveCustomerDealDocumentsValidator,
  rateBrokerValidator
} from '../validators/customer-deal.validator.js';

export const customerDealRouter = Router();

customerDealRouter.use(requireAuth('customer'));

customerDealRouter.get('/conversations', getCustomerConversations);
customerDealRouter.get('/summary', getCustomerDealSummary);
customerDealRouter.get('/', listCustomerDeals);
customerDealRouter.get('/:id', dealIdValidator, validateRequest, getCustomerDeal);
customerDealRouter.post('/', createCustomerDealValidator, validateRequest, createCustomerDealRequest);
customerDealRouter.post('/:id/documents', uploadDocuments.any(), saveCustomerDealDocumentsValidator, validateRequest, upsertCustomerDealDocuments);
customerDealRouter.post('/:id/contract/request-otp', customerDealContractOtpValidator, validateRequest, requestCustomerDealContractOtp);
customerDealRouter.post('/:id/contract/sign', customerDealContractSignValidator, validateRequest, signCustomerDealContract);
customerDealRouter.post('/:id/admin-review', customerDealAdminReviewRequestValidator, validateRequest, requestCustomerDealAdminReview);
customerDealRouter.post('/:id/transfer/request-otp', dealIdValidator, validateRequest, requestCustomerDealTransferOtp);
customerDealRouter.post('/:id/transfer/confirm', customerDealTransferConfirmValidator, validateRequest, confirmCustomerDealTransfer);
customerDealRouter.post('/:id/payment/advance', dealIdValidator, validateRequest, advanceDealPaymentStage);
customerDealRouter.post('/:id/payment/:paymentTypeId/cash-start', dealIdValidator, validateRequest, startDealCashPayment);
customerDealRouter.post('/:id/payment/:paymentTypeId/cash-verify', dealIdValidator, validateRequest, verifyDealCashPayment);
customerDealRouter.post('/:id/payment/:paymentTypeId/check-upload', dealIdValidator, uploadDocuments.array('file', 10), validateRequest, uploadCheckPaymentFile);
customerDealRouter.get('/:id/messages', dealIdValidator, validateRequest, getCustomerDealMessages);
customerDealRouter.post('/:id/messages', dealIdValidator, validateRequest, sendCustomerDealMessage);
customerDealRouter.get('/:id/messages/unread', dealIdValidator, validateRequest, getCustomerUnreadCount);
customerDealRouter.post('/:id/rate', rateBrokerValidator, validateRequest, rateBrokerForDeal);