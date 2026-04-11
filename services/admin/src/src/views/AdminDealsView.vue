<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPagination from '../components/AppPagination.vue';
import { getAdminDeal, getAdminDeals, getAdminDealSummary, refreshAdminDealContract, removeAdminDealSignature, updateAdminDeal } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();
const route = useRoute();
const router = useRouter();

const summaryLoading = ref(false);
const listLoading = ref(false);
const detailLoading = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const items = ref([]);
const selectedItem = ref(null);
const activeStageTab = ref('base');
const adminUpdateForm = ref({ status: '', step: '', actBy: '', note: '' });
const savingAdminUpdate = ref(false);
const refreshingContract = ref(false);
const resultHistoryOpen = ref(false);
const summary = ref({ total: 0, inProgress: 0, failed: 0, suspended: 0, done: 0, waitingCustomer: 0, waitingBroker: 0, waitingAdmin: 0, verifyBroker: 0 });
const filters = ref({ status: '', step: '', actBy: '', search: '' });

const selectedId = computed(() => Number(route.params.id || 0) || null);

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

const actByOptions = [
  { value: '', label: 'همه صف ها' },
  { value: 'customer', label: 'منتظر مشتری' },
  { value: 'broker', label: 'منتظر کارگزار' },
  { value: 'admin', label: 'منتظر ادمین' },
  { value: 'customer_broker', label: 'مشتری و کارگزار' }
];

const summaryCards = computed(() => [
  { label: 'کل معاملات', value: summary.value.total, filters: { status: '', step: '', actBy: '' }, tone: 'neutral' },
  { label: 'در جریان', value: summary.value.inProgress, filters: { status: 'in_progress', step: '', actBy: '' }, tone: 'info' },
  { label: 'منتظر کارگزار', value: summary.value.waitingBroker, filters: { status: '', step: '', actBy: 'broker' }, tone: 'warning' },
  { label: 'منتظر ادمین', value: summary.value.waitingAdmin, filters: { status: '', step: '', actBy: 'admin' }, tone: 'accent' },
  { label: 'ناموفق', value: summary.value.failed, filters: { status: 'failed', step: '', actBy: '' }, tone: 'danger' }
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

const actionLabels = {
  approve: 'تایید',
  reject: 'رد',
  submit: 'ارسال مدارک',
  create: 'ایجاد معامله',
  sign_contract: 'امضای قرارداد',
  update: 'بروزرسانی توسط ادمین',
  note: 'یادداشت ادمین'
};

const actorLabels = {
  admin: 'ادمین',
  broker: 'کارگزار',
  customer: 'مشتری',
  customer_broker: 'مشتری و کارگزار'
};

const validationStages = computed(() => {
  const stages = selectedItem.value?.customerValidationData?.data?.stages;
  return Array.isArray(stages) ? stages : [];
});

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
    return 'در این بخش اطلاعات پایه پرونده، طرفین معامله و خلاصه مالی نمایش داده می‌شود.';
  }

  if (selected.key === selectedItem.value.step) {
    return `مرحله فعال پرونده همین بخش است و اقدام جاری با ${selectedItem.value.actByLabel || 'سیستم'} انجام می‌شود.`;
  }

  return 'با انتخاب هر مرحله، فقط داده‌های مرتبط با همان بخش از مسیر معامله نمایش داده می‌شود.';
});

const paymentFacts = computed(() => {
  const items = Array.isArray(selectedItem.value?.paymentTypes) ? selectedItem.value.paymentTypes : [];
  return items;
});

const resultHistoryEntries = computed(() => (Array.isArray(selectedItem.value?.resultHistory) ? [...selectedItem.value.resultHistory].reverse() : []));
const resultHistoryCount = computed(() => resultHistoryEntries.value.length);

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

  if (filters.value.actBy) {
    params.set('actBy', filters.value.actBy);
  }

  if (filters.value.search) {
    params.set('search', filters.value.search);
  }

  return `?${params.toString()}`;
};

