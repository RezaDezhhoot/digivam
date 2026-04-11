import { Router } from 'express';
import {
  createCustomerDealRequest,
  getCustomerDeal,
  getCustomerDealSummary,
  listCustomerDeals,
  requestCustomerDealContractOtp,
  signCustomerDealContract,
  upsertCustomerDealDocuments
} from '../controllers/customer-deal.controller.js';
import {
  advanceDealPaymentStage,
  startDealCashPayment,
  uploadCheckPaymentFile,
  verifyDealCashPayment
} from '../controllers/customer-deal-payment.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { uploadDocuments } from '../middlewares/upload.js';
import { validateRequest } from '../middlewares/validate-request.js';
import {
  createCustomerDealValidator,
  customerDealContractOtpValidator,
  customerDealContractSignValidator,
  dealIdValidator,
  saveCustomerDealDocumentsValidator
} from '../validators/customer-deal.validator.js';

export const customerDealRouter = Router();

customerDealRouter.use(requireAuth('customer'));

customerDealRouter.get('/summary', getCustomerDealSummary);
customerDealRouter.get('/', listCustomerDeals);
customerDealRouter.get('/:id', dealIdValidator, validateRequest, getCustomerDeal);
customerDealRouter.post('/', createCustomerDealValidator, validateRequest, createCustomerDealRequest);
customerDealRouter.post('/:id/documents', uploadDocuments.any(), saveCustomerDealDocumentsValidator, validateRequest, upsertCustomerDealDocuments);
customerDealRouter.post('/:id/contract/request-otp', customerDealContractOtpValidator, validateRequest, requestCustomerDealContractOtp);
customerDealRouter.post('/:id/contract/sign', customerDealContractSignValidator, validateRequest, signCustomerDealContract);
customerDealRouter.post('/:id/payment/advance', dealIdValidator, validateRequest, advanceDealPaymentStage);
customerDealRouter.post('/:id/payment/:paymentTypeId/cash-start', dealIdValidator, validateRequest, startDealCashPayment);
customerDealRouter.post('/:id/payment/:paymentTypeId/cash-verify', dealIdValidator, validateRequest, verifyDealCashPayment);
customerDealRouter.post('/:id/payment/:paymentTypeId/check-upload', dealIdValidator, uploadDocuments.array('file', 10), validateRequest, uploadCheckPaymentFile);