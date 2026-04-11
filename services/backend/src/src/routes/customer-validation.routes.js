import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { uploadDocuments, uploadSelfValidation } from '../middlewares/upload.js';
import { validateRequest } from '../middlewares/validate-request.js';
import {
  finalizeValidation,
  getMyValidation,
  getValidationStages,
  getValidationStatus,
  initValidation,
  listMyValidations,
  resubmitValidation,
  saveStage,
  startValidationPayment,
  submitSelfValidation,
  submitValidation,
  verifyValidationPayment
} from '../controllers/customer-validation.controller.js';
import {
  customerValidationIdValidator,
  finalizeValidationValidator,
  initValidationValidator,
  resubmitValidationValidator,
  saveStageValidator,
  startValidationPaymentValidator,
  submitSelfValidationValidator,
  submitValidationValidator,
  validationIdParamValidator,
  verifyValidationPaymentValidator
} from '../validators/customer-validation.validator.js';

export const customerValidationRouter = Router();

customerValidationRouter.use(requireAuth('customer'));

customerValidationRouter.get('/', listMyValidations);
customerValidationRouter.get('/status/:validationId', validationIdParamValidator, validateRequest, getValidationStatus);
customerValidationRouter.get('/stages/:validationId', validationIdParamValidator, validateRequest, getValidationStages);
customerValidationRouter.get('/:id', customerValidationIdValidator, validateRequest, getMyValidation);
customerValidationRouter.post('/payment/start', startValidationPaymentValidator, validateRequest, startValidationPayment);
customerValidationRouter.post('/payment/verify', verifyValidationPaymentValidator, validateRequest, verifyValidationPayment);
customerValidationRouter.post(
  '/',
  uploadDocuments.any(),
  submitValidationValidator,
  validateRequest,
  submitValidation
);
customerValidationRouter.post('/init', initValidationValidator, validateRequest, initValidation);
customerValidationRouter.post(
  '/:id/save-stage',
  uploadDocuments.any(),
  saveStageValidator,
  validateRequest,
  saveStage
);
customerValidationRouter.post('/:id/finalize', finalizeValidationValidator, validateRequest, finalizeValidation);
customerValidationRouter.put(
  '/:id/resubmit',
  uploadDocuments.any(),
  resubmitValidationValidator,
  validateRequest,
  resubmitValidation
);
customerValidationRouter.post(
  '/self-validation',
  uploadSelfValidation.any(),
  submitSelfValidationValidator,
  validateRequest,
  submitSelfValidation
);
