<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import CustomerDealContractStage from '../components/CustomerDealContractStage.vue';
import CustomerDealPaymentStage from '../components/CustomerDealPaymentStage.vue';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
import PersianDatePickerInput from '../components/PersianDatePickerInput.vue';
import { getWebFacilityBySlug } from '../services/web-loan.api.js';
import { createCustomerDeal, getCustomerDeal, saveCustomerDealDocuments, verifyDealCashPayment } from '../services/customer-panel.api.js';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const savingDraft = ref(false);
const submittingDocuments = ref(false);
const creatingDeal = ref(false);
const errorText = ref('');
const errorDetails = ref([]);
const successText = ref('');
const successDetails = ref([]);
const facility = ref(null);
const deal = ref(null);
const requestedAmount = ref('');
const installmentMonths = ref('');
const interestRate = ref('');
const fieldValues = ref({});
const selectedFiles = ref({});
const existingDealLink = ref('');
const resultHistoryOpen = ref(false);
const activeStageTab = ref('submit');
const wizardStepperRef = ref(null);
const jalaliDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
const jalaliDateTimeFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));
const formatMoney = (value) => `${formatNumber(value)} تومان`;

const formatFileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!size) {
    return '-';
  }

  if (size >= 1024 * 1024) {
    return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(size / (1024 * 1024))} مگابایت`;
  }

  return `${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(size / 1024)} کیلوبایت`;
};

const parseDateLikeValue = (value) => {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return null;
  }

  const date = normalized.includes('T') ? new Date(normalized) : new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatJalaliDate = (value, { withTime = false } = {}) => {
  const date = parseDateLikeValue(value);

  if (!date) {
    const fallback = String(value ?? '').trim();
    return fallback || '-';
  }

  return (withTime ? jalaliDateTimeFormatter : jalaliDateFormatter).format(date);
};

const normalizeMessages = (messages) => {
  const rawMessages = Array.isArray(messages) ? messages : messages ? [messages] : [];

  return rawMessages
    .flatMap((entry) => {
      if (Array.isArray(entry)) {
        return entry;
      }

      if (entry && typeof entry === 'object') {
        return [entry.msg || entry.message || ''];
      }

      return [String(entry || '')];
    })
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const clearFeedback = () => {
  errorText.value = '';
  errorDetails.value = [];
  successText.value = '';
  successDetails.value = [];
  existingDealLink.value = '';
};

const setErrorFeedback = (message, details = []) => {
  successText.value = '';
  successDetails.value = [];
  errorText.value = message || 'امکان انجام این عملیات وجود ندارد';
  errorDetails.value = normalizeMessages(details).filter((entry) => entry !== errorText.value);
};

const setSuccessFeedback = (message, details = []) => {
  errorText.value = '';
  errorDetails.value = [];
  successText.value = message || 'عملیات با موفقیت انجام شد';
  successDetails.value = normalizeMessages(details).filter((entry) => entry !== successText.value);
};

const extractErrorDetails = (error) => normalizeMessages(error?.data?.errors || error?.data?.details);

const dispatchDealUpdate = () => {
  window.dispatchEvent(new CustomEvent('customer-deal-updated'));
};

const historyActionLabels = {
  approve: 'تایید',
  reject: 'رد',
  submit: 'ارسال مدارک',
  create: 'ایجاد معامله',
  sign_contract: 'امضای قرارداد',
  update: 'بروزرسانی توسط ادمین',
  note: 'یادداشت ادمین'
};

const historyActorLabels = {
  admin: 'ادمین',
  broker: 'کارگزار',
  customer: 'مشتری',
  customer_broker: 'مشتری و کارگزار'
};

const fieldKeyOf = (documentId) => `field_${documentId}`;

const isExistingDeal = computed(() => Boolean(route.params.id));
const displayFacility = computed(() => facility.value || deal.value?.facilityData || null);
const currentDocuments = computed(() => {
  if (deal.value?.documents?.length) {
    return deal.value.documents;
  }

  return displayFacility.value?.requiredDocuments || [];
});
const hasDocuments = computed(() => currentDocuments.value.length > 0);
const displayTypeLabel = computed(() => deal.value?.typeLabel || displayFacility.value?.typeLabel || '-');
const displayValidation = computed(() => deal.value?.customerValidationData || null);
const currentDealLevel = computed(() => Number(deal.value?.level || 1));
const dealProgressPercent = computed(() => {
  const totalSteps = 7;

  if (!deal.value) {
    return Math.round(100 / totalSteps);
  }

  if (deal.value.status === 'done') {
    return 100;
  }

  return Math.max(Math.round((Math.min(currentDealLevel.value, totalSteps) / totalSteps) * 100), Math.round(100 / totalSteps));
});
const dealProgressSummary = computed(() => {
  if (!deal.value) {
    return 'پرونده هنوز ایجاد نشده و با ثبت اولیه، مسیر معامله شروع می‌شود.';
  }

  if (deal.value.status === 'failed') {
    return 'پرونده در همین مرحله متوقف شده و جزئیات آن در تاریخچه نتیجه‌ها ثبت شده است.';
  }

  if (deal.value.status === 'suspended') {
    return 'پرونده موقتاً متوقف شده و تا اقدام بعدی در همین وضعیت باقی می‌ماند.';
  }

  if (deal.value.status === 'done') {
    return 'همه مراحل تکمیل شده و این معامله به پایان رسیده است.';
  }

  return `مرحله فعلی «${deal.value.stepLabel || 'در حال پردازش'}» است و اقدام بعدی با ${deal.value.actByLabel || 'سیستم'} خواهد بود.`;
});
const wizardSteps = computed(() => {
  if (Array.isArray(deal.value?.wizardSteps) && deal.value.wizardSteps.length) {
    return deal.value.wizardSteps;
  }

  const definitions = [
    { key: 'base', title: 'اطلاعات پایه معامله', description: 'اطلاعات اصلی پرونده، طرفین و خلاصه مالی معامله.', state: 'available', level: 0 },
    { key: 'submit', title: 'ثبت و تکمیل مدارک', description: 'اطلاعات پرونده و مدارک اولیه توسط شما آماده می‌شود.' },
    { key: 'verify_broker', title: 'بررسی کارگزار', description: 'کارگزار مدارک و اطلاعات ثبت‌شده را بررسی می‌کند.' },
    { key: 'contract', title: 'قرارداد', description: 'جزییات قراردادی و تاییدهای لازم ثبت می‌شود.' },
    { key: 'payment', title: 'پرداخت', description: 'پرداخت‌های مرتبط با پرونده در این مرحله ثبت می‌شود.' },
    { key: 'transfer', title: 'انتقال امتیاز', description: 'انتقال امتیاز و هماهنگی اجرایی توسط کارگزار انجام می‌شود.' },
    { key: 'verify_customer', title: 'تایید مشتری', description: 'تایید نهایی انتقال یا دریافت از سمت شما انجام می‌شود.' },
    { key: 'finished', title: 'اتمام معامله', description: 'پرونده بسته می‌شود و نتیجه نهایی در تاریخچه باقی می‌ماند.' }
  ];

  return definitions.map((item, index) => {
    if (item.key === 'base') {
      return item;
    }

    const level = index;
    const isCurrent = deal.value ? currentDealLevel.value === level : level === 1;
    const isDone = deal.value?.status === 'done' ? level <= currentDealLevel.value : currentDealLevel.value > level;
    const isFailed = deal.value?.status === 'failed' && isCurrent;
    const isPaused = deal.value?.status === 'suspended' && isCurrent;

    return {
      ...item,
      level,
      state: isFailed ? 'failed' : isPaused ? 'paused' : isDone ? 'done' : isCurrent ? 'current' : 'upcoming'
    };
  });
});
const selectedStageMeta = computed(() => wizardSteps.value.find((item) => item.key === activeStageTab.value) || wizardSteps.value[0] || null);
const activeStageSummary = computed(() => {
  const selected = selectedStageMeta.value;

  if (!selected) {
    return '';
  }

  if (selected.key === 'base') {
    return 'در این تب، اطلاعات پایه پرونده، خلاصه مالی و نمای کلی وضعیت معامله نمایش داده می‌شود.';
  }

  if (selected.key === deal.value?.step) {
    return `این تب مرحله فعال پرونده است و اقدام جاری با ${deal.value?.actByLabel || 'سیستم'} انجام می‌شود.`;
  }

  return 'با انتخاب هر مرحله، فقط اطلاعات مرتبط با همان بخش از مسیر معامله نمایش داده می‌شود.';
});
const dealInfoCards = computed(() => {
  if (!deal.value) {
    return [];
  }

  return [
    { label: 'شماره پرونده', value: deal.value.dealCode || `#${formatNumber(deal.value.id)}` },
    { label: 'نوع معامله', value: deal.value.typeLabel || '-' },
    { label: 'صف اقدام', value: deal.value.actByLabel || '-' },
    { label: 'مدارک تکمیل‌شده', value: `${formatNumber(deal.value.completedDocuments || 0)} / ${formatNumber(deal.value.documentsCount || 0)}` },
    { label: 'قسط ماهانه', value: formatMoney(deal.value.monthlyInstallmentAmount || 0) },
    { label: 'سود کل', value: formatMoney(deal.value.totalProfit || 0) },
    { label: 'جمع بازپرداخت', value: formatMoney(deal.value.totalAmount || 0) },
    { label: 'آخرین بروزرسانی', value: deal.value.updatedAtLabel || '-' },
    { label: 'ارسال مدارک', value: deal.value.submittedDocumentsAtLabel || '-' },
    { label: 'اعتبارسنجی متصل', value: deal.value.customerValidationData?.statusLabel || 'ندارد' },
    { label: 'ثبت اولیه', value: deal.value.createdAtLabel || '-' },
    { label: 'زیرشاخه', value: deal.value.facilityData?.loanTypeTitle || deal.value.facility?.loanTypeTitle || '-' }
  ];
});
const dealPrimaryCards = computed(() => dealInfoCards.value.slice(0, 6));
const dealSecondaryCards = computed(() => dealInfoCards.value.slice(6));
const timelineProgressPercent = computed(() => (deal.value ? dealProgressPercent.value : Math.round(100 / 7)));
const heroMetrics = computed(() => [
  { label: 'مبلغ انتخابی', value: formatMoney(requestedAmount.value || deal.value?.amount || 0) },
  { label: 'مدت بازپرداخت', value: `${formatNumber(installmentMonths.value || deal.value?.installments || 0)} ماه` },
  { label: 'نرخ سود', value: `${formatNumber(interestRate.value || deal.value?.profit || 0)} درصد` },
  {
    label: deal.value ? 'وضعیت مدارک' : 'مدارک موردنیاز',
    value: deal.value
      ? `${formatNumber(deal.value.completedDocuments || 0)} از ${formatNumber(deal.value.documentsCount || 0)}`
      : `${formatNumber(currentDocuments.value.length)} مورد`
  }
]);
const statusFacts = computed(() => {
  if (deal.value) {
    return [
      { label: 'مرحله فعلی', value: deal.value.stepLabel || '-' },
      { label: 'اقدام بعدی', value: deal.value.actByLabel || '-' },
      { label: 'آخرین بروزرسانی', value: deal.value.updatedAtLabel || '-' },
      { label: 'وضعیت پرونده', value: deal.value.statusLabel || '-' }
    ];
  }

  return [
    { label: 'نوع معامله', value: displayTypeLabel.value || '-' },
    { label: 'زیرشاخه', value: displayFacility.value?.loanTypeTitle || '-' },
    { label: 'مدارک موردنیاز', value: `${formatNumber(currentDocuments.value.length)} مورد` },
    { label: 'وضعیت فعلی', value: hasDocuments.value ? 'آماده ثبت یا ذخیره پیش نویس' : 'آماده ایجاد معامله' }
  ];
});
const facilityFacts = computed(() => {
  const item = displayFacility.value;

  return [
    { label: 'عنوان وام', value: item?.title || '-' },
    { label: 'نوع معامله', value: displayTypeLabel.value || '-' },
    { label: 'زیرشاخه', value: item?.loanTypeTitle || '-' },
    { label: 'تعداد مدارک', value: `${formatNumber(currentDocuments.value.length)} مورد` },
    { label: 'شناسه پرونده', value: deal.value ? (deal.value.dealCode || `#${formatNumber(deal.value.id)}`) : 'هنوز ایجاد نشده' }
  ].filter((entry) => entry.value && entry.value !== '-');
});
const pageChecklist = computed(() => {
  if (!deal.value) {
    return [
      'مبلغ، اقساط و نرخ سود را با دقت نهایی کنید.',
      hasDocuments.value ? 'همه مدارک و داده‌های خواسته‌شده را از همین صفحه تکمیل کنید.' : 'این وام در شروع، مدرک اضافه‌ای از شما نمی‌خواهد.',
      hasDocuments.value ? 'اگر هنوز آماده ارسال نیستید، ابتدا پیش نویس ذخیره کنید.' : 'پس از ایجاد معامله، ادامه وضعیت از همین صفحه پیگیری می‌شود.'
    ];
  }

  if (deal.value.status === 'failed') {
    return [
      'آخرین تصمیم ثبت‌شده را از تاریخچه نتیجه‌ها مرور کنید.',
      'اگر نیاز به اصلاح یا هماهنگی دارید، با پشتیبانی یا کارگزار پیگیری کنید.',
      'در صورت نیاز، بعد از رفع ایراد پرونده تازه یا اصلاح‌شده ثبت کنید.'
    ];
  }

  if (deal.value.status === 'done') {
    return [
      'خلاصه وضعیت و مدارک نهایی این معامله در همین صفحه باقی می‌ماند.',
      'برای نیازهای بعدی می‌توانید فایل‌ها و مقادیر ثبت‌شده را دوباره مرور کنید.',
      'اگر معامله جدیدی دارید، از لیست معامله‌ها پرونده بعدی را شروع کنید.'
    ];
  }

  if (deal.value.step === 'contract') {
    return [
      'روش‌های پرداخت تعیین‌شده توسط کارگزار را دقیق مرور کنید.',
      'نسخه قرارداد را مشاهده یا دانلود کنید و سپس امضای خود را ثبت نمایید.',
      'پس از تایید OTP، وضعیت امضای دو طرف از همین صفحه قابل پیگیری است.'
    ];
  }

  if (deal.value.step === 'payment') {
    return [
      'قرارداد توسط دو طرف امضا شده و پرونده وارد مرحله پرداخت شده است.',
      'روش‌های پرداخت تعیین‌شده را مبنا قرار دهید و اقدام بعدی را طبق آن انجام دهید.',
      'تاریخچه نتیجه‌ها و وضعیت پرونده همچنان از همین صفحه قابل پیگیری است.'
    ];
  }

  if (canEditDocuments.value) {
    return [
      'مدارک ناقص یا اطلاعات در انتظار ثبت را تکمیل کنید.',
      'در صورت نیاز، قبل از ارسال نهایی از ذخیره موقت استفاده کنید.',
      'پس از اطمینان، مدارک را برای بررسی کارگزار بفرستید.'
    ];
  }

  return [
    'وضعیت پرونده را از همین صفحه دنبال کنید.',
    'هر تصمیم جدید در تاریخچه نتیجه‌ها و وضعیت پرونده دیده می‌شود.',
    'اگر مرحله بعدی به اقدام شما نیاز داشته باشد، دوباره همین صفحه فعال می‌شود.'
  ];
});
const resultHistoryEntries = computed(() => (Array.isArray(deal.value?.resultHistory) ? [...deal.value.resultHistory].reverse() : []));
const canShowResultHistory = computed(() => resultHistoryEntries.value.length > 0);
const canShowReadonlyDocuments = computed(() => Boolean(deal.value && currentDocuments.value.length && !canEditDocuments.value && deal.value?.step !== 'contract'));
const paymentFacts = computed(() => (Array.isArray(deal.value?.paymentTypes) ? deal.value.paymentTypes : []));
const shellStats = computed(() => [
  { label: 'مبلغ انتخابی', value: `${formatNumber(requestedAmount.value || deal.value?.amount || 0)} تومان` },
  { label: 'اقساط', value: `${formatNumber(installmentMonths.value || deal.value?.installments || 0)} ماه` },
  { label: 'سود', value: `${formatNumber(interestRate.value || deal.value?.profit || 0)}%` },
  {
    label: 'مدارک',
    value: `${formatNumber(deal.value?.completedDocuments || countCompletedDocuments(currentDocuments.value))} / ${formatNumber(deal.value?.documentsCount || currentDocuments.value.length)}`
  }
]);

