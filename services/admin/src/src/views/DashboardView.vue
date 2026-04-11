<script setup>
import { computed, onMounted, ref } from 'vue';
import SimpleBarChart from '../components/SimpleBarChart.vue';
import LineChart from '../components/LineChart.vue';
import { getPageViews, getSummary } from '../services/admin-api.js';

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
    icon: 'fa-solid fa-badge-dollar',
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

const loadVisits = async () => {
  visitLoading.value = true;
  try {
    const data = await getPageViews(`?days=${visitDays.value}`);
    visitItems.value = data.items || [];
  } catch (_) { /* ignore */ }
  finally { visitLoading.value = false; }
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

<style scoped>
.dashboard-welcome {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.welcome-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--admin-primary-light);
  color: var(--admin-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.welcome-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.welcome-subtitle {
  font-size: 14px;
  color: var(--admin-muted);
  margin: 4px 0 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card,
.facility-overview-card,
.facility-chart-card {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  box-shadow: var(--admin-shadow);
}

.stat-card {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--admin-shadow-lg);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--admin-muted);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.finance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.today-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.today-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow);
}

.today-card-blue { background: #eef6ff; }
.today-card-green { background: #edfdf5; }
.today-card-rose { background: #fff1f2; }
.today-card-amber { background: #fff7ed; }

.today-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.75);
  color: var(--admin-primary);
  font-size: 18px;
  flex-shrink: 0;
}

.today-card-label {
  font-size: 12px;
  color: var(--admin-muted);
  margin: 0 0 4px;
}

.today-card-value {
  font-size: 24px;
  color: var(--admin-text);
}

.finance-card {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  padding: 24px;
  color: #fff;
  box-shadow: var(--admin-shadow-lg);
}

.finance-card-blue {
  background: linear-gradient(135deg, #0b5f83 0%, #084764 100%);
}

.finance-card-green {
  background: linear-gradient(135deg, #15803d 0%, #166534 100%);
}

.finance-card-pattern {
  position: absolute;
  inset: auto -30px -50px auto;
  width: 180px;
  height: 180px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  animation: financePulse 7s ease-in-out infinite;
}

.finance-card-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.finance-card-icon {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: rgba(255, 255, 255, 0.14);
}

.finance-card-title {
  font-size: 17px;
  font-weight: 800;
  margin: 0 0 4px;
}

.finance-card-subtitle {
  font-size: 13px;
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
}

.finance-card-value {
  position: relative;
  font-size: clamp(28px, 3vw, 38px);
  font-weight: 900;
  letter-spacing: -0.03em;
}

.facility-overview-card,
.facility-chart-card {
  padding: 22px;
  height: 100%;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.section-title {
  font-size: 16px;
  font-weight: 800;
  margin: 0 0 4px;
}

.section-subtitle {
  font-size: 13px;
  color: var(--admin-muted);
  margin: 0;
}

.facility-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.facility-mini-card {
  border-radius: 16px;
  border: 1px solid var(--admin-border);
  padding: 16px;
  background: var(--admin-surface-soft);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.facility-mini-card span {
  font-size: 12px;
  color: var(--admin-muted);
}

.facility-mini-card strong {
  font-size: 22px;
  color: var(--admin-text);
}

.facility-mini-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: rgba(11, 95, 131, 0.1);
  color: #0b5f83;
}

.facility-mini-card-warning { background: #fff7ed; }
.facility-mini-card-success { background: #ecfdf5; }
.facility-mini-card-danger { background: #fef2f2; }
.facility-mini-card-info { background: #eff6ff; }
.facility-mini-card-muted { background: #f8fafc; }

@keyframes financePulse {
  0%,
  100% {
    transform: scale(1) translateY(0);
  }

  50% {
    transform: scale(1.08) translateY(-8px);
  }
}

@media (max-width: 991px) {
  .finance-grid,
  .today-grid,
  .facility-grid {
    grid-template-columns: 1fr;
  }
}

.cv-summary-card {
  padding: 22px;
  border-radius: 22px;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  box-shadow: var(--admin-shadow);
}

.cv-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.cv-summary-item {
  padding: 16px;
  border-radius: 16px;
  background: var(--admin-surface-soft, rgba(0,0,0,0.02));
  border: 1px solid var(--admin-border);
  text-align: center;
}

.cv-summary-item span {
  display: block;
  font-size: 12px;
  color: var(--admin-muted);
  font-weight: 700;
}

.cv-summary-item strong {
  display: block;
  margin-top: 8px;
  font-size: 26px;
  font-weight: 900;
}

.cv-summary-pending strong { color: #d97706; }
.cv-summary-info strong { color: #1d4ed8; }
.cv-summary-accent strong { color: #4f46e5; }
.cv-summary-approved strong { color: #22a06b; }
.cv-summary-rejected strong { color: #b42318; }

.cv-summary-grid-5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

@media (max-width: 768px) {
  .cv-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .cv-summary-grid-5 {
    grid-template-columns: repeat(2, 1fr);
  }
}

.visit-range-controls {
  min-width: 140px;
}
</style>
