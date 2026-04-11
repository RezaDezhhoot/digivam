<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { openCustomerAuthModal, useCustomerSession } from '../composables/useCustomerSession.js';
import { getWebFacilityBySlug } from '../services/web-loan.api.js';
import { getValidationStatus, submitSelfValidation, toggleBookmark, getBookmarkStatus } from '../services/customer-panel.api.js';
import { applySeo, resetSeo } from '../utils/seo.js';

const route = useRoute();
const router = useRouter();
const { hasCompletedProfile, isAuthenticated } = useCustomerSession();

const loading = ref(true);
const errorText = ref('');
const item = ref(null);
const bookmarked = ref(false);
const bookmarkBusy = ref(false);
const loanRequestError = ref('');
const selectedAmount = ref(null);
const selectedMonths = ref(null);
const selectedRate = ref(null);
const validationModalOpen = ref(false);
const customerValidationStatus = ref(null);

/* ─── Self-validation modal state ─── */
const modalStep = ref('select');
const showTrainingVideo = ref(false);
const svFile = ref(null);
const svDragActive = ref(false);
const svSubmitting = ref(false);
const svSubmitSuccess = ref(false);
const svSubmitMessage = ref('');
const svErrorText = ref('');

const svAllowedTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'
];
const svAllowedExtensions = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff';
const svMaxFileSize = 100 * 1024 * 1024;

const svFormatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const svIsValidFile = (file) => {
  if (!file) return false;
  if (file.size > svMaxFileSize) return false;
  if (!svAllowedTypes.includes(file.type) && !file.type.startsWith('image/')) return false;
  return true;
};

const svOnFileChange = (event) => {
  const file = event.target.files?.[0];
  if (file && svIsValidFile(file)) {
    svFile.value = file;
    svErrorText.value = '';
  } else if (file) {
    svErrorText.value = 'فرمت یا حجم فایل مجاز نیست. حداکثر ۱۰۰ مگابایت.';
    setTimeout(() => { svErrorText.value = ''; }, 5000);
  }
};

const svOnDrop = (event) => {
  svDragActive.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file && svIsValidFile(file)) {
    svFile.value = file;
    svErrorText.value = '';
  } else if (file) {
    svErrorText.value = 'فرمت یا حجم فایل مجاز نیست. حداکثر ۱۰۰ مگابایت.';
    setTimeout(() => { svErrorText.value = ''; }, 5000);
  }
};

const svRemoveFile = () => { svFile.value = null; };

const svHandleSubmit = async () => {
  if (!svFile.value || svSubmitting.value) return;
  svSubmitting.value = true;
  svErrorText.value = '';
  try {
    const formData = new FormData();
    formData.append('validationId', String(item.value.validation.validationId));
    formData.append('file', svFile.value);
    const result = await submitSelfValidation(formData);
    svSubmitSuccess.value = true;
    svSubmitMessage.value = result.message || 'گزارش شما با موفقیت ثبت شد';
    checkValidationStatus(item.value.validation.validationId);
  } catch (error) {
    svErrorText.value = error.message || 'خطا در ارسال گزارش';
  } finally {
    svSubmitting.value = false;
  }
};

const closeValidationModal = () => {
  validationModalOpen.value = false;
  modalStep.value = 'select';
  showTrainingVideo.value = false;
  svFile.value = null;
  svDragActive.value = false;
  svSubmitting.value = false;
  svErrorText.value = '';
  if (svSubmitSuccess.value) {
    svSubmitSuccess.value = false;
    svSubmitMessage.value = '';
  }
};

const enterSelfValidationStep = () => {
  if (!isAuthenticated.value) {
    validationModalOpen.value = false;
    openCustomerAuthModal({ redirectTo: route.fullPath });
    return;
  }
  if (!hasCompletedProfile.value) {
    validationModalOpen.value = false;
    router.push('/customer/profile');
    return;
  }
  modalStep.value = 'upload';
};

const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;
const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));

const calculatePreview = ({ amount, months, rate, digiVamFeeText }) => {
  const principal = Number(amount || 0);
  const percent = Number(rate || 0);
  const installmentMonths = Number(months || 0);
  const digiFeeValue = /\d/.test(String(digiVamFeeText || ''))
    ? Number(String(digiVamFeeText).replace(/[^\d]/g, '')) || 0
    : 0;
  const totalInterest = Math.round(principal * (percent / 100));
  const monthlyPayment = installmentMonths > 0 ? Math.round((principal + totalInterest) / installmentMonths) : 0;
  const netAmount = Math.max(principal - digiFeeValue, 0);

  return {
    monthlyPayment,
    totalInterest,
    netAmount
  };
};

const applyDefaults = (facility) => {
  if (!facility) {
    return;
  }

  selectedAmount.value = facility.calculatorDefaults?.amount ?? facility.amountOptions?.[0] ?? facility.minAmount;
  selectedMonths.value = facility.calculatorDefaults?.months ?? facility.installmentOptions?.[0] ?? null;
  selectedRate.value = facility.calculatorDefaults?.rate ?? facility.rateOptions?.[0] ?? null;
};

const calculatorPreview = computed(() => {
  if (!item.value) {
    return { monthlyPayment: 0, totalInterest: 0, netAmount: 0 };
  }

  return calculatePreview({
    amount: selectedAmount.value,
    months: selectedMonths.value,
    rate: selectedRate.value,
    digiVamFeeText: item.value.digiVamFeeText
  });
});

const progressSteps = computed(() => {
  if (!item.value) {
    return [];
  }

  return item.value.validationRequired
    ? ['شرایط وام', 'اعتبار سنجی', 'ثبت درخواست', 'بررسی مدارک']
    : ['شرایط وام', 'ثبت درخواست', 'ارسال مدارک', 'بررسی قرارداد'];
});

const guaranteeItems = computed(() => {
  if (!item.value) {
    return [];
  }

  if (Array.isArray(item.value.guarantees) && item.value.guarantees.length) {
    return item.value.guarantees;
  }

  return (item.value.guaranteeBadges || []).map((title, index) => ({
    id: `${index}-${title}`,
    title,
    help: ''
  }));
});

const handleLoanRequest = () => {
  const targetPath = `/customer/deals/start/${encodeURIComponent(route.params.slug)}`;

  if (item.value?.validationRequired && customerValidationStatus.value?.status !== 'approved') {
    loanRequestError.value = 'برای ثبت درخواست این وام، اعتبارسنجی الزامی است.';
    validationModalOpen.value = true;
    return;
  }

  if (!isAuthenticated.value) {
    openCustomerAuthModal({ redirectTo: `${targetPath}?amount=${selectedAmount.value}&months=${selectedMonths.value}&rate=${selectedRate.value}` });
    return;
  }

  if (!hasCompletedProfile.value) {
    router.push('/customer/profile');
    return;
  }

  loanRequestError.value = '';
  router.push({
    path: targetPath,
    query: {
      amount: selectedAmount.value,
      months: selectedMonths.value,
      rate: selectedRate.value
    }
  });
};

const handleToggleBookmark = async () => {
  if (!isAuthenticated.value) {
    openCustomerAuthModal({ redirectTo: route.fullPath });
    return;
  }
  if (bookmarkBusy.value || !item.value) return;
  bookmarkBusy.value = true;
  try {
    const data = await toggleBookmark(item.value.id);
    const currentCount = Number(item.value.bookmarkCount || 0);
    bookmarked.value = data.bookmarked;
    item.value.bookmarkCount = Math.max(currentCount + (data.bookmarked ? 1 : -1), 0);
  } catch { /* ignore */ }
  finally { bookmarkBusy.value = false; }
};

const checkBookmarkStatus = async (facilityId) => {
  if (!isAuthenticated.value || !facilityId) return;
  try {
    const data = await getBookmarkStatus(facilityId);
    bookmarked.value = data.bookmarked;
  } catch { /* ignore */ }
};

const checkValidationStatus = async (validationId) => {
  if (!isAuthenticated.value || !validationId) return;
  try {
    const data = await getValidationStatus(validationId);
    if (data.hasRecord && data.item) {
      customerValidationStatus.value = data.item;
    }
  } catch {
    // ignore - customer may not have a record
  }
};

const startValidationFlow = () => {
  if (!item.value?.validation?.validationId) return;

  validationModalOpen.value = false;

  const isSelf = customerValidationStatus.value?.selfValidation;
  const vId = item.value.validation.validationId;
  const targetRoute = isSelf ? `/customer/self-validation/${vId}` : `/customer/validation-flow/${vId}`;

  if (!isAuthenticated.value) {
    openCustomerAuthModal({ redirectTo: targetRoute });
    return;
  }

  if (!hasCompletedProfile.value) {
    router.push('/customer/profile');
    return;
  }

  router.push(targetRoute);
};

const startSelfValidationFlow = () => {
  enterSelfValidationStep();
};

