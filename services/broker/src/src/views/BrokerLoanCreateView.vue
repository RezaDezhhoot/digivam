<script setup>
import { computed, onMounted, ref } from 'vue';
import AppPagination from '../components/AppPagination.vue';
import {
  createBrokerFacility,
  getBrokerFacilities,
  getBrokerFacilityOptions,
  getBrokerFacilitySummary,
  updateBrokerFacility
} from '../services/broker-facility.api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();

const loading = ref(false);
const optionLoading = ref(false);
const saving = ref(false);
const activeTab = ref('details');
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const search = ref('');
const statusFilter = ref('');
const profitInput = ref('');
const installmentInput = ref('');
const items = ref([]);
const summary = ref({ total: 0, pending: 0, published: 0, rejected: 0, inProgress: 0, expired: 0, totalViews: 0 });
const options = ref({
  broker: { canSubmit: false, verifyLevel: 0 },
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
  status: 'pending',
  resultReason: ''
});

const form = ref(createEmptyForm());

const moneyFormatter = new Intl.NumberFormat('fa-IR');
const formatNumber = (value) => moneyFormatter.format(Number(value || 0));
const formatMoney = (value) => `${formatNumber(value)} تومان`;
const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');

const canSubmit = computed(() => Boolean(options.value.broker?.canSubmit));
const amountLimits = computed(() => options.value.amountLimits || { min: 1000, max: 999999999999999 });
const amountLimitText = computed(() => `بازه مجاز سامانه از ${formatMoney(amountLimits.value.min)} تا ${formatMoney(amountLimits.value.max)} است.`);
const canGoTermsTab = computed(() => (
  form.value.title.trim() &&
  form.value.subTypeId &&
  Number(form.value.minAmount) >= Number(amountLimits.value.min || 1000) &&
  Number(form.value.maxAmount) >= Number(amountLimits.value.min || 1000) &&
  Number(form.value.withdrawDeadline) > 0
));

const statusClassMap = {
  pending: 'chip-yellow',
  published: 'chip-green',
  rejected: 'chip-red',
  in_progress: 'chip-blue',
  expired: 'chip-gray'
};

const selectedLoanType = computed(() =>
  options.value.loanTypes.find((item) => Number(item.id) === Number(form.value.subTypeId)) || null
);

const editingLabel = computed(() => (form.value.id ? `${form.value.title || 'بدون عنوان'} - #${form.value.id}` : ''));

const summaryCards = computed(() => [
  { label: 'کل امتیازها', value: summary.value.total, icon: 'fa-solid fa-file-invoice-dollar', tone: 'neutral', desc: 'تمام ثبت های شما در این بخش نگهداری می شود.' },
  { label: 'در حال بررسی', value: summary.value.pending, icon: 'fa-solid fa-hourglass-half', tone: 'warning', desc: 'منتظر تایید یا رد توسط ادمین' },
  { label: 'تایید شده', value: summary.value.published, icon: 'fa-solid fa-circle-check', tone: 'success', desc: 'ثبت های آماده استفاده' },
  { label: 'رد شده', value: summary.value.rejected, icon: 'fa-solid fa-circle-xmark', tone: 'danger', desc: 'مواردی که نیاز به اصلاح دارند' },
  { label: 'جاری', value: summary.value.inProgress, icon: 'fa-solid fa-spinner', tone: 'info', desc: 'امتیازهای در جریان' },
  { label: 'منقضی', value: summary.value.expired, icon: 'fa-solid fa-calendar-xmark', tone: 'muted', desc: 'موارد خارج از بازه استفاده' },
  { label: 'کل بازدیدها', value: summary.value.totalViews, icon: 'fa-solid fa-chart-column', tone: 'views', desc: 'تعداد بازدید همه ثبت های شما' }
]);

const resetForm = () => {
  form.value = createEmptyForm();
  profitInput.value = '';
  installmentInput.value = '';
  activeTab.value = 'details';
};

const activateTab = (tab) => {
  if ((tab === 'terms' || tab === 'docs') && !canGoTermsTab.value) {
    return;
  }

  activeTab.value = tab;
};

const buildQuery = () => {
  const params = new URLSearchParams({ page: String(page.value), limit: String(limit.value) });

  if (search.value.trim()) {
    params.set('search', search.value.trim());
  }

  if (statusFilter.value) {
    params.set('status', statusFilter.value);
  }

  return `?${params.toString()}`;
};

