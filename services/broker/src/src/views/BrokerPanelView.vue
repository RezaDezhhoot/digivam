<script setup>
import { computed, onMounted, ref } from 'vue';
import SimpleBarChart from '../components/SimpleBarChart.vue';
import LineChart from '../components/LineChart.vue';
import { getBrokerDealSummary } from '../services/broker-deal.api.js';
import { getBrokerFacilityDailyViews, getBrokerFacilitySummary } from '../services/broker-facility.api.js';
import {
  getBrokerNotificationSummary,
  markBrokerNotificationRead
} from '../services/broker-notification.api.js';
import { getBrokerProfile } from '../services/broker-profile.api.js';
import { getBrokerTickets } from '../services/broker-ticket.api.js';
import { useAppToast } from '../composables/useToast.js';
import { brokerVerifySteps, getBrokerVerifyMeta } from '../utils/broker-verify-level.js';

const toast = useAppToast();
const loading = ref(true);
const notificationActionId = ref(null);
const profile = ref(null);
const tickets = ref([]);
const facilitySummary = ref({ total: 0, pending: 0, published: 0, rejected: 0, inProgress: 0, expired: 0, totalViews: 0 });
const notificationSummary = ref({ total: 0, unread: 0, read: 0, info: 0, attention: 0, warning: 0 });
const dealSummary = ref({ total: 0, inProgress: 0, failed: 0, suspended: 0, done: 0, waitingCustomer: 0, waitingBroker: 0, waitingAdmin: 0, verifyBroker: 0 });
const latestFacilities = ref([]);
const latestDeals = ref([]);
const topViewedFacilities = ref([]);
const latestNotifications = ref([]);

const verifyMeta = computed(() => getBrokerVerifyMeta(profile.value?.verifyLevel));
const walletBalance = computed(() => profile.value?.wallet?.balance || '0');

const ticketSummary = computed(() => ({
  total: tickets.value.length,
  pending: tickets.value.filter((item) => item.status === 'pending').length,
  answered: tickets.value.filter((item) => item.status === 'answered').length,
  closed: tickets.value.filter((item) => item.status === 'closed').length
}));

const latestTickets = computed(() => tickets.value.slice(0, 4));

const quickStats = computed(() => [
  {
    label: 'وضعیت احراز هویت',
    value: verifyMeta.value.label,
    hint: `سطح ${verifyMeta.value.value}`,
    icon: verifyMeta.value.icon,
    className: 'stat-icon-verify'
  },
  {
    label: 'موجودی کیف پول',
    value: formatMoney(walletBalance.value),
    hint: 'واحد موجودی تومان',
    icon: 'fa-solid fa-wallet',
    className: 'stat-icon-wallet'
  },
  {
    label: 'کل امتیازهای وام',
    value: facilitySummary.value.total,
    hint: 'همه ثبت های شما در سامانه',
    icon: 'fa-solid fa-file-invoice-dollar',
    className: 'stat-icon-total'
  },
  {
    label: 'کل معاملات',
    value: dealSummary.value.total,
    hint: 'همه پرونده های معامله مرتبط با شما',
    icon: 'fa-solid fa-briefcase',
    className: 'stat-icon-deal'
  },
  {
    label: 'منتظر اقدام شما',
    value: dealSummary.value.waitingBroker,
    hint: 'پرونده هایی که در صف بررسی کارگزار هستند',
    icon: 'fa-solid fa-scale-balanced',
    className: 'stat-icon-review'
  },
  {
    label: 'اعلان های خوانده نشده',
    value: notificationSummary.value.unread,
    hint: 'پیام های تازه مدیریتی و سیستمی',
    icon: 'fa-solid fa-bell',
    className: 'stat-icon-alert'
  },
  {
    label: 'کل بازدید امتیازها',
    value: facilitySummary.value.totalViews,
    hint: 'تعداد بازدید همه ثبت های شما',
    icon: 'fa-solid fa-chart-column',
    className: 'stat-icon-views'
  },
  {
    label: 'کل تیکت ها',
    value: ticketSummary.value.total,
    hint: 'گزارش کلی گفتگوهای پشتیبانی',
    icon: 'fa-solid fa-ticket',
    className: 'stat-icon-ticket'
  }
]);