const load = async () => {
  loading.value = true;
  errorText.value = '';

  try {
    const data = await getWebFacilityBySlug(route.params.slug);
    item.value = data.item;
    loanRequestError.value = '';
    applyDefaults(data.item);

    if (data.item?.validation?.validationId) {
      checkValidationStatus(data.item.validation.validationId);
    }

    checkBookmarkStatus(data.item?.id);

    const url = `${window.location.origin}/market/${encodeURIComponent(route.params.slug)}`;

    applySeo({
      title: data.item?.seo?.title || `${data.item?.title || ''} | ${data.site?.siteName || 'دی جی وام'}`,
      description: data.item?.seo?.description || data.site?.defaultSeo?.description || data.item?.description,
      keywords: data.item?.seo?.keywords || data.site?.defaultSeo?.keywords,
      robots: data.item?.seo?.robots || 'index,follow',
      canonicalUrl: data.item?.seo?.canonicalUrl || url,
      url,
      image: data.site?.siteLogoUrl || '',
      favicon: data.site?.faviconUrl || data.site?.siteLogoUrl || '',
      siteName: data.site?.siteName || 'دی جی وام',
      type: 'article',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: data.item?.seo?.title || data.item?.title || '',
          description: data.item?.seo?.description || data.item?.description || '',
          url
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'صفحه اصلی',
              item: `${window.location.origin}/`
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'بازار امتیاز وام',
              item: `${window.location.origin}/market`
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: data.item?.title || '',
              item: url
            }
          ]
        }
      ]
    });
  } catch (error) {
    errorText.value = error.message;
    item.value = null;
  } finally {
    loading.value = false;
  }
};

watch(() => route.params.slug, load);
onMounted(load);
onUnmounted(resetSeo);
</script>

