<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import CustomerDealContractStage from '../components/CustomerDealContractStage.vue';
import CustomerDealPaymentStage from '../components/CustomerDealPaymentStage.vue';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
import DealChatModal from '../components/DealChatModal.vue';
import OtpCodeInput from '../components/OtpCodeInput.vue';
import PersianDatePickerInput from '../components/PersianDatePickerInput.vue';
import { useAppToast } from '../composables/useToast.js';
import { getWebFacilityBySlug } from '../services/web-loan.api.js';
import {
  confirmCustomerDealTransfer,
  createCustomerDeal,
  getCustomerDeal,
  getDealMessages,
  getDealUnreadCount,
  rateBrokerForDeal,
  requestCustomerDealAdminReview,
  requestCustomerDealTransferOtp,
  saveCustomerDealDocuments,
  sendDealMessage,
  verifyDealCashPayment
} from '../services/customer-panel.api.js';
import { truncateWords } from '../utils/str.js';

const route = useRoute();
const router = useRouter();
const toast = useAppToast();

const loading = ref(true);
const savingDraft = ref(false);
const submittingDocuments = ref(false);
const creatingDeal = ref(false);
const downloadingContract = ref(false);
const requestingAdminReview = ref(false);
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
const documentErrors = ref({});
const adminReviewReason = ref('');
const existingDealLink = ref('');
const chatOpen = ref(false);
const chatUnreadCount = ref(0);
let unreadPollTimer = null;
const resultHistoryOpen = ref(false);
const activeStageTab = ref('submit');
const transferOtpOpen = ref(false);
const transferOtpCode = ref('');
const transferOtpBusy = ref(false);
const transferOtpResendIn = ref(0);
let transferOtpTimerId = null;
const ratingScore = ref(0);
const ratingHover = ref(0);
const ratingComment = ref('');
const submittingRating = ref(false);
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

const clearPaymentReturnQuery = async () => {
  const nextQuery = { ...route.query };
  delete nextQuery.cashVerify;
  delete nextQuery.Authority;
  delete nextQuery.Status;
  delete nextQuery.paymentTypeId;

  if (
    nextQuery.cashVerify !== route.query.cashVerify ||
    nextQuery.Authority !== route.query.Authority ||
    nextQuery.Status !== route.query.Status ||
    nextQuery.paymentTypeId !== route.query.paymentTypeId
  ) {
    await router.replace({ path: route.path, query: nextQuery });
  }
};

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
  documentErrors.value = {};
};

const setErrorFeedback = (message, details = []) => {
  successText.value = '';
  successDetails.value = [];
  errorText.value = message || 'امکان انجام این عملیات وجود ندارد';
  errorDetails.value = normalizeMessages(details).filter((entry) => entry !== errorText.value);
  toast.error(errorText.value);
};