const loadOptions = async () => {
  optionLoading.value = true;
  try {
    const data = await getBrokerFacilityOptions();
    options.value = {
      broker: data.broker || { canSubmit: false, verifyLevel: 0 },
      guarantees: data.guarantees || [],
      loanTypes: data.loanTypes || [],
      validations: data.validations || [],
      paymentTypes: data.paymentTypes || [],
      statuses: data.statuses || [],
      loanDocuments: data.loanDocuments || [],
      amountLimits: data.amountLimits || options.value.amountLimits
    };
    form.value.paymentType = options.value.paymentTypes[0]?.value || 'cash';
  } catch (error) {
    toast.error(error.message);
  } finally {
    optionLoading.value = false;
  }
};

const loadSummary = async () => {
  try {
    const data = await getBrokerFacilitySummary();
    summary.value = data.summary || summary.value;
  } catch (error) {
    toast.error(error.message);
  }
};

const load = async () => {
  loading.value = true;
  try {
    const data = await getBrokerFacilities(buildQuery());
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

const reloadAll = async () => {
  await Promise.all([load(), loadSummary()]);
};

const applyFilters = async () => {
  page.value = 1;
  await load();
};

const clearFilters = async () => {
  search.value = '';
  statusFilter.value = '';
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
  if (!Number.isFinite(value) || value <= 0) {
    return;
  }
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
  if (!Number.isInteger(value) || value <= 0) {
    return;
  }
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
  averageReviewHours: form.value.averageReviewHours ? Number(form.value.averageReviewHours) : null
});

const submit = async () => {
  if (!canSubmit.value) {
    toast.error('برای ثبت امتیاز وام باید احراز هویت نهایی شما تکمیل شده باشد');
    return;
  }

  saving.value = true;
  try {
    const payload = toPayload();

    if (form.value.id) {
      await updateBrokerFacility(form.value.id, payload);
      toast.success('امتیاز وام بروزرسانی شد و دوباره به بررسی رفت');
    } else {
      await createBrokerFacility(payload);
      toast.success('امتیاز وام ثبت شد و در صف بررسی قرار گرفت');
    }

    resetForm();
    await reloadAll();
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.value = false;
  }
};

const editItem = (item) => {
  if (!canSubmit.value) {
    return;
  }

  form.value = {
    id: item.id,
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
    status: item.status || 'pending',
    resultReason: item.resultReason || ''
  };
  profitInput.value = '';
  installmentInput.value = '';
  activeTab.value = 'details';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

onMounted(async () => {
  await Promise.all([loadOptions(), reloadAll()]);
});
</script>

<template>
  <section class="animate-in">
    <div class="page-header">
      <div class="page-header-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
      <div>
        <h1 class="page-header-title">ثبت امتیاز وام</h1>
        <p class="page-header-desc">فرم ثبت به صورت تب بندی شده است و هر ویرایش دوباره به وضعیت در حال بررسی برمی گردد.</p>
      </div>
    </div>

    <div class="summary-grid mt-3 mb-3">
      <div v-for="item in summaryCards" :key="item.label" class="summary-card" :class="`summary-card-${item.tone}`">
        <div class="summary-icon"><i :class="item.icon"></i></div>
        <p class="summary-label">{{ item.label }}</p>
        <h2 class="summary-value">{{ formatNumber(item.value) }}</h2>
        <p class="summary-desc">{{ item.desc }}</p>
      </div>
    </div>

    <div v-if="optionLoading" class="content-card">
      <div class="spinner-overlay"><i class="fa-solid fa-spinner fa-spin"></i> در حال بارگذاری فرم...</div>
    </div>

    <template v-else>
      <div v-if="!canSubmit" class="content-card locked-panel mb-3">
        <div class="locked-icon"><i class="fa-solid fa-lock"></i></div>
        <div class="locked-copy">
          <h2 class="locked-title">ثبت امتیاز وام برای شما فعال نیست</h2>
          <p class="locked-desc">تنها کارگزارانی که احراز هویت نهایی را کامل کرده‌اند می‌توانند امتیاز وام ثبت یا ویرایش کنند. سطح فعلی شما {{ options.broker.verifyLevel || 0 }} است.</p>
        </div>
        <router-link class="btn btn-primary" to="/profile">
          <i class="fa-solid fa-user-pen me-1"></i> تکمیل پروفایل
        </router-link>
      </div>

      <div class="content-card mb-3">
        <div class="facility-tab-row">
          <button type="button" class="facility-tab" :class="{ active: activeTab === 'details' }" @click="activateTab('details')">
            <span class="facility-tab-badge">1</span>
            <div>
              <strong>اطلاعات پایه</strong>
              <small>عنوان، نوع و بازه مبلغ</small>
            </div>
          </button>
          <button type="button" class="facility-tab" :class="{ active: activeTab === 'terms', disabled: !canGoTermsTab }" :disabled="!canGoTermsTab" @click="activateTab('terms')">
            <span class="facility-tab-badge">2</span>
            <div>
              <strong>شرایط بازپرداخت</strong>
              <small>ضمانت، سود و اقساط</small>
            </div>
          </button>
          <button type="button" class="facility-tab" :class="{ active: activeTab === 'docs', disabled: !canGoTermsTab }" :disabled="!canGoTermsTab" @click="activateTab('docs')">
            <span class="facility-tab-badge">3</span>
            <div>
              <strong>مدارک مورد نیاز</strong>
              <small>مدارک لازم برای درخواست</small>
            </div>
          </button>
          <div v-if="form.id" class="editing-chip">
            <i class="fa-solid fa-pen-to-square"></i>
            در حال ویرایش {{ editingLabel }}
          </div>
        </div>

        <div v-if="activeTab === 'details'" class="row g-3">
          <div class="col-12 col-lg-6">
            <label class="form-label form-label-required">عنوان امتیاز وام</label>
            <input v-model="form.title" class="form-control" maxlength="255" placeholder="مثلا امتیاز وام خرید کالا" />
          </div>
          <div class="col-12 col-lg-6">
            <label class="form-label form-label-required">نوع وام</label>
            <select v-model="form.subTypeId" class="form-select">
              <option value="">انتخاب نوع وام</option>
              <option v-for="loanType in options.loanTypes" :key="loanType.id" :value="loanType.id">{{ loanType.title }} - {{ loanType.typeLabel }}</option>
            </select>
          </div>
          <div class="col-12 col-md-6 col-lg-4">
            <label class="form-label form-label-required">حداقل مبلغ</label>
            <div class="input-group amount-group">
              <input v-model="form.minAmount" type="number" :min="amountLimits.min" :max="amountLimits.max" class="form-control" placeholder="1000000" />
              <span class="input-group-text">تومان</span>
            </div>
          </div>
          <div class="col-12 col-md-6 col-lg-4">
            <label class="form-label form-label-required">حداکثر مبلغ</label>
            <div class="input-group amount-group">
              <input v-model="form.maxAmount" type="number" :min="amountLimits.min" :max="amountLimits.max" class="form-control" placeholder="50000000" />
              <span class="input-group-text">تومان</span>
            </div>
          </div>
          <div class="col-12 col-md-6 col-lg-4">
            <label class="form-label form-label-required">مهلت برداشت</label>
            <div class="input-group amount-group">
              <input v-model="form.withdrawDeadline" type="number" min="1" class="form-control" placeholder="30" />
              <span class="input-group-text">روز</span>
            </div>
          </div>
          <div class="col-12 col-md-6 col-lg-4">
            <label class="form-label form-label-optional">متوسط زمان بررسی</label>
            <div class="input-group amount-group">
              <input v-model="form.averageReviewHours" type="number" min="0" max="9999" class="form-control" placeholder="24" />
              <span class="input-group-text">ساعت</span>
            </div>
          </div>
          <div class="col-12">
            <div class="amount-hint-card">
              <i class="fa-solid fa-scale-balanced"></i>
              <span>{{ amountLimitText }}</span>
            </div>
          </div>
          <div class="col-12 col-lg-6">
            <label class="form-label form-label-required">نوع پرداخت</label>
            <select v-model="form.paymentType" class="form-select">
              <option v-for="item in options.paymentTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
          <div class="col-12 col-lg-6">
            <label class="form-label form-label-optional">روش اعتبارسنجی</label>
            <select v-model="form.validationId" class="form-select">
              <option value="">بدون روش اعتبارسنجی</option>
              <option v-for="item in options.validations" :key="item.id" :value="item.id">{{ item.title }}</option>
            </select>
          </div>
          <div class="col-12 col-lg-6">
            <div class="info-panel">
              <div class="info-panel-title">خلاصه انتخاب</div>
              <div class="info-panel-line">نوع وام: <strong>{{ selectedLoanType?.title || '-' }}</strong></div>
              <div class="info-panel-line">بازه مبلغ: <strong>{{ formatMoney(form.minAmount) }} تا {{ formatMoney(form.maxAmount) }}</strong></div>
            </div>
          </div>
          <div class="col-12 col-lg-6">
            <div class="info-panel muted-panel">
              <div class="info-panel-title">یادداشت وضعیت</div>
              <div class="info-panel-line">هر ویرایش باعث می شود این مورد دوباره به <strong>در حال بررسی</strong> برگردد.</div>
              <div v-if="form.resultReason" class="info-panel-line">آخرین نظر ادمین: <strong>{{ form.resultReason }}</strong></div>
            </div>
          </div>
          <div class="col-12">
            <label class="form-label form-label-optional">توضیحات</label>
            <textarea v-model="form.body" rows="3" class="form-control" maxlength="4000" placeholder="توضیحات بیشتر درباره شرایط، مزایا یا محدودیت های این امتیاز"></textarea>
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
                <h2 class="section-card-title">ضمانت ها</h2>
                <p class="section-card-subtitle">حداقل یک ضمانت برای این امتیاز انتخاب کنید.</p>
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
                <p class="section-card-subtitle">برای افزودن، عدد را وارد و ثبت کنید.</p>
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
                <p class="section-card-subtitle">بخش ثبت اقساط بازطراحی شده تا همه ورودی ها کامل و بدون برش دیده شوند.</p>
              </div>
              <div class="entry-box">
                <div class="entry-row">
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

          <div class="col-12 d-flex justify-content-between gap-2 flex-wrap">
            <button type="button" class="btn btn-outline-secondary" @click="activateTab('details')">
              <i class="fa-solid fa-arrow-right me-1"></i> بازگشت به اطلاعات پایه
            </button>
            <button type="button" class="btn btn-primary" @click="activateTab('docs')">
              <i class="fa-solid fa-arrow-left me-1"></i> ادامه به مدارک مورد نیاز
            </button>
          </div>
        </div>

        <div v-else-if="activeTab === 'docs'" class="row g-3">
          <div class="col-12">
            <div class="facility-section-card">
              <div class="section-card-head">
                <h2 class="section-card-title">مدارک مورد نیاز</h2>
                <p class="section-card-subtitle">مدارکی که متقاضی باید هنگام درخواست وام ارائه دهد را انتخاب کنید.</p>
              </div>
              <div v-if="options.loanDocuments && options.loanDocuments.length" class="document-select-grid">
                <button
                  v-for="doc in options.loanDocuments"
                  :key="doc.id"
                  type="button"
                  class="document-select-item"
                  :class="{ active: form.documentIds.includes(Number(doc.id)) }"
                  @click="toggleDocument(doc.id)"
                >
                  <span class="check-indicator"><i class="fa-solid" :class="form.documentIds.includes(Number(doc.id)) ? 'fa-check' : 'fa-plus'"></i></span>
                  <div class="document-select-info">
                    <strong>{{ doc.title }}</strong>
                    <small v-if="doc.help">{{ doc.help }}</small>
                  </div>
                </button>
              </div>
              <div v-else class="text-muted small p-3">هیچ مدرکی تعریف نشده است.</div>
            </div>
          </div>

          <div class="col-12 d-flex justify-content-between gap-2 flex-wrap">
            <button type="button" class="btn btn-outline-secondary" @click="activateTab('terms')">
              <i class="fa-solid fa-arrow-right me-1"></i> بازگشت به تب شرایط
            </button>
            <div class="d-flex gap-2 flex-wrap">
              <button v-if="form.id" type="button" class="btn btn-outline-secondary" @click="resetForm">
                <i class="fa-solid fa-xmark me-1"></i> انصراف
              </button>
              <button type="button" class="btn btn-primary" :disabled="saving || !canSubmit" @click="submit">
                <i v-if="saving" class="fa-solid fa-spinner fa-spin me-1"></i>
                <i v-else class="fa-solid fa-floppy-disk me-1"></i>
                {{ form.id ? 'بروزرسانی امتیاز' : 'ثبت امتیاز' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="content-card">
        <div class="filter-row">
          <div class="search-box">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input v-model="search" class="form-control search-input" placeholder="جستجو در عنوان، اسلاگ یا نوع وام" @keyup.enter="applyFilters" />
          </div>
          <select v-model="statusFilter" class="form-select compact-select" @change="applyFilters">
            <option value="">همه وضعیت ها</option>
            <option v-for="item in options.statuses" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
          <button class="btn btn-outline-secondary" @click="clearFilters">
            <i class="fa-solid fa-rotate-left me-1"></i> پاکسازی
          </button>
        </div>

        <div v-if="loading" class="spinner-overlay"><i class="fa-solid fa-spinner fa-spin"></i> در حال بارگذاری...</div>
        <div v-else-if="!items.length" class="empty-card compact-empty mt-3">
          <i class="fa-solid fa-inbox empty-icon"></i>
          <h3>امتیاز وامی ثبت نشده است</h3>
          <p>پس از ثبت اولین امتیاز وام، لیست آن در اینجا نمایش داده می شود.</p>
        </div>
        <div v-else class="table-responsive mt-3">
          <table class="table table-striped align-middle mb-0">
            <thead>
              <tr>
                <th>شماره</th>
                <th>عنوان</th>
                <th>نوع وام</th>
                <th>بازه مبلغ</th>
                <th>بازدید</th>
                <th>نشان‌شده</th>
                <th>وضعیت</th>
                <th>نظر ادمین</th>
                <th>آخرین بروزرسانی</th>
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
                  <div class="fw-semibold">{{ item.loanTypeTitle }}</div>
                  <div class="small text-muted">{{ item.typeLabel }}</div>
                </td>
                <td>{{ formatMoney(item.minAmount) }} تا {{ formatMoney(item.maxAmount) }}</td>
                <td>{{ formatNumber(item.views) }}</td>
                <td>{{ formatNumber(item.bookmarkCount) }}</td>
                <td>
                  <span class="type-chip" :class="statusClassMap[item.status] || 'chip-gray'">{{ item.statusLabel }}</span>
                </td>
                <td class="reason-box">{{ item.resultReason || '-' }}</td>
                <td>{{ formatDate(item.updatedAt) }}</td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" :disabled="!canSubmit" @click="editItem(item)">
                    <i class="fa-solid fa-pen me-1"></i> ویرایش
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <AppPagination :page="page" :limit="limit" :total="total" :disabled="loading" @change="changePage" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface-color);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: var(--panel-shadow);
}

.page-header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--chip-bg);
  color: var(--brand-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.page-header-title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
}

.page-header-desc {
  font-size: 13px;
  color: var(--muted-text);
  margin: 2px 0 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.content-card,
.summary-card,
.empty-card {
  background: var(--surface-color);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 22px;
  box-shadow: var(--panel-shadow);
  position: relative;
}

.summary-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.summary-card-neutral { background: linear-gradient(160deg, rgba(219, 0, 0, 0.08), rgba(138, 0, 0, 0.02)); }
.summary-card-warning { background: linear-gradient(160deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.03)); }
.summary-card-success { background: linear-gradient(160deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.03)); }
.summary-card-danger { background: linear-gradient(160deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.03)); }
.summary-card-info { background: linear-gradient(160deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.03)); }
.summary-card-muted { background: linear-gradient(160deg, rgba(107, 114, 128, 0.12), rgba(107, 114, 128, 0.03)); }
.summary-card-views { background: linear-gradient(160deg, rgba(124, 58, 237, 0.12), rgba(124, 58, 237, 0.03)); }

