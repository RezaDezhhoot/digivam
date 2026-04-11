import { Op } from 'sequelize';
import { Broker } from '../models/broker.model.js';
import { Document } from '../models/document.model.js';
import { Facility } from '../models/facility.model.js';
import { FacilityBookmark } from '../models/facility-bookmark.model.js';
import { FacilityDocument } from '../models/facility-document.model.js';
import { FacilityGuarantee } from '../models/facility-guarantee.model.js';
import { FacilityInstallment } from '../models/facility-installment.model.js';
import { FacilityProfit } from '../models/facility-profit.model.js';
import { Guarantee } from '../models/guarantee.model.js';
import { Type } from '../models/type.model.js';
import { Validation } from '../models/validation.model.js';

const createError = (message, status = 422) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeString = (value) => String(value || '').trim();
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

const normalizeKeywords = (value) =>
  String(value || '')
    .split(/[\n,،]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(', ');

const normalizeFacilitySeo = (value = {}) => {
  const raw = parseObject(value);

  return {
    title: normalizeString(raw.title),
    description: normalizeString(raw.description),
    keywords: normalizeKeywords(raw.keywords),
    canonicalUrl: normalizeString(raw.canonicalUrl),
    robots: normalizeString(raw.robots)
  };
};

const normalizeValidationFeatureLines = (items = []) => [
  ...new Set(
    (Array.isArray(items) ? items : [items])
      .map((item) => normalizeString(item))
      .filter(Boolean)
  )
].slice(0, 10);

const normalizeFacilityValidationContent = (value = {}) => {
  const raw = parseObject(value);

  return {
    introTitle: normalizeString(raw.introTitle),
    introDescription: normalizeString(raw.introDescription),
    stepsLabel: normalizeString(raw.stepsLabel),
    featureLines: normalizeValidationFeatureLines(raw.featureLines)
  };
};

const hasFacilitySeo = (value = {}) => Object.values(normalizeFacilitySeo(value)).some(Boolean);
const hasFacilityValidationContent = (value = {}) => {
  const normalized = normalizeFacilityValidationContent(value);

  return Boolean(
    normalized.introTitle ||
    normalized.introDescription ||
    normalized.stepsLabel ||
    normalized.featureLines.length
  );
};

export const normalizeSearch = (value) => normalizeString(value);

export const uniquePositiveInts = (items = []) => [
  ...new Set(
    (Array.isArray(items) ? items : [items])
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0)
  )
];

export const uniquePositiveDecimals = (items = []) => [
  ...new Set(
    (Array.isArray(items) ? items : [items])
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
      .map((item) => Number(item.toFixed(2)))
  )
];

const slugifyTitle = (value) =>
  normalizeString(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export const facilityBaseInclude = [
  {
    model: Broker,
    as: 'broker',
    required: false,
    attributes: ['id', 'name', 'phone', 'verifyLevel']
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
    attributes: ['id', 'title', 'type', 'available']
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
    attributes: ['id', 'title', 'type', 'subject', 'required', 'category', 'help'],
    through: { attributes: ['sort'], as: 'link' }
  }
];

const parseResults = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(String(value));
  } catch {
    return { reason: String(value) };
  }
};

