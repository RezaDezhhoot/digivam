<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  createBrokerWalletCharge,
  createBrokerWithdrawal,
  getBrokerWalletOverview,
  getBrokerWithdrawals,
  verifyBrokerWalletCharge
} from '../services/broker-wallet.api.js';
import { useAppToast } from '../composables/useToast.js';
import { extractRawAmountInput, formatAmountInWords, formatAmountInputDisplay } from '../../../../web/src/src/utils/amount.js';

const toast = useAppToast();
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const verifying = ref(false);
const submitLoading = ref(false);
const exportLoading = ref(false);
const wallet = ref(null);
const transactions = ref([]);
const quickAmounts = ref([500000, 1000000, 5000000, 10000000]);
const amount = ref(500000);
const withdrawAmount = ref('');
const withdrawLoading = ref(false);
const withdrawals = ref([]);
const withdrawalsLoading = ref(false);

const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;
const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');
const typeClass = (type) => (type === 'deposit' ? 'text-success' : 'text-danger');

const exportTransactionsToExcel = async () => {
  if (!transactions.value.length) {
    toast.warning('تراکنشی برای خروجی اکسل وجود ندارد');
    return;
  }

  exportLoading.value = true;
  try {
    const XLSX = await import('xlsx');
    const rows = transactions.value.map((item, index) => ({
      'ردیف': index + 1,
      'نوع تراکنش': item.typeLabel || item.type || '-',
      'نوع فنی': item.type || '-',
      'مبلغ': Number(item.amount || 0),
      'وضعیت': item.confirmed ? 'تایید شده' : 'در انتظار تایید',
      'تاریخ': formatDate(item.createdAt)
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Wallet');
    XLSX.writeFile(workbook, `broker-wallet-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('خروجی اکسل اعتبارات آماده شد');
  } catch (error) {
    toast.error(error.message || 'ساخت خروجی اکسل با خطا مواجه شد');
  } finally {
    exportLoading.value = false;
  }
};

const loadOverview = async ({ silent = false } = {}) => {
  if (!silent) {
    loading.value = true;
  }

  try {
    const data = await getBrokerWalletOverview();
    wallet.value = data.wallet;
    transactions.value = data.transactions || [];
    quickAmounts.value = data.quickAmounts?.length ? data.quickAmounts : quickAmounts.value;

    if (!quickAmounts.value.includes(Number(amount.value))) {
      amount.value = quickAmounts.value[0] || 500000;
    }
  } catch (error) {
    toast.error(error.message);
  } finally {
    if (!silent) {
      loading.value = false;
    }
  }
};

const startPayment = async () => {
  submitLoading.value = true;

  try {
    const data = await createBrokerWalletCharge({ amount: Number(amount.value) });
    window.location.assign(data.paymentLink);
  } catch (error) {
    toast.error(error.message);
  } finally {
    submitLoading.value = false;
  }
};

const loadWithdrawals = async () => {
  withdrawalsLoading.value = true;
  try {
    const data = await getBrokerWithdrawals();
    withdrawals.value = data.items || [];
  } catch (error) {
    toast.error(error.message);
  } finally {
    withdrawalsLoading.value = false;
  }
};

const submitWithdrawal = async () => {
  const value = Number(withdrawAmount.value || 0);
  if (!value || value <= 0) {
    toast.warning('مبلغ برداشت را وارد کنید');
    return;
  }

  withdrawLoading.value = true;
  try {
    const data = await createBrokerWithdrawal({ amount: value });
    toast.success(data.message || 'درخواست برداشت ثبت شد');
    wallet.value = data.wallet || wallet.value;
    withdrawAmount.value = '';
    await loadWithdrawals();
  } catch (error) {
    toast.error(error.message);
  } finally {
    withdrawLoading.value = false;
  }
};

const withdrawalStatusClass = (status) => {
  if (status === 'done') return 'text-success';
  if (status === 'failed') return 'text-danger';
  return 'text-warning';
};

const verifyReturn = async () => {
  const Authority = String(route.query.Authority || '').trim();
  const Status = String(route.query.Status || '').trim();

  if (!Authority) {
    return;
  }

  verifying.value = true;

  try {
    const data = await verifyBrokerWalletCharge({ Authority, Status });

    if (data.paid) {
      toast.success(data.message);
    } else {
      toast.warning(data.message);
    }

    await router.replace({ name: 'broker-validity', query: {} });
    await loadOverview({ silent: true });
  } catch (error) {
    toast.error(error.message);
    await router.replace({ name: 'broker-validity', query: {} });
  } finally {
    verifying.value = false;
  }
};

onMounted(async () => {
  await loadOverview();
  await loadWithdrawals();
  await verifyReturn();
});
</script>

<template>
  <section class="animate-in">
    <div class="page-header mb-3">
      <div class="page-header-icon"><i class="fa-solid fa-wallet"></i></div>
      <div>
        <h1 class="page-header-title">اعتبارات</h1>
        <p class="page-header-desc">کیف پول خود را از طریق درگاه پرداخت شارژ کنید و تاریخچه تراکنش‌ها را ببینید.</p>
      </div>
      <button class="btn btn-outline-secondary ms-auto" :disabled="exportLoading || loading" @click="exportTransactionsToExcel">
        <i v-if="exportLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
        <i v-else class="fa-solid fa-file-excel me-1"></i>
        خروجی اکسل
      </button>
    </div>

    <div v-if="loading" class="content-card">
      <div class="spinner-overlay"><i class="fa-solid fa-spinner fa-spin"></i> در حال بارگذاری اطلاعات کیف پول...</div>
    </div>

    <template v-else>
      <div v-if="verifying" class="content-card mb-3">
        <div class="spinner-overlay"><i class="fa-solid fa-spinner fa-spin"></i> در حال تایید پرداخت...</div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-12 col-xl-4">
          <div class="summary-card h-100">
            <div class="summary-icon"><i class="fa-solid fa-sack-dollar"></i></div>
            <p class="summary-label">موجودی کیف پول</p>
            <h2 class="summary-value">{{ formatMoney(wallet?.balance) }}</h2>
            <p class="summary-desc">واحد تمام مبالغ تومان است و پس از تایید موفق درگاه، موجودی بلافاصله به‌روزرسانی می‌شود.</p>
          </div>
        </div>

        <div class="col-12 col-xl-8">
          <div class="content-card h-100">
            <div class="section-head">
              <div>
                <h2 class="card-section-title mb-1">شارژ کیف پول</h2>
                <p class="section-subtitle mb-0">یکی از مبالغ زیر را انتخاب کنید یا مبلغ را مستقیم وارد کنید.</p>
              </div>
              <span class="wallet-chip"><i class="fa-solid fa-shield-heart me-1"></i> اتصال امن به درگاه</span>
            </div>

            <div class="row g-3 mt-1 align-items-end">
              <div class="col-12 col-lg-6">
                <label class="form-label form-label-required">مبلغ شارژ</label>
                <input
                  :value="formatAmountInputDisplay(amount)"
                  type="text"
                  class="form-control form-control-lg"
                  inputmode="numeric"
                  dir="ltr"
                  placeholder="مبلغ موردنظر را وارد کنید"
                  @input="amount = extractRawAmountInput($event.target.value)"
                />
                <small v-if="Number(amount)" class="text-muted d-block mt-1">{{ formatAmountInWords(amount) }}</small>
              </div>
              <div class="col-12 col-lg-6 d-flex justify-content-lg-end">
                <button class="btn btn-primary btn-lg pay-btn" :disabled="submitLoading || verifying" @click="startPayment">
                  <i v-if="submitLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
                  <i v-else class="fa-solid fa-credit-card me-1"></i>
                  پرداخت و شارژ کیف پول
                </button>
              </div>
            </div>

            <div class="quick-amounts mt-3">
              <button
                v-for="value in quickAmounts"
                :key="value"
                type="button"
                class="quick-amount-btn"
                :class="{ active: Number(amount) === Number(value) }"
                @click="amount = value"
              >
                {{ formatMoney(value) }}
              </button>
            </div>

            <p class="quick-note mt-3 mb-0">
              فقط مبالغ از پیش تعریف‌شده برای پرداخت آنلاین فعال هستند. پس از بازگشت از درگاه، تایید پرداخت به‌صورت خودکار انجام می‌شود.
            </p>
          </div>
        </div>
      </div>

      <div class="content-card mb-3">
        <div class="section-head mb-3">
          <div>
            <h2 class="card-section-title mb-1"><i class="fa-solid fa-money-bill-transfer me-1"></i>درخواست برداشت</h2>
            <p class="section-subtitle mb-0">مبلغ موردنظر را وارد کنید. پس از ثبت درخواست مبلغ از کیف پول کسر و درخواست جهت بررسی ارسال می‌شود.</p>
          </div>
        </div>
        <div class="row g-3 align-items-end">
          <div class="col-12 col-lg-6">
            <label class="form-label form-label-required">مبلغ برداشت (تومان)</label>
            <input :value="formatAmountInputDisplay(withdrawAmount)" type="text" class="form-control" inputmode="numeric" dir="ltr" placeholder="حداقل ۱۰۰,۰۰۰ تومان" @input="withdrawAmount = extractRawAmountInput($event.target.value)" />
            <small v-if="Number(withdrawAmount)" class="text-muted d-block mt-1">{{ formatAmountInWords(withdrawAmount) }}</small>
          </div>
          <div class="col-12 col-lg-6">
            <button class="btn btn-warning" :disabled="withdrawLoading" @click="submitWithdrawal">
              <i v-if="withdrawLoading" class="fa-solid fa-spinner fa-spin me-1"></i>
              <i v-else class="fa-solid fa-paper-plane me-1"></i>
              ثبت درخواست برداشت
            </button>
          </div>
        </div>

        <div v-if="withdrawals.length" class="table-responsive mt-3">
          <table class="table align-middle mb-0 history-table">
            <thead>
              <tr>
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th>پیام ادمین</th>
                <th>فایل</th>
                <th>تاریخ ثبت</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in withdrawals" :key="item.id">
                <td>{{ formatMoney(item.amount) }}</td>
                <td :class="withdrawalStatusClass(item.status)">{{ item.statusLabel }}</td>
                <td>{{ item.adminMessage || '-' }}</td>
                <td>
                  <a v-if="item.adminFileUrl" :href="item.adminFileUrl" target="_blank" class="btn btn-sm btn-outline-secondary">
                    <i class="fa-solid fa-paperclip me-1"></i>مشاهده
                  </a>
                  <span v-else>-</span>
                </td>
                <td>{{ formatDate(item.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-muted small mt-2 mb-0">هنوز درخواست برداشتی ثبت نشده است.</p>
      </div>

      <div class="content-card">
        <div class="section-head mb-3">
          <div>
            <h2 class="card-section-title mb-1">تاریخچه تراکنش‌ها</h2>
            <p class="section-subtitle mb-0">آخرین واریزها و برداشت‌های ثبت شده برای کیف پول شما.</p>
          </div>
        </div>

        <div v-if="transactions.length" class="table-responsive">
          <table class="table align-middle mb-0 history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>نوع تراکنش</th>
                <th>موضوع</th>
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in transactions" :key="item.id">
                <td>{{ index + 1 }}</td>
                <td :class="typeClass(item.type)">{{ item.typeLabel }}</td>
                <td>{{ item.subjectLabel || '-' }}</td>
                <td>{{ formatMoney(item.amount) }}</td>
                <td>
                  <span class="status-pill" :class="item.confirmed ? 'status-answered' : 'status-pending'">
                    <i :class="item.confirmed ? 'fa-solid fa-circle-check' : 'fa-solid fa-clock'" class="me-1"></i>
                    {{ item.confirmed ? 'تایید شده' : 'در انتظار تایید' }}
                  </span>
                </td>
                <td>{{ formatDate(item.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="empty-state compact-empty">
          <i class="fa-solid fa-receipt"></i>
          <p>هنوز تراکنشی برای کیف پول شما ثبت نشده است.</p>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped src="./styles/BrokerValidityView.css"></style>