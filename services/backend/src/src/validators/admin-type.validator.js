import { body, param } from 'express-validator';
import { Type } from '../models/type.model.js';

const parseContractTemplate = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const loanTypeIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه نوع وام نامعتبر است')
];

export const upsertLoanTypeValidator = [
  body('title').notEmpty().withMessage('عنوان نوع وام الزامی است').isLength({ max: 255 }).withMessage('عنوان بیش از حد مجاز است'),
  body('type').isIn(Object.values(Type.TYPES)).withMessage('نوع تسهیلات نامعتبر است'),
  body('body').optional().isLength({ max: 10000 }).withMessage('توضیحات بیش از حد مجاز است'),
  body('contractTemplate')
    .optional({ values: 'falsy' })
    .custom((value) => {
      const parsed = parseContractTemplate(value);

      if (!parsed) {
        throw new Error('قالب قرارداد نامعتبر است');
      }

      const header = parsed.header && typeof parsed.header === 'object' && !Array.isArray(parsed.header) ? parsed.header : {};
      const footer = parsed.footer && typeof parsed.footer === 'object' && !Array.isArray(parsed.footer) ? parsed.footer : {};

      if (String(header.title || '').length > 255) {
        throw new Error('عنوان هدر قرارداد بیش از حد مجاز است');
      }

      if (String(header.dateText || '').length > 255) {
        throw new Error('متن تاریخ قرارداد بیش از حد مجاز است');
      }

      if (String(header.contractNumberText || '').length > 255) {
        throw new Error('متن شماره قرارداد بیش از حد مجاز است');
      }

      if (String(parsed.bodyHtml || '').length > 120000) {
        throw new Error('متن بدنه قرارداد بیش از حد مجاز است');
      }

      if (String(footer.customerSignatureLabel || '').length > 255) {
        throw new Error('عنوان امضای مشتری بیش از حد مجاز است');
      }

      if (String(footer.brokerSignatureLabel || '').length > 255) {
        throw new Error('عنوان امضای کارگزار بیش از حد مجاز است');
      }

      if (String(footer.note || '').length > 2000) {
        throw new Error('یادداشت فوتر قرارداد بیش از حد مجاز است');
      }

      return true;
    })
];