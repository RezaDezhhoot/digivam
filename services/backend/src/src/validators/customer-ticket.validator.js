import { body, param } from 'express-validator';

export const customerTicketIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه تیکت نامعتبر است')
];

export const createCustomerTicketValidator = [
  body('subject').notEmpty().withMessage('موضوع تیکت الزامی است').isLength({ max: 100 }).withMessage('موضوع تیکت نباید بیشتر از 100 کاراکتر باشد'),
  body('body').notEmpty().withMessage('متن تیکت الزامی است').isLength({ max: 10000 }).withMessage('متن تیکت بیش از حد مجاز است')
];

export const replyCustomerTicketValidator = [
  ...customerTicketIdValidator,
  body('body').notEmpty().withMessage('متن پاسخ الزامی است').isLength({ max: 10000 }).withMessage('متن پاسخ بیش از حد مجاز است')
];