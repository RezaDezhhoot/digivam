<script setup>
import { computed, onMounted, ref } from 'vue';
import SimpleBarChart from '../components/SimpleBarChart.vue';
import LineChart from '../components/LineChart.vue';
import { getPageViews, getSummary, getDealAnalytics } from '../services/admin-api.js';

const loading = ref(false);
const summary = ref({
  brokers: 0,
  customers: 0,
  admins: 0,
  guarantees: 0,
  loanTypes: 0,
  documents: 0,
  validations: 0,
  facilities: 0,
  pendingFacilities: 0,
  publishedFacilities: 0,
  rejectedFacilities: 0,
  inProgressFacilities: 0,
  expiredFacilities: 0,
  totalFacilityViews: 0,
  topViewedFacilities: [],
  invoices: 0,
  paidInvoices: 0,
  paidInvoiceAmount: '0',
  walletTransactions: 0,
  confirmedWalletTransactions: 0,
  confirmedWalletAmount: '0',
  pendingTickets: 0,
  deals: {
    total: 0,
    inProgress: 0,
    failed: 0,
    suspended: 0,
    done: 0,
    waitingCustomer: 0,
    waitingBroker: 0,
    waitingAdmin: 0,
    verifyBroker: 0
  },
  todayActivity: {
    newBrokers: 0,
    newCustomers: 0,
    newFacilities: 0,
    newTickets: 0
  }
});

const stats = [
  { key: 'brokers', label: 'کارگزاران', icon: 'fa-solid fa-user-tie', color: '#0b5f83', bg: '#e8f4fa' },
  { key: 'customers', label: 'مشتریان', icon: 'fa-solid fa-users', color: '#22a06b', bg: '#e6f9ef' },
  { key: 'admins', label: 'ادمین ها', icon: 'fa-solid fa-user-shield', color: '#6366f1', bg: '#eef0ff' },
  { key: 'facilities', label: 'امتیازهای وام', icon: 'fa-solid fa-file-invoice-dollar', color: '#b42318', bg: '#fef3f2' },
  { key: 'guarantees', label: 'ضمانت ها', icon: 'fa-solid fa-shield-halved', color: '#0891b2', bg: '#e0f7fa' },
  { key: 'documents', label: 'مستندات', icon: 'fa-solid fa-folder-open', color: '#0f766e', bg: '#dcfce7' },
  { key: 'validations', label: 'روش های اعتبارسنجی', icon: 'fa-solid fa-list-check', color: '#7c3aed', bg: '#f3e8ff' },
  { key: 'loanTypes', label: 'انواع وام', icon: 'fa-solid fa-layer-group', color: '#be123c', bg: '#ffe4e6' },
  { key: 'invoices', label: 'کل invoice ها', icon: 'fa-solid fa-file-invoice-dollar', color: '#0f172a', bg: '#e2e8f0' },
  { key: 'walletTransactions', label: 'تراکنش کیف پول', icon: 'fa-solid fa-money-bill-transfer', color: '#15803d', bg: '#dcfce7' },
  { key: 'pendingTickets', label: 'تیکت در انتظار', icon: 'fa-solid fa-clock', color: '#d97706', bg: '#fef3c7' }
];

const financeCards = [
  {
    key: 'paidInvoiceAmount',
    title: 'ارزش پرداخت موفق',
    countKey: 'paidInvoices',
    countLabel: 'invoice موفق',
    icon: 'fa-solid fa-dollar',
    tone: 'blue'
  },
  {
    key: 'confirmedWalletAmount',
    title: 'حجم تراکنش تایید شده',
    countKey: 'confirmedWalletTransactions',
    countLabel: 'تراکنش تایید شده',
    icon: 'fa-solid fa-wallet',
    tone: 'green'
  }
];

const facilityCards = computed(() => [
  { label: 'کل ثبت ها', value: summary.value.facilities, tone: 'neutral', icon: 'fa-solid fa-file-invoice-dollar' },
  { label: 'در حال بررسی', value: summary.value.pendingFacilities, tone: 'warning', icon: 'fa-solid fa-hourglass-half' },
  { label: 'تایید شده', value: summary.value.publishedFacilities, tone: 'success', icon: 'fa-solid fa-circle-check' },
  { label: 'رد شده', value: summary.value.rejectedFacilities, tone: 'danger', icon: 'fa-solid fa-circle-xmark' },
  { label: 'جاری', value: summary.value.inProgressFacilities, tone: 'info', icon: 'fa-solid fa-spinner' },
  { label: 'منقضی', value: summary.value.expiredFacilities, tone: 'muted', icon: 'fa-solid fa-calendar-xmark' },
  { label: 'کل بازدیدها', value: summary.value.totalFacilityViews, tone: 'neutral', icon: 'fa-solid fa-chart-column' }
]);