.summary-icon {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(219, 0, 0, 0.12);
  color: var(--brand-primary);
  font-size: 22px;
  margin-bottom: 16px;
}

.summary-label {
  font-size: 13px;
  color: var(--muted-text);
  margin-bottom: 6px;
}

.summary-value {
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 800;
  margin: 0 0 10px;
}

.summary-desc {
  font-size: 13px;
  color: var(--muted-text);
  margin: 0;
  line-height: 1.9;
}

.locked-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.locked-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(219, 0, 0, 0.12);
  color: var(--brand-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.locked-copy {
  flex: 1;
  min-width: 260px;
}

.locked-title {
  font-size: 18px;
  font-weight: 800;
  margin: 0 0 6px;
}

.locked-desc {
  margin: 0;
  color: var(--muted-text);
  line-height: 1.9;
}

.facility-tab-row {
  display: flex;
  align-items: stretch;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.facility-tab {
  min-width: 240px;
  flex: 1 1 260px;
  border: 1px solid var(--panel-border);
  background: var(--surface-soft);
  border-radius: 18px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: right;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.facility-tab strong,
.facility-tab small {
  display: block;
}

.facility-tab small {
  color: var(--muted-text);
  margin-top: 4px;
}

.facility-tab:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--panel-shadow);
}

.facility-tab.active {
  border-color: rgba(219, 0, 0, 0.3);
  background: linear-gradient(135deg, rgba(219, 0, 0, 0.08), rgba(138, 0, 0, 0.06));
}

.facility-tab:disabled,
.facility-tab.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.facility-tab-badge {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid var(--panel-border);
  font-weight: 800;
  color: var(--brand-primary);
  flex-shrink: 0;
}

.editing-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: #fff1f2;
  color: #be123c;
  font-size: 12px;
  font-weight: 700;
}

