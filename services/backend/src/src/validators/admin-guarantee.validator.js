import { body, param } from 'express-validator';

export const guaranteeIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه ضمانت نامعتبر است')
];

export const upsertGuaranteeValidator = [
  body('title').notEmpty().withMessage('عنوان ضمانت الزامی است').isLength({ max: 50 }).withMessage('عنوان ضمانت نباید بیشتر از 50 کاراکتر باشد'),
  body('help').optional({ values: 'falsy' }).isLength({ max: 3000 }).withMessage('متن راهنما نباید بیشتر از 3000 کاراکتر باشد')
];