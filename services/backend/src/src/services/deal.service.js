import path from 'node:path';
import { Op } from 'sequelize';
import { env } from '../config/env.js';
import '../models/index.js';
import { Broker } from '../models/broker.model.js';
import { Customer } from '../models/customer.model.js';
import { CustomerValidation } from '../models/customer-validation.model.js';
import { Deal } from '../models/deal.model.js';
import { DealPaymentType } from '../models/deal-payment-type.model.js';
import { Document } from '../models/document.model.js';
import { Facility } from '../models/facility.model.js';
import { FacilityInstallment } from '../models/facility-installment.model.js';
import { FacilityProfit } from '../models/facility-profit.model.js';
import { File } from '../models/file.model.js';
import { Type } from '../models/type.model.js';
import { Validation } from '../models/validation.model.js';
import { serializeCustomerValidation } from './customer-validation.service.js';
import { sendOtpSms } from './sms.service.js';
import { createPaginationResult } from '../utils/pagination.js';
import {
  DEAL_ACT_BY,
  DEAL_PAYMENT_STATUSES,
  DEAL_PAYMENT_STATUS_LABELS,
  DEAL_LOAN_TYPE_LABELS,
  DEAL_RESULT_ACTIONS,
  DEAL_STATUSES,
  DEAL_STEPS,
  DEAL_STEP_LABELS,
  PaymentTypes,
  PaymentTypeDescriptions,
  PaymentTypeLabels,
  getDealStepLevel
} from '../constants/deal.js';

const uploadsRoot = path.resolve(process.cwd(), 'src', 'uploads');

const facilityForDealInclude = [
  {
    model: Broker,
    as: 'broker',
    required: false,
    attributes: ['id', 'name', 'phone', 'verifyLevel']
  },
  {
    model: Validation,
    as: 'validation',
    required: false,
    attributes: ['id', 'title', 'type', 'validFor', 'amount', 'description']
  },
  {
    model: Type,
    as: 'subTypeModel',
    required: false,
    attributes: ['id', 'title', 'type']
  },
  {
    model: Document,
    as: 'requiredDocuments',
    required: false,
    attributes: ['id', 'title', 'type', 'subject', 'required', 'category', 'help', 'mimes', 'max'],
    through: { attributes: ['sort'], as: 'link' }
  },
  {
    model: FacilityInstallment,
    as: 'installments',
    required: false,
    attributes: ['id', 'month']
  },
  {
    model: FacilityProfit,
    as: 'profits',
    required: false,
    attributes: ['id', 'percent']
  }
];

const dealInclude = [
  {
    model: Facility,
    as: 'facility',
    required: false,
    attributes: ['id', 'title', 'slug', 'type', 'subType', 'subTypeId', 'minAmount', 'maxAmount', 'validationId', 'status'],
    include: [
      {
        model: Type,
        as: 'subTypeModel',
        required: false,
        attributes: ['id', 'title', 'type']
      }
    ]
  },
  {
    model: Customer,
    as: 'customer',
    required: false,
    attributes: ['id', 'name', 'phone', 'email', 'nationalCode']
  },
  {
    model: Broker,
    as: 'broker',
    required: false,
    attributes: ['id', 'name', 'phone', 'verifyLevel', 'nationalCode', 'birthdate', 'address']
  },
  {
    model: DealPaymentType,
    as: 'paymentTypes',
    required: false,
    attributes: ['id', 'paymentType', 'amount', 'description', 'values', 'status', 'doneAt', 'createdAt', 'updatedAt']
  }
];

const normalizeString = (value) => String(value || '').trim();

const normalizeMimeTokens = (value) =>
  String(value || '')
    .split(/[\s,]+/)
    .map((item) => item.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean);

const parseJson = (value, fallback = {}) => {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
};

const parseObject = (value, fallback = {}) => {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const buildFileUrl = (file) => {
  if (!file?.path) {
    return null;
  }

  const rawPath = String(file.path || '').replace(/\\/g, '/');
  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  return `${env.backendBaseUrl}/uploads/${rawPath.replace(/^\/+/, '')}`;
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

const CONTRACT_OTP_TTL = 2 * 60 * 1000;
const contractOtpStore = new Map();
const paymentTypeOrder = Object.values(PaymentTypes);

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const contractOtpNow = () => Date.now();

const getPaymentTypeOrder = (value) => {
  const index = paymentTypeOrder.indexOf(String(value || '').trim());
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const serializeDealPaymentType = (item) => {
  const raw = typeof item?.toJSON === 'function' ? item.toJSON() : item;
  const paymentType = String(raw?.paymentType || '').trim();

  return {
    id: Number(raw?.id || 0),
    paymentType,
    paymentTypeLabel: PaymentTypeLabels[paymentType] || paymentType,
    description: raw?.description || PaymentTypeDescriptions[paymentType] || null,
    amount: String(raw?.amount || 0),
    values: raw?.values ?? null,
    status: raw?.status || DEAL_PAYMENT_STATUSES.PENDING,
    statusLabel: DEAL_PAYMENT_STATUS_LABELS[raw?.status] || raw?.status || DEAL_PAYMENT_STATUS_LABELS[DEAL_PAYMENT_STATUSES.PENDING],
    doneAt: raw?.doneAt || null,
    doneAtLabel: formatDate(raw?.doneAt),
    createdAt: raw?.createdAt || null,
    updatedAt: raw?.updatedAt || null
  };
};

const normalizeContractTemplate = (value, fallbackTitle = '') => {
  const defaults = Type.createDefaultContractTemplate();
  const source = value && typeof value === 'object' ? value : {};
  const header = source.header && typeof source.header === 'object' ? source.header : {};
  const footer = source.footer && typeof source.footer === 'object' ? source.footer : {};

  return {
    page: { size: 'A4' },
    header: {
      title: String(header.title || fallbackTitle || defaults.header.title).trim(),
      dateText: String(header.dateText || defaults.header.dateText).trim(),
      contractNumberText: String(header.contractNumberText || defaults.header.contractNumberText).trim(),
      showLogo: header.showLogo !== false
    },
    bodyHtml: String(source.bodyHtml || '').trim(),
    footer: {
      customerSignatureLabel: String(footer.customerSignatureLabel || defaults.footer.customerSignatureLabel).trim(),
      brokerSignatureLabel: String(footer.brokerSignatureLabel || defaults.footer.brokerSignatureLabel).trim(),
      note: String(footer.note || '').trim()
    }
  };
};

const replaceContractTokens = (value, tokens) => {
  let output = String(value || '');

  Object.entries(tokens).forEach(([token, replacement]) => {
    output = output.split(token).join(escapeHtml(replacement));
  });

  return output;
};

const buildContractOtpKey = ({ dealId, actorType, actorPhone }) =>
  `${String(actorType || '').trim()}:${Number(dealId)}:${String(actorPhone || '').trim()}`;

const readContractOtpRecord = (key) => {
  const record = contractOtpStore.get(key);

  if (!record) {
    return null;
  }

  if (record.expiresAt <= contractOtpNow()) {
    contractOtpStore.delete(key);
    return null;
  }

  return record;
};

const secondsToContractOtpResend = (key) => {
  const record = readContractOtpRecord(key);
  if (!record) {
    return 0;
  }

  return Math.max(Math.floor((record.expiresAt - contractOtpNow()) / 1000), 0);
};

const resolveContractOtpTemplateId = (actorType) =>
  actorType === DEAL_ACT_BY.BROKER
    ? env.smsBrokerOtpTemplateId || env.smsOtpTemplateId || ''
    : env.smsCustomerOtpTemplateId || env.smsOtpTemplateId || '';

const rawAmountForContract = (deal) => new Intl.NumberFormat('fa-IR').format(Number(deal.amount || 0));

const formatContractMoney = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));

const getDealWizardSteps = ({ step, level, status }) => {
  const currentLevel = Number(level || getDealStepLevel(step));
  const definitions = [
    { key: 'base', title: 'اطلاعات پایه معامله', description: 'اطلاعات اصلی پرونده، طرفین و خلاصه مالی معامله.' },
    { key: DEAL_STEPS.SUBMIT, title: DEAL_STEP_LABELS[DEAL_STEPS.SUBMIT], description: 'مدارک و داده‌های ارسالی مشتری در این بخش قرار می‌گیرند.' },
    { key: DEAL_STEPS.VERIFY_BROKER, title: DEAL_STEP_LABELS[DEAL_STEPS.VERIFY_BROKER], description: 'بررسی اولیه کارگزار و تصمیم این مرحله.' },
    { key: DEAL_STEPS.CONTRACT, title: DEAL_STEP_LABELS[DEAL_STEPS.CONTRACT], description: 'متن قرارداد، روش‌های پرداخت و امضاهای طرفین.' },
    { key: DEAL_STEPS.PAYMENT, title: DEAL_STEP_LABELS[DEAL_STEPS.PAYMENT], description: 'اطلاعات مرتبط با پرداخت‌ها و روش‌های تسویه.' },
    { key: DEAL_STEPS.TRANSFER, title: DEAL_STEP_LABELS[DEAL_STEPS.TRANSFER], description: 'وضعیت انتقال امتیاز و اقدامات اجرایی.' },
    { key: DEAL_STEPS.VERIFY_CUSTOMER, title: DEAL_STEP_LABELS[DEAL_STEPS.VERIFY_CUSTOMER], description: 'تایید نهایی انتقال و جمع‌بندی از سمت مشتری.' },
    { key: DEAL_STEPS.FINISHED, title: DEAL_STEP_LABELS[DEAL_STEPS.FINISHED], description: 'وضعیت نهایی پرونده و خروجی نهایی معامله.' }
  ];

  return definitions.map((item, index) => {
    if (item.key === 'base') {
      return {
        ...item,
        level: 0,
        state: 'available'
      };
    }

    const itemLevel = index;
    let state = 'upcoming';

    if (status === Deal.STATUSES.DONE) {
      state = 'completed';
    } else if (status === Deal.STATUSES.FAILED && item.key === step) {
      state = 'failed';
    } else if (status === Deal.STATUSES.SUSPENDED && item.key === step) {
      state = 'paused';
    } else if (item.key === step) {
      state = 'current';
    } else if (currentLevel > itemLevel) {
      state = 'completed';
    }

    return {
      ...item,
      level: itemLevel,
      state
    };
  });
};

const normalizeRequestedPaymentTypes = (payload) => {
  const rawItems = Array.isArray(payload) ? payload : parseJson(payload, []);

  if (!Array.isArray(rawItems) || !rawItems.length) {
    throw Object.assign(new Error('برای تایید معامله باید حداقل یک روش پرداخت تعیین شود'), { status: 422 });
  }

  const seen = new Set();
  const normalized = rawItems.map((item) => {
    const paymentType = String(item?.paymentType || '').trim();
    const amount = Number(item?.amount || 0);

    if (!Object.values(PaymentTypes).includes(paymentType)) {
      throw Object.assign(new Error('نوع روش پرداخت نامعتبر است'), { status: 422 });
    }

    if (seen.has(paymentType)) {
      throw Object.assign(new Error('هر روش پرداخت فقط یک بار قابل انتخاب است'), { status: 422 });
    }
    seen.add(paymentType);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw Object.assign(new Error(`مبلغ روش «${PaymentTypeLabels[paymentType] || paymentType}» نامعتبر است`), { status: 422 });
    }

    return {
      paymentType,
      amount,
      description: normalizeString(item?.description) || PaymentTypeDescriptions[paymentType] || null,
      values: item?.values && typeof item.values === 'object' && !Array.isArray(item.values) ? item.values : null,
      status: DEAL_PAYMENT_STATUSES.PENDING,
      doneAt: null
    };
  });

  return normalized.sort((left, right) => getPaymentTypeOrder(left.paymentType) - getPaymentTypeOrder(right.paymentType));
};