.amount-group .input-group-text {
  background: var(--surface-soft);
  border-color: var(--panel-border);
  color: var(--muted-text);
  font-size: 12px;
  font-weight: 700;
}

.amount-hint-card,
.info-panel,
.facility-section-card {
  border: 1px solid var(--panel-border);
  border-radius: 18px;
  background: var(--surface-soft);
  padding: 18px;
  height: 100%;
}

.amount-hint-card {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted-text);
}

.amount-hint-card i {
  color: var(--brand-primary);
}

.muted-panel {
  background: rgba(138, 0, 0, 0.04);
}

.info-panel-title,
.section-card-title {
  font-size: 15px;
  font-weight: 800;
  margin: 0 0 8px;
}

.info-panel-line,
.field-note {
  font-size: 13px;
  color: var(--muted-text);
  margin-top: 8px;
}

.section-card-head {
  margin-bottom: 12px;
}

.section-card-subtitle {
  font-size: 12px;
  color: var(--muted-text);
  margin: 0;
}

.check-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.check-tile-btn {
  text-align: right;
  border: 1px solid var(--panel-border);
  background: var(--surface-color);
  border-radius: 14px;
  padding: 14px;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.check-tile-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--panel-shadow);
}

.check-tile-btn.active {
  border-color: rgba(219, 0, 0, 0.35);
  background: var(--chip-bg);
}

