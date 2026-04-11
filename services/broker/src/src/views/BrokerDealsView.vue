<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPagination from '../components/AppPagination.vue';
import BrokerDealContractStage from '../components/BrokerDealContractStage.vue';
import {
  getBrokerDeal,
  getBrokerDeals,
  getBrokerDealSummary,
  reviewBrokerDeal
} from '../services/broker-deal.api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();
const route = useRoute();
const router = useRouter();

const listLoading = ref(false);
const summaryLoading = ref(false);
const detailLoading = ref(false);
const actionLoading = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const items = ref([]);
const selectedItem = ref(null);
const activeStageTab = ref('base');
const resultHistoryOpen = ref(false);
const summary = ref({ total: 0, inProgress: 0, failed: 0, suspended: 0, done: 0, waitingCustomer: 0, waitingBroker: 0, waitingAdmin: 0, verifyBroker: 0 });
const filters = ref({ status: '', step: '' });
const reviewReason = ref('');
const localQuery = ref('');

const paymentMethodCatalog = [
  { value: 'cash', label: 'پرداخت نقدی', description: 'مشتری باید مبلغ تعیین شده را پرداخت نماید.' },
  { value: 'check', label: 'پرداخت با چک', description: 'مشتری باید اسناد چک یا سفته را بارگذاری کند.' }
];

const createReviewPaymentForm = () => ({
  cash: { enabled: true, amount: '', description: paymentMethodCatalog[0].description },
  check: { enabled: false, amount: '', description: paymentMethodCatalog[1].description }
});

const reviewPaymentForm = ref(createReviewPaymentForm());

const statusOptions = [
  { value: '', label: 'همه وضعیت ها' },
  { value: 'in_progress', label: 'در جریان' },
  { value: 'done', label: 'انجام شده' },
  { value: 'failed', label: 'ناموفق' },
  { value: 'suspended', label: 'متوقف' }
];

const stepOptions = [
  { value: '', label: 'همه مراحل' },
  { value: 'submit', label: 'ثبت مدارک' },
  { value: 'verify_broker', label: 'بررسی کارگزار' },
  { value: 'contract', label: 'قرارداد' },
  { value: 'payment', label: 'پرداخت' },
  { value: 'transfer', label: 'انتقال' },
  { value: 'verify_customer', label: 'تایید مشتری' },
  { value: 'finished', label: 'پایان معامله' }
];

const selectedId = computed(() => Number(route.params.id || 0) || null);
const filteredItems = computed(() => {
  const normalizedQuery = localQuery.value.trim().toLowerCase();

  if (!normalizedQuery) {
    return items.value;
  }

  return items.value.filter((item) => [
    item.id,
    item.facility?.title,
    item.customer?.name,
    item.customer?.phone,
    item.typeLabel,
    item.stepLabel,
    item.updatedAtLabel
  ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery)));
});

const summaryCards = computed(() => [
  { label: 'کل معاملات', value: summary.value.total, filters: { status: '', step: '' }, tone: 'neutral' },
  { label: 'در جریان', value: summary.value.inProgress, filters: { status: 'in_progress', step: '' }, tone: 'info' },
  { label: 'بررسی کارگزار', value: summary.value.verifyBroker, filters: { status: '', step: 'verify_broker' }, tone: 'warning' },
  { label: 'انجام شده', value: summary.value.done, filters: { status: 'done', step: '' }, tone: 'success' },
  { label: 'ناموفق', value: summary.value.failed, filters: { status: 'failed', step: '' }, tone: 'danger' }
]);

const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));
const formatMoney = (value) => `${formatNumber(value)} تومان`;
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

const formatDate = (value) => formatJalaliDate(value, { withTime: true });

const actorLabels = {
  admin: 'ادمین',
  broker: 'کارگزار',
  customer: 'مشتری',
  customer_broker: 'مشتری و کارگزار'
};

const actionLabels = {
  approve: 'تایید',
  reject: 'رد',
  submit: 'ارسال مدارک',
  create: 'ایجاد معامله',
  sign_contract: 'امضای قرارداد',
  update: 'بروزرسانی توسط ادمین',
  note: 'یادداشت ادمین'
};

const detailWizardSteps = computed(() => {
  if (Array.isArray(selectedItem.value?.wizardSteps) && selectedItem.value.wizardSteps.length) {
    return selectedItem.value.wizardSteps;
  }

  return [
    { key: 'base', title: 'اطلاعات پایه معامله', description: 'اطلاعات اصلی پرونده، طرفین و خلاصه مالی معامله.', state: 'available' },
    ...stepOptions
      .filter((item) => item.value)
      .map((item) => ({ key: item.value, title: item.label, description: 'جزئیات همین مرحله در این بخش نمایش داده می‌شود.', state: 'upcoming' }))
  ];
});