<template>
  <section class="loan-detail-view">
    <div class="detail-bg" aria-hidden="true">
      <span class="detail-bg-orb detail-bg-orb-1"></span>
      <span class="detail-bg-orb detail-bg-orb-2"></span>
      <span class="detail-bg-grid"></span>
    </div>

    <div v-if="loading" class="detail-loading card card-body"><span class="web-spinner"></span> در حال بارگذاری اطلاعات وام...</div>

    <div v-else-if="errorText" class="detail-loading card card-body text-danger">{{ errorText }}</div>

    <template v-else-if="item">
      <div class="detail-breadcrumb">بازار امتیاز وام / {{ item.title }}</div>

      <div class="detail-intro-banner">
        <div class="detail-intro-copy">
          <span class="detail-intro-kicker">پیشنهاد کارگزار مناسب برای شما</span>
          <h1>{{ item.title }}</h1>
          <p>{{ item.broker.summary }}</p>
        </div>

        <div class="detail-intro-stats">
          <span>درخواست {{ formatNumber(item.requestCount) }}</span>
          <span>بازدید {{ formatNumber(item.views) }}</span>
          <span>{{ formatNumber(item.bookmarkCount) }} نشان‌شده</span>
          <button type="button" class="detail-bookmark-btn" :class="{ active: bookmarked }" :disabled="bookmarkBusy" @click="handleToggleBookmark">
            <i class="fa-solid fa-bookmark"></i>
            {{ bookmarked ? 'نشان شده' : 'نشان کردن' }}
          </button>
        </div>
      </div>

      <div class="detail-layout">
        <aside class="detail-sidebar">
          <article class="detail-card detail-overview-card">
            <div class="detail-overview-brand">{{ item.institutionName }}</div>
            <div class="detail-overview-meta">
              <span>{{ item.typeLabel }}</span>
              <span>ضمانت {{ item.guaranteeBadges[0] || '-' }}</span>
            </div>

            <!-- Validation status in sidebar -->
            <template v-if="item.validationRequired && customerValidationStatus">
              <!-- Approved -->
              <div v-if="customerValidationStatus.status === 'approved'" class="sidebar-validation-banner sidebar-validation-approved">
                <i class="fa-solid fa-circle-check"></i>
                <strong>اعتبار سنجی انجام شده است</strong>
              </div>

              <!-- Pending -->
              <div v-else-if="customerValidationStatus.status === 'pending' || customerValidationStatus.status === 'submit'" class="sidebar-validation-banner sidebar-validation-pending">
                <i class="fa-solid fa-clock"></i>
                <div>
                  <strong>{{ customerValidationStatus.status === 'submit' ? 'در حال تکمیل مراحل' : 'در انتظار بررسی' }}</strong>
                  <p v-if="customerValidationStatus.status === 'submit'">مراحل اعتبارسنجی هنوز تکمیل نشده است.</p>
                  <p v-else>درخواست شما در حال بررسی توسط کارشناسان است.</p>
                  <button v-if="customerValidationStatus.status === 'submit'" type="button" class="sidebar-validation-action" @click="startValidationFlow">ادامه تکمیل مراحل</button>
                </div>
              </div>

              <!-- Rejected -->
              <div v-else-if="customerValidationStatus.status === 'rejected'" class="sidebar-validation-banner sidebar-validation-rejected">
                <i class="fa-solid fa-circle-xmark"></i>
                <div>
                  <strong>اعتبارسنجی رد شده است</strong>
                  <p v-if="customerValidationStatus.result">{{ customerValidationStatus.result }}</p>
                  <button type="button" class="sidebar-validation-action" @click="startValidationFlow">ویرایش و ارسال مجدد</button>
                </div>
              </div>

              <!-- Expired -->
              <div v-else-if="customerValidationStatus.status === 'expired'" class="sidebar-validation-banner sidebar-validation-expired">
                <i class="fa-solid fa-calendar-xmark"></i>
                <div>
                  <strong>اعتبارسنجی منقضی شده است</strong>
                  <p>اعتبارسنجی قبلی منقضی شده. لطفا مجددا اقدام کنید.</p>
                  <button type="button" class="sidebar-validation-action" @click="startValidationFlow">شروع مجدد اعتبارسنجی</button>
                </div>
              </div>
            </template>

            <!-- No record yet: show original chip + button -->
            <template v-else>
              <div class="detail-validation-chip" :class="item.validationRequired ? 'required' : 'optional'">
                نیاز به اعتبار سنجی {{ item.validationRequired ? 'دارد' : 'ندارد' }}
              </div>
              <div v-if="item.validationRequired && item.validationTitle" class="detail-validation-note">
                نام اعتبار سنجی مورد نیاز : {{ item.validationTitle }}
                <button v-if="item.validation" type="button" class="validation-modal-trigger" @click="validationModalOpen = true">مشاهده اعتبارسنجی</button>
              </div>
            </template>

            <div class="detail-tag-row">
              <span v-for="tag in item.tags" :key="tag" class="detail-tag-chip">{{ tag }}</span>
            </div>

            <div class="detail-overview-grid">
              <div class="detail-overview-pill">
                <span>محدوده مبلغ</span>
                <strong>{{ formatNumber(item.minAmount / 1000000) }} تا {{ formatNumber(item.maxAmount / 1000000) }} میلیون</strong>
              </div>
              <div class="detail-overview-pill">
                <span>میانگین بررسی</span>
                <strong>{{ formatNumber(item.averageReviewHours) }} ساعت</strong>
              </div>
            </div>
          </article>

          <article class="detail-card calculator-card">
            <h2>محاسبه لحظه ای</h2>
            <div class="calculator-row">
              <span>اقساط ماهیانه :</span>
              <strong>{{ formatMoney(calculatorPreview.monthlyPayment) }}</strong>
            </div>
            <div class="calculator-row">
              <span>کل سود وام:</span>
              <strong>{{ formatMoney(calculatorPreview.totalInterest) }}</strong>
            </div>
            <div class="calculator-row">
              <span>کارمزد کارگزار :</span>
              <strong>{{ item.brokerFeeText }}</strong>
            </div>
            <div class="calculator-row">
              <span>کارمزد دیجی وام :</span>
              <strong>{{ item.digiVamFeeText }}</strong>
            </div>
            <div class="calculator-row highlight">
              <span>خالص دریافتی :</span>
              <strong>{{ formatMoney(calculatorPreview.netAmount) }}</strong>
            </div>
          </article>

          <article class="detail-card broker-card">
            <h2>اطلاعات عمومی کارگزار</h2>
            <div class="broker-metric-grid">
              <div class="broker-metric-item">
                <span>امتیاز:</span>
                <strong>{{ item.broker.rating }}/10</strong>
              </div>
              <div class="broker-metric-item">
                <span>درخواست ها:</span>
                <strong>{{ formatNumber(item.broker.requestCount) }}</strong>
              </div>
              <div class="broker-metric-item">
                <span>تاریخ شروع:</span>
                <strong>{{ item.broker.startedAtLabel }}</strong>
              </div>
              <div class="broker-metric-item">
                <span>نام کارگزار:</span>
                <strong>{{ item.broker.name }}</strong>
              </div>
            </div>
          </article>
        </aside>

        <div class="detail-main">
          <article class="detail-card selection-card">
            <h2>انتخاب شرایط وام</h2>

            <div class="selection-group">
              <div class="selection-label-row">
                <span>مبلغ وام</span>
                <strong>{{ formatMoney(selectedAmount) }}</strong>
              </div>
              <div class="selection-chip-row">
                <button
                  v-for="amount in item.amountOptions"
                  :key="amount"
                  type="button"
                  class="selection-chip"
                  :class="{ active: selectedAmount === amount }"
                  @click="selectedAmount = amount"
                >
                  {{ formatNumber(amount / 1000000) }} میلیون
                </button>
              </div>
            </div>

            <div class="selection-group">
              <div class="selection-label-row">
                <span>مدت باز پرداخت</span>
                <strong>{{ selectedMonths }} ماه</strong>
              </div>
              <div class="selection-chip-row">
                <button
                  v-for="month in item.installmentOptions"
                  :key="month"
                  type="button"
                  class="selection-chip"
                  :class="{ active: selectedMonths === month }"
                  @click="selectedMonths = month"
                >
                  {{ month }} ماه
                </button>
              </div>
            </div>

            <div class="selection-group">
              <div class="selection-label-row">
                <span>نرخ سود</span>
                <strong>%{{ selectedRate }}</strong>
              </div>
              <div class="selection-chip-row">
                <button
                  v-for="rate in item.rateOptions"
                  :key="rate"
                  type="button"
                  class="selection-chip"
                  :class="{ active: selectedRate === rate }"
                  @click="selectedRate = rate"
                >
                  نرخ سود %{{ rate }}
                </button>
              </div>
            </div>

            <div class="selection-summary-grid">
              <div class="selection-summary-item">
                <span>متوسط زمان بررسی</span>
                <strong>{{ formatNumber(item.averageReviewHours) }} ساعت</strong>
              </div>
              <div class="selection-summary-item">
                <span>مهلت برداشت</span>
                <strong>{{ formatNumber(item.withdrawDeadline) }} روز</strong>
              </div>
              <div class="selection-summary-item">
                <span>اعتبارسنجی</span>
                <strong>{{ item.validationRequired ? 'الزامی' : 'نیاز نیست' }}</strong>
              </div>
            </div>
          </article>

          <article class="detail-card guarantee-card">
            <div class="guarantee-head">
              <div>
                <h2>ضمانت‌های این وام</h2>
                <p>همه روش‌های تضمین قابل قبول برای این وام در این بخش نمایش داده می‌شود.</p>
              </div>
              <span class="guarantee-count-chip">{{ formatNumber(guaranteeItems.length) }} مورد</span>
            </div>

            <div class="guarantee-list">
              <article v-for="guarantee in guaranteeItems" :key="guarantee.id || guarantee.title" class="guarantee-item-card">
                <strong>{{ guarantee.title }}</strong>
                <p>{{ guarantee.help || 'جزئیات تکمیلی این ضمانت در زمان بررسی نهایی توسط کارگزار و موسسه ارائه دهنده وام اعلام می‌شود.' }}</p>
              </article>
            </div>
          </article>

          <article v-if="item.requiredDocuments && item.requiredDocuments.length" class="detail-card documents-card">
            <div class="documents-head">
              <div>
                <h2>مدارک مورد نیاز</h2>
                <p>مدارکی که برای ثبت درخواست این وام باید ارائه دهید.</p>
              </div>
              <span class="guarantee-count-chip">{{ formatNumber(item.requiredDocuments.length) }} مورد</span>
            </div>
            <div class="documents-list">
              <article v-for="doc in item.requiredDocuments" :key="doc.id" class="document-item-card">
                <i class="fa-solid fa-file-lines"></i>
                <div>
                  <strong>{{ doc.title }}</strong>
                  <p v-if="doc.help">{{ doc.help }}</p>
                </div>
              </article>
            </div>
          </article>

          <article class="detail-card progress-card">
            <div class="progress-head">
              <div>
                <h2>مسیر ثبت درخواست وام</h2>
                <p>مراحل کلی انجام این درخواست بر اساس طراحی موبایل و دسکتاپ.</p>
              </div>
              <button type="button" class="detail-primary-action" :class="{ 'validation-required': item.validationRequired && customerValidationStatus?.status !== 'approved' }" @click="handleLoanRequest">ثبت درخواست وام</button>
            </div>

            <div v-if="loanRequestError" class="detail-inline-error">
              <i class="fa-solid fa-circle-exclamation"></i>
              <span>{{ loanRequestError }}</span>
            </div>

            <div class="progress-step-row">
              <div v-for="step in progressSteps" :key="step" class="progress-step-item">
                <span class="progress-step-dot"></span>
                <strong>{{ step }}</strong>
              </div>
            </div>

            <p class="detail-description">{{ item.description }}</p>
          </article>

          <Teleport to="body">
            <Transition name="modal-fade">
              <div v-if="item.validation && validationModalOpen" class="validation-modal-overlay" @click.self="closeValidationModal">
                <div class="validation-modal-sheet">
                  <div class="validation-modal-header">
                    <div>
                      <h2>اعتبارسنجی</h2>
                      <p>{{ modalStep === 'upload' ? 'بارگذاری گزارش اعتبارسنجی' : 'روش اعتبارسنجی خود را انتخاب کنید' }}</p>
                    </div>
                    <button type="button" class="validation-modal-close" @click="closeValidationModal">×</button>
                  </div>

                  <!-- ═══ Status view ═══ -->
                  <div v-if="customerValidationStatus" class="validation-customer-status">
                    <template v-if="customerValidationStatus.status === 'approved'">
                      <div class="validation-status-banner validation-status-approved">
                        <i class="fa-solid fa-circle-check"></i>
                        <div>
                          <strong>اعتبار سنجی انجام شده است</strong>
                          <p>شما قبلا اعتبارسنجی خود را با موفقیت انجام داده‌اید.</p>
                        </div>
                      </div>
                    </template>

                    <template v-else-if="customerValidationStatus.status === 'pending'">
                      <div class="validation-status-banner validation-status-pending">
                        <i class="fa-solid fa-clock"></i>
                        <div>
                          <strong>اعتبارسنجی در انتظار بررسی</strong>
                          <p>درخواست شما ثبت شده و در حال بررسی توسط کارشناسان است.</p>
                        </div>
                      </div>
                    </template>

                    <template v-else-if="customerValidationStatus.status === 'submit'">
                      <div class="validation-status-banner validation-status-pending">
                        <i class="fa-solid fa-pen-to-square"></i>
                        <div>
                          <strong>اعتبارسنجی در حال تکمیل</strong>
                          <p>مراحل اعتبارسنجی هنوز تکمیل نشده است. برای ادامه کلیک کنید.</p>
                          <button type="button" class="validation-action-button" @click="startValidationFlow">ادامه تکمیل مراحل</button>
                        </div>
                      </div>
                    </template>

                    <template v-else-if="customerValidationStatus.status === 'rejected'">
                      <div class="validation-status-banner validation-status-rejected">
                        <i class="fa-solid fa-circle-xmark"></i>
                        <div>
                          <strong>اعتبارسنجی رد شده است</strong>
                          <p v-if="customerValidationStatus.result">دلیل: {{ customerValidationStatus.result }}</p>
                          <button type="button" class="validation-action-button" @click="startValidationFlow">ویرایش و ارسال مجدد</button>
                        </div>
                      </div>
                    </template>

                    <template v-else-if="customerValidationStatus.status === 'expired'">
                      <div class="validation-status-banner validation-status-expired">
                        <i class="fa-solid fa-calendar-xmark"></i>
                        <div>
                          <strong>اعتبارسنجی منقضی شده است</strong>
                          <p>اعتبارسنجی قبلی شما منقضی شده. لطفا مجددا اقدام کنید.</p>
                          <button type="button" class="validation-action-button" @click="startValidationFlow">شروع مجدد</button>
                        </div>
                      </div>
                    </template>
                  </div>

                  <!-- ═══ Self-validation upload step ═══ -->
                  <template v-else-if="modalStep === 'upload'">
                    <button type="button" class="sv-modal-back" @click="modalStep = 'select'">
                      <i class="fa-solid fa-arrow-right"></i>
                      بازگشت به انتخاب روش
                    </button>

                    <template v-if="svSubmitSuccess">
                      <div class="sv-modal-success">
                        <i class="fa-solid fa-circle-check"></i>
                        <h3>گزارش ارسال شد</h3>
                        <p>{{ svSubmitMessage }}</p>
                        <p class="sv-modal-success-note">گزارش شما توسط کارشناسان بررسی خواهد شد و نتیجه از طریق اعلان‌ها اطلاع‌رسانی می‌شود.</p>
                        <button type="button" class="validation-action-button" @click="closeValidationModal">بستن</button>
                      </div>
                    </template>

                    <template v-else>
                      <div class="sv-modal-info-grid">
                        <div v-if="item.validation.selfValidationGuide" class="sv-modal-card guide-card">
                          <div class="sv-modal-card-head">
                            <span class="sv-modal-card-dot"></span>
                            <h3>راهنما</h3>
                          </div>
                          <p>{{ item.validation.selfValidationGuide }}</p>
                        </div>

                        <div v-if="item.validation.trainingVideoUrl" class="sv-modal-card video-card">
                          <div class="sv-modal-card-head">
                            <span class="sv-modal-card-dot"></span>
                            <h3>راهنمای تصویری اعتبارسنجی</h3>
                          </div>
                          <p>برای مشاهده آموزش تصویری نحوه اعتبارسنجی، روی دکمه زیر کلیک کنید.</p>
                          <button type="button" class="sv-modal-video-toggle" @click="showTrainingVideo = !showTrainingVideo">
                            <i :class="showTrainingVideo ? 'fa-solid fa-eye-slash' : 'fa-solid fa-play'"></i>
                            {{ showTrainingVideo ? 'بستن ویدیو' : 'مشاهده آموزش' }}
                          </button>
                          <Transition name="sv-video-slide">
                            <video v-if="showTrainingVideo" :src="item.validation.trainingVideoUrl" controls preload="metadata" class="sv-modal-video-player"></video>
                          </Transition>
                        </div>
                      </div>

                      <div class="sv-modal-upload-section">
                        <div class="sv-modal-upload-head">
                          <strong>{{ item.validation.uploadLabel || 'بارگذاری گزارش' }}</strong>
                          <span>فرمت‌های مجاز: PDF، Word، تصویر</span>
                        </div>
                        <div
                          class="sv-modal-dropzone"
                          :class="{ active: svDragActive, 'has-file': svFile }"
                          @dragover.prevent="svDragActive = true"
                          @dragleave.prevent="svDragActive = false"
                          @drop.prevent="svOnDrop"
                        >
                          <template v-if="svFile">
                            <div class="sv-modal-file-preview">
                              <i class="fa-solid fa-file-lines"></i>
                              <div class="sv-modal-file-info">
                                <span>{{ svFile.name }}</span>
                                <span>{{ svFormatFileSize(svFile.size) }}</span>
                              </div>
                              <button type="button" class="sv-modal-file-remove" @click="svRemoveFile"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                          </template>
                          <template v-else>
                            <i class="fa-solid fa-cloud-arrow-up sv-modal-dropzone-icon"></i>
                            <p>برای شروع آپلود، فایل خود را درگ کنید</p>
                            <div class="sv-modal-dropzone-divider">
                              <span></span>
                              <em>یا</em>
                              <span></span>
                            </div>
                            <label class="sv-modal-browse-btn">
                              مرور فایل‌ها
                              <input type="file" :accept="svAllowedExtensions" hidden @change="svOnFileChange" />
                            </label>
                          </template>
                        </div>
                      </div>

                      <div v-if="item.validation.selfValidationNote" class="sv-modal-note-card">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <div>
                          <strong>نکته مهم</strong>
                          <p>{{ item.validation.selfValidationNote }}</p>
                        </div>
                      </div>

                      <div v-if="svErrorText" class="sv-modal-error">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        {{ svErrorText }}
                      </div>

                      <div class="sv-modal-status-bar">
                        <span>{{ svFile ? 'آماده ارسال' : 'در انتظار بارگذاری گزارش' }}</span>
                      </div>

                      <button
                        type="button"
                        class="sv-modal-submit-btn"
                        :disabled="!svFile || svSubmitting"
                        @click="svHandleSubmit"
                      >
                        <i v-if="svSubmitting" class="fa-solid fa-spinner fa-spin"></i>
                        {{ svSubmitting ? 'در حال ارسال ...' : 'ارسال گزارش' }}
                      </button>
                    </template>
                  </template>

                  <!-- ═══ Method selection step ═══ -->
                  <template v-else>
                    <span class="validation-provider-chip">{{ item.validation.providerTitle }}</span>

                    <div v-if="item.validation.trainingVideoUrl" class="sv-modal-video-banner">
                      <div class="sv-modal-video-banner-content">
                        <i class="fa-solid fa-film"></i>
                        <div>
                          <strong>راهنمای تصویری اعتبارسنجی</strong>
                          <p>ویدیوی آموزشی نحوه اعتبارسنجی را مشاهده کنید</p>
                        </div>
                      </div>
                      <button type="button" class="sv-modal-video-toggle compact" @click="showTrainingVideo = !showTrainingVideo">
                        <i :class="showTrainingVideo ? 'fa-solid fa-eye-slash' : 'fa-solid fa-play'"></i>
                        {{ showTrainingVideo ? 'بستن' : 'مشاهده ویدیو' }}
                      </button>
                      <Transition name="sv-video-slide">
                        <video v-if="showTrainingVideo" :src="item.validation.trainingVideoUrl" controls preload="metadata" class="sv-modal-video-player"></video>
                      </Transition>
                    </div>

                    <div class="validation-method-grid">
                      <article class="validation-method-item primary">
                        <h3>{{ item.validation.introTitle }}</h3>
                        <p>{{ item.validation.introDescription }}</p>
                        <p v-if="item.validation.description" class="validation-method-description">{{ item.validation.description }}</p>
                        <div class="validation-summary-row">
                          <span v-if="item.validation.validForLabel" class="validation-summary-chip">{{ item.validation.validForLabel }}</span>
                          <span class="validation-summary-chip">{{ item.validation.costText }}</span>
                        </div>
                        <div class="validation-feature-list">
                          <span>{{ item.validation.stepsLabel }}</span>
                          <span v-for="feature in item.validation.featureLines" :key="feature">{{ feature }}</span>
                        </div>
                        <button type="button" class="validation-action-button" @click="startValidationFlow">{{ item.validation.primaryActionLabel }}</button>
                      </article>

                      <article v-if="item.validation.selfValidation" class="validation-method-item secondary">
                        <h3>{{ item.validation.secondaryTitle }}</h3>
                        <p>{{ item.validation.secondaryDescription }}</p>
                        <div class="validation-secondary-note">{{ item.validation.secondaryNote }}</div>
                        <div class="validation-upload-label">{{ item.validation.uploadLabel }}</div>
                        <button type="button" class="validation-action-button secondary" @click="startSelfValidationFlow">{{ item.validation.secondaryActionLabel }}</button>
                      </article>
                    </div>
                  </template>
                </div>
              </div>
            </Transition>
          </Teleport>

          <article class="detail-card notes-card">
            <h2>نکات مهم</h2>
            <div class="notes-list">
              <div v-for="note in item.importantNotes" :key="note" class="note-item">
                <span class="note-bullet"></span>
                <p>{{ note }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.loan-detail-view {
  position: relative;
  padding-top: 28px;
  padding-bottom: 56px;
}

.detail-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.detail-bg-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(10px);
  opacity: 0.45;
  animation: detailFloat 22s ease-in-out infinite alternate;
}

