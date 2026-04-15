<script setup>
import { onMounted, ref } from 'vue';
import AppPagination from '../components/AppPagination.vue';
import {
  createDocument,
  deleteDocument,
  getDocuments,
  updateDocument
} from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';
import { useConfirm } from '../composables/useConfirm.js';

const toast = useAppToast();
const { confirm } = useConfirm();

const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const search = ref('');
const subjectFilter = ref('');
const typeFilter = ref('');
const categoryFilter = ref('');
const form = ref({
  id: null,
  title: '',
  type: 'file',
  mimes: '',
  max: '',
  help: '',
  subject: 'validation',
  category: '',
  required: false
});

const typeOptions = [
  { value: 'file', label: 'فایل' },
  { value: 'text', label: 'متن' },
  { value: 'number', label: 'عدد' },
  { value: 'date', label: 'تاریخ' }
];

const subjectOptions = [
  { value: 'general', label: 'کاربر عمومی' },
  { value: 'loan', label: 'وام ها' },
  { value: 'validation', label: 'برای اعتبار سنجی' }
];

const categoryOptions = [
  { value: 'personal_data', label: 'اطلاعات شخصی' },
  { value: 'job_data', label: 'اطلاعات شغلی' },
  { value: 'income_data', label: 'اطلاعات درآمدی' }
];

const resetForm = () => {
  form.value = {
    id: null,
    title: '',
    type: 'file',
    mimes: '',
    max: '',
    help: '',
    subject: 'validation',
    category: '',
    required: false
  };
};

const buildQuery = () => {
  const params = new URLSearchParams({ page: String(page.value), limit: String(limit.value) });

  if (search.value.trim()) params.set('search', search.value.trim());
  if (subjectFilter.value) params.set('subject', subjectFilter.value);
  if (typeFilter.value) params.set('type', typeFilter.value);
  if (categoryFilter.value) params.set('category', categoryFilter.value);

  return `?${params.toString()}`;
};