const loadSummary = async () => {
  summaryLoading.value = true;
  try {
    const data = await getAdminDealSummary();
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
    const data = await getAdminDeals(buildQuery());
    items.value = data.items || [];
    total.value = Number(data.total || 0);
    page.value = Number(data.page || 1);
    limit.value = Number(data.limit || 10);
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
    const data = await getAdminDeal(selectedId.value);
    selectedItem.value = data.item || null;
    activeStageTab.value = data.item?.step || 'base';
    adminUpdateForm.value = { status: '', step: '', actBy: '', note: '' };
  } catch (error) {
    selectedItem.value = null;
    toast.error(error.message);
    router.replace('/deals');
  } finally {
    detailLoading.value = false;
  }
};

const submitAdminAction = async () => {
  if (!selectedItem.value?.id || savingAdminUpdate.value) {
    return;
  }

  if (!adminUpdateForm.value.status && !adminUpdateForm.value.step && !adminUpdateForm.value.actBy && !adminUpdateForm.value.note.trim()) {
    toast.error('حداقل یکی از تغییرات یا پیام ادمین را ثبت کنید');
    return;
  }

  savingAdminUpdate.value = true;
  try {
    const data = await updateAdminDeal(selectedItem.value.id, {
      status: adminUpdateForm.value.status || undefined,
      step: adminUpdateForm.value.step || undefined,
      actBy: adminUpdateForm.value.actBy || undefined,
      note: adminUpdateForm.value.note.trim() || undefined
    });
    toast.success(data.message || 'تغییرات معامله ثبت شد');
    selectedItem.value = data.item || selectedItem.value;
    activeStageTab.value = (data.item || selectedItem.value)?.step || activeStageTab.value;
    adminUpdateForm.value = { status: '', step: '', actBy: '', note: '' };
    await load({ includeSummary: true });
  } catch (error) {
    toast.error(error.message);
  } finally {
    savingAdminUpdate.value = false;
  }
};

const refreshContract = async () => {
  if (!selectedItem.value?.id || refreshingContract.value || !selectedItem.value?.contractData) {
    return;
  }

  if (!confirm('آیا از بازسازی قرارداد مطمئن هستید؟ تمام متغیرها، متن‌ها و تصاویر (بجز امضاها) با نسخه فعلی قالب قرارداد بروزرسانی خواهد شد.')) {
    return;
  }

  refreshingContract.value = true;
  try {
    const data = await refreshAdminDealContract(selectedItem.value.id);
    toast.success(data.message || 'قرارداد بازسازی شد');
    selectedItem.value = data.item || selectedItem.value;
  } catch (error) {
    toast.error(error.message || 'بازسازی قرارداد با خطا مواجه شد');
  } finally {
    refreshingContract.value = false;
  }
};

const removingSignature = ref('');
const removeSignature = async (role) => {
  const label = role === 'customer' ? 'مشتری' : 'کارگزار';
  if (!confirm(`آیا از حذف امضای ${label} مطمئن هستید؟ معامله به مرحله قرارداد بازگردانده می‌شود.`)) {
    return;
  }

  removingSignature.value = role;
  try {
    const data = await removeAdminDealSignature(selectedItem.value.id, role);
    toast.success(data.message || 'امضا حذف شد');
    selectedItem.value = data.item || selectedItem.value;
  } catch (error) {
    toast.error(error.message || 'حذف امضا با خطا مواجه شد');
  } finally {
    removingSignature.value = '';
  }
};

const load = async ({ includeSummary = true } = {}) => {
  await Promise.all([
    loadList(),
    includeSummary ? loadSummary() : Promise.resolve()
  ]);
  await loadSelected();
};

const openItem = (id) => {
  router.push(`/deals/${id}`);
};

const closeDetail = () => {
  router.push('/deals');
};

const applyFilters = async () => {
  page.value = 1;
  if (selectedId.value) {
    await router.push('/deals');
  }
  await load({ includeSummary: true });
};

