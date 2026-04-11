import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { env } from '../config/env.js';
import '../models/index.js';
import { Broker } from '../models/broker.model.js';
import { Document } from '../models/document.model.js';
import { Facility } from '../models/facility.model.js';
import { FacilityBookmark } from '../models/facility-bookmark.model.js';
import { FacilityDailyView } from '../models/facility-daily-view.model.js';
import { FacilityInstallment } from '../models/facility-installment.model.js';
import { FacilityProfit } from '../models/facility-profit.model.js';
import { File } from '../models/file.model.js';
import { Guarantee } from '../models/guarantee.model.js';
import { Type } from '../models/type.model.js';
import { Validation } from '../models/validation.model.js';
import { serializeFacility } from './facility.service.js';
import { loadPublicSiteSettings } from './site-settings.service.js';

const publicFacilityInclude = [
  {
    model: Broker,
    as: 'broker',
    required: false,
    attributes: ['id', 'name', 'phone', 'verifyLevel', 'rate', 'metadata', 'createdAt']
  },
  {
    model: Type,
    as: 'subTypeModel',
    required: false,
    attributes: ['id', 'title', 'type']
  },
  {
    model: Validation,
    as: 'validation',
    required: false,
    attributes: ['id', 'title', 'type', 'validFor', 'amount', 'available', 'description', 'stages', 'intro_title', 'intro_description', 'steps_label', 'feature_lines', 'self_validation', 'self_validation_guide', 'self_validation_note', 'self_validation_upload_label'],
    include: [
      {
        model: Document,
        as: 'documents',
        required: false,
        attributes: ['id', 'title', 'type', 'required', 'help'],
        through: { attributes: [] }
      },
      {
        model: File,
        as: 'trainingVideo',
        required: false
      }
    ]
  },
  {
    model: Guarantee,
    as: 'guarantees',
    required: false,
    attributes: ['id', 'title', 'help'],
    through: { attributes: [] }
  },
  {
    model: FacilityProfit,
    as: 'profits',
    required: false,
    attributes: ['id', 'percent']
  },
  {
    model: FacilityInstallment,
    as: 'installments',
    required: false,
    attributes: ['id', 'month']
  },
  {
    model: Document,
    as: 'requiredDocuments',
    required: false,
    attributes: ['id', 'title', 'type', 'subject', 'required', 'category', 'help', 'mimes', 'max'],
    through: { attributes: ['sort'], as: 'link' }
  }
];

const parseObject = (value, fallback = {}) => {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const parseArray = (value) => (Array.isArray(value) ? value : []);
const uniqueStrings = (items = []) => [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))];
const normalizeString = (value) => String(value || '').trim();

const validationFileUrl = (file) => {
  if (!file) return null;
  const rawPath = String(file.path || '').replace(/\\/g, '/');
  if (/^https?:\/\//i.test(rawPath)) return rawPath;
  return `${env.backendBaseUrl}/uploads/${rawPath.replace(/^\/+/, '')}`;
};

const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;

const calculateLoanPreview = ({ amount, percent, months, digiVamFeeValue = 0 }) => {
  const principal = Number(amount || 0);
  const rate = Number(percent || 0);
  const installmentMonths = Number(months || 0);
  const totalInterest = Math.round(principal * (rate / 100));
  const grossTotal = principal + totalInterest;
  const monthlyPayment = installmentMonths > 0 ? Math.round(grossTotal / installmentMonths) : grossTotal;
  const netAmount = Math.max(principal - Number(digiVamFeeValue || 0), 0);

  return {
    monthlyPayment,
    totalInterest,
    netAmount,
    digiVamFeeValue: Number(digiVamFeeValue || 0)
  };
};

const createAmountOptions = ({ minAmount, maxAmount, publicContent }) => {
  const configured = parseArray(publicContent.amountOptions)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);

  if (configured.length) {
    return [...new Set(configured)].sort((left, right) => left - right);
  }

  const min = Number(minAmount || 0);
  const max = Number(maxAmount || 0);

  if (min > 0 && max > min) {
    return [min, Math.round((min + max) / 2), max];
  }

  return [max || min].filter(Boolean);
};