const buildContractTokenMap = ({ deal, paymentTypes }) => {
  const now = new Date();
  const broker = deal.broker || {};
  const customer = deal.customer || {};
  const facility = deal.facility || deal.facilityData || {};

  const payments = Array.isArray(paymentTypes) ? paymentTypes : [];
  const paymentSummaryLines = payments.map((item) => {
    const label = PaymentTypeLabels[item.paymentType] || item.paymentType;
    const amount = new Intl.NumberFormat('fa-IR').format(Number(item.amount || 0));
    const desc = item.description || PaymentTypeDescriptions[item.paymentType] || '';
    return `${label}: ${amount} تومان${desc ? ` — ${desc}` : ''}`;
  });

  return {
    '{{contract.number}}': `DL-${Number(deal.id).toLocaleString('en-US', { minimumIntegerDigits: 6, useGrouping: false })}`,
    '{{general.date}}': now.toLocaleDateString('fa-IR'),
    '{{general.time}}': now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    '{{broker.name}}': broker.name || `کارگزار #${deal.brokerId}`,
    '{{broker.phone}}': broker.phone || '-',
    '{{broker.national_code}}': broker.nationalCode || '-',
    '{{broker.birthdate}}': broker.birthdate ? new Date(broker.birthdate).toLocaleDateString('fa-IR') : '-',
    '{{broker.address}}': broker.address || '-',
    '{{customer.name}}': customer.name || `مشتری #${deal.customerId}`,
    '{{customer.phone}}': customer.phone || '-',
    '{{customer.email}}': customer.email || '-',
    '{{deal.id}}': String(deal.id || '-'),
    '{{deal.status}}': Deal.STATUS_LABELS[deal.status] || deal.status || '-',
    '{{deal.step}}': Deal.STEP_LABELS[deal.step] || deal.step || '-',
    '{{deal.act_by}}': Deal.ACT_BY_LABELS[deal.actBy] || deal.actBy || '-',
    '{{deal.amount}}': formatContractMoney(deal.amount),
    '{{deal.installments}}': deal.installments ? String(deal.installments) : '-',
    '{{deal.profit}}': deal.profit == null ? '-' : String(deal.profit),
    '{{deal.monthly_installment_amount}}': formatContractMoney(deal.monthlyInstallmentAmount),
    '{{deal.total_profit}}': formatContractMoney(deal.totalProfit),
    '{{deal.total_amount}}': formatContractMoney(deal.totalAmount),
    '{{facility.title}}': facility.title || 'امتیاز وام',
    '{{facility.type}}': deal.typeLabel || facility.typeLabel || facility.type || '-',
    '{{facility.sub_type}}': facility.loanTypeTitle || facility.subType || '-',
    '{{facility.min_amount}}': formatContractMoney(facility.minAmount),
    '{{facility.max_amount}}': formatContractMoney(facility.maxAmount),
    '{{facility.validation_title}}': facility.validationTitle || deal.customerValidationData?.validation?.title || '-',
    '{{facility.withdraw_dead_line}}': facility.withdrawDeadLine || '-',
    '{{payment.summary}}': paymentSummaryLines.join('\n') || '-',
    '{{payment.count}}': String(payments.length),
    '{{payment.total}}': formatContractMoney(payments.reduce((sum, item) => sum + Number(item.amount || 0), 0))
  };
};

const buildPaymentSummaryHtml = (paymentTypes) => {
  const rows = paymentTypes
    .map((item) => `
      <li>
        <strong>${escapeHtml(PaymentTypeLabels[item.paymentType] || item.paymentType)}</strong>
        <span>${escapeHtml(new Intl.NumberFormat('fa-IR').format(Number(item.amount || 0)))} تومان</span>
        <p>${escapeHtml(item.description || PaymentTypeDescriptions[item.paymentType] || '')}</p>
      </li>
    `)
    .join('');

  return `
    <section class="deal-contract-payment-summary">
      <h3>روش‌های پرداخت تعیین‌شده</h3>
      <ul>${rows}</ul>
    </section>
  `;
};

const buildLegacyDefaultContractBodyHtml = ({ deal }) => `
  <p>این قرارداد میان <strong>${escapeHtml(deal.customer?.name || `مشتری #${deal.customerId}`)}</strong> و <strong>${escapeHtml(deal.broker?.name || `کارگزار #${deal.brokerId}`)}</strong> برای پرونده <strong>#${escapeHtml(deal.id)}</strong> تنظیم شده است.</p>
  <p>موضوع قرارداد مربوط به <strong>${escapeHtml(deal.facility?.title || deal.facilityData?.title || 'امتیاز وام')}</strong> با مبلغ <strong>${escapeHtml(String(rawAmountForContract(deal)))}</strong> تومان است.</p>
  <p>طرفین با مشاهده متن قرارداد، روش‌های پرداخت تعیین‌شده و تایید OTP نسبت به امضای نهایی این سند اقدام می‌کنند.</p>
`;

const stripLegacyDefaultContractBody = ({ html, deal }) => {
  const legacyBody = buildLegacyDefaultContractBodyHtml({ deal }).trim();
  return String(html || '').replace(legacyBody, '').trim();
};

const buildSignaturePlaceholderBlock = ({ role, label }) => {
  const marker = role.toUpperCase();
  return `
    <!-- SIGNATURE_${marker}_START -->
    <div class="deal-contract-signature-box" data-signature-role="${escapeHtml(role)}">
      <span class="deal-contract-signature-label">${escapeHtml(label)}</span>
      <div class="deal-contract-signature-placeholder"></div>
      <strong class="deal-contract-signature-name">در انتظار امضا</strong>
    </div>
    <!-- SIGNATURE_${marker}_END -->
  `;
};

const renderSignedSignatureBlock = ({ role, label, actorName, signature }) => `
  <div class="deal-contract-signature-box deal-contract-signature-box--signed" data-signature-role="${escapeHtml(role)}">
    <span class="deal-contract-signature-label">${escapeHtml(label)}</span>
    <div class="deal-contract-signature-media">
      <img src="${signature}" alt="signature-${escapeHtml(role)}" />
    </div>
    <strong class="deal-contract-signature-name">${escapeHtml(actorName)}</strong>
  </div>
