<script setup>
import { computed, onMounted, ref } from 'vue';
import Select2Input from '../components/Select2Input.vue';
import AppPagination from '../components/AppPagination.vue';
import {
  createNotification,
  getNotificationOptions,
  getNotifications
} from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();

const optionLoading = ref(false);
const loading = ref(false);
const sending = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const items = ref([]);
const summary = ref({ total: 0, unread: 0, info: 0, attention: 0, warning: 0 });
const filters = ref({
  search: '',
  modelType: '',
  modelId: '',
  category: '',
  isRead: ''
});
const options = ref({
  recipientTypes: [],
  categories: [],
  brokers: [],
  customers: []
});
const form = ref({
  modelType: 'broker',
  modelId: '',
  category: 'info',
  title: '',
  body: ''
});

const recipientOptions = computed(() => (
  form.value.modelType === 'customer' ? options.value.customers : options.value.brokers
));

const filterRecipientOptions = computed(() => (
  filters.value.modelType === 'customer' ? options.value.customers : options.value.brokers
));

const selectedRecipient = computed(() =>
  recipientOptions.value.find((item) => Number(item.id) === Number(form.value.modelId)) || null
);

const buildRecipientDetails = (item, modelType) => {
  if (!item) {
    return [];
  }

  return [
    { label: 'نام', value: item.name || '-' },
    { label: 'موبایل', value: item.phone || '-' },
    { label: 'کد ملی', value: item.nationalCode || '-' },
    { label: 'ایمیل', value: item.email || '-' },
    { label: 'تاریخ تولد', value: formatDate(item.birthdate) },
    { label: 'شبا', value: item.sheba || '-' },
    { label: 'کد پستی', value: item.postalCode || '-' },
    { label: 'سطح احراز', value: modelType === 'broker' ? String(item.verifyLevel || 0) : '' },
    { label: 'آدرس', value: item.address || '-' }
  ].filter((detail) => detail.value && detail.value !== '-');
};

const selectedRecipientDetails = computed(() => buildRecipientDetails(selectedRecipient.value, form.value.modelType));

const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');

const loadOptions = async () => {
  optionLoading.value = true;
  try {
    const data = await getNotificationOptions();
    options.value = {
      recipientTypes: data.recipientTypes || [],
      categories: data.categories || [],
      brokers: data.brokers || [],
      customers: data.customers || []
    };
  } catch (error) {
    toast.error(error.message);
  } finally {
    optionLoading.value = false;
  }
};

const buildQuery = () => {
  const params = new URLSearchParams({ page: String(page.value), limit: String(limit.value) });
  if (filters.value.search.trim()) params.set('search', filters.value.search.trim());
  if (filters.value.modelType) params.set('modelType', filters.value.modelType);
  if (filters.value.modelId) params.set('modelId', String(filters.value.modelId));
  if (filters.value.category) params.set('category', filters.value.category);
  if (filters.value.isRead) params.set('isRead', filters.value.isRead);
  return `?${params.toString()}`;
};

