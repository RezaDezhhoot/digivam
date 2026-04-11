import { body, param } from 'express-validator';
import { Document } from '../models/document.model.js';

export const documentIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه مستند نامعتبر است')
];

export const upsertDocumentValidator = [
  body('title').notEmpty().withMessage('عنوان مستند الزامی است').isLength({ max: 255 }).withMessage('عنوان مستند بیش از حد مجاز است'),
  body('type').isIn(Object.values(Document.TYPES)).withMessage('نوع فیلد نامعتبر است'),
  body('mimes').optional({ nullable: true }).isLength({ max: 255 }).withMessage('فرمت mime بیش از حد مجاز است'),
  body('max').optional({ values: 'falsy' }).isInt({ gt: 0 }).withMessage('حداکثر مقدار نامعتبر است'),
  body('help').optional({ nullable: true }).isLength({ max: 10000 }).withMessage('متن راهنما بیش از حد مجاز است'),
  body('subject').optional({ values: 'falsy' }).isIn(Object.values(Document.SUBJECTS)).withMessage('موضوع مستند نامعتبر است'),
  body('required').optional().isBoolean().withMessage('مقدار required نامعتبر است'),
  body('category')
    .optional({ values: 'falsy' })
    .isIn(Object.values(Document.CATEGORIES))
    .withMessage('دسته بندی مستند نامعتبر است')
];