`;

const readContractBlock = ({ html, marker }) => {
  const startMarker = `<!-- ${marker}_START -->`;
  const endMarker = `<!-- ${marker}_END -->`;
  const startIndex = String(html || '').indexOf(startMarker);
  const endIndex = String(html || '').indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return '';
  }

  return String(html || '').slice(startIndex + startMarker.length, endIndex).trim();
};

const replaceContractBlock = ({ html, marker, replacement }) => {
  const startMarker = `<!-- ${marker}_START -->`;
  const endMarker = `<!-- ${marker}_END -->`;
  const startIndex = html.indexOf(startMarker);
  const endIndex = html.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return html;
  }

  return `${html.slice(0, startIndex)}${startMarker}\n${replacement}\n${endMarker}${html.slice(endIndex + endMarker.length)}`;
};

const normalizePaymentFileIds = (values) => {
  const source = values && typeof values === 'object' ? values : {};
  const ids = [
    ...(Array.isArray(source.fileIds) ? source.fileIds : []),
    ...(Array.isArray(source.files) ? source.files.map((item) => item?.fileId) : []),
    source.fileId
  ]
    .map((item) => Number(item || 0))
    .filter((item) => Number.isFinite(item) && item > 0);

  return [...new Set(ids)];
};

const enrichDealPaymentTypes = async (items) => {
  const paymentTypes = Array.isArray(items)
    ? items.map(serializeDealPaymentType).sort((left, right) => getPaymentTypeOrder(left.paymentType) - getPaymentTypeOrder(right.paymentType))
    : [];

  const fileIds = paymentTypes.flatMap((item) => normalizePaymentFileIds(item.values));
  if (!fileIds.length) {
    return paymentTypes;
  }

  const files = await File.findAll({ where: { id: [...new Set(fileIds)] } });
  const fileMap = new Map(files.map((item) => [Number(item.id), item]));

  return paymentTypes.map((item) => {
    const ids = normalizePaymentFileIds(item.values);
    if (!ids.length) {
      return item;
    }

    const resolvedFiles = ids
      .map((fileId) => fileMap.get(fileId))
      .filter(Boolean)
      .map((file) => ({
        fileId: Number(file.id),
        fileName: file.data?.originalName || file.subject || `file-${file.id}`,
        fileUrl: buildFileUrl(file),
        mimeType: file.mimeType || null,
        size: Number(file.size || 0) || null
      }));

    if (!resolvedFiles.length) {
      return item;
    }

    const lastFile = resolvedFiles[resolvedFiles.length - 1] || null;
    return {
      ...item,
      values: {
        ...(item.values && typeof item.values === 'object' ? item.values : {}),
        fileId: lastFile?.fileId || ids[ids.length - 1] || null,
        fileIds: resolvedFiles.map((file) => file.fileId),
        files: resolvedFiles,
        fileUrl: lastFile?.fileUrl || null,
        fileName: lastFile?.fileName || null
      }
    };
  });
};

const buildFreshContractHtml = ({ deal, contractType, paymentTypes, existingHtml = '', replacements = {} }) => {
  let html = buildDealContractHtml({ deal, typeModel: contractType, paymentTypes });

  for (const role of ['CUSTOMER', 'BROKER']) {
    const marker = `SIGNATURE_${role}`;
    const replacement = replacements[marker] || readContractBlock({ html: existingHtml, marker });
    if (replacement) {
      html = replaceContractBlock({ html, marker, replacement });
    }
  }

  return html;
};

const loadContractType = async (deal) => {
  const subTypeId = Number(deal.subTypeId || deal.facility?.subTypeId || deal.facilityData?.subTypeId || 0);

  if (!subTypeId) {
    return null;
  }

  return Type.findByPk(subTypeId, {
    include: [
      { model: File, as: 'contractBackground', required: false },
      { model: File, as: 'logo', required: false }
    ]
  });
};

const buildDealContractHtml = ({ deal, typeModel, paymentTypes }) => {
  const tokens = buildContractTokenMap({ deal, paymentTypes });
  const template = normalizeContractTemplate(typeModel?.contractTemplate, deal.facility?.loanTypeTitle || deal.facilityData?.loanTypeTitle || 'قرارداد معامله');
  const bodyHtml = template.bodyHtml ? replaceContractTokens(template.bodyHtml, tokens) : '';
  const backgroundUrl = buildFileUrl(typeModel?.contractBackground);
  const logoUrl = buildFileUrl(typeModel?.logo);
  const title = replaceContractTokens(template.header.title || deal.facility?.loanTypeTitle || 'قرارداد معامله', tokens);
  const dateText = replaceContractTokens(template.header.dateText, tokens);
  const contractNumberText = replaceContractTokens(template.header.contractNumberText, tokens);
  const footerNote = replaceContractTokens(template.footer.note, tokens);
  const customerLabel = replaceContractTokens(template.footer.customerSignatureLabel, tokens);
  const brokerLabel = replaceContractTokens(template.footer.brokerSignatureLabel, tokens);
  const paperBackground = backgroundUrl ? `background-image:url('${backgroundUrl}')` : 'background-image:linear-gradient(180deg,#ffffff 0%,#fafbfc 100%)';

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0}
    body{margin:0;padding:0;background:#fff;font-family:Tahoma,Arial,sans-serif;color:#1a1a2e;line-height:1.8}
    .deal-contract-wrap{max-width:900px;margin:0 auto}
    .deal-contract-paper{position:relative;min-height:1200px;padding:0;background-size:cover;background-position:center;overflow:hidden;display:flex;flex-direction:column}
    .deal-contract-paper::before{content:'';position:absolute;inset:0;background:rgba(255,255,255,.92)}
    .deal-contract-inner{position:relative;z-index:1;display:flex;flex-direction:column;min-height:1200px;padding:48px 44px 40px}
    .deal-contract-header{display:flex;align-items:center;gap:20px;padding-bottom:20px;border-bottom:1.5px solid #e8e8ef}
    .deal-contract-logo{width:64px;height:64px;border-radius:14px;object-fit:contain;background:#fff;border:1px solid #eee;padding:8px;flex-shrink:0}
    .deal-contract-header-main{flex:1}
    .deal-contract-title{font-size:22px;font-weight:900;color:#1a1a2e}
    .deal-contract-meta{display:flex;gap:24px;margin-top:10px}
    .deal-contract-meta-item{display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280}
    .deal-contract-meta-item strong{font-size:13px;color:#1a1a2e;font-weight:700}
    .deal-contract-body{flex:1;margin-top:28px;font-size:14px;line-height:2.2;color:#2d2d3f}
    .deal-contract-body p{margin:0 0 14px}
    .deal-contract-body li{margin-bottom:6px;font-size:14px}
    .deal-contract-body h2,.deal-contract-body h3{color:#1a1a2e;margin:20px 0 10px}
    .deal-contract-body table{width:100%;border-collapse:collapse;margin:16px 0}
    .deal-contract-body th,.deal-contract-body td{border:1px solid #e5e7eb;padding:10px 12px;font-size:13px;text-align:right}
    .deal-contract-body th{background:#f8f9fa;font-weight:700;color:#374151}
    .deal-contract-footer{margin-top:auto;padding-top:24px;border-top:1.5px solid #e8e8ef}
    .deal-contract-footer-note{font-size:12px;line-height:2;color:#6b7280;margin-bottom:20px}
    .deal-contract-signatures{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .deal-contract-signature-box{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#fafbfc;min-height:132px}
    .deal-contract-signature-box--signed{border-color:#d1d5db;background:#fff}
    .deal-contract-signature-label{font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase}
    .deal-contract-signature-placeholder{flex:1;border-radius:8px;background:repeating-linear-gradient(-45deg,#fafbfc,#fafbfc 8px,#f0f0f5 8px,#f0f0f5 16px);min-height:58px}
    .deal-contract-signature-media{flex:1;border-radius:8px;border:1px solid #e5e7eb;background:#fff;display:flex;align-items:center;justify-content:center;padding:8px;min-height:58px}
    .deal-contract-signature-media img{max-width:100%;max-height:100%;object-fit:contain}
    .deal-contract-signature-name{font-size:12px;font-weight:700;color:#1a1a2e;text-align:center}
    @media print{body{padding:0}.deal-contract-paper{box-shadow:none;max-width:none}.deal-contract-inner{padding:32px 28px 24px}}
  </style>
</head>
<body>
  <div class="deal-contract-wrap">
    <article class="deal-contract-paper" style="${paperBackground}">
      <div class="deal-contract-inner">
        <header class="deal-contract-header">
          ${template.header.showLogo && logoUrl ? `<img class="deal-contract-logo" src="${logoUrl}" alt="contract-logo" />` : ''}
          <div class="deal-contract-header-main">
            <h1 class="deal-contract-title">${title}</h1>
            <div class="deal-contract-meta">
              <div class="deal-contract-meta-item"><span>تاریخ:</span> <strong>${dateText}</strong></div>
              <div class="deal-contract-meta-item"><span>شماره قرارداد:</span> <strong>${contractNumberText}</strong></div>
            </div>
          </div>
        </header>
        <main class="deal-contract-body">${bodyHtml}</main>
        <footer class="deal-contract-footer">
          ${footerNote ? `<p class="deal-contract-footer-note">${footerNote}</p>` : ''}
          <div class="deal-contract-signatures">
            ${buildSignaturePlaceholderBlock({ role: 'customer', label: customerLabel })}
            ${buildSignaturePlaceholderBlock({ role: 'broker', label: brokerLabel })}
          </div>
        </footer>
      </div>
    </article>
  </div>
</body>
</html>`;
};