const selectedStageMeta = computed(() => detailWizardSteps.value.find((item) => item.key === activeStageTab.value) || detailWizardSteps.value[0] || null);

const activeStageSummary = computed(() => {
  const selected = selectedStageMeta.value;

  if (!selectedItem.value || !selected) {
    return '';
  }

  if (selected.key === 'base') {
    return 'در این تب، اطلاعات پایه پرونده، خلاصه مالی و مشخصات اصلی مشتری نمایش داده می‌شود.';
  }

  if (selected.key === selectedItem.value.step) {
    return `مرحله فعال پرونده همین بخش است و اقدام فعلی با ${selectedItem.value.actByLabel || 'سیستم'} انجام می‌شود.`;
  }

  return 'با انتخاب هر مرحله، فقط داده‌های مرتبط با همان بخش از مسیر معامله نمایش داده می‌شود.';
});

const paymentFacts = computed(() => (Array.isArray(selectedItem.value?.paymentTypes) ? selectedItem.value.paymentTypes : []));

const resultHistoryEntries = computed(() => (Array.isArray(selectedItem.value?.resultHistory) ? [...selectedItem.value.resultHistory].reverse() : []));
const resultHistoryCount = computed(() => resultHistoryEntries.value.length);

const resetReviewPaymentForm = (item = selectedItem.value) => {
  const next = createReviewPaymentForm();
  const existing = Array.isArray(item?.paymentTypes) ? item.paymentTypes : [];

  if (existing.length) {
    next.cash.enabled = false;
    next.check.enabled = false;
  }

  existing.forEach((entry) => {
    if (!next[entry.paymentType]) {
      return;
    }

    next[entry.paymentType] = {
      enabled: true,
      amount: String(entry.amount || ''),
      description: entry.description || next[entry.paymentType].description
    };
  });

  reviewPaymentForm.value = next;
};

const buildReviewPaymentTypesPayload = () =>
  paymentMethodCatalog
    .filter((item) => reviewPaymentForm.value[item.value]?.enabled)
    .map((item) => ({
      paymentType: item.value,
      amount: Number(reviewPaymentForm.value[item.value]?.amount || 0),
      description: String(reviewPaymentForm.value[item.value]?.description || item.description).trim() || item.description
    }));

const validationStages = computed(() => {
  const stages = selectedItem.value?.customerValidationData?.data?.stages;
  return Array.isArray(stages) ? stages : [];
});

const getValidationItemValueText = (item) => {
  if (item?.type === 'file') {
    return item?.value?.fileName || 'فایل پیوست شده';
  }

  if (item?.value === null || item?.value === undefined || item?.value === '') {
    return 'ثبت نشده';
  }

  if (item?.type === 'date') {
    return formatJalaliDate(item.value);
  }

  return typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value);
};

const formatDocumentValueText = (document) => {
  if (document?.value === null || document?.value === undefined || document?.value === '') {
    return 'ثبت نشده';
  }

  if (document?.type === 'date') {
    return formatJalaliDate(document.value);
  }

  return String(document.value);
};

const buildQuery = () => {
  const params = new URLSearchParams({ page: String(page.value), limit: String(limit.value) });

  if (filters.value.status) {
    params.set('status', filters.value.status);
  }

  if (filters.value.step) {
    params.set('step', filters.value.step);
  }

  return `?${params.toString()}`;
};

const loadSummary = async () => {
  summaryLoading.value = true;
  try {
    const data = await getBrokerDealSummary();
    summary.value = data.summary || summary.value;
  } catch (error) {
    toast.error(error.message);
  } finally {
    summaryLoading.value = false;
  }
};

const loadList = async () => {
  listLoading.value = true;
  try {
    const data = await getBrokerDeals(buildQuery());
    items.value = data.items || [];
    page.value = Number(data.page || 1);
    limit.value = Number(data.limit || 10);
    total.value = Number(data.total || 0);
  } catch (error) {
    toast.error(error.message);
  } finally {
    listLoading.value = false;
  }
};

const loadSelected = async () => {
  if (!selectedId.value) {
    selectedItem.value = null;
    return;
  }

  detailLoading.value = true;
  try {
    const data = await getBrokerDeal(selectedId.value);
    selectedItem.value = data.item || null;
    activeStageTab.value = data.item?.step || 'base';
  } catch (error) {
    selectedItem.value = null;
    toast.error(error.message);
    router.replace('/deals');
  } finally {
    detailLoading.value = false;
  }
};

const load = async ({ includeSummary = true } = {}) => {
  await Promise.all([
    loadList(),
    includeSummary ? loadSummary() : Promise.resolve()
  ]);
  await loadSelected();
};

const applyFilters = async () => {
  page.value = 1;
  if (selectedId.value) {
    await router.push('/deals');
  }
  await load({ includeSummary: true });
};

