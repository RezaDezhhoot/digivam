<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
import {
  getCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead
} from '../services/customer-notification.api.js';
import { useCustomerSession } from '../composables/useCustomerSession.js';

const router = useRouter();
const { syncNotificationSummary } = useCustomerSession();

const loading = ref(false);
const bulkLoading = ref(false);
const actionId = ref(null);
const navigateId = ref(null);
const page = ref(1);
const pages = ref(0);
const items = ref([]);
const summary = ref({ total: 0, unread: 0, read: 0, info: 0, attention: 0, warning: 0 });
const filters = ref({ search: '', category: '', isRead: '' });

const categoryOptions = [
  { value: '', label: 'همه دسته بندی ها' },
  { value: 'info', label: 'اطلاع رسانی' },
  { value: 'attention', label: 'توجه' },
  { value: 'warning', label: 'اخطار' }
];

const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');

const shellStats = computed(() => [
  { label: 'کل اعلان‌ها', value: new Intl.NumberFormat('fa-IR').format(summary.value.total) },
  { label: 'خوانده نشده', value: new Intl.NumberFormat('fa-IR').format(summary.value.unread) },
  { label: 'اطلاع رسانی', value: new Intl.NumberFormat('fa-IR').format(summary.value.info) },
  { label: 'اخطار', value: new Intl.NumberFormat('fa-IR').format(summary.value.warning) }
]);

const buildQuery = () => {
  const params = new URLSearchParams({ page: String(page.value), limit: '10' });

  if (filters.value.search.trim()) params.set('search', filters.value.search.trim());
  if (filters.value.category) params.set('category', filters.value.category);
  if (filters.value.isRead) params.set('isRead', filters.value.isRead);

  return `?${params.toString()}`;
};

const load = async () => {
  loading.value = true;

  try {
    const data = await getCustomerNotifications(buildQuery());
    items.value = data.items || [];
    summary.value = data.summary || summary.value;
    page.value = Number(data.page || 1);
    pages.value = Number(data.pages || 0);
    syncNotificationSummary(summary.value);
  } finally {
    loading.value = false;
  }
};

const applyFilters = async () => {
  page.value = 1;
  await load();
};

const clearFilters = async () => {
  filters.value = { search: '', category: '', isRead: '' };
  page.value = 1;
  await load();
};

const changePage = async (nextPage) => {
  if (nextPage < 1 || (pages.value > 0 && nextPage > pages.value)) {
    return;
  }

  page.value = nextPage;
  await load();
};

const markOneRead = async (item) => {
  if (item.isRead) {
    return;
  }

  actionId.value = item.id;
  try {
    await markCustomerNotificationRead(item.id);
    await load();
  } finally {
    actionId.value = null;
  }
};

const markAllRead = async () => {
  if (!summary.value.unread) {
    return;
  }

  bulkLoading.value = true;
  try {
    await markAllCustomerNotificationsRead();
    await load();
  } finally {
    bulkLoading.value = false;
  }
};

const getNotificationDetailPath = (item) => String(item?.metadata?.detailPath || '').trim();

const openNotificationTarget = async (item) => {
  const detailPath = getNotificationDetailPath(item);
  if (!detailPath) {
    return;
  }

  navigateId.value = item.id;
  try {
    if (!item.isRead) {
      await markCustomerNotificationRead(item.id).catch(() => null);
    }
    await load().catch(() => null);
    await router.push(detailPath);
  } finally {
    navigateId.value = null;
  }
};

onMounted(load);
</script>