const ensureContractStepAccess = ({ deal, actorType }) => {
  if (deal.status !== Deal.STATUSES.IN_PROGRESS || deal.step !== Deal.STEPS.CONTRACT || deal.actBy !== Deal.ACT_BY.CUSTOMER_BROKER) {
    throw Object.assign(new Error('قرارداد در وضعیت فعلی آماده امضا نیست'), { status: 422 });
  }

  if (actorType === DEAL_ACT_BY.CUSTOMER && deal.contractSignedByCustomer) {
    throw Object.assign(new Error('امضای مشتری قبلا ثبت شده است'), { status: 409 });
  }

  if (actorType === DEAL_ACT_BY.BROKER && deal.contractSignedByBroker) {
    throw Object.assign(new Error('امضای کارگزار قبلا ثبت شده است'), { status: 409 });
  }
};

const normalizeRequestFiles = (files) => {
  if (!files) {
    return [];
  }

  if (Array.isArray(files)) {
    return files;
  }

  return Object.values(files)
    .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
    .filter(Boolean);
};

const hasDocumentValue = (item) => {
  if (!item) {
    return false;
  }

  if (item.type === Document.TYPES.FILE) {
    return Boolean(item.value && (typeof item.value === 'object' ? item.value.fileId : item.value));
  }

  return item.value !== null && item.value !== undefined && String(item.value).trim() !== '';
};

const fileMatchesAllowedType = (file, allowedTokens = []) => {
  if (!file || !allowedTokens.length) {
    return true;
  }

  const mimeType = String(file.mimetype || '').toLowerCase();
  const extension = path.extname(String(file.originalname || '')).toLowerCase().replace(/^\./, '');
  const mimeSubtype = mimeType.split('/')[1] || '';
  const aliases = new Set([extension, mimeSubtype]);

  if (extension === 'jpg') {
    aliases.add('jpeg');
  }

  if (extension === 'jpeg') {
    aliases.add('jpg');
  }

  return allowedTokens.some((token) => {
    if (token.includes('/')) {
      if (token.endsWith('/*')) {
        return mimeType.startsWith(`${token.slice(0, token.indexOf('/'))}/`);
      }

      return mimeType === token;
    }

    return aliases.has(token);
  });
};

const getDocumentFileLimitBytes = (item) => {
  const max = Number(item?.max || 0);
  if (!Number.isFinite(max) || max <= 0) {
    return null;
  }

  return max * 1024;
};

const formatFileLimitLabel = (bytes) => {
  if (!bytes || bytes <= 0) {
    return null;
  }

  if (bytes >= 1024 * 1024) {
    return `${Number(bytes / (1024 * 1024)).toLocaleString('fa-IR')} مگابایت`;
  }

  return `${Number(bytes / 1024).toLocaleString('fa-IR')} کیلوبایت`;
};

const validateUploadedDocumentFile = ({ item, file }) => {
  if (!file) {
    return;
  }

  const allowedTokens = normalizeMimeTokens(item?.mimes);
  if (allowedTokens.length && !fileMatchesAllowedType(file, allowedTokens)) {
    throw Object.assign(new Error(`فرمت فایل «${item.title}» باید یکی از ${allowedTokens.join('، ')} باشد`), { status: 422 });
  }

  const limitBytes = getDocumentFileLimitBytes(item);
  if (limitBytes && Number(file.size || 0) > limitBytes) {
    throw Object.assign(new Error(`حجم فایل «${item.title}» نباید بیشتر از ${formatFileLimitLabel(limitBytes)} باشد`), { status: 422 });
  }
};

const validateScalarDocumentValue = ({ item, value }) => {
  if (value == null || value === '') {
    return;
  }

  const max = Number(item?.max || 0);
  if (!Number.isFinite(max) || max <= 0) {
    return;
  }

  const normalized = String(value);
  const length = item.type === Document.TYPES.NUMBER ? normalized.replace(/\D/g, '').length : normalized.trim().length;

  if (length > max) {
    const unitLabel = item.type === Document.TYPES.NUMBER ? 'رقم' : 'کاراکتر';
    throw Object.assign(new Error(`طول فیلد «${item.title}» نباید بیشتر از ${max.toLocaleString('fa-IR')} ${unitLabel} باشد`), {
      status: 422
    });
  }
};

const createResultEntry = ({ action, reason, actorType, actorId, actorName = null, note = null }) => ({
  id: `deal-history-${Date.now()}-${Math.round(Math.random() * 10000)}`,
  action,
  reason: normalizeString(reason) || null,
  note: normalizeString(note) || null,
  message: normalizeString(reason) || normalizeString(note) || null,
  actorType,
  actorRole: actorType,
  actorId: Number(actorId),
  actorName: normalizeString(actorName) || null,
  createdAt: new Date().toISOString()
});

const calculateDealFinancials = ({ requestedAmount, installmentMonths, interestRate, facility }) => {
  const amount = Number(requestedAmount || 0);
  const months = Number(installmentMonths || 0);
  const rate = Number(interestRate || 0);
  const publicContent = parseJson(facility?.publicContent, {});
  const digiVamFeeValue = Number(publicContent.digiVamFeeValue || 0);
  const netAmount = Math.max(amount - digiVamFeeValue, 0);
  const totalProfit = Math.round(netAmount * (rate / 100));
  const totalAmount = netAmount + totalProfit;
  const monthlyInstallmentAmount = months > 0 ? Math.round(totalAmount / months) : 0;

  return {
    amount: netAmount,
    monthlyInstallmentAmount,
    totalProfit,
    totalAmount
  };
};

const snapshotRequiredDocuments = (facility) => {
  const docs = Array.isArray(facility?.requiredDocuments) ? [...facility.requiredDocuments] : [];

  return docs
    .sort((left, right) => Number(left?.link?.sort || 0) - Number(right?.link?.sort || 0))
    .map((doc) => ({
      id: Number(doc.id),
      title: doc.title,
      type: doc.type,
      subject: doc.subject || null,
      required: Boolean(doc.required),
      category: doc.category || null,
      help: doc.help || '',
      mimes: doc.mimes || null,
      max: doc.max ? Number(doc.max) : null,
      sort: Number(doc?.link?.sort || 0),
      value: null
    }));
};

const snapshotFacility = (facility) => ({
  id: facility.id,
  title: facility.title,
  slug: facility.slug,
  type: facility.subTypeModel?.type || facility.type || null,
  typeLabel: DEAL_LOAN_TYPE_LABELS[facility.subTypeModel?.type || facility.type] || facility.type || null,
  subType: facility.subType || null,
  subTypeId: facility.subTypeId || facility.subTypeModel?.id || null,
  loanTypeTitle: facility.subTypeModel?.title || facility.subType || null,
  minAmount: String(facility.minAmount || 0),
  maxAmount: String(facility.maxAmount || 0),
  averageReviewHours: Number(facility.averageReviewHours || 0),
  validationRequired: Boolean(facility.validationId),
  validationTitle: facility.validation?.title || null,
  installmentOptions: [...new Set((facility.installments || []).map((item) => Number(item.month || 0)).filter(Boolean))].sort((a, b) => a - b),
  rateOptions: [...new Set((facility.profits || []).map((item) => Number(item.percent || 0)).filter(Boolean))].sort((a, b) => a - b),
  broker: facility.broker
    ? {
        id: facility.broker.id,
        name: facility.broker.name || `کارگزار #${facility.broker.id}`,
        phone: facility.broker.phone || '-',
        verifyLevel: Number(facility.broker.verifyLevel || 0)
      }
    : null,
  requiredDocuments: snapshotRequiredDocuments(facility)
});

const snapshotCustomerValidation = async (record) => {
  if (!record) {
    return null;
  }

  return serializeCustomerValidation(record);
};

const findInProgressDealForFacility = async ({ customerId, facilityId, transaction }) =>
  Deal.findOne({
    where: {
      customerId: Number(customerId),
      facilityId: Number(facilityId),
      status: Deal.STATUSES.IN_PROGRESS
    },
    order: [['updatedAt', 'DESC'], ['id', 'DESC']],
    transaction
  });

const enrichDealDocuments = async (documents) => {
  const items = Array.isArray(documents) ? documents : [];
  const fileIds = items
    .filter((item) => item?.type === Document.TYPES.FILE && item?.value)
    .map((item) => Number(typeof item.value === 'object' ? item.value.fileId : item.value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!fileIds.length) {
    return items;
  }

  const files = await File.findAll({ where: { id: [...new Set(fileIds)] } });
  const fileMap = new Map(files.map((item) => [Number(item.id), item]));

  return items.map((item) => {
    if (item?.type !== Document.TYPES.FILE || !item?.value) {
      return item;
    }

    const fileId = Number(typeof item.value === 'object' ? item.value.fileId : item.value);
    const file = fileMap.get(fileId);

    if (!file) {
      return { ...item, value: null };
    }

    return {
      ...item,
      value: {
        fileId: file.id,
        fileName: file.data?.originalName || file.subject || `file-${file.id}`,
        url: buildFileUrl(file)
      }
    };
  });
};

const serializeDealActor = (item, fallbackPrefix) => {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    name: item.name || `${fallbackPrefix} #${item.id}`,
    phone: item.phone || '-',
    email: item.email || '-',
    nationalCode: item.nationalCode || '-',
    verifyLevel: Number(item.verifyLevel || 0)
  };
};

