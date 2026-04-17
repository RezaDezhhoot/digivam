<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppPagination from '../components/AppPagination.vue';
import RecipientNotificationsPanel from '../components/RecipientNotificationsPanel.vue';
import { deleteBroker, getBrokers, updateBrokerLevel, updateBrokerSuspension, adminBrokerWalletDeposit, adminBrokerWalletWithdraw } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';
import { useConfirm } from '../composables/useConfirm.js';
import { extractRawAmountInput, formatAmountInWords, formatAmountInputDisplay } from '../../../../web/src/src/utils/amount.js';

const toast = useAppToast();
const { confirm } = useConfirm();
const route = useRoute();

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

const toggleSuspension = async (item) => {
  const isSuspended = Boolean(item.isSuspended);

  if (isSuspended) {
    const ok = await confirm({ title: 'رفع تعلیق کارگزار', text: 'آیا از رفع تعلیق این کارگزار مطمئن هستید؟' });
    if (!ok) return;

    try {
      await updateBrokerSuspension(item.id, { isSuspended: false, suspendReason: '' });
      toast.success('تعلیق کارگزار برداشته شد');
      await load();
    } catch (error) {
      toast.error(error.message);
    }

    return;
  }

  const reason = window.prompt('علت تعلیق کارگزار را وارد کنید');
  if (reason === null) {
    return;
  }

  if (!reason.trim()) {
    toast.error('ثبت علت تعلیق الزامی است');
    return;
  }

  try {
    await updateBrokerSuspension(item.id, { isSuspended: true, suspendReason: reason.trim() });
    toast.success('حساب کارگزار معلق شد');
    await load();
  } catch (error) {
    toast.error(error.message);
  }
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

const walletTarget = ref(null);
const walletOp = ref('deposit');
const walletAmount = ref('');
const walletDescription = ref('');
const walletSaving = ref(false);

const openWalletModal = (item, op) => {
  walletTarget.value = item;
  walletOp.value = op;
  walletAmount.value = '';
  walletDescription.value = '';
};

const closeWalletModal = () => {
  walletTarget.value = null;
  walletAmount.value = '';
  walletDescription.value = '';
};

const submitWalletOp = async () => {
  const amount = Number(walletAmount.value);
  if (!amount || amount < 1) {
    toast.error('مبلغ معتبر وارد کنید');
    return;
  }
  walletSaving.value = true;
  try {
    const payload = { amount, description: walletDescription.value.trim() || undefined };
    const fn = walletOp.value === 'deposit' ? adminBrokerWalletDeposit : adminBrokerWalletWithdraw;
    const data = await fn(walletTarget.value.id, payload);
    toast.success(data.message || 'عملیات انجام شد');
    closeWalletModal();
    await load();
  } catch (error) {
    toast.error(error.message);
  } finally {
    walletSaving.value = false;
  }
};

const levelBadge = (level) => {
  const map = { 1: { label: 'سطح ۱', cls: 'badge-level-1' }, 2: { label: 'سطح ۲', cls: 'badge-level-2' }, 3: { label: 'سطح ۳', cls: 'badge-level-3' } };
  return map[level] || map[1];
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
              <th>وضعیت حساب</th>
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
                <div class="account-state-cell">
                  <span class="account-state-badge" :class="item.isSuspended ? 'is-suspended' : 'is-active'">
                    {{ item.isSuspended ? 'معلق' : 'فعال' }}
                  </span>
                  <p v-if="item.isSuspended && item.suspendReason" class="account-state-reason">{{ item.suspendReason }}</p>
                </div>
              </td>
              <td>
                <div class="d-flex gap-2 flex-wrap">
                  <button class="btn btn-sm btn-outline-success" @click="openWalletModal(item, 'deposit')">
                    <i class="fa-solid fa-plus me-1"></i> واریز
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="openWalletModal(item, 'withdraw')">
                    <i class="fa-solid fa-minus me-1"></i> برداشت
                  </button>
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
      recipient-type="broker"
      :recipient="notificationTarget"
      @close="notificationTarget = null"
    />

    <!-- Wallet Operation Modal -->
    <teleport to="body">
      <div v-if="walletTarget" class="wallet-modal-backdrop" @click.self="closeWalletModal">
        <div class="modal d-block" tabindex="-1" @click.self="closeWalletModal">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">
                  <i :class="walletOp === 'deposit' ? 'fa-solid fa-plus text-success' : 'fa-solid fa-minus text-danger'" class="me-2"></i>
                  {{ walletOp === 'deposit' ? 'واریز به کیف پول' : 'برداشت از کیف پول' }}
                </h5>
                <button type="button" class="btn-close" @click="closeWalletModal"></button>
              </div>
              <div class="modal-body">
                <p class="mb-3">
                  <strong>{{ walletTarget.name || '-' }}</strong> — {{ walletTarget.phone || '-' }}
                  <br /><small class="text-muted">موجودی فعلی: {{ formatMoney(walletTarget.walletBalance) }}</small>
                </p>
                <div class="mb-3">
                  <label class="form-label">مبلغ (تومان)</label>
                  <input :value="formatAmountInputDisplay(walletAmount)" type="text" class="form-control" inputmode="numeric" dir="ltr" placeholder="مبلغ را وارد کنید" @input="walletAmount = extractRawAmountInput($event.target.value)" />
                  <small v-if="Number(walletAmount) > 0" class="text-muted d-block mt-1">{{ formatAmountInWords(walletAmount) }}</small>
                </div>
                <div class="mb-3">
                  <label class="form-label">توضیحات (اختیاری)</label>
                  <textarea v-model="walletDescription" class="form-control" rows="2" maxlength="500" placeholder="توضیح کوتاه..."></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" @click="closeWalletModal">انصراف</button>
                <button type="button" class="btn" :class="walletOp === 'deposit' ? 'btn-success' : 'btn-danger'" :disabled="walletSaving" @click="submitWalletOp">
                  <i v-if="walletSaving" class="fa-solid fa-spinner fa-spin me-1"></i>
                  {{ walletOp === 'deposit' ? 'واریز' : 'برداشت' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped src="./styles/LoanApprovalsView.css"></style>
