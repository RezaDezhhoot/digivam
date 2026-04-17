<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppPagination from '../components/AppPagination.vue';
import { createAdmin, deleteAdmin, getAdmins, updateAdmin } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';
import { useConfirm } from '../composables/useConfirm.js';

const toast = useAppToast();
const { confirm } = useConfirm();
const route = useRoute();

const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const search = ref('');
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const form = ref({ id: null, name: '', phone: '', email: '', password: '' });
const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;

const resetForm = () => {
  form.value = { id: null, name: '', phone: '', email: '', password: '' };
};

const load = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(limit.value) });
    if (search.value.trim()) {
      params.set('search', search.value.trim());
    }
    const data = await getAdmins(`?${params.toString()}`);
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
    const payload = { name: form.value.name, phone: form.value.phone, email: form.value.email };
    if (form.value.password) payload.password = form.value.password;

    if (form.value.id) {
      await updateAdmin(form.value.id, payload);
      toast.success('ادمین بروزرسانی شد');
    } else {
      if (!form.value.password) { toast.warning('رمز عبور برای ادمین جدید الزامی است'); saving.value = false; return; }
      payload.password = form.value.password;
      await createAdmin(payload);
      toast.success('ادمین جدید ایجاد شد');
    }
    resetForm();
    await load();
  } catch (error) { toast.error(error.message); }
  finally { saving.value = false; }
};

const editItem = (item) => {
  form.value = { id: item.id, name: item.name || '', phone: item.phone || '', email: item.email || '', password: '' };
};

const removeItem = async (id) => {
  const ok = await confirm({ title: 'حذف ادمین', text: 'آیا از حذف این ادمین مطمئن هستید؟' });
  if (!ok) return;
  try {
    await deleteAdmin(id);
    toast.success('ادمین حذف شد');
    await load();
  } catch (error) { toast.error(error.message); }
};

watch(
  () => route.query.search,
  async (value) => {
    const normalized = String(value || '').trim();
    if (normalized === search.value) {
      return;
    }

    search.value = normalized;
    page.value = 1;
    await load();
  }
);

onMounted(async () => {
  search.value = String(route.query.search || '').trim();
  await load();
});
</script>

<template>
  <div class="animate-in">
    <div class="page-header">
      <div class="page-header-info">
        <div class="page-header-icon"><i class="fa-solid fa-user-shield"></i></div>
        <div>
          <h1 class="page-title">مدیریت ادمین ها</h1>
          <p class="page-subtitle">افزودن، ویرایش و حذف مدیران سامانه</p>
        </div>
      </div>
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input v-model="search" class="form-control search-input" placeholder="جستجو در نام، موبایل یا ایمیل" @keyup.enter="applyFilters" />
      </div>
    </div>

    <!-- Form Card -->
    <div class="card card-body mb-3">
      <div class="row g-3">
        <div class="col-md-3">
          <label class="form-label form-label-required"><i class="fa-solid fa-user me-1"></i> نام</label>
          <input v-model="form.name" class="form-control" placeholder="نام ادمین" />
        </div>
        <div class="col-md-3">
          <label class="form-label form-label-required"><i class="fa-solid fa-phone me-1"></i> شماره همراه</label>
          <input v-model="form.phone" class="form-control" placeholder="09xxxxxxxxx" dir="ltr" />
        </div>
        <div class="col-md-3">
          <label class="form-label form-label-optional"><i class="fa-solid fa-envelope me-1"></i> ایمیل</label>
          <input v-model="form.email" class="form-control" placeholder="ایمیل (اختیاری)" dir="ltr" />
        </div>
        <div class="col-md-3">
          <label class="form-label">
            <i class="fa-solid fa-lock me-1"></i>
            رمز عبور
            <span v-if="form.id" class="form-label-note">(اختیاری - خالی = بدون تغییر)</span>
            <span v-else class="text-danger">*</span>
          </label>
          <input v-model="form.password" class="form-control" type="password" :placeholder="form.id ? 'خالی بگذارید تا تغییر نکند' : 'رمز عبور'" dir="ltr" />
        </div>
        <div class="col-12 d-flex gap-2">
          <button class="btn btn-primary" :disabled="saving" @click="submit">
            <i class="fa-solid fa-floppy-disk me-1"></i>
            {{ saving ? 'ذخیره...' : form.id ? 'بروزرسانی' : 'افزودن ادمین' }}
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
        <p>ادمینی ثبت نشده</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table table-striped align-middle mb-0">
          <thead>
            <tr>
              <th>نام</th>
              <th>شماره همراه</th>
              <th>ایمیل</th>
              <th>موجودی کیف پول</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td class="fw-bold">{{ item.name || '-' }}</td>
              <td>{{ item.phone }}</td>
              <td>{{ item.email || '-' }}</td>
              <td class="fw-semibold">{{ formatMoney(item.walletBalance) }}</td>
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

<style scoped src="./styles/AdminsView.css"></style>