export const serializeDeal = async (item) => {
  const raw = typeof item?.toJSON === 'function' ? item.toJSON() : item;
  const documents = (raw) ? await enrichDealDocuments(raw.documents ?? []) : [];
  const completedDocuments = documents.filter(hasDocumentValue).length;
  const paymentTypes = await enrichDealPaymentTypes(raw?.paymentTypes ?? []);
  const resolvedType = raw.facility?.subTypeModel?.type || raw.facility?.type || raw.facilityData?.type || null;
  const resolvedTypeLabel = DEAL_LOAN_TYPE_LABELS[resolvedType] || raw.facilityData?.typeLabel || resolvedType;
  let customerValidationData = raw.customerValidationData || null;
  const customerValidationId = Number(customerValidationData?.id || 0);

  if (customerValidationId) {
    const freshCustomerValidation = await CustomerValidation.findByPk(customerValidationId);

    if (freshCustomerValidation) {
      const freshCustomerValidationData = await serializeCustomerValidation(freshCustomerValidation);
      customerValidationData = {
        ...customerValidationData,
        adminAttachmentId: freshCustomerValidationData.adminAttachmentId || customerValidationData.adminAttachmentId || null,
        adminAttachmentUrl: freshCustomerValidationData.adminAttachmentUrl || customerValidationData.adminAttachmentUrl || null,
        adminAttachmentFileName: freshCustomerValidationData.adminAttachmentFileName || customerValidationData.adminAttachmentFileName || null
      };
    }
  }

  const wizardSteps = getDealWizardSteps({
    step: raw.step,
    level: raw.level,
    status: raw.status
  });

  return {
    id: raw.id,
    dealCode: `DG-${raw.id}`,
    facilityId: raw.facilityId,
    brokerId: raw.brokerId,
    customerId: raw.customerId,
    subTypeId: raw.subTypeId || raw.facility?.subTypeId || raw.facilityData?.subTypeId || null,
    type: resolvedType,
    typeLabel: resolvedTypeLabel,
    status: raw.status,
    statusLabel: Deal.STATUS_LABELS[raw.status] || raw.status,
    step: raw.step,
    stepLabel: Deal.STEP_LABELS[raw.step] || raw.step,
    level: Number(raw.level || getDealStepLevel(raw.step)),
    actBy: raw.actBy,
    actByLabel: Deal.ACT_BY_LABELS[raw.actBy] || raw.actBy,
    amount: String(raw.amount || 0),
    installments: raw.installments || null,
    profit: raw.profit == null ? null : String(raw.profit),
    monthlyInstallmentAmount: String(raw.monthlyInstallmentAmount || 0),
    totalProfit: String(raw.totalProfit || 0),
    totalAmount: String(raw.totalAmount || 0),
    requestedAmount: String(raw.amount || 0),
    installmentMonths: raw.installments || null,
    interestRate: raw.profit == null ? null : String(raw.profit),
    documents,
    documentsCount: documents.length,
    completedDocuments,
    paymentTypes,
    facilityData: raw.facilityData || null,
    contractData: raw.contractData ? stripLegacyDefaultContractBody({ html: raw.contractData, deal: raw }) : null,
    contractSignedByCustomer: Boolean(raw.contractSignedByCustomer),
    contractSignedByBroker: Boolean(raw.contractSignedByBroker),
    contractReady: Boolean(raw.contractData),
    contractFullySigned: Boolean(raw.contractSignedByCustomer && raw.contractSignedByBroker),
    customerValidationData,
    resultHistory: Array.isArray(raw.resultHistory) ? raw.resultHistory : [],
    submittedDocumentsAt: raw.submittedDocumentsAt,
    submittedDocumentsAtLabel: formatDate(raw.submittedDocumentsAt),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    createdAtLabel: formatDate(raw.createdAt),
    updatedAtLabel: formatDate(raw.updatedAt),
    wizardSteps,
    activeWizardKey: raw.step || Deal.STEPS.SUBMIT,
    canSubmitDocuments: raw.status === Deal.STATUSES.IN_PROGRESS && raw.step === Deal.STEPS.SUBMIT && raw.actBy === Deal.ACT_BY.CUSTOMER,
    canBrokerReview: raw.status === Deal.STATUSES.IN_PROGRESS && raw.step === Deal.STEPS.VERIFY_BROKER && raw.actBy === Deal.ACT_BY.BROKER,
    canCustomerSignContract:
      raw.status === Deal.STATUSES.IN_PROGRESS &&
      raw.step === Deal.STEPS.CONTRACT &&
      raw.actBy === Deal.ACT_BY.CUSTOMER_BROKER &&
      !raw.contractSignedByCustomer,
    canBrokerSignContract:
      raw.status === Deal.STATUSES.IN_PROGRESS &&
      raw.step === Deal.STEPS.CONTRACT &&
      raw.actBy === Deal.ACT_BY.CUSTOMER_BROKER &&
      !raw.contractSignedByBroker,
    facility: raw.facility
      ? {
          id: raw.facility.id,
          title: raw.facility.title,
          slug: raw.facility.slug,
          type: raw.facility.subTypeModel?.type || raw.facility.type,
          typeLabel: DEAL_LOAN_TYPE_LABELS[raw.facility.subTypeModel?.type || raw.facility.type] || raw.facility.type || null,
          subType: raw.facility.subType || null,
          subTypeId: raw.facility.subTypeId || raw.facility.subTypeModel?.id || null,
          loanTypeTitle: raw.facility.subTypeModel?.title || raw.facility.subType || null,
          minAmount: String(raw.facility.minAmount || 0),
          maxAmount: String(raw.facility.maxAmount || 0),
          validationId: raw.facility.validationId || null,
          status: raw.facility.status || null
        }
      : raw.facilityData || null,
    customer: serializeDealActor(raw.customer, 'مشتری'),
    broker: serializeDealActor(raw.broker, 'کارگزار')
  };
};

export const loadFacilityForDeal = async (facilityId) =>
  Facility.findByPk(facilityId, {
    include: facilityForDealInclude
  });

export const findApprovedCustomerValidation = async ({ customerId, validationId }) =>
  CustomerValidation.findOne({
    where: {
      customerId: Number(customerId),
      validationId: Number(validationId),
      status: CustomerValidation.STATUSES.APPROVED,
      [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gte]: new Date() } }]
    },
    include: [
      {
        model: Validation,
        as: 'validation',
        required: false,
        attributes: ['id', 'title', 'type', 'validFor', 'amount', 'description']
      }
    ],
    order: [['updatedAt', 'DESC'], ['id', 'DESC']]
  });

const validateDealSelection = ({ facility, requestedAmount, installmentMonths, interestRate }) => {
  const amount = Number(requestedAmount || 0);
  const minAmount = Number(facility.minAmount || 0);
  const maxAmount = Number(facility.maxAmount || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error('مبلغ انتخابی نامعتبر است'), { status: 422 });
  }

  if (amount < minAmount || amount > maxAmount) {
    throw Object.assign(new Error('مبلغ انتخابی خارج از بازه مجاز وام است'), { status: 422 });
  }

  const monthsOptions = [...new Set((facility.installments || []).map((item) => Number(item.month || 0)).filter(Boolean))];
  if (monthsOptions.length && !monthsOptions.includes(Number(installmentMonths || 0))) {
    throw Object.assign(new Error('بازه اقساط انتخابی معتبر نیست'), { status: 422 });
  }

  const rateOptions = [...new Set((facility.profits || []).map((item) => Number(item.percent || 0)).filter(Boolean))];
  if (rateOptions.length && !rateOptions.includes(Number(interestRate || 0))) {
    throw Object.assign(new Error('نرخ سود انتخابی معتبر نیست'), { status: 422 });
  }
};