const canCreateDeal = computed(() => !isExistingDeal.value && displayFacility.value);
const canEditDocuments = computed(() => deal.value?.canSubmitDocuments);
const isSentToBroker = computed(() => deal.value?.step === 'verify_broker' && deal.value?.status === 'in_progress');
const canShowEditableDocuments = computed(() => currentDocuments.value.length && (!deal.value || canEditDocuments.value));
const canCreateDraft = computed(() => canCreateDeal.value && hasDocuments.value);
const canCreateAndSubmit = computed(() => canCreateDeal.value);

const getHistoryActionLabel = (entry) => historyActionLabels[entry?.action] || 'بروزرسانی';
const getHistoryActorLabel = (entry) => entry?.actorName || historyActorLabels[entry?.actorType] || 'سیستم';

const handleContractUpdate = (item) => {
  deal.value = item;
  activeStageTab.value = item?.step || activeStageTab.value;
  syncFieldsFromDocuments(item?.documents || []);
  selectedFiles.value = {};
  dispatchDealUpdate();
};

const handlePaymentUpdate = (item) => {
  if (!item) return;
  deal.value = item;
  activeStageTab.value = item.step || activeStageTab.value;
  dispatchDealUpdate();
};

function countCompletedDocuments(documents) {
  return (documents || []).filter((document) => {
    if (document.type === 'file') {
      const key = fieldKeyOf(document.id);
      return Boolean(selectedFiles.value[key] || document.value?.url || document.value?.fileId || document.value);
    }

    const raw = fieldValues.value[fieldKeyOf(document.id)] ?? document.value;
    return raw !== null && raw !== undefined && String(raw).trim() !== '';
  }).length;
}