const clearFilters = async () => {
  filters.value = { status: '', step: '', actBy: '', search: '' };
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

const applySummaryFilter = async (card) => {
  filters.value = { ...card.filters };
  await applyFilters();
};

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
          <h1 class="page-header-title">مدیریت معاملات</h1>
          <p class="page-header-desc">پایش همه پرونده های معامله، صف اقدام و وضعیت مدارک در یک نمای متمرکز.</p>
        </div>
      </div>
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
        <input v-model="filters.search" type="text" class="form-control" placeholder="جستجو کد معامله (مثلا DG-12)" @keyup.enter="applyFilters" />
        <select v-model="filters.status" class="form-select">
          <option v-for="item in statusOptions" :key="item.value || 'status'" :value="item.value">{{ item.label }}</option>
        </select>
        <select v-model="filters.step" class="form-select">
          <option v-for="item in stepOptions" :key="item.value || 'step'" :value="item.value">{{ item.label }}</option>
        </select>
        <select v-model="filters.actBy" class="form-select">
          <option v-for="item in actByOptions" :key="item.value || 'actby'" :value="item.value">{{ item.label }}</option>
        </select>
        <div class="filter-actions">
          <button class="btn btn-primary" @click="applyFilters">اعمال</button>
          <button class="btn btn-outline-secondary" @click="clearFilters">پاکسازی</button>
        </div>
      </div>

      <div class="board-grid mt-3">
        <div class="list-pane">
          <div v-if="listLoading" class="spinner-overlay"><i class="fa-solid fa-spinner fa-spin"></i> در حال بارگذاری...</div>
          <div v-else-if="!items.length" class="empty-card compact-empty">
            <i class="fa-solid fa-inbox empty-icon"></i>
            <h3>معامله ای پیدا نشد</h3>
            <p>برای وضعیت یا صف انتخابی هنوز پرونده ای وجود ندارد.</p>
          </div>
          <div v-else class="deal-list">
            <button
              v-for="item in items"
              :key="item.id"
              type="button"
              class="deal-card"
              :class="{ active: selectedId === item.id }"
              @click="openItem(item.id)"
            >
              <div class="deal-card-head">
                <strong>{{ item.dealCode }}</strong>
                <span class="status-pill" :class="`status-pill-${item.status}`">{{ item.statusLabel }}</span>
              </div>
              <h2 class="deal-card-title">{{ item.facility?.title || 'بدون عنوان' }}</h2>
              <div class="deal-card-meta">{{ item.customer?.name || 'مشتری' }} | {{ item.broker?.name || 'کارگزار' }}</div>
              <div class="deal-card-meta">{{ item.typeLabel || item.facility?.typeLabel || '-' }}</div>
              <div class="deal-card-meta">{{ item.stepLabel }} | اقدام: {{ item.actByLabel }}</div>
              <div class="deal-card-meta">{{ formatMoney(item.amount) }} | {{ item.updatedAtLabel }}</div>
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
            <p class="detail-kicker">{{ selectedItem.dealCode }}</p>
            <h2 class="detail-title">{{ selectedItem.facility?.title || 'پرونده معامله' }}</h2>
            <p class="detail-subtitle">{{ selectedItem.customer?.name || 'مشتری' }} | {{ selectedItem.broker?.name || 'کارگزار' }}</p>
          </div>
          <button class="btn btn-outline-secondary btn-sm" @click="closeDetail">
            <i class="fa-solid fa-arrow-right me-1"></i>
            بازگشت به فهرست
          </button>
        </div>

        <div class="detail-grid">
          <div class="detail-stat"><span>وضعیت</span><strong>{{ selectedItem.statusLabel }}</strong></div>
          <div class="detail-stat"><span>مرحله</span><strong>{{ selectedItem.stepLabel }}</strong></div>
          <div class="detail-stat"><span>اقدام با</span><strong>{{ selectedItem.actByLabel }}</strong></div>
          <div class="detail-stat"><span>مبلغ درخواست</span><strong>{{ formatMoney(selectedItem.amount) }}</strong></div>
        </div>

        <div class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">کنترل مستقیم معامله</h3>
              <p class="section-subtitle">ادمین می‌تواند وضعیت، مرحله، صف اقدام و پیام این پرونده را از همین بخش تغییر دهد.</p>
            </div>
          </div>

          <div class="admin-action-grid">
            <select v-model="adminUpdateForm.status" class="form-select">
              <option value="">بدون تغییر وضعیت</option>
              <option v-for="item in statusOptions.filter((entry) => entry.value)" :key="`manage-status-${item.value}`" :value="item.value">{{ item.label }}</option>
            </select>
            <select v-model="adminUpdateForm.step" class="form-select">
              <option value="">بدون تغییر مرحله</option>
              <option v-for="item in stepOptions.filter((entry) => entry.value)" :key="`manage-step-${item.value}`" :value="item.value">{{ item.label }}</option>
            </select>
            <select v-model="adminUpdateForm.actBy" class="form-select">
              <option value="">بدون تغییر صف اقدام</option>
              <option v-for="item in actByOptions.filter((entry) => entry.value)" :key="`manage-actby-${item.value}`" :value="item.value">{{ item.label }}</option>
            </select>
          </div>

          <textarea v-model="adminUpdateForm.note" class="form-control mt-3" rows="3" placeholder="پیام یا توضیح ادمین برای این پرونده"></textarea>

          <div class="review-actions mt-3">
            <button class="btn btn-primary" :disabled="savingAdminUpdate" @click="submitAdminAction">
              <i v-if="savingAdminUpdate" class="fa-solid fa-spinner fa-spin me-1"></i>
              <i v-else class="fa-solid fa-floppy-disk me-1"></i>
              ثبت تغییرات ادمین
            </button>
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
              v-for="(item, idx) in detailWizardSteps"
              :key="item.key"
              type="button"
              class="deal-stage-step"
              :class="[`state-${item.state}`, { active: activeStageTab === item.key }]"
              @click="activeStageTab = item.key"
            >
              <span class="deal-stage-circle">{{ item.key === 'base' ? '•' : idx }}</span>
              <strong>{{ item.title }}</strong>
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
              <h3 class="section-title">اطلاعات پرونده</h3>
              <p class="section-subtitle">خلاصه فنی معامله، طرفین و زمان بندی</p>
            </div>
          </div>
          <div class="meta-grid">
            <div><span>نوع وام</span><strong>{{ selectedItem.typeLabel || selectedItem.facility?.typeLabel || '-' }}</strong></div>
            <div><span>نوع زیرشاخه</span><strong>{{ selectedItem.facilityData?.loanTypeTitle || selectedItem.facility?.loanTypeTitle || '-' }}</strong></div>
            <div><span>کارگزار</span><strong>{{ selectedItem.broker?.name || '-' }}</strong></div>
            <div><span>مشتری</span><strong>{{ selectedItem.customer?.name || '-' }}</strong></div>
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
              <p class="section-subtitle">رکورد اعتبارسنجی تاییدشده که هنگام ساخت معامله ذخیره شده است</p>
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
              <h3 class="section-title">مدارک و فیلدهای ارسالی</h3>
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
          <div v-else class="empty-inline">برای این پرونده مدرکی ثبت نشده است.</div>
        </div>

        <div v-if="activeStageTab === 'contract' && (selectedItem.contractData || selectedItem.paymentTypes?.length)" class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">جزئیات قرارداد</h3>
              <p class="section-subtitle">روش‌های پرداخت و نسخه فعلی قرارداد در این مرحله نمایش داده می‌شود.</p>
            </div>
            <button v-if="selectedItem.contractData" class="btn btn-sm btn-outline-secondary" :disabled="refreshingContract" @click="refreshContract">
              <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': refreshingContract }"></i>
              {{ refreshingContract ? 'در حال بازسازی...' : 'بازسازی قرارداد' }}
            </button>
          </div>

          <div v-if="paymentFacts.length" class="meta-grid">
            <div v-for="item in paymentFacts" :key="item.id || item.paymentType">
              <span>{{ item.paymentTypeLabel }}</span>
              <strong>{{ formatMoney(item.amount) }}</strong>
            </div>
          </div>

          <div v-if="selectedItem.contractSignedByCustomer || selectedItem.contractSignedByBroker" class="signature-actions mt-2">
            <button v-if="selectedItem.contractSignedByCustomer" class="btn btn-sm btn-outline-danger" :disabled="removingSignature === 'customer'" @click="removeSignature('customer')">
              <i class="fa-solid fa-eraser" :class="{ 'fa-spin': removingSignature === 'customer' }"></i>
              حذف امضای مشتری
            </button>
            <button v-if="selectedItem.contractSignedByBroker" class="btn btn-sm btn-outline-danger" :disabled="removingSignature === 'broker'" @click="removeSignature('broker')">
              <i class="fa-solid fa-eraser" :class="{ 'fa-spin': removingSignature === 'broker' }"></i>
              حذف امضای کارگزار
            </button>
          </div>

          <div v-if="selectedItem.contractData" class="contract-admin-preview mt-3">
            <iframe class="contract-admin-frame" :srcdoc="selectedItem.contractData"></iframe>
          </div>
        </div>

        <div v-if="activeStageTab === 'payment'" class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">اطلاعات پرداخت</h3>
              <p class="section-subtitle">روش‌های پرداخت تعریف‌شده و وضعیت امضای قرارداد برای این مرحله.</p>
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
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 16px;
  box-shadow: var(--admin-shadow);
}