const clearFilters = async () => {
  filters.value = { status: '', step: '' };
  page.value = 1;
  if (selectedId.value) {
    await router.push('/deals');
  }
  await load({ includeSummary: true });
};

const changePage = async (nextPage) => {
  page.value = nextPage;
  await load({ includeSummary: false });
};

const openItem = (id) => {
  router.push(`/deals/${id}`);
};

const closeDetail = () => {
  router.push('/deals');
};

const applySummaryFilter = async (card) => {
  filters.value = { ...card.filters };
  await applyFilters();
};

const dispatchDealUpdate = () => {
  window.dispatchEvent(new CustomEvent('broker-deal-updated'));
};

const submitReview = async (action) => {
  if (!selectedItem.value?.id || actionLoading.value) {
    return;
  }

  if (action === 'reject' && !reviewReason.value.trim()) {
    toast.error('برای رد معامله باید دلیل وارد کنید');
    return;
  }

  const paymentTypes = action === 'approve' ? buildReviewPaymentTypesPayload() : [];
  if (action === 'approve' && !paymentTypes.length) {
    toast.error('حداقل یک روش پرداخت را فعال کنید');
    return;
  }

  const invalidPayment = paymentTypes.find((item) => !Number.isFinite(item.amount) || item.amount <= 0);
  if (invalidPayment) {
    toast.error('برای هر روش پرداخت فعال باید مبلغ معتبر وارد شود');
    return;
  }

  actionLoading.value = true;
  try {
    const data = await reviewBrokerDeal(selectedItem.value.id, {
      action,
      reason: reviewReason.value.trim() || undefined,
      paymentTypes: action === 'approve' ? paymentTypes : undefined
    });
    toast.success(data.message || 'بررسی معامله ثبت شد');
    reviewReason.value = '';
    resetReviewPaymentForm(data.item || selectedItem.value);
    dispatchDealUpdate();
    await load({ includeSummary: true });
  } catch (error) {
    toast.error(error.message);
  } finally {
    actionLoading.value = false;
  }
};

const handleContractUpdated = (item) => {
  selectedItem.value = item;
  activeStageTab.value = item?.step || activeStageTab.value;
  resetReviewPaymentForm(item);
  dispatchDealUpdate();
  load({ includeSummary: true });
};

watch(selectedItem, (value) => {
  resetReviewPaymentForm(value);
});

watch(() => route.params.id, () => {
  loadSelected();
});

onMounted(() => {
  load();
});
</script>

