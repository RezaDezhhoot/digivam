<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
import { getCustomerDashboard, getMyValidations } from '../services/customer-panel.api.js';
import { useCustomerSession } from '../composables/useCustomerSession.js';

const { updateProfile, syncNotificationSummary } = useCustomerSession();

const loading = ref(true);
const errorText = ref('');
const profile = ref(null);
const ticketSummary = ref({ total: 0, pending: 0, answered: 0, closed: 0 });
const notificationSummary = ref({ total: 0, unread: 0, read: 0, info: 0, attention: 0, warning: 0 });
const dealSummary = ref({ total: 0, inProgress: 0, waitingCustomer: 0, waitingBroker: 0, failed: 0 });
const latestTickets = ref([]);
const latestNotifications = ref([]);
const latestDeals = ref([]);
const validationItems = ref([]);

const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;
const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));
const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');

const shellStats = computed(() => [
  { label: 'کیف پول', value: formatMoney(profile.value?.walletBalance) },
  { label: 'اعلان خوانده نشده', value: formatNumber(notificationSummary.value.unread) },
  { label: 'در انتظار اقدام من', value: formatNumber(dealSummary.value.waitingCustomer) },
  { label: 'تیکت فعال', value: formatNumber(ticketSummary.value.pending) }
]);

const load = async () => {
  loading.value = true;
  errorText.value = '';

  try {
    const data = await getCustomerDashboard();
    profile.value = data.profile;
    ticketSummary.value = data.ticketSummary || ticketSummary.value;
    dealSummary.value = data.dealSummary || dealSummary.value;
    notificationSummary.value = data.notificationSummary || notificationSummary.value;
    latestTickets.value = data.latestTickets || [];
    latestNotifications.value = data.latestNotifications || [];
    latestDeals.value = data.latestDeals || [];
    updateProfile(data.profile);
    syncNotificationSummary(data.notificationSummary);

    try {
      const vData = await getMyValidations({ page: 1, limit: 5 });
      validationItems.value = vData.items || [];
    } catch {
      // ignore
    }
  } catch (error) {
    errorText.value = error.message;
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <section class="customer-dashboard">
    <div v-if="loading" class="customer-loading-card">
      <div class="customer-spinner"></div>
      <span>در حال بارگذاری داشبورد مشتری...</span>
    </div>
    <div v-else-if="errorText" class="customer-loading-card text-danger">{{ errorText }}</div>

    <template v-else>
      <CustomerPanelShell
        kicker="پنل مشتری دیجی وام"
        title="داشبورد مشتری"
        :description="`${profile?.name || 'مشتری عزیز'}، وضعیت اعلان‌ها، تیکت‌ها و اطلاعات حساب خود را از اینجا پیگیری کنید.`"
        :stats="shellStats"
      >

      <section class="customer-stats-grid">
        <article class="customer-stat-card">
          <span>موجودی کیف پول</span>
          <strong>{{ formatMoney(profile?.walletBalance) }}</strong>
          <p>موجودی فعلی حساب مشتری</p>
        </article>
        <article class="customer-stat-card tone-warning">
          <span>اعلان خوانده نشده</span>
          <strong>{{ formatNumber(notificationSummary.unread) }}</strong>
          <p>پیام‌های جدید سیستم و مدیریت</p>
        </article>
        <article class="customer-stat-card tone-accent">
          <span>معامله در انتظار شما</span>
          <strong>{{ formatNumber(dealSummary.waitingCustomer) }}</strong>
          <p>برای تکمیل مدارک یا ادامه فرایند</p>
        </article>
        <article class="customer-stat-card tone-info">
          <span>در بررسی کارگزار</span>
          <strong>{{ formatNumber(dealSummary.waitingBroker) }}</strong>
          <p>پرونده‌های ارسال‌شده برای broker</p>
        </article>
      </section>

      <section v-if="latestDeals.length" class="customer-validation-section">
        <div class="customer-panel-head">
          <div>
            <h2>آخرین معامله‌ها</h2>
            <p>وضعیت آخرین درخواست‌های معامله امتیاز وام شما</p>
          </div>
          <RouterLink class="customer-inline-link" to="/customer/deals">مشاهده همه</RouterLink>
        </div>
        <div class="customer-validation-grid">
          <article v-for="deal in latestDeals" :key="deal.id" class="customer-validation-card deal-mini-card">
            <div class="cv-card-top">
              <span class="cv-chip" :class="`cv-chip-${deal.status}`">{{ deal.statusLabel }}</span>
              <span class="cv-date-label">{{ deal.updatedAtLabel }}</span>
            </div>
            <h3>{{ deal.facility?.title || deal.facilityData?.title }}</h3>
            <p class="deal-mini-desc">{{ deal.typeLabel || deal.facility?.typeLabel || '-' }} | {{ deal.stepLabel }} | {{ formatNumber(deal.amount) }} تومان</p>
            <div class="cv-link-row">
              <RouterLink :to="`/customer/deals/${deal.id}`" class="customer-inline-link">
                {{ deal.canSubmitDocuments ? 'ادامه تکمیل' : 'مشاهده جزئیات' }}
              </RouterLink>
            </div>
          </article>
        </div>
      </section>

      <section v-if="validationItems.length" class="customer-validation-section">
        <div class="customer-panel-head">
          <div>
            <h2>اعتبارسنجی‌های من</h2>
            <p>وضعیت آخرین اعتبارسنجی‌های ثبت شده شما</p>
          </div>
          <RouterLink class="customer-inline-link" to="/customer/validations">مشاهده همه</RouterLink>
        </div>
        <div class="customer-validation-grid">
          <article v-for="v in validationItems" :key="v.id" class="customer-validation-card">
            <div class="cv-card-top">
              <span class="cv-chip" :class="`cv-chip-${v.status}`">{{ v.statusLabel }}</span>
              <span class="cv-date-label">{{ formatDate(v.createdAt) }}</span>
            </div>
            <h3>{{ v.validationTitle }}</h3>
            <div v-if="v.status === 'submit'" class="cv-link-row">
              <RouterLink :to="`/customer/validation-flow/${v.validationId}`" class="customer-inline-link">ادامه تکمیل مراحل</RouterLink>
            </div>
            <div v-else-if="v.status === 'rejected'" class="cv-link-row">
              <RouterLink :to="`/customer/validation-flow/${v.validationId}`" class="customer-inline-link">ارسال مجدد</RouterLink>
            </div>
          </article>
        </div>
      </section>

      <section class="customer-panels-grid">
        <article class="card customer-panel-card">
          <div class="customer-panel-head">
            <div>
              <h2>آخرین اعلان‌ها</h2>
              <p>شمارنده اعلان‌های خوانده نشده نیز در هدر وب نمایش داده می‌شود.</p>
            </div>
            <RouterLink class="customer-inline-link" to="/customer/notifications">مشاهده همه</RouterLink>
          </div>

          <div v-if="latestNotifications.length" class="customer-list">
            <div v-for="item in latestNotifications" :key="item.id" class="customer-list-item" :class="{ unread: !item.isRead }">
              <div class="customer-list-head">
                <strong>{{ item.title }}</strong>
                <span>{{ formatDate(item.createdAt) }}</span>
              </div>
              <p>{{ item.body }}</p>
            </div>
          </div>
          <div v-else class="customer-empty">اعلانی برای نمایش وجود ندارد.</div>
        </article>

        <article class="card customer-panel-card">
          <div class="customer-panel-head">
            <div>
              <h2>آخرین تیکت‌ها</h2>
              <p>برای ثبت تیکت جدید یا ادامه گفتگو به صفحه درخواست‌ها بروید.</p>
            </div>
            <RouterLink class="customer-inline-link" to="/requests">ورود به درخواست‌ها</RouterLink>
          </div>

          <div v-if="latestTickets.length" class="customer-list">
            <div v-for="item in latestTickets" :key="item.id" class="customer-list-item ticket-item">
              <div class="customer-list-head">
                <strong>{{ item.subject }}</strong>
                <span>{{ item.statusLabel }}</span>
              </div>
              <p>{{ formatDate(item.updatedAt) }}</p>
            </div>
          </div>
          <div v-else class="customer-empty">هنوز تیکتی ثبت نشده است.</div>
        </article>
      </section>
      </CustomerPanelShell>
    </template>
  </section>
</template>

<style scoped>
.customer-dashboard {
  display: grid;
  gap: 18px;
}

.customer-loading-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 48px 28px;
  border-radius: 30px;
  background: var(--web-surface);
  border: 1px solid var(--web-border);
  color: var(--web-muted);
  font-weight: 700;
  font-size: 14px;
}

.customer-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--web-border);
  border-top-color: var(--web-primary);
  border-radius: 50%;
  animation: custSpin 0.7s linear infinite;
}