const load = async () => {
  loading.value = true;
  try {
    const data = await getDocuments(buildQuery());
    items.value = data.items || [];
    page.value = Number(data.page || 1);
    limit.value = Number(data.limit || 10);
    total.value = Number(data.total || 0);
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
  search.value = '';
  subjectFilter.value = '';
  typeFilter.value = '';
  categoryFilter.value = '';
  page.value = 1;
  await load();
};

const changePage = async (nextPage) => {
  page.value = nextPage;
  await load();
};

const submit = async () => {
  saving.value = true;

  try {
    const payload = {
      title: form.value.title,
      type: form.value.type,
      mimes: form.value.mimes,
      max: form.value.max,
      help: form.value.help,
      subject: form.value.subject,
      category: form.value.category,
      required: String(Boolean(form.value.required))
    };

    if (form.value.id) {
      await updateDocument(form.value.id, payload);
      toast.success('مستند بروزرسانی شد');
    } else {
      await createDocument(payload);
      toast.success('مستند جدید ثبت شد');
    }

    resetForm();
    await load();
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.value = false;
  }
};

const editItem = (item) => {
  form.value = {
    id: item.id,
    title: item.title || '',
    type: item.type || 'file',
    mimes: item.mimes || '',
    max: item.max || '',
    help: item.help || '',
    subject: item.subject || 'validation',
    category: item.category || '',
    required: Boolean(item.required)
  };
};

const removeItem = async (id) => {
  const ok = await confirm({ title: 'حذف مستند', text: 'آیا از حذف این مستند مطمئن هستید؟' });
  if (!ok) return;

  try {
    await deleteDocument(id);
    if (form.value.id === id) resetForm();
    toast.success('مستند حذف شد');
    await load();
  } catch (error) {
    toast.error(error.message);
  }
};

onMounted(load);
</script>

<template>
  <div class="animate-in">
    <div class="page-header">
      <div class="page-header-info">
        <div class="page-header-icon"><i class="fa-solid fa-folder-open"></i></div>
        <div>
          <h1 class="page-title">مدیریت مستندات</h1>
          <p class="page-subtitle">فیلدهای ورودی موردنیاز برای وام و اعتبارسنجی را از اینجا مدیریت کنید.</p>
        </div>
      </div>
      <div class="page-header-badge">{{ total }} مستند</div>
    </div>

    <div class="card card-body mb-3 management-card">
      <div class="row g-3">
        <div class="col-12 col-lg-4">
          <label class="form-label form-label-required">عنوان</label>
          <input v-model="form.title" class="form-control" maxlength="255" placeholder="مثلا تصویر کارت ملی" />
        </div>
        <div class="col-12 col-md-4 col-lg-2">
          <label class="form-label form-label-required">نوع فیلد</label>
          <select v-model="form.type" class="form-select">
            <option v-for="option in typeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>
        <div class="col-12 col-md-4 col-lg-3">
          <label class="form-label form-label-optional">موضوع</label>
          <select v-model="form.subject" class="form-select">
            <option value="">بدون موضوع</option>
            <option v-for="option in subjectOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>
        <div class="col-12 col-md-4 col-lg-3">
          <label class="form-label form-label-optional">دسته بندی</label>
          <select v-model="form.category" class="form-select">
            <option value="">بدون دسته بندی</option>
            <option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>
        <div class="col-12 col-lg-4">
          <label class="form-label form-label-optional">فرمت های مجاز</label>
          <input v-model="form.mimes" class="form-control" maxlength="255" placeholder="png,jpg,jpeg" />
        </div>
        <div class="col-12 col-lg-2">
          <label class="form-label form-label-optional">حداکثر</label>
          <input v-model="form.max" type="number" class="form-control" min="1" placeholder="2048" />
        </div>
        <div class="col-12 col-lg-6 d-flex align-items-end">
          <label class="check-tile w-100">
            <input v-model="form.required" class="form-check-input" type="checkbox" />
            <span>
              <strong>الزامی باشد (اختیاری)</strong>
              <small>در صورت فعال بودن، تکمیل این مستند برای کاربر اجباری خواهد شد.</small>
            </span>
          </label>
        </div>
        <div class="col-12">
          <label class="form-label form-label-optional">راهنما</label>
          <textarea v-model="form.help" class="form-control" rows="3" maxlength="10000" placeholder="راهنمای نمایش کنار فیلد"></textarea>
        </div>
        <div class="col-12 d-flex gap-2 flex-wrap">
          <button class="btn btn-primary" :disabled="saving" @click="submit">
            <i v-if="saving" class="fa-solid fa-spinner fa-spin me-1"></i>
            <i v-else class="fa-solid fa-floppy-disk me-1"></i>
            {{ form.id ? 'بروزرسانی مستند' : 'ثبت مستند' }}
          </button>
          <button v-if="form.id" class="btn btn-outline-secondary" @click="resetForm">
            <i class="fa-solid fa-xmark me-1"></i> انصراف
          </button>
        </div>
      </div>
    </div>

    <div class="card management-card">
      <div class="filter-row">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input v-model="search" class="form-control search-input" placeholder="جستجو در عنوان یا راهنما" @keyup.enter="applyFilters" />
        </div>
        <select v-model="subjectFilter" class="form-select compact-select" @change="applyFilters">
          <option value="">همه موضوع ها</option>
          <option v-for="option in subjectOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <select v-model="typeFilter" class="form-select compact-select" @change="applyFilters">
          <option value="">همه نوع ها</option>
          <option v-for="option in typeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <select v-model="categoryFilter" class="form-select compact-select" @change="applyFilters">
          <option value="">همه دسته ها</option>
          <option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <button class="btn btn-outline-secondary" @click="clearFilters">
          <i class="fa-solid fa-rotate-left me-1"></i> پاکسازی
        </button>
      </div>

      <div v-if="loading" class="spinner-overlay">
        <i class="fa-solid fa-spinner"></i>
        <span>در حال بارگذاری مستندات...</span>
      </div>
      <div v-else-if="!items.length" class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>مستندی یافت نشد</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table table-striped align-middle mb-0">
          <thead>
            <tr>
              <th>عنوان</th>
              <th>نوع</th>
              <th>موضوع</th>
              <th>دسته بندی</th>
              <th>الزامی</th>
              <th>تنظیمات</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>
                <div class="fw-bold">{{ item.title }}</div>
                <div class="small text-muted">{{ item.help || '-' }}</div>
              </td>
              <td><span class="type-chip chip-blue">{{ item.typeLabel }}</span></td>
              <td><span class="type-chip chip-teal">{{ item.subjectLabel }}</span></td>
              <td><span class="type-chip chip-purple">{{ item.categoryLabel }}</span></td>
              <td>
                <span class="type-chip" :class="item.required ? 'chip-red' : 'chip-gray'">{{ item.required ? 'الزامی' : 'اختیاری' }}</span>
              </td>
              <td>
                <div class="small text-muted">mime: {{ item.mimes || '-' }}</div>
                <div class="small text-muted">max: {{ item.max || '-' }}</div>
              </td>
              <td>
                <div class="d-flex gap-2 flex-wrap">
                  <button class="btn btn-sm btn-outline-primary" @click="editItem(item)">
                    <i class="fa-solid fa-pen me-1"></i> ویرایش
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="removeItem(item.id)">
                    <i class="fa-solid fa-trash-can me-1"></i> حذف
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AppPagination :page="page" :limit="limit" :total="total" :disabled="loading" @change="changePage" />
    </div>
  </div>
</template>

<style scoped src="./styles/DocumentsView.css"></style>