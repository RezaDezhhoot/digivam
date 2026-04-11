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
  body('brokerId').isInt({ gt: 0 }).withMessage('کارگزار الزامی است'),
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
  body('averageReviewHours').optional({ nullable: true }).isInt({ min: 0, max: 9999 }).withMessage('متوسط زمان بررسی نامعتبر است'),
  body('seoTitle').optional({ values: 'falsy' }).isLength({ max: 255 }).withMessage('عنوان سئو بیش از حد مجاز است'),
  body('seoDescription').optional({ values: 'falsy' }).isLength({ max: 1000 }).withMessage('توضیحات سئو بیش از حد مجاز است'),
  body('seoKeywords').optional({ values: 'falsy' }).isLength({ max: 1000 }).withMessage('کلیدواژه های سئو بیش از حد مجاز است'),
  body('seoCanonicalUrl').optional({ values: 'falsy' }).isURL({ require_protocol: true }).withMessage('آدرس canonical نامعتبر است'),
  body('seoRobots').optional({ values: 'falsy' }).isLength({ max: 120 }).withMessage('مقدار robots نامعتبر است'),
  body('validationIntroTitle').optional({ values: 'falsy' }).isLength({ max: 255 }).withMessage('عنوان معرفی اعتبارسنجی بیش از حد مجاز است'),
  body('validationIntroDescription').optional({ values: 'falsy' }).isLength({ max: 2000 }).withMessage('توضیح معرفی اعتبارسنجی بیش از حد مجاز است'),
  body('validationStepsLabel').optional({ values: 'falsy' }).isLength({ max: 120 }).withMessage('متن مراحل اعتبارسنجی نامعتبر است'),
  body('validationFeatureLines').optional().customSanitizer(toArray).isArray({ max: 10 }).withMessage('ویژگی های اعتبارسنجی نامعتبر است'),
  body('validationFeatureLines.*').optional({ values: 'falsy' }).isLength({ max: 255 }).withMessage('متن ویژگی اعتبارسنجی بیش از حد مجاز است')
];

export const facilityIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه امتیاز وام نامعتبر است')
];

export const upsertAdminFacilityValidator = baseFacilityRules;

export const reviewAdminFacilityValidator = [
  body('status')
    .isIn([Facility.STATUSES.PUBLISHED, Facility.STATUSES.REJECTED])
    .withMessage('وضعیت بررسی نامعتبر است'),
  body('reason').notEmpty().withMessage('ثبت دلیل بررسی الزامی است').isLength({ max: 5000 }).withMessage('دلیل بررسی بیش از حد مجاز است')
];