const applyFacilitySelections = (item) => {
  requestedAmount.value = route.query.amount || item?.calculatorDefaults?.amount || item?.amountOptions?.[0] || item?.minAmount || '';
  installmentMonths.value = route.query.months || item?.calculatorDefaults?.months || item?.installmentOptions?.[0] || '';
  interestRate.value = route.query.rate || item?.calculatorDefaults?.rate || item?.rateOptions?.[0] || '';
};

const syncFieldsFromDocuments = (documents) => {
  const nextFields = {};

  for (const document of documents || []) {
    if (document.type !== 'file') {
      nextFields[fieldKeyOf(document.id)] = document.value ?? '';
    }
  }

  fieldValues.value = nextFields;
};

const loadFacility = async () => {
  const data = await getWebFacilityBySlug(route.params.slug);
  facility.value = data.item;
  applyFacilitySelections(data.item);
  syncFieldsFromDocuments(data.item?.requiredDocuments || []);
};

const loadDeal = async () => {
  const data = await getCustomerDeal(route.params.id);
  deal.value = data.item;
  activeStageTab.value = data.item?.step || 'submit';
  requestedAmount.value = data.item.amount || '';
  installmentMonths.value = data.item.installments || '';
  interestRate.value = data.item.profit || '';
  syncFieldsFromDocuments(data.item.documents || []);
};

const load = async () => {
  loading.value = true;
  clearFeedback();
  resultHistoryOpen.value = false;

  try {
    if (isExistingDeal.value) {
      facility.value = null;
      selectedFiles.value = {};
      await loadDeal();
    } else {
      deal.value = null;
      activeStageTab.value = 'submit';
      selectedFiles.value = {};
      await loadFacility();
    }

    if (route.query.sent === '1' && deal.value?.step === 'verify_broker' && deal.value?.status === 'in_progress') {
      setSuccessFeedback('مدارک شما با موفقیت ارسال شد', ['پرونده اکنون در انتظار تایید کارگزار است و نتیجه در همین صفحه نمایش داده می‌شود.']);
    }

    if (route.query.cashVerify === '1' && route.query.Authority && route.params.id) {
      const paymentTypeId = Number(route.query.paymentTypeId || 0);
      const authority = String(route.query.Authority || '');
      const status = String(route.query.Status || '');
      if (paymentTypeId && authority) {
        try {
          const verifyData = await verifyDealCashPayment(route.params.id, paymentTypeId, { Authority: authority, Status: status });
          if (verifyData.paid) {
            if (verifyData.deal) deal.value = verifyData.deal;
            setSuccessFeedback('پرداخت نقدی تایید شد', ['وضعیت پرداخت به‌روز شد.']);
          } else {
            setErrorFeedback('پرداخت ناموفق بود یا لغو شد', []);
          }
        } catch {
          setErrorFeedback('خطا در تایید پرداخت', []);
        }
      }
    }
  } catch (error) {
    setErrorFeedback(error.message, extractErrorDetails(error));
  } finally {
    loading.value = false;
  }
};

const updateFieldValue = (documentId, value) => {
  fieldValues.value = {
    ...fieldValues.value,
    [fieldKeyOf(documentId)]: value
  };
};

const handleFileChange = (documentId, event) => {
  const file = event.target.files?.[0] || null;
  selectedFiles.value = {
    ...selectedFiles.value,
    [fieldKeyOf(documentId)]: file
  };
};

const clearSelectedFile = (documentId) => {
  const key = fieldKeyOf(documentId);
  selectedFiles.value = Object.fromEntries(Object.entries(selectedFiles.value).filter(([entryKey]) => entryKey !== key));
};

const getSelectedFile = (documentId) => selectedFiles.value[fieldKeyOf(documentId)] || null;

const getDocumentAccept = (document) => {
  const parts = String(document?.mimes || '')
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!parts.length) {
    return undefined;
  }

  return parts
    .map((item) => {
      if (item.includes('/')) {
        return item;
      }

      return `.${item.replace(/^\./, '')}`;
    })
    .join(',');
};