.page-header {
  padding: 22px;
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
  background: var(--admin-primary-light);
  color: var(--admin-primary);
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
  color: var(--admin-muted);
  font-size: 13px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  border: 1px solid var(--admin-border);
  border-radius: 16px;
  padding: 16px;
  text-align: right;
  background: var(--admin-surface);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-card span {
  font-size: 12px;
  color: var(--admin-muted);
}

.summary-card strong {
  font-size: 26px;
}

.summary-card-info { background: rgba(59, 130, 246, 0.14); }
.summary-card-warning { background: rgba(245, 158, 11, 0.14); }
.summary-card-accent { background: rgba(99, 102, 241, 0.14); }
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

.deal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.deal-card {
  width: 100%;
  text-align: right;
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  background: var(--admin-surface-soft);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deal-card.active,
.deal-card:hover {
  border-color: rgba(11, 95, 131, 0.3);
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

.deal-card-meta,
.history-date,
.history-text,
.empty-inline {
  font-size: 12px;
  color: var(--admin-muted);
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
  color: var(--admin-muted);
  font-size: 12px;
}

.detail-title {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 6px;
}

.detail-subtitle {
  margin: 0;
  color: var(--admin-muted);
  font-size: 13px;
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
  border: 1px solid var(--admin-border);
  background: linear-gradient(180deg, var(--admin-surface) 0%, var(--admin-surface-soft) 100%);
  box-shadow: var(--admin-shadow);
}

.detail-route-empty {
  min-height: 320px;
}

.detail-grid,
.meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.admin-action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.deal-stage-wizard {
  display: flex;
  flex-wrap: nowrap;
  gap: 0;
  align-items: flex-start;
}

.detail-stat,
.meta-grid div,
.document-item,
.history-item {
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  background: var(--admin-surface-soft);
}

.detail-stat,
.meta-grid div {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-stat span,
.meta-grid span {
  font-size: 12px;
  color: var(--admin-muted);
}

.detail-stat strong,
.meta-grid strong {
  font-size: 14px;
}

.section-card {
  padding: 18px;
}

.deal-stage-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  flex: 1;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.deal-stage-step:active {
  transform: scale(0.96);
}

.deal-stage-step::before {
  content: '';
  position: absolute;
  top: 16px;
  left: calc(50% + 18px);
  right: -50%;
  height: 3px;
  border-radius: 2px;
  background: var(--admin-border);
  z-index: 0;
  transition: background 0.35s ease;
}

.deal-stage-step:first-child::before {
  display: none;
}

.deal-stage-step.state-done::before,
.deal-stage-step.state-completed::before {
  background: rgba(34, 197, 94, 0.45);
}

.deal-stage-step.state-current::before {
  background: rgba(11, 95, 131, 0.35);
}

.deal-stage-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  position: relative;
  z-index: 1;
  border: 2.5px solid var(--admin-border);
  background: var(--admin-surface, #fff);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.deal-stage-step.state-done .deal-stage-circle,
.deal-stage-step.state-completed .deal-stage-circle {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.55);
  color: #15803d;
}

.deal-stage-step.state-current .deal-stage-circle {
  background: rgba(11, 95, 131, 0.1);
  border-color: rgba(11, 95, 131, 0.55);
  color: #0b5f83;
}

.deal-stage-step.state-failed .deal-stage-circle {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.55);
  color: #b91c1c;
}

.deal-stage-step.state-paused .deal-stage-circle {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.55);
  color: #b45309;
}

.deal-stage-step.active .deal-stage-circle {
  box-shadow: 0 0 0 4px rgba(11, 95, 131, 0.12), 0 2px 12px rgba(11, 95, 131, 0.15);
  transform: scale(1.1);
}

.deal-stage-step strong {
  font-size: 10px;
  font-weight: 800;
  text-align: center;
  line-height: 1.3;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--admin-muted);
  transition: color 0.2s ease;
}

.deal-stage-step.active strong {
  color: #0b5f83;
}

.deal-stage-step.state-done strong,
.deal-stage-step.state-completed strong {
  color: #15803d;
}

.deal-stage-spotlight,
.contract-admin-preview {
  margin-top: 16px;
  border: 1px solid var(--admin-border);
  border-radius: 16px;
  background: var(--admin-surface-soft);
}

.signature-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.deal-stage-spotlight {
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
  color: var(--admin-muted);
  line-height: 1.9;
}

.contract-admin-preview {
  padding: 8px;
  min-height: 560px;
}

.contract-admin-frame {
  width: 100%;
  min-height: 540px;
  border: 0;
  border-radius: 12px;
  background: #fff;
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
  color: var(--admin-muted);
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
  color: var(--admin-muted);
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
  background: var(--admin-primary);
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
  color: var(--admin-primary);
}

.validation-result-box {
  margin-top: 14px;
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  background: var(--admin-surface-soft);
  padding: 14px 16px;
  font-size: 13px;
}

.validation-stage-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  background: var(--admin-surface-soft);
}

