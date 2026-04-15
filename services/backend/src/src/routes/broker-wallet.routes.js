import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate-request.js';
import {
  createBrokerWalletCharge,
  getBrokerWalletOverview,
  verifyBrokerWalletCharge,
  createBrokerWithdrawal,
  listBrokerWithdrawals
} from '../controllers/broker-wallet.controller.js';
import {
  createBrokerWalletChargeValidator,
  verifyBrokerWalletChargeValidator,
  createBrokerWithdrawalValidator
} from '../validators/broker-wallet.validator.js';

export const brokerWalletRouter = Router();

brokerWalletRouter.use(requireAuth('broker'));

brokerWalletRouter.get('/', getBrokerWalletOverview);
brokerWalletRouter.post('/charge', createBrokerWalletChargeValidator, validateRequest, createBrokerWalletCharge);
brokerWalletRouter.post('/verify', verifyBrokerWalletChargeValidator, validateRequest, verifyBrokerWalletCharge);
brokerWalletRouter.get('/withdrawals', listBrokerWithdrawals);
brokerWalletRouter.post('/withdrawals', createBrokerWithdrawalValidator, validateRequest, createBrokerWithdrawal);