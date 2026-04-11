<script setup>
import { onMounted, ref } from 'vue';
import AppPagination from '../components/AppPagination.vue';
import {
  getBrokerNotifications,
  markAllBrokerNotificationsRead,
  markBrokerNotificationRead
} from '../services/broker-notification.api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();

const loading = ref(false);
const bulkLoading = ref(false);
const actionId = ref(null);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const items = ref([]);
const summary = ref({ total: 0, unread: 0, read: 0, info: 0, attention: 0, warning: 0 });
const filters = ref({
  search: '',
  category: '',
  isRead: ''
});

const categoryOptions = [
  { value: '', label: 'همه دسته بندی ها' },
  { value: 'info', label: 'اطلاع رسانی' },
  { value: 'attention', label: 'توجه' },
  { value: 'warning', label: 'اخطار' }
];

const dispatchNotificationUpdate = () => {
  window.dispatchEvent(new CustomEvent('broker-notification-updated'));
};

const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');

const buildQuery = () => {
  const params = new URLSearchParams({ page: String(page.value), limit: String(limit.value) });

  if (filters.value.search.trim()) params.set('search', filters.value.search.trim());
  if (filters.value.category) params.set('category', filters.value.category);
  if (filters.value.isRead) params.set('isRead', filters.value.isRead);

  return `?${params.toString()}`;
};