@keyframes custSpin {
  to { transform: rotate(360deg); }
}

.customer-hero-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
  padding: 28px;
  border-radius: 34px;
  background: linear-gradient(135deg, #8d0000 0%, #c11212 100%);
  color: #fff;
  box-shadow: 0 26px 70px rgba(155, 0, 0, 0.22);
}

.customer-hero-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 12px;
  font-weight: 800;
}

.customer-hero-card h1 {
  margin: 12px 0 10px;
  font-size: 34px;
  font-weight: 900;
}

.customer-hero-card p {
  margin: 0;
  max-width: 680px;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.84);
}

.customer-hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.customer-hero-link {
  display: inline-flex;
  align-items: center;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 16px;
  background: #fff;
  color: #8d0000;
  font-weight: 800;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.customer-hero-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.customer-hero-link.muted {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.customer-hero-link.muted:hover {
  background: rgba(255, 255, 255, 0.22);
}

.customer-stats-grid,
.customer-panels-grid {
  display: grid;
  gap: 16px;
}

.customer-stats-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.customer-panels-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.customer-stat-card,
.customer-panel-card {
  padding: 22px;
  border-radius: 28px;
}

.customer-stat-card {
  border: 1px solid var(--web-border);
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  box-shadow: var(--web-shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.customer-stat-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--web-shadow-lg);
  border-color: var(--web-border-strong);
}

.customer-stat-card span,
.customer-panel-head p,
.customer-list-item span,
.customer-list-item p {
  color: var(--web-muted);
}

.customer-stat-card strong {
  display: block;
  margin-top: 10px;
  font-size: 28px;
  font-weight: 900;
}

.customer-stat-card p {
  margin: 8px 0 0;
  font-size: 13px;
}

.tone-warning {
  background: linear-gradient(180deg, rgba(255, 235, 205, 0.6) 0%, var(--web-surface) 100%);
}

.tone-accent {
  background: linear-gradient(180deg, rgba(255, 106, 99, 0.08) 0%, var(--web-surface) 100%);
}

.tone-info {
  background: linear-gradient(180deg, rgba(93, 159, 255, 0.08) 0%, var(--web-surface) 100%);
}

.customer-panel-head,
.customer-list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.customer-panel-head h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 900;
}

.customer-panel-head p {
  margin: 0;
  line-height: 1.8;
}

.customer-inline-link {
  color: var(--web-primary);
  font-weight: 800;
}

.customer-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.customer-list-item {
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
  transition: transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.customer-list-item:hover {
  transform: translateY(-1px);
  border-color: var(--web-border-strong);
}

.customer-list-item.unread {
  border-color: rgba(255, 106, 99, 0.32);
  box-shadow: 0 10px 24px rgba(155, 0, 0, 0.08);
}

.customer-list-item strong {
  font-size: 15px;
}

.customer-list-item p {
  margin: 10px 0 0;
  line-height: 1.8;
}

.ticket-item span {
  color: var(--web-primary);
  font-weight: 800;
}

.customer-empty {
  margin-top: 18px;
  padding: 18px;
  border-radius: 20px;
  background: var(--web-surface-soft);
  color: var(--web-muted);
}

.customer-validation-section {
  padding: 22px;
  border-radius: 28px;
  border: 1px solid var(--web-border);
  background: var(--web-surface);
  box-shadow: var(--web-shadow);
}

.customer-validation-grid {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.customer-validation-card {
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
  transition: transform 0.15s ease, border-color 0.2s ease;
}

.customer-validation-card:hover {
  transform: translateY(-1px);
  border-color: var(--web-border-strong);
}

.cv-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.cv-chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
}

.cv-chip-submit,
.cv-chip-pending { background: #d97706; }
.cv-chip-approved { background: #22a06b; }
.cv-chip-rejected { background: #dc2626; }
.cv-chip-expired { background: #6b7280; }

.cv-date-label {
  font-size: 12px;
  color: var(--web-muted);
  font-weight: 700;
}

.customer-validation-card h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
}

.deal-mini-card {
  background: linear-gradient(180deg, rgba(211, 90, 90, 0.06) 0%, var(--web-surface-soft) 100%);
}

.deal-mini-desc {
  margin: 8px 0 0;
  color: var(--web-muted);
  font-size: 12px;
}

.cv-link-row {
  margin-top: 8px;
}

@media (max-width: 991px) {
  .customer-stats-grid,
  .customer-panels-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 767px) {
  .customer-hero-card,
  .customer-stats-grid,
  .customer-panels-grid {
    grid-template-columns: 1fr;
  }

  .customer-hero-card h1 {
    font-size: 28px;
  }
}

:root[data-theme='dark'] .customer-hero-card {
  background: linear-gradient(135deg, #3d0000 0%, #6d1010 100%);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.4);
}

:root[data-theme='dark'] .tone-warning {
  background: linear-gradient(180deg, rgba(217, 119, 6, 0.1) 0%, var(--web-surface) 100%);
}

:root[data-theme='dark'] .tone-accent {
  background: linear-gradient(180deg, rgba(255, 106, 99, 0.06) 0%, var(--web-surface) 100%);
}

:root[data-theme='dark'] .tone-info {
  background: linear-gradient(180deg, rgba(93, 159, 255, 0.06) 0%, var(--web-surface) 100%);
}
</style>