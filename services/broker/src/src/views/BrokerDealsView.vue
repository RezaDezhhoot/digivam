<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import AppPagination from '../components/AppPagination.vue';
import BrokerDealContractStage from '../components/BrokerDealContractStage.vue';
import DealChatModal from '../components/DealChatModal.vue';
import {
  getBrokerDeal,
  getBrokerDeals,
  getBrokerDealMessages,
  getBrokerDealSummary,
  getBrokerDealUnreadCount,
  reviewBrokerDeal,
  sendBrokerDealMessage,
  submitBrokerDealTransfer
} from '../services/broker-deal.api.js';
import { useAppToast } from '../composables/useToast.js';
import { truncateWords } from '../../../../web/src/src/utils/str.js';

const toast = useAppToast();
const route = useRoute();
const router = useRouter();

const listLoading = ref(false);
const summaryLoading = ref(false);
const detailLoading = ref(false);
const actionLoading = ref(false);
const exportLoading = ref(false);
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
const chatOpen = ref(false);
const chatUnreadCount = ref(0);
let unreadPollTimer = null;

const paymentMethodCatalog = [
  { value: 'cash', label: 'پرداخت نقدی', description: 'مشتری باید مبلغ تعیین شده را پرداخت نماید.' },
  { value: 'check', label: 'پرداخت با چک', description: 'مشتری باید اسناد چک یا سفته را بارگذاری کند.' }
];

const createReviewPaymentForm = () => ({
  cash: { enabled: true, amount: '', description: paymentMethodCatalog[0].description },
  check: { enabled: false, amount: '', description: paymentMethodCatalog[1].description }
});

const createTransferForm = () => ({
  description: '',
  files: []
});

const reviewPaymentForm = ref(createReviewPaymentForm());
const transferForm = ref(createTransferForm());

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
    item.updatedAtLabel,
    item.adminReviewData?.reason
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

const isNonBankingDeal = (item) => {
  const rawType = item?.type || item?.facilityData?.type || item?.facility?.type;
  return String(rawType || '').toLowerCase() === 'none_banking';
};

const transferStageTitle = computed(() => (isNonBankingDeal(selectedItem.value) ? 'انتقال وام' : 'انتقال امتیاز'));

const isBrokerTurn = (item) => {
  const actBy = String(item?.actBy || '').toLowerCase();
  return actBy === 'broker' || actBy === 'customer_broker';
};

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
const transferAttachments = computed(() => (Array.isArray(selectedItem.value?.transferData?.attachments) ? selectedItem.value.transferData.attachments : []));
const brokerConfirmationFee = computed(() => Number(selectedItem.value?.brokerConfirmationFee || 0));

const resultHistoryEntries = computed(() => (Array.isArray(selectedItem.value?.resultHistory) ? [...selectedItem.value.resultHistory].reverse() : []));
const resultHistoryCount = computed(() => resultHistoryEntries.value.length);
const selectedAdminReview = computed(() => selectedItem.value?.adminReviewData || null);
const getAdminReviewReason = (item) => item?.adminReviewData?.reason || 'این پرونده در حال بررسی مدیریت است.';

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

