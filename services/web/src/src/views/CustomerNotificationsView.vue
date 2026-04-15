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
        <button class="customer-notify-mark-all" :disabled="bulkLoading || !summary.unread" @click="markAllRead">
          {{ bulkLoading ? 'در حال بروزرسانی...' : 'خواندن همه' }}
        </button>
      </template>

    <section class="customer-notify-summary">
      <article class="customer-notify-stat"><span>کل اعلان‌ها</span><strong>{{ summary.total }}</strong></article>
      <article class="customer-notify-stat tone-warning"><span>خوانده نشده</span><strong>{{ summary.unread }}</strong></article>
      <article class="customer-notify-stat tone-accent"><span>اطلاع رسانی</span><strong>{{ summary.info }}</strong></article>
      <article class="customer-notify-stat tone-info"><span>توجه</span><strong>{{ summary.attention }}</strong></article>
      <article class="customer-notify-stat tone-danger"><span>اخطار</span><strong>{{ summary.warning }}</strong></article>
    </section>

    <section class="card customer-notify-panel">
      <div class="customer-notify-filters">
        <input v-model="filters.search" class="form-control" placeholder="جستجو در عنوان یا متن" @keyup.enter="applyFilters" />
        <select v-model="filters.category" class="form-select">
          <option v-for="item in categoryOptions" :key="item.value || 'all'" :value="item.value">{{ item.label }}</option>
        </select>
        <select v-model="filters.isRead" class="form-select">
          <option value="">همه وضعیت‌ها</option>
          <option value="unread">خوانده نشده</option>
          <option value="read">خوانده شده</option>
        </select>
        <div class="customer-notify-filter-actions">
          <button class="btn btn-primary" @click="applyFilters">اعمال</button>
          <button class="btn btn-outline-secondary" @click="clearFilters">پاکسازی</button>
        </div>
      </div>

      <div v-if="loading" class="customer-notify-empty"><span class="web-spinner"></span> در حال بارگذاری اعلان‌ها...</div>
      <div v-else-if="!items.length" class="customer-notify-empty">اعلانی برای نمایش وجود ندارد.</div>

      <div v-else class="customer-notify-list">
        <article v-for="item in items" :key="item.id" class="customer-notify-card" :class="{ unread: !item.isRead }">
          <div class="customer-notify-card-head">
            <div class="customer-notify-card-chips">
              <span class="category-chip" :style="{ color: item.categoryColor, background: `${item.categoryColor}18` }">{{ item.categoryLabel }}</span>
              <span class="read-chip" :class="item.isRead ? 'read' : 'unread'">{{ item.isRead ? 'خوانده شده' : 'خوانده نشده' }}</span>
            </div>
            <time>{{ formatDate(item.createdAt) }}</time>
          </div>

          <h2>{{ item.title }}</h2>
          <p>{{ item.body }}</p>

          <div class="customer-notify-card-foot">
            <span>فرستنده: {{ item.senderName }}</span>
            <div class="customer-notify-card-actions">
              <button
                v-if="item.metadata?.detailPath"
                class="btn btn-sm btn-primary"
                :disabled="navigateId === item.id"
                @click="openNotificationTarget(item)"
              >
                {{ navigateId === item.id ? '...' : 'مشاهده معامله' }}
              </button>
              <button v-if="!item.isRead" class="btn btn-sm btn-outline-secondary" :disabled="actionId === item.id || navigateId === item.id" @click="markOneRead(item)">
                {{ actionId === item.id ? '...' : 'خوانده شد' }}
              </button>
            </div>
          </div>
        </article>
      </div>

      <div v-if="pages > 1" class="customer-notify-pagination">
        <button class="customer-page-btn" :disabled="page <= 1 || loading" @click="changePage(page - 1)">قبلی</button>
        <span>صفحه {{ page }} از {{ pages }}</span>
        <button class="customer-page-btn" :disabled="page >= pages || loading" @click="changePage(page + 1)">بعدی</button>
      </div>
    </section>
    </CustomerPanelShell>
  </section>
</template>

<style scoped src="./styles/CustomerNotificationsView.css"></style>