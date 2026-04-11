<script setup>
import { computed, onMounted, ref } from 'vue';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
import {
  getCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead
} from '../services/customer-notification.api.js';
import { useCustomerSession } from '../composables/useCustomerSession.js';

const { syncNotificationSummary } = useCustomerSession();

const loading = ref(false);
const bulkLoading = ref(false);
const actionId = ref(null);
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
            <button v-if="!item.isRead" class="btn btn-sm btn-outline-secondary" :disabled="actionId === item.id" @click="markOneRead(item)">
              {{ actionId === item.id ? '...' : 'خوانده شد' }}
            </button>
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

<style scoped>
.customer-notifications-view {
  display: grid;
  gap: 18px;
}

.customer-notify-hero,
.customer-notify-panel {
  padding: 24px;
  border-radius: 30px;
}

.customer-notify-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.customer-notify-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--web-primary-soft);
  color: var(--web-primary);
  font-size: 12px;
  font-weight: 800;
}

.customer-notify-hero h1 {
  margin: 12px 0 10px;
  font-size: 32px;
  font-weight: 900;
}

.customer-notify-hero p {
  margin: 0;
  color: var(--web-muted);
}

.customer-notify-mark-all {
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid var(--web-border);
  border-radius: 16px;
  background: var(--web-surface-soft);
  color: var(--web-text);
  font-weight: 800;
}

.customer-notify-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.customer-notify-stat {
  padding: 20px;
  border-radius: 24px;
  border: 1px solid var(--web-border);
  background: linear-gradient(180deg, var(--web-surface) 0%, var(--web-surface-soft) 100%);
  box-shadow: var(--web-shadow);
}

.customer-notify-stat span {
  color: var(--web-muted);
  font-size: 13px;
}

.customer-notify-stat strong {
  display: block;
  margin-top: 10px;
  font-size: 26px;
  font-weight: 900;
}

.tone-warning { background: linear-gradient(180deg, rgba(255, 235, 205, 0.6) 0%, var(--web-surface) 100%); }
.tone-accent { background: linear-gradient(180deg, rgba(255, 106, 99, 0.08) 0%, var(--web-surface) 100%); }
.tone-info { background: linear-gradient(180deg, rgba(93, 159, 255, 0.08) 0%, var(--web-surface) 100%); }
.tone-danger { background: linear-gradient(180deg, rgba(220, 38, 38, 0.08) 0%, var(--web-surface) 100%); }

.customer-notify-filters,
.customer-notify-filter-actions,
.customer-notify-card-head,
.customer-notify-card-foot,
.customer-notify-card-chips,
.customer-notify-pagination {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.customer-notify-filters,
.customer-notify-card-foot,
.customer-notify-pagination {
  justify-content: space-between;
  align-items: center;
}

.customer-notify-list {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.customer-notify-card {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
}

.customer-notify-card.unread {
  border-color: rgba(255, 106, 99, 0.32);
  box-shadow: 0 12px 28px rgba(155, 0, 0, 0.08);
}

.customer-notify-card h2 {
  margin: 14px 0 10px;
  font-size: 20px;
  font-weight: 900;
}

.customer-notify-card p,
.customer-notify-card time,
.customer-notify-card-foot span {
  color: var(--web-muted);
  line-height: 1.8;
}

.read-chip,
.category-chip,
.customer-page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.read-chip.read {
  background: rgba(22, 163, 74, 0.1);
  color: #15803d;
}

.read-chip.unread {
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
}

.customer-notify-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 18px;
  border-radius: 20px;
  background: var(--web-surface-soft);
  color: var(--web-muted);
  font-weight: 700;
}

.customer-page-btn {
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
  color: var(--web-text);
}

@media (max-width: 991px) {
  .customer-notify-summary {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 767px) {
  .customer-notify-summary {
    grid-template-columns: 1fr;
  }

  .customer-notify-hero h1 {
    font-size: 28px;
  }
}
</style>