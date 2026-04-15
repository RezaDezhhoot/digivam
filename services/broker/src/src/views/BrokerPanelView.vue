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
const latestDeal = computed(() => (latestDeals.value.length ? latestDeals.value[0] : null));

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

      <div class="quick-access-card mt-3">
        <div class="report-head mb-0">
          <div>
            <h2 class="report-title">دسترسی سریع</h2>
            <p class="report-subtitle">ابزارهای پرکاربرد کارگزار برای مدیریت سریع تر پرونده ها</p>
          </div>
        </div>

        <div class="quick-access-grid">
          <router-link class="quick-link" to="/deals">
            <i class="fa-solid fa-briefcase"></i>
            <div>
              <strong>کارتابل معاملات</strong>
              <small>{{ formatNumber(dealSummary.total) }} پرونده</small>
            </div>
          </router-link>

          <router-link class="quick-link" to="/loan/create">
            <i class="fa-solid fa-file-invoice-dollar"></i>
            <div>
              <strong>مدیریت امتیازها</strong>
              <small>{{ formatNumber(facilitySummary.total) }} امتیاز ثبت شده</small>
            </div>
          </router-link>

          <router-link class="quick-link" to="/validity">
            <i class="fa-solid fa-wallet"></i>
            <div>
              <strong>کیف پول</strong>
              <small>{{ formatMoney(walletBalance) }}</small>
            </div>
          </router-link>

          <router-link class="quick-link" to="/notifications">
            <i class="fa-solid fa-bell"></i>
            <div>
              <strong>اعلان ها</strong>
              <small>{{ formatNumber(notificationSummary.unread) }} خوانده نشده</small>
            </div>
          </router-link>
        </div>

        <div class="quick-last-deal" v-if="latestDeal">
          <span class="status-pill" :class="dealStatusMeta(latestDeal.status).className">
            <i :class="dealStatusMeta(latestDeal.status).icon" class="me-1"></i>{{ latestDeal.statusLabel }}
          </span>
          <p>
            آخرین پرونده:
            <strong>{{ latestDeal.facility?.title || 'بدون عنوان' }}</strong>
            برای {{ latestDeal.customer?.name || 'مشتری' }}
            به مبلغ {{ formatMoney(latestDeal.requestedAmount) }}
          </p>
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

<style scoped src="./styles/BrokerPanelView.css"></style>