.detail-bg-orb-1 {
  width: 280px;
  height: 280px;
  top: 40px;
  left: -100px;
  background: radial-gradient(circle, rgba(155, 0, 0, 0.16) 0%, transparent 72%);
}

.detail-bg-orb-2 {
  width: 360px;
  height: 360px;
  top: 32%;
  right: -120px;
  background: radial-gradient(circle, rgba(205, 82, 82, 0.14) 0%, transparent 72%);
  animation-duration: 26s;
}

.detail-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(155, 0, 0, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(155, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 58px 58px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.18), transparent 90%);
}

.detail-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
  padding: 26px;
  font-weight: 700;
  color: var(--web-muted);
}

.detail-breadcrumb {
  color: var(--web-muted);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 12px;
}

.detail-intro-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px;
  border-radius: 28px;
  background: linear-gradient(135deg, #8d0000 0%, #c11212 100%);
  color: #fff;
  box-shadow: 0 24px 58px rgba(155, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
}

.detail-intro-copy {
  min-width: 0;
}

.detail-intro-banner::after {
  content: '';
  position: absolute;
  inset: auto -8% -45% auto;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.16), transparent 70%);
}

.detail-intro-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 31px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 10px;
}

.detail-intro-banner h1 {
  margin: 0;
  font-size: 31px;
  line-height: 1.3;
  font-weight: 900;
}

.detail-intro-banner p {
  margin: 8px 0 0;
  max-width: 680px;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.82;
  font-size: 13px;
}

.detail-intro-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 330px;
}

.detail-intro-stats span,
.validation-provider-chip,
.detail-tag-chip,
.detail-validation-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.detail-intro-stats span {
  background: rgba(255, 255, 255, 0.14);
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
  gap: 18px;
  margin-top: 20px;
  align-items: start;
}

