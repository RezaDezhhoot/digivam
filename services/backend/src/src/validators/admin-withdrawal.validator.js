import { body, param } from 'express-validator';
import { BrokerWithdrawal } from '../models/broker-withdrawal.model.js';

export const withdrawalIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه درخواست برداشت نامعتبر است')
];

export const updateAdminWithdrawalValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه درخواست برداشت نامعتبر است'),
  body('status')
    .notEmpty()
    .withMessage('وضعیت الزامی است')
    .isIn(Object.values(BrokerWithdrawal.STATUSES))
    .withMessage('وضعیت نامعتبر است'),
  body('adminMessage')
    .optional({ values: 'falsy' })
    .isString()
    .isLength({ max: 2000 })
    .withMessage('پیام حداکثر ۲۰۰۰ کاراکتر باشد')
];
