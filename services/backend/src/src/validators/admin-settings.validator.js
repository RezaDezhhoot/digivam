import { body } from 'express-validator';

const booleanLike = ['0', '1', 'true', 'false'];

const validateJson = (fieldName, expectation) =>
  body(fieldName)
    .optional({ values: 'falsy' })
    .custom((value) => {
      let parsed;
      try {
        parsed = JSON.parse(String(value || ''));
      } catch {
        throw new Error(expectation === 'array' ? 'ساختار لیست نامعتبر است' : 'ساختار داده نامعتبر است');
      }

      if (expectation === 'array' && !Array.isArray(parsed)) {
        throw new Error('ساختار لیست نامعتبر است');
      }

      if (expectation === 'object' && (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))) {
        throw new Error('ساختار داده نامعتبر است');
      }

      return true;
    });

export const updateSettingsValidator = [
  body('siteName').notEmpty().withMessage('نام سایت الزامی است').isLength({ max: 35 }).withMessage('نام سایت نباید بیشتر از 35 کاراکتر باشد'),
  body('siteDescription').optional({ values: 'falsy' }).isLength({ max: 10000 }).withMessage('توضیحات سایت بیش از حد مجاز است'),
  body('maintenanceMessage').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('پیام بروزرسانی بیش از حد مجاز است'),
  body('defaultMetaTitle').optional({ values: 'falsy' }).isLength({ max: 255 }).withMessage('عنوان سئوی پیش فرض بیش از حد مجاز است'),
  body('defaultMetaDescription').optional({ values: 'falsy' }).isLength({ max: 1000 }).withMessage('توضیحات سئوی پیش فرض بیش از حد مجاز است'),
  body('defaultMetaKeywords').optional({ values: 'falsy' }).isLength({ max: 1000 }).withMessage('کلیدواژه های سئوی پیش فرض بیش از حد مجاز است'),
  body('homeMetaTitle').optional({ values: 'falsy' }).isLength({ max: 255 }).withMessage('عنوان سئوی صفحه اصلی بیش از حد مجاز است'),
  body('homeMetaDescription').optional({ values: 'falsy' }).isLength({ max: 1000 }).withMessage('توضیحات سئوی صفحه اصلی بیش از حد مجاز است'),
  body('homeMetaKeywords').optional({ values: 'falsy' }).isLength({ max: 1000 }).withMessage('کلیدواژه های سئوی صفحه اصلی بیش از حد مجاز است'),
  body('marketMetaTitle').optional({ values: 'falsy' }).isLength({ max: 255 }).withMessage('عنوان سئوی بازار وام بیش از حد مجاز است'),
  body('marketMetaDescription').optional({ values: 'falsy' }).isLength({ max: 1000 }).withMessage('توضیحات سئوی بازار وام بیش از حد مجاز است'),
  body('marketMetaKeywords').optional({ values: 'falsy' }).isLength({ max: 1000 }).withMessage('کلیدواژه های سئوی بازار وام بیش از حد مجاز است'),
  validateJson('homeFeatureCards', 'array'),
  validateJson('footerContent', 'object'),
  validateJson('licensesContent', 'object'),
  body('featuredFacilityId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('وام ویژه انتخاب شده نامعتبر است'),
  body('decreaseValidity')
    .notEmpty()
    .withMessage('مقدار کاهش اعتبار الزامی است')
    .isInt({ min: 0 })
    .withMessage('مقدار کاهش اعتبار نامعتبر است'),
  body('webPanelMaintenance').optional({ values: 'falsy' }).isIn(booleanLike).withMessage('وضعیت دسترسی وب نامعتبر است'),
  body('customerPanelMaintenance').optional({ values: 'falsy' }).isIn(booleanLike).withMessage('وضعیت دسترسی پنل مشتری نامعتبر است'),
  body('brokerPanelMaintenance').optional({ values: 'falsy' }).isIn(booleanLike).withMessage('وضعیت دسترسی پنل کارگزار نامعتبر است'),
  body('loanAdminConfirm1').optional({ values: 'falsy' }).isIn(booleanLike).withMessage('وضعیت تایید اول نامعتبر است'),
  body('loanAdminConfirm2').optional({ values: 'falsy' }).isIn(booleanLike).withMessage('وضعیت تایید دوم نامعتبر است')
];