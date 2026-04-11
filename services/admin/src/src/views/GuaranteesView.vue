<script setup>
import { onMounted, ref } from 'vue';
import AppPagination from '../components/AppPagination.vue';
import { createGuarantee, deleteGuarantee, getGuarantees, updateGuarantee } from '../services/admin-api.js';
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
const form = ref({ id: null, title: '', help: '' });

const resetForm = () => { form.value = { id: null, title: '', help: '' }; };

const load = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(limit.value) });
    if (search.value.trim()) {
      params.set('search', search.value.trim());
    }
    const query = `?${params.toString()}`;
    const data = await getGuarantees(query);
    items.value = data.items;
    page.value = Number(data.page || 1);
    limit.value = Number(data.limit || 10);
    total.value = Number(data.total || 0);
  } catch (error) { toast.error(error.message); }
  finally { loading.value = false; }
};

const applyFilters = async () => {
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
    if (form.value.id) {
      await updateGuarantee(form.value.id, form.value);
      toast.success('ضمانت بروزرسانی شد');
    } else {
      await createGuarantee(form.value);
      toast.success('ضمانت جدید ثبت شد');
    }
    resetForm();
    await load();
  } catch (error) { toast.error(error.message); }
  finally { saving.value = false; }
};

const editItem = (item) => { form.value = { id: item.id, title: item.title || '', help: item.help || '' }; };

const removeItem = async (id) => {
  const ok = await confirm({ title: 'حذف ضمانت', text: 'آیا از حذف این ضمانت مطمئن هستید؟' });
  if (!ok) return;
  try {
    await deleteGuarantee(id);
    if (form.value.id === id) resetForm();
    toast.success('ضمانت حذف شد');
    await load();
  } catch (error) { toast.error(error.message); }
};

onMounted(load);
</script>

<template>
  <div class="animate-in">
    <div class="page-header">
      <div class="page-header-info">
        <div class="page-header-icon"><i class="fa-solid fa-shield-halved"></i></div>
        <div>
          <h1 class="page-title">مدیریت ضمانت ها</h1>
          <p class="page-subtitle">ثبت، ویرایش و حذف انواع ضمانت</p>
        </div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input v-model="search" class="form-control search-input" placeholder="جستجو..." @keyup.enter="applyFilters" />
        </div>
      </div>
    </div>

    <!-- Form Card -->
    <div class="card card-body mb-3">
      <div class="row g-3">
        <div class="col-12 col-lg-4">
          <label class="form-label form-label-required"><i class="fa-solid fa-tag me-1"></i> عنوان ضمانت</label>
          <input v-model="form.title" class="form-control" maxlength="50" />
        </div>
        <div class="col-12 col-lg-8">
          <label class="form-label form-label-optional"><i class="fa-solid fa-circle-info me-1"></i> راهنما</label>
          <textarea v-model="form.help" class="form-control" rows="2" maxlength="3000"></textarea>
        </div>
        <div class="col-12 d-flex gap-2">
          <button class="btn btn-primary" :disabled="saving" @click="submit">
            <i class="fa-solid fa-floppy-disk me-1"></i>
            {{ saving ? 'ذخیره...' : form.id ? 'بروزرسانی' : 'ثبت ضمانت' }}
          </button>
          <button v-if="form.id" class="btn btn-outline-secondary" @click="resetForm">
            <i class="fa-solid fa-xmark me-1"></i> انصراف
          </button>
        </div>
      </div>
    </div>

    <!-- Table Card -->
    <div class="card">
      <div v-if="loading" class="spinner-overlay">
        <i class="fa-solid fa-spinner"></i>
        <span>در حال بارگذاری...</span>
      </div>
      <div v-else-if="!items.length" class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>ضمانتی ثبت نشده</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table table-striped align-middle mb-0">
          <thead>
            <tr>
              <th>عنوان</th>
              <th>راهنما</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td class="fw-bold">{{ item.title }}</td>
              <td>{{ item.help || '-' }}</td>
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

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.page-header-info { display: flex; align-items: center; gap: 14px; }
.page-header-icon { width: 46px; height: 46px; border-radius: 12px; background: var(--admin-primary-light); color: var(--admin-primary); display: flex; align-items: center; justify-content: center; font-size: 18px; }
.page-title { font-size: 18px; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 13px; color: var(--admin-muted); margin: 2px 0 0; }
.search-box { position: relative; }
.search-icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--admin-muted); font-size: 13px; }
.search-input { padding-right: 36px; min-width: 200px; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px 24px; color: var(--admin-muted); gap: 10px; }
.empty-state i { font-size: 36px; opacity: 0.5; }
</style>