const todayActivityCards = computed(() => [
  { label: 'کارگزار جدید امروز', value: summary.value.todayActivity?.newBrokers || 0, icon: 'fa-solid fa-user-plus', tone: 'blue' },
  { label: 'مشتری جدید امروز', value: summary.value.todayActivity?.newCustomers || 0, icon: 'fa-solid fa-user-group', tone: 'green' },
  { label: 'امتیاز جدید امروز', value: summary.value.todayActivity?.newFacilities || 0, icon: 'fa-solid fa-file-circle-plus', tone: 'rose' },
  { label: 'تیکت جدید امروز', value: summary.value.todayActivity?.newTickets || 0, icon: 'fa-solid fa-ticket', tone: 'amber' }
]);

const dealCards = computed(() => [
  { label: 'کل معاملات', value: summary.value.deals?.total || 0, className: '' },
  { label: 'در جریان', value: summary.value.deals?.inProgress || 0, className: 'cv-summary-info' },
  { label: 'در بررسی کارگزار', value: summary.value.deals?.verifyBroker || 0, className: 'cv-summary-pending' },
  { label: 'منتظر ادمین', value: summary.value.deals?.waitingAdmin || 0, className: 'cv-summary-accent' },
  { label: 'ناموفق', value: summary.value.deals?.failed || 0, className: 'cv-summary-rejected' }
]);

const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;

const visitDays = ref(10);
const visitItems = ref([]);
const visitLoading = ref(false);

const dealsPeriod = ref('daily');
const dealsChartItems = ref([]);
const dealsLoading = ref(false);

const loadVisits = async () => {
  visitLoading.value = true;
  try {
    const data = await getPageViews(`?days=${visitDays.value}`);
    visitItems.value = data.items || [];
  } catch (_) { /* ignore */ }
  finally { visitLoading.value = false; }
};

const loadDealAnalytics = async () => {
  dealsLoading.value = true;
  try {
    const data = await getDealAnalytics(`?period=${dealsPeriod.value}`);
    dealsChartItems.value = data.items || [];
  } catch (_) { /* ignore */ }
  finally { dealsLoading.value = false; }
};

const load = async () => {
  loading.value = true;
  try {
    summary.value = await getSummary();
  } catch (_) {
    /* ignore */
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  load();
  loadVisits();
  loadDealAnalytics();
});
</script>