const facilityStatusCards = computed(() => [
  { label: 'در حال بررسی', value: facilitySummary.value.pending, tone: 'warning', icon: 'fa-solid fa-hourglass-half' },
  { label: 'تایید شده', value: facilitySummary.value.published, tone: 'success', icon: 'fa-solid fa-circle-check' },
  { label: 'رد شده', value: facilitySummary.value.rejected, tone: 'danger', icon: 'fa-solid fa-circle-xmark' },
  { label: 'جاری', value: facilitySummary.value.inProgress, tone: 'info', icon: 'fa-solid fa-spinner' },
  { label: 'منقضی', value: facilitySummary.value.expired, tone: 'muted', icon: 'fa-solid fa-calendar-xmark' }
]);

const dispatchNotificationUpdate = () => {
  window.dispatchEvent(new CustomEvent('broker-notification-updated'));
};

const statusMeta = (status) => {
  const statuses = {
    pending: { label: 'در انتظار پاسخ', icon: 'fa-solid fa-clock', className: 'status-pending' },
    answered: { label: 'پاسخ داده شده', icon: 'fa-solid fa-circle-check', className: 'status-answered' },
    closed: { label: 'بسته شده', icon: 'fa-solid fa-circle-xmark', className: 'status-closed' }
  };

  return statuses[status] || statuses.pending;
};

const facilityStatusMeta = (status) => {
  const statuses = {
    pending: { label: 'در حال بررسی', icon: 'fa-solid fa-hourglass-half', className: 'status-pending' },
    published: { label: 'تایید شده', icon: 'fa-solid fa-circle-check', className: 'status-answered' },
    rejected: { label: 'رد شده', icon: 'fa-solid fa-circle-xmark', className: 'status-closed' },
    in_progress: { label: 'جاری', icon: 'fa-solid fa-spinner', className: 'status-info' },
    expired: { label: 'منقضی', icon: 'fa-solid fa-calendar-xmark', className: 'status-muted' }
  };

  return statuses[status] || statuses.pending;
};

const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');
const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;
const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));
const latestNotificationItems = (items = []) => items.slice(0, 3);

const dealStatusMeta = (status) => {
  const statuses = {
    in_progress: { label: 'در جریان', icon: 'fa-solid fa-spinner', className: 'status-info' },
    done: { label: 'انجام شده', icon: 'fa-solid fa-circle-check', className: 'status-answered' },
    failed: { label: 'ناموفق', icon: 'fa-solid fa-circle-xmark', className: 'status-closed' },
    suspended: { label: 'متوقف', icon: 'fa-solid fa-pause', className: 'status-muted' }
  };

  return statuses[status] || statuses.in_progress;
};

const dailyViewDays = ref(10);
const dailyViewItems = ref([]);
const dailyViewLoading = ref(false);

const loadDailyViews = async () => {
  dailyViewLoading.value = true;
  try {
    const data = await getBrokerFacilityDailyViews(`?days=${dailyViewDays.value}`);
    dailyViewItems.value = data.items || [];
  } catch (_) { /* ignore */ }
  finally { dailyViewLoading.value = false; }
};

const loadNotifications = async () => {
  const data = await getBrokerNotificationSummary();
  notificationSummary.value = data.summary || notificationSummary.value;
  latestNotifications.value = latestNotificationItems(data.latest || []);
};

const markDashboardNotificationRead = async (item) => {
  if (item.isRead) {
    return;
  }

  notificationActionId.value = item.id;
  try {
    await markBrokerNotificationRead(item.id);
    dispatchNotificationUpdate();
    await loadNotifications();
  } catch (error) {
    toast.error(error.message);
  } finally {
    notificationActionId.value = null;
  }
};

