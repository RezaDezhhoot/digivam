<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPagination from '../components/AppPagination.vue';
import DealChatModal from '../components/DealChatModal.vue';
import { getAdminDeal, getAdminDeals, getAdminDealMessages, getAdminDealSummary, getAdminDealUnreadCount, refreshAdminDealContract, removeAdminDealSignature, sendAdminDealMessage, updateAdminDeal } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';
import { truncateWords } from '../../../../web/src/src/utils/str.js';

const toast = useAppToast();
const route = useRoute();
const router = useRouter();

const summaryLoading = ref(false);
const listLoading = ref(false);
const detailLoading = ref(false);
const exportLoading = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const items = ref([]);
const selectedItem = ref(null);
const chatOpen = ref(false);
const chatUnreadCount = ref(0);
let unreadPollTimer = null;
const activeStageTab = ref('base');
const adminUpdateForm = ref({ status: '', step: '', actBy: '', note: '', adminReviewMode: '', adminReviewReason: '' });
const savingAdminUpdate = ref(false);
const refreshingContract = ref(false);
const resultHistoryOpen = ref(false);
const summary = ref({ total: 0, inProgress: 0, failed: 0, suspended: 0, done: 0, waitingCustomer: 0, waitingBroker: 0, waitingAdmin: 0, verifyBroker: 0 });
const filters = ref({ status: '', step: '', actBy: '', search: '', adminReviewMode: '' });

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
  { label: 'در بررسی مدیریت', value: summary.value.waitingAdmin, filters: { status: '', step: '', actBy: '', adminReviewMode: 'true' }, tone: 'accent' },
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

const isNonBankingDeal = (item) => {
  const rawType = item?.type || item?.facilityData?.type || item?.facility?.type;
  return String(rawType || '').toLowerCase() === 'none_banking';
};

const transferStageTitle = computed(() => (isNonBankingDeal(selectedItem.value) ? 'انتقال وام' : 'انتقال امتیاز'));

const isAdminTurn = (item) => String(item?.actBy || '').toLowerCase() === 'admin';

const validationStages = computed(() => {
  const stages = selectedItem.value?.customerValidationData?.data?.stages;
  return Array.isArray(stages) ? stages : [];
});

const detailWizardSteps = computed(() => {
  if (Array.isArray(selectedItem.value?.wizardSteps) && selectedItem.value.wizardSteps.length) {
    return selectedItem.value.wizardSteps.map((item) => (
      item.key === 'transfer'
        ? { ...item, title: transferStageTitle.value }
        : item
    ));
  }

  return [
    { key: 'base', title: 'اطلاعات پایه معامله', description: 'اطلاعات اصلی پرونده، طرفین و خلاصه مالی معامله.', state: 'available' },
    ...stepOptions
      .filter((item) => item.value)
      .map((item) => ({
        key: item.value,
        title: item.value === 'transfer' ? transferStageTitle.value : item.label,
        description: 'جزئیات همین مرحله در این بخش نمایش داده می‌شود.',
        state: 'upcoming'
      }))
  ];
});

const selectedStageMeta = computed(() => detailWizardSteps.value.find((item) => item.key === activeStageTab.value) || detailWizardSteps.value[0] || null);
const contractPreviewKey = computed(() => {
  if (!selectedItem.value) {
    return 'contract-preview-empty';
  }

  return [
    selectedItem.value.id,
    selectedItem.value.contractSignedByCustomer,
    selectedItem.value.contractSignedByBroker,
    selectedItem.value.updatedAt || ''
  ].join('-');
});

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
const transferAttachments = computed(() => (Array.isArray(selectedItem.value?.transferData?.attachments) ? selectedItem.value.transferData.attachments : []));

const resultHistoryEntries = computed(() => (Array.isArray(selectedItem.value?.resultHistory) ? [...selectedItem.value.resultHistory].reverse() : []));
const resultHistoryCount = computed(() => resultHistoryEntries.value.length);
const selectedAdminReview = computed(() => selectedItem.value?.adminReviewData || null);
const getAdminReviewReason = (item) => item?.adminReviewData?.reason || 'این پرونده در حال بررسی مدیریت است.';

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

const buildQuery = ({ page: nextPage = page.value, limit: nextLimit = limit.value } = {}) => {
  const params = new URLSearchParams({ page: String(nextPage), limit: String(nextLimit) });

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

  if (filters.value.adminReviewMode === 'true' || filters.value.adminReviewMode === 'false') {
    params.set('adminReviewMode', filters.value.adminReviewMode);
  }

  return `?${params.toString()}`;
};