export const serializeFacility = (item) => {
  const raw = typeof item?.toJSON === 'function' ? item.toJSON() : item;
  const results = parseResults(raw?.results);
  const publicContent = parseObject(raw?.publicContent);
  const seo = normalizeFacilitySeo(publicContent.seo);
  const validationContent = normalizeFacilityValidationContent(publicContent.validation);
  const profits = (raw?.profits || [])
    .map((profit) => ({ id: profit.id, percent: String(profit.percent || 0) }))
    .sort((left, right) => Number(left.percent) - Number(right.percent));
  const installments = (raw?.installments || [])
    .map((installment) => ({ id: installment.id, month: Number(installment.month || 0) }))
    .sort((left, right) => left.month - right.month);
  const guarantees = (raw?.guarantees || [])
    .map((guarantee) => ({ id: guarantee.id, title: guarantee.title, help: guarantee.help }))
    .sort((left, right) => left.id - right.id);
  const requiredDocuments = (raw?.requiredDocuments || [])
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      subject: doc.subject,
      required: Boolean(doc.required),
      category: doc.category,
      help: doc.help,
      sort: doc.link?.sort ?? doc.FacilityDocument?.sort ?? 0
    }))
    .sort((left, right) => left.sort - right.sort);

  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    type: raw.type,
    typeLabel: Type.TYPE_LABELS[raw.type] || raw.type || '-',
    subType: raw.subType,
    subTypeId: raw.subTypeId,
    loanTypeTitle: raw.subTypeModel?.title || raw.subType || '-',
    minAmount: String(raw.minAmount || 0),
    maxAmount: String(raw.maxAmount || 0),
    withdrawDeadline: raw.withdrawDeadline,
    views: Number(raw.views || 0),
    brokerId: raw.brokerId,
    brokerName: raw.broker?.name || '-',
    brokerPhone: raw.broker?.phone || '-',
    brokerVerifyLevel: Number(raw.broker?.verifyLevel || 0),
    status: raw.status || Facility.STATUSES.PENDING,
    statusLabel: Facility.STATUS_LABELS[raw.status] || raw.status || Facility.STATUS_LABELS[Facility.STATUSES.PENDING],
    paymentType: raw.paymentType || Facility.PAYMENT_TYPES.CASH,
    paymentTypeLabel: Facility.PAYMENT_TYPE_LABELS[raw.paymentType] || raw.paymentType || Facility.PAYMENT_TYPE_LABELS[Facility.PAYMENT_TYPES.CASH],
    validationId: raw.validationId,
    validationTitle: raw.validation?.title || '-',
    body: raw.body,
    averageReviewHours: Number(raw.averageReviewHours || 0),
    saved: Boolean(raw.saved),
    resultReason: normalizeString(results?.reason || results?.note || ''),
    results,
    guarantees,
    guaranteeIds: guarantees.map((guarantee) => guarantee.id),
    profits,
    installments,
    requiredDocuments,
    requiredDocumentIds: requiredDocuments.map((doc) => doc.id),
    bookmarkCount: Number(raw.bookmarkCount || 0),
    seo: hasFacilitySeo(seo) ? seo : null,
    validationContent: hasFacilityValidationContent(validationContent) ? validationContent : null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  };
};

export const createStatusSummary = (rows = []) => {
  const initial = {
    total: rows.length,
    pending: 0,
    published: 0,
    rejected: 0,
    inProgress: 0,
    expired: 0
  };

  return rows.reduce((summary, item) => {
    const status = item.status || Facility.STATUSES.PENDING;

    if (status === Facility.STATUSES.PENDING) summary.pending += 1;
    if (status === Facility.STATUSES.PUBLISHED) summary.published += 1;
    if (status === Facility.STATUSES.REJECTED) summary.rejected += 1;
    if (status === Facility.STATUSES.IN_PROGRESS) summary.inProgress += 1;
    if (status === Facility.STATUSES.EXPIRED) summary.expired += 1;

    return summary;
  }, initial);
};

export const createFacilityViewsSummary = (rows = [], options = {}) => {
  const { limit = 6 } = options;
  const items = rows.map((item) => (typeof item?.toJSON === 'function' ? item.toJSON() : item));
  const topViewed = items
    .map((item) => ({
      id: item.id,
      title: item.title || `امتیاز #${item.id}`,
      views: Number(item.views || 0),
      brokerName: item.broker?.name || item.brokerName || '-',
      status: item.status || Facility.STATUSES.PENDING,
      statusLabel:
        Facility.STATUS_LABELS[item.status] || item.status || Facility.STATUS_LABELS[Facility.STATUSES.PENDING]
    }))
    .sort((left, right) => {
      if (right.views !== left.views) {
        return right.views - left.views;
      }

      return Number(right.id || 0) - Number(left.id || 0);
    })
    .slice(0, limit);

  return {
    totalViews: items.reduce((sum, item) => sum + Number(item.views || 0), 0),
    topViewed
  };
};

const ensureUniqueSlug = async ({ title, excludeId = null, transaction }) => {
  const baseSlug = slugifyTitle(title) || 'facility';
  let candidate = baseSlug;
  let index = 2;

  while (true) {
    const where = { slug: candidate };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    const count = await Facility.count({ where, transaction, paranoid: false });

    if (!count) {
      return candidate;
    }

    candidate = `${baseSlug}-${index}`;
    index += 1;
  }
};