<template>
  <section class="animate-in">
    <div class="page-header">
      <div class="page-header-copy">
        <div class="page-header-icon"><i class="fa-solid fa-briefcase"></i></div>
        <div>
          <h1 class="page-header-title">کارتابل معاملات</h1>
          <p class="page-header-desc">پرونده های ایجاد شده برای مشتریان، مرحله جاری و مدارک ارسالی را از اینجا دنبال کنید.</p>
        </div>
      </div>
      <router-link class="btn btn-primary" to="/loan/create">
        <i class="fa-solid fa-file-invoice-dollar me-1"></i>
        ثبت امتیاز وام
      </router-link>
    </div>

    <div v-if="!selectedId" class="summary-grid mt-3" :class="{ 'summary-grid-loading': summaryLoading }">
      <button
        v-for="card in summaryCards"
        :key="card.label"
        type="button"
        class="summary-card"
        :class="`summary-card-${card.tone}`"
        @click="applySummaryFilter(card)"
      >
        <span>{{ card.label }}</span>
        <strong>{{ formatNumber(card.value) }}</strong>
      </button>
    </div>

    <div v-if="!selectedId" class="content-card mt-3">
      <div class="filter-row">
        <select v-model="filters.status" class="form-select">
          <option v-for="item in statusOptions" :key="item.value || 'all-status'" :value="item.value">{{ item.label }}</option>
        </select>
        <select v-model="filters.step" class="form-select">
          <option v-for="item in stepOptions" :key="item.value || 'all-step'" :value="item.value">{{ item.label }}</option>
        </select>
        <div class="filter-actions">
          <button class="btn btn-primary" @click="applyFilters">اعمال</button>
          <button class="btn btn-outline-secondary" @click="clearFilters">پاکسازی</button>
        </div>
      </div>

      <div class="board-grid mt-3">
        <div class="list-pane">
          <div class="list-pane-head">
            <div>
              <strong>فهرست پرونده‌ها</strong>
              <span>{{ formatNumber(filteredItems.length) }} پرونده در این صفحه</span>
            </div>
            <label class="list-pane-search">
              <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
              <input v-model="localQuery" type="search" class="form-control" placeholder="جستجو بر اساس مشتری، وام یا شماره پرونده" />
            </label>
          </div>

          <div v-if="listLoading" class="spinner-overlay"><i class="fa-solid fa-spinner fa-spin"></i> در حال بارگذاری...</div>
          <div v-else-if="!filteredItems.length" class="empty-card compact-empty">
            <i class="fa-solid fa-inbox empty-icon"></i>
            <h3>{{ items.length ? 'نتیجه‌ای برای جستجوی شما پیدا نشد' : 'معامله ای پیدا نشد' }}</h3>
            <p>{{ items.length ? 'عبارت جستجو را تغییر دهید یا فیلترها را سبک‌تر کنید.' : 'برای فیلترهای انتخابی هنوز موردی ثبت نشده است.' }}</p>
          </div>
          <div v-else class="deal-list">
            <button
              v-for="item in filteredItems"
              :key="item.id"
              type="button"
              class="deal-card"
              :class="{ active: selectedId === item.id }"
              @click="openItem(item.id)"
            >
              <div class="deal-card-head">
                <strong>#{{ formatNumber(item.id) }}</strong>
                <span class="status-pill" :class="`status-pill-${item.status}`">{{ item.statusLabel }}</span>
              </div>
              <h2 class="deal-card-title">{{ item.facility?.title || 'بدون عنوان' }}</h2>
              <div class="deal-card-chip-row">
                <span class="deal-meta-chip">{{ item.customer?.name || 'مشتری' }}</span>
                <span class="deal-meta-chip muted">{{ item.typeLabel || item.facility?.typeLabel || '-' }}</span>
              </div>
              <div class="deal-card-meta strong">{{ formatMoney(item.amount) }}</div>
              <div class="deal-card-meta">مرحله: {{ item.stepLabel }} | اقدام: {{ item.actByLabel }}</div>
              <div class="deal-card-meta">{{ item.updatedAtLabel }}</div>
            </button>
          </div>

          <AppPagination :page="page" :limit="limit" :total="total" :disabled="listLoading" @change="changePage" />
        </div>
      </div>
    </div>

    <div v-else class="detail-route-shell mt-3">
      <div v-if="detailLoading" class="empty-card detail-route-empty"><i class="fa-solid fa-spinner fa-spin"></i> در حال بارگذاری جزئیات...</div>
      <div v-else-if="!selectedItem" class="empty-card detail-route-empty">
        <i class="fa-solid fa-arrow-left empty-icon"></i>
        <h3>پرونده پیدا نشد</h3>
        <p>این معامله در دسترس نیست یا حذف شده است.</p>
      </div>
      <div v-else class="detail-shell detail-route-pane">
        <div class="detail-head detail-route-head">
          <div>
            <p class="detail-kicker">معامله #{{ formatNumber(selectedItem.id) }}</p>
            <h2 class="detail-title">{{ selectedItem.facility?.title || 'پرونده معامله' }}</h2>
            <p class="detail-subtitle">{{ selectedItem.customer?.name || 'مشتری نامشخص' }} | {{ selectedItem.customer?.phone || '-' }}</p>
          </div>
          <button class="btn btn-outline-secondary btn-sm" @click="closeDetail">
            <i class="fa-solid fa-arrow-right me-1"></i>
            بازگشت به فهرست
          </button>
        </div>

        <div class="detail-grid">
          <div class="detail-stat">
            <span>وضعیت</span>
            <strong>{{ selectedItem.statusLabel }}</strong>
          </div>
          <div class="detail-stat">
            <span>مرحله</span>
            <strong>{{ selectedItem.stepLabel }}</strong>
          </div>
          <div class="detail-stat">
            <span>اقدام با</span>
            <strong>{{ selectedItem.actByLabel }}</strong>
          </div>
          <div class="detail-stat">
            <span>مبلغ درخواست</span>
            <strong>{{ formatMoney(selectedItem.amount) }}</strong>
          </div>
        </div>
        <div class="history-dropup-wrap mt-3">
          <button type="button" class="history-dropup-toggle" :disabled="!resultHistoryCount" @click="resultHistoryOpen = !resultHistoryOpen">
            <i class="fa-solid fa-clock-rotate-left me-1"></i>
            {{ resultHistoryOpen ? 'بستن تاریخچه' : 'تاریخچه نتیجه‌ها' }}
            <span v-if="resultHistoryCount" class="history-dropup-badge">{{ formatNumber(resultHistoryCount) }}</span>
          </button>

          <transition name="dropup-fade">
            <div v-if="resultHistoryOpen && resultHistoryCount" class="history-dropup-panel">
              <div v-for="entry in resultHistoryEntries" :key="entry.id" class="history-item">
                <div class="history-dot"></div>
                <div>
                  <div class="history-title">{{ actionLabels[entry.action] || entry.action }} توسط {{ entry.actorName || actorLabels[entry.actorType] || entry.actorType }}</div>
                  <div class="history-date">{{ formatDate(entry.createdAt) }}</div>
                  <p v-if="entry.message" class="history-text">{{ entry.message }}</p>
                  <p v-if="entry.note && entry.note !== entry.message" class="history-text">یادداشت: {{ entry.note }}</p>
                </div>
              </div>
            </div>
          </transition>
        </div>
        <div class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">ویزارد جزئیات معامله</h3>
              <p class="section-subtitle">هر مرحله را انتخاب کنید تا فقط اطلاعات مرتبط با همان بخش نمایش داده شود.</p>
            </div>
          </div>

          <div class="deal-stage-wizard">
            <button
              v-for="item in detailWizardSteps"
              :key="item.key"
              type="button"
              class="deal-stage-tab"
              :class="[`state-${item.state}`, { active: activeStageTab === item.key }]"
              @click="activeStageTab = item.key"
            >
              <span>{{ item.title }}</span>
              <small>{{ item.key === 'base' ? 'پایه' : item.level }}</small>
            </button>
          </div>

          <div v-if="selectedStageMeta" class="deal-stage-spotlight">
            <strong>{{ selectedStageMeta.title }}</strong>
            <p>{{ activeStageSummary }}</p>
          </div>
        </div>

        <div v-if="activeStageTab === 'base'" class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">مشخصات پرونده</h3>
              <p class="section-subtitle">اطلاعات پایه معامله و زمان های ثبت</p>
            </div>
          </div>
          <div class="meta-grid">
            <div><span>نوع وام</span><strong>{{ selectedItem.typeLabel || selectedItem.facility?.typeLabel || '-' }}</strong></div>
            <div><span>نوع زیرشاخه</span><strong>{{ selectedItem.facilityData?.loanTypeTitle || selectedItem.facility?.loanTypeTitle || '-' }}</strong></div>
            <div><span>نرخ سود</span><strong>{{ selectedItem.profit ? `${formatNumber(selectedItem.profit)} درصد` : '-' }}</strong></div>
            <div><span>اقساط</span><strong>{{ selectedItem.installments ? `${formatNumber(selectedItem.installments)} ماه` : '-' }}</strong></div>
            <div><span>قسط ماهانه</span><strong>{{ formatMoney(selectedItem.monthlyInstallmentAmount) }}</strong></div>
            <div><span>سود کل</span><strong>{{ formatMoney(selectedItem.totalProfit) }}</strong></div>
            <div><span>جمع بازپرداخت</span><strong>{{ formatMoney(selectedItem.totalAmount) }}</strong></div>
            <div><span>ثبت اولیه</span><strong>{{ selectedItem.createdAtLabel }}</strong></div>
            <div><span>آخرین بروزرسانی</span><strong>{{ selectedItem.updatedAtLabel }}</strong></div>
            <div><span>ارسال مدارک</span><strong>{{ selectedItem.submittedDocumentsAtLabel }}</strong></div>
          </div>
        </div>

        <div v-if="['submit', 'verify_broker'].includes(activeStageTab) && selectedItem.customerValidationData" class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">اسنپ‌شات اعتبارسنجی مشتری</h3>
              <p class="section-subtitle">رکورد اعتبارسنجی تاییدشده که در لحظه ایجاد معامله ذخیره شده است</p>
            </div>
          </div>

          <div class="meta-grid validation-grid">
            <div><span>روش اعتبارسنجی</span><strong>{{ selectedItem.customerValidationData.selfValidationLabel || '-' }}</strong></div>
            <div><span>وضعیت</span><strong>{{ selectedItem.customerValidationData.statusLabel || '-' }}</strong></div>
            <div><span>نام سرویس</span><strong>{{ selectedItem.customerValidationData.validation?.title || '-' }}</strong></div>
            <div><span>مبلغ پرداختی</span><strong>{{ formatMoney(selectedItem.customerValidationData.paidAmount) }}</strong></div>
            <div><span>انقضا</span><strong>{{ selectedItem.customerValidationData.expiresAtLabel || '-' }}</strong></div>
            <div>
              <span>فایل خوداظهاری</span>
              <strong>
                <a v-if="selectedItem.customerValidationData.selfValidationFileUrl" class="validation-file-link" :href="selectedItem.customerValidationData.selfValidationFileUrl" target="_blank" rel="noreferrer">
                  {{ selectedItem.customerValidationData.selfValidationFileName || 'مشاهده فایل' }}
                </a>
                <template v-else>-</template>
              </strong>
            </div>
            <div>
              <span>گزارش نهایی اعتبارسنجی</span>
              <strong>
                <a v-if="selectedItem.customerValidationData.adminAttachmentUrl" class="validation-file-link" :href="selectedItem.customerValidationData.adminAttachmentUrl" target="_blank" rel="noreferrer">
                  {{ selectedItem.customerValidationData.adminAttachmentFileName || 'دانلود گزارش نهایی' }}
                </a>
                <template v-else>-</template>
              </strong>
            </div>
          </div>

          <div v-if="selectedItem.customerValidationData.result" class="validation-result-box">
            {{ selectedItem.customerValidationData.result }}
          </div>

          <div v-if="validationStages.length" class="validation-stage-list">
            <div v-for="stage in validationStages" :key="stage.id" class="validation-stage-card">
              <div class="validation-stage-head">
                <div>
                  <strong>{{ stage.title }}</strong>
                  <p v-if="stage.description">{{ stage.description }}</p>
                </div>
              </div>

              <div v-if="stage.items?.length" class="validation-stage-items">
                <div v-for="entry in stage.items" :key="entry.id || `${stage.id}-${entry.title}`" class="validation-stage-item">
                  <div>
                    <span>{{ entry.title }}</span>
                    <small>{{ entry.typeLabel || entry.categoryLabel || 'داده ثبت‌شده' }}</small>
                  </div>
                  <div class="validation-stage-value">
                    <a v-if="entry.type === 'file' && entry.value?.url" class="btn btn-sm btn-outline-secondary" :href="entry.value.url" target="_blank" rel="noreferrer">
                      <i class="fa-solid fa-paperclip me-1"></i>
                      {{ entry.value.fileName || 'مشاهده فایل' }}
                    </a>
                    <span v-else>{{ getValidationItemValueText(entry) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="['submit', 'verify_broker'].includes(activeStageTab)" class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">مدارک و داده های ارسالی</h3>
              <p class="section-subtitle">{{ formatNumber(selectedItem.completedDocuments) }} از {{ formatNumber(selectedItem.documentsCount) }} مورد تکمیل شده است</p>
            </div>
          </div>
          <div v-if="selectedItem.documents?.length" class="document-list">
            <div v-for="document in selectedItem.documents" :key="document.id" class="document-item">
              <div>
                <strong>{{ document.title }}</strong>
                <p>{{ document.help || document.subject || 'بدون توضیح' }}</p>
              </div>
              <div class="document-value">
                <template v-if="document.type === 'file' && document.value?.url">
                  <a class="btn btn-sm btn-outline-secondary" :href="document.value.url" target="_blank" rel="noreferrer">
                    <i class="fa-solid fa-paperclip me-1"></i>
                    {{ document.value.fileName || 'مشاهده فایل' }}
                  </a>
                </template>
                <template v-else-if="document.value !== null && document.value !== undefined && document.value !== ''">
                  <span class="document-text">{{ formatDocumentValueText(document) }}</span>
                </template>
                <span v-else class="status-pill status-pill-empty">ثبت نشده</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-inline">برای این پرونده مدرکی تعریف نشده است.</div>
        </div>



        <div v-if="activeStageTab === 'verify_broker' && selectedItem.canBrokerReview" class="section-card mt-3 review-card">
          <div class="section-head">
            <div>
              <h3 class="section-title">ثبت نظر کارگزار</h3>
              <p class="section-subtitle">برای تایید، حداقل یک روش پرداخت با مبلغ مشخص تعیین کنید. در صورت رد، دلیل الزامی است.</p>
            </div>
          </div>

          <div class="payment-review-grid">
            <article v-for="item in paymentMethodCatalog" :key="item.value" class="payment-method-card" :class="{ active: reviewPaymentForm[item.value].enabled }">
              <label class="payment-method-toggle">
                <input v-model="reviewPaymentForm[item.value].enabled" type="checkbox" />
                <div>
                  <strong>{{ item.label }}</strong>
                  <p>{{ item.description }}</p>
                </div>
              </label>

              <input
                v-model="reviewPaymentForm[item.value].amount"
                class="form-control"
                type="number"
                min="0"
                placeholder="مبلغ به تومان"
                :disabled="!reviewPaymentForm[item.value].enabled"
              />

              <textarea
                v-model="reviewPaymentForm[item.value].description"
                class="form-control"
                rows="2"
                :disabled="!reviewPaymentForm[item.value].enabled"
                placeholder="توضیح تکمیلی برای این روش پرداخت"
              ></textarea>
            </article>
          </div>

          <textarea v-model="reviewReason" class="form-control" rows="3" placeholder="دلیل بررسی یا رد پرونده را بنویسید"></textarea>
          <div class="review-actions">
            <button class="btn btn-success" :disabled="actionLoading" @click="submitReview('approve')">
              <i v-if="actionLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
              <i v-else class="fa-solid fa-check me-1"></i>
              تایید
            </button>
            <button class="btn btn-outline-danger" :disabled="actionLoading" @click="submitReview('reject')">
              <i v-if="actionLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
              <i v-else class="fa-solid fa-ban me-1"></i>
              رد معامله
            </button>
          </div>
        </div>

        <BrokerDealContractStage
          v-if="activeStageTab === 'contract' && (selectedItem.contractReady || selectedItem.paymentTypes?.length || selectedItem.step === 'contract' || selectedItem.step === 'payment')"
          :deal="selectedItem"
          @updated="handleContractUpdated"
        />

        <div v-if="activeStageTab === 'payment'" class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">اطلاعات پرداخت</h3>
              <p class="section-subtitle">روش‌های پرداخت تعیین‌شده و وضعیت امضای قرارداد برای این مرحله.</p>
            </div>
          </div>

          <div v-if="paymentFacts.length" class="meta-grid">
            <div v-for="item in paymentFacts" :key="`payment-${item.id || item.paymentType}`">
              <span>{{ item.paymentTypeLabel }}</span>
              <strong>{{ formatMoney(item.amount) }}</strong>
            </div>
            <div>
              <span>امضای مشتری</span>
              <strong>{{ selectedItem.contractSignedByCustomer ? 'ثبت شده' : 'ثبت نشده' }}</strong>
            </div>
            <div>
              <span>امضای کارگزار</span>
              <strong>{{ selectedItem.contractSignedByBroker ? 'ثبت شده' : 'ثبت نشده' }}</strong>
            </div>
          </div>
          <div v-else class="empty-inline">هنوز روش پرداختی برای این پرونده ثبت نشده است.</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-header,
.content-card,
.section-card,
.empty-card {
  background: var(--surface-color);
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  box-shadow: var(--panel-shadow);
}

.page-header {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header-copy {
  display: flex;
  align-items: center;
  gap: 14px;
}

.page-header-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--chip-bg);
  color: var(--brand-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.page-header-title {
  font-size: 18px;
  font-weight: 800;
  margin: 0;
}

.page-header-desc {
  margin: 4px 0 0;
  color: var(--muted-text);
  font-size: 13px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  padding: 16px;
  background: var(--surface-color);
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.summary-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.summary-card span {
  font-size: 12px;
  color: var(--muted-text);
}

.summary-card strong {
  font-size: 26px;
}

.summary-card-info { background: rgba(59, 130, 246, 0.14); }
.summary-card-warning { background: rgba(245, 158, 11, 0.14); }
.summary-card-success { background: rgba(34, 197, 94, 0.14); }
.summary-card-danger { background: rgba(239, 68, 68, 0.14); }

.content-card {
  padding: 18px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-row .form-select {
  max-width: 220px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-inline-start: auto;
}

.board-grid {
  display: block;
}

.list-pane,
.detail-pane {
  min-width: 0;
  position: relative;
}

.list-pane {
  display: grid;
  gap: 14px;
}

.list-pane-head {
  display: grid;
  gap: 12px;
}

.list-pane-head strong {
  display: block;
  font-size: 15px;
  font-weight: 800;
}

.list-pane-head span {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted-text);
}

.list-pane-search {
  position: relative;
  display: block;
}

.list-pane-search i {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  color: var(--muted-text);
}

.list-pane-search .form-control {
  padding-right: 40px;
}

.deal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 360px);
  overflow: auto;
  padding-left: 4px;
}

.deal-card {
  width: 100%;
  text-align: right;
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: var(--surface-soft);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.deal-card:hover,
.deal-card.active {
  border-color: rgba(219, 0, 0, 0.32);
  transform: translateY(-1px);
}

.deal-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.deal-card-title {
  font-size: 15px;
  font-weight: 800;
  margin: 0;
}

.deal-card-chip-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.deal-meta-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(219, 0, 0, 0.08);
  color: var(--brand-primary);
  font-size: 11px;
  font-weight: 700;
}

.deal-meta-chip.muted {
  background: rgba(148, 163, 184, 0.12);
  color: var(--muted-text);
}

.deal-card-meta {
  font-size: 12px;
  color: var(--muted-text);
}

.deal-card-meta.strong {
  font-size: 13px;
  color: var(--heading-text);
  font-weight: 800;
}

.detail-shell {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.detail-route-shell {
  display: grid;
  gap: 18px;
}

.detail-route-pane {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.detail-route-head {
  padding: 22px;
  border-radius: 18px;
  border: 1px solid var(--panel-border);
  background: linear-gradient(180deg, var(--surface-color) 0%, var(--surface-soft) 100%);
  box-shadow: var(--panel-shadow);
}

.detail-route-empty {
  min-height: 320px;
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-kicker {
  margin: 0 0 6px;
  color: var(--muted-text);
  font-size: 12px;
}

.detail-title {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 6px;
}

.detail-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--muted-text);
}

.detail-grid,
.meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.deal-stage-wizard {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.detail-stat,
.meta-grid div {
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 14px;
  background: var(--surface-soft);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-stat span,
.meta-grid span {
  font-size: 12px;
  color: var(--muted-text);
}

.detail-stat strong,
.meta-grid strong {
  font-size: 14px;
}

.section-card {
  padding: 18px;
}

.deal-stage-tab {
  text-align: right;
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: var(--surface-soft);
  padding: 14px 16px;
  display: grid;
  gap: 8px;
}

.deal-stage-tab span {
  font-size: 13px;
  font-weight: 800;
}

.deal-stage-tab small {
  font-size: 11px;
  color: var(--muted-text);
}

.deal-stage-tab.active,
.deal-stage-tab.state-current {
  border-color: rgba(219, 0, 0, 0.3);
  background: rgba(219, 0, 0, 0.08);
}

.deal-stage-tab.state-completed {
  background: rgba(34, 197, 94, 0.08);
}

.deal-stage-tab.state-failed {
  background: rgba(239, 68, 68, 0.08);
}

.deal-stage-tab.state-paused {
  background: rgba(245, 158, 11, 0.08);
}

.deal-stage-spotlight {
  margin-top: 16px;
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: var(--surface-soft);
  padding: 16px;
}

.deal-stage-spotlight strong {
  display: block;
  font-size: 14px;
  font-weight: 800;
}

.deal-stage-spotlight p {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--muted-text);
  line-height: 1.9;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 800;
  margin: 0 0 4px;
}

.section-subtitle {
  font-size: 12px;
  color: var(--muted-text);
  margin: 0;
}

.document-list,
.history-list,
.validation-stage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.document-item,
.history-item,
.validation-stage-card,
.validation-stage-item {
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: var(--surface-soft);
  padding: 14px 16px;
}

.document-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.document-item p {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--muted-text);
}

.document-value {
  max-width: 40%;
  text-align: left;
}

.document-text {
  font-size: 13px;
  font-weight: 700;
}

.history-item {
  display: flex;
  gap: 12px;
}

.history-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--brand-primary);
  margin-top: 7px;
  flex-shrink: 0;
}

.history-title {
  font-size: 14px;
  font-weight: 700;
}

.validation-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.validation-file-link {
  color: var(--brand-primary);
}

.validation-result-box {
  margin-top: 14px;
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: var(--surface-soft);
  padding: 14px 16px;
  font-size: 13px;
}

.validation-stage-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.validation-stage-head strong,
.validation-stage-item span {
  font-size: 14px;
  font-weight: 700;
}

.validation-stage-head p,
.validation-stage-item small {
  margin: 4px 0 0;
  color: var(--muted-text);
  font-size: 12px;
}

.validation-stage-items {
  display: grid;
  gap: 10px;
}

.validation-stage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.validation-stage-value {
  max-width: 48%;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
}

.history-date,
.history-text,
.empty-inline {
  font-size: 12px;
  color: var(--muted-text);
}

.history-text {
  margin: 6px 0 0;
}

.review-card .form-control {
  margin-bottom: 14px;
}

.payment-review-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.payment-method-card {
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  padding: 14px;
  background: var(--surface-soft);
  display: grid;
  gap: 12px;
}

.payment-method-card.active {
  border-color: rgba(219, 0, 0, 0.28);
  background: rgba(219, 0, 0, 0.05);
}

.payment-method-toggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.payment-method-toggle input {
  margin-top: 5px;
}

.payment-method-toggle strong {
  display: block;
  font-size: 14px;
  font-weight: 800;
}

.payment-method-toggle p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted-text);
  line-height: 1.9;
}

