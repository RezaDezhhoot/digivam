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

export const customerValidationIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه اعتبارسنجی نامعتبر است')
];

export const validationIdParamValidator = [
  param('validationId').isInt({ gt: 0 }).withMessage('شناسه اعتبارسنجی نامعتبر است')
];

export const submitValidationValidator = [
  body('validationId').isInt({ gt: 0 }).withMessage('شناسه اعتبارسنجی الزامی است'),
  body('invoiceId').optional({ values: 'falsy' }).isInt({ gt: 0 }).withMessage('شناسه فاکتور پرداخت نامعتبر است'),
  body('data').optional().custom((value) => {
    if (!isObjectPayload(value)) {
      throw new Error('داده ها باید آبجکت باشند');
    }
    return true;
  })
];

export const resubmitValidationValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه اعتبارسنجی نامعتبر است'),
  body('data').optional().custom((value) => {
    if (!isObjectPayload(value)) {
      throw new Error('داده ها باید آبجکت باشند');
    }
    return true;
  })
];

export const startValidationPaymentValidator = [
  body('validationId').isInt({ gt: 0 }).withMessage('شناسه اعتبارسنجی نامعتبر است')
];

export const verifyValidationPaymentValidator = [
  body('validationId').isInt({ gt: 0 }).withMessage('شناسه اعتبارسنجی نامعتبر است'),
  body('Authority').notEmpty().withMessage('کد رهگیری درگاه الزامی است'),
  body('Status').notEmpty().withMessage('وضعیت بازگشت درگاه الزامی است')
];

export const initValidationValidator = [
  body('validationId').isInt({ gt: 0 }).withMessage('شناسه اعتبارسنجی نامعتبر است')
];

export const saveStageValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه اعتبارسنجی نامعتبر است'),
  body('stageIndex').isInt({ min: 0 }).withMessage('شماره مرحله نامعتبر است'),
  body('fields').optional().custom((value) => {
    if (!isObjectPayload(value)) {
      throw new Error('داده ها باید آبجکت باشند');
    }
    return true;
  })
];

export const finalizeValidationValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه اعتبارسنجی نامعتبر است')
];

export const submitSelfValidationValidator = [
  body('validationId').isInt({ gt: 0 }).withMessage('شناسه اعتبارسنجی الزامی است')
];
