import { body, param } from 'express-validator';
import { Facility } from '../models/facility.model.js';

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null || value === '') {
    return [];
  }

  return [value];
};

const baseFacilityRules = [
  body('title').notEmpty().withMessage('عنوان امتیاز وام الزامی است').isLength({ max: 255 }).withMessage('عنوان بیش از حد مجاز است'),
  body('subTypeId').isInt({ gt: 0 }).withMessage('نوع وام الزامی است'),
  body('minAmount').isFloat({ min: Facility.MIN_ALLOWED_AMOUNT, max: Facility.MAX_ALLOWED_AMOUNT }).withMessage('حداقل مبلغ نامعتبر است'),
  body('maxAmount').isFloat({ min: Facility.MIN_ALLOWED_AMOUNT, max: Facility.MAX_ALLOWED_AMOUNT }).withMessage('حداکثر مبلغ نامعتبر است'),
  body('withdrawDeadline').isInt({ gt: 0 }).withMessage('مهلت برداشت نامعتبر است'),
  body('body').optional({ nullable: true }).isLength({ max: 4000 }).withMessage('توضیحات بیش از حد مجاز است'),
  body('validationId').optional({ values: 'falsy' }).isInt({ gt: 0 }).withMessage('روش اعتبارسنجی نامعتبر است'),
  body('paymentType').isIn(Object.values(Facility.PAYMENT_TYPES)).withMessage('نوع پرداخت نامعتبر است'),
  body('guaranteeIds').customSanitizer(toArray).isArray({ min: 1 }).withMessage('حداقل یک ضمانت باید انتخاب شود'),
  body('guaranteeIds.*').isInt({ gt: 0 }).withMessage('شناسه ضمانت نامعتبر است'),
  body('profits').customSanitizer(toArray).isArray({ min: 1 }).withMessage('حداقل یک درصد سود باید ثبت شود'),
  body('profits.*').isFloat({ gt: 0, max: 300 }).withMessage('مقدار درصد سود نامعتبر است'),
  body('installments').customSanitizer(toArray).isArray({ min: 1 }).withMessage('حداقل یک تعداد قسط باید ثبت شود'),
  body('installments.*').isInt({ gt: 0 }).withMessage('تعداد قسط نامعتبر است'),
  body('averageReviewHours').optional({ nullable: true }).isInt({ min: 0, max: 9999 }).withMessage('متوسط زمان بررسی نامعتبر است')
];

export const brokerFacilityIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه امتیاز وام نامعتبر است')
];

export const upsertBrokerFacilityValidator = baseFacilityRules;