<template>
  <section class="customer-notifications-view">
    <CustomerPanelShell
      kicker="اعلان‌های مشتری"
      title="مرکز اعلان‌ها"
      description="پیام‌های سیستم، تغییر وضعیت‌ها و اطلاع‌رسانی‌های حساب خود را در این صفحه یکجا مدیریت کنید."
      :stats="shellStats"
    >
      <template #actions>
        <button class="notify-mark-all-btn" :disabled="bulkLoading || !summary.unread" @click="markAllRead">
          <i :class="bulkLoading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check-double'"></i>
          {{ bulkLoading ? 'بروزرسانی...' : 'خواندن همه' }}
        </button>
      </template>

    <div class="notify-stats-row">
      <div class="notify-stat-pill">
        <i class="fa-solid fa-bell"></i>
        <div><span>کل</span><strong>{{ summary.total }}</strong></div>
      </div>
      <div class="notify-stat-pill tone-warning">
        <i class="fa-solid fa-envelope"></i>
        <div><span>خوانده نشده</span><strong>{{ summary.unread }}</strong></div>
      </div>
      <div class="notify-stat-pill tone-info">
        <i class="fa-solid fa-circle-info"></i>
        <div><span>اطلاع رسانی</span><strong>{{ summary.info }}</strong></div>
      </div>
      <div class="notify-stat-pill tone-attention">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div><span>توجه</span><strong>{{ summary.attention }}</strong></div>
      </div>
      <div class="notify-stat-pill tone-danger">
        <i class="fa-solid fa-circle-exclamation"></i>
        <div><span>اخطار</span><strong>{{ summary.warning }}</strong></div>
      </div>
    </div>

    <div class="notify-toolbar">
      <div class="notify-search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input v-model="filters.search" type="text" placeholder="جستجو در عنوان یا متن..." @keyup.enter="applyFilters" />
      </div>
      <select v-model="filters.category" class="notify-select" @change="applyFilters">
        <option v-for="item in categoryOptions" :key="item.value || 'all'" :value="item.value">{{ item.label }}</option>
      </select>
      <select v-model="filters.isRead" class="notify-select" @change="applyFilters">
        <option value="">همه وضعیت‌ها</option>
        <option value="unread">خوانده نشده</option>
        <option value="read">خوانده شده</option>
      </select>
      <button class="notify-clear-btn" @click="clearFilters"><i class="fa-solid fa-rotate-left"></i> پاکسازی</button>
    </div>

    <div v-if="loading" class="notify-empty-state">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>در حال بارگذاری اعلان‌ها...</span>
    </div>
    <div v-else-if="!items.length" class="notify-empty-state">
      <div class="notify-empty-icon"><i class="fa-regular fa-bell-slash"></i></div>
      <strong>اعلانی یافت نشد</strong>
      <span>هیچ اعلانی با فیلترهای فعلی وجود ندارد.</span>
    </div>

    <TransitionGroup v-else name="notify-list" tag="div" class="notify-list">
      <article v-for="item in items" :key="item.id" class="notify-card" :class="{ unread: !item.isRead }">
        <div class="notify-card-indicator" :style="{ background: item.categoryColor }"></div>
        <div class="notify-card-content">
          <div class="notify-card-top">
            <div class="notify-card-badges">
              <span class="notify-cat-badge" :style="{ color: item.categoryColor, background: `${item.categoryColor}14` }">
                <i :class="item.category === 'warning' ? 'fa-solid fa-circle-exclamation' : item.category === 'attention' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-info'"></i>
                {{ item.categoryLabel }}
              </span>
              <span class="notify-read-badge" :class="item.isRead ? 'is-read' : 'is-unread'">
                <i :class="item.isRead ? 'fa-solid fa-envelope-open' : 'fa-solid fa-envelope'"></i>
                {{ item.isRead ? 'خوانده شده' : 'جدید' }}
              </span>
            </div>
            <time class="notify-card-time"><i class="fa-regular fa-clock"></i> {{ formatDate(item.createdAt) }}</time>
          </div>
          <h3 class="notify-card-title">{{ item.title }}</h3>
          <p class="notify-card-body">{{ item.body }}</p>
          <div class="notify-card-footer">
            <span class="notify-card-sender"><i class="fa-regular fa-user"></i> {{ item.senderName }}</span>
            <div class="notify-card-actions">
              <button
                v-if="item.metadata?.detailPath"
                class="notify-action-btn primary"
                :disabled="navigateId === item.id"
                @click="openNotificationTarget(item)"
              >
                <i :class="navigateId === item.id ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-arrow-up-right-from-square'"></i>
                مشاهده
              </button>
              <button v-if="!item.isRead" class="notify-action-btn" :disabled="actionId === item.id || navigateId === item.id" @click="markOneRead(item)">
                <i :class="actionId === item.id ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'"></i>
                خوانده شد
              </button>
            </div>
          </div>
        </div>
      </article>
    </TransitionGroup>

    <div v-if="pages > 1" class="notify-pagination">
      <button class="notify-page-btn" :disabled="page <= 1 || loading" @click="changePage(page - 1)"><i class="fa-solid fa-chevron-right"></i> قبلی</button>
      <span class="notify-page-info">صفحه <strong>{{ page }}</strong> از <strong>{{ pages }}</strong></span>
      <button class="notify-page-btn" :disabled="page >= pages || loading" @click="changePage(page + 1)">بعدی <i class="fa-solid fa-chevron-left"></i></button>
    </div>
    </CustomerPanelShell>
  </section>
</template>

<style scoped src="./styles/CustomerNotificationsView.css"></style>