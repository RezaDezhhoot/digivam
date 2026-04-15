<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppPagination from '../components/AppPagination.vue';
import {
  getBrokerNotifications,
  markAllBrokerNotificationsRead,
  markBrokerNotificationRead
} from '../services/broker-notification.api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();
const router = useRouter();

const loading = ref(false);
const bulkLoading = ref(false);
const actionId = ref(null);
const navigateId = ref(null);
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

const getNotificationDetailPath = (item) => String(item?.metadata?.detailPath || '').trim();

const openNotificationTarget = async (item) => {
  const detailPath = getNotificationDetailPath(item);
  if (!detailPath) {
    return;
  }

  navigateId.value = item.id;
  try {
    if (!item.isRead) {
      await markBrokerNotificationRead(item.id).catch(() => null);
      dispatchNotificationUpdate();
    }
    await load().catch(() => null);
    await router.push(detailPath);
  } catch (error) {
    toast.error(error.message);
  } finally {
    navigateId.value = null;
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
            <div class="notification-actions">
              <button
                v-if="item.metadata?.detailPath"
                class="btn btn-sm btn-primary"
                :disabled="navigateId === item.id"
                @click="openNotificationTarget(item)"
              >
                <i v-if="navigateId === item.id" class="fa-solid fa-spinner fa-spin me-1"></i>
                <i v-else class="fa-solid fa-arrow-up-right-from-square me-1"></i>
                مشاهده معامله
              </button>
              <button v-if="!item.isRead" class="btn btn-sm btn-outline-secondary" :disabled="actionId === item.id || navigateId === item.id" @click="markOneRead(item)">
                <i v-if="actionId === item.id" class="fa-solid fa-spinner fa-spin me-1"></i>
                <i v-else class="fa-solid fa-check me-1"></i>
                خوانده شد
              </button>
            </div>
          </div>
        </article>
      </div>

      <AppPagination :page="page" :limit="limit" :total="total" :disabled="loading" @change="changePage" />
    </div>
  </section>
</template>

<style scoped src="./styles/BrokerNotificationsView.css"></style>