const load = async () => {
  loading.value = true;
  try {
    const data = await getBrokerNotifications(buildQuery());
    items.value = data.items || [];
    summary.value = data.summary || summary.value;
    total.value = Number(data.total || 0);
    page.value = Number(data.page || 1);
    limit.value = Number(data.limit || 10);
  } catch (error) {
    toast.error(error.message);
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
  page.value = nextPage;
  await load();
};

const markOneRead = async (item) => {
  if (item.isRead) {
    return;
  }

  actionId.value = item.id;
  try {
    await markBrokerNotificationRead(item.id);
    dispatchNotificationUpdate();
    await load();
  } catch (error) {
    toast.error(error.message);
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
    await markAllBrokerNotificationsRead();
    dispatchNotificationUpdate();
    toast.success('همه نوتیفیکیشن ها خوانده شده علامت گذاری شدند');
    await load();
  } catch (error) {
    toast.error(error.message);
  } finally {
    bulkLoading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <section class="animate-in">
    <div class="page-header">
      <div class="page-header-icon"><i class="fa-solid fa-bell"></i></div>
      <div class="page-header-copy">
        <h1 class="page-header-title">نوتیفیکیشن ها</h1>
        <p class="page-header-desc">پیام های سیستم، تایید یا رد امتیازها و اعلان های مدیریتی را از اینجا پیگیری کنید.</p>
      </div>
      <button class="btn btn-outline-secondary" :disabled="bulkLoading || !summary.unread" @click="markAllRead">
        <i v-if="bulkLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
        <i v-else class="fa-solid fa-check-double me-1"></i>
        خواندن همه
      </button>
    </div>

    <div class="summary-grid mb-3">
      <div class="summary-card">
        <span>کل نوتیفیکیشن ها</span>
        <strong>{{ summary.total }}</strong>
      </div>
      <div class="summary-card warning-card">
        <span>خوانده نشده</span>
        <strong>{{ summary.unread }}</strong>
      </div>
      <div class="summary-card neutral-card">
        <span>اطلاع رسانی</span>
        <strong>{{ summary.info }}</strong>
      </div>
      <div class="summary-card attention-card">
        <span>توجه</span>
        <strong>{{ summary.attention }}</strong>
      </div>
      <div class="summary-card danger-card">
        <span>اخطار</span>
        <strong>{{ summary.warning }}</strong>
      </div>
    </div>

    <div class="content-card">
      <div class="filter-row">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input v-model="filters.search" class="form-control search-input" placeholder="جستجو در عنوان یا متن" @keyup.enter="applyFilters" />
        </div>
        <select v-model="filters.category" class="form-select">
          <option v-for="item in categoryOptions" :key="item.value || 'all'" :value="item.value">{{ item.label }}</option>
        </select>
        <select v-model="filters.isRead" class="form-select">
          <option value="">همه وضعیت ها</option>
          <option value="unread">خوانده نشده</option>
          <option value="read">خوانده شده</option>
        </select>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-primary" @click="applyFilters">اعمال</button>
          <button class="btn btn-outline-secondary" @click="clearFilters">پاکسازی</button>
        </div>
      </div>

      <div v-if="loading" class="spinner-overlay"><i class="fa-solid fa-spinner fa-spin"></i> در حال بارگذاری...</div>
      <div v-else-if="!items.length" class="empty-card compact-empty mt-3">
        <i class="fa-solid fa-bell-slash empty-icon"></i>
        <h3>نوتیفیکیشنی یافت نشد</h3>
        <p>در حال حاضر پیامی برای نمایش وجود ندارد.</p>
      </div>
      <div v-else class="notification-list mt-3">
        <article v-for="item in items" :key="item.id" class="notification-card" :class="{ unread: !item.isRead }">
          <div class="notification-card-head">
            <div class="notification-card-chips">
              <span class="category-chip" :style="{ color: item.categoryColor, background: `${item.categoryColor}18` }">{{ item.categoryLabel }}</span>
              <span class="status-chip" :class="item.isRead ? 'status-read' : 'status-unread'">{{ item.isRead ? 'خوانده شده' : 'خوانده نشده' }}</span>
            </div>
            <time class="notification-time">{{ formatDate(item.createdAt) }}</time>
          </div>

          <h2 class="notification-title">{{ item.title }}</h2>
          <p class="notification-body">{{ item.body }}</p>

          <div class="notification-footer">
            <div class="notification-meta">
              <span>فرستنده: {{ item.senderName }}</span>
              <span>گیرنده: {{ item.recipientName }}</span>
            </div>
            <button v-if="!item.isRead" class="btn btn-sm btn-outline-secondary" :disabled="actionId === item.id" @click="markOneRead(item)">
              <i v-if="actionId === item.id" class="fa-solid fa-spinner fa-spin me-1"></i>
              <i v-else class="fa-solid fa-check me-1"></i>
              خوانده شد
            </button>
          </div>
        </article>
      </div>

      <AppPagination :page="page" :limit="limit" :total="total" :disabled="loading" @change="changePage" />
    </div>
  </section>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface-color);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: var(--panel-shadow);
  flex-wrap: wrap;
}

.page-header-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--chip-bg);
  color: var(--brand-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.page-header-copy {
  flex: 1;
  min-width: 220px;
}

.page-header-title {
  font-size: 18px;
  font-weight: 800;
  margin: 0;
}

.page-header-desc {
  font-size: 13px;
  color: var(--muted-text);
  margin: 2px 0 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.summary-card,
.content-card,
.empty-card {
  background: var(--surface-color);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 20px;
  box-shadow: var(--panel-shadow);
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-card span {
  font-size: 12px;
  color: var(--muted-text);
}

.summary-card strong {
  font-size: 26px;
}

.warning-card { background: linear-gradient(160deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.03)); }
.attention-card { background: linear-gradient(160deg, rgba(249, 115, 22, 0.12), rgba(249, 115, 22, 0.03)); }
.danger-card { background: linear-gradient(160deg, rgba(220, 38, 38, 0.12), rgba(220, 38, 38, 0.03)); }
.neutral-card { background: linear-gradient(160deg, rgba(107, 114, 128, 0.12), rgba(107, 114, 128, 0.03)); }

.filter-row {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) repeat(2, minmax(0, 180px)) auto;
  gap: 12px;
  align-items: center;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted-text);
  font-size: 13px;
}

.search-input {
  padding-right: 36px;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.notification-card {
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  padding: 18px;
  background: var(--surface-soft);
}

.notification-card.unread {
  border-color: rgba(219, 0, 0, 0.25);
  box-shadow: 0 12px 28px rgba(219, 0, 0, 0.06);
}

.notification-card-head,
.notification-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.notification-card-chips,
.notification-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.category-chip,
.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-read {
  background: #f3f4f6;
  color: #6b7280;
}

.status-unread {
  background: #fff1f2;
  color: #be123c;
}

.notification-time,
.notification-meta {
  font-size: 12px;
  color: var(--muted-text);
}

.notification-title {
  font-size: 16px;
  font-weight: 800;
  margin: 14px 0 8px;
}

.notification-body {
  font-size: 14px;
  line-height: 1.9;
  color: var(--brand-text);
  margin: 0 0 14px;
}

.empty-card {
  text-align: center;
}

.empty-icon {
  font-size: 46px;
  color: var(--muted-text);
  opacity: 0.3;
  margin-bottom: 16px;
}

.compact-empty {
  padding: 32px 18px;
}

@media (max-width: 1199px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
