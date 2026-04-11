<script setup>
import { onMounted, ref } from 'vue';
import AppPagination from '../components/AppPagination.vue';
import RecipientNotificationsPanel from '../components/RecipientNotificationsPanel.vue';
import { deleteBroker, getBrokers, updateBrokerLevel } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';
import { useConfirm } from '../composables/useConfirm.js';

const toast = useAppToast();
const { confirm } = useConfirm();

const items = ref([]);
const loading = ref(false);
const verifyLevel = ref('');
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
    if (verifyLevel.value) params.set('verifyLevel', verifyLevel.value);
    if (search.value.trim()) params.set('search', search.value.trim());
    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await getBrokers(query);
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

const changeLevel = async (item, level) => {
  try {
    await updateBrokerLevel(item.id, Number(level));
    toast.success('سطح احراز هویت تغییر کرد');
    await load();
  } catch (error) { toast.error(error.message); }
};

const removeItem = async (id) => {
  const ok = await confirm({ title: 'حذف کارگزار', text: 'آیا از حذف این کارگزار مطمئن هستید؟' });
  if (!ok) return;
  try {
    await deleteBroker(id);
    toast.success('کارگزار حذف شد');
    await load();
  } catch (error) { toast.error(error.message); }
};

const openNotifications = (item) => {
  notificationTarget.value = {
    id: item.id,
    name: item.name || `کارگزار #${item.id}`,
    phone: item.phone || '-'
  };
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
};

const levelBadge = (level) => {
  const map = { 1: { label: 'سطح ۱', cls: 'badge-level-1' }, 2: { label: 'سطح ۲', cls: 'badge-level-2' }, 3: { label: 'سطح ۳', cls: 'badge-level-3' } };
  return map[level] || map[1];
};

onMounted(load);
</script>

<template>
  <div class="animate-in">
    <div class="page-header">
      <div class="page-header-info">
        <div class="page-header-icon"><i class="fa-solid fa-user-tie"></i></div>
        <div>
          <h1 class="page-title">مدیریت کارگزاران</h1>
          <p class="page-subtitle">بررسی، فیلتر و تنظیم سطح احراز هویت</p>
        </div>
      </div>
      <div class="page-header-actions">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input v-model="search" class="form-control search-input" placeholder="جستجو..." @keyup.enter="applyFilters" />
        </div>
        <select v-model="verifyLevel" class="form-select filter-select" @change="applyFilters">
          <option value="">همه سطوح</option>
          <option value="1">سطح ۱</option>
          <option value="2">سطح ۲</option>
          <option value="3">سطح ۳</option>
        </select>
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="spinner-overlay">
        <i class="fa-solid fa-spinner"></i>
        <span>در حال بارگذاری...</span>
      </div>
      <div v-else-if="!items.length" class="empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>کارگزاری یافت نشد</p>
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
              <th>سطح احراز</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>
                <img v-if="item.avatarUrl" :src="item.avatarUrl" class="user-avatar" alt="avatar" />
                <span v-else class="user-avatar-placeholder"><i class="fa-solid fa-user-tie"></i></span>
              </td>
              <td class="fw-bold">{{ item.name || '-' }}</td>
              <td>{{ item.phone }}</td>
              <td >{{ item.nationalCode || '-' }}</td>
              <td class="fw-semibold">{{ formatMoney(item.walletBalance) }}</td>
              <td>
                <select class="form-select form-select-sm level-select" :value="item.verifyLevel" @change="changeLevel(item, $event.target.value)">
                  <option :value="1">سطح ۱</option>
                  <option :value="2">سطح ۲</option>
                  <option :value="3">سطح ۳</option>
                </select>
              </td>
              <td>
                <div class="d-flex gap-2 flex-wrap">
                  <button class="btn btn-sm btn-outline-primary" @click="openNotifications(item)">
                    <i class="fa-solid fa-bell me-1"></i> نوتیفیکیشن
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
      recipient-type="broker"
      :recipient="notificationTarget"
      @close="notificationTarget = null"
    />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.page-header-info {
  display: flex;
  align-items: center;
  gap: 14px;
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

.page-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--admin-muted);
  margin: 2px 0 0;
}

.page-header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--admin-muted);
  font-size: 13px;
}

.search-input {
  padding-right: 36px;
  min-width: 200px;
}

.filter-select {
  min-width: 130px;
}

.level-select {
  min-width: 100px;
  border-radius: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  color: var(--admin-muted);
  gap: 10px;
}

.empty-state i { font-size: 36px; opacity: 0.5; }
.user-avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid var(--admin-border); }
.user-avatar-placeholder { width: 38px; height: 38px; border-radius: 50%; background: var(--admin-surface-soft, #f0f0f0); display: inline-flex; align-items: center; justify-content: center; color: var(--admin-muted); font-size: 14px; border: 2px solid var(--admin-border); }
</style>