const resetTransferForm = () => {
  transferForm.value = createTransferForm();
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

const buildQuery = ({ page: nextPage = page.value, limit: nextLimit = limit.value } = {}) => {
  const params = new URLSearchParams({ page: String(nextPage), limit: String(nextLimit) });

  if (filters.value.status) {
    params.set('status', filters.value.status);
  }

  if (filters.value.step) {
    params.set('step', filters.value.step);
  }

  return `?${params.toString()}`;
};

const exportDealsToExcel = async () => {
  exportLoading.value = true;
  try {
    const data = await getBrokerDeals(buildQuery({ page: 1, limit: Math.max(total.value || 0, 1000) }));
    const normalizedQuery = localQuery.value.trim().toLowerCase();
    const sourceItems = Array.isArray(data.items) ? data.items : [];
    const exportItems = !normalizedQuery
      ? sourceItems
      : sourceItems.filter((item) => [
          item.id,
          item.dealCode,
          item.facility?.title,
          item.customer?.name,
          item.customer?.phone,
          item.typeLabel,
          item.stepLabel,
          item.updatedAtLabel,
          item.adminReviewData?.reason
        ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery)));

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
    XLSX.writeFile(workbook, `broker-deals-${new Date().toISOString().slice(0, 10)}.xlsx`);
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

const handleTransferFilesChange = (event) => {
  const newFiles = Array.from(event.target.files || []);
  transferForm.value = {
    ...transferForm.value,
    files: [
      ...transferForm.value.files,
      ...newFiles.map((file) => ({
        file,
        title: String(file.name || '').replace(/\.[^.]+$/, '').trim()
      }))
    ]
  };
  event.target.value = '';
};

const removeTransferFile = (index) => {
  const updated = [...transferForm.value.files];
  updated.splice(index, 1);
  transferForm.value = {
    ...transferForm.value,
    files: updated
  };
};

const clearTransferFiles = () => {
  transferForm.value = {
    ...transferForm.value,
    files: []
  };
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

  if (action === 'approve') {
    const alreadyPaid = Boolean(selectedItem.value?.brokerAlreadyPaid);
    let confirmationMessage = 'تایید نهایی پرونده ثبت شود؟';
    if (brokerConfirmationFee.value > 0 && !alreadyPaid) {
      confirmationMessage = `با تایید نهایی این پرونده، مبلغ ${formatMoney(brokerConfirmationFee.value)} از کیف پول شما کسر می‌شود. ادامه می‌دهید؟`;
    } else if (brokerConfirmationFee.value > 0 && alreadyPaid) {
      confirmationMessage = 'هزینه این پرونده قبلاً کسر شده است. تایید نهایی ثبت شود؟';
    }

    const { isConfirmed } = await Swal.fire({ title: 'تایید پرونده', text: confirmationMessage, icon: 'question', confirmButtonText: 'بله، تایید', cancelButtonText: 'انصراف', showCancelButton: true, reverseButtons: true });
    if (!isConfirmed) {
      return;
    }
  } else {
    const { isConfirmed } = await Swal.fire({ title: 'رد معامله', text: 'رد معامله با دلیل ثبت‌شده انجام شود؟', icon: 'warning', confirmButtonText: 'بله، رد شود', cancelButtonText: 'انصراف', showCancelButton: true, reverseButtons: true });
    if (!isConfirmed) {
      return;
    }
  }

  actionLoading.value = true;
  try {
    const data = await reviewBrokerDeal(selectedItem.value.id, {
      action,
      confirm: action === 'approve',
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

const submitTransfer = async () => {
  if (!selectedItem.value?.id || actionLoading.value) {
    return;
  }

  if (!transferForm.value.description.trim()) {
    toast.error('توضیحات انتقال را وارد کنید');
    return;
  }

  if (!transferForm.value.files.length) {
    toast.error('حداقل یک فایل برای مرحله انتقال بارگذاری کنید');
    return;
  }

  if (transferForm.value.files.some((entry) => !String(entry.title || '').trim())) {
    toast.error('برای هر فایل انتقال باید عنوان وارد کنید');
    return;
  }

  const { isConfirmed } = await Swal.fire({ title: 'ثبت انتقال', text: 'اطلاعات انتقال ثبت شود و پرونده وارد مرحله تایید مشتری شود؟', icon: 'question', confirmButtonText: 'بله، ثبت', cancelButtonText: 'انصراف', showCancelButton: true, reverseButtons: true });
  if (!isConfirmed) {
    return;
  }

  const formData = new FormData();
  formData.append('description', transferForm.value.description.trim());
  transferForm.value.files.forEach((entry) => {
    formData.append('files', entry.file);
    formData.append('fileTitles', entry.title.trim());
  });

  actionLoading.value = true;
  try {
    const data = await submitBrokerDealTransfer(selectedItem.value.id, formData);
    toast.success(data.message || 'اطلاعات انتقال ثبت شد');
    resetTransferForm();
    dispatchDealUpdate();
    await load({ includeSummary: true });
  } catch (error) {
    toast.error(error.message);
  } finally {
    actionLoading.value = false;
  }
};

const handleContractUpdated = async (item) => {
  selectedItem.value = item;
  activeStageTab.value = item?.step || activeStageTab.value;
  resetReviewPaymentForm(item);
  dispatchDealUpdate();
  await load({ includeSummary: true });
};

watch(selectedItem, (value) => {
  resetReviewPaymentForm(value);
  resetTransferForm();
});

watch(() => route.params.id, () => {
  loadSelected();
});

const fetchUnreadCount = async () => {
  if (!selectedItem.value?.id) return;
  try {
    const data = await getBrokerDealUnreadCount(selectedItem.value.id);
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
    <div class="page-header">
      <div class="page-header-copy">
        <div class="page-header-icon"><i class="fa-solid fa-briefcase"></i></div>
        <div>
          <h1 class="page-header-title">کارتابل معاملات</h1>
          <p class="page-header-desc">پرونده های ایجاد شده برای مشتریان، مرحله جاری و مدارک ارسالی را از اینجا دنبال کنید.</p>
        </div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-secondary" :disabled="exportLoading" @click="exportDealsToExcel">
          <i v-if="exportLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
          <i v-else class="fa-solid fa-file-excel me-1"></i>
          خروجی اکسل
        </button>
        <router-link class="btn btn-primary" to="/loan/create">
          <i class="fa-solid fa-file-invoice-dollar me-1"></i>
          ثبت امتیاز وام
        </router-link>
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
              :class="{ active: selectedId === item.id, 'act-by-marked': isBrokerTurn(item) }"
              @click="openItem(item.id)"
            >
              <div class="deal-card-head">
                <strong>{{ item.dealCode || `#${formatNumber(item.id)}` }}</strong>
                <span class="status-pill" :class="`status-pill-${item.status}`">{{ item.statusLabel }}</span>
              </div>
              <h2 class="deal-card-title">{{ item.facility?.title || 'بدون عنوان' }}</h2>
              <div class="deal-card-chip-row">
                <span class="deal-meta-chip">{{ item.customer?.name || 'مشتری' }}</span>
                <span class="deal-meta-chip muted">{{ item.typeLabel || item.facility?.typeLabel || '-' }}</span>
              </div>
              <div v-if="item.adminReviewMode" class="deal-card-meta admin-review-note">در بررسی مدیریت: {{ getAdminReviewReason(item) }}</div>
              <div class="deal-card-meta strong">{{ formatMoney(item.amount) }}</div>
              <div class="deal-card-meta">مرحله: {{ item.stepLabel }} | اقدام: {{ item.actByLabel }}</div>
              <div v-if="isBrokerTurn(item)" class="deal-card-meta"><span class="act-by-mark-chip">نوبت اقدام شما</span></div>
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
            <p class="detail-kicker">{{ selectedItem.dealCode || `DG-${formatNumber(selectedItem.id)}` }}</p>
            <h2 class="detail-title">{{ selectedItem.facility?.title || 'پرونده معامله' }}</h2>
            <p class="detail-subtitle">{{ selectedItem.customer?.name || 'مشتری نامشخص' }} | {{ selectedItem.customer?.phone || '-' }}</p>
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
          <div class="detail-stat">
            <span>بررسی مدیریت</span>
            <strong>{{ selectedItem.adminReviewMode ? 'فعال' : 'غیرفعال' }}</strong>
          </div>
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
                <a v-if="selectedItem.customerValidationData.selfValidationFileUrl" class="validation-file-link" :href="selectedItem.customerValidationData.selfValidationFileDownloadUrl || selectedItem.customerValidationData.selfValidationFileUrl" download rel="noreferrer">
                  {{ selectedItem.customerValidationData.selfValidationFileName || 'مشاهده فایل' }}
                </a>
                <template v-else>-</template>
              </strong>
            </div>
            <div>
              <span>گزارش نهایی اعتبارسنجی</span>
              <strong>
                <a v-if="selectedItem.customerValidationData.adminAttachmentUrl" class="validation-file-link" :href="selectedItem.customerValidationData.adminAttachmentDownloadUrl || selectedItem.customerValidationData.adminAttachmentUrl" download rel="noreferrer">
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
          <div v-else class="empty-inline">برای این پرونده مدرکی تعریف نشده است.</div>
        </div>



        <div v-if="activeStageTab === 'verify_broker' && selectedItem.canBrokerReview" class="section-card mt-3 review-card">
          <div class="section-head">
            <div>
              <h3 class="section-title">ثبت نظر کارگزار</h3>
              <p class="section-subtitle">برای تایید، حداقل یک روش پرداخت با مبلغ مشخص تعیین کنید. در صورت رد، دلیل الزامی است.</p>
            </div>
          </div>

          <div class="review-fee-banner">
            <strong>کاهش اعتبار این تایید</strong>
            <span>{{ formatMoney(brokerConfirmationFee) }}</span>
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
              <small v-if="Number(reviewPaymentForm[item.value].amount)" class="text-muted d-block mt-1">{{ formatMoney(reviewPaymentForm[item.value].amount) }}</small>

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

        <div v-if="activeStageTab === 'transfer'" class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">مرحله {{ transferStageTitle }}</h3>
              <p class="section-subtitle">توضیحات {{ transferStageTitle }} و فایل‌های این مرحله را ثبت کنید تا پرونده برای مشتری آماده مشاهده شود.</p>
            </div>
          </div>

          <div v-if="selectedItem.canBrokerSubmitTransfer" class="transfer-form-grid">
            <textarea
              v-model="transferForm.description"
              class="form-control"
              rows="4"
              :placeholder="`شرح مرحله ${transferStageTitle}، زمان تحویل، شماره پیگیری و نکات مهم را بنویسید`"
            ></textarea>

            <label class="transfer-upload-box">
              <input type="file" multiple @change="handleTransferFilesChange" />
              <span class="transfer-upload-title">بارگذاری فایل‌های مرحله {{ transferStageTitle }}</span>
              <small>{{ transferForm.files.length ? `${formatNumber(transferForm.files.length)} فایل انتخاب شده` : 'چند فایل را همزمان انتخاب کنید' }}</small>
            </label>

            <div v-if="transferForm.files.length" class="transfer-files-list">
              <div v-for="(entry, idx) in transferForm.files" :key="`${entry.file.name}-${entry.file.size}-${idx}`" class="transfer-file-item">
                <strong>{{ entry.file.name }}</strong>
                <input v-model="entry.title" type="text" class="form-control form-control-sm mt-2" placeholder="عنوان فایل مثل رسید پرداخت" />
                <div class="transfer-file-meta">
                  <span>{{ formatNumber(Math.round((entry.file.size || 0) / 1024)) }} کیلوبایت</span>
                  <button type="button" class="btn-remove-file" @click="removeTransferFile(idx)" title="حذف فایل">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>

              <label class="btn-add-more-file">
                <input type="file" multiple @change="handleTransferFilesChange" />
                <i class="fa-solid fa-plus me-1"></i>
                افزودن فایل دیگر
              </label>
            </div>

            <div class="review-actions">
              <button class="btn btn-success" :disabled="actionLoading" @click="submitTransfer">
                <i v-if="actionLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
                <i v-else class="fa-solid fa-paper-plane me-1"></i>
                ثبت اطلاعات انتقال
              </button>
            </div>
          </div>

          <div v-else class="transfer-summary-card">
            <strong>اطلاعات این مرحله قبلا ثبت شده است.</strong>
            <p>پس از ثبت اطلاعات انتقال، پرونده وارد مرحله تایید مشتری می‌شود و از همین صفحه نیز قابل پیگیری است.</p>
          </div>
        </div>

        <div v-if="['transfer', 'verify_customer'].includes(activeStageTab) && selectedItem.transferData" class="section-card mt-3">
          <div class="section-head">
            <div>
              <h3 class="section-title">خلاصه ثبت انتقال</h3>
              <p class="section-subtitle">آخرین توضیحات و فایل‌های بارگذاری‌شده برای این مرحله.</p>
            </div>
          </div>

          <div class="transfer-summary-card">
            <p>{{ selectedItem.transferData.description }}</p>
            <div class="meta-grid">
              <div>
                <span>ثبت‌کننده</span>
                <strong>{{ selectedItem.transferData.submittedBy?.name || 'کارگزار' }}</strong>
              </div>
              <div>
                <span>زمان ثبت</span>
                <strong>{{ selectedItem.transferData.submittedAtLabel || '-' }}</strong>
              </div>
            </div>
          </div>

          <div v-if="transferAttachments.length" class="transfer-files-list persisted mt-3">
            <a v-for="file in transferAttachments" :key="file.fileId" class="transfer-file-item link" :href="file.downloadUrl || file.url" download rel="noreferrer">
              <strong>{{ file.title || file.fileName }}</strong>
              <span>{{ formatNumber(Math.round((file.size || 0) / 1024)) }} کیلوبایت</span>
            </a>
          </div>
        </div>
      </div>
    </div>

    <DealChatModal
      v-if="chatOpen && selectedItem?.id"
      :deal-id="selectedItem.id"
      current-sender-type="broker"
      :get-messages="getBrokerDealMessages"
      :send-message="sendBrokerDealMessage"
      @close="chatOpen = false"
    />
  </section>
</template>

<style scoped src="./styles/BrokerDealsView.css"></style>