.validation-stage-head strong,
.validation-stage-item span {
  font-size: 14px;
  font-weight: 700;
}

.validation-stage-head p,
.validation-stage-item small {
  margin: 4px 0 0;
  color: var(--admin-muted);
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
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.35);
}

.validation-stage-value {
  max-width: 48%;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
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
  color: var(--admin-muted);
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
  color: var(--admin-muted);
  font-size: 13px;
}

.history-dropup-wrap {
  position: relative;
}

.history-dropup-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 14px;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface-soft);
  color: var(--admin-text, #1e293b);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.history-dropup-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.history-dropup-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--admin-primary, #0b5f83);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}

.history-dropup-panel {
  position: absolute;
  inset: calc(100% + 10px) 0 auto 0;
  max-height: 380px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow);
  z-index: 10;
}

.dropup-fade-enter-active,
.dropup-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropup-fade-enter-from,
.dropup-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 1199px) {
  .summary-grid,
  .detail-grid,
  .meta-grid,
  .validation-grid,
  .admin-action-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .summary-grid,
  .detail-grid,
  .meta-grid,
  .validation-grid,
  .admin-action-grid {
    grid-template-columns: 1fr;
  }

  .filter-row,
  .detail-head,
  .detail-route-head,
  .document-item,
  .validation-stage-item,
  .page-header-copy {
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