const setSuccessFeedback = (message, details = []) => {
  errorText.value = '';
  errorDetails.value = [];
  successText.value = message || 'عملیات با موفقیت انجام شد';
  successDetails.value = normalizeMessages(details).filter((entry) => entry !== successText.value);
  toast.success(successText.value);
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

const isNonBankingDeal = computed(() => {
  const rawType = deal.value?.type || deal.value?.facilityData?.type || deal.value?.facility?.type || displayFacility.value?.type;
  return String(rawType || '').toLowerCase() === 'none_banking';
});

const transferStageTitle = computed(() => (isNonBankingDeal.value ? 'انتقال وام' : 'انتقال امتیاز'));

const wizardSteps = computed(() => {
  if (Array.isArray(deal.value?.wizardSteps) && deal.value.wizardSteps.length) {
    return deal.value.wizardSteps.map((item) => (
      item.key === 'transfer'
        ? { ...item, title: transferStageTitle.value }
        : item
    ));
  }

  const definitions = [
    { key: 'base', title: 'اطلاعات پایه معامله', description: 'اطلاعات اصلی پرونده، طرفین و خلاصه مالی معامله.', state: 'available', level: 0 },
    { key: 'submit', title: 'ثبت و تکمیل مدارک', description: 'اطلاعات پرونده و مدارک اولیه توسط شما آماده می‌شود.' },
    { key: 'verify_broker', title: 'بررسی کارگزار', description: 'کارگزار مدارک و اطلاعات ثبت‌شده را بررسی می‌کند.' },
    { key: 'contract', title: 'قرارداد', description: 'جزییات قراردادی و تاییدهای لازم ثبت می‌شود.' },
    { key: 'payment', title: 'پرداخت', description: 'پرداخت‌های مرتبط با پرونده در این مرحله ثبت می‌شود.' },
    { key: 'transfer', title: transferStageTitle.value, description: `${transferStageTitle.value} و هماهنگی اجرایی توسط کارگزار انجام می‌شود.` },
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
    { label: 'وضعیت فعلی', value: 'آماده ایجاد معامله' }
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
      'پس از ایجاد معامله، صفحه تکمیل مدارک نمایش داده می‌شود.',
      'ادامه وضعیت و پیگیری پرونده از همین صفحه انجام می‌شود.'
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
const transferAttachments = computed(() => (Array.isArray(deal.value?.transferData?.attachments) ? deal.value.transferData.attachments : []));
const shellStats = computed(() => [
  { label: 'مبلغ انتخابی', value: `${formatNumber(requestedAmount.value || deal.value?.amount || 0)} تومان` },
  { label: 'اقساط', value: `${formatNumber(installmentMonths.value || deal.value?.installments || 0)} ماه` },
  { label: 'سود', value: `${formatNumber(interestRate.value || deal.value?.profit || 0)}%` },
  {
    label: 'مدارک',
    value: `${formatNumber(deal.value?.completedDocuments || countCompletedDocuments(currentDocuments.value))} / ${formatNumber(deal.value?.documentsCount || currentDocuments.value.length)}`
  }
]);
const adminReviewInfo = computed(() => deal.value?.adminReviewData || null);
const hasAdminReviewRecord = computed(() => Boolean(deal.value?.adminReviewMode || adminReviewInfo.value?.reason));
const adminReviewHeadline = computed(() => (deal.value?.adminReviewMode ? 'پرونده در حال بررسی مدیریت است' : 'آخرین ثبت بررسی مدیریت'));
const adminReviewSummary = computed(() => {
  if (!adminReviewInfo.value) {
    return '';
  }

  return deal.value?.adminReviewMode
    ? 'تا پایان بررسی، اقدام جدیدی از سمت شما یا کارگزار روی این پرونده انجام نمی‌شود.'
    : 'این توضیح آخرین دلیل ثبت‌شده برای ارجاع پرونده به مدیریت است.';
});

const canCreateDeal = computed(() => !isExistingDeal.value && displayFacility.value);
const canEditDocuments = computed(() => deal.value?.canSubmitDocuments);
const isSentToBroker = computed(() => deal.value?.step === 'verify_broker' && deal.value?.status === 'in_progress');
const canShowEditableDocuments = computed(() => currentDocuments.value.length && (!deal.value || canEditDocuments.value));
const canCreateDraft = computed(() => canCreateDeal.value && hasDocuments.value);
const canCreateAndSubmit = computed(() => canCreateDeal.value);

const getHistoryActionLabel = (entry) => historyActionLabels[entry?.action] || 'بروزرسانی';
const getHistoryActorLabel = (entry) => entry?.actorName || historyActorLabels[entry?.actorType] || 'سیستم';

const handleContractUpdate = async (item) => {
  deal.value = item;
  activeStageTab.value = item?.step || activeStageTab.value;
  syncFieldsFromDocuments(item?.documents || []);
  selectedFiles.value = {};
  if (isExistingDeal.value) {
    await loadDeal();
  }
  dispatchDealUpdate();
};

const handlePaymentUpdate = (item) => {
  if (!item) return;
  deal.value = item;
  activeStageTab.value = item.step || activeStageTab.value;
  dispatchDealUpdate();
};

const createPdfExportNode = () => {
  const html = deal.value?.contractData || '';
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.right = '0';
  wrapper.style.bottom = '0';
  wrapper.style.width = '1024px';
  wrapper.style.opacity = '0.01';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.zIndex = '-1';
  wrapper.setAttribute('aria-hidden', 'true');

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll('style').forEach((style) => {
    const clonedStyle = document.createElement('style');
    clonedStyle.textContent = style.textContent;
    wrapper.appendChild(clonedStyle);
  });

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = doc.body?.innerHTML || html;
  wrapper.appendChild(bodyDiv);
  document.body.appendChild(wrapper);
  return { wrapper, exportNode: bodyDiv.querySelector('.deal-contract-wrap') || bodyDiv };
};

const waitForPdfImages = async (container) => {
  const images = Array.from(container.querySelectorAll('img') || []);
  await Promise.all(images.map((image) => new Promise((resolve) => {
    if (image.complete) {
      resolve();
      return;
    }

    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
  })));
};

const downloadContractPdf = async () => {
  if (!deal.value?.contractData || downloadingContract.value) {
    return;
  }

  downloadingContract.value = true;
  let container = null;

  try {
    const module = await import('html2pdf.js');
    const html2pdf = module.default || module;
    const { wrapper, exportNode } = createPdfExportNode();
    container = wrapper;
    await waitForPdfImages(wrapper);

    await html2pdf()
      .set({
        margin: [0, 0, 0, 0],
        filename: `deal-contract-${deal.value.id}.pdf`,
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      })
      .from(exportNode)
      .save();

    setSuccessFeedback('فایل قرارداد با موفقیت دانلود شد');
  } catch (error) {
    setErrorFeedback(error?.message || 'دانلود فایل قرارداد با خطا مواجه شد');
  } finally {
    container?.remove();
    downloadingContract.value = false;
  }
};

const stopTransferOtpTimer = () => {
  if (transferOtpTimerId) { clearInterval(transferOtpTimerId); transferOtpTimerId = null; }
};

const startTransferOtpTimer = (seconds) => {
  stopTransferOtpTimer();
  transferOtpResendIn.value = Number(seconds || 0);
  if (transferOtpResendIn.value <= 0) return;
  transferOtpTimerId = setInterval(() => {
    transferOtpResendIn.value -= 1;
    if (transferOtpResendIn.value <= 0) stopTransferOtpTimer();
  }, 1000);
};

const requestTransferOtp = async () => {
  if (!deal.value?.id) return;
  transferOtpBusy.value = true;
  clearFeedback();
  try {
    const data = await requestCustomerDealTransferOtp(deal.value.id);
    transferOtpOpen.value = true;
    startTransferOtpTimer(data.resendIn);
  } catch (error) {
    if (error.status === 409) {
      transferOtpOpen.value = true;
      startTransferOtpTimer(error.data?.resendIn || 0);
    } else {
      setErrorFeedback(error.message, extractErrorDetails(error));
    }
  } finally {
    transferOtpBusy.value = false;
  }
};

const handleTransferConfirmation = async () => {
  if (!deal.value?.id) return;

  const { isConfirmed } = await Swal.fire({ title: `تایید ${transferStageTitle.value}`, text: `ابتدا کد تایید پیامکی دریافت و سپس ${transferStageTitle.value} را نهایی کنید.`, icon: 'question', confirmButtonText: 'دریافت کد تایید', cancelButtonText: 'انصراف', showCancelButton: true, reverseButtons: true });
  if (!isConfirmed) return;

  await requestTransferOtp();
};

const submitTransferOtp = async () => {
  if (transferOtpCode.value.trim().length !== 4) {
    setErrorFeedback('کد تایید باید ۴ رقم باشد');
    return;
  }

  transferOtpBusy.value = true;
  clearFeedback();

  try {
    const data = await confirmCustomerDealTransfer(deal.value.id, { code: transferOtpCode.value.trim() });
    deal.value = data.item || deal.value;
    activeStageTab.value = data.item?.step || 'finished';
    transferOtpOpen.value = false;
    transferOtpCode.value = '';
    stopTransferOtpTimer();
    dispatchDealUpdate();
    setSuccessFeedback(data.message || `${transferStageTitle.value} تایید شد`, ['پرونده با موفقیت نهایی شد و در وضعیت انجام شده قرار گرفت.']);
    await load();
  } catch (error) {
    setErrorFeedback(error.message, extractErrorDetails(error));
  } finally {
    transferOtpBusy.value = false;
  }
};

const handleSubmitRating = async () => {
  if (!deal.value?.id || submittingRating.value || !ratingScore.value) {
    return;
  }

  clearFeedback();
  submittingRating.value = true;

  try {
    const data = await rateBrokerForDeal(deal.value.id, {
      score: ratingScore.value,
      comment: ratingComment.value.trim() || undefined
    });
    deal.value.hasRated = true;
    deal.value.canRate = false;
    setSuccessFeedback(data.message || 'امتیاز شما ثبت شد');
  } catch (error) {
    setErrorFeedback(error.message, extractErrorDetails(error));
  } finally {
    submittingRating.value = false;
  }
};

const handleRequestAdminReview = async () => {
  if (!deal.value?.id || requestingAdminReview.value || !deal.value?.canCustomerRequestAdminReview) {
    return;
  }

  const reason = adminReviewReason.value.trim();
  if (reason.length < 5) {
    setErrorFeedback('برای گزارش به مدیریت باید دلیل خود را کامل وارد کنید');
    return;
  }

  clearFeedback();
  requestingAdminReview.value = true;
  try {
    const data = await requestCustomerDealAdminReview(deal.value.id, { reason });
    deal.value = data.item || deal.value;
    activeStageTab.value = data.item?.step || activeStageTab.value;
    adminReviewReason.value = '';
    dispatchDealUpdate();
    setSuccessFeedback(data.message || 'پرونده برای بررسی مدیریت ثبت شد', ['تا پایان این بررسی، امکان اقدام جدید روی پرونده موقتاً متوقف می‌شود.']);
    await load();
  } catch (error) {
    setErrorFeedback(error.message, extractErrorDetails(error));
  } finally {
    requestingAdminReview.value = false;
  }
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
  adminReviewReason.value = '';
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
        } finally {
          await clearPaymentReturnQuery();
        }
      } else {
        await clearPaymentReturnQuery();
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

  const perFieldErrors = {};

  for (const document of currentDocuments.value) {
    const key = fieldKeyOf(document.id);

    if (document.type === 'file') {
      const file = getSelectedFile(document.id);
      const existingValue = document.value?.url || document.value?.fileId || document.value;

      if (requireComplete && document.required && !file && !existingValue) {
        const msg = `مدرک «${document.title}» الزامی است`;
        messages.push(msg);
        perFieldErrors[key] = 'این فیلد الزامی است';
      }

      if (file && document.max) {
        const maxBytes = Number(document.max || 0) * 1024;
        if (maxBytes > 0 && file.size > maxBytes) {
          const msg = `حجم فایل «${document.title}» نباید بیشتر از ${formatFileSize(maxBytes)} باشد`;
          messages.push(msg);
          perFieldErrors[key] = `حجم فایل نباید بیشتر از ${formatFileSize(maxBytes)} باشد`;
        }
      }

      continue;
    }

    const value = fieldValues.value[key] ?? '';
    if (requireComplete && document.required && !String(value).trim()) {
      const msg = `فیلد «${document.title}» الزامی است`;
      messages.push(msg);
      perFieldErrors[key] = 'این فیلد الزامی است';
    }

    if (document.max) {
      const normalized = document.type === 'number' ? String(value).replace(/\D/g, '') : String(value).trim();
      if (normalized.length > Number(document.max || 0)) {
        const msg = `طول «${document.title}» نباید بیشتر از ${formatNumber(document.max)} ${document.type === 'number' ? 'رقم' : 'کاراکتر'} باشد`;
        messages.push(msg);
        perFieldErrors[key] = `حداکثر ${formatNumber(document.max)} ${document.type === 'number' ? 'رقم' : 'کاراکتر'}`;
      }
    }
  }

  documentErrors.value = perFieldErrors;
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

const createDealRequest = async () => {
  if (!displayFacility.value || creatingDeal.value) {
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

    dispatchDealUpdate();
    await router.replace(`/customer/deals/${created.item.id}`);
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

  if (submit) {
    const { isConfirmed } = await Swal.fire({ title: 'ارسال مدارک', text: 'مدارک فعلی برای بررسی کارگزار ارسال شود؟', icon: 'question', confirmButtonText: 'بله، ارسال', cancelButtonText: 'انصراف', showCancelButton: true, reverseButtons: true });
    if (!isConfirmed) {
      return;
    }
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

const fetchUnreadCount = async () => {
  if (!deal.value?.id) return;
  try {
    const data = await getDealUnreadCount(deal.value.id);
    chatUnreadCount.value = data.unreadCount || 0;
  } catch { /* silent */ }
};

const startUnreadPoll = () => {
  stopUnreadPoll();
  fetchUnreadCount();
  unreadPollTimer = setInterval(fetchUnreadCount, 30000);
};

const stopUnreadPoll = () => {
  if (unreadPollTimer) {
    clearInterval(unreadPollTimer);
    unreadPollTimer = null;
  }
};

watch(() => deal.value?.id, (id) => {
  if (id) startUnreadPoll();
  else stopUnreadPoll();
});

watch(chatOpen, (open) => {
  if (!open) fetchUnreadCount();
});

onMounted(load);
onUnmounted(stopUnreadPoll);
onUnmounted(stopTransferOtpTimer);
</script>

<template>
  <section class="customer-deal-start-view">
    <CustomerPanelShell
      kicker="شروع معامله"
      :title="isExistingDeal ? 'جزئیات معامله امتیاز وام' : 'شروع معامله امتیاز وام'"
    >
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

        <article v-if="deal && hasAdminReviewRecord && deal.adminReviewMode" class="deal-admin-review-banner" :class="{ active: deal.adminReviewMode }">
          <div class="deal-admin-review-banner-head">
            <div class="deal-admin-review-icon">
              <i :class="deal.adminReviewMode ? 'fa-solid fa-shield-halved' : 'fa-solid fa-clock-rotate-left'"></i>
            </div>
            <div>
              <strong>{{ adminReviewHeadline }}</strong>
              <p>{{ adminReviewSummary }}</p>
            </div>
          </div>

          <div class="deal-admin-review-grid">
            <article class="deal-admin-review-card">
              <span>دلیل ثبت‌شده</span>
              <strong>{{ adminReviewInfo?.reason || 'ثبت نشده' }}</strong>
            </article>
            <article class="deal-admin-review-card">
              <span>درخواست‌دهنده</span>
              <strong>{{ adminReviewInfo?.requestedByLabel || '-' }}</strong>
            </article>
            <article class="deal-admin-review-card">
              <span>زمان ثبت</span>
              <strong>{{ adminReviewInfo?.requestedAtLabel || '-' }}</strong>
            </article>
          </div>
        </article>

        <section class="deal-card deal-hero-card">
          <div class="deal-hero-main">
            <div class="deal-card-head deal-hero-head">
              <div>
                <span class="deal-kicker">{{ deal?.dealCode || (deal ? 'پرونده فعال شما' : 'شروع پرونده جدید') }}</span>
                <h2>{{ deal?.facility?.title || displayFacility?.title || 'معامله امتیاز وام' }}</h2>
                <p>
                  {{
                    deal
                      ? dealProgressSummary
                      : 'مبلغ، اقساط و نرخ سود را نهایی کنید و معامله را ایجاد کنید. پس از ایجاد معامله، صفحه تکمیل مدارک نمایش داده می‌شود.'
                  }}
                </p>
              </div>

              <div class="deal-hero-tools">
                <span v-if="deal" class="deal-status-chip" :class="`status-${deal.status}`">{{ deal.statusLabel }}</span>

                <button v-if="deal?.id" class="deal-chat-fab" title="گفتگوی معامله" @click="chatOpen = true">
                  <i class="fa-solid fa-comments me-1"></i>
                  گفتگو
                  <span v-if="chatUnreadCount" class="deal-chat-badge">{{ chatUnreadCount }}</span>
                </button>

                <div v-if="deal" class="result-history-dropup">
                  <button type="button" class="result-history-button" :disabled="!canShowResultHistory" @click="resultHistoryOpen = !resultHistoryOpen">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    {{ resultHistoryOpen ? 'بستن تاریخچه' : 'تاریخچه نتیجه‌ها' }}
                    <span v-if="canShowResultHistory" class="result-history-badge">{{ formatNumber(resultHistoryEntries.length) }}</span>
                  </button>

                  <transition name="dropup-fade">
                    <div v-if="resultHistoryOpen && canShowResultHistory" class="result-history-panel">
                      <div v-for="entry in resultHistoryEntries" :key="entry.id" class="result-history-item">
                        <div class="result-history-dot"></div>
                        <div>
                          <div class="result-history-title">{{ getHistoryActionLabel(entry) }} توسط {{ getHistoryActorLabel(entry) }}</div>
                          <div class="result-history-date">{{ formatJalaliDate(entry.createdAt, { withTime: true }) }}</div>
                          <p v-if="entry.reason" class="result-history-text">{{ entry.reason }}</p>
                          <p v-if="entry.note && entry.note !== entry.reason" class="result-history-text">یادداشت: {{ entry.note }}</p>
                          <p v-if="entry.message && entry.message !== entry.reason && entry.message !== entry.note" class="result-history-text">{{ entry.message }}</p>
                        </div>
                      </div>
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
              <button class="customer-primary-btn" :disabled="creatingDeal" @click="createDealRequest()">
                {{ creatingDeal ? 'در حال ایجاد...' : 'ایجاد معامله' }}
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

              <div v-if="deal && canShowResultHistory" class="deal-history-dropup-wrap">
                <button type="button" class="deal-history-dropup-toggle" @click="resultHistoryOpen = !resultHistoryOpen">
                  <i class="fa-solid fa-clock-rotate-left"></i>
                  {{ resultHistoryOpen ? 'بستن تاریخچه' : 'تاریخچه نتیجه‌ها' }}
                  <span class="deal-history-dropup-badge">{{ formatNumber(resultHistoryEntries.length) }}</span>
                </button>

                <transition name="dropup-fade">
                  <div v-if="resultHistoryOpen" class="deal-history-dropup-panel">
                    <div v-for="entry in resultHistoryEntries" :key="entry.id" class="result-history-item">
                      <div class="result-history-dot"></div>
                      <div>
                        <div class="result-history-title">{{ getHistoryActionLabel(entry) }} توسط {{ getHistoryActorLabel(entry) }}</div>
                        <div class="result-history-date">{{ formatJalaliDate(entry.createdAt, { withTime: true }) }}</div>
                        <p v-if="entry.reason" class="result-history-text">{{ entry.reason }}</p>
                        <p v-if="entry.note && entry.note !== entry.reason" class="result-history-text">یادداشت: {{ entry.note }}</p>
                        <p v-if="entry.message && entry.message !== entry.reason && entry.message !== entry.note" class="result-history-text">{{ entry.message }}</p>
                      </div>
                    </div>
                  </div>
                </transition>
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

            <section v-if="activeStageTab === 'submit' && canShowEditableDocuments && isExistingDeal" class="deal-card">
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
                        <a :href="document.value.downloadUrl || document.value.url" download rel="noreferrer">{{ document.value.fileName || 'فایل فعلی' }}</a>
                      </div>
                      <button v-if="getSelectedFile(document.id)" type="button" class="upload-field-clear" @click="clearSelectedFile(document.id)">حذف فایل انتخاب‌شده</button>
                    </div>
                    <div v-if="documentErrors[fieldKeyOf(document.id)]" class="deal-field-error"><i class="fa-solid fa-circle-exclamation"></i> {{ documentErrors[fieldKeyOf(document.id)] }}</div>
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
                    :class="{ 'deal-input-error': documentErrors[fieldKeyOf(document.id)] }"
                    :inputmode="document.type === 'number' ? 'numeric' : undefined"
                    :maxlength="document.type === 'text' && document.max ? Number(document.max) : undefined"
                    :value="fieldValues[fieldKeyOf(document.id)] ?? ''"
                    @input="updateFieldValue(document.id, $event.target.value)"
                  />

                  <div v-if="document.type !== 'file' && documentErrors[fieldKeyOf(document.id)]" class="deal-field-error"><i class="fa-solid fa-circle-exclamation"></i> {{ documentErrors[fieldKeyOf(document.id)] }}</div>
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
                    <a v-if="document.type === 'file' && document.value?.url" class="customer-inline-link" :href="document.value.downloadUrl || document.value.url" download rel="noreferrer">
                      {{ truncateWords(document.value.fileName || 'مشاهده فایل ثبت‌شده') }}
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

            <section v-if="deal && activeStageTab === 'transfer'" class="deal-card deal-wait-stage">
              <div class="deal-wait-icon"><i class="fa-solid fa-hourglass-half"></i></div>
              <div class="deal-wait-copy">
                <span class="deal-wait-badge">در انتظار اقدام کارگزار</span>
                <h3>در انتظار ثبت اطلاعات {{ transferStageTitle }} توسط کارگزار</h3>
                <p>کارگزار باید در این مرحله توضیحات {{ transferStageTitle }} و فایل‌های مرتبط را ثبت کند. پس از تکمیل این بخش، جزئیات از همین صفحه نمایش داده می‌شود.</p>
                <div class="deal-wait-meta">
                  <span>وضعیت پرونده: {{ deal.statusLabel || '-' }}</span>
                  <span>مرحله فعلی: {{ deal.stepLabel || '-' }}</span>
                </div>
              </div>
            </section>

            <section v-if="deal && activeStageTab === 'verify_customer' && deal.transferData" class="deal-card">
              <div class="deal-card-head">
                <div>
                  <h3>تایید {{ transferStageTitle }}</h3>
                  <p>قرارداد و پیوست‌های مرحله {{ transferStageTitle }} را مرور کنید و در صورت صحت، انتقال را تایید نهایی کنید.</p>
                </div>
              </div>

              <div class="deal-transfer-summary">
                <p>{{ deal.transferData.description }}</p>
                <div class="deal-summary-grid compact-grid">
                  <article class="deal-summary-card">
                    <span>ثبت‌کننده</span>
                    <strong>{{ deal.transferData.submittedBy?.name || 'کارگزار' }}</strong>
                  </article>
                  <article class="deal-summary-card">
                    <span>زمان ثبت</span>
                    <strong>{{ deal.transferData.submittedAtLabel || '-' }}</strong>
                  </article>
                </div>
              </div>

              <div class="deal-transfer-files deal-transfer-files-stack">
                <button v-if="deal.contractData" type="button" class="deal-transfer-file deal-transfer-asset contract-download-btn" :disabled="downloadingContract" @click="downloadContractPdf">
                  <span class="deal-transfer-asset-icon contract">
                    <i class="fa-solid fa-file-contract"></i>
                  </span>
                  <span class="deal-transfer-asset-copy">
                    <strong>قرارداد نهایی معامله</strong>
                    <span>{{ downloadingContract ? 'در حال آماده‌سازی فایل PDF...' : 'دانلود نسخه PDF قرارداد برای مرور نهایی' }}</span>
                  </span>
                  <span class="deal-transfer-asset-meta">
                    <i class="fa-solid fa-download"></i>
                  </span>
                </button>

                <a
                  v-for="file in transferAttachments"
                  :key="file.fileId"
                  class="deal-transfer-file deal-transfer-asset"
                  :href="file.downloadUrl || file.url"
                  download
                  rel="noreferrer"
                >
                  <span class="deal-transfer-asset-icon attachment">
                    <i class="fa-solid fa-paperclip"></i>
                  </span>
                  <span class="deal-transfer-asset-copy">
                    <strong>{{ file.title || file.fileName }}</strong>
                    <span>{{ file.fileName || 'فایل پیوست انتقال' }}</span>
                  </span>
                  <span class="deal-transfer-asset-meta">{{ formatNumber(Math.round((file.size || 0) / 1024)) }} کیلوبایت</span>
                </a>
              </div>

              <div v-if="deal.canCustomerRequestAdminReview" class="deal-admin-review-request mt-3">
                <div class="deal-card-head compact">
                  <div>
                    <h3>گزارش به مدیریت</h3>
                    <p>اگر در قرارداد، توضیحات انتقال یا پیوست‌ها مغایرتی می‌بینید، دلیل خود را ثبت کنید تا پرونده به بررسی مدیریت برود.</p>
                  </div>
                </div>

                <label class="form-label">علت گزارش <span class="text-danger">*</span></label>
                <textarea
                  v-model="adminReviewReason"
                  class="form-control"
                  rows="4"
                  required
                  placeholder="دلیل خود را دقیق بنویسید؛ این متن برای ادمین، کارگزار و خود شما قابل مشاهده خواهد بود"
                ></textarea>

                <div class="deal-action-row mt-3 deal-review-actions">
                  <button class="customer-secondary-btn" :disabled="requestingAdminReview" @click="handleRequestAdminReview">
                    {{ requestingAdminReview ? 'در حال ثبت...' : 'ارسال برای بررسی مدیریت' }}
                  </button>
                  <span class="deal-inline-hint">پس از ثبت، اقدام بعدی روی پرونده تا پایان بررسی متوقف می‌شود.</span>
                </div>
              </div>

              <div v-if="deal.canCustomerConfirmTransfer" class="deal-action-row mt-3">
                <button class="customer-primary-btn" @click="handleTransferConfirmation">تایید {{ transferStageTitle }}</button>
              </div>

              <div v-else-if="deal.adminReviewMode" class="deal-validation-note mt-3">
                این پرونده در حال بررسی مدیریت است و دکمه تایید نهایی تا پایان این بررسی غیرفعال شده است.
              </div>

              <div class="deal-validation-note">اگر در اطلاعات ثبت‌شده مغایرتی می‌بینید، پیش از تایید نهایی از بخش پشتیبانی پیگیری کنید.</div>
            </section>

            <section v-if="deal && activeStageTab === 'verify_broker'" class="deal-card">
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

            <section v-if="deal && activeStageTab === 'finished'" class="deal-card deal-finished-card">
              <div class="deal-card-head">
                <div>
                  <h3><i class="fa-solid fa-circle-check text-success me-2"></i>معامله نهایی شد</h3>
                  <p>تمامی مراحل پرونده با موفقیت طی شده و معامله بسته شده است. خلاصه اطلاعات و اسناد را در ادامه مشاهده کنید.</p>
                </div>
              </div>

              <div class="deal-summary-grid compact-grid">
                <article class="deal-summary-card">
                  <span>کد معامله</span>
                  <strong>{{ deal.dealCode || '-' }}</strong>
                </article>
                <article class="deal-summary-card">
                  <span>عنوان وام</span>
                  <strong>{{ deal.facility?.title || '-' }}</strong>
                </article>
                <article class="deal-summary-card">
                  <span>مبلغ</span>
                  <strong>{{ formatMoney(deal.amount || 0) }}</strong>
                </article>
                <article class="deal-summary-card">
                  <span>اقساط</span>
                  <strong>{{ formatNumber(deal.installments || 0) }} ماه</strong>
                </article>
                <article class="deal-summary-card">
                  <span>نرخ سود</span>
                  <strong>{{ formatNumber(deal.profit || 0) }} درصد</strong>
                </article>
                <article class="deal-summary-card">
                  <span>وضعیت</span>
                  <strong>{{ deal.statusLabel || 'انجام شده' }}</strong>
                </article>
              </div>

              <div v-if="deal.contractData || transferAttachments.length" class="deal-finished-files">
                <h4>اسناد معامله</h4>
                <div class="deal-transfer-files deal-transfer-files-stack">
                  <button v-if="deal.contractData" type="button" class="deal-transfer-file deal-transfer-asset contract-download-btn" :disabled="downloadingContract" @click="downloadContractPdf">
                    <span class="deal-transfer-asset-icon contract">
                      <i class="fa-solid fa-file-contract"></i>
                    </span>
                    <span class="deal-transfer-asset-copy">
                      <strong>قرارداد نهایی معامله</strong>
                      <span>{{ downloadingContract ? 'در حال آماده‌سازی فایل PDF...' : 'دانلود نسخه PDF قرارداد' }}</span>
                    </span>
                    <span class="deal-transfer-asset-meta">
                      <i class="fa-solid fa-download"></i>
                    </span>
                  </button>

                  <a
                    v-for="file in transferAttachments"
                    :key="file.fileId"
                    class="deal-transfer-file deal-transfer-asset"
                    :href="file.downloadUrl || file.url"
                    download
                    rel="noreferrer"
                  >
                    <span class="deal-transfer-asset-icon attachment">
                      <i class="fa-solid fa-paperclip"></i>
                    </span>
                    <span class="deal-transfer-asset-copy">
                      <strong>{{ file.title || file.fileName }}</strong>
                      <span>{{ file.fileName || 'فایل پیوست' }}</span>
                    </span>
                    <span class="deal-transfer-asset-meta">{{ formatNumber(Math.round((file.size || 0) / 1024)) }} KB</span>
                  </a>
                </div>
              </div>

              <div v-if="deal.transferData?.description" class="deal-validation-note">
                <strong>توضیحات انتقال:</strong> {{ deal.transferData.description }}
              </div>

              <div v-if="deal.canRate" class="deal-rating-section">
                <h4><i class="fa-solid fa-star me-1"></i>امتیازدهی به کارگزار</h4>
                <p class="deal-rating-desc">عملکرد کارگزار خود را در این معامله ارزیابی کنید. امتیاز شما تنها یک بار قابل ثبت است.</p>
                <div class="deal-rating-stars">
                  <button
                    v-for="star in 5"
                    :key="star"
                    type="button"
                    class="deal-rating-star"
                    :class="{ active: star <= (ratingHover || ratingScore), hovered: ratingHover && star <= ratingHover }"
                    @mouseenter="ratingHover = star"
                    @mouseleave="ratingHover = 0"
                    @click="ratingScore = star"
                  >
                    <i :class="star <= (ratingHover || ratingScore) ? 'fa-solid fa-star' : 'fa-regular fa-star'"></i>
                  </button>
                  <span v-if="ratingScore" class="deal-rating-value">{{ ratingScore }} از ۵</span>
                </div>
                <textarea
                  v-model="ratingComment"
                  class="form-control mt-2"
                  rows="2"
                  maxlength="1000"
                  placeholder="نظر شما (اختیاری)"
                ></textarea>
                <button
                  type="button"
                  class="btn btn-success mt-2"
                  :disabled="!ratingScore || submittingRating"
                  @click="handleSubmitRating"
                >
                  {{ submittingRating ? 'در حال ثبت...' : 'ثبت امتیاز' }}
                </button>
              </div>
              <div v-else-if="deal.hasRated" class="deal-rating-done">
                <i class="fa-solid fa-circle-check text-success me-1"></i>
                <span>امتیاز شما قبلاً ثبت شده است. با تشکر از مشارکت شما.</span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </CustomerPanelShell>

    <Teleport to="body">
      <Transition name="route-float">
        <div v-if="transferOtpOpen" class="transfer-otp-overlay" @click.self="transferOtpOpen = false">
          <div class="transfer-otp-modal">
            <div class="transfer-otp-head">
              <div>
                <span class="transfer-otp-kicker">تایید OTP</span>
                <h4>کد تایید {{ transferStageTitle }} را وارد کنید</h4>
                <p>اگر پیامک قبلا ارسال شده باشد، مستقیم همین فرم را می‌بینید. ارسال مجدد هر ۲ دقیقه فعال می‌شود.</p>
              </div>
              <button type="button" class="transfer-otp-close" @click="transferOtpOpen = false">×</button>
            </div>

            <label class="transfer-otp-label">کد تایید</label>
            <OtpCodeInput
              v-model="transferOtpCode"
              :disabled="transferOtpBusy"
              :auto-focus="transferOtpOpen"
              @complete="submitTransferOtp"
            />

            <div class="transfer-otp-actions">
              <button type="button" class="customer-secondary-btn" :disabled="transferOtpBusy || transferOtpResendIn > 0" @click="requestTransferOtp">
                {{ transferOtpResendIn > 0 ? `ارسال مجدد تا ${transferOtpResendIn} ثانیه` : 'ارسال مجدد کد' }}
              </button>
              <button type="button" class="customer-primary-btn" :disabled="transferOtpBusy" @click="submitTransferOtp">
                {{ transferOtpBusy ? 'در حال ثبت...' : 'تایید و نهایی‌سازی' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <DealChatModal
      v-if="chatOpen && deal?.id"
      :deal-id="deal.id"
      current-sender-type="customer"
      :get-messages="getDealMessages"
      :send-message="sendDealMessage"
      @close="chatOpen = false"
    />
  </section>
</template>

<style scoped src="./styles/CustomerDealStartView.css"></style>