const load = async () => {
  loading.value = true;
  try {
    const data = await getNotifications(buildQuery());
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

const submit = async () => {
  sending.value = true;
  try {
    await createNotification({
      modelType: form.value.modelType,
      modelId: Number(form.value.modelId),
      category: form.value.category,
      title: form.value.title,
      body: form.value.body
    });
    form.value = { modelType: 'broker', modelId: '', category: 'info', title: '', body: '' };
    toast.success('نوتیفیکیشن ارسال شد');
    await load();
  } catch (error) {
    toast.error(error.message);
  } finally {
    sending.value = false;
  }
};

const applyFilters = async () => {
  page.value = 1;
  await load();
};

const clearFilters = async () => {
  filters.value = { search: '', modelType: '', modelId: '', category: '', isRead: '' };
  page.value = 1;
  await load();
};

const changePage = async (nextPage) => {
  page.value = nextPage;
  await load();
};

onMounted(async () => {
  await Promise.all([loadOptions(), load()]);
});
</script>

<template>
  <div class="animate-in">
    <div class="page-header">
      <div class="page-header-info">
        <div class="page-header-icon"><i class="fa-solid fa-bell"></i></div>
        <div>
          <h1 class="page-title">مدیریت نوتیفیکیشن ها</h1>
          <p class="page-subtitle">ارسال نوتیف به کارگزاران و مشتریان و مشاهده وضعیت خوانده شدن</p>
        </div>
      </div>
      <div class="page-header-badge">{{ summary.unread }} خوانده نشده</div>
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

    <div class="row g-3">
      <div class="col-12 col-xl-4">
        <div class="card composer-card">
          <div class="card-body">
            <h2 class="section-title">ارسال نوتیفیکیشن</h2>
            <div v-if="optionLoading" class="spinner-overlay compact-spinner">
              <i class="fa-solid fa-spinner"></i>
              <span>در حال بارگذاری گزینه ها...</span>
            </div>
            <template v-else>
              <div class="mb-3">
                <label class="form-label form-label-required">نوع گیرنده</label>
                <select v-model="form.modelType" class="form-select" @change="form.modelId = ''">
                  <option v-for="item in options.recipientTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label form-label-required">گیرنده</label>
                <Select2Input v-model="form.modelId" :options="recipientOptions" label-key="displayLabel" value-key="id" number placeholder="انتخاب گیرنده" />
              </div>
              <div v-if="selectedRecipient" class="recipient-info-card mb-3">
                <div class="recipient-info-head">
                  <strong>{{ selectedRecipient.name }}</strong>
                  <span>{{ form.modelType === 'broker' ? 'کارگزار' : 'مشتری' }}</span>
                </div>
                <div class="recipient-info-grid">
                  <div v-for="detail in selectedRecipientDetails" :key="detail.label" class="recipient-info-item">
                    <span>{{ detail.label }}</span>
                    <strong>{{ detail.value }}</strong>
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label form-label-required">دسته بندی</label>
                <select v-model="form.category" class="form-select">
                  <option v-for="item in options.categories" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label form-label-required">عنوان</label>
                <input v-model="form.title" class="form-control" maxlength="255" placeholder="عنوان نوتیفیکیشن" />
              </div>
              <div class="mb-3">
                <label class="form-label form-label-required">متن اصلی</label>
                <textarea v-model="form.body" rows="5" class="form-control" maxlength="5000" placeholder="متن کامل نوتیفیکیشن"></textarea>
              </div>
              <button type="button" class="btn btn-primary" :disabled="sending" @click="submit">
                <i v-if="sending" class="fa-solid fa-spinner fa-spin me-1"></i>
                <i v-else class="fa-solid fa-paper-plane me-1"></i>
                ارسال
              </button>
            </template>
          </div>
        </div>
      </div>

      <div class="col-12 col-xl-8">
        <div class="card list-card">
          <div class="card-body">
            <div class="filter-grid mb-3">
              <div class="search-box">
                <i class="fa-solid fa-magnifying-glass search-icon"></i>
                <input v-model="filters.search" class="form-control search-input" placeholder="جستجو در عنوان یا متن" @keyup.enter="applyFilters" />
              </div>
              <select v-model="filters.modelType" class="form-select" @change="filters.modelId = ''">
                <option value="">همه گیرنده ها</option>
                <option v-for="item in options.recipientTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
              <Select2Input v-if="filters.modelType" v-model="filters.modelId" :options="filterRecipientOptions" label-key="displayLabel" value-key="id" number placeholder="فیلتر گیرنده" />
              <select v-model="filters.category" class="form-select">
                <option value="">همه دسته بندی ها</option>
                <option v-for="item in options.categories" :key="item.value" :value="item.value">{{ item.label }}</option>
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

            <div v-if="loading" class="spinner-overlay compact-spinner">
              <i class="fa-solid fa-spinner"></i>
              <span>در حال بارگذاری...</span>
            </div>
            <div v-else-if="!items.length" class="empty-state compact-empty">
              <i class="fa-solid fa-bell-slash"></i>
              <p>نوتیفیکیشنی یافت نشد</p>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th>دسته بندی</th>
                    <th>عنوان</th>
                    <th>گیرنده</th>
                    <th>فرستنده</th>
                    <th>وضعیت</th>
                    <th>تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in items" :key="item.id">
                    <td>
                      <span class="category-chip" :style="{ color: item.categoryColor, background: `${item.categoryColor}15` }">{{ item.categoryLabel }}</span>
                    </td>
                    <td>
                      <div class="fw-bold">{{ item.title }}</div>
                      <div class="small text-muted text-wrap">{{ item.body }}</div>
                    </td>
                    <td>
                      <div class="fw-semibold">{{ item.recipientName }}</div>
                      <div class="small text-muted">{{ item.recipientPhone }}</div>
                    </td>
                    <td>
                      <div class="fw-semibold">{{ item.senderName }}</div>
                      <div class="small text-muted">{{ item.senderPhone }}</div>
                    </td>
                    <td>
                      <span class="status-chip" :class="item.isRead ? 'status-read' : 'status-unread'">{{ item.isRead ? 'خوانده شده' : 'خوانده نشده' }}</span>
                    </td>
                    <td>{{ formatDate(item.createdAt) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <AppPagination :page="page" :limit="limit" :total="total" :disabled="loading" @change="changePage" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./styles/NotificationsView.css"></style>