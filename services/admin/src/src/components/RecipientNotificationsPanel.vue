<script setup>
import { computed, ref, watch } from 'vue';
import { createNotification, getNotifications } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';

const props = defineProps({
  recipientType: {
    type: String,
    required: true
  },
  recipient: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close']);
const toast = useAppToast();

const loading = ref(false);
const sending = ref(false);
const items = ref([]);
const summary = ref({ total: 0, unread: 0, info: 0, attention: 0, warning: 0 });
const form = ref({
  category: 'info',
  title: '',
  body: ''
});

const categoryOptions = [
  { value: 'info', label: 'اطلاع رسانی', color: '#6b7280' },
  { value: 'attention', label: 'توجه', color: '#f97316' },
  { value: 'warning', label: 'اخطار', color: '#dc2626' }
];

const panelTitle = computed(() => `نوتیفیکیشن های ${props.recipient?.name || '-'}`);
const recipientInfoItems = computed(() => [
  { label: 'نام', value: props.recipient?.name || '-' },
  { label: 'موبایل', value: props.recipient?.phone || '-' },
  { label: 'کد ملی', value: props.recipient?.nationalCode || '-' },
  { label: 'ایمیل', value: props.recipient?.email || '-' },
  { label: 'تاریخ تولد', value: formatDate(props.recipient?.birthdate) },
  { label: 'شبا', value: props.recipient?.sheba || '-' },
  { label: 'کد پستی', value: props.recipient?.postalCode || '-' },
  { label: 'سطح احراز', value: props.recipientType === 'broker' ? String(props.recipient?.verifyLevel || 0) : '' },
  { label: 'آدرس', value: props.recipient?.address || '-' }
].filter((item) => item.value && item.value !== '-'));

const filterQuery = computed(() => {
  const params = new URLSearchParams({
    modelType: props.recipientType,
    modelId: String(props.recipient?.id || ''),
    limit: '6'
  });

  return `?${params.toString()}`;
});

const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');

const load = async () => {
  if (!props.recipient?.id) {
    return;
  }

  loading.value = true;
  try {
    const data = await getNotifications(filterQuery.value);
    items.value = data.items || [];
    summary.value = data.summary || summary.value;
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
      modelType: props.recipientType,
      modelId: Number(props.recipient.id),
      category: form.value.category,
      title: form.value.title,
      body: form.value.body
    });
    form.value = { category: 'info', title: '', body: '' };
    toast.success('نوتیفیکیشن ارسال شد');
    await load();
  } catch (error) {
    toast.error(error.message);
  } finally {
    sending.value = false;
  }
};

watch(
  () => [props.recipientType, props.recipient?.id],
  async () => {
    await load();
  },
  { immediate: true }
);
</script>

<template>
  <div class="card notification-panel-card">
    <div class="panel-head">
      <div>
        <h2 class="panel-title">{{ panelTitle }}</h2>
        <p class="panel-subtitle">ارسال دستی و مشاهده آخرین نوتیفیکیشن های این کاربر</p>
      </div>
      <button type="button" class="btn btn-outline-secondary btn-sm" @click="emit('close')">
        <i class="fa-solid fa-xmark me-1"></i> بستن
      </button>
    </div>

    <div class="summary-grid mb-3">
      <div class="summary-mini-card">
        <span>کل</span>
        <strong>{{ summary.total }}</strong>
      </div>
      <div class="summary-mini-card warning-tone">
        <span>خوانده نشده</span>
        <strong>{{ summary.unread }}</strong>
      </div>
      <div class="summary-mini-card neutral-tone">
        <span>اطلاع رسانی</span>
        <strong>{{ summary.info }}</strong>
      </div>
      <div class="summary-mini-card attention-tone">
        <span>توجه</span>
        <strong>{{ summary.attention }}</strong>
      </div>
      <div class="summary-mini-card danger-tone">
        <span>اخطار</span>
        <strong>{{ summary.warning }}</strong>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-12 col-xl-5">
        <div class="panel-section-card">
          <h3 class="section-title">ارسال نوتیفیکیشن</h3>
          <div class="recipient-info-card mb-3">
            <div class="recipient-info-head">
              <strong>{{ props.recipient?.name || '-' }}</strong>
              <span>{{ props.recipientType === 'broker' ? 'کارگزار' : 'مشتری' }}</span>
            </div>
            <div class="recipient-info-grid">
              <div v-for="item in recipientInfoItems" :key="item.label" class="recipient-info-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label form-label-required">دسته بندی</label>
            <select v-model="form.category" class="form-select">
              <option v-for="item in categoryOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label form-label-required">عنوان</label>
            <input v-model="form.title" class="form-control" maxlength="255" placeholder="عنوان نوتیفیکیشن" />
          </div>
          <div class="mb-3">
            <label class="form-label form-label-required">متن اصلی</label>
            <textarea v-model="form.body" rows="4" class="form-control" maxlength="5000" placeholder="متن کامل نوتیفیکیشن"></textarea>
          </div>
          <button type="button" class="btn btn-primary" :disabled="sending" @click="submit">
            <i v-if="sending" class="fa-solid fa-spinner fa-spin me-1"></i>
            <i v-else class="fa-solid fa-paper-plane me-1"></i>
            ارسال نوتیفیکیشن
          </button>
        </div>
      </div>

      <div class="col-12 col-xl-7">
        <div class="panel-section-card h-100">
          <div class="latest-head">
            <h3 class="section-title mb-0">آخرین نوتیفیکیشن ها</h3>
            <button type="button" class="btn btn-outline-secondary btn-sm" @click="load">
              <i class="fa-solid fa-rotate me-1"></i> بروزرسانی
            </button>
          </div>

          <div v-if="loading" class="spinner-overlay compact-spinner">
            <i class="fa-solid fa-spinner"></i>
            <span>در حال بارگذاری...</span>
          </div>
          <div v-else-if="!items.length" class="notification-empty-state">
            <i class="fa-solid fa-bell-slash"></i>
            <span>نوتیفیکیشنی برای این کاربر ثبت نشده است</span>
          </div>
          <div v-else class="notification-list">
            <div v-for="item in items" :key="item.id" class="notification-item">
              <div class="notification-head">
                <span class="notification-badge" :style="{ color: item.categoryColor, background: `${item.categoryColor}15` }">{{ item.categoryLabel }}</span>
                <span class="small text-muted">{{ formatDate(item.createdAt) }}</span>
              </div>
              <div class="notification-title">{{ item.title }}</div>
              <div class="notification-body">{{ item.body }}</div>
              <div class="notification-meta">فرستنده: {{ item.senderName }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./styles/RecipientNotificationsPanel.css"></style>