const getDocumentLimitText = (document) => {
  if (!document?.max) {
    return null;
  }

  if (document.type === 'file') {
    return `حداکثر حجم ${formatFileSize(Number(document.max) * 1024)}`;
  }

  return `حداکثر ${formatNumber(document.max)} ${document.type === 'number' ? 'رقم' : 'کاراکتر'}`;
};

const getDocumentFormatsText = (document) => {
  if (!document?.mimes) {
    return null;
  }

  return `فرمت مجاز: ${String(document.mimes).replace(/,/g, '، ')}`;
};

const getDocumentValueLabel = (document) => {
  if (document.type === 'file') {
    const selected = getSelectedFile(document.id);
    if (selected) {
      return selected.name;
    }

    if (document.value?.fileName) {
      return document.value.fileName;
    }

    return 'فایلی انتخاب نشده است';
  }

  return fieldValues.value[fieldKeyOf(document.id)] ?? document.value ?? '';
};

const formatReadonlyDocumentValue = (document) => {
  const rawValue = document?.value;

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return 'ثبت نشده';
  }

  if (document?.type === 'date') {
    return formatJalaliDate(rawValue);
  }

  return String(rawValue);
};

const validateDocumentCollection = ({ requireComplete }) => {
  const messages = [];

  for (const document of currentDocuments.value) {
    if (document.type === 'file') {
      const file = getSelectedFile(document.id);
      const existingValue = document.value?.url || document.value?.fileId || document.value;

      if (requireComplete && document.required && !file && !existingValue) {
        messages.push(`مدرک «${document.title}» الزامی است`);
      }

      if (file && document.max) {
        const maxBytes = Number(document.max || 0) * 1024;
        if (maxBytes > 0 && file.size > maxBytes) {
          messages.push(`حجم فایل «${document.title}» نباید بیشتر از ${formatFileSize(maxBytes)} باشد`);
        }
      }

      continue;
    }

    const value = fieldValues.value[fieldKeyOf(document.id)] ?? '';
    if (requireComplete && document.required && !String(value).trim()) {
      messages.push(`فیلد «${document.title}» الزامی است`);
    }

    if (document.max) {
      const normalized = document.type === 'number' ? String(value).replace(/\D/g, '') : String(value).trim();
      if (normalized.length > Number(document.max || 0)) {
        messages.push(`طول «${document.title}» نباید بیشتر از ${formatNumber(document.max)} ${document.type === 'number' ? 'رقم' : 'کاراکتر'} باشد`);
      }
    }
  }

  return messages;
};

const buildDocumentsFormData = (submit) => {
  const formData = new FormData();
  formData.append('submit', submit ? '1' : '0');
  formData.append('fields', JSON.stringify(fieldValues.value));

  Object.entries(selectedFiles.value).forEach(([key, file]) => {
    if (file) {
      formData.append(key, file);
    }
  });

  return formData;
};

const createDealRequest = async ({ submitDocumentsImmediately = false } = {}) => {
  if (!displayFacility.value || creatingDeal.value) {
    return;
  }

  const validationMessages = validateDocumentCollection({ requireComplete: submitDocumentsImmediately });
  if (validationMessages.length) {
    setErrorFeedback('چند مورد در بخش مدارک نیاز به اصلاح دارد', validationMessages);
    return;
  }

  creatingDeal.value = true;
  clearFeedback();

  try {
    const created = await createCustomerDeal({
      facilityId: displayFacility.value.id,
      requestedAmount: Number(requestedAmount.value),
      installmentMonths: installmentMonths.value ? Number(installmentMonths.value) : null,
      interestRate: interestRate.value ? Number(interestRate.value) : null
    });

    let createdItem = created.item;

    if (currentDocuments.value.length) {
      const data = await saveCustomerDealDocuments(created.item.id, buildDocumentsFormData(submitDocumentsImmediately));
      createdItem = data.item;
    }

    dispatchDealUpdate();
    await router.replace(
      submitDocumentsImmediately
        ? { path: `/customer/deals/${createdItem.id}`, query: { sent: '1', refresh: String(Date.now()) } }
        : `/customer/deals/${createdItem.id}`
    );
  } catch (error) {
    setErrorFeedback(error.message, extractErrorDetails(error));
    existingDealLink.value = error?.data?.dealId ? `/customer/deals/${error.data.dealId}` : '';
  } finally {
    creatingDeal.value = false;
  }
};

const submitDocuments = async (submit) => {
  if (!deal.value) {
    return;
  }

  const validationMessages = validateDocumentCollection({ requireComplete: submit });
  if (validationMessages.length) {
    setErrorFeedback('چند مورد در بخش مدارک نیاز به اصلاح دارد', validationMessages);
    return;
  }

  clearFeedback();

  if (submit) {
    submittingDocuments.value = true;
  } else {
    savingDraft.value = true;
  }

  try {
    const data = await saveCustomerDealDocuments(deal.value.id, buildDocumentsFormData(submit));
    deal.value = data.item;
    syncFieldsFromDocuments(data.item.documents || []);
    selectedFiles.value = {};
    dispatchDealUpdate();

    if (submit) {
      await router.replace({ path: `/customer/deals/${deal.value.id}`, query: { sent: '1', refresh: String(Date.now()) } });
      return;
    }

    setSuccessFeedback(data.message || 'اطلاعات معامله ذخیره شد', ['مدارک به صورت پیش‌نویس ذخیره شد و هر زمان بخواهید می‌توانید ارسال نهایی را انجام دهید.']);
  } catch (error) {
    setErrorFeedback(error.message, extractErrorDetails(error));
  } finally {
    savingDraft.value = false;
    submittingDocuments.value = false;
  }
};

