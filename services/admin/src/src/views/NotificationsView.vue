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

<style scoped>
.page-header,
.page-header-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.page-header {
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.page-header-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--admin-primary-light);
  color: var(--admin-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.page-title { font-size: 18px; font-weight: 800; margin: 0; }
.page-subtitle { font-size: 13px; color: var(--admin-muted); margin: 2px 0 0; }
.page-header-badge {
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--admin-primary-light);
  color: var(--admin-primary);
  font-size: 12px;
  font-weight: 800;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: var(--admin-shadow);
}

.summary-card span { font-size: 12px; color: var(--admin-muted); }
.summary-card strong { font-size: 24px; color: var(--admin-text); }
.warning-card { background: #fff7ed; }
.attention-card { background: #fff7ed; }
.danger-card { background: #fef2f2; }
.neutral-card { background: #f8fafc; }
.composer-card,
.list-card { height: 100%; }
.section-title { font-size: 16px; font-weight: 800; margin-bottom: 16px; }

.composer-card :is(.form-label, .form-control, .form-select, textarea, input, select) {
  color: var(--admin-text);
}

.composer-card :is(.form-control, .form-select, textarea, input, select) {
  background: var(--admin-surface);
  border-color: var(--admin-border);
}

.composer-card :is(.form-control::placeholder, textarea::placeholder) {
  color: var(--admin-muted);
}

.recipient-info-card {
  background: var(--admin-surface-soft);
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  padding: 14px;
}

.recipient-info-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.recipient-info-head span {
  color: var(--admin-muted);
  font-size: 12px;
}

.recipient-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.recipient-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 12px;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
}

.recipient-info-item span {
  font-size: 11px;
  color: var(--admin-muted);
}

.recipient-info-item strong {
  font-size: 13px;
  color: var(--admin-text);
  word-break: break-word;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1.4fr repeat(4, minmax(0, 1fr)) auto;
  gap: 12px;
  align-items: center;
}

.search-box { position: relative; }
.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--admin-muted);
  font-size: 13px;
}
.search-input { padding-right: 36px; }

.category-chip,
.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.status-read { background: #ecfdf5; color: #166534; }
.status-unread { background: #fff7ed; color: #c2410c; }

:root[data-theme='dark'] .composer-card,
:root[data-theme='dark'] .recipient-info-item,
:root[data-theme='dark'] .recipient-info-card {
  color: var(--admin-text);
}

:root[data-theme='dark'] .composer-card .btn-primary {
  color: #fff;
}

@media (max-width: 1199px) {
  .summary-grid,
  .filter-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 767px) {
  .summary-grid,
  .filter-grid,
  .recipient-info-grid {
    grid-template-columns: 1fr;
  }
}
</style>