export const buildFacilityInput = async ({ payload, brokerId, excludeId = null, allowSeo = false, currentPublicContent = null, transaction }) => {
  const title = normalizeString(payload.title);
  const body = normalizeString(payload.body) || null;
  const selectedBrokerId = Number(brokerId);
  const selectedSubTypeId = Number(payload.subTypeId || 0);
  const selectedValidationId = payload.validationId ? Number(payload.validationId) : null;
  const guaranteeIds = uniquePositiveInts(payload.guaranteeIds || []);
  const profits = uniquePositiveDecimals(payload.profits || []);
  const installments = uniquePositiveInts(payload.installments || []);
  const minAmount = Number(payload.minAmount || 0);
  const maxAmount = Number(payload.maxAmount || 0);
  const withdrawDeadline = Number(payload.withdrawDeadline || 0);
  const paymentType = normalizeString(payload.paymentType || Facility.PAYMENT_TYPES.CASH) || Facility.PAYMENT_TYPES.CASH;

  if (!title) {
    throw createError('عنوان امتیاز وام الزامی است');
  }

  if (minAmount < Facility.MIN_ALLOWED_AMOUNT || minAmount > Facility.MAX_ALLOWED_AMOUNT) {
    throw createError('حداقل مبلغ خارج از بازه مجاز سیستم است');
  }

  if (maxAmount < Facility.MIN_ALLOWED_AMOUNT || maxAmount > Facility.MAX_ALLOWED_AMOUNT) {
    throw createError('حداکثر مبلغ خارج از بازه مجاز سیستم است');
  }

  if (maxAmount < minAmount) {
    throw createError('حداکثر مبلغ باید از حداقل مبلغ بیشتر یا مساوی باشد');
  }

  if (!selectedBrokerId) {
    throw createError('کارگزار انتخاب نشده است');
  }

  const broker = await Broker.findByPk(selectedBrokerId, { transaction });

  if (!broker) {
    throw createError('کارگزار یافت نشد', 404);
  }

  if (Number(broker.verifyLevel) < 3) {
    throw createError('فقط کارگزاران دارای احراز هویت نهایی می توانند امتیاز وام ثبت کنند');
  }

  const subTypeModel = await Type.findByPk(selectedSubTypeId, { transaction });

  if (!subTypeModel) {
    throw createError('نوع وام انتخاب شده معتبر نیست');
  }

  const validation = selectedValidationId
    ? await Validation.findByPk(selectedValidationId, { transaction })
    : null;

  if (selectedValidationId && !validation) {
    throw createError('روش اعتبارسنجی انتخاب شده معتبر نیست');
  }

  const guarantees = guaranteeIds.length
    ? await Guarantee.findAll({ where: { id: guaranteeIds }, transaction })
    : [];

  if (!guarantees.length || guarantees.length !== guaranteeIds.length) {
    throw createError('حداقل یک ضمانت معتبر باید انتخاب شود');
  }

  if (!profits.length) {
    throw createError('حداقل یک درصد سود باید ثبت شود');
  }

  if (!installments.length) {
    throw createError('حداقل یک تعداد قسط باید ثبت شود');
  }

  const averageReviewHours = Number(payload.averageReviewHours || 0) || null;
  const slug = await ensureUniqueSlug({ title, excludeId, transaction });
  const nextPublicContent = parseObject(currentPublicContent);

  if (allowSeo) {
    const seo = normalizeFacilitySeo({
      title: payload.seoTitle,
      description: payload.seoDescription,
      keywords: payload.seoKeywords,
      canonicalUrl: payload.seoCanonicalUrl,
      robots: payload.seoRobots
    });

    if (hasFacilitySeo(seo)) {
      nextPublicContent.seo = seo;
    } else {
      delete nextPublicContent.seo;
    }

    const validationContent = normalizeFacilityValidationContent({
      introTitle: payload.validationIntroTitle,
      introDescription: payload.validationIntroDescription,
      stepsLabel: payload.validationStepsLabel,
      featureLines: payload.validationFeatureLines
    });

    if (validation?.id && hasFacilityValidationContent(validationContent)) {
      nextPublicContent.validation = validationContent;
    } else {
      delete nextPublicContent.validation;
    }
  }

  const hasPublicContent = Object.keys(nextPublicContent).length > 0;

  return {
    broker,
    guarantees,
    profits,
    installments,
    payload: {
      title,
      slug,
      type: subTypeModel.type,
      subType: subTypeModel.title,
      minAmount,
      maxAmount,
      withdrawDeadline,
      brokerId: broker.id,
      body,
      averageReviewHours,
      paymentType,
      subTypeId: subTypeModel.id,
      validationId: validation?.id || null,
      ...(allowSeo ? { publicContent: hasPublicContent ? nextPublicContent : null } : {}),
      saved: true
    }
  };
};