const createValidationStagesPayload = (validation) => {
  const stages = Array.isArray(validation?.stages) ? validation.stages : [];

  if (!stages.length) {
    return [];
  }

  const documentMap = new Map(
    (Array.isArray(validation?.documents) ? validation.documents : []).map((item) => [Number(item.id), item])
  );

  return stages
    .map((stage, stageIndex) => ({
      id: `stage-${stageIndex + 1}`,
      title: String(stage?.title || '').trim() || `مرحله ${stageIndex + 1}`,
      description: String(stage?.description || '').trim(),
      items: (Array.isArray(stage?.items) ? stage.items : [])
        .map((item, itemIndex) => {
          if (item?.type === 'document') {
            const documentId = Number(item.documentId || 0);
            const document = documentMap.get(documentId);

            if (!document) {
              return null;
            }

            return {
              id: `stage-${stageIndex + 1}-document-${itemIndex + 1}`,
              type: 'document',
              title: document.title,
              help: document.help || '',
              typeLabel: Document.TYPE_LABELS[document.type] || document.type,
              required: Boolean(document.required)
            };
          }

          if (item?.type !== 'description') {
            return null;
          }

          return {
            id: `stage-${stageIndex + 1}-description-${itemIndex + 1}`,
            type: 'description',
            title: String(item?.title || '').trim(),
            description: String(item?.description || '').trim()
          };
        })
        .filter(Boolean)
    }))
    .filter((stage) => stage.title || stage.description || stage.items.length);
};

const createValidationPayload = ({ base, publicContent, raw }) => {
  if (!base.validationId) {
    return null;
  }

  const validationConfig = parseObject(publicContent.validation);
  const providerTitle = raw.validation?.title || validationConfig.providerTitle || base.validationTitle;
  return {
    validationId: base.validationId,
    providerTitle,
    validFor: Number(raw.validation?.validFor || 0) || null,
    validForLabel: raw.validation?.validFor ? `${raw.validation.validFor} روز اعتبار` : 'بدون انقضا',
    introTitle: validationConfig.introTitle || raw.validation?.introTitle || 'اعتبارسنجی توسط دیجی وام',
    introDescription: raw.validation?.intro_description,
    stepsLabel: validationConfig.stepsLabel || raw.validation?.stepsLabel || `${(raw.validation?.stages || []).length || 4} مرحله ساده`,
    featureLines: uniqueStrings(
      (Array.isArray(raw.validation?.feature_lines) && raw.validation.feature_lines.length ? raw.validation.feature_lines : ['دریافت گزارش کامل اعتبار سنجی', 'سریع , آسان و بدون دردسر'])
    ),
    costText:
      validationConfig.costText ||
      (raw.validation?.amount ? `هزینه ثبت نام و اعتبارسنجی : ${formatMoney(raw.validation.amount)}` : 'بدون هزینه اضافی'),
    primaryActionLabel: validationConfig.primaryActionLabel || 'انتخاب این روش',
    selfValidation: Boolean(raw.validation?.self_validation),
    selfValidationGuide: raw.validation?.self_validation_guide || '',
    selfValidationNote: raw.validation?.self_validation_note || '',
    selfValidationUploadLabel: raw.validation?.self_validation_upload_label || 'بارگذاری فایل گزارش',
    secondaryTitle: validationConfig.secondaryTitle || 'اعتبارسنجی شخصی(خودم انجام میدم)',
    secondaryDescription:
      validationConfig.secondaryDescription ||
      raw.validation?.self_validation_guide ||
      'در سامانه مرآت اعتبارسنجی کرده یا اگر قبلا اعتبارسنجی کرده اید گزارش خود را بارگذاری کنید.',
    secondaryNote:
      validationConfig.secondaryNote ||
      raw.validation?.self_validation_note ||
      'بدون هزینه اضافی',
    uploadLabel:
      validationConfig.uploadLabel ||
      raw.validation?.self_validation_upload_label ||
      'بارگذاری فایل گزارش',
    secondaryActionLabel: validationConfig.secondaryActionLabel || 'انتخاب این روش',
    description: raw.validation?.description || '',
    trainingVideoUrl: validationFileUrl(raw.validation?.trainingVideo),
    stages: createValidationStagesPayload(raw.validation)
  };
};

const createFacilitySeo = ({ base, publicContent }) => {
  const seo = parseObject(publicContent.seo);
  const descriptionFallback =
    normalizeString(seo.description) ||
    normalizeString(publicContent.description) ||
    normalizeString(base.body) ||
    `مشاهده جزئیات، شرایط و مدارک موردنیاز برای ${base.title}`;

  return {
    title: normalizeString(seo.title) || `${base.title} | ${base.loanTypeTitle}`,
    description: descriptionFallback,
    keywords:
      normalizeString(seo.keywords) ||
      uniqueStrings([base.title, base.loanTypeTitle, base.typeLabel, 'وام', 'امتیاز وام']).join(', '),
    canonicalUrl: normalizeString(seo.canonicalUrl),
    robots: normalizeString(seo.robots) || 'index,follow'
  };
};

