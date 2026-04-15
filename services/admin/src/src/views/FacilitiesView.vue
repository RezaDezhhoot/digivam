<script setup>
import { computed, onMounted, ref } from 'vue';
import AppPagination from '../components/AppPagination.vue';
import Select2Input from '../components/Select2Input.vue';
import {
  createFacility,
  deleteFacility,
  getFacilities,
  getFacilityOptions,
  reviewFacility,
  updateFacility
} from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';
import { useConfirm } from '../composables/useConfirm.js';

const toast = useAppToast();
const { confirm } = useConfirm();

const loading = ref(false);
const optionLoading = ref(false);
const saving = ref(false);
const reviewLoading = ref(false);
const deleting = ref(false);
const exportLoading = ref(false);
const activeTab = ref('details');
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const search = ref('');
const statusFilter = ref('');
const brokerFilter = ref('');
const typeFilter = ref('');
const profitInput = ref('');
const installmentInput = ref('');
const reviewReason = ref('');
const items = ref([]);
const options = ref({
  brokers: [],
  guarantees: [],
  loanTypes: [],
  validations: [],
  paymentTypes: [],
  statuses: [],
  loanDocuments: [],
  amountLimits: {
    min: 1000,
    max: 999999999999999
  }
});

const createEmptyForm = () => ({
  id: null,
  brokerId: '',
  title: '',
  subTypeId: '',
  minAmount: '',
  maxAmount: '',
  withdrawDeadline: '',
  body: '',
  validationId: '',
  paymentType: 'cash',
  guaranteeIds: [],
  documentIds: [],
  profits: [],
  installments: [],
  averageReviewHours: '',
  validationIntroTitle: '',
  validationIntroDescription: '',
  validationStepsLabel: '',
  validationFeatureLines: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  seoCanonicalUrl: '',
  seoRobots: '',
  status: 'pending',
  resultReason: ''
});

const form = ref(createEmptyForm());

const statusClassMap = {
  pending: 'chip-yellow',
  published: 'chip-green',
  rejected: 'chip-red',
  in_progress: 'chip-blue',
  expired: 'chip-gray'
};

const moneyFormatter = new Intl.NumberFormat('fa-IR');
const formatNumber = (value) => moneyFormatter.format(Number(value || 0));
const formatMoney = (value) => `${formatNumber(value)} تومان`;
const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');

const amountLimits = computed(() => options.value.amountLimits || { min: 1000, max: 999999999999999 });
const amountLimitText = computed(() => `بازه مجاز سامانه از ${formatMoney(amountLimits.value.min)} تا ${formatMoney(amountLimits.value.max)} است.`);

const brokerSelectOptions = computed(() =>
  (options.value.brokers || []).map((item) => ({
    id: item.id,
    label: [item.name || `کارگزار #${item.id}`, item.phone].filter(Boolean).join(' - ')
  }))
);

const selectedLoanType = computed(() =>
  options.value.loanTypes.find((item) => Number(item.id) === Number(form.value.subTypeId)) || null
);

const selectedBroker = computed(() =>
  options.value.brokers.find((item) => Number(item.id) === Number(form.value.brokerId)) || null
);

const editingLabel = computed(() => (form.value.id ? `${form.value.title || 'بدون عنوان'} - #${form.value.id}` : ''));

const canGoTermsTab = computed(() => (
  form.value.brokerId &&
  form.value.title.trim() &&
  form.value.subTypeId &&
  Number(form.value.minAmount) >= Number(amountLimits.value.min || 1000) &&
  Number(form.value.maxAmount) >= Number(amountLimits.value.min || 1000) &&
  Number(form.value.withdrawDeadline) > 0
));

const resetForm = () => {
  form.value = createEmptyForm();
  reviewReason.value = '';
  profitInput.value = '';
  installmentInput.value = '';
  activeTab.value = 'details';
};

const activateTab = (tab) => {
  if ((tab === 'terms' || tab === 'seo' || tab === 'docs') && !canGoTermsTab.value) {
    return;
  }

  activeTab.value = tab;
};

const buildQuery = ({ page: nextPage = page.value, limit: nextLimit = limit.value } = {}) => {
  const params = new URLSearchParams({ page: String(nextPage), limit: String(nextLimit) });

  if (search.value.trim()) params.set('search', search.value.trim());
  if (statusFilter.value) params.set('status', statusFilter.value);
  if (brokerFilter.value) params.set('brokerId', String(brokerFilter.value));
  if (typeFilter.value) params.set('type', typeFilter.value);

  return `?${params.toString()}`;
};

