import { body, param } from 'express-validator';

export const tutorialIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه آموزش نامعتبر است')
];

export const upsertTutorialValidator = [
  body('title').notEmpty().withMessage('عنوان آموزش الزامی است').isLength({ max: 255 }).withMessage('عنوان آموزش نباید بیشتر از 255 کاراکتر باشد'),
  body('description').optional({ values: 'falsy' }).isLength({ max: 5000 }).withMessage('توضیحات نباید بیشتر از 5000 کاراکتر باشد'),
  body('sort').optional().isInt().withMessage('ترتیب باید عدد صحیح باشد'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('وضعیت نامعتبر است')
];
