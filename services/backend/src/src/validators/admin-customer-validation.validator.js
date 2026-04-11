import { body, param } from 'express-validator';

export const customerValidationIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه اعتبارسنجی مشتری نامعتبر است')
];

export const updateCustomerValidationValidator = [
  body('status')
    .optional()
    .isIn(['submit', 'pending', 'approved', 'rejected', 'expired'])
    .withMessage('وضعیت نامعتبر است'),
  body('result')
    .optional()
    .isLength({ max: 10000 })
    .withMessage('نتیجه بررسی حداکثر ۱۰۰۰۰ کاراکتر'),
  body('expiresAt')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('تاریخ اعتبار نامعتبر است'),
  body('data')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return true;
        } catch {
          throw new Error('داده ها باید JSON معتبر باشند');
        }
      }

      if (value !== null && typeof value !== 'object') {
        throw new Error('داده ها باید آبجکت باشند');
      }
      return true;
    })
];