watch(() => route.fullPath, load);
watch(activeStageTab, () => {
  wizardStepperRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
onMounted(load);
</script>

<template>
  <section class="customer-deal-start-view">
    <CustomerPanelShell
      kicker="شروع معامله"
      :title="isExistingDeal ? 'جزئیات معامله امتیاز وام' : 'شروع معامله امتیاز وام'"
      description="مبلغ، اقساط و نرخ سود را نهایی کنید و در صورت نیاز مدارک را برای بررسی کارگزار بفرستید."
      :stats="shellStats"
    >
      <template #actions>
        <RouterLink class="customer-hero-link muted" to="/customer/deals">بازگشت به معامله‌ها</RouterLink>
      </template>

      <div v-if="loading" class="customer-loading-card">
        <div class="customer-spinner"></div>
        <span>در حال بارگذاری اطلاعات معامله...</span>
      </div>
      <div v-else-if="errorText && !displayFacility && !deal" class="customer-loading-card text-danger">{{ errorText }}</div>
      <div v-else class="deal-page-stack">
        <article v-if="successText" class="deal-feedback success" role="status">
          <div class="deal-feedback-headline">
            <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
            <div>
              <strong>{{ successText }}</strong>
              <p v-if="successDetails.length">وضعیت پرونده به‌روز شد.</p>
            </div>
          </div>
          <ul v-if="successDetails.length" class="deal-feedback-list">
            <li v-for="detail in successDetails" :key="detail">{{ detail }}</li>
          </ul>
        </article>

        <article v-if="errorText" class="deal-feedback error" role="alert">
          <div class="deal-feedback-headline">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <div>
              <strong>{{ errorText }}</strong>
              <p v-if="errorDetails.length">این موارد را اصلاح کنید:</p>
            </div>
          </div>
          <ul v-if="errorDetails.length" class="deal-feedback-list">
            <li v-for="detail in errorDetails" :key="detail">{{ detail }}</li>
          </ul>
        </article>

        <section class="deal-card deal-hero-card">
          <div class="deal-hero-main">
            <div class="deal-card-head deal-hero-head">
              <div>
                <span class="deal-kicker">{{ deal ? 'پرونده فعال شما' : 'شروع پرونده جدید' }}</span>
                <h2>{{ deal?.facility?.title || displayFacility?.title || 'معامله امتیاز وام' }}</h2>
                <p>
                  {{
                    deal
                      ? dealProgressSummary
                      : 'مبلغ، اقساط و نرخ سود را نهایی کنید. اگر این وام مدرک بخواهد، همان‌جا پرونده را ذخیره یا مستقیماً برای کارگزار ارسال می‌کنید.'
                  }}
                </p>
              </div>

              <div class="deal-hero-tools">
                <span v-if="deal" class="deal-status-chip" :class="`status-${deal.status}`">{{ deal.statusLabel }}</span>

                <div v-if="deal" class="result-history-dropup">
                  <button type="button" class="result-history-button" :disabled="!canShowResultHistory" @click="resultHistoryOpen = !resultHistoryOpen">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    {{ resultHistoryOpen ? 'بستن تاریخچه' : 'تاریخچه نتیجه‌ها' }}
                    <span v-if="canShowResultHistory" class="result-history-badge">{{ formatNumber(resultHistoryEntries.length) }}</span>
                  </button>

                  <transition name="dropup-fade">
                    <div v-if="resultHistoryOpen && canShowResultHistory" class="result-history-panel">
                      <article v-for="entry in resultHistoryEntries" :key="entry.id" class="result-history-item">
                        <div class="result-history-head">
                          <strong>{{ getHistoryActionLabel(entry) }}</strong>
                          <span>{{ getHistoryActorLabel(entry) }}</span>
                        </div>
                        <p>{{ entry.reason || entry.note || entry.message || 'بدون توضیح' }}</p>
                        <small>{{ formatJalaliDate(entry.createdAt, { withTime: true }) }}</small>
                      </article>
                    </div>
                  </transition>
                </div>
              </div>
            </div>

            <div class="deal-metric-grid">
              <article v-for="item in heroMetrics" :key="item.label" class="deal-metric-card">
                <span class="deal-metric-label">{{ item.label }}</span>
                <strong class="deal-metric-value">{{ item.value }}</strong>
              </article>
            </div>

            <div class="deal-hero-facts-grid">
              <article v-for="item in facilityFacts" :key="item.label" class="deal-summary-card deal-summary-card-hero">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </article>
            </div>

            <div v-if="existingDealLink" class="deal-inline-warning">
              <strong>برای این وام یک معامله فعال وجود دارد.</strong>
              <RouterLink class="customer-inline-link" :to="existingDealLink">مشاهده معامله فعال</RouterLink>
            </div>

            <div v-if="canCreateDeal" class="deal-action-row">
              <button v-if="canCreateDraft" class="customer-secondary-btn" :disabled="creatingDeal" @click="createDealRequest({ submitDocumentsImmediately: false })">
                {{ creatingDeal ? 'در حال ایجاد...' : 'ایجاد معامله و ذخیره پیش نویس' }}
              </button>
              <button class="customer-primary-btn" :disabled="creatingDeal" @click="createDealRequest({ submitDocumentsImmediately: hasDocuments })">
                {{ creatingDeal ? 'در حال ایجاد...' : hasDocuments ? 'ایجاد معامله و ارسال مدارک' : 'ایجاد معامله' }}
              </button>
            </div>
          </div>

          <aside class="deal-hero-side">
            <div class="deal-progress-shell">
              <span class="deal-progress-kicker">{{ deal ? 'پیشرفت پرونده' : 'آماده شروع' }}</span>
              <strong>{{ deal ? `${formatNumber(dealProgressPercent)}٪` : '۱ / ۷' }}</strong>
              <p>
                {{
                  deal
                    ? `مرحله ${formatNumber(currentDealLevel)} از ۷ مرحله پرونده` 
                    : 'پس از ایجاد پرونده، همین صفحه به پنل پیگیری مرحله‌به‌مرحله تبدیل می‌شود.'
                }}
              </p>
              <div class="deal-progress-track" aria-hidden="true">
                <span :style="{ width: `${timelineProgressPercent}%` }"></span>
              </div>
            </div>

            <div class="deal-side-facts">
              <article v-for="item in statusFacts" :key="item.label" class="deal-side-fact">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </article>
            </div>
          </aside>
        </section>

        <div class="deal-content-grid">
          <div class="deal-main-column">
            <section class="deal-card">
              <div class="deal-card-head">
                <div>
                  <h3>مسیر معامله</h3>
                  <p>هر مرحله را انتخاب کنید تا فقط جزئیات مرتبط با همان بخش از پرونده نمایش داده شود.</p>
                </div>
                <span class="deal-progress-badge">{{ deal ? `${formatNumber(dealProgressPercent)}٪ پیشرفت` : 'شروع مرحله ۱' }}</span>
              </div>

              <div ref="wizardStepperRef" class="deal-stepper">
                <button v-for="step in wizardSteps" :key="step.key" type="button" class="deal-step" :class="[`state-${step.state}`, { active: activeStageTab === step.key }]" @click="activeStageTab = step.key">
                  <span class="deal-step-index">{{ step.key === 'base' ? '•' : formatNumber(step.level) }}</span>
                  <strong>{{ step.title }}</strong>
                </button>
              </div>

              <div v-if="selectedStageMeta" class="deal-stage-spotlight">
                <strong>{{ selectedStageMeta.title }}</strong>
                <p>{{ activeStageSummary }}</p>
              </div>
            </section>

            <section v-if="deal && activeStageTab === 'base'" class="deal-card">
              <div class="deal-card-head">
                <div>
                  <h3>خلاصه معامله</h3>
                  <p>شماره پرونده، وضعیت فعلی، جمع بازپرداخت و جزئیات تکمیل مدارک از این بخش قابل پیگیری است.</p>
                </div>
              </div>

              <div class="deal-summary-grid">
                <article v-for="item in dealPrimaryCards" :key="item.label" class="deal-summary-card">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </article>
              </div>

              <div v-if="dealSecondaryCards.length" class="deal-summary-list">
                <div v-for="item in dealSecondaryCards" :key="item.label" class="deal-summary-row">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </section>

            <CustomerDealContractStage
              v-if="activeStageTab === 'contract' && deal && (deal.contractReady || deal.paymentTypes?.length || deal.step === 'contract' || deal.step === 'payment')"
              :deal="deal"
              @updated="handleContractUpdate"
            />

            <section v-if="activeStageTab === 'submit' && displayValidation" class="deal-card">
              <div class="deal-card-head">
                <div>
                  <h3>اعتبارسنجی متصل به پرونده</h3>
                  <p>اسنپ‌شات اعتبارسنجی تاییدشده‌ای که همراه همین معامله ذخیره شده است.</p>
                </div>
              </div>

              <div class="deal-validation-grid">
                <article class="deal-summary-card">
                  <span>روش اعتبارسنجی</span>
                  <strong>{{ displayValidation.selfValidationLabel }}</strong>
                </article>
                <article class="deal-summary-card">
                  <span>وضعیت</span>
                  <strong>{{ displayValidation.statusLabel }}</strong>
                </article>
                <article class="deal-summary-card">
                  <span>نام سرویس</span>
                  <strong>{{ displayValidation.validation?.title || '-' }}</strong>
                </article>
                <article class="deal-summary-card">
                  <span>انقضا</span>
                  <strong>{{ displayValidation.expiresAtLabel || '-' }}</strong>
                </article>
              </div>

              <div v-if="displayValidation.result" class="deal-validation-note">{{ displayValidation.result }}</div>
            </section>

            <section v-if="activeStageTab === 'submit' && canShowEditableDocuments" class="deal-card">
              <div class="deal-card-head">
                <div>
                  <h3>مدارک و داده‌های موردنیاز</h3>
                  <p>
                    {{ deal ? 'پس از تکمیل این بخش، پرونده برای بررسی کارگزار ارسال می‌شود.' : 'راهنما، محدودیت‌ها و مدارک تعریف‌شده برای این وام در همین صفحه قابل تکمیل است.' }}
                  </p>
                </div>
              </div>

              <div class="deal-documents-grid">
                <article v-for="document in currentDocuments" :key="document.id" class="deal-document-item">
                  <div class="deal-document-head">
                    <div>
                      <strong>{{ document.title }}</strong>
                      <div class="deal-document-type-row">
                        <span class="document-type-chip">{{ document.typeLabel || document.type }}</span>
                        <span v-if="document.required" class="required-chip">الزامی</span>
                      </div>
                    </div>
                  </div>

                  <p>{{ document.help || 'این داده برای شروع بررسی معامله نیاز است.' }}</p>

                  <div class="document-limit-list">
                    <span v-if="document.category">دسته‌بندی: {{ document.category }}</span>
                    <span v-if="getDocumentFormatsText(document)">{{ getDocumentFormatsText(document) }}</span>
                    <span v-if="getDocumentLimitText(document)">{{ getDocumentLimitText(document) }}</span>
                  </div>

                  <template v-if="document.type === 'file'">
                    <div class="upload-field-shell">
                      <div class="upload-field-main">
                        <div class="upload-field-copy">
                          <span class="upload-field-kicker">پیوست فایل</span>
                          <strong>{{ getDocumentValueLabel(document) }}</strong>
                          <span>{{ getSelectedFile(document.id) ? formatFileSize(getSelectedFile(document.id).size) : (document.value?.url ? 'فایل بارگذاری شده' : 'برای انتخاب فایل کلیک کنید') }}</span>
                        </div>
                        <label class="upload-field-button" :for="`deal-file-${document.id}`">
                          <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>
                          <span>{{ document.value?.url ? 'جایگزینی فایل' : 'انتخاب فایل' }}</span>
                        </label>
                      </div>

                      <input
                        :id="`deal-file-${document.id}`"
                        class="document-file-input"
                        type="file"
                        :accept="getDocumentAccept(document)"
                        @change="handleFileChange(document.id, $event)"
                      />

                      <div v-if="document.value?.url" class="uploaded-file-row">
                        <a :href="document.value.url" target="_blank" rel="noreferrer">{{ document.value.fileName || 'فایل فعلی' }}</a>
                      </div>
                      <button v-if="getSelectedFile(document.id)" type="button" class="upload-field-clear" @click="clearSelectedFile(document.id)">حذف فایل انتخاب‌شده</button>
                    </div>
                  </template>

                  <PersianDatePickerInput
                    v-else-if="document.type === 'date'"
                    :model-value="fieldValues[fieldKeyOf(document.id)] ?? ''"
                    :placeholder="document.title"
                    @update:model-value="updateFieldValue(document.id, $event)"
                  />

                  <input
                    v-else-if="document.type === 'text' || document.type === 'number'"
                    :type="document.type === 'number' ? 'number' : 'text'"
                    class="form-control deal-input"
                    :inputmode="document.type === 'number' ? 'numeric' : undefined"
                    :maxlength="document.type === 'text' && document.max ? Number(document.max) : undefined"
                    :value="fieldValues[fieldKeyOf(document.id)] ?? ''"
                    @input="updateFieldValue(document.id, $event.target.value)"
                  />
                </article>
              </div>

              <div v-if="deal && canEditDocuments" class="deal-action-row">
                <button class="customer-secondary-btn" :disabled="savingDraft || submittingDocuments" @click="submitDocuments(false)">
                  {{ savingDraft ? 'در حال ذخیره...' : 'ذخیره موقت' }}
                </button>
                <button class="customer-primary-btn" :disabled="submittingDocuments" @click="submitDocuments(true)">
                  {{ submittingDocuments ? 'در حال ارسال...' : 'ارسال مدارک به کارگزار' }}
                </button>
              </div>
            </section>

            <section v-else-if="activeStageTab === 'verify_broker' && deal && isSentToBroker" class="deal-card deal-success-card">
              <div class="deal-success-icon"><i class="fa-solid fa-paper-plane"></i></div>
              <h3>مدارک با موفقیت ارسال شد</h3>
              <p>پرونده شما وارد مرحله بررسی کارگزار شده است. نتیجه‌های بعدی از همین صفحه و لیست معامله‌ها قابل مشاهده است.</p>
              <div class="deal-action-row deal-success-actions">
                <RouterLink class="customer-primary-btn link-btn" to="/customer/deals">رفتن به لیست معامله‌ها</RouterLink>
                <RouterLink v-if="deal.facility?.slug" class="customer-secondary-btn link-btn" :to="`/market/${deal.facility.slug}`">بازگشت به صفحه وام</RouterLink>
              </div>
            </section>

            <section v-if="activeStageTab === 'submit' && canShowReadonlyDocuments" class="deal-card">
              <div class="deal-card-head">
                <div>
                  <h3>مدارک و داده‌های ثبت‌شده</h3>
                  <p>نسخه نهایی مدارکی که برای این معامله ثبت شده‌اند در این بخش باقی می‌ماند.</p>
                </div>
              </div>

              <div class="deal-documents-grid">
                <article v-for="document in currentDocuments" :key="`readonly-${document.id}`" class="deal-document-item readonly-item">
                  <div class="deal-document-head">
                    <div>
                      <strong>{{ document.title }}</strong>
                      <div class="deal-document-type-row">
                        <span class="document-type-chip">{{ document.typeLabel || document.type }}</span>
                        <span v-if="document.required" class="required-chip">الزامی</span>
                      </div>
                    </div>
                  </div>

                  <p>{{ document.help || 'اطلاعات ثبت‌شده برای این فیلد در همین بخش نمایش داده می‌شود.' }}</p>

                  <div class="document-limit-list">
                    <span v-if="document.category">دسته‌بندی: {{ document.category }}</span>
                    <span v-if="getDocumentFormatsText(document)">{{ getDocumentFormatsText(document) }}</span>
                  </div>

                  <div class="deal-readonly-value">
                    <a v-if="document.type === 'file' && document.value?.url" class="customer-inline-link" :href="document.value.url" target="_blank" rel="noreferrer">
                      {{ document.value.fileName || 'مشاهده فایل ثبت‌شده' }}
                    </a>
                    <span v-else-if="document.value !== null && document.value !== undefined && document.value !== ''" class="document-text">{{ formatReadonlyDocumentValue(document) }}</span>
                    <span v-else class="deal-empty-chip">ثبت نشده</span>
                  </div>
                </article>
              </div>
            </section>

            <section v-if="activeStageTab === 'payment'" class="deal-card">
              <CustomerDealPaymentStage v-if="deal" :deal="deal" @updated="handlePaymentUpdate" />
              <div v-else class="deal-validation-note">اطلاعات پرداخت در دسترس نیست.</div>
            </section>

            <section v-if="deal && ['verify_broker', 'transfer', 'verify_customer', 'finished'].includes(activeStageTab)" class="deal-card">
              <div class="deal-card-head">
                <div>
                  <h3>{{ selectedStageMeta?.title || 'وضعیت مرحله' }}</h3>
                  <p>{{ activeStageSummary }}</p>
                </div>
              </div>

              <div class="deal-validation-note">
                مرحله فعلی پرونده: {{ deal.stepLabel || '-' }}
                <br />
                اقدام بعدی با: {{ deal.actByLabel || '-' }}
              </div>
            </section>
          </div>

          <aside class="deal-side-column">
            <section v-if="displayValidation?.result" class="deal-card deal-side-card">
              <div class="deal-card-head compact">
                <div>
                  <h3>یادداشت اعتبارسنجی</h3>
                  <p>متن نتیجه ذخیره‌شده اعتبارسنجی برای مرور سریع در کنار صفحه آمده است.</p>
                </div>
              </div>

              <div class="deal-validation-note">{{ displayValidation.result }}</div>
            </section>
          </aside>
        </div>
      </div>
    </CustomerPanelShell>
  </section>
</template>

<style scoped>
.customer-deal-start-view {
  display: grid;
  gap: 18px;
}

.customer-loading-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 48px 28px;
  border-radius: 30px;
  background: var(--web-surface);
  border: 1px solid var(--web-border);
  color: var(--web-muted);
  font-weight: 700;
}

.customer-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--web-border);
  border-top-color: var(--web-primary);
  border-radius: 50%;
  animation: dealStartSpin 0.7s linear infinite;
}