.detail-sidebar {
  display: grid;
  gap: 14px;
  position: sticky;
  top: 98px;
  min-width: 0;
}

.detail-main {
  display: grid;
  gap: 14px;
}

.detail-card {
  padding: 20px;
  border-radius: 24px;
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  border: 1px solid var(--web-border);
  box-shadow: var(--web-shadow);
  position: relative;
  z-index: 1;
}

.detail-card h2 {
  margin: 0 0 14px;
  font-size: 20px;
  font-weight: 800;
}

.detail-overview-brand {
  font-size: 27px;
  font-weight: 800;
  margin-bottom: 10px;
}

.detail-overview-meta,
.detail-tag-row,
.progress-step-row,
.validation-feature-list {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-overview-meta span,
.validation-provider-chip,
.detail-tag-chip {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--web-surface-soft);
  color: var(--web-text);
  font-size: 12px;
  font-weight: 700;
}

.detail-validation-chip {
  margin-top: 16px;
  width: fit-content;
}

.detail-validation-chip.required {
  background: #fff4d8;
  color: #9a6300;
}

.detail-validation-chip.optional {
  background: #ecfdf5;
  color: #166534;
}

.detail-validation-note {
  margin-top: 12px;
  color: var(--web-muted);
  line-height: 1.8;
}

/* ─── Sidebar validation status banners ─── */
.sidebar-validation-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 16px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--web-border);
}

.sidebar-validation-banner i {
  font-size: 22px;
  flex-shrink: 0;
  margin-top: 2px;
}

.sidebar-validation-banner strong {
  display: block;
  font-size: 14px;
  font-weight: 800;
}

.sidebar-validation-banner p {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.8;
}

.sidebar-validation-approved {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #14532d;
}

.sidebar-validation-approved i {
  color: #22a06b;
}

.sidebar-validation-approved strong {
  color: #166534;
}

.sidebar-validation-approved p {
  color: #166534;
}

.sidebar-validation-pending {
  background: #fef3c7;
  border-color: #fde68a;
  color: #78350f;
}

.sidebar-validation-pending i {
  color: #d97706;
}

.sidebar-validation-pending strong {
  color: #92400e;
}

.sidebar-validation-pending p {
  color: #92400e;
}

.sidebar-validation-rejected {
  background: #fef2f2;
  border-color: #fecaca;
  color: #7f1d1d;
}

.sidebar-validation-rejected i {
  color: #dc2626;
}

.sidebar-validation-rejected strong {
  color: #991b1b;
}

.sidebar-validation-rejected p {
  color: #991b1b;
}

.sidebar-validation-expired {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #1f2937;
}

.sidebar-validation-expired i {
  color: #6b7280;
}

.sidebar-validation-expired strong {
  color: #374151;
}

.sidebar-validation-expired p {
  color: #4b5563;
}

.sidebar-validation-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 16px;
  margin-top: 10px;
  border-radius: 12px;
  border: none;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  background: linear-gradient(135deg, #8d0000, #c11212);
  color: #fff;
  transition: opacity 0.2s;
}

.sidebar-validation-action:hover {
  opacity: 0.88;
}

.detail-tag-row {
  margin-top: 16px;
}

.detail-overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.detail-overview-pill {
  padding: 12px;
  border-radius: 16px;
  background: var(--web-surface-soft);
  border: 1px solid var(--web-border);
}

.detail-overview-pill span {
  display: block;
  color: var(--web-muted);
  font-size: 12px;
}

.detail-overview-pill strong {
  display: block;
  margin-top: 8px;
}

.detail-overview-card {
  background: linear-gradient(180deg, rgba(155, 0, 0, 0.06) 0%, var(--web-surface) 100%);
}

.broker-card {
  background: linear-gradient(180deg, rgba(237, 161, 90, 0.08) 0%, var(--web-surface) 100%);
}

.calculator-card {
  background: linear-gradient(180deg, rgba(155, 0, 0, 0.06) 0%, var(--web-surface) 100%);
  overflow: hidden;
}

.selection-card {
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
}

.progress-card {
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
}

.guarantee-card {
  background: linear-gradient(180deg, rgba(255, 106, 99, 0.06) 0%, var(--web-surface) 100%);
}

.validation-card {
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
}

.notes-card {
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
}

.broker-metric-grid,
.selection-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.broker-metric-item,
.selection-summary-item {
  padding: 13px 12px;
  border-radius: 16px;
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
}

.calculator-card .calculator-row,
.broker-metric-item,
.selection-summary-item,
.detail-overview-pill,
.progress-step-item,
.note-item,
.validation-method-item.secondary,
.validation-stage-item,
.validation-stage-card {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.validation-stage-list {
  display: grid;
  gap: 14px;
}

.validation-stage-card {
  border-radius: 20px;
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
  padding: 16px;
}

.validation-stage-head {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
}

.validation-stage-head h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
}

.validation-stage-step {
  width: fit-content;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(155, 0, 0, 0.08);
  color: var(--web-primary);
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 800;
}

.validation-stage-description {
  margin: 0 0 14px;
  color: var(--web-muted);
  line-height: 1.9;
}

.validation-stage-item-list {
  display: grid;
  gap: 10px;
}

.validation-stage-item {
  border-radius: 16px;
  padding: 12px;
  border: 1px solid var(--web-border);
  background: rgba(255, 255, 255, 0.72);
  display: grid;
  gap: 8px;
}

.validation-stage-item.document {
  border-color: rgba(155, 0, 0, 0.12);
}

.validation-stage-item strong {
  font-size: 15px;
}

.validation-stage-item p {
  margin: 0;
  color: var(--web-muted);
  line-height: 1.8;
}

.validation-stage-item span {
  font-size: 12px;
  font-weight: 700;
  color: var(--web-primary);
}

.broker-metric-item span,
.selection-summary-item span,
.calculator-row span,
.selection-label-row span,
.progress-card p,
.detail-description {
  color: var(--web-muted);
}

.broker-metric-item strong,
.selection-summary-item strong {
  display: block;
  margin-top: 6px;
  font-size: 14px;
}

.calculator-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--web-border);
}

.calculator-row strong {
  min-width: 0;
  text-align: end;
  line-height: 1.8;
  word-break: break-word;
}

.calculator-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.calculator-row.highlight strong {
  color: var(--web-primary);
}

.selection-group + .selection-group {
  margin-top: 16px;
}

.selection-label-row,
.progress-head,
.validation-head,
.guarantee-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.guarantee-head h2 {
  margin-bottom: 8px;
}

.guarantee-head p {
  margin: 0;
  color: var(--web-muted);
  line-height: 1.8;
}

.guarantee-count-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--web-primary-soft);
  color: var(--web-primary);
  font-size: 11px;
  font-weight: 800;
}

.guarantee-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.guarantee-item-card {
  padding: 15px;
  border-radius: 18px;
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
}

.guarantee-item-card strong {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
}

.guarantee-item-card p {
  margin: 0;
  color: var(--web-muted);
  line-height: 1.9;
}

.selection-label-row strong {
  color: var(--web-primary);
}

.selection-chip-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.selection-chip,
.detail-primary-action,
.validation-action-button {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 800;
}

.selection-chip {
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
  color: var(--web-text);
}

.selection-chip.active {
  background: var(--web-primary);
  border-color: var(--web-primary);
  color: #fff;
}

.selection-summary-grid {
  margin-top: 20px;
}

.detail-primary-action,
.validation-action-button {
  border: none;
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  color: #fff;
}

.progress-step-row {
  margin-top: 14px;
}

.progress-step-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--web-surface-soft);
  border: 1px solid var(--web-border);
  font-size: 12px;
  font-weight: 700;
}

.progress-step-dot,
.note-bullet {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--web-primary);
  flex-shrink: 0;
}

.detail-description {
  margin: 14px 0 0;
  line-height: 1.85;
}

.validation-method-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.validation-method-item {
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--web-border);
}

.validation-method-item.primary {
  background: linear-gradient(180deg, rgba(155, 0, 0, 0.06) 0%, var(--web-surface) 100%);
}

.validation-method-item.secondary {
  background: var(--web-surface-soft);
}

.validation-method-item h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
}

.validation-method-item p,
.validation-cost,
.validation-secondary-note,
.validation-upload-label,
.note-item p {
  margin: 12px 0 0;
  color: var(--web-muted);
  line-height: 1.9;
}

.validation-feature-list {
  margin-top: 16px;
}

.validation-feature-list span {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(155, 0, 0, 0.08);
  color: var(--web-primary);
  font-size: 12px;
  font-weight: 700;
}

.validation-summary-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.validation-summary-chip {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(12, 74, 110, 0.08);
  color: #0f4c81;
  font-size: 12px;
  font-weight: 700;
}

.validation-cost {
  font-weight: 700;
}

.validation-action-button {
  margin-top: 16px;
}