export const createDealForCustomer = async ({
  customerId,
  facility,
  requestedAmount,
  installmentMonths,
  interestRate,
  transaction
}) => {
  const currentDeal = await findInProgressDealForFacility({
    customerId,
    facilityId: facility.id,
    transaction
  });

  if (currentDeal) {
    throw Object.assign(new Error('معامله ای برای این وام در جریان است'), {
      status: 409,
      code: 'active_deal_exists',
      dealId: Number(currentDeal.id)
    });
  }

  validateDealSelection({ facility, requestedAmount, installmentMonths, interestRate });

  let customerValidationData = null;

  if (facility.validationId) {
    const approvedValidation = await findApprovedCustomerValidation({
      customerId,
      validationId: facility.validationId
    });

    if (!approvedValidation) {
      throw Object.assign(new Error('برای این وام باید اعتبارسنجی تاییدشده داشته باشید'), { status: 422 });
    }

    customerValidationData = await snapshotCustomerValidation(approvedValidation);
  }

  const facilityData = snapshotFacility(facility);
  const hasDocuments = Array.isArray(facilityData.requiredDocuments) && facilityData.requiredDocuments.length > 0;
  const financials = calculateDealFinancials({
    requestedAmount,
    installmentMonths,
    interestRate,
    facility
  });

  return Deal.create(
    {
      facilityId: facility.id,
      brokerId: facility.brokerId,
      customerId: Number(customerId),
      status: Deal.STATUSES.IN_PROGRESS,
      step: hasDocuments ? Deal.STEPS.SUBMIT : Deal.STEPS.VERIFY_BROKER,
      actBy: hasDocuments ? Deal.ACT_BY.CUSTOMER : Deal.ACT_BY.BROKER,
      amount: financials.amount,
      installments: installmentMonths ? Number(installmentMonths) : null,
      profit: interestRate == null || interestRate === '' ? null : Number(interestRate),
      monthlyInstallmentAmount: financials.monthlyInstallmentAmount,
      totalProfit: financials.totalProfit,
      totalAmount: financials.totalAmount,
      subTypeId: facility.subTypeId || facility.subTypeModel?.id || null,
      level: hasDocuments ? getDealStepLevel(Deal.STEPS.SUBMIT) : getDealStepLevel(Deal.STEPS.VERIFY_BROKER),
      documents: facilityData.requiredDocuments,
      resultHistory: [],
      facilityData,
      customerValidationData,
      contractData: null,
      contractSignedByCustomer: false,
      contractSignedByBroker: false,
      submittedDocumentsAt: hasDocuments ? null : new Date()
    },
    { transaction }
  );
};

const upsertDealFile = async ({ dealId, fieldName, file, transaction }) => {
  const relativePath = path.relative(uploadsRoot, file.path).replace(/\\/g, '/');
  const payload = {
    fileableType: 'deal',
    fileableId: dealId,
    subject: fieldName,
    path: relativePath,
    mimeType: file.mimetype,
    size: file.size,
    disk: 'local',
    status: 'processed',
    data: { originalName: file.originalname }
  };

  const existing = await File.findOne({
    where: {
      fileableType: 'deal',
      fileableId: dealId,
      subject: fieldName
    },
    transaction
  });

  if (existing) {
    await existing.update(payload, { transaction });
    return existing;
  }

  return File.create(payload, { transaction });
};

const normalizeDocumentValue = ({ item, rawValue, currentValue }) => {
  if (rawValue === undefined) {
    return currentValue ?? null;
  }

  if (item.type === Document.TYPES.NUMBER) {
    if (rawValue === null || rawValue === '') {
      return null;
    }
    const numeric = Number(rawValue);
    return Number.isFinite(numeric) ? numeric : currentValue ?? null;
  }

  if (item.type === Document.TYPES.DATE) {
    return rawValue ? String(rawValue) : null;
  }

  if (item.type === Document.TYPES.TEXT) {
    return normalizeString(rawValue) || null;
  }

  return currentValue ?? null;
};

export const saveDealDocuments = async ({ deal, fields, files, submit, transaction }) => {
  const parsedFields = parseObject(fields);
  const uploadedFiles = new Map(normalizeRequestFiles(files).map((file) => [file.fieldname, file]));
  const currentDocuments = Array.isArray(deal.documents) ? deal.documents : [];

  const nextDocuments = [];

  for (const item of currentDocuments) {
    const fieldKey = `field_${item.id}`;

    if (item.type === Document.TYPES.FILE) {
      const upload = uploadedFiles.get(fieldKey);
      if (upload) {
        validateUploadedDocumentFile({ item, file: upload });

        const fileRecord = await upsertDealFile({
          dealId: deal.id,
          fieldName: fieldKey,
          file: upload,
          transaction
        });

        nextDocuments.push({ ...item, value: fileRecord.id });
        continue;
      }

      nextDocuments.push({ ...item, value: item.value ?? null });
      continue;
    }

    const normalizedValue = normalizeDocumentValue({
      item,
      rawValue: parsedFields[fieldKey],
      currentValue: item.value
    });

    validateScalarDocumentValue({ item, value: normalizedValue });

    nextDocuments.push({
      ...item,
      value: normalizedValue
    });
  }

  if (submit) {
    const missingRequired = nextDocuments.find((item) => item.required && !hasDocumentValue(item));
    if (missingRequired) {
      throw Object.assign(new Error(`مدرک یا داده «${missingRequired.title}» الزامی است`), { status: 422 });
    }
  }

  await deal.update(
    {
      documents: nextDocuments,
      step: submit ? Deal.STEPS.VERIFY_BROKER : deal.step,
      actBy: submit ? Deal.ACT_BY.BROKER : deal.actBy,
      level: submit ? getDealStepLevel(Deal.STEPS.VERIFY_BROKER) : deal.level,
      submittedDocumentsAt: submit ? new Date() : deal.submittedDocumentsAt
    },
    { transaction }
  );

  return deal;
};

export const reviewDealByBroker = async ({ deal, brokerId, action, reason, paymentTypes, transaction }) => {
  const history = Array.isArray(deal.resultHistory) ? [...deal.resultHistory] : [];
  const actorName = deal.broker?.name || `کارگزار #${brokerId}`;

  if (action === 'reject') {
    history.push(
      createResultEntry({
        action: DEAL_RESULT_ACTIONS.REJECT,
        reason,
        actorType: DEAL_ACT_BY.BROKER,
        actorId: brokerId,
        actorName
      })
    );
    await deal.update(
      {
        status: Deal.STATUSES.FAILED,
        level: getDealStepLevel(deal.step),
        resultHistory: history
      },
      { transaction }
    );
    return deal;
  }

  const normalizedPaymentTypes = normalizeRequestedPaymentTypes(paymentTypes);
  const contractType = await loadContractType(deal);
  const hasContractTemplate = Boolean(contractType?.contractTemplate?.bodyHtml);

  if (!hasContractTemplate) {
    // No contract template → skip contract stage
    await DealPaymentType.destroy({ where: { dealId: Number(deal.id) }, transaction });
    await DealPaymentType.bulkCreate(
      normalizedPaymentTypes.map((item) => ({
        dealId: Number(deal.id),
        paymentType: item.paymentType,
        amount: item.amount,
        description: item.description,
        values: item.values,
        status: item.status,
        doneAt: item.doneAt
      })),
      { transaction }
    );

    const skipToStep = normalizedPaymentTypes.length > 0 ? Deal.STEPS.PAYMENT : Deal.STEPS.TRANSFER;
    const skipToActBy = normalizedPaymentTypes.length > 0 ? Deal.ACT_BY.CUSTOMER : Deal.ACT_BY.BROKER;

    history.push(
      createResultEntry({
        action: DEAL_RESULT_ACTIONS.APPROVE,
        reason,
        actorType: DEAL_ACT_BY.BROKER,
        actorId: brokerId,
        actorName,
        note: 'نوع وام فاقد قرارداد است.‌ مرحله قرارداد نادیده گرفته شد.'
      })
    );

    await deal.update(
      {
        step: skipToStep,
        actBy: skipToActBy,
        level: getDealStepLevel(skipToStep),
        resultHistory: history,
        contractData: null,
        contractSignedByCustomer: false,
        contractSignedByBroker: false
      },
      { transaction }
    );

    return deal;
  }

  const contractHtml = buildDealContractHtml({
    deal,
    typeModel: contractType,
    paymentTypes: normalizedPaymentTypes
  });

  await DealPaymentType.destroy({
    where: { dealId: Number(deal.id) },
    transaction
  });

  await DealPaymentType.bulkCreate(
    normalizedPaymentTypes.map((item) => ({
      dealId: Number(deal.id),
      paymentType: item.paymentType,
      amount: item.amount,
      description: item.description,
      values: item.values,
      status: item.status,
      doneAt: item.doneAt
    })),
    { transaction }
  );

  history.push(
    createResultEntry({
      action: DEAL_RESULT_ACTIONS.APPROVE,
      reason,
      actorType: DEAL_ACT_BY.BROKER,
      actorId: brokerId,
      actorName,
      note: 'روش‌های پرداخت تعیین شد و قرارداد برای بررسی و امضای طرفین آماده است.'
    })
  );

  await deal.update(
    {
      step: Deal.STEPS.CONTRACT,
      actBy: Deal.ACT_BY.CUSTOMER_BROKER,
      level: getDealStepLevel(Deal.STEPS.CONTRACT),
      resultHistory: history,
      contractData: contractHtml,
      contractSignedByCustomer: false,
      contractSignedByBroker: false
    },
    { transaction }
  );

  return deal;
};