@keyframes dealStartSpin {
  to { transform: rotate(360deg); }
}

.deal-feedback {
  margin: 0;
  display: grid;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid transparent;
  border-radius: 22px;
}

.deal-feedback.success {
  border-color: rgba(34, 160, 107, 0.18);
  background: rgba(34, 160, 107, 0.12);
  color: #15803d;
}

.deal-feedback.error {
  border-color: rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.deal-feedback-headline {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.deal-feedback-headline i {
  margin-top: 2px;
  font-size: 18px;
}

.deal-feedback-headline strong {
  display: block;
  font-size: 14px;
  font-weight: 900;
}

.deal-feedback-headline p {
  margin: 6px 0 0;
  font-size: 12px;
  opacity: 0.9;
}

.deal-feedback-list {
  margin: 0;
  padding: 0 18px 0 0;
  display: grid;
  gap: 8px;
  font-size: 12px;
  line-height: 1.9;
}

.deal-page-stack {
  display: grid;
  gap: 18px;
}

.deal-card {
  display: grid;
  gap: 18px;
  padding: 22px;
  border-radius: 28px;
  border: 1px solid var(--web-border);
  background:
    radial-gradient(circle at top right, rgba(193, 18, 18, 0.08), transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--web-surface) 95%, #fff 5%) 0%, var(--web-surface-soft) 100%);
  box-shadow: var(--web-shadow);
}

.deal-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.deal-card-head.compact {
  gap: 10px;
}

.deal-card-head h3,
.deal-hero-head h2,
.deal-success-card h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
}

.deal-card-head p,
.deal-hero-head p,
.deal-success-card p,
.deal-document-item p,
.result-history-item p {
  margin: 6px 0 0;
  color: var(--web-muted);
  font-size: 12px;
  line-height: 1.85;
}

.deal-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  margin-bottom: 12px;
  border-radius: 999px;
  background: rgba(193, 18, 18, 0.1);
  color: var(--web-primary);
  font-size: 11px;
  font-weight: 900;
}

