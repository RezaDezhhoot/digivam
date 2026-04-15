import { body, param } from 'express-validator';

export const brokerWalletIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('شناسه کارگزار نامعتبر است')
];

export const adminBrokerWalletOperationValidator = [
  ...brokerWalletIdValidator,
  body('amount').isInt({ min: 1 }).withMessage('مبلغ نامعتبر است'),
  body('description').optional().isString().isLength({ max: 500 }).withMessage('توضیحات حداکثر ۵۰۰ کاراکتر')
];
