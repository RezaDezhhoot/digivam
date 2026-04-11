import { body, param } from 'express-validator';
import { PaymentTypes } from '../constants/deal.js';

export const brokerDealIdValidator = [param('id').isInt({ gt: 0 }).withMessage('شناسه معامله نامعتبر است')];

export const reviewBrokerDealValidator = [
  body('action').isIn(['approve', 'reject']).withMessage('عملیات بررسی نامعتبر است'),
  body('reason')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('دلیل حداکثر ۵۰۰۰ کاراکتر باشد'),
  body('paymentTypes')
    .optional()
    .isArray({ min: 1, max: 2 })
    .withMessage('حداقل یک و حداکثر دو روش پرداخت باید ارسال شود'),
  body('paymentTypes.*.paymentType')
    .optional()
    .isIn(Object.values(PaymentTypes))
    .withMessage('نوع روش پرداخت نامعتبر است'),
  body('paymentTypes.*.amount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('مبلغ هر روش پرداخت باید بیشتر از صفر باشد'),
  body('paymentTypes.*.description')
    .optional({ values: 'falsy' })
    .isLength({ max: 5000 })
    .withMessage('توضیح روش پرداخت حداکثر ۵۰۰۰ کاراکتر باشد'),
  body().custom((value) => {
    if (value?.action === 'reject' && !String(value?.reason || '').trim()) {
      throw new Error('برای رد معامله، دلیل الزامی است');
    }

    if (value?.action === 'approve') {
      const paymentTypes = Array.isArray(value?.paymentTypes) ? value.paymentTypes : [];

      if (!paymentTypes.length) {
        throw new Error('برای تایید معامله باید حداقل یک روش پرداخت تعیین شود');
      }

      const seen = new Set();
      for (const item of paymentTypes) {
        const paymentType = String(item?.paymentType || '').trim();
        if (seen.has(paymentType)) {
          throw new Error('هر روش پرداخت فقط یک بار قابل انتخاب است');
        }
        seen.add(paymentType);
      }
    }

    return true;
  })
];

export const brokerDealContractOtpValidator = [param('id').isInt({ gt: 0 }).withMessage('شناسه معامله نامعتبر است')];

export const brokerDealContractSignValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه معامله نامعتبر است'),
  body('code').isLength({ min: 4, max: 6 }).withMessage('کد تایید نامعتبر است'),
  body('signature')
    .isString()
    .isLength({ min: 32, max: 5_000_000 })
    .withMessage('امضای قرارداد نامعتبر است')
];