const exportDealsToExcel = async () => {
  exportLoading.value = true;
  try {
    const data = await getAdminDeals(buildQuery({ page: 1, limit: Math.max(total.value || 0, 1000) }));
    const exportItems = Array.isArray(data.items) ? data.items : [];
    if (!exportItems.length) {
      toast.warning('داده‌ای برای خروجی اکسل وجود ندارد');
      return;
    }

    const XLSX = await import('xlsx');
    const rows = exportItems.map((item, index) => ({
      'ردیف': index + 1,
      'کد معامله': item.dealCode || item.id,
      'عنوان وام': item.facility?.title || '-',
      'مشتری': item.customer?.name || '-',
      'موبایل مشتری': item.customer?.phone || '-',
      'کارگزار': item.broker?.name || '-',
      'نوع معامله': item.typeLabel || '-',
      'وضعیت': item.statusLabel || '-',
      'مرحله': item.stepLabel || '-',
      'اقدام با': item.actByLabel || '-',
      'مبلغ': Number(item.amount || 0),
      'بررسی مدیریت': item.adminReviewMode ? 'فعال' : 'غیرفعال',
      'دلیل بررسی مدیریت': item.adminReviewData?.reason || '-',
      'آخرین بروزرسانی': item.updatedAtLabel || '-'
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Deals');
    XLSX.writeFile(workbook, `admin-deals-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('خروجی اکسل معاملات آماده شد');
  } catch (error) {
    toast.error(error.message || 'ساخت خروجی اکسل با خطا مواجه شد');
  } finally {
    exportLoading.value = false;
  }
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
    adminUpdateForm.value = { status: '', step: '', actBy: '', note: '', adminReviewMode: '', adminReviewReason: '' };
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

  if (
    !adminUpdateForm.value.status &&
    !adminUpdateForm.value.step &&
    !adminUpdateForm.value.actBy &&
    !adminUpdateForm.value.note.trim() &&
    adminUpdateForm.value.adminReviewMode === ''
  ) {
    toast.error('حداقل یکی از تغییرات یا پیام ادمین را ثبت کنید');
    return;
  }

  savingAdminUpdate.value = true;
  try {
    const data = await updateAdminDeal(selectedItem.value.id, {
      status: adminUpdateForm.value.status || undefined,
      step: adminUpdateForm.value.step || undefined,
      actBy: adminUpdateForm.value.actBy || undefined,
      note: adminUpdateForm.value.note.trim() || undefined,
      adminReviewMode:
        adminUpdateForm.value.adminReviewMode === 'true'
          ? true
          : adminUpdateForm.value.adminReviewMode === 'false'
            ? false
            : undefined,
      adminReviewReason: adminUpdateForm.value.adminReviewReason.trim() || undefined
    });
    toast.success(data.message || 'تغییرات معامله ثبت شد');
    selectedItem.value = data.item || selectedItem.value;
    activeStageTab.value = (data.item || selectedItem.value)?.step || activeStageTab.value;
    adminUpdateForm.value = { status: '', step: '', actBy: '', note: '', adminReviewMode: '', adminReviewReason: '' };
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
    await loadSelected();
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
    await loadSelected();
  } catch (error) {
    toast.error(error.message || 'حذف امضا با خطا مواجه شد');
  } finally {
    removingSignature.value = '';
  }
};

const downloadingPdf = ref(false);

const createPdfExportNode = () => {
  const html = selectedItem.value?.contractData || '';
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

  const styles = doc.querySelectorAll('style');
  styles.forEach((style) => {
    const clonedStyle = document.createElement('style');
    clonedStyle.textContent = style.textContent;
    wrapper.appendChild(clonedStyle);
  });

  const bodyContent = doc.body?.innerHTML || html;
  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = bodyContent;
  wrapper.appendChild(bodyDiv);

  document.body.appendChild(wrapper);
  return { wrapper, exportNode: bodyDiv.querySelector('.deal-contract-wrap') || bodyDiv };
};

const waitForPdfImages = async (container) => {
  const images = Array.from(container.querySelectorAll('img') || []);
  await Promise.all(
    images.map(
      (image) =>
        new Promise((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        })
    )
  );
};

const downloadContract = async () => {
  if (!selectedItem.value?.contractData) {
    return;
  }

  downloadingPdf.value = true;
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
        filename: `admin-deal-contract-${selectedItem.value.id}.pdf`,
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      })
      .from(exportNode)
      .save();

    toast.success('نسخه PDF قرارداد دانلود شد.');
  } catch (error) {
    toast.error(error?.message || 'دانلود PDF قرارداد با خطا مواجه شد.');
  } finally {
    container?.remove();
    downloadingPdf.value = false;
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
  filters.value = { status: '', step: '', actBy: '', search: '', adminReviewMode: '' };
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

const fetchUnreadCount = async () => {
  if (!selectedItem.value?.id) return;
  try {
    const data = await getAdminDealUnreadCount(selectedItem.value.id);
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

watch(() => selectedItem.value?.id, (id) => {
  if (id) startUnreadPoll();
  else stopUnreadPoll();
});

watch(chatOpen, (open) => {
  if (!open) fetchUnreadCount();
});

onMounted(() => {
  load();
});
onUnmounted(stopUnreadPoll);
</script>

<template>
  <section class="animate-in">
    <div class="page-header d-flex align-items-center justify-content-between gap-3 flex-wrap">
      <div class="page-header-copy">
        <div class="page-header-icon"><i class="fa-solid fa-briefcase"></i></div>
        <div>
          <h1 class="page-header-title">مدیریت معاملات</h1>
          <p class="page-header-desc">پایش همه پرونده های معامله، صف اقدام و وضعیت مدارک در یک نمای متمرکز.</p>
        </div>
      </div>
      <button class="btn btn-outline-secondary" :disabled="exportLoading" @click="exportDealsToExcel">
        <i v-if="exportLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
        <i v-else class="fa-solid fa-file-excel me-1"></i>
        خروجی اکسل
      </button>
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
        <select v-model="filters.adminReviewMode" class="form-select">
          <option value="">همه وضعیت‌های مدیریت</option>
          <option value="true">فقط در بررسی مدیریت</option>
          <option value="false">خارج از بررسی مدیریت</option>
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
              :class="{ active: selectedId === item.id, 'act-by-marked': isAdminTurn(item) }"
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
              <div v-if="isAdminTurn(item)" class="deal-card-meta"><span class="act-by-mark-chip">نوبت اقدام شما</span></div>
              <div v-if="item.adminReviewMode" class="deal-card-meta admin-review-note">در بررسی مدیریت: {{ getAdminReviewReason(item) }}</div>
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
          <div class="detail-head-actions">
            <button class="deal-chat-fab" title="گفتگوی معامله" @click="chatOpen = true">
              <i class="fa-solid fa-comments me-1"></i>
              گفتگو
              <span v-if="chatUnreadCount" class="deal-chat-badge">{{ chatUnreadCount }}</span>
            </button>
            <button class="btn btn-outline-secondary btn-sm" @click="closeDetail">
              <i class="fa-solid fa-arrow-right me-1"></i>
              بازگشت به فهرست
            </button>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-stat"><span>وضعیت</span><strong>{{ selectedItem.statusLabel }}</strong></div>
          <div class="detail-stat"><span>مرحله</span><strong>{{ selectedItem.stepLabel }}</strong></div>
          <div class="detail-stat"><span>اقدام با</span><strong>{{ selectedItem.actByLabel }}</strong></div>
          <div class="detail-stat"><span>مبلغ درخواست</span><strong>{{ formatMoney(selectedItem.amount) }}</strong></div>
          <div class="detail-stat"><span>بررسی مدیریت</span><strong>{{ selectedItem.adminReviewMode ? 'فعال' : 'غیرفعال' }}</strong></div>
        </div>

        <div v-if="selectedAdminReview && selectedItem.adminReviewMode" class="admin-review-banner mt-3" :class="{ active: selectedItem.adminReviewMode }">
          <div>
            <strong>{{ selectedItem.adminReviewMode ? 'پرونده در حال بررسی مدیریت است' : 'آخرین داده ثبت‌شده برای بررسی مدیریت' }}</strong>
            <p>{{ selectedAdminReview.reason || 'دلیلی ثبت نشده است.' }}</p>
          </div>
          <div class="admin-review-banner-meta">
            <span>درخواست‌دهنده: {{ selectedAdminReview.requestedByLabel || '-' }}</span>
            <span>زمان ثبت: {{ selectedAdminReview.requestedAtLabel || '-' }}</span>
          </div>
        </div>

        <div class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">کنترل مستقیم معامله</h3>
              <p class="section-subtitle">ادمین می‌تواند وضعیت، مرحله، صف اقدام، پیام پرونده و ورود یا خروج از بررسی مدیریت را از همین بخش کنترل کند.</p>
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
            <select v-model="adminUpdateForm.adminReviewMode" class="form-select">
              <option value="">بدون تغییر بررسی مدیریت</option>
              <option value="true">ورود به بررسی مدیریت</option>
              <option value="false">خروج از بررسی مدیریت</option>
            </select>
          </div>

          <textarea v-model="adminUpdateForm.note" class="form-control mt-3" rows="3" placeholder="پیام یا توضیح ادمین برای این پرونده"></textarea>
          <textarea v-model="adminUpdateForm.adminReviewReason" class="form-control mt-3" rows="3" placeholder="دلیل بررسی مدیریت یا توضیح آزادسازی پرونده"></textarea>

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
            <div v-if="selectedItem.brokerConfirmationAmount"><span>کاهش اعتبار کسرشده</span><strong>{{ formatMoney(selectedItem.brokerConfirmationAmount) }}</strong></div>
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

          <div class="validation-snapshot-grid">
            <article class="validation-snapshot-card">
              <span class="validation-snapshot-icon tone-info"><i class="fa-solid fa-shield-heart"></i></span>
              <div>
                <span>روش اعتبارسنجی</span>
                <strong>{{ selectedItem.customerValidationData.selfValidationLabel || '-' }}</strong>
              </div>
            </article>
            <article class="validation-snapshot-card">
              <span class="validation-snapshot-icon tone-success"><i class="fa-solid fa-badge-check"></i></span>
              <div>
                <span>وضعیت</span>
                <strong>{{ selectedItem.customerValidationData.statusLabel || '-' }}</strong>
              </div>
            </article>
            <article class="validation-snapshot-card">
              <span class="validation-snapshot-icon tone-accent"><i class="fa-solid fa-layer-group"></i></span>
              <div>
                <span>نام سرویس</span>
                <strong>{{ selectedItem.customerValidationData.validation?.title || '-' }}</strong>
              </div>
            </article>
            <article class="validation-snapshot-card">
              <span class="validation-snapshot-icon tone-warning"><i class="fa-solid fa-wallet"></i></span>
              <div>
                <span>مبلغ پرداختی</span>
                <strong>{{ formatMoney(selectedItem.customerValidationData.paidAmount) }}</strong>
              </div>
            </article>
            <article class="validation-snapshot-card">
              <span class="validation-snapshot-icon tone-neutral"><i class="fa-solid fa-calendar-clock"></i></span>
              <div>
                <span>انقضا</span>
                <strong>{{ selectedItem.customerValidationData.expiresAtLabel || '-' }}</strong>
              </div>
            </article>
            <article class="validation-snapshot-card wide">
              <span class="validation-snapshot-icon tone-accent"><i class="fa-solid fa-file-circle-check"></i></span>
              <div>
                <span>فایل خوداظهاری</span>
                <strong>
                  <a v-if="selectedItem.customerValidationData.selfValidationFileUrl" class="validation-file-link" :href="selectedItem.customerValidationData.selfValidationFileDownloadUrl || selectedItem.customerValidationData.selfValidationFileUrl" download rel="noreferrer">
                    {{ selectedItem.customerValidationData.selfValidationFileName || 'مشاهده فایل' }}
                  </a>
                  <template v-else>-</template>
                </strong>
              </div>
            </article>
            <article class="validation-snapshot-card wide">
              <span class="validation-snapshot-icon tone-info"><i class="fa-solid fa-file-shield"></i></span>
              <div>
                <span>گزارش نهایی اعتبارسنجی</span>
                <strong>
                  <a v-if="selectedItem.customerValidationData.adminAttachmentUrl" class="validation-file-link" :href="selectedItem.customerValidationData.adminAttachmentDownloadUrl || selectedItem.customerValidationData.adminAttachmentUrl" download rel="noreferrer">
                    {{ selectedItem.customerValidationData.adminAttachmentFileName || 'دانلود گزارش نهایی' }}
                  </a>
                  <template v-else>-</template>
                </strong>
              </div>
            </article>
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
                <span class="validation-stage-badge">{{ formatNumber(stage.items?.length || 0) }} مورد</span>
              </div>

              <div v-if="stage.items?.length" class="validation-stage-items">
                <div v-for="entry in stage.items" :key="entry.id || `${stage.id}-${entry.title}`" class="validation-stage-item">
                  <div class="validation-stage-copy">
                    <span class="validation-stage-item-icon">
                      <i :class="entry.type === 'file' ? 'fa-solid fa-paperclip' : entry.type === 'date' ? 'fa-solid fa-calendar-days' : entry.type === 'number' ? 'fa-solid fa-hashtag' : 'fa-solid fa-lines-leaning'"></i>
                    </span>
                    <div>
                      <span>{{ entry.title }}</span>
                      <small>{{ entry.typeLabel || entry.categoryLabel || 'داده ثبت‌شده' }}</small>
                    </div>
                  </div>
                  <div class="validation-stage-value">
                    <a v-if="entry.type === 'file' && entry.value?.url" class="btn btn-sm btn-outline-secondary" :href="entry.value.downloadUrl || entry.value.url" download rel="noreferrer">
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
              <div class="document-item-copy">
                <span class="document-kind-icon">
                  <i :class="document.type === 'file' ? 'fa-solid fa-paperclip' : document.type === 'date' ? 'fa-solid fa-calendar-days' : document.type === 'number' ? 'fa-solid fa-hashtag' : 'fa-solid fa-align-right'"></i>
                </span>
                <div>
                  <strong>{{ document.title }}</strong>
                  <p>{{ document.help || document.subject || 'بدون توضیح' }}</p>
                </div>
              </div>
              <div class="document-value">
                <template v-if="document.type === 'file' && document.value?.url">
                  <a class="btn btn-sm btn-outline-secondary" :href="document.value.downloadUrl || document.value.url" download rel="noreferrer">
                    <i class="fa-solid fa-paperclip me-1"></i>
                    {{ truncateWords(document.value.fileName || 'مشاهده فایل') }}
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
            <div v-if="selectedItem.contractData" class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-secondary" :disabled="downloadingPdf" @click="downloadContract">
                <i class="fa-solid fa-file-pdf" :class="{ 'fa-spin': downloadingPdf }"></i>
                {{ downloadingPdf ? 'در حال آماده‌سازی...' : 'دانلود PDF' }}
              </button>
              <button class="btn btn-sm btn-outline-secondary" :disabled="refreshingContract" @click="refreshContract">
                <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': refreshingContract }"></i>
                {{ refreshingContract ? 'در حال بازسازی...' : 'بازسازی قرارداد' }}
              </button>
            </div>
          </div>

          <div v-if="paymentFacts.length" class="payment-types-list">
            <div v-for="item in paymentFacts" :key="item.id || item.paymentType" class="payment-type-card">
              <div class="payment-type-head">
                <strong>{{ item.paymentTypeLabel }}</strong>
                <span class="status-pill" :class="item.status === 'done' ? 'status-pill-done' : 'status-pill-pending'">{{ item.statusLabel || (item.status === 'done' ? 'انجام شد' : 'در انتظار') }}</span>
              </div>
              <div class="meta-grid">
                <div>
                  <span>مبلغ</span>
                  <strong>{{ formatMoney(item.amount) }}</strong>
                </div>
                <div v-if="item.values?.authority">
                  <span>کد پیگیری</span>
                  <strong>{{ item.values.authority }}</strong>
                </div>
                <div v-if="item.values?.paidAt">
                  <span>تاریخ پرداخت</span>
                  <strong>{{ formatDate(item.values.paidAt) }}</strong>
                </div>
                <div v-if="item.doneAtLabel">
                  <span>تاریخ تکمیل</span>
                  <strong>{{ item.doneAtLabel }}</strong>
                </div>
                <div v-if="item.values?.checkDate">
                  <span>تاریخ چک</span>
                  <strong>{{ formatJalaliDate(item.values.checkDate) }}</strong>
                </div>
                <div v-if="item.values?.fullName">
                  <span>نام صاحب چک</span>
                  <strong>{{ item.values.fullName }}</strong>
                </div>
                <div v-if="item.values?.nationalCode">
                  <span>کد ملی</span>
                  <strong>{{ item.values.nationalCode }}</strong>
                </div>
                <div v-if="item.paymentType === 'check' && item.values">
                  <span>ثبت در صیاد</span>
                  <strong>{{ item.values.sayadRegistered ? 'بله' : 'خیر' }}</strong>
                </div>
              </div>
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
            <iframe :key="contractPreviewKey" class="contract-admin-frame" :srcdoc="selectedItem.contractData"></iframe>
          </div>
        </div>

        <div v-if="activeStageTab === 'payment'" class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">اطلاعات پرداخت</h3>
              <p class="section-subtitle">روش‌های پرداخت تعریف‌شده و وضعیت امضای قرارداد برای این مرحله.</p>
            </div>
          </div>

          <div v-if="paymentFacts.length" class="payment-types-list">
            <div v-for="item in paymentFacts" :key="`payment-${item.id || item.paymentType}`" class="payment-type-card">
              <div class="payment-type-head">
                <strong>{{ item.paymentTypeLabel }}</strong>
                <span class="status-pill" :class="item.status === 'done' ? 'status-pill-done' : 'status-pill-pending'">{{ item.statusLabel || (item.status === 'done' ? 'انجام شد' : 'در انتظار') }}</span>
              </div>
              <div class="meta-grid">
                <div>
                  <span>مبلغ</span>
                  <strong>{{ formatMoney(item.amount) }}</strong>
                </div>
                <div v-if="item.values?.authority">
                  <span>کد پیگیری</span>
                  <strong>{{ item.values.authority }}</strong>
                </div>
                <div v-if="item.values?.paidAt">
                  <span>تاریخ پرداخت</span>
                  <strong>{{ formatDate(item.values.paidAt) }}</strong>
                </div>
                <div v-if="item.doneAtLabel">
                  <span>تاریخ تکمیل</span>
                  <strong>{{ item.doneAtLabel }}</strong>
                </div>
                <div v-if="item.values?.checkDate">
                  <span>تاریخ چک</span>
                  <strong>{{ formatJalaliDate(item.values.checkDate) }}</strong>
                </div>
                <div v-if="item.values?.fullName">
                  <span>نام صاحب چک</span>
                  <strong>{{ item.values.fullName }}</strong>
                </div>
                <div v-if="item.values?.nationalCode">
                  <span>کد ملی</span>
                  <strong>{{ item.values.nationalCode }}</strong>
                </div>
                <div v-if="item.paymentType === 'check' && item.values">
                  <span>ثبت در صیاد</span>
                  <strong>{{ item.values.sayadRegistered ? 'بله' : 'خیر' }}</strong>
                </div>
                <div v-if="item.description">
                  <span>توضیحات</span>
                  <strong>{{ item.description }}</strong>
                </div>
              </div>
              <div v-if="item.values?.files?.length" class="payment-files-list">
                <a v-for="file in item.values.files" :key="file.fileId" class="payment-file-link" :href="file.downloadUrl || file.fileUrl" download rel="noreferrer">
                  <i class="fa-solid fa-paperclip"></i>
                  {{ file.fileName }}
                </a>
              </div>
            </div>
          </div>

          <div v-if="paymentFacts.length" class="meta-grid mt-3">
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

        <div v-if="['transfer', 'verify_customer', 'finished'].includes(activeStageTab) && selectedItem.transferData" class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">اطلاعات مرحله {{ transferStageTitle }}</h3>
              <p class="section-subtitle">توضیحات و فایل‌های ثبت‌شده توسط کارگزار برای مرحله {{ transferStageTitle }}.</p>
            </div>
          </div>

          <div class="validation-result-box">
            {{ selectedItem.transferData.description }}
          </div>

          <div class="meta-grid mt-3">
            <div>
              <span>ثبت‌کننده</span>
              <strong>{{ selectedItem.transferData.submittedBy?.name || 'کارگزار' }}</strong>
            </div>
            <div>
              <span>زمان ثبت</span>
              <strong>{{ selectedItem.transferData.submittedAtLabel || '-' }}</strong>
            </div>
          </div>

          <div v-if="transferAttachments.length" class="document-list mt-3">
            <div v-for="file in transferAttachments" :key="file.fileId" class="document-item">
              <div>
                <strong>{{ file.fileName }}</strong>
                <p>{{ formatNumber(Math.round((file.size || 0) / 1024)) }} کیلوبایت</p>
              </div>
              <div class="document-value">
                <a class="btn btn-sm btn-outline-secondary" :href="file.downloadUrl || file.url" download rel="noreferrer">
                  <i class="fa-solid fa-paperclip me-1"></i>
                  {{ file.title || file.fileName || 'دانلود فایل' }}
                </a>
              </div>
            </div>
          </div>
        </div>

      
      </div>
    </div>

    <DealChatModal
      v-if="chatOpen && selectedItem?.id"
      :deal-id="selectedItem.id"
      current-sender-type="admin"
      :get-messages="getAdminDealMessages"
      :send-message="sendAdminDealMessage"
      @close="chatOpen = false"
    />
  </section>
</template>

<style scoped src="./styles/AdminDealsView.css"></style>