<script setup>
import { onMounted, ref } from 'vue';
import AppPagination from '../components/AppPagination.vue';
import { createTutorial, deleteTutorial, getTutorials, updateTutorial } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';
import { useConfirm } from '../composables/useConfirm.js';

const toast = useAppToast();
const { confirm } = useConfirm();

const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const search = ref('');
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const form = ref({ id: null, title: '', description: '', sort: 0, status: 'active' });
const videoFile = ref(null);
const videoPreview = ref(null);
const videoInputRef = ref(null);

const resetForm = () => {
  form.value = { id: null, title: '', description: '', sort: 0, status: 'active' };
  videoFile.value = null;
  if (videoPreview.value && videoPreview.value.startsWith('blob:')) URL.revokeObjectURL(videoPreview.value);
  videoPreview.value = null;
  if (videoInputRef.value) videoInputRef.value.value = '';
};

const load = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(limit.value) });
    if (search.value.trim()) params.set('search', search.value.trim());
    const data = await getTutorials(`?${params.toString()}`);
    items.value = data.items;
    page.value = Number(data.page || 1);
    limit.value = Number(data.limit || 10);
    total.value = Number(data.total || 0);
  } catch (error) { toast.error(error.message); }
  finally { loading.value = false; }
};

const applyFilters = async () => { page.value = 1; await load(); };
const changePage = async (nextPage) => { page.value = nextPage; await load(); };

const handleVideoChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  videoFile.value = file;
  videoPreview.value = URL.createObjectURL(file);
};

const submit = async () => {
  saving.value = true;
  try {
    const fd = new FormData();
    fd.append('title', form.value.title);
    fd.append('description', form.value.description || '');
    fd.append('sort', String(form.value.sort || 0));
    fd.append('status', form.value.status);
    if (videoFile.value) fd.append('video', videoFile.value);

    if (form.value.id) {
      await updateTutorial(form.value.id, fd);
      toast.success('آموزش بروزرسانی شد');
    } else {
      await createTutorial(fd);
      toast.success('آموزش جدید ثبت شد');
    }
    resetForm();
    await load();
  } catch (error) { toast.error(error.message); }
  finally { saving.value = false; }
};

const editItem = (item) => {
  form.value = { id: item.id, title: item.title, description: item.description || '', sort: item.sort || 0, status: item.status };
  videoFile.value = null;
  videoPreview.value = item.videoUrl || null;
};

const removeItem = async (id) => {
  const ok = await confirm({ title: 'حذف آموزش', text: 'آیا از حذف این آموزش مطمئن هستید؟' });
  if (!ok) return;
  try {
    await deleteTutorial(id);
    if (form.value.id === id) resetForm();
    toast.success('آموزش حذف شد');
    await load();
  } catch (error) { toast.error(error.message); }
};

onMounted(load);
</script>

<template>
  <div class="animate-in">
    <div class="page-header">
      <div class="page-header-info">
        <div class="page-header-icon"><i class="fa-solid fa-graduation-cap"></i></div>
        <div>
          <h1 class="page-title">مدیریت آموزش ها</h1>
          <p class="page-subtitle">ثبت، ویرایش و حذف آموزش‌های ویدیویی</p>
        </div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input v-model="search" class="form-control search-input" placeholder="جستجو..." @keyup.enter="applyFilters" />
        </div>
      </div>
    </div>

    <div class="card card-body mb-3">
      <div class="row g-3">
        <div class="col-12 col-lg-4">
          <label class="form-label form-label-required"><i class="fa-solid fa-tag me-1"></i> عنوان</label>
          <input v-model="form.title" class="form-control" maxlength="255" />
        </div>
        <div class="col-12 col-lg-4">
          <label class="form-label form-label-optional"><i class="fa-solid fa-sort me-1"></i> ترتیب نمایش</label>
          <input v-model.number="form.sort" type="number" class="form-control" min="0" />
        </div>
        <div class="col-12 col-lg-4">
          <label class="form-label"><i class="fa-solid fa-toggle-on me-1"></i> وضعیت</label>
          <select v-model="form.status" class="form-select">
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
          </select>
        </div>
        <div class="col-12">
          <label class="form-label form-label-optional"><i class="fa-solid fa-align-right me-1"></i> توضیحات</label>
          <textarea v-model="form.description" class="form-control" rows="2" maxlength="5000"></textarea>
        </div>
        <div class="col-12">
          <label class="form-label"><i class="fa-solid fa-video me-1"></i> ویدیو آموزشی</label>
          <input ref="videoInputRef" type="file" class="form-control" accept="video/*" @change="handleVideoChange" />
          <div v-if="videoPreview" class="video-preview mt-2">
            <video :src="videoPreview" controls class="video-player"></video>
          </div>
        </div>
        <div class="col-12 d-flex gap-2">
          <button class="btn btn-primary" :disabled="saving" @click="submit">
            <i class="fa-solid fa-floppy-disk me-1"></i>
            {{ saving ? 'ذخیره...' : form.id ? 'بروزرسانی' : 'ثبت آموزش' }}
          </button>
          <button v-if="form.id" class="btn btn-outline-secondary" @click="resetForm">
            <i class="fa-solid fa-xmark me-1"></i> انصراف
          </button>
        </div>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="spinner-overlay">
        <i class="fa-solid fa-spinner"></i>
        <span>در حال بارگذاری...</span>
      </div>
      <div v-else-if="!items.length" class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>آموزشی ثبت نشده</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table table-striped align-middle mb-0">
          <thead>
            <tr>
              <th>ترتیب</th>
              <th>عنوان</th>
              <th>وضعیت</th>
              <th>ویدیو</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>{{ item.sort }}</td>
              <td class="fw-bold">{{ item.title }}</td>
              <td>
                <span class="badge" :class="item.status === 'active' ? 'bg-success' : 'bg-secondary'">{{ item.statusLabel }}</span>
              </td>
              <td>
                <i v-if="item.videoUrl" class="fa-solid fa-circle-check text-success"></i>
                <i v-else class="fa-solid fa-circle-xmark text-muted"></i>
              </td>
              <td>
                <div class="d-flex gap-2">
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

<style scoped src="./styles/TutorialsView.css"></style>