<template>
  <div class="animate-in">
    <div class="dashboard-welcome">
      <div class="welcome-icon"><i class="fa-solid fa-gauge-high"></i></div>
      <div>
        <h1 class="welcome-title">داشبورد مدیریت</h1>
        <p class="welcome-subtitle">نمای کلی وضعیت سامانه دی جی وام</p>
      </div>
    </div>

    <div v-if="loading" class="spinner-overlay">
      <i class="fa-solid fa-spinner"></i>
      <span>در حال بارگذاری...</span>
    </div>

    <template v-else>
      <div class="stats-grid">
        <div v-for="stat in stats" :key="stat.key" class="stat-card">
          <div class="stat-icon" :style="{ background: stat.bg, color: stat.color }">
            <i :class="stat.icon"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">{{ stat.label }}</span>
            <span class="stat-value">{{ summary[stat.key] }}</span>
          </div>
        </div>
      </div>

      <div class="finance-grid mt-4">
        <div v-for="card in financeCards" :key="card.key" class="finance-card" :class="`finance-card-${card.tone}`">
          <div class="finance-card-pattern"></div>
          <div class="finance-card-head">
            <div class="finance-card-icon"><i :class="card.icon"></i></div>
            <div>
              <h2 class="finance-card-title">{{ card.title }}</h2>
              <p class="finance-card-subtitle">{{ summary[card.countKey] }} {{ card.countLabel }}</p>
            </div>
          </div>
          <div class="finance-card-value">{{ formatMoney(summary[card.key]) }}</div>
        </div>
      </div>

      <div class="today-grid mt-4">
        <div v-for="item in todayActivityCards" :key="item.label" class="today-card" :class="`today-card-${item.tone}`">
          <div class="today-card-icon"><i :class="item.icon"></i></div>
          <div>
            <p class="today-card-label">{{ item.label }}</p>
            <strong class="today-card-value">{{ item.value }}</strong>
          </div>
        </div>
      </div>
       <div v-if="summary.customerValidations" class="cv-summary-card mt-4">
        <div class="section-head">
          <div>
            <h2 class="section-title">گزارش اعتبارسنجی مشتریان</h2>
            <p class="section-subtitle">خلاصه وضعیت درخواست های اعتبارسنجی مشتریان</p>
          </div>
        </div>
        <div class="cv-summary-grid">
          <div class="cv-summary-item">
            <span>کل درخواست ها</span>
            <strong>{{ summary.customerValidations.total }}</strong>
          </div>
          <div class="cv-summary-item cv-summary-pending">
            <span>در انتظار بررسی</span>
            <strong>{{ summary.customerValidations.pending }}</strong>
          </div>
          <div class="cv-summary-item cv-summary-approved">
            <span>تایید شده</span>
            <strong>{{ summary.customerValidations.approved }}</strong>
          </div>
          <div class="cv-summary-item cv-summary-rejected">
            <span>رد شده</span>
            <strong>{{ summary.customerValidations.rejected }}</strong>
          </div>
        </div>
      </div>

      <div class="cv-summary-card mt-4">
        <div class="section-head">
          <div>
            <h2 class="section-title">گزارش معاملات</h2>
            <p class="section-subtitle">وضعیت کلی پرونده های معامله در همه صف ها</p>
          </div>
          <router-link class="btn btn-outline-primary btn-sm" to="/deals">
            <i class="fa-solid fa-arrow-left me-1"></i>
            مشاهده معاملات
          </router-link>
        </div>
        <div class="cv-summary-grid cv-summary-grid-5">
          <div v-for="item in dealCards" :key="item.label" class="cv-summary-item" :class="item.className">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>

      <div class="cv-summary-card mt-4">
        <div class="section-head">
          <div>
            <h2 class="section-title">تجزیه و تحلیل مبالغ تأیید کارگزار</h2>
            <p class="section-subtitle">رندوی مبالغ broker_confirmation_amount معاملات</p>
          </div>
          <div class="visit-range-controls">
            <select v-model="dealsPeriod" class="form-select form-select-sm" @change="loadDealAnalytics">
              <option value="daily">روزانه (۳۰ روز)</option>
              <option value="weekly">هفتگی (۱۲ هفته)</option>
              <option value="monthly">ماهانه (۱۲ ماه)</option>
              <option value="yearly">سالانه (۵ سال)</option>
            </select>
          </div>
        </div>
        <div v-if="dealsLoading" class="text-center text-muted py-4">در حال بارگذاری...</div>
        <div v-else-if="!dealsChartItems.length" class="text-center text-muted py-4">داده‌ای برای نمایش وجود ندارد</div>
        <LineChart v-else :items="dealsChartItems" />
      </div>

      <div class="cv-summary-card mt-4">
        <div class="section-head">
          <div>
            <h2 class="section-title">آمار بازدید وب‌سایت</h2>
            <p class="section-subtitle">تعداد بازدید روزانه از سایت عمومی</p>
          </div>
          <div class="visit-range-controls">
            <select v-model.number="visitDays" class="form-select form-select-sm" @change="loadVisits">
              <option :value="7">۷ روز اخیر</option>
              <option :value="10">۱۰ روز اخیر</option>
              <option :value="14">۱۴ روز اخیر</option>
              <option :value="30">۳۰ روز اخیر</option>
              <option :value="60">۶۰ روز اخیر</option>
              <option :value="90">۹۰ روز اخیر</option>
            </select>
          </div>
        </div>
        <div v-if="visitLoading" class="text-center text-muted py-4">در حال بارگذاری...</div>
        <div v-else-if="!visitItems.length" class="text-center text-muted py-4">داده‌ای برای نمایش وجود ندارد</div>
        <LineChart v-else :items="visitItems" />
      </div>

      <div class="row g-3 mt-2">
        <div class="col-12 col-xl-5">
          <div class="facility-overview-card">
            <div class="section-head">
              <div>
                <h2 class="section-title">خلاصه وضعیت امتیازهای وام</h2>
                <p class="section-subtitle">همه وضعیت های ثبت وام در یک نگاه</p>
              </div>
            </div>

            <div class="facility-grid">
              <div v-for="item in facilityCards" :key="item.label" class="facility-mini-card" :class="`facility-mini-card-${item.tone}`">
                <div class="facility-mini-icon"><i :class="item.icon"></i></div>
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-xl-7">
          <div class="facility-chart-card">
            <div class="section-head">
              <div>
                <h2 class="section-title">نمودار بازدید امتیازها</h2>
                <p class="section-subtitle">بیشترین بازدید ثبت های وام در سامانه</p>
              </div>
            </div>

            <SimpleBarChart :items="summary.topViewedFacilities || []" empty-text="هنوز بازدیدی برای نمایش ثبت نشده است" />
          </div>
        </div>
      </div>

     
    </template>
  </div>
</template>

<style scoped src="./styles/DashboardView.css"></style>