const load = async () => {
  loading.value = true;

  const [profileResult, ticketResult, facilityResult, notificationResult, dealResult] = await Promise.allSettled([
    getBrokerProfile(),
    getBrokerTickets(),
    getBrokerFacilitySummary(),
    getBrokerNotificationSummary(),
    getBrokerDealSummary()
  ]);

  if (profileResult.status === 'fulfilled') {
    profile.value = profileResult.value.profile;
  }

  if (ticketResult.status === 'fulfilled') {
    tickets.value = ticketResult.value.items || [];
  }

  if (facilityResult.status === 'fulfilled') {
    facilitySummary.value = facilityResult.value.summary || facilitySummary.value;
    latestFacilities.value = facilityResult.value.latest || [];
    topViewedFacilities.value = facilityResult.value.topViewed || [];
  }

  if (notificationResult.status === 'fulfilled') {
    notificationSummary.value = notificationResult.value.summary || notificationSummary.value;
    latestNotifications.value = latestNotificationItems(notificationResult.value.latest || []);
  }

  if (dealResult?.status === 'fulfilled') {
    dealSummary.value = dealResult.value.summary || dealSummary.value;
    latestDeals.value = dealResult.value.latest || [];
  }

  if (
    profileResult.status === 'rejected' ||
    ticketResult.status === 'rejected' ||
    facilityResult.status === 'rejected' ||
    notificationResult.status === 'rejected' ||
    dealResult.status === 'rejected'
  ) {
    toast.error('بخشی از اطلاعات داشبورد بارگذاری نشد');
  }

  loading.value = false;
};

onMounted(() => {
  load();
  loadDailyViews();
});
</script>