.review-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-pill-in_progress { background: #eff6ff; color: #1d4ed8; }
.status-pill-done { background: #dcfce7; color: #166534; }
.status-pill-failed { background: #ffe4e6; color: #be123c; }
.status-pill-suspended { background: #f3f4f6; color: #6b7280; }
.status-pill-empty { background: #f3f4f6; color: #6b7280; }

.spinner-overlay,
.detail-empty,
.empty-card {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.empty-icon {
  font-size: 42px;
  color: var(--muted-text);
  opacity: 0.32;
  margin-bottom: 14px;
}

.empty-card h3 {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 6px;
}

.empty-card p {
  margin: 0;
  max-width: 380px;
  color: var(--muted-text);
  font-size: 13px;
}

@media (max-width: 1199px) {
  .summary-grid,
  .detail-grid,
  .meta-grid,
  .validation-grid,
  .payment-review-grid,
  .deal-stage-wizard {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .deal-list {
    max-height: none;
  }
}

@media (max-width: 767px) {
  .summary-grid,
  .detail-grid,
  .meta-grid,
  .validation-grid,
  .payment-review-grid,
  .deal-stage-wizard {
    grid-template-columns: 1fr;
  }

  .page-header,
  .page-header-copy,
  .detail-head,
  .detail-route-head,
  .document-item,
  .validation-stage-item,
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .deal-card-chip-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-row .form-select,
  .document-value,
  .validation-stage-value {
    max-width: none;
  }
  .filter-actions {
    margin-inline-start: 0;
  }
}
</style>