.deal-hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
  gap: 20px;
  align-items: start;
}

.deal-hero-main {
  display: grid;
  gap: 18px;
}

.deal-hero-head {
  align-items: flex-start;
}

.deal-hero-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.deal-status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
}

.deal-status-chip.status-in_progress {
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
}

.deal-status-chip.status-failed {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.deal-status-chip.status-suspended {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.deal-status-chip.status-done {
  background: rgba(34, 160, 107, 0.12);
  color: #15803d;
}

.deal-metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
}

.deal-hero-facts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.deal-metric-card,
.deal-summary-card,
.deal-side-fact {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--web-border);
  background: color-mix(in srgb, var(--web-surface) 78%, transparent);
}

.deal-summary-card-hero {
  min-height: 100%;
}

.deal-metric-label,
.deal-summary-card span,
.deal-side-fact span,
.deal-summary-row span,
.deal-progress-kicker,
.deal-step-phase {
  color: var(--web-muted);
  font-size: 11px;
  font-weight: 800;
}

.deal-metric-value,
.deal-summary-card strong,
.deal-side-fact strong,
.deal-summary-row strong {
  font-size: 15px;
  font-weight: 900;
  line-height: 1.7;
}

.deal-inline-warning {
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.deal-action-row,
.deal-success-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.deal-hero-side {
  display: grid;
  gap: 14px;
}

.deal-progress-shell {
  display: grid;
  gap: 10px;
  padding: 18px;
  border-radius: 24px;
  border: 1px solid rgba(193, 18, 18, 0.16);
  background: linear-gradient(180deg, rgba(193, 18, 18, 0.1), rgba(193, 18, 18, 0.04));
}

.deal-progress-shell > strong {
  font-size: 38px;
  line-height: 1;
  font-weight: 900;
  color: var(--web-primary);
}

.deal-progress-shell > p {
  margin: 0;
  color: var(--web-muted);
  font-size: 12px;
  line-height: 1.9;
}

.deal-progress-track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  overflow: hidden;
}

.deal-progress-track span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--web-primary) 0%, #ea580c 100%);
}

.deal-side-facts {
  display: grid;
  gap: 14px;
}

.result-history-dropup {
  position: relative;
}

.result-history-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 16px;
  border: 1px solid var(--web-border-strong);
  background: color-mix(in srgb, var(--web-surface) 82%, transparent);
  color: var(--web-text);
  font-size: 12px;
  font-weight: 900;
}

.result-history-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--web-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}

.result-history-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result-history-panel {
  position: absolute;
  inset: calc(100% + 12px) 0 auto auto;
  width: min(420px, calc(100vw - 48px));
  max-height: 360px;
  overflow: auto;
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 22px;
  border: 1px solid var(--web-border);
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  box-shadow: var(--web-shadow);
  z-index: 6;
}

.result-history-item {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--web-border);
  background: color-mix(in srgb, var(--web-surface) 74%, transparent);
}

.result-history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.result-history-head strong,
.result-history-head span,
.result-history-item small {
  font-size: 11px;
}

.result-history-head strong {
  font-weight: 900;
}

.result-history-head span,
.result-history-item small {
  color: var(--web-muted);
}

.dropup-fade-enter-active,
.dropup-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropup-fade-enter-from,
.dropup-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.customer-primary-btn,
.customer-secondary-btn,
.customer-hero-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 800;
}

.customer-primary-btn {
  border: 1px solid var(--web-primary);
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  color: #fff;
}

.customer-secondary-btn,
.customer-hero-link.muted {
  border: 1px solid var(--web-border-strong);
  background: color-mix(in srgb, var(--web-surface) 82%, transparent);
  color: var(--web-text);
}

.deal-content-grid {
  /* display: grid; 
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.8fr); */
  gap: 18px;
  align-items: start;
}

.deal-main-column,
.deal-side-column {
  display: grid;
  gap: 18px;
}

.deal-progress-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(193, 18, 18, 0.1);
  color: var(--web-primary);
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.deal-stepper {
  display: flex;
  flex-wrap: nowrap;
  gap: 0;
  overflow: visible;
  padding-bottom: 0;
  align-items: flex-start;
}

