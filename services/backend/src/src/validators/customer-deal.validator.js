import { body, param } from 'express-validator';

const isObjectPayload = (value) => {
  if (value == null || value === '') {
    return true;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return true;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }

  return false;
};

export const dealIdValidator = [param('id').isInt({ gt: 0 }).withMessage('شناسه معامله نامعتبر است')];

export const createCustomerDealValidator = [
  body('facilityId').isInt({ gt: 0 }).withMessage('شناسه وام نامعتبر است'),
  body('requestedAmount').isFloat({ gt: 0 }).withMessage('مبلغ انتخابی نامعتبر است'),
  body('installmentMonths').optional({ values: 'falsy' }).isInt({ gt: 0 }).withMessage('تعداد اقساط نامعتبر است'),
  body('interestRate').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('نرخ سود نامعتبر است')
];

export const saveCustomerDealDocumentsValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه معامله نامعتبر است'),
  body('fields')
    .optional()
    .custom((value) => {
      if (!isObjectPayload(value)) {
        throw new Error('فیلدهای معامله باید به صورت آبجکت ارسال شوند');
      }
      return true;
    }),
  body('submit')
    .optional({ values: 'falsy' })
    .custom((value) => ['0', '1', 'true', 'false', true, false].includes(value))
    .withMessage('وضعیت ارسال مدارک نامعتبر است')
];

export const customerDealContractOtpValidator = [param('id').isInt({ gt: 0 }).withMessage('شناسه معامله نامعتبر است')];

export const customerDealContractSignValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه معامله نامعتبر است'),
  body('code').isLength({ min: 4, max: 6 }).withMessage('کد تایید نامعتبر است'),
  body('signature')
    .isString()
    .isLength({ min: 32, max: 5_000_000 })
    .withMessage('امضای قرارداد نامعتبر است')
];