<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
import { getCustomerDashboard, getMyValidations } from '../services/customer-panel.api.js';
import { useCustomerSession } from '../composables/useCustomerSession.js';

const route = useRoute();
const { updateProfile, syncNotificationSummary, profile: sessionProfile } = useCustomerSession();

const isSuspended = computed(() => Boolean(sessionProfile.value?.isSuspended));
const suspendReason = computed(() => sessionProfile.value?.suspendReason || '');
const showSuspendBanner = computed(() => isSuspended.value || route.query.suspended === '1');

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
      <div v-if="showSuspendBanner" class="customer-suspend-banner">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <strong>حساب شما تعلیق شده است</strong>
          <p v-if="suspendReason">{{ suspendReason }}</p>
          <p v-else>دسترسی به بخش معاملات محدود شده است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.</p>
        </div>
      </div>

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

<style scoped src="./styles/CustomerDashboardView.css"></style>