.validation-action-button.secondary {
  background: var(--web-surface);
  border: 1px solid var(--web-border-strong);
  color: var(--web-primary);
}

.notes-list {
  display: grid;
  gap: 12px;
}

/* ─── Validation trigger button ─── */
.validation-modal-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  margin-inline-start: 10px;
  border: 1px solid var(--web-primary);
  border-radius: 12px;
  background: var(--web-primary-soft);
  color: var(--web-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.validation-modal-trigger:hover {
  background: var(--web-primary);
  color: #fff;
  transform: translateY(-1px);
}

/* ─── Validation status banners inside modal ─── */
.validation-customer-status {
  margin-bottom: 18px;
}

.validation-status-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px;
  border-radius: 20px;
  border: 1px solid var(--web-border);
}

.validation-status-banner i {
  font-size: 26px;
  flex-shrink: 0;
  margin-top: 2px;
}

.validation-status-banner strong {
  display: block;
  font-size: 16px;
  margin-bottom: 6px;
}

.validation-status-banner p {
  margin: 0;
  line-height: 1.8;
  font-size: 13px;
}

.validation-status-approved {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #14532d;
}

.validation-status-approved i {
  color: #22a06b;
}

.validation-status-approved p {
  color: #166534;
}

.validation-status-pending {
  background: #fef3c7;
  border-color: #fde68a;
  color: #78350f;
}

.validation-status-pending i {
  color: #d97706;
}

.validation-status-pending p {
  color: #92400e;
}

.validation-status-rejected {
  background: #fef2f2;
  border-color: #fecaca;
  color: #7f1d1d;
}

.validation-status-rejected i {
  color: #dc2626;
}

.validation-status-rejected p {
  color: #991b1b;
}

.validation-status-expired {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #1f2937;
}

.validation-status-expired i {
  color: #6b7280;
}

.validation-status-expired p {
  color: #4b5563;
}

.validation-status-banner .validation-action-button {
  margin-top: 12px;
  cursor: pointer;
}

.validation-start-btn {
  display: block;
  width: 100%;
  margin-top: 16px;
  cursor: pointer;
}

/* ─── Validation modal (teleported to body, needs :global) ─── */
:global(.validation-modal-overlay) {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.52);
  backdrop-filter: blur(4px);
  padding: 24px;
}

:global(.validation-modal-sheet) {
  width: min(900px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  padding: 28px;
  border-radius: 30px;
  background: var(--web-surface);
  border: 1px solid var(--web-border);
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.28);
  color: var(--web-text);
}

:global(.validation-modal-header) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

:global(.validation-modal-header h2) {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
}

:global(.validation-modal-header p) {
  margin: 6px 0 0;
  color: var(--web-muted);
  font-size: 14px;
}

:global(.validation-modal-close) {
  width: 44px;
  height: 44px;
  border: 1px solid var(--web-border-strong);
  border-radius: 14px;
  background: var(--web-surface-soft);
  color: var(--web-text);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s ease;
}

:global(.validation-modal-close:hover) {
  background: var(--web-primary-soft);
  color: var(--web-primary);
}

:global(.validation-modal-sheet .validation-provider-chip) {
  display: inline-flex;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--web-surface-soft);
  color: var(--web-text);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 18px;
}

:global(.validation-modal-sheet .validation-method-grid) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

:global(.validation-modal-sheet .validation-method-item) {
  padding: 20px;
  border-radius: 24px;
  border: 1px solid var(--web-border);
}

:global(.validation-modal-sheet .validation-method-item.primary) {
  background: linear-gradient(180deg, rgba(155, 0, 0, 0.06) 0%, var(--web-surface) 100%);
}

:global(.validation-modal-sheet .validation-method-item.secondary) {
  background: var(--web-surface-soft);
}