export const requestDealContractOtp = async ({ deal, actorType, actorPhone, actorName }) => {
  ensureContractStepAccess({ deal, actorType });

  const phone = normalizeString(actorPhone);

  if (!phone) {
    throw Object.assign(new Error(`شماره همراه ${actorType === DEAL_ACT_BY.BROKER ? 'کارگزار' : 'مشتری'} برای ارسال کد تایید در دسترس نیست`), {
      status: 422
    });
  }

  const otpKey = buildContractOtpKey({
    dealId: deal.id,
    actorType,
    actorPhone: phone
  });
  const activeRecord = readContractOtpRecord(otpKey);

  if (activeRecord) {
    throw Object.assign(new Error('کد تایید قبلا ارسال شده است'), {
      status: 409,
      data: { resendIn: secondsToContractOtpResend(otpKey) }
    });
  }

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  contractOtpStore.set(otpKey, {
    code: otp,
    expiresAt: contractOtpNow() + CONTRACT_OTP_TTL
  });

  await sendOtpSms(phone, otp, { templateId: resolveContractOtpTemplateId(actorType) });

  return {
    message: `کد تایید امضای قرارداد برای ${actorName || (actorType === DEAL_ACT_BY.BROKER ? 'کارگزار' : 'مشتری')} ارسال شد`,
    resendIn: secondsToContractOtpResend(otpKey)
  };
};

export const signDealContract = async ({ deal, actorType, actorId, actorName, actorPhone, code, signature, transaction }) => {
  ensureContractStepAccess({ deal, actorType });

  const normalizedSignature = String(signature || '').trim();
  if (!/^data:image\//i.test(normalizedSignature)) {
    throw Object.assign(new Error('فرمت امضا نامعتبر است'), { status: 422 });
  }

  const otpKey = buildContractOtpKey({
    dealId: deal.id,
    actorType,
    actorPhone
  });
  const otpRecord = readContractOtpRecord(otpKey);

  if (!otpRecord || otpRecord.code !== String(code || '').trim()) {
    throw Object.assign(new Error('کد تایید قرارداد نامعتبر است یا منقضی شده است'), { status: 401 });
  }

  contractOtpStore.delete(otpKey);

  const contractType = await loadContractType(deal);
  const currentPaymentTypes = Array.isArray(deal.paymentTypes) ? deal.paymentTypes.map(serializeDealPaymentType) : [];
  const currentContractHtml = stripLegacyDefaultContractBody({ html: String(deal.contractData || '').trim(), deal });
  const template = normalizeContractTemplate(contractType?.contractTemplate, deal.facility?.loanTypeTitle || deal.facilityData?.loanTypeTitle || 'قرارداد معامله');
  const signatureRole = actorType === DEAL_ACT_BY.BROKER ? 'broker' : 'customer';
  const signatureLabel = actorType === DEAL_ACT_BY.BROKER ? template.footer.brokerSignatureLabel : template.footer.customerSignatureLabel;
  const otherRole = signatureRole === 'broker' ? 'customer' : 'broker';
  const signedContractHtml = buildFreshContractHtml({
    deal,
    contractType,
    paymentTypes: currentPaymentTypes,
    existingHtml: currentContractHtml,
    replacements: {
      [`SIGNATURE_${otherRole.toUpperCase()}`]: readContractBlock({ html: currentContractHtml, marker: `SIGNATURE_${otherRole.toUpperCase()}` }),
      [`SIGNATURE_${signatureRole.toUpperCase()}`]: renderSignedSignatureBlock({
        role: signatureRole,
        label: signatureLabel,
        actorName: actorName || (actorType === DEAL_ACT_BY.BROKER ? `کارگزار #${actorId}` : `مشتری #${actorId}`),
        signature: normalizedSignature
      })
    }
  });

  const history = Array.isArray(deal.resultHistory) ? [...deal.resultHistory] : [];
  const signedByCustomer = actorType === DEAL_ACT_BY.CUSTOMER ? true : Boolean(deal.contractSignedByCustomer);
  const signedByBroker = actorType === DEAL_ACT_BY.BROKER ? true : Boolean(deal.contractSignedByBroker);
  const bothSigned = signedByCustomer && signedByBroker;

  const hasPaymentTypes = Array.isArray(deal.paymentTypes) && deal.paymentTypes.length > 0;
  const nextStep = bothSigned ? (hasPaymentTypes ? Deal.STEPS.PAYMENT : Deal.STEPS.TRANSFER) : deal.step;
  const nextActBy = bothSigned ? (hasPaymentTypes ? Deal.ACT_BY.CUSTOMER : Deal.ACT_BY.BROKER) : deal.actBy;

  history.push(
    createResultEntry({
      action: 'sign_contract',
      reason: `${actorType === DEAL_ACT_BY.BROKER ? 'کارگزار' : 'مشتری'} قرارداد را امضا کرد`,
      actorType,
      actorId,
      actorName,
      note: bothSigned
        ? (hasPaymentTypes ? 'هر دو طرف قرارداد را امضا کرده‌اند و پرونده وارد مرحله پرداخت شد.' : 'هر دو طرف قرارداد را امضا کرده‌اند و پرونده وارد مرحله انتقال شد.')
        : 'در انتظار امضای طرف دیگر قرارداد.'
    })
  );

  await deal.update(
    {
      contractData: signedContractHtml,
      contractSignedByCustomer: signedByCustomer,
      contractSignedByBroker: signedByBroker,
      resultHistory: history,
      step: nextStep,
      actBy: nextActBy,
      level: bothSigned ? getDealStepLevel(nextStep) : deal.level
    },
    { transaction }
  );

  return deal;
};

export const manageDealByAdmin = async ({ deal, status, step, actBy, note, adminId, adminName, transaction }) => {
  const nextStatus = normalizeString(status) || null;
  const nextStep = normalizeString(step) || null;
  const nextActBy = normalizeString(actBy) || null;
  const nextNote = normalizeString(note) || null;

  if (!nextStatus && !nextStep && !nextActBy && !nextNote) {
    throw Object.assign(new Error('حداقل یکی از فیلدهای وضعیت، مرحله، صف اقدام یا پیام باید ارسال شود'), { status: 422 });
  }

  if (nextStatus && !Object.values(Deal.STATUSES).includes(nextStatus)) {
    throw Object.assign(new Error('وضعیت معامله نامعتبر است'), { status: 422 });
  }

  if (nextStep && !Object.values(Deal.STEPS).includes(nextStep)) {
    throw Object.assign(new Error('مرحله معامله نامعتبر است'), { status: 422 });
  }

  if (nextActBy && !Object.values(Deal.ACT_BY).includes(nextActBy)) {
    throw Object.assign(new Error('صف اقدام معامله نامعتبر است'), { status: 422 });
  }

  const updates = {};
  const history = Array.isArray(deal.resultHistory) ? [...deal.resultHistory] : [];
  const changeList = [];

  if (nextStatus && nextStatus !== deal.status) {
    updates.status = nextStatus;
    changeList.push(`وضعیت به «${Deal.STATUS_LABELS[nextStatus] || nextStatus}» تغییر کرد`);
  }

  if (nextStep && nextStep !== deal.step) {
    updates.step = nextStep;
    updates.level = getDealStepLevel(nextStep);
    changeList.push(`مرحله به «${Deal.STEP_LABELS[nextStep] || nextStep}» تغییر کرد`);
  }

  if (nextActBy && nextActBy !== deal.actBy) {
    updates.actBy = nextActBy;
    changeList.push(`صف اقدام به «${Deal.ACT_BY_LABELS[nextActBy] || nextActBy}» تغییر کرد`);
  }

  history.push(
    createResultEntry({
      action: changeList.length ? DEAL_RESULT_ACTIONS.UPDATE : DEAL_RESULT_ACTIONS.NOTE,
      reason: changeList.join(' | ') || nextNote || 'یادداشت ادمین روی پرونده ثبت شد',
      actorType: Deal.ACT_BY.ADMIN,
      actorId: adminId,
      actorName: adminName,
      note: nextNote || changeList.join(' | ')
    })
  );

  updates.resultHistory = history;

  await deal.update(updates, { transaction });
  return deal;
};

export const refreshDealContract = async ({ deal, transaction }) => {
  if (!deal.contractData) {
    throw Object.assign(new Error('قرارداد هنوز ساخته نشده است'), { status: 422 });
  }

  const oldHtml = String(deal.contractData);
  const contractType = await loadContractType(deal);
  const currentPaymentTypes = Array.isArray(deal.paymentTypes) ? deal.paymentTypes.map(serializeDealPaymentType) : [];
  let newHtml = buildDealContractHtml({ deal, typeModel: contractType, paymentTypes: currentPaymentTypes });

  for (const role of ['CUSTOMER', 'BROKER']) {
    const startMarker = `<!-- SIGNATURE_${role}_START -->`;
    const endMarker = `<!-- SIGNATURE_${role}_END -->`;
    const oldStart = oldHtml.indexOf(startMarker);
    const oldEnd = oldHtml.indexOf(endMarker);
    if (oldStart !== -1 && oldEnd !== -1 && oldEnd > oldStart) {
      const existingBlock = oldHtml.slice(oldStart, oldEnd + endMarker.length);
      newHtml = replaceContractBlock({ html: newHtml, marker: `SIGNATURE_${role}`, replacement: existingBlock.slice(startMarker.length + 1, -(endMarker.length + 1)) });
    }
  }

  await deal.update({ contractData: newHtml }, { transaction });
  return deal;
};