<template>
  <section class="animate-in">
    <div v-if="loading" class="content-card">
      <div class="spinner-overlay"><i class="fa-solid fa-spinner fa-spin"></i> در حال بارگذاری...</div>
    </div>

    <template v-else>
      <div class="dashboard-hero">
        <div>
          <p class="hero-kicker"><i class="fa-solid fa-hand-wave"></i> خوش آمدید</p>
          <h1 class="hero-title">کارتابل کارگزار دی جی وام</h1>
          <p class="hero-desc">خلاصه کامل وضعیت امتیازهای وام، بازدیدها، اعلان ها و تیکت ها را از همینجا دنبال کنید.</p>
        </div>
        <div class="hero-actions">
          <span class="hero-chip" :class="`hero-chip-${verifyMeta.tone}`">
            <i :class="verifyMeta.icon" class="me-1"></i>{{ verifyMeta.label }}
          </span>
          <span class="hero-chip hero-chip-alert">
            <i class="fa-solid fa-bell me-1"></i>{{ formatNumber(notificationSummary.unread) }} اعلان خوانده نشده
          </span>
          <span class="hero-chip hero-chip-deal">
            <i class="fa-solid fa-briefcase me-1"></i>{{ formatNumber(dealSummary.waitingBroker) }} پرونده منتظر بررسی
          </span>
          <span class="hero-chip hero-chip-wallet">
            <i class="fa-solid fa-wallet me-1"></i>موجودی: {{ formatMoney(walletBalance) }}
          </span>
          <router-link class="btn btn-light" to="/deals"><i class="fa-solid fa-briefcase me-1"></i> کارتابل معاملات</router-link>
          <router-link class="btn btn-light" to="/loan/create"><i class="fa-solid fa-file-invoice-dollar me-1"></i> امتیازهای وام</router-link>
          <router-link class="btn btn-outline-light" to="/notifications"><i class="fa-solid fa-bell me-1"></i> اعلان ها</router-link>
          <router-link class="btn btn-warning" to="/validity"><i class="fa-solid fa-wallet me-1"></i> شارژ کیف پول</router-link>
        </div>
      </div>

      <div class="stats-grid mt-3">
        <div v-for="item in quickStats" :key="item.label" class="stat-card">
          <div class="stat-icon" :class="item.className">
            <i :class="item.icon"></i>
          </div>
          <div>
            <p class="stat-label">{{ item.label }}</p>
            <h2 class="stat-value">{{ item.value }}</h2>
            <p class="stat-hint">{{ item.hint }}</p>
          </div>
        </div>
      </div>

      <div class="facility-status-strip mt-3">
        <div v-for="item in facilityStatusCards" :key="item.label" class="facility-status-card" :class="`facility-status-card-${item.tone}`">
          <div class="facility-status-icon"><i :class="item.icon"></i></div>
          <span>{{ item.label }}</span>
          <strong>{{ formatNumber(item.value) }}</strong>
        </div>
      </div>

      <div class="report-card mt-3">
        <div class="report-head">
          <div>
            <h2 class="report-title">نمودار بازدید روزانه امتیازها</h2>
            <p class="report-subtitle">تعداد بازدید روزانه از امتیازهای وام شما</p>
          </div>
          <div class="daily-view-controls">
            <select v-model.number="dailyViewDays" class="form-select form-select-sm" @change="loadDailyViews">
              <option :value="7">۷ روز اخیر</option>
              <option :value="10">۱۰ روز اخیر</option>
              <option :value="14">۱۴ روز اخیر</option>
              <option :value="30">۳۰ روز اخیر</option>
              <option :value="60">۶۰ روز اخیر</option>
              <option :value="90">۹۰ روز اخیر</option>
            </select>
          </div>
        </div>
        <div v-if="dailyViewLoading" class="text-center text-muted py-4">در حال بارگذاری...</div>
        <LineChart v-else :items="dailyViewItems" empty-text="هنوز بازدیدی برای نمایش ثبت نشده است" />
      </div>

      <div class="row g-3 mt-1">
        <div class="col-12 col-xl-7">
          <div class="report-card">
            <div class="report-head">
              <div>
                <h2 class="report-title">نمودار بازدید امتیازها</h2>
                <p class="report-subtitle">بیشترین بازدید ثبت های وام شما</p>
              </div>
              <router-link class="btn btn-primary btn-sm" to="/loan/create">
                <i class="fa-solid fa-arrow-left me-1"></i> مدیریت امتیازها
              </router-link>
            </div>
            <SimpleBarChart :items="topViewedFacilities" empty-text="هنوز بازدیدی برای نمایش ثبت نشده است" />
          </div>
        </div>

        <div class="col-12 col-xl-5">
          <div class="report-card h-100">
            <div class="report-head">
              <div>
                <h2 class="report-title">آخرین نوتیفیکیشن ها</h2>
                <p class="report-subtitle">پیام های جدید و وضعیت خوانده شدن آن ها</p>
              </div>
              <router-link class="btn btn-primary btn-sm" to="/notifications">
                <i class="fa-solid fa-arrow-left me-1"></i> مشاهده بیشتر
              </router-link>
            </div>

            <div v-if="latestNotifications.length" class="notification-list">
              <article v-for="item in latestNotifications" :key="item.id" class="notification-card" :class="{ unread: !item.isRead }">
                <div class="notification-card-head">
                  <span class="category-chip" :style="{ color: item.categoryColor, background: `${item.categoryColor}16` }">{{ item.categoryLabel }}</span>
                  <time class="notification-time">{{ formatDate(item.createdAt) }}</time>
                </div>
                <h3 class="notification-title">{{ item.title }}</h3>
                <p class="notification-body">{{ item.body }}</p>
                <div class="notification-actions">
                  <span class="status-pill" :class="item.isRead ? 'status-muted' : 'status-pending'">{{ item.isRead ? 'خوانده شده' : 'خوانده نشده' }}</span>
                  <button v-if="!item.isRead" class="btn btn-sm btn-outline-secondary" :disabled="notificationActionId === item.id" @click="markDashboardNotificationRead(item)">
                    <i v-if="notificationActionId === item.id" class="fa-solid fa-spinner fa-spin me-1"></i>
                    <i v-else class="fa-solid fa-check me-1"></i>
                    خوانده شد
                  </button>
                </div>
              </article>
            </div>

            <div v-else class="empty-card compact-empty">
              <i class="fa-solid fa-bell-slash empty-icon"></i>
              <h3>هنوز نوتیفیکیشنی ندارید</h3>
              <p>اعلان های مربوط به تایید یا رد امتیازها و پیام های مدیریتی در این بخش نمایش داده می شود.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-12 col-xl-7">
          <div class="report-card">
            <div class="report-head">
              <div>
                <h2 class="report-title">آخرین امتیازهای وام</h2>
                <p class="report-subtitle">نمای کلی از وضعیت جدیدترین ثبت های شما</p>
              </div>
              <router-link class="btn btn-primary btn-sm" to="/loan/create">
                <i class="fa-solid fa-arrow-left me-1"></i> مشاهده همه
              </router-link>
            </div>

            <div v-if="latestFacilities.length" class="ticket-report-list">
              <div v-for="item in latestFacilities" :key="item.id" class="ticket-report-item">
                <div class="ticket-report-main">
                  <div class="ticket-report-subject">{{ item.title || 'بدون عنوان' }}</div>
                  <div class="ticket-report-date">{{ item.loanTypeTitle }} | بازدید: {{ formatNumber(item.views) }} | {{ formatDate(item.updatedAt) }}</div>
                </div>
                <span class="status-pill" :class="facilityStatusMeta(item.status).className">
                  <i :class="facilityStatusMeta(item.status).icon" class="me-1"></i>{{ item.statusLabel }}
                </span>
              </div>
            </div>

            <div v-else class="empty-card compact-empty">
              <i class="fa-solid fa-inbox empty-icon"></i>
              <h3>هنوز امتیاز وامی ثبت نشده است</h3>
              <p>پس از ثبت اولین امتیاز، وضعیت آن در این بخش نمایش داده می شود.</p>
            </div>
          </div>
        </div>

        <div class="col-12 col-xl-5">
          <div class="report-card">
            <div class="report-head report-head-stacked">
              <div>
                <h2 class="report-title">سطح بندی احراز هویت</h2>
                <p class="report-subtitle">مطابق مراحل احراز هویت کارگزار</p>
              </div>
            </div>

            <div class="verify-level-list">
              <div
                v-for="step in brokerVerifySteps"
                :key="step.value"
                class="verify-level-item"
                :class="{
                  active: verifyMeta.value === step.value,
                  done: verifyMeta.value > step.value,
                  success: step.tone === 'success'
                }"
              >
                <div class="verify-level-icon"><i :class="step.icon"></i></div>
                <div>
                  <div class="verify-level-title">{{ step.label }}</div>
                  <div class="verify-level-desc">{{ step.description }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-12 col-xl-6">
          <div class="report-card">
            <div class="report-head">
              <div>
                <h2 class="report-title">آخرین معاملات</h2>
                <p class="report-subtitle">پرونده های تازه و مرحله فعلی هر معامله</p>
              </div>
              <router-link class="btn btn-primary btn-sm" to="/deals">
                <i class="fa-solid fa-arrow-left me-1"></i> مشاهده همه
              </router-link>
            </div>

            <div v-if="latestDeals.length" class="ticket-report-list">
              <div v-for="deal in latestDeals" :key="deal.id" class="ticket-report-item ticket-report-item-rich">
                <div class="ticket-report-main">
                  <div class="ticket-report-subject">{{ deal.facility?.title || 'بدون عنوان' }}</div>
                  <div class="ticket-report-date">{{ deal.customer?.name || 'مشتری' }} | {{ formatMoney(deal.requestedAmount) }}</div>
                  <div class="ticket-report-date">{{ deal.stepLabel }} | اقدام: {{ deal.actByLabel }}</div>
                </div>
                <span class="status-pill" :class="dealStatusMeta(deal.status).className">
                  <i :class="dealStatusMeta(deal.status).icon" class="me-1"></i>{{ deal.statusLabel }}
                </span>
              </div>
            </div>

            <div v-else class="empty-card compact-empty">
              <i class="fa-solid fa-briefcase empty-icon"></i>
              <h3>هنوز معامله ای ثبت نشده است</h3>
              <p>با ایجاد اولین پرونده، آخرین وضعیت آن از این بخش در دسترس خواهد بود.</p>
            </div>
          </div>
        </div>

        <div class="col-12 col-xl-6">
          <div class="report-card">
            <div class="report-head">
              <div>
                <h2 class="report-title">گزارش تیکت ها</h2>
                <p class="report-subtitle">آخرین گفتگوهای ثبت شده توسط کارگزار</p>
              </div>
              <router-link class="btn btn-primary btn-sm" to="/tickets">
                <i class="fa-solid fa-arrow-left me-1"></i> مدیریت تیکت ها
              </router-link>
            </div>

            <div v-if="latestTickets.length" class="ticket-report-list">
              <div v-for="ticket in latestTickets" :key="ticket.id" class="ticket-report-item">
                <div class="ticket-report-main">
                  <div class="ticket-report-subject">{{ ticket.subject || 'بدون موضوع' }}</div>
                  <div class="ticket-report-date">{{ formatDate(ticket.updatedAt) }}</div>
                </div>
                <span class="status-pill" :class="statusMeta(ticket.status).className">
                  <i :class="statusMeta(ticket.status).icon" class="me-1"></i>{{ ticket.statusLabel }}
                </span>
              </div>
            </div>

            <div v-else class="empty-card compact-empty">
              <i class="fa-solid fa-inbox empty-icon"></i>
              <h3>هنوز تیکتی ثبت نشده است</h3>
              <p>پس از ثبت اولین تیکت، گزارش آن در این بخش نمایش داده می‌شود.</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.dashboard-hero {
  border-radius: 16px;
  padding: 28px;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
  color: #fff;
}

.hero-kicker {
  font-size: 14px;
  opacity: 0.7;
  margin-bottom: 8px;
}

.hero-kicker i {
  margin-left: 4px;
}

.hero-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
}