const exportFacilitiesToExcel = async () => {
  exportLoading.value = true;
  try {
    const data = await getFacilities(buildQuery({ page: 1, limit: Math.max(total.value || 0, 1000) }));
    const exportItems = Array.isArray(data.items) ? data.items : [];
    if (!exportItems.length) {
      toast.warning('داده‌ای برای خروجی اکسل وجود ندارد');
      return;
    }

    const XLSX = await import('xlsx');
    const rows = exportItems.map((item, index) => ({
      'ردیف': index + 1,
      'شناسه': item.id,
      'عنوان': item.title || '-',
      'اسلاگ': item.slug || '-',
      'کارگزار': item.brokerName || '-',
      'موبایل کارگزار': item.brokerPhone || '-',
      'نوع وام': item.loanTypeTitle || '-',
      'نوع معامله': item.typeLabel || '-',
      'حداقل مبلغ': Number(item.minAmount || 0),
      'حداکثر مبلغ': Number(item.maxAmount || 0),
      'بازدید': Number(item.views || 0),
      'نشان‌شده': Number(item.bookmarkCount || 0),
      'وضعیت': item.statusLabel || item.status || '-',
      'دلیل بررسی': item.resultReason || '-',
      'آخرین بروزرسانی': formatDate(item.updatedAt)
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Facilities');
    XLSX.writeFile(workbook, `admin-facilities-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('خروجی اکسل امتیازهای وام آماده شد');
  } catch (error) {
    toast.error(error.message || 'ساخت خروجی اکسل با خطا مواجه شد');
  } finally {
    exportLoading.value = false;
  }
};

const loadOptions = async () => {
  optionLoading.value = true;
  try {
    const data = await getFacilityOptions();
    options.value = {
      brokers: data.brokers || [],
      guarantees: data.guarantees || [],
      loanTypes: data.loanTypes || [],
      validations: data.validations || [],
      paymentTypes: data.paymentTypes || [],
      statuses: data.statuses || [],
      loanDocuments: data.loanDocuments || [],
      amountLimits: data.amountLimits || options.value.amountLimits
    };

    if (!form.value.paymentType && options.value.paymentTypes[0]?.value) {
      form.value.paymentType = options.value.paymentTypes[0].value;
    }
  } catch (error) {
    toast.error(error.message);
  } finally {
    optionLoading.value = false;
  }
};

const load = async () => {
  loading.value = true;
  try {
    const data = await getFacilities(buildQuery());
    items.value = data.items || [];
    page.value = Number(data.page || 1);
    limit.value = Number(data.limit || 10);
    total.value = Number(data.total || 0);
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.value = false;
  }
};

const applyFilters = async () => {
  page.value = 1;
  await load();
};

const clearFilters = async () => {
  search.value = '';
  statusFilter.value = '';
  brokerFilter.value = '';
  typeFilter.value = '';
  page.value = 1;
  await load();
};

const changePage = async (nextPage) => {
  page.value = nextPage;
  await load();
};

const toggleGuarantee = (guaranteeId) => {
  const next = new Set(form.value.guaranteeIds.map(Number));

  if (next.has(Number(guaranteeId))) {
    next.delete(Number(guaranteeId));
  } else {
    next.add(Number(guaranteeId));
  }

  form.value.guaranteeIds = [...next];
};

const toggleDocument = (documentId) => {
  const next = new Set(form.value.documentIds.map(Number));

  if (next.has(Number(documentId))) {
    next.delete(Number(documentId));
  } else {
    next.add(Number(documentId));
  }

  form.value.documentIds = [...next];
};

const addProfit = () => {
  const value = Number(profitInput.value || 0);
  if (!Number.isFinite(value) || value <= 0) return;
  if (form.value.profits.some((item) => Number(item) === value)) {
    profitInput.value = '';
    return;
  }
  form.value.profits = [...form.value.profits, value].sort((left, right) => left - right);
  profitInput.value = '';
};

const removeProfit = (value) => {
  form.value.profits = form.value.profits.filter((item) => Number(item) !== Number(value));
};

const addInstallment = () => {
  const value = Number(installmentInput.value || 0);
  if (!Number.isInteger(value) || value <= 0) return;
  if (form.value.installments.some((item) => Number(item) === value)) {
    installmentInput.value = '';
    return;
  }
  form.value.installments = [...form.value.installments, value].sort((left, right) => left - right);
  installmentInput.value = '';
};

const removeInstallment = (value) => {
  form.value.installments = form.value.installments.filter((item) => Number(item) !== Number(value));
};

const toPayload = () => ({
  brokerId: Number(form.value.brokerId),
  title: form.value.title,
  subTypeId: Number(form.value.subTypeId),
  minAmount: Number(form.value.minAmount),
  maxAmount: Number(form.value.maxAmount),
  withdrawDeadline: Number(form.value.withdrawDeadline),
  body: form.value.body,
  validationId: form.value.validationId ? Number(form.value.validationId) : '',
  paymentType: form.value.paymentType,
  guaranteeIds: form.value.guaranteeIds.map(Number),
  documentIds: form.value.documentIds.map(Number),
  profits: form.value.profits.map(Number),
  installments: form.value.installments.map(Number),
  averageReviewHours: form.value.averageReviewHours ? Number(form.value.averageReviewHours) : null,
  validationIntroTitle: form.value.validationIntroTitle,
  validationIntroDescription: form.value.validationIntroDescription,
  validationStepsLabel: form.value.validationStepsLabel,
  validationFeatureLines: String(form.value.validationFeatureLines || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean),
  seoTitle: form.value.seoTitle,
  seoDescription: form.value.seoDescription,
  seoKeywords: form.value.seoKeywords,
  seoCanonicalUrl: form.value.seoCanonicalUrl,
  seoRobots: form.value.seoRobots
});

const submit = async () => {
  saving.value = true;
  try {
    const payload = toPayload();

    if (form.value.id) {
      await updateFacility(form.value.id, payload);
      toast.success('امتیاز وام بروزرسانی شد');
    } else {
      await createFacility(payload);
      toast.success('امتیاز وام ثبت شد');
    }

    resetForm();
    await load();
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.value = false;
  }
};

const editItem = (item) => {
  form.value = {
    id: item.id,
    brokerId: item.brokerId || '',
    title: item.title || '',
    subTypeId: item.subTypeId || '',
    minAmount: Number(item.minAmount || 0) || '',
    maxAmount: Number(item.maxAmount || 0) || '',
    withdrawDeadline: item.withdrawDeadline || '',
    body: item.body || '',
    validationId: item.validationId || '',
    paymentType: item.paymentType || 'cash',
    guaranteeIds: (item.guaranteeIds || []).map(Number),
    documentIds: (item.requiredDocumentIds || []).map(Number),
    profits: (item.profits || []).map((profit) => Number(profit.percent || 0)).filter(Boolean),
    installments: (item.installments || []).map((installment) => Number(installment.month || 0)).filter(Boolean),
    averageReviewHours: item.averageReviewHours || '',
    validationIntroTitle: item.validationContent?.introTitle || '',
    validationIntroDescription: item.validationContent?.introDescription || '',
    validationStepsLabel: item.validationContent?.stepsLabel || '',
    validationFeatureLines: Array.isArray(item.validationContent?.featureLines) ? item.validationContent.featureLines.join('\n') : '',
    seoTitle: item.seo?.title || '',
    seoDescription: item.seo?.description || '',
    seoKeywords: item.seo?.keywords || '',
    seoCanonicalUrl: item.seo?.canonicalUrl || '',
    seoRobots: item.seo?.robots || '',
    status: item.status || 'pending',
    resultReason: item.resultReason || ''
  };
  reviewReason.value = item.resultReason || '';
  profitInput.value = '';
  installmentInput.value = '';
  activeTab.value = 'details';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const submitReview = async (status) => {
  if (!form.value.id) {
    toast.error('ابتدا یک امتیاز وام را برای بررسی انتخاب کنید');
    return;
  }

  reviewLoading.value = true;
  try {
    await reviewFacility(form.value.id, { status, reason: reviewReason.value });
    toast.success(status === 'published' ? 'امتیاز وام تایید شد' : 'امتیاز وام رد شد');
    await load();

    const freshItem = items.value.find((item) => Number(item.id) === Number(form.value.id));
    if (freshItem) {
      editItem(freshItem);
      activeTab.value = 'terms';
    }
  } catch (error) {
    toast.error(error.message);
  } finally {
    reviewLoading.value = false;
  }
};

const removeItem = async (id) => {
  const ok = await confirm({ title: 'حذف امتیاز وام', text: 'آیا از حذف این امتیاز وام مطمئن هستید؟' });
  if (!ok) return;

  deleting.value = true;
  try {
    await deleteFacility(id);
    if (Number(form.value.id) === Number(id)) {
      resetForm();
    }
    toast.success('امتیاز وام حذف شد');
    await load();
  } catch (error) {
    toast.error(error.message);
  } finally {
    deleting.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadOptions(), load()]);
});
</script>

<template>
  <div class="animate-in">
    <div class="page-header">
      <div class="page-header-info">
        <div class="page-header-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
        <div>
          <h1 class="page-title">مدیریت امتیازهای وام</h1>
          <p class="page-subtitle">فرم ثبت به صورت تب‌بندی شده، انتخاب کارگزار با جستجو و مدیریت کامل تایید یا رد درخواست‌ها</p>
        </div>
      </div>
      <div class="page-header-badge">{{ total }} مورد</div>
    </div>

    <div class="card card-body mb-3 facility-card">
      <div class="facility-tab-row">
        <button type="button" class="facility-tab" :class="{ active: activeTab === 'details' }" @click="activateTab('details')">
          <span class="facility-tab-badge">1</span>
          <div>
            <strong>اطلاعات پایه</strong>
            <small>کارگزار، نوع و بازه مبلغ</small>
          </div>
        </button>
        <button
          type="button"
          class="facility-tab"
          :class="{ active: activeTab === 'terms', disabled: !canGoTermsTab }"
          :disabled="!canGoTermsTab"
          @click="activateTab('terms')"
        >
          <span class="facility-tab-badge">2</span>
          <div>
            <strong>شرایط بازپرداخت</strong>
            <small>ضمانت، سود، اقساط و بررسی</small>
          </div>
        </button>
        <button
          type="button"
          class="facility-tab"
          :class="{ active: activeTab === 'seo', disabled: !canGoTermsTab }"
          :disabled="!canGoTermsTab"
          @click="activateTab('seo')"
        >
          <span class="facility-tab-badge">3</span>
          <div>
            <strong>سئوی صفحه وام</strong>
            <small>meta title، description و canonical</small>
          </div>
        </button>
        <button
          type="button"
          class="facility-tab"
          :class="{ active: activeTab === 'docs', disabled: !canGoTermsTab }"
          :disabled="!canGoTermsTab"
          @click="activateTab('docs')"
        >
          <span class="facility-tab-badge">4</span>
          <div>
            <strong>مدارک مورد نیاز</strong>
            <small>مدارک لازم برای ثبت درخواست وام</small>
          </div>
        </button>
        <div v-if="form.id" class="editing-chip">
          <i class="fa-solid fa-pen-to-square"></i>
          در حال ویرایش {{ editingLabel }}
        </div>
      </div>

      <div v-if="optionLoading" class="spinner-overlay compact-spinner">
        <i class="fa-solid fa-spinner"></i>
        <span>در حال بارگذاری گزینه ها...</span>
      </div>

      <template v-else>
        <div v-if="activeTab === 'details'" class="row g-3">
          <div class="col-12 col-xl-4">
            <label class="form-label form-label-required">کارگزار</label>
            <Select2Input
              v-model="form.brokerId"
              :options="brokerSelectOptions"
              label-key="label"
              value-key="id"
              number
              placeholder="انتخاب کارگزار تایید شده"
            />
            <div class="field-note" v-if="selectedBroker">سطح احراز: {{ selectedBroker.verifyLevel }} | {{ selectedBroker.phone }}</div>
          </div>
          <div class="col-12 col-xl-4">
            <label class="form-label form-label-required">عنوان امتیاز وام</label>
            <input v-model="form.title" class="form-control" maxlength="255" placeholder="مثلا امتیاز وام بانک مهر" />
          </div>
          <div class="col-12 col-xl-4">
            <label class="form-label form-label-required">نوع وام</label>
            <select v-model="form.subTypeId" class="form-select">
              <option value="">انتخاب نوع وام</option>
              <option v-for="loanType in options.loanTypes" :key="loanType.id" :value="loanType.id">{{ loanType.title }} - {{ loanType.typeLabel }}</option>
            </select>
          </div>

          <div class="col-12 col-md-6 col-xl-3">
            <label class="form-label form-label-required">حداقل مبلغ</label>
            <div class="input-group amount-group">
              <input v-model="form.minAmount" type="number" :min="amountLimits.min" :max="amountLimits.max" class="form-control" placeholder="1000000" />
              <span class="input-group-text">تومان</span>
            </div>
            <small v-if="Number(form.minAmount)" class="text-muted d-block mt-1">{{ formatMoney(form.minAmount) }}</small>
          </div>
          <div class="col-12 col-md-6 col-xl-3">
            <label class="form-label form-label-required">حداکثر مبلغ</label>
            <div class="input-group amount-group">
              <input v-model="form.maxAmount" type="number" :min="amountLimits.min" :max="amountLimits.max" class="form-control" placeholder="50000000" />
              <span class="input-group-text">تومان</span>
            </div>
            <small v-if="Number(form.maxAmount)" class="text-muted d-block mt-1">{{ formatMoney(form.maxAmount) }}</small>
          </div>
          <div class="col-12 col-md-6 col-xl-3">
            <label class="form-label form-label-required">مهلت برداشت</label>
            <div class="input-group amount-group">
              <input v-model="form.withdrawDeadline" type="number" min="1" class="form-control" placeholder="30" />
              <span class="input-group-text">روز</span>
            </div>
          </div>
          <div class="col-12 col-md-6 col-xl-3">
            <label class="form-label form-label-optional">متوسط زمان بررسی</label>
            <div class="input-group amount-group">
              <input v-model="form.averageReviewHours" type="number" min="0" max="9999" class="form-control" placeholder="24" />
              <span class="input-group-text">ساعت</span>
            </div>
          </div>
          <div class="col-12 col-md-6 col-xl-3">
            <label class="form-label form-label-required">نوع پرداخت</label>
            <select v-model="form.paymentType" class="form-select">
              <option v-for="item in options.paymentTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>

          <div class="col-12">
            <div class="amount-hint-card">
              <i class="fa-solid fa-scale-balanced"></i>
              <span>{{ amountLimitText }}</span>
            </div>
          </div>

          <div class="col-12 col-xl-6">
            <label class="form-label form-label-optional">روش اعتبارسنجی</label>
            <select v-model="form.validationId" class="form-select">
              <option value="">بدون روش اعتبارسنجی</option>
              <option v-for="item in options.validations" :key="item.id" :value="item.id">{{ item.title }}</option>
            </select>
          </div>
          <div class="col-12 col-xl-6">
            <div class="info-panel">
              <div class="info-panel-title">خلاصه انتخاب</div>
              <div class="info-panel-line">کارگزار: <strong>{{ selectedBroker?.name || '-' }}</strong></div>
              <div class="info-panel-line">نوع وام: <strong>{{ selectedLoanType?.title || '-' }}</strong></div>
              <div class="info-panel-line">بازه مبلغ: <strong>{{ formatMoney(form.minAmount) }} تا {{ formatMoney(form.maxAmount) }}</strong></div>
            </div>
          </div>

          <div class="col-12">
            <label class="form-label form-label-optional">توضیحات</label>
            <textarea v-model="form.body" rows="3" class="form-control" maxlength="4000" placeholder="توضیح کامل درباره شرایط این امتیاز وام"></textarea>
          </div>

          <div class="col-12 d-flex justify-content-end gap-2 flex-wrap">
            <button v-if="form.id" type="button" class="btn btn-outline-secondary" @click="resetForm">
              <i class="fa-solid fa-xmark me-1"></i> انصراف
            </button>
            <button type="button" class="btn btn-primary" :disabled="!canGoTermsTab" @click="activateTab('terms')">
              <i class="fa-solid fa-arrow-left me-1"></i> ادامه به تب شرایط
            </button>
          </div>
        </div>

        <div v-else-if="activeTab === 'terms'" class="row g-3">
          <div class="col-12 col-xl-6">
            <div class="facility-section-card h-100">
              <div class="section-card-head">
                <h2 class="section-card-title">ضمانت های موردنیاز</h2>
                <p class="section-card-subtitle">حداقل یک ضمانت را برای این امتیاز وام انتخاب کنید.</p>
              </div>
              <div class="check-grid">
                <button
                  v-for="item in options.guarantees"
                  :key="item.id"
                  type="button"
                  class="check-tile-btn"
                  :class="{ active: form.guaranteeIds.includes(Number(item.id)) }"
                  @click="toggleGuarantee(item.id)"
                >
                  <div class="check-tile-head">
                    <span class="check-indicator"><i class="fa-solid" :class="form.guaranteeIds.includes(Number(item.id)) ? 'fa-check' : 'fa-plus'"></i></span>
                    <strong>{{ item.title }}</strong>
                  </div>
                  <small>{{ item.help || 'بدون توضیح' }}</small>
                </button>
              </div>
            </div>
          </div>

          <div class="col-12 col-xl-6 d-grid gap-3">
            <div class="facility-section-card">
              <div class="section-card-head">
                <h2 class="section-card-title">درصد سود ها</h2>
                <p class="section-card-subtitle">می توانید چند درصد سود برای یک امتیاز ثبت کنید.</p>
              </div>
              <div class="entry-box">
                <div class="entry-row">
                  <input v-model="profitInput" type="number" min="0.01" step="0.01" class="form-control" placeholder="مثلا 18" @keyup.enter.prevent="addProfit" />
                  <button type="button" class="btn btn-outline-primary" @click="addProfit">
                    <i class="fa-solid fa-plus me-1"></i> افزودن
                  </button>
                </div>
                <div v-if="form.profits.length" class="chip-list mt-3">
                  <button v-for="value in form.profits" :key="`profit-${value}`" type="button" class="value-chip" @click="removeProfit(value)">
                    {{ value }}%
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <div v-else class="entry-empty">هنوز درصد سودی اضافه نشده است.</div>
              </div>
            </div>

            <div class="facility-section-card installment-card">
              <div class="section-card-head">
                <h2 class="section-card-title">تعداد اقساط</h2>
                <p class="section-card-subtitle">پلن های بازپرداخت را به صورت کامل و بدون برش در این بخش ثبت کنید.</p>
              </div>
              <div class="entry-box">
                <div class="entry-row entry-row-wide">
                  <input v-model="installmentInput" type="number" min="1" class="form-control" placeholder="مثلا 24" @keyup.enter.prevent="addInstallment" />
                  <button type="button" class="btn btn-outline-primary" @click="addInstallment">
                    <i class="fa-solid fa-plus me-1"></i> افزودن قسط
                  </button>
                </div>
                <div class="field-note">مثال: 12، 24 یا 36 ماه</div>
                <div v-if="form.installments.length" class="chip-list mt-3">
                  <button v-for="value in form.installments" :key="`installment-${value}`" type="button" class="value-chip value-chip-alt" @click="removeInstallment(value)">
                    {{ value }} ماه
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <div v-else class="entry-empty">هنوز پلن اقساطی اضافه نشده است.</div>
              </div>
            </div>
          </div>

          <div v-if="form.id" class="col-12">
            <div class="review-card">
              <div class="section-card-head">
                <h2 class="section-card-title">بررسی نهایی ادمین</h2>
                <p class="section-card-subtitle">برای تایید یا رد، دلیل بررسی را ثبت کنید.</p>
              </div>
              <label class="form-label form-label-required">دلیل بررسی</label>
              <textarea v-model="reviewReason" rows="3" class="form-control" maxlength="5000" placeholder="مثلا مدارک و شرایط این امتیاز وام کامل و قابل انتشار است"></textarea>
              <div class="mt-3 d-flex gap-2 flex-wrap">
                <button type="button" class="btn btn-success" :disabled="reviewLoading" @click="submitReview('published')">
                  <i v-if="reviewLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
                  <i v-else class="fa-solid fa-circle-check me-1"></i> تایید
                </button>
                <button type="button" class="btn btn-outline-danger" :disabled="reviewLoading" @click="submitReview('rejected')">
                  <i v-if="reviewLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
                  <i v-else class="fa-solid fa-ban me-1"></i> رد
                </button>
              </div>
            </div>
          </div>

          <div class="col-12 d-flex justify-content-between gap-2 flex-wrap">
            <button type="button" class="btn btn-outline-secondary" @click="activateTab('details')">
              <i class="fa-solid fa-arrow-right me-1"></i> بازگشت به اطلاعات پایه
            </button>
            <div class="d-flex gap-2 flex-wrap">
              <button type="button" class="btn btn-outline-primary" :disabled="!canGoTermsTab" @click="activateTab('seo')">
                <i class="fa-solid fa-globe me-1"></i> تب سئو
              </button>
              <button v-if="form.id" type="button" class="btn btn-outline-secondary" @click="resetForm">
                <i class="fa-solid fa-xmark me-1"></i> انصراف
              </button>
              <button type="button" class="btn btn-primary" :disabled="saving" @click="submit">
                <i v-if="saving" class="fa-solid fa-spinner fa-spin me-1"></i>
                <i v-else class="fa-solid fa-floppy-disk me-1"></i>
                {{ form.id ? 'بروزرسانی امتیاز وام' : 'ثبت امتیاز وام' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'seo'" class="row g-3">
          <div class="col-12 col-xl-7">
            <div class="facility-section-card h-100">
              <div class="section-card-head">
                <h2 class="section-card-title">تنظیمات سئو برای صفحه وام</h2>
                <p class="section-card-subtitle">این فیلدها فقط در پنل ادمین قابل ویرایش هستند و برای صفحه عمومی وام استفاده می‌شوند.</p>
              </div>

              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label form-label-optional">عنوان متا</label>
                  <input v-model="form.seoTitle" class="form-control" maxlength="255" placeholder="مثلا امتیاز وام بانک مهر | دی جی وام" />
                </div>
                <div class="col-12">
                  <label class="form-label form-label-optional">توضیحات متا</label>
                  <textarea v-model="form.seoDescription" rows="4" class="form-control" maxlength="1000" placeholder="توضیح کوتاه برای نتایج گوگل و شبکه های اجتماعی"></textarea>
                </div>
                <div class="col-12">
                  <label class="form-label form-label-optional">کلیدواژه ها</label>
                  <textarea v-model="form.seoKeywords" rows="2" class="form-control" maxlength="1000" placeholder="وام, امتیاز وام, بانک مهر"></textarea>
                </div>
                <div class="col-12 col-xl-8">
                  <label class="form-label form-label-optional">Canonical URL</label>
                  <input v-model="form.seoCanonicalUrl" class="form-control" maxlength="500" dir="ltr" placeholder="https://example.com/market/slug" />
                </div>
                <div class="col-12 col-xl-4">
                  <label class="form-label form-label-optional">Robots</label>
                  <input v-model="form.seoRobots" class="form-control" maxlength="120" dir="ltr" placeholder="index,follow" />
                </div>
                <div class="col-12"><hr class="my-2"></div>
                <div class="col-12">
                  <div class="section-card-head mb-0">
                    <h2 class="section-card-title">محتوای مودال اعتبارسنجی</h2>
                    <p class="section-card-subtitle">این متن‌ها در صفحه عمومی وام برای معرفی روش اعتبارسنجی نمایش داده می‌شوند.</p>
                  </div>
                </div>
                <div class="col-12 col-xl-6">
                  <label class="form-label form-label-optional">عنوان معرفی</label>
                  <input v-model="form.validationIntroTitle" class="form-control" maxlength="255" placeholder="مثلا اعتبارسنجی سریع و آنلاین" />
                </div>
                <div class="col-12 col-xl-6">
                  <label class="form-label form-label-optional">برچسب مراحل</label>
                  <input v-model="form.validationStepsLabel" class="form-control" maxlength="120" placeholder="مثلا مراحل انجام کار" />
                </div>
                <div class="col-12">
                  <label class="form-label form-label-optional">توضیح معرفی</label>
                  <textarea v-model="form.validationIntroDescription" rows="4" class="form-control" maxlength="2000" placeholder="شرح کوتاه درباره این روش اعتبارسنجی"></textarea>
                </div>
                <div class="col-12">
                  <label class="form-label form-label-optional">ویژگی‌ها و خطوط توضیحی</label>
                  <textarea v-model="form.validationFeatureLines" rows="5" class="form-control" maxlength="2500" placeholder="هر خط یک مورد جداگانه خواهد بود"></textarea>
                  <div class="field-note">هر خط به صورت جداگانه در لیست ویژگی‌های اعتبارسنجی نمایش داده می‌شود.</div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-xl-5">
            <div class="info-panel h-100">
              <div class="info-panel-title">پیش نمایش خلاصه</div>
              <div class="info-panel-line">عنوان نمایش: <strong>{{ form.seoTitle || form.title || '-' }}</strong></div>
              <div class="info-panel-line">توضیح: <strong>{{ form.seoDescription || form.body || 'از توضیحات عمومی وام استفاده می‌شود' }}</strong></div>
              <div class="info-panel-line">کلیدواژه: <strong>{{ form.seoKeywords || 'به صورت پیش فرض از عنوان وام ساخته می‌شود' }}</strong></div>
              <div class="info-panel-line">Canonical: <strong dir="ltr">{{ form.seoCanonicalUrl || 'auto' }}</strong></div>
              <div class="info-panel-line">Robots: <strong dir="ltr">{{ form.seoRobots || 'index,follow' }}</strong></div>
              <hr>
              <div class="info-panel-line">عنوان اعتبارسنجی: <strong>{{ form.validationIntroTitle || 'از متن پیش فرض استفاده می‌شود' }}</strong></div>
              <div class="info-panel-line">توضیح اعتبارسنجی: <strong>{{ form.validationIntroDescription || 'از متن پیش فرض استفاده می‌شود' }}</strong></div>
              <div class="info-panel-line">برچسب مراحل: <strong>{{ form.validationStepsLabel || 'از متن پیش فرض استفاده می‌شود' }}</strong></div>
              <div class="info-panel-line">تعداد خطوط ویژگی: <strong>{{ form.validationFeatureLines ? form.validationFeatureLines.split(/\r?\n/).filter(Boolean).length : 0 }}</strong></div>
            </div>
          </div>

          <div class="col-12 d-flex justify-content-between gap-2 flex-wrap">
            <button type="button" class="btn btn-outline-secondary" @click="activateTab('terms')">
              <i class="fa-solid fa-arrow-right me-1"></i> بازگشت به شرایط بازپرداخت
            </button>
            <div class="d-flex gap-2 flex-wrap">
              <button type="button" class="btn btn-outline-secondary" @click="activateTab('docs')">
                <i class="fa-solid fa-arrow-left me-1"></i> مدارک مورد نیاز
              </button>
              <button v-if="form.id" type="button" class="btn btn-outline-secondary" @click="resetForm">
                <i class="fa-solid fa-xmark me-1"></i> انصراف
              </button>
              <button type="button" class="btn btn-primary" :disabled="saving" @click="submit">
                <i v-if="saving" class="fa-solid fa-spinner fa-spin me-1"></i>
                <i v-else class="fa-solid fa-floppy-disk me-1"></i>
                {{ form.id ? 'بروزرسانی امتیاز وام' : 'ثبت امتیاز وام' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'docs'" class="row g-3">
          <div class="col-12">
            <div class="facility-section-card">
              <div class="section-card-head">
                <h2 class="section-card-title">مدارک مورد نیاز</h2>
                <p class="section-card-subtitle">مدارکی که مشتری برای ثبت درخواست این وام باید ارائه دهد. موارد مورد نیاز را انتخاب کنید.</p>
              </div>

              <div v-if="!options.loanDocuments.length" class="text-muted text-center py-4">
                هیچ مدرکی با موضوع «وام» در سیستم ثبت نشده است. ابتدا از بخش مدارک، مدرک جدید با موضوع «وام» بسازید.
              </div>

              <div v-else class="document-select-grid">
                <label
                  v-for="doc in options.loanDocuments"
                  :key="doc.id"
                  class="document-select-item"
                  :class="{ selected: form.documentIds.includes(doc.id) }"
                >
                  <input
                    type="checkbox"
                    :checked="form.documentIds.includes(doc.id)"
                    @change="toggleDocument(doc.id)"
                    class="form-check-input"
                  />
                  <div class="document-select-info">
                    <strong>{{ doc.title }}</strong>
                    <small>{{ doc.type === 'file' ? 'فایل' : doc.type === 'text' ? 'متن' : doc.type === 'number' ? 'عدد' : doc.type === 'date' ? 'تاریخ' : doc.type }} &middot; {{ doc.required ? 'الزامی' : 'اختیاری' }}</small>
                  </div>
                </label>
              </div>

              <div v-if="form.documentIds.length" class="mt-3 text-muted">
                <i class="fa-solid fa-circle-info me-1"></i>
                {{ form.documentIds.length }} مدرک انتخاب شده
              </div>
            </div>
          </div>

          <div class="col-12 d-flex justify-content-between gap-2 flex-wrap">
            <button type="button" class="btn btn-outline-secondary" @click="activateTab('seo')">
              <i class="fa-solid fa-arrow-right me-1"></i> بازگشت به سئو
            </button>
            <div class="d-flex gap-2 flex-wrap">
              <button v-if="form.id" type="button" class="btn btn-outline-secondary" @click="resetForm">
                <i class="fa-solid fa-xmark me-1"></i> انصراف
              </button>
              <button type="button" class="btn btn-primary" :disabled="saving" @click="submit">
                <i v-if="saving" class="fa-solid fa-spinner fa-spin me-1"></i>
                <i v-else class="fa-solid fa-floppy-disk me-1"></i>
                {{ form.id ? 'بروزرسانی امتیاز وام' : 'ثبت امتیاز وام' }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="card facility-card">
      <div class="filter-row">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input v-model="search" class="form-control search-input" placeholder="جستجو در عنوان، اسلاگ، نوع وام یا کارگزار" @keyup.enter="applyFilters" />
        </div>
        <select v-model="statusFilter" class="form-select compact-select" @change="applyFilters">
          <option value="">همه وضعیت ها</option>
          <option v-for="item in options.statuses" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <select v-model="typeFilter" class="form-select compact-select" @change="applyFilters">
          <option value="">همه نوع ها</option>
          <option value="banking">بانکی</option>
          <option value="none_banking">غیر بانکی</option>
        </select>
        <Select2Input
          v-model="brokerFilter"
          :options="brokerSelectOptions"
          label-key="label"
          value-key="id"
          number
          placeholder="همه کارگزاران"
        />
        <button class="btn btn-outline-secondary" @click="clearFilters">
          <i class="fa-solid fa-rotate-left me-1"></i> پاکسازی
        </button>
        <button class="btn btn-outline-secondary" :disabled="exportLoading || loading" @click="exportFacilitiesToExcel">
          <i v-if="exportLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
          <i v-else class="fa-solid fa-file-excel me-1"></i> خروجی اکسل
        </button>
      </div>

      <div v-if="loading" class="spinner-overlay">
        <i class="fa-solid fa-spinner"></i>
        <span>در حال بارگذاری امتیازهای وام...</span>
      </div>
      <div v-else-if="!items.length" class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>امتیاز وامی ثبت نشده است</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table table-striped align-middle mb-0">
          <thead>
            <tr>
              <th>شماره</th>
              <th>عنوان</th>
              <th>کارگزار</th>
              <th>نوع وام</th>
              <th>بازه مبلغ</th>
              <th>بازدید</th>
              <th>نشان‌شده</th>
              <th>وضعیت</th>
              <th>دلیل بررسی</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>#{{ item.id }}</td>
              <td>
                <div class="fw-bold">{{ item.title }}</div>
                <div class="small text-muted" dir="ltr">/{{ item.slug }}</div>
              </td>
              <td>
                <div class="fw-semibold">{{ item.brokerName }}</div>
                <div class="small text-muted">{{ item.brokerPhone }}</div>
              </td>
              <td>
                <div class="fw-semibold">{{ item.loanTypeTitle }}</div>
                <div class="small text-muted">{{ item.typeLabel }}</div>
              </td>
              <td>{{ formatMoney(item.minAmount) }} تا {{ formatMoney(item.maxAmount) }}</td>
              <td>{{ formatNumber(item.views) }}</td>
              <td>{{ formatNumber(item.bookmarkCount) }}</td>
              <td>
                <span class="type-chip" :class="statusClassMap[item.status] || 'chip-gray'">{{ item.statusLabel }}</span>
              </td>
              <td>
                <div class="reason-box">{{ item.resultReason || '-' }}</div>
              </td>
              <td>
                <div class="d-flex gap-2 flex-wrap">
                  <button class="btn btn-sm btn-outline-primary" @click="editItem(item)">
                    <i class="fa-solid fa-pen me-1"></i> ویرایش
                  </button>
                  <button class="btn btn-sm btn-outline-danger" :disabled="deleting" @click="removeItem(item.id)">
                    <i class="fa-solid fa-trash-can me-1"></i> حذف
                  </button>
                </div>
                <div class="small text-muted mt-2">{{ formatDate(item.updatedAt) }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AppPagination :page="page" :limit="limit" :total="total" :disabled="loading" @change="changePage" />
    </div>
  </div>
</template>

<style scoped src="./styles/FacilitiesView.css"></style>
