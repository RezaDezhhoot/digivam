import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate-request.js';
import { upload } from '../middlewares/upload.js';
import {
  getBrokerProfile,
  updateBrokerAvatar,
  updateBrokerProfileLevel1,
  updateBrokerProfileLevel2
} from '../controllers/broker-profile.controller.js';
import {
  profileLevel1Validator,
  profileLevel2Validator
} from '../validators/broker-profile.validator.js';

export const brokerProfileRouter = Router();

brokerProfileRouter.use(requireAuth('broker'));

brokerProfileRouter.get('/', getBrokerProfile);
brokerProfileRouter.put('/level-1', profileLevel1Validator, validateRequest, updateBrokerProfileLevel1);
brokerProfileRouter.put(
  '/level-2',
  upload.fields([
    { name: 'idCartImage', maxCount: 1 },
    { name: 'birthCertificateImage', maxCount: 1 }
  ]),
  profileLevel2Validator,
  validateRequest,
  updateBrokerProfileLevel2
);
brokerProfileRouter.put('/avatar', upload.single('avatar'), updateBrokerAvatar);