:global(.validation-modal-sheet .validation-method-item h3) {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

:global(.validation-modal-sheet .validation-method-item p),
:global(.validation-modal-sheet .validation-cost),
:global(.validation-modal-sheet .validation-secondary-note),
:global(.validation-modal-sheet .validation-upload-label) {
  margin: 12px 0 0;
  color: var(--web-muted);
  line-height: 1.9;
}

:global(.validation-modal-sheet .validation-feature-list) {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

:global(.validation-modal-sheet .validation-feature-list span) {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(155, 0, 0, 0.08);
  color: var(--web-primary);
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

:global(.validation-modal-sheet .validation-summary-row) {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

:global(.validation-modal-sheet .validation-summary-chip) {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(12, 74, 110, 0.08);
  color: #0f4c81;
  font-size: 12px;
  font-weight: 700;
}

:global(.validation-modal-sheet .validation-cost) {
  font-weight: 700;
}

:global(.validation-modal-sheet .validation-action-button) {
  min-height: 46px;
  padding: 0 16px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  color: #fff;
  margin-top: 16px;
  cursor: pointer;
}

:global(.validation-modal-sheet .validation-action-button.secondary) {
  background: var(--web-surface);
  border: 1px solid var(--web-border-strong);
  color: var(--web-primary);
}

/* ─── Self-validation inside modal ─── */
:global(.sv-modal-back) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--web-muted);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  margin-bottom: 18px;
  transition: color 0.2s;
}

:global(.sv-modal-back:hover) {
  color: var(--web-primary);
}

:global(.sv-modal-info-grid) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}

:global(.sv-modal-card) {
  padding: 18px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid transparent;
  box-shadow: 0 0 4px 0 rgba(27, 117, 209, 0.18);
}

:global(.sv-modal-card.guide-card) {
  border-color: transparent;
}

:global(.sv-modal-card.video-card) {
  border-color: transparent;
}

:global(.sv-modal-card-head) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

:global(.sv-modal-card-dot) {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #1b75d1;
  flex-shrink: 0;
}

:global(.sv-modal-card h3) {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1b75d1;
}

:global(.sv-modal-card p) {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: #4f4f4f;
}

:global(.sv-modal-video-toggle) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(128deg, #1b75d1 9%, #0e3c6b 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

:global(.sv-modal-video-toggle:hover) {
  opacity: 0.88;
}

:global(.sv-modal-video-toggle.compact) {
  padding: 6px 14px;
  font-size: 12px;
  border-radius: 6px;
  flex-shrink: 0;
}

:global(.sv-modal-video-player) {
  width: 100%;
  border-radius: 10px;
  margin-top: 12px;
  max-height: 340px;
  background: #000;
}

:global(.sv-video-slide-enter-active),
:global(.sv-video-slide-leave-active) {
  transition: all 0.3s ease;
  overflow: hidden;
}

:global(.sv-video-slide-enter-from),
:global(.sv-video-slide-leave-to) {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
}

/* ─── Video banner in method selection ─── */
:global(.sv-modal-video-banner) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 14px;
  background: rgba(27, 117, 209, 0.06);
  border: 1px solid rgba(27, 117, 209, 0.18);
  margin-bottom: 18px;
}

:global(.sv-modal-video-banner-content) {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 200px;
}

:global(.sv-modal-video-banner-content i) {
  font-size: 24px;
  color: #1b75d1;
  flex-shrink: 0;
}

:global(.sv-modal-video-banner-content strong) {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #1b75d1;
}

:global(.sv-modal-video-banner-content p) {
  margin: 2px 0 0;
  font-size: 12px;
  color: #4f4f4f;
}

:global(.sv-modal-video-banner .sv-modal-video-player) {
  width: 100%;
  flex-basis: 100%;
}

/* ─── Upload section in modal ─── */
:global(.sv-modal-upload-section) {
  margin-bottom: 16px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 14px;
  box-shadow: 0 0 4px 0 rgba(27, 117, 209, 0.12);
}

:global(.sv-modal-upload-head) {
  margin-bottom: 14px;
}

:global(.sv-modal-upload-head strong) {
  display: block;
  font-size: 16px;
  font-weight: 700;
}

:global(.sv-modal-upload-head span) {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: #4f4f4f;
}

:global(.sv-modal-dropzone) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 20px;
  border: 2px dashed var(--web-primary, #db0000);
  border-radius: 12px;
  background: rgba(251, 230, 230, 0.3);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  text-align: center;
}

:global(.sv-modal-dropzone.active) {
  background: rgba(251, 230, 230, 0.6);
  border-color: var(--web-primary, #db0000);
}

:global(.sv-modal-dropzone-icon) {
  font-size: 36px;
  color: var(--web-primary, #db0000);
  opacity: 0.7;
}

:global(.sv-modal-dropzone p) {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--web-text);
}

:global(.sv-modal-dropzone-divider) {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 200px;
}

:global(.sv-modal-dropzone-divider span) {
  flex: 1;
  height: 1px;
  background: var(--web-border);
}

:global(.sv-modal-dropzone-divider em) {
  font-style: normal;
  font-size: 12px;
  color: var(--web-muted);
}

:global(.sv-modal-browse-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 18px;
  border: 1px solid var(--web-primary, #db0000);
  border-radius: 8px;
  background: rgba(251, 230, 230, 0.3);
  color: var(--web-primary, #db0000);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

:global(.sv-modal-browse-btn:hover) {
  background: rgba(251, 230, 230, 0.6);
}

:global(.sv-modal-file-preview) {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

:global(.sv-modal-file-preview > i) {
  font-size: 28px;
  color: var(--web-primary);
  flex-shrink: 0;
}

:global(.sv-modal-file-info) {
  flex: 1;
  min-width: 0;
  text-align: right;
}

:global(.sv-modal-file-info span) {
  display: block;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.sv-modal-file-info span:last-child) {
  font-size: 11px;
  color: var(--web-muted);
  margin-top: 2px;
}

:global(.sv-modal-file-remove) {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
  color: var(--web-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.2s, border-color 0.2s;
}

:global(.sv-modal-file-remove:hover) {
  color: #dc2626;
  border-color: #dc2626;
}

/* ─── Note card in self-validation ─── */
:global(.sv-modal-note-card) {
  display: flex;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 14px;
  background: #fffbeb;
  border: 1px solid rgba(217, 119, 6, 0.25);
  margin-bottom: 16px;
}

:global(.sv-modal-note-card > i) {
  font-size: 20px;
  color: #d97706;
  flex-shrink: 0;
  margin-top: 2px;
}

:global(.sv-modal-note-card strong) {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 4px;
}

:global(.sv-modal-note-card p) {
  margin: 0;
  font-size: 12px;
  line-height: 1.9;
  color: #78350f;
}

/* ─── Status bar ─── */
:global(.sv-modal-status-bar) {
  padding: 12px 16px;
  border-radius: 10px;
  background: #fbe6e6;
  text-align: center;
  margin-bottom: 16px;
}

:global(.sv-modal-status-bar span) {
  font-size: 13px;
  font-weight: 600;
  color: #7f1d1d;
}

/* ─── Error ─── */
:global(.sv-modal-error) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  font-size: 13px;
  margin-bottom: 16px;
}

:global(.sv-modal-error i) {
  flex-shrink: 0;
}

/* ─── Submit button ─── */
:global(.sv-modal-submit-btn) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--web-primary, #db0000) 0%, #c11212 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}

:global(.sv-modal-submit-btn:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

:global(.sv-modal-submit-btn:not(:disabled):hover) {
  opacity: 0.88;
}

/* ─── Success state ─── */
:global(.sv-modal-success) {
  text-align: center;
  padding: 28px 0 8px;
}

:global(.sv-modal-success > i) {
  font-size: 52px;
  color: #22a06b;
  margin-bottom: 14px;
}

:global(.sv-modal-success h3) {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 8px;
}

:global(.sv-modal-success p) {
  margin: 0;
  color: var(--web-muted);
  line-height: 1.8;
}

:global(.sv-modal-success-note) {
  font-size: 12px;
  margin-top: 10px;
}

:global(.sv-modal-success .validation-action-button) {
  margin-top: 18px;
}

/* Modal transitions */
:global(.modal-fade-enter-active),
:global(.modal-fade-leave-active) {
  transition: opacity 0.25s ease;
}

:global(.modal-fade-enter-active .validation-modal-sheet),
:global(.modal-fade-leave-active .validation-modal-sheet) {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease;
}

:global(.modal-fade-enter-from),
:global(.modal-fade-leave-to) {
  opacity: 0;
}

:global(.modal-fade-enter-from .validation-modal-sheet) {
  transform: translateY(24px);
  opacity: 0;
}

:global(.modal-fade-leave-to .validation-modal-sheet) {
  transform: translateY(12px);
  opacity: 0;
}

/* Mobile: bottom-sheet style */
@media (max-width: 767px) {
  :global(.validation-modal-overlay) {
    align-items: flex-end;
    padding: 0;
  }

  :global(.validation-modal-sheet) {
    width: 100%;
    max-height: 92vh;
    border-radius: 28px 28px 0 0;
    padding: 22px 18px 32px;
  }

  :global(.validation-modal-header h2) {
    font-size: 20px;
  }

  :global(.validation-modal-sheet .validation-method-grid) {
    grid-template-columns: 1fr;
  }

  :global(.sv-modal-info-grid) {
    grid-template-columns: 1fr;
  }

  :global(.sv-modal-video-banner) {
    flex-direction: column;
    align-items: stretch;
  }

  :global(.sv-modal-video-banner-content) {
    min-width: 0;
  }

  :global(.sv-modal-video-toggle.compact) {
    align-self: flex-start;
  }

  :global(.modal-fade-enter-from .validation-modal-sheet) {
    transform: translateY(100%);
  }

  :global(.modal-fade-leave-to .validation-modal-sheet) {
    transform: translateY(100%);
  }
}

.note-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 20px;
  background: var(--web-surface-soft);
  border: 1px solid var(--web-border);
}

.note-item p {
  margin: 0;
}

@keyframes detailFloat {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(22px, -18px, 0) scale(1.06); }
}

:global([data-theme='dark']) .loan-detail-view .detail-card {
  background: linear-gradient(180deg, rgba(20, 27, 36, 0.96) 0%, rgba(17, 21, 28, 0.96) 100%);
}

:global([data-theme='dark']) .loan-detail-view .detail-bg-grid {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
}

:global([data-theme='dark']) .loan-detail-view .validation-method-item.primary {
  background: linear-gradient(180deg, rgba(255, 106, 99, 0.16) 0%, rgba(20, 27, 36, 0.96) 100%);
}

:global([data-theme='dark']) .loan-detail-view .detail-overview-card {
  background: linear-gradient(180deg, rgba(255, 106, 99, 0.16) 0%, rgba(28, 22, 32, 0.96) 100%);
}

:global([data-theme='dark']) .loan-detail-view .broker-card {
  background: linear-gradient(180deg, rgba(255, 181, 167, 0.12) 0%, rgba(31, 26, 34, 0.96) 100%);
}

:global([data-theme='dark']) .loan-detail-view .calculator-card {
  background: linear-gradient(180deg, rgba(33, 47, 70, 0.98) 0%, rgba(24, 33, 48, 0.98) 100%);
}

:global([data-theme='dark']) .loan-detail-view .selection-card {
  background: linear-gradient(180deg, rgba(30, 34, 49, 0.98) 0%, rgba(20, 27, 36, 0.98) 100%);
}

:global([data-theme='dark']) .loan-detail-view .progress-card {
  background: linear-gradient(180deg, rgba(35, 28, 42, 0.98) 0%, rgba(20, 27, 36, 0.98) 100%);
}

:global([data-theme='dark']) .loan-detail-view .validation-card {
  background: linear-gradient(180deg, rgba(41, 33, 42, 0.98) 0%, rgba(20, 27, 36, 0.98) 100%);
}

:global([data-theme='dark']) .loan-detail-view .notes-card {
  background: linear-gradient(180deg, rgba(24, 34, 46, 0.98) 0%, rgba(20, 27, 36, 0.98) 100%);
}

:global([data-theme='dark']) .loan-detail-view .validation-method-item.secondary,
:global([data-theme='dark']) .loan-detail-view .broker-metric-item,
:global([data-theme='dark']) .loan-detail-view .selection-summary-item,
:global([data-theme='dark']) .loan-detail-view .detail-overview-pill,
:global([data-theme='dark']) .loan-detail-view .progress-step-item,
:global([data-theme='dark']) .loan-detail-view .note-item {
  background: linear-gradient(180deg, rgba(19, 29, 42, 0.98) 0%, rgba(14, 22, 33, 0.98) 100%);
  border-color: rgba(137, 168, 212, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

:global([data-theme='dark']) .loan-detail-view .detail-overview-meta span,
:global([data-theme='dark']) .loan-detail-view .validation-provider-chip,
:global([data-theme='dark']) .loan-detail-view .detail-tag-chip,
:global([data-theme='dark']) .loan-detail-view .detail-intro-stats span {
  background: rgba(255, 255, 255, 0.06);
  color: var(--web-text);
}

:global([data-theme='dark']) .loan-detail-view .detail-validation-chip.required {
  background: rgba(255, 196, 84, 0.16);
  color: #ffd36d;
}

:global([data-theme='dark']) .loan-detail-view .detail-validation-chip.optional {
  background: rgba(52, 211, 153, 0.14);
  color: #86efac;
}

:global([data-theme='dark']) .loan-detail-view .calculator-row.highlight strong {
  color: #9bc4ff;
}

:global([data-theme='dark']) .loan-detail-view .detail-overview-pill span,
:global([data-theme='dark']) .loan-detail-view .broker-metric-item span,
:global([data-theme='dark']) .loan-detail-view .selection-summary-item span,
:global([data-theme='dark']) .loan-detail-view .calculator-row span,
:global([data-theme='dark']) .loan-detail-view .validation-method-item p,
:global([data-theme='dark']) .loan-detail-view .validation-secondary-note,
:global([data-theme='dark']) .loan-detail-view .validation-upload-label,
:global([data-theme='dark']) .loan-detail-view .note-item p,
:global([data-theme='dark']) .loan-detail-view .detail-validation-note,
:global([data-theme='dark']) .loan-detail-view .detail-description,
:global([data-theme='dark']) .loan-detail-view .progress-card p {
  color: #ccd9ea;
}

:global([data-theme='dark']) .loan-detail-view .detail-card h2,
:global([data-theme='dark']) .loan-detail-view .validation-method-item h3,
:global([data-theme='dark']) .loan-detail-view .detail-overview-brand,
:global([data-theme='dark']) .loan-detail-view .progress-step-item,
:global([data-theme='dark']) .loan-detail-view .validation-feature-list span {
  color: #f7faff;
}

:global([data-theme='dark']) .loan-detail-view .detail-overview-pill strong,
:global([data-theme='dark']) .loan-detail-view .broker-metric-item strong,
:global([data-theme='dark']) .loan-detail-view .selection-summary-item strong,
:global([data-theme='dark']) .loan-detail-view .calculator-row strong,
:global([data-theme='dark']) .loan-detail-view .progress-step-item strong,
:global([data-theme='dark']) .loan-detail-view .selection-label-row strong {
  color: #f7faff;
}

:global([data-theme='dark'] .validation-modal-sheet) {
  background: linear-gradient(180deg, rgba(21, 28, 38, 0.99) 0%, rgba(14, 20, 30, 0.99) 100%);
  border-color: rgba(137, 168, 212, 0.2);
}

:global([data-theme='dark'] .validation-modal-sheet .validation-provider-chip) {
  background: rgba(255, 255, 255, 0.06);
  color: var(--web-text);
}

:global([data-theme='dark'] .validation-modal-sheet .validation-method-item) {
  border-color: rgba(137, 168, 212, 0.18);
}

:global([data-theme='dark'] .validation-modal-sheet .validation-method-item.primary) {
  background: linear-gradient(180deg, rgba(255, 106, 99, 0.16) 0%, rgba(20, 27, 36, 0.96) 100%);
}

:global([data-theme='dark'] .validation-modal-sheet .validation-method-item.secondary) {
  background: linear-gradient(180deg, rgba(19, 29, 42, 0.98) 0%, rgba(14, 22, 33, 0.98) 100%);
}

:global([data-theme='dark'] .validation-modal-sheet .validation-method-item h3) {
  color: #f7faff;
}

:global([data-theme='dark'] .validation-modal-sheet .validation-method-item p),
:global([data-theme='dark'] .validation-modal-sheet .validation-cost),
:global([data-theme='dark'] .validation-modal-sheet .validation-secondary-note),
:global([data-theme='dark'] .validation-modal-sheet .validation-upload-label) {
  color: #ccd9ea;
}

:global([data-theme='dark'] .validation-modal-sheet .validation-feature-list span) {
  background: rgba(255, 106, 99, 0.14);
  color: #ffb5b0;
}

:global([data-theme='dark'] .validation-modal-sheet .validation-action-button.secondary) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(137, 168, 212, 0.18);
  color: #ffb5b0;
}

/* ─── Dark mode: self-validation modal sections ─── */
:global([data-theme='dark'] .sv-modal-card) {
  background: rgba(19, 29, 42, 0.95);
  box-shadow: 0 0 4px 0 rgba(27, 117, 209, 0.12);
}

:global([data-theme='dark'] .sv-modal-card p) {
  color: #b4c4d8;
}

:global([data-theme='dark'] .sv-modal-video-banner) {
  background: rgba(27, 117, 209, 0.1);
  border-color: rgba(27, 117, 209, 0.22);
}

:global([data-theme='dark'] .sv-modal-video-banner-content p) {
  color: #b4c4d8;
}

:global([data-theme='dark'] .sv-modal-upload-section) {
  background: rgba(19, 29, 42, 0.95);
  border-color: rgba(137, 168, 212, 0.18);
}

:global([data-theme='dark'] .sv-modal-upload-head span) {
  color: #9eacbd;
}

:global([data-theme='dark'] .sv-modal-dropzone) {
  background: rgba(255, 106, 99, 0.05);
  border-color: rgba(255, 106, 99, 0.4);
}

:global([data-theme='dark'] .sv-modal-dropzone.active) {
  background: rgba(255, 106, 99, 0.12);
}

:global([data-theme='dark'] .sv-modal-browse-btn) {
  background: rgba(255, 106, 99, 0.1);
  border-color: rgba(255, 106, 99, 0.4);
  color: #ffb5b0;
}

:global([data-theme='dark'] .sv-modal-note-card) {
  background: rgba(217, 119, 6, 0.1);
  border-color: rgba(217, 119, 6, 0.25);
}

:global([data-theme='dark'] .sv-modal-note-card strong) {
  color: #fbbf24;
}

:global([data-theme='dark'] .sv-modal-note-card p) {
  color: #fcd34d;
}

:global([data-theme='dark'] .sv-modal-status-bar) {
  background: rgba(255, 106, 99, 0.12);
}

:global([data-theme='dark'] .sv-modal-status-bar span) {
  color: #ffb5b0;
}

:global([data-theme='dark'] .sv-modal-error) {
  background: rgba(220, 38, 38, 0.12);
  border-color: rgba(220, 38, 38, 0.3);
  color: #fca5a5;
}

:global([data-theme='dark'] .sv-modal-back) {
  color: #9eacbd;
}

:global([data-theme='dark'] .sv-modal-back:hover) {
  color: #ffb5b0;
}

:global([data-theme='dark'] .validation-modal-header h2) {
  color: #f7faff;
}

:global([data-theme='dark'] .validation-modal-header p) {
  color: #b4c4d8;
}

:global([data-theme='dark'] .validation-modal-close) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(137, 168, 212, 0.18);
  color: #ccd9ea;
}

:global([data-theme='dark'] .validation-modal-trigger) {
  background: rgba(255, 106, 99, 0.14);
  border-color: rgba(255, 106, 99, 0.4);
  color: #ffb5b0;
}

:global([data-theme='dark'] .validation-modal-trigger:hover) {
  background: var(--web-primary);
  color: #fff;
}

@media (max-width: 1199px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .detail-sidebar {
    position: static;
  }
}

@media (max-width: 767px) {
  .loan-detail-view {
    padding-top: 18px;
    padding-bottom: 40px;
  }

  .detail-intro-banner,
  .progress-head,
  .validation-head,
  .selection-label-row {
    flex-direction: column;
    align-items: stretch;
  }

  .detail-intro-banner {
    padding: 18px 16px;
    border-radius: 24px;
  }

  .detail-intro-banner h1,
  .detail-card h2 {
    font-size: 21px;
  }

  .detail-intro-banner p {
    font-size: 12px;
    line-height: 1.75;
  }

  .detail-intro-stats {
    width: 100%;
    max-width: none;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-intro-stats span,
  .detail-bookmark-btn {
    width: 100%;
    justify-content: center;
  }

  .detail-card {
    padding: 16px;
    border-radius: 20px;
  }

  .calculator-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .calculator-row strong {
    text-align: right;
  }

  .broker-metric-grid,
  .detail-overview-grid,
  .selection-summary-grid,
  .validation-method-grid,
  .guarantee-list {
    grid-template-columns: 1fr;
  }
}

/* ─── Bookmark button ─── */
.detail-bookmark-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--web-border);
  background: var(--web-surface);
  color: var(--web-muted);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-bookmark-btn:hover {
  border-color: var(--web-primary);
  color: var(--web-primary);
}

.detail-bookmark-btn.active {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
}

.detail-bookmark-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ─── Required documents ─── */
.documents-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.documents-head h2 {
  font-size: 19px;
  font-weight: 800;
  margin: 0 0 4px;
}

.documents-head p {
  font-size: 13px;
  color: var(--web-muted);
  margin: 0;
}

.documents-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.document-item-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  background: var(--web-surface-soft);
  border: 1px solid var(--web-border);
}

.document-item-card i {
  font-size: 20px;
  color: var(--web-primary);
  margin-top: 2px;
  flex-shrink: 0;
}

.document-item-card strong {
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
}

.document-item-card p {
  margin: 0;
  font-size: 12px;
  color: var(--web-muted);
  line-height: 1.6;
}

/* ─── Validation-required action button ─── */
.detail-primary-action.validation-required {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 12px 24px rgba(245, 158, 11, 0.2);
}

.detail-primary-action.validation-required i {
  margin-left: 6px;
}

.detail-inline-error {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 14px 0 0;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #c2410c;
  font-size: 13px;
  font-weight: 700;
}
</style>