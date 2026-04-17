<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppPagination from '../components/AppPagination.vue';
import RecipientNotificationsPanel from '../components/RecipientNotificationsPanel.vue';
import { deleteCustomer, getCustomers, updateCustomerSuspension } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';
import { useConfirm } from '../composables/useConfirm.js';

const toast = useAppToast();
const { confirm } = useConfirm();
const route = useRoute();

const items = ref([]);
const loading = ref(false);
const search = ref('');
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const notificationTarget = ref(null);
const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;

const load = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: String(limit.value) });
    if (search.value.trim()) {
      params.set('search', search.value.trim());
    }
    const query = `?${params.toString()}`;
    const data = await getCustomers(query);
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

const toggleSuspension = async (item) => {
  const isSuspended = Boolean(item.isSuspended);

  if (isSuspended) {
    const ok = await confirm({ title: 'رفع تعلیق مشتری', text: 'آیا از رفع تعلیق این مشتری مطمئن هستید؟' });
    if (!ok) return;

    try {
      await updateCustomerSuspension(item.id, { isSuspended: false, suspendReason: '' });
      toast.success('تعلیق مشتری برداشته شد');
      await load();
    } catch (error) {
      toast.error(error.message);
    }

    return;
  }

  const reason = window.prompt('علت تعلیق مشتری را وارد کنید');
  if (reason === null) {
    return;
  }

  if (!reason.trim()) {
    toast.error('ثبت علت تعلیق الزامی است');
    return;
  }

  try {
    await updateCustomerSuspension(item.id, { isSuspended: true, suspendReason: reason.trim() });
    toast.success('حساب مشتری معلق شد');
    await load();
  } catch (error) {
    toast.error(error.message);
  }
};

const removeItem = async (id) => {
  const ok = await confirm({ title: 'حذف مشتری', text: 'آیا از حذف این مشتری مطمئن هستید؟' });
  if (!ok) return;
  try {
    await deleteCustomer(id);
    toast.success('مشتری حذف شد');
    await load();
  } catch (error) { toast.error(error.message); }
};

const openNotifications = (item) => {
  notificationTarget.value = {
    id: item.id,
    name: item.name || `مشتری #${item.id}`,
    phone: item.phone || '-'
  };
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
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
        <div class="page-header-icon"><i class="fa-solid fa-users"></i></div>
        <div>
          <h1 class="page-title">مدیریت مشتریان</h1>
          <p class="page-subtitle">مشاهده و مدیریت لیست مشتریان سامانه</p>
        </div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input v-model="search" class="form-control search-input" placeholder="جستجو..." @keyup.enter="applyFilters" />
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
        <p>مشتری یافت نشد</p>
      </div>
      <div v-else class="table-responsive">
        <table class="table table-striped align-middle mb-0">
          <thead>
            <tr>
              <th>تصویر</th>
              <th>نام</th>
              <th>شماره همراه</th>
              <th>کد ملی</th>
              <th>موجودی کیف پول</th>
              <th>وضعیت حساب</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>
                <img v-if="item.avatarUrl" :src="item.avatarUrl" class="user-avatar" alt="avatar" />
                <span v-else class="user-avatar-placeholder"><i class="fa-solid fa-user"></i></span>
              </td>
              <td class="fw-bold">{{ item.name || '-' }}</td>
              <td >{{ item.phone }}</td>
              <td >{{ item.nationalCode || '-' }}</td>
              <td class="fw-semibold">{{ formatMoney(item.walletBalance) }}</td>
              <td>
                <div class="account-state-cell">
                  <span class="account-state-badge" :class="item.isSuspended ? 'is-suspended' : 'is-active'">
                    {{ item.isSuspended ? 'معلق' : 'فعال' }}
                  </span>
                  <p v-if="item.isSuspended && item.suspendReason" class="account-state-reason">{{ item.suspendReason }}</p>
                </div>
              </td>
              <td>
                <div class="d-flex gap-2 flex-wrap">
                  <button class="btn btn-sm btn-outline-primary" @click="openNotifications(item)">
                    <i class="fa-solid fa-bell me-1"></i> نوتیفیکیشن
                  </button>
                  <button class="btn btn-sm" :class="item.isSuspended ? 'btn-outline-success' : 'btn-outline-warning'" @click="toggleSuspension(item)">
                    <i :class="item.isSuspended ? 'fa-solid fa-lock-open me-1' : 'fa-solid fa-ban me-1'"></i>
                    {{ item.isSuspended ? 'رفع تعلیق' : 'تعلیق' }}
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

    <RecipientNotificationsPanel
      v-if="notificationTarget"
      recipient-type="customer"
      :recipient="notificationTarget"
      @close="notificationTarget = null"
    />
  </div>
</template>

<style scoped src="./styles/UsersView.css"></style>
