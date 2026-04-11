import { body, param } from 'express-validator';

const normalizeDocumentIdsInput = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  const normalized = String(value || '').trim();

  if (!normalized) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    return Array.isArray(parsed) ? parsed : [normalized];
  } catch {
    return [normalized];
  }
};

const normalizeStagesInput = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  const normalized = String(value || '').trim();

  if (!normalized) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const validateStages = (value) => {
  if (!Array.isArray(value)) {
    throw new Error('ساختار مراحل اعتبارسنجی نامعتبر است');
  }

  value.forEach((stage, stageIndex) => {
    const title = String(stage?.title || '').trim();
    const description = String(stage?.description || '').trim();
    const items = Array.isArray(stage?.items) ? stage.items : [];

    if (!title) {
      throw new Error(`عنوان مرحله ${stageIndex + 1} الزامی است`);
    }

    if (title.length > 255) {
      throw new Error(`عنوان مرحله ${stageIndex + 1} بیش از حد مجاز است`);
    }

    if (description.length > 10000) {
      throw new Error(`توضیحات مرحله ${stageIndex + 1} بیش از حد مجاز است`);
    }

    if (!Array.isArray(stage?.items)) {
      throw new Error(`لیست آیتم های مرحله ${stageIndex + 1} نامعتبر است`);
    }

    items.forEach((item, itemIndex) => {
      const type = String(item?.type || '').trim();

      if (!['document', 'description'].includes(type)) {
        throw new Error(`نوع آیتم مرحله ${stageIndex + 1} در ردیف ${itemIndex + 1} نامعتبر است`);
      }

      if (type === 'document') {
        const documentId = Number(item?.documentId || 0);

        if (!Number.isInteger(documentId) || documentId <= 0) {
          throw new Error(`مستند مرحله ${stageIndex + 1} در ردیف ${itemIndex + 1} نامعتبر است`);
        }

        return;
      }

      const noteTitle = String(item?.title || '').trim();
      const noteDescription = String(item?.description || '').trim();

      if (!noteTitle && !noteDescription) {
        throw new Error(`توضیح مرحله ${stageIndex + 1} در ردیف ${itemIndex + 1} خالی است`);
      }

      if (noteTitle.length > 255) {
        throw new Error(`عنوان توضیح مرحله ${stageIndex + 1} بیش از حد مجاز است`);
      }

      if (noteDescription.length > 10000) {
        throw new Error(`متن توضیح مرحله ${stageIndex + 1} بیش از حد مجاز است`);
      }
    });
  });

  return true;
};

export const validationIdValidator = [
  param('id').isInt({ gt: 0 }).withMessage('شناسه روش اعتبارسنجی نامعتبر است')
];

export const upsertValidationValidator = [
  body('title').notEmpty().withMessage('عنوان روش اعتبارسنجی الزامی است').isLength({ max: 255 }).withMessage('عنوان بیش از حد مجاز است'),
  body('type').notEmpty().withMessage('نوع روش اعتبارسنجی الزامی است').isLength({ max: 255 }).withMessage('نوع بیش از حد مجاز است'),
  body('validFor').optional({ values: 'falsy' }).isInt({ gt: 0 }).withMessage('مدت اعتبار نامعتبر است'),
  body('amount').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('مبلغ نامعتبر است'),
  body('available').optional().isBoolean().withMessage('وضعیت دسترسی نامعتبر است'),
  body('description').optional({ nullable: true }).isLength({ max: 10000 }).withMessage('توضیحات بیش از حد مجاز است'),
  body('introTitle').optional({ nullable: true }).isLength({ max: 500 }).withMessage('عنوان معرفی بیش از حد مجاز است'),
  body('introDescription').optional({ nullable: true }).isLength({ max: 1000 }).withMessage('توضیح معرفی بیش از حد مجاز است'),
  body('stepsLabel').optional({ nullable: true }).isLength({ max: 255 }).withMessage('برچسب مراحل بیش از حد مجاز است'),
  body('featureLines').optional({ nullable: true }),
  body('selfValidation').optional().isBoolean().withMessage('وضعیت اعتبارسنجی شخصی نامعتبر است'),
  body('selfValidationGuide').optional({ nullable: true }).isLength({ max: 10000 }).withMessage('متن راهنما بیش از حد مجاز است'),
  body('selfValidationNote').optional({ nullable: true }).isLength({ max: 10000 }).withMessage('متن نکته مهم بیش از حد مجاز است'),
  body('selfValidationUploadLabel').optional({ nullable: true }).isLength({ max: 500 }).withMessage('عنوان فیلد بارگذاری بیش از حد مجاز است'),
  body('documentIds').optional().customSanitizer(normalizeDocumentIdsInput).isArray().withMessage('لیست مستندات نامعتبر است'),
  body('documentIds.*').optional().isInt({ gt: 0 }).withMessage('شناسه مستند نامعتبر است'),
  body('stages').optional().customSanitizer(normalizeStagesInput).custom(validateStages)
];