export const syncFacilityCollections = async ({ facilityId, guaranteeIds, profits, installments, documentIds, transaction }) => {
  await FacilityGuarantee.destroy({ where: { facilitiesId: facilityId }, transaction });
  await FacilityProfit.destroy({ where: { facilitiesId: facilityId }, transaction });
  await FacilityInstallment.destroy({ where: { facilitiesId: facilityId }, transaction });
  await FacilityDocument.destroy({ where: { facilityId }, transaction });

  if (guaranteeIds.length) {
    await FacilityGuarantee.bulkCreate(
      guaranteeIds.map((guaranteeId) => ({
        facilitiesId: facilityId,
        guaranteeId,
        modelType: null,
        modelId: null
      })),
      { transaction }
    );
  }

  if (profits.length) {
    await FacilityProfit.bulkCreate(
      profits.map((percent) => ({
        facilitiesId: facilityId,
        percent
      })),
      { transaction }
    );
  }

  if (installments.length) {
    await FacilityInstallment.bulkCreate(
      installments.map((month) => ({
        facilitiesId: facilityId,
        month
      })),
      { transaction }
    );
  }

  if (documentIds && documentIds.length) {
    await FacilityDocument.bulkCreate(
      documentIds.map((documentId, index) => ({
        facilityId,
        documentId,
        sort: index
      })),
      { transaction }
    );
  }
};

export const loadFacilityById = (id) =>
  Facility.findByPk(id, {
    include: facilityBaseInclude
  });

export const getFacilityOptionsPayload = async ({ includeBrokers = false, admin = false } = {}) => {
  const [loanTypes, guarantees, validations, brokers, loanDocuments] = await Promise.all([
    Type.findAll({ order: [['title', 'ASC'], ['id', 'ASC']] }),
    Guarantee.findAll({ order: [['title', 'ASC'], ['id', 'ASC']] }),
    Validation.findAll({
      where: admin ? {} : { available: true },
      order: [['title', 'ASC'], ['id', 'ASC']]
    }),
    includeBrokers
      ? Broker.findAll({
          where: { verifyLevel: { [Op.gte]: 3 } },
          order: [['name', 'ASC'], ['id', 'ASC']]
        })
      : Promise.resolve([]),
    Document.findAll({
      where: { subject: Document.SUBJECTS.LOAN },
      order: [['title', 'ASC'], ['id', 'ASC']]
    })
  ]);

  return {
    amountLimits: {
      min: Facility.MIN_ALLOWED_AMOUNT,
      max: Facility.MAX_ALLOWED_AMOUNT
    },
    loanTypes: loanTypes.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      typeLabel: Type.TYPE_LABELS[item.type] || item.type
    })),
    guarantees: guarantees.map((item) => ({
      id: item.id,
      title: item.title,
      help: item.help
    })),
    validations: validations.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      available: Boolean(item.available)
    })),
    brokers: brokers.map((item) => ({
      id: item.id,
      name: item.name || `کارگزار #${item.id}`,
      phone: item.phone,
      verifyLevel: item.verifyLevel
    })),
    paymentTypes: Object.values(Facility.PAYMENT_TYPES).map((value) => ({
      value,
      label: Facility.PAYMENT_TYPE_LABELS[value] || value
    })),
    statuses: Object.values(Facility.STATUSES).map((value) => ({
      value,
      label: Facility.STATUS_LABELS[value] || value
    })),
    loanDocuments: loanDocuments.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      subject: item.subject,
      required: Boolean(item.required),
      category: item.category
    }))
  };
};