export const removeDealSignature = async ({ deal, role, adminId, adminName, transaction }) => {
  const normalizedRole = String(role).toLowerCase();
  if (!['customer', 'broker'].includes(normalizedRole)) {
    throw Object.assign(new Error('نقش نامعتبر است'), { status: 422 });
  }

  if (!deal.contractData) {
    throw Object.assign(new Error('قراردادی وجود ندارد'), { status: 422 });
  }

  const isSigned = normalizedRole === 'customer' ? deal.contractSignedByCustomer : deal.contractSignedByBroker;
  if (!isSigned) {
    throw Object.assign(new Error('این طرف هنوز قرارداد را امضا نکرده است'), { status: 422 });
  }

  const contractType = await loadContractType(deal);
  const template = normalizeContractTemplate(contractType?.contractTemplate, deal.facility?.loanTypeTitle || deal.facilityData?.loanTypeTitle || 'قرارداد معامله');
  const label = normalizedRole === 'broker' ? template.footer.brokerSignatureLabel : template.footer.customerSignatureLabel;

  const newHtml = replaceContractBlock({
    html: deal.contractData,
    marker: `SIGNATURE_${normalizedRole.toUpperCase()}`,
    replacement: buildSignaturePlaceholderBlock({ role: normalizedRole, label }).replace(
      new RegExp(`<!-- SIGNATURE_${normalizedRole.toUpperCase()}_START -->|<!-- SIGNATURE_${normalizedRole.toUpperCase()}_END -->`, 'g'),
      ''
    ).trim()
  });

  const history = Array.isArray(deal.resultHistory) ? [...deal.resultHistory] : [];
  history.push(
    createResultEntry({
      action: 'update',
      reason: `امضای ${normalizedRole === 'customer' ? 'مشتری' : 'کارگزار'} توسط ادمین حذف شد`,
      actorType: 'admin',
      actorId: adminId,
      actorName: adminName || `ادمین #${adminId}`
    })
  );

  const updates = {
    contractData: newHtml,
    resultHistory: history
  };

  if (normalizedRole === 'customer') {
    updates.contractSignedByCustomer = false;
  } else {
    updates.contractSignedByBroker = false;
  }

  if (deal.step !== Deal.STEPS.CONTRACT) {
    updates.step = Deal.STEPS.CONTRACT;
    updates.actBy = Deal.ACT_BY.CUSTOMER_BROKER;
    updates.level = getDealStepLevel(Deal.STEPS.CONTRACT);
  }

  await deal.update(updates, { transaction });
  return deal;
};
export const advanceDealPayment = async ({ deal, customerId, transaction }) => {
  if (deal.status !== Deal.STATUSES.IN_PROGRESS || deal.step !== Deal.STEPS.PAYMENT || deal.actBy !== Deal.ACT_BY.CUSTOMER) {
    throw Object.assign(new Error('معامله در مرحله پرداخت مشتری نیست'), { status: 422 });
  }

  const paymentTypes = Array.isArray(deal.paymentTypes) ? deal.paymentTypes : [];
  const pending = paymentTypes.filter(
    (p) => (typeof p.toJSON === 'function' ? p.toJSON() : p).status !== DEAL_PAYMENT_STATUSES.DONE
  );

  if (pending.length > 0) {
    throw Object.assign(new Error('همه روش‌های پرداخت باید تکمیل شوند'), { status: 422 });
  }

  const history = Array.isArray(deal.resultHistory) ? [...deal.resultHistory] : [];
  const customerName = deal.customer?.name || `مشتری #${customerId}`;

  history.push(
    createResultEntry({
      action: DEAL_RESULT_ACTIONS.UPDATE,
      reason: 'مشتری مرحله پرداخت را تکمیل کرد',
      actorType: DEAL_ACT_BY.CUSTOMER,
      actorId: customerId,
      actorName: customerName,
      note: 'پرداخت‌ها تکمیل شدند و پرونده وارد مرحله انتقال شد.'
    })
  );

  await deal.update(
    {
      step: Deal.STEPS.TRANSFER,
      actBy: Deal.ACT_BY.BROKER,
      level: getDealStepLevel(Deal.STEPS.TRANSFER),
      resultHistory: history
    },
    { transaction }
  );

  return deal;
};

export const clearDealSignature = async ({ deal, role, adminId, adminName, transaction }) => {
  const normalizedRole = String(role || '').toLowerCase();
  if (!['customer', 'broker'].includes(normalizedRole)) {
    throw Object.assign(new Error('نقش امضا نامعتبر است'), { status: 422 });
  }
  if (!deal.contractData) {
    throw Object.assign(new Error('قرارداد هنوز تولید نشده است'), { status: 422 });
  }

  const isSigned = normalizedRole === 'customer' ? Boolean(deal.contractSignedByCustomer) : Boolean(deal.contractSignedByBroker);
  if (!isSigned) {
    throw Object.assign(new Error('برای این طرف امضای ثبت‌شده‌ای وجود ندارد'), { status: 422 });
  }

  const contractType = await loadContractType(deal);
  const currentPaymentTypes = Array.isArray(deal.paymentTypes) ? deal.paymentTypes.map(serializeDealPaymentType) : [];
  const otherRole = normalizedRole === 'broker' ? 'customer' : 'broker';
  const shouldPreserveOther = otherRole === 'broker' ? Boolean(deal.contractSignedByBroker) : Boolean(deal.contractSignedByCustomer);
  const newHtml = buildFreshContractHtml({
    deal,
    contractType,
    paymentTypes: currentPaymentTypes,
    existingHtml: String(deal.contractData),
    replacements: shouldPreserveOther
      ? {
          [`SIGNATURE_${otherRole.toUpperCase()}`]: readContractBlock({
            html: String(deal.contractData),
            marker: `SIGNATURE_${otherRole.toUpperCase()}`
          })
        }
      : {}
  });

  const history = Array.isArray(deal.resultHistory) ? [...deal.resultHistory] : [];
  history.push(
    createResultEntry({
      action: 'update',
      reason: `امضای ${normalizedRole === 'broker' ? 'کارگزار' : 'مشتری'} توسط ادمین حذف شد`,
      actorType: 'admin',
      actorId: adminId,
      actorName: adminName
    })
  );

  await deal.update(
    {
      contractData: newHtml,
      contractSignedByCustomer: normalizedRole === 'customer' ? false : deal.contractSignedByCustomer,
      contractSignedByBroker: normalizedRole === 'broker' ? false : deal.contractSignedByBroker,
      resultHistory: history,
      step: Deal.STEPS.CONTRACT,
      actBy: Deal.ACT_BY.CUSTOMER_BROKER,
      level: getDealStepLevel(Deal.STEPS.CONTRACT)
    },
    { transaction }
  );

  return deal;
};

export const loadDealById = async (id, where = {}) => {
  return await Deal.findOne({
    where: { id: Number(id), ...where },
    include: dealInclude
  })
}

export const findDealById = async (id, where = {}) => {
  const item = await loadDealById(id, where);
  return item ? serializeDeal(item) : null;
};

export const listDeals = async ({ where = {}, page = 1, limit = 10, order } = {}) => {
  const { rows, count } = await Deal.findAndCountAll({
    where,
    include: dealInclude,
    distinct: true,
    order: order || [['updatedAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset: (page - 1) * limit
  });

  const items = await Promise.all(rows.map(serializeDeal));

  return createPaginationResult({
    items,
    total: count,
    page,
    limit
  });
};

const awaitingWhereForActor = (actor, where = {}) => {
  const base = { ...where, status: Deal.STATUSES.IN_PROGRESS };

  if (actor === Deal.ACT_BY.CUSTOMER) {
    return {
      ...base,
      actBy: { [Op.in]: [Deal.ACT_BY.CUSTOMER, Deal.ACT_BY.CUSTOMER_BROKER] }
    };
  }

  if (actor === Deal.ACT_BY.BROKER) {
    return {
      ...base,
      actBy: { [Op.in]: [Deal.ACT_BY.BROKER, Deal.ACT_BY.CUSTOMER_BROKER] }
    };
  }

  return { ...base, actBy: actor };
};

export const createDealSummary = async (where = {}) => {
  const [
    total,
    inProgress,
    failed,
    suspended,
    done,
    waitingCustomer,
    waitingBroker,
    waitingAdmin,
    verifyBroker
  ] = await Promise.all([
    Deal.count({ where }),
    Deal.count({ where: { ...where, status: Deal.STATUSES.IN_PROGRESS } }),
    Deal.count({ where: { ...where, status: Deal.STATUSES.FAILED } }),
    Deal.count({ where: { ...where, status: Deal.STATUSES.SUSPENDED } }),
    Deal.count({ where: { ...where, status: Deal.STATUSES.DONE } }),
    Deal.count({ where: awaitingWhereForActor(Deal.ACT_BY.CUSTOMER, where) }),
    Deal.count({ where: awaitingWhereForActor(Deal.ACT_BY.BROKER, where) }),
    Deal.count({ where: awaitingWhereForActor(Deal.ACT_BY.ADMIN, where) }),
    Deal.count({ where: { ...where, step: Deal.STEPS.VERIFY_BROKER } })
  ]);

  return {
    total,
    inProgress,
    failed,
    suspended,
    done,
    waitingCustomer,
    waitingBroker,
    waitingAdmin,
    verifyBroker
  };
};