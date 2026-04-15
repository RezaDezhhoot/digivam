<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { openCustomerAuthModal, useCustomerSession } from '../composables/useCustomerSession.js';
import { getWebFacilityBySlug } from '../services/web-loan.api.js';
import { getValidationStatus, submitSelfValidation, toggleBookmark, getBookmarkStatus } from '../services/customer-panel.api.js';
import { applySeo, resetSeo } from '../utils/seo.js';
import { useSiteConfig } from '../composables/useSiteConfig.js';

const route = useRoute();
const router = useRouter();
const { hasCompletedProfile, isAuthenticated } = useCustomerSession();
const { setSiteConfig } = useSiteConfig();

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
    setSiteConfig(data.site);
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
                <strong>{{ item.broker.rating }}/5 ★</strong>
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

<style scoped src="./styles/LoanDetailsView.css"></style>