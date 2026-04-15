import { body, param } from 'express-validator';

export const brokerIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه کارگزار نامعتبر است')
];

export const updateBrokerLevelValidator = [
  ...brokerIdValidator,
  body('verifyLevel').isInt({ min: 1, max: 3 }).withMessage('سطح احراز هویت نامعتبر است')
];

const suspensionReasonRule = (label) =>
  body('suspendReason')
    .custom((value, { req }) => {
      const shouldSuspend = req.body.isSuspended === true || req.body.isSuspended === 'true';

      if (shouldSuspend && !String(value || '').trim()) {
        throw new Error(`ثبت علت تعلیق ${label} الزامی است`);
      }

      return true;
    })
    .bail()
    .optional({ nullable: true })
    .isLength({ max: 1000 })
    .withMessage('علت تعلیق نباید بیشتر از 1000 کاراکتر باشد');

export const updateBrokerSuspensionValidator = [
  ...brokerIdValidator,
  body('isSuspended').isBoolean().withMessage('وضعیت تعلیق کارگزار نامعتبر است'),
  suspensionReasonRule('کارگزار')
];

export const customerIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه مشتری نامعتبر است')
];

export const updateCustomerSuspensionValidator = [
  ...customerIdValidator,
  body('isSuspended').isBoolean().withMessage('وضعیت تعلیق مشتری نامعتبر است'),
  suspensionReasonRule('مشتری')
];

export const adminIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه ادمین نامعتبر است')
];

export const createAdminValidator = [
  body('name').notEmpty().withMessage('نام ادمین الزامی است'),
  body('phone').notEmpty().withMessage('شماره همراه الزامی است'),
  body('password').isLength({ min: 6 }).withMessage('رمز عبور باید حداقل 6 کاراکتر باشد')
];

export const updateAdminValidator = [
  ...adminIdValidator,
  body('name').notEmpty().withMessage('نام ادمین الزامی است'),
  body('phone').notEmpty().withMessage('شماره همراه الزامی است'),
  body('password').optional().isLength({ min: 6 }).withMessage('رمز عبور باید حداقل 6 کاراکتر باشد')
];