export const serializeWebFacility = (item) => {
  const raw = typeof item?.toJSON === 'function' ? item.toJSON() : item;
  const base = serializeFacility(raw);
  const publicContent = parseObject(raw.publicContent);
  const tags = uniqueStrings(publicContent.tags || [base.loanTypeTitle, base.typeLabel]);
  const amountOptions = createAmountOptions({
    minAmount: base.minAmount,
    maxAmount: base.maxAmount,
    publicContent
  });
  const installmentOptions = [...new Set((base.installments || []).map((item) => Number(item.month || 0)).filter(Boolean))].sort(
    (left, right) => left - right
  );
  const rateOptions = [...new Set((base.profits || []).map((item) => Number(item.percent || 0)).filter(Boolean))].sort(
    (left, right) => left - right
  );
  const defaultAmount = amountOptions[0] || Number(base.minAmount || 0);
  const defaultMonths = installmentOptions[0] || null;
  const defaultRate = rateOptions[0] || null;
  const digiVamFeeValue = Number(publicContent.digiVamFeeValue || 0);
  const preview = calculateLoanPreview({
    amount: defaultAmount,
    percent: defaultRate,
    months: defaultMonths,
    digiVamFeeValue
  });

  return {
    id: base.id,
    slug: base.slug,
    title: base.title,
    description:
      String(publicContent.description || base.body || '').trim() ||
      'جزئیات این امتیاز وام به صورت کامل از طریق همین صفحه قابل بررسی است.',
    institutionName: String(publicContent.institutionName || base.loanTypeTitle || base.title || '-').trim(),
    categoryTitle: base.loanTypeTitle,
    type: base.type,
    typeLabel: base.typeLabel,
    tags,
    minAmount: Number(base.minAmount || 0),
    maxAmount: Number(base.maxAmount || 0),
    withdrawDeadline: base.withdrawDeadline,
    requestCount: Number(publicContent.requestCount || 0),
    rating: Number(raw.broker?.rate || publicContent.rating || 0),
    averageReviewHours: Number(raw.averageReviewHours || publicContent.averageReviewHours || 0),
    documentsCount: Number(publicContent.documentsCount || base.requiredDocuments?.length || 0),
    guaranteeBadges: uniqueStrings((base.guarantees || []).map((item) => item.title)),
    guarantees: (base.guarantees || []).map((item) => ({
      id: item.id,
      title: item.title,
      help: item.help || ''
    })),
    validationRequired: Boolean(base.validationId),
    validationTitle: base.validationTitle,
    status: base.status,
    statusLabel: base.statusLabel,
    views: base.views,
    amountOptions,
    installmentOptions,
    rateOptions,
    brokerFeeText: String(publicContent.brokerFeeText || 'توافقی').trim(),
    digiVamFeeText: String(publicContent.digiVamFeeText || (digiVamFeeValue ? formatMoney(digiVamFeeValue) : '0 تومان')).trim(),
    calculatorDefaults: {
      amount: defaultAmount,
      months: defaultMonths,
      rate: defaultRate
    },
    calculatorPreview: {
      monthlyPayment: preview.monthlyPayment,
      totalInterest: preview.totalInterest,
      netAmount: preview.netAmount
    },
    broker: {
      id: raw.broker?.id || base.brokerId,
      name: raw.broker?.name || 'کارگزار نامشخص',
      phone: raw.broker?.phone || '-',
      rating: Number(publicContent.brokerRating || raw.broker?.rate || publicContent.rating || 0),
      requestCount: Number(publicContent.brokerRequestCount || publicContent.requestCount || 0),
      startedAtLabel:
        String(publicContent.brokerStartedAt || parseObject(raw.broker?.metadata).startedAtLabel || '').trim() ||
        (raw.broker?.createdAt ? new Date(raw.broker.createdAt).getFullYear().toString() : '-'),
      summary:
        String(publicContent.brokerSummary || 'بر اساس شرایط وام شما، بهترین گزینه را انتخاب کرده‌ایم').trim() ||
        'بر اساس شرایط وام شما، بهترین گزینه را انتخاب کرده‌ایم'
    },
    seo: createFacilitySeo({ base, publicContent }),
    validation: createValidationPayload({ base, publicContent, raw }),
    requiredDocuments: (base.requiredDocuments || []).map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      typeLabel: Document.TYPE_LABELS[doc.type] || doc.type,
      subject: doc.subject || null,
      required: doc.required,
      category: doc.category,
      help: doc.help || '',
      mimes: doc.mimes || null,
      max: doc.max ? Number(doc.max) : null
    })),
    bookmarkCount: base.bookmarkCount || 0,
    importantNotes: uniqueStrings(
      publicContent.importantNotes || [
        'لطفاً قبل از ثبت درخواست، شرایط وام و مدارک مورد نیاز را با دقت بررسی کنید.',
        'پس از ثبت درخواست، کارشناسان و کارگزار مربوطه در کوتاه‌ترین زمان با شما هماهنگ خواهند کرد.'
      ]
    )
  };
};