.deal-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 0;
  min-height: auto;
  min-width: 0;
  flex: 1;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.deal-step:active {
  transform: scale(0.96);
}

.deal-step::before {
  content: '';
  position: absolute;
  top: 16px;
  left: calc(50% + 18px);
  right: -50%;
  height: 3px;
  border-radius: 2px;
  background: rgba(148, 163, 184, 0.24);
  z-index: 0;
  transition: background 0.35s ease;
}

.deal-step:first-child::before {
  display: none;
}

.deal-step.state-done::before,
.deal-step.state-completed::before {
  background: rgba(34, 197, 94, 0.45);
}

.deal-step.state-current::before {
  background: rgba(11, 95, 131, 0.35);
}

.deal-step-index {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  position: relative;
  z-index: 1;
  border: 2.5px solid rgba(148, 163, 184, 0.25);
  background: var(--web-surface, #fff);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.deal-step.state-done .deal-step-index {
  background: linear-gradient(135deg, rgba(34, 160, 107, 0.15), rgba(34, 160, 107, 0.06));
  border-color: rgba(34, 160, 107, 0.55);
  color: #15803d;
}

.deal-step.state-current .deal-step-index {
  background: linear-gradient(135deg, rgba(193, 18, 18, 0.12), rgba(193, 18, 18, 0.04));
  border-color: rgba(193, 18, 18, 0.55);
  color: var(--web-primary);
}

.deal-step.state-failed .deal-step-index {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.04));
  border-color: rgba(239, 68, 68, 0.55);
  color: #b91c1c;
}

.deal-step.state-paused .deal-step-index {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04));
  border-color: rgba(245, 158, 11, 0.55);
  color: #b45309;
}

.deal-step.active .deal-step-index {
  box-shadow: 0 0 0 4px rgba(193, 18, 18, 0.12), 0 2px 12px rgba(193, 18, 18, 0.15);
  transform: scale(1.1);
}

.deal-step strong {
  font-size: 11px;
  font-weight: 800;
  text-align: center;
  line-height: 1.4;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--web-muted);
  transition: color 0.2s ease;
}

.deal-step.active strong {
  color: var(--web-primary);
}

.deal-step.state-done strong {
  color: #15803d;
}

.deal-checklist li,
.deal-validation-note,
.document-text {
  margin: 0;
  color: var(--web-muted);
  font-size: 12px;
  line-height: 1.9;
}

.deal-stage-spotlight {
  margin-top: 16px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--web-border);
  background: color-mix(in srgb, var(--web-surface) 78%, transparent);
}

.deal-stage-spotlight strong {
  display: block;
  font-size: 14px;
  font-weight: 900;
}

.deal-stage-spotlight p {
  margin: 8px 0 0;
  color: var(--web-muted);
  font-size: 12px;
  line-height: 1.9;
}

.deal-summary-grid,
.deal-validation-grid,
.deal-documents-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.deal-summary-list {
  display: grid;
  gap: 10px;
}

.deal-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--web-border);
  background: color-mix(in srgb, var(--web-surface) 78%, transparent);
}

.deal-validation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.deal-validation-note {
  padding: 14px 16px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--web-surface) 78%, transparent);
  border: 1px solid var(--web-border);
}

.deal-document-item {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--web-border);
  background: color-mix(in srgb, var(--web-surface) 74%, transparent);
}

.deal-document-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.deal-document-head strong {
  font-size: 14px;
  font-weight: 900;
}

.deal-document-type-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.document-type-chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  color: var(--web-text);
  font-size: 10px;
  font-weight: 900;
}

.required-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  font-size: 10px;
  font-weight: 900;
}

.document-limit-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.document-limit-list span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.1);
  color: var(--web-muted);
  font-size: 10px;
  font-weight: 800;
}

.upload-field-shell {
  display: grid;
  gap: 10px;
}

.upload-field-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  border: 1px dashed var(--web-border-strong);
  background: color-mix(in srgb, var(--web-surface) 82%, transparent);
}

.upload-field-copy {
  display: grid;
  gap: 4px;
}

.upload-field-kicker {
  color: var(--web-muted);
  font-size: 10px;
  font-weight: 900;
}

.upload-field-copy strong {
  font-size: 12px;
  font-weight: 900;
  word-break: break-word;
}

.upload-field-copy span {
  color: var(--web-muted);
  font-size: 11px;
}

.uploaded-file-row a,
.upload-field-button,
.upload-field-clear,
.customer-inline-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 14px;
  font-size: 11px;
  font-weight: 800;
}

.upload-field-button,
.customer-inline-link {
  background: rgba(211, 90, 90, 0.1);
  color: var(--web-primary);
}

.upload-field-button {
  gap: 8px;
}

.upload-field-clear {
  border: 1px solid var(--web-border);
  background: transparent;
  color: var(--web-muted);
}

.document-file-input {
  display: none;
}

.uploaded-file-row a {
  color: var(--web-primary);
  font-size: 12px;
  font-weight: 800;
}

.deal-input {
  min-height: 48px;
  border-radius: 16px;
}

.deal-readonly-value {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.deal-empty-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--web-muted);
  font-size: 11px;
  font-weight: 800;
}

.deal-checklist {
  margin: 0;
  padding: 0 18px 0 0;
  display: grid;
  gap: 10px;
}

.deal-success-card {
  text-align: center;
}

.deal-success-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34, 160, 107, 0.12);
  color: #15803d;
  font-size: 30px;
}

[data-theme='dark'] .deal-selection-box,
[data-theme='dark'] .deal-card,
[data-theme='dark'] .deal-metric-card,
[data-theme='dark'] .deal-summary-card,
[data-theme='dark'] .deal-side-fact,
[data-theme='dark'] .deal-summary-row,
[data-theme='dark'] .deal-validation-note,
[data-theme='dark'] .deal-document-item,
[data-theme='dark'] .upload-field-main,
[data-theme='dark'] .result-history-item,
[data-theme='dark'] .customer-secondary-btn,
[data-theme='dark'] .customer-hero-link.muted {
  background: var(--web-surface-soft);
}

[data-theme='dark'] .deal-progress-shell {
  background: linear-gradient(180deg, rgba(255, 106, 99, 0.18), rgba(255, 106, 99, 0.06));
}

.link-btn {
  text-decoration: none;
}

@media (max-width: 1180px) {
  .deal-hero-card,
  .deal-content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 991px) {
  .deal-summary-grid,
  .deal-documents-grid {
    grid-template-columns: 1fr;
  }

  .deal-card-head,
  .deal-hero-head,
  .deal-hero-tools,
  .deal-summary-row,
  .upload-field-main,
  .deal-inline-warning {
    flex-direction: column;
    align-items: flex-start;
  }

  .deal-hero-tools,
  .result-history-dropup,
  .result-history-button {
    width: 100%;
  }

  .result-history-panel {
    inset: calc(100% + 12px) 0 auto 0;
    width: 100%;
  }

  .deal-progress-shell > strong {
    font-size: 32px;
  }

  .deal-step strong {
    font-size: 9px;
    max-width: 56px;
  }
}

@media (max-width: 640px) {
  .deal-card {
    padding: 18px;
    border-radius: 22px;
  }

  .customer-loading-card {
    padding: 34px 18px;
  }

  .deal-feedback {
    padding: 14px 16px;
  }

  .customer-primary-btn,
  .customer-secondary-btn,
  .customer-hero-link,
  .upload-field-button,
  .upload-field-clear,
  .customer-inline-link {
    width: 100%;
  }

  .deal-action-row {
    display: grid;
  }

  .deal-readonly-value {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>