.check-tile-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.check-indicator {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(219, 0, 0, 0.08);
  color: var(--brand-primary);
}

.entry-box {
  min-height: 148px;
}

.entry-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: stretch;
}

.entry-row .btn {
  min-width: 132px;
}

.entry-empty {
  margin-top: 14px;
  border: 1px dashed var(--panel-border);
  border-radius: 14px;
  padding: 16px;
  color: var(--muted-text);
  background: rgba(255, 255, 255, 0.55);
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.value-chip {
  border: 1px solid #fee2e2;
  background: #fff1f2;
  color: #be123c;
  border-radius: 999px;
  padding: 8px 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}

.value-chip-alt {
  border-color: #fef3c7;
  background: #fff7ed;
  color: #b45309;
}

.filter-row {
  display: grid;
  grid-template-columns: 1fr 220px auto;
  gap: 12px;
  align-items: center;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted-text);
  font-size: 13px;
}

.search-input {
  padding-right: 36px;
}

.compact-select {
  min-width: 0;
}

.type-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.chip-yellow { background: #fef3c7; color: #b45309; }
.chip-green { background: #dcfce7; color: #166534; }
.chip-red { background: #ffe4e6; color: #be123c; }
.chip-blue { background: #dbeafe; color: #1d4ed8; }
.chip-gray { background: #e5e7eb; color: #4b5563; }

.reason-box {
  max-width: 240px;
  color: var(--muted-text);
  font-size: 13px;
  line-height: 1.8;
}

.empty-card {
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  color: var(--muted-text);
  opacity: 0.3;
  margin-bottom: 16px;
}

.empty-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.empty-card p {
  font-size: 14px;
  color: var(--muted-text);
  margin-bottom: 0;
  max-width: 440px;
  margin-inline: auto;
}

.compact-empty {
  padding: 48px 24px;
}

@media (max-width: 1199px) {
  .check-grid,
  .filter-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .content-card,
  .summary-card,
  .empty-card {
    padding: 18px;
  }

  .entry-row,
  .locked-panel {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .facility-tab {
    width: 100%;
  }
}

.document-select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
}

.document-select-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.65rem;
  background: var(--chip-bg);
  cursor: pointer;
  text-align: start;
  transition: border-color 0.15s, background 0.15s;
}

.document-select-item:hover {
  border-color: var(--bs-primary);
}

.document-select-item.active {
  border-color: var(--bs-primary);
  background: rgba(var(--bs-primary-rgb), 0.06);
}

.document-select-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.document-select-info strong {
  font-size: 0.92rem;
}

.document-select-info small {
  color: var(--bs-secondary-color);
  font-size: 0.82rem;
}
</style>