export const listPublishedWebFacilities = async (filters = {}) => {
  const where = { status: Facility.STATUSES.PUBLISHED };

  if (filters.minAmount) {
    where.maxAmount = { [Op.gte]: Number(filters.minAmount) };
  }

  if (filters.maxAmount) {
    where.minAmount = { [Op.lte]: Number(filters.maxAmount) };
  }

  const rows = await Facility.findAll({
    where,
    include: publicFacilityInclude,
    attributes: {
      include: [
        [sequelize.literal('(SELECT COUNT(*) FROM facility_bookmarks WHERE facility_bookmarks.facility_id = Facility.id)'), 'bookmarkCount']
      ]
    },
    order: [['updatedAt', 'DESC'], ['id', 'DESC']],
    distinct: true
  });

  let items = rows.map(serializeWebFacility);

  if (filters.category && filters.category !== 'همه وام ها') {
    items = items.filter((item) => (item.tags || []).includes(filters.category));
  }

  if (filters.guarantee && filters.guarantee !== 'همه') {
    items = items.filter((item) => (item.guaranteeBadges || []).includes(filters.guarantee));
  }

  if (filters.credit === 'yes') {
    items = items.filter((item) => item.validationRequired);
  } else if (filters.credit === 'no') {
    items = items.filter((item) => !item.validationRequired);
  }

  if (filters.sort === 'least-docs') {
    items.sort((a, b) => Number(a.documentsCount || 0) - Number(b.documentsCount || 0));
  } else if (filters.sort === 'fastest') {
    items.sort((a, b) => Number(a.averageReviewHours || 0) - Number(b.averageReviewHours || 0));
  } else if (filters.sort === 'highest-rating') {
    items.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  } else if (filters.sort === 'lowest-rate') {
    items.sort((a, b) => Number(a.rateOptions?.[0] || 0) - Number(b.rateOptions?.[0] || 0));
  }

  return items;
};

export const createWebHomePayload = async (filters = {}) => {
  const [allItems, verifiedBrokers, site] = await Promise.all([
    listPublishedWebFacilities(),
    Broker.count({ where: { verifyLevel: { [Op.gte]: 3 } } }),
    loadPublicSiteSettings()
  ]);

  const categories = uniqueStrings(allItems.flatMap((item) => item.tags));
  const guarantees = uniqueStrings(allItems.flatMap((item) => item.guaranteeBadges));
  const totalRequests = allItems.reduce((sum, item) => sum + Number(item.requestCount || 0), 0);
  const averageRating = allItems.length
    ? Number((allItems.reduce((sum, item) => sum + Number(item.rating || 0), 0) / allItems.length).toFixed(1))
    : 0;
  const featuredSpotlight =
    allItems.find((item) => Number(item.id) === Number(site.featuredFacilityId || 0)) ||
    [...allItems].sort((left, right) => {
      const viewsDiff = Number(right.views || 0) - Number(left.views || 0);
      if (viewsDiff !== 0) return viewsDiff;
      return Number(right.bookmarkCount || 0) - Number(left.bookmarkCount || 0);
    })[0] || null;

  const hasFilters = filters.category || filters.guarantee || filters.credit || filters.minAmount || filters.maxAmount || filters.sort;
  const items = hasFilters ? await listPublishedWebFacilities(filters) : allItems;

  return {
    site,
    seo: site.homeSeo,
    summary: {
      verifiedBrokers,
      publishedFacilities: allItems.length,
      totalRequests,
      averageRating
    },
    categories,
    guarantees,
    items,
    featuredSpotlight
  };
};

export const findPublishedWebFacilityBySlug = async (slug) => {
  const item = await Facility.findOne({
    where: {
      slug: String(slug || '').trim(),
      status: Facility.STATUSES.PUBLISHED
    },
    include: publicFacilityInclude
  });

  if (!item) {
    return null;
  }

  await item.increment('views');

  try {
    const today = new Date().toISOString().slice(0, 10);
    const [affected] = await FacilityDailyView.update(
      { count: sequelize.literal('count + 1') },
      { where: { facilityId: item.id, date: today } }
    );
    if (affected === 0) {
      await FacilityDailyView.create({ facilityId: item.id, date: today, count: 1 }).catch(() =>
        FacilityDailyView.update({ count: sequelize.literal('count + 1') }, { where: { facilityId: item.id, date: today } })
      );
    }
  } catch { /* non-blocking */ }

  const fresh = await Facility.findByPk(item.id, {
    include: publicFacilityInclude,
    attributes: {
      include: [
        [sequelize.literal('(SELECT COUNT(*) FROM facility_bookmarks WHERE facility_bookmarks.facility_id = Facility.id)'), 'bookmarkCount']
      ]
    }
  });
  return serializeWebFacility(fresh);
};