.hero-desc {
  font-size: 14px;
  opacity: 0.76;
  margin: 0;
  max-width: 520px;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.hero-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.hero-chip-success {
  background: rgba(255, 255, 255, 0.18);
}

.hero-chip-warning {
  background: rgba(255, 244, 191, 0.18);
}

.hero-chip-alert {
  background: rgba(255, 255, 255, 0.18);
}

.hero-chip-wallet {
  background: rgba(34, 197, 94, 0.22);
}

.hero-chip-deal {
  background: rgba(255, 255, 255, 0.18);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.stat-card,
.report-card,
.content-card,
.empty-card {
  background: var(--surface-color);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 22px;
  box-shadow: var(--panel-shadow);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
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

.stat-icon-verify { background: rgba(219, 0, 0, 0.1); color: var(--brand-primary); }
.stat-icon-wallet { background: rgba(34, 197, 94, 0.12); color: #15803d; }
.stat-icon-total { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.stat-icon-deal { background: rgba(14, 165, 233, 0.12); color: #0f766e; }
.stat-icon-review { background: rgba(245, 158, 11, 0.14); color: #b45309; }
.stat-icon-alert { background: rgba(249, 115, 22, 0.12); color: #ea580c; }
.stat-icon-views { background: rgba(168, 85, 247, 0.12); color: #7c3aed; }
.stat-icon-ticket { background: rgba(99, 102, 241, 0.12); color: #4f46e5; }

.stat-label { font-size: 13px; color: var(--muted-text); margin: 0 0 4px; }
.stat-value { font-size: 18px; font-weight: 700; margin: 0; }
.stat-hint { font-size: 12px; color: var(--muted-text); margin: 6px 0 0; }

.facility-status-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.facility-status-card {
  border-radius: 16px;
  border: 1px solid var(--panel-border);
  padding: 16px;
  background: var(--surface-color);
  box-shadow: var(--panel-shadow);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.facility-status-card span {
  font-size: 12px;
  color: var(--muted-text);
}

.facility-status-card strong {
  font-size: 24px;
}

.facility-status-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(219, 0, 0, 0.1);
  color: var(--brand-primary);
}

.facility-status-card-warning { background: var(--status-warning-soft); }
.facility-status-card-success { background: var(--status-success-soft); }
.facility-status-card-danger { background: var(--status-danger-soft); }
.facility-status-card-info { background: var(--status-info-soft); }
.facility-status-card-muted { background: var(--status-muted-soft); }

.report-card {
  height: 100%;
}

.report-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}

.report-head-stacked {
  align-items: flex-start;
}

.report-title { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
.report-subtitle { font-size: 13px; color: var(--muted-text); margin: 0; }

.ticket-report-list,
.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-report-item,
.notification-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--surface-soft);
  border: 1px solid var(--panel-border);
}

.ticket-report-item {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.ticket-report-item-rich {
  align-items: flex-start;
}

.ticket-report-main { min-width: 0; }
.ticket-report-subject { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.ticket-report-date { font-size: 12px; color: var(--muted-text); }

.notification-card.unread {
  border-color: rgba(219, 0, 0, 0.24);
  box-shadow: 0 12px 28px rgba(219, 0, 0, 0.06);
}

.notification-card-head,
.notification-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.notification-title {
  font-size: 14px;
  font-weight: 800;
  margin: 0;
}

.notification-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--brand-text);
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.category-chip,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.notification-time {
  font-size: 12px;
  color: var(--muted-text);
}

.status-pending { background: #fff4d8; color: #b45309; }
.status-answered { background: #dcfce7; color: #166534; }
.status-closed { background: #ffe4e6; color: #be123c; }
.status-info { background: #dbeafe; color: #1d4ed8; }
.status-muted { background: #f3f4f6; color: #6b7280; }

.verify-level-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.verify-level-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--panel-border);
  background: var(--surface-soft);
}

.verify-level-item.active {
  border-color: var(--brand-primary);
  background: rgba(219, 0, 0, 0.05);
}

.verify-level-item.done {
  border-color: rgba(22, 163, 74, 0.18);
  background: rgba(22, 163, 74, 0.06);
}

.verify-level-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--chip-bg);
  color: var(--brand-primary);
  flex-shrink: 0;
}

.verify-level-item.done .verify-level-icon,
.verify-level-item.success .verify-level-icon {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.verify-level-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.verify-level-desc { font-size: 12px; color: var(--muted-text); line-height: 1.8; }

.empty-card {
  text-align: center;
}

.empty-icon { font-size: 48px; color: var(--muted-text); opacity: 0.3; margin-bottom: 16px; }
.empty-card h3 { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
.empty-card p { font-size: 14px; color: var(--muted-text); margin-bottom: 0; max-width: 480px; margin-inline: auto; }

.compact-empty {
  padding: 32px 16px;
}

@media (max-width: 1199px) {
  .facility-status-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .dashboard-hero { padding: 20px; }
  .ticket-report-item,
  .report-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .facility-status-strip {
    grid-template-columns: 1fr;
  }
}

.content-card {
  position: relative;
}

.daily-view-controls {
  min-width: 140px;
}
</style>
