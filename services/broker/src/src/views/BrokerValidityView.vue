<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  createBrokerWalletCharge,
  getBrokerWalletOverview,
  verifyBrokerWalletCharge
} from '../services/broker-wallet.api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const verifying = ref(false);
const submitLoading = ref(false);
const wallet = ref(null);
const transactions = ref([]);
const quickAmounts = ref([500000, 1000000, 5000000, 10000000]);
const amount = ref(500000);

const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;
const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');
const typeClass = (type) => (type === 'deposit' ? 'text-success' : 'text-danger');

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
                  v-model="amount"
                  type="number"
                  class="form-control form-control-lg"
                  min="500000"
                  step="1000"
                  placeholder="مبلغ موردنظر را وارد کنید"
                />
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
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in transactions" :key="item.id">
                <td>{{ index + 1 }}</td>
                <td :class="typeClass(item.type)">{{ item.typeLabel }}</td>
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

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface-color);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: var(--panel-shadow);
}

.page-header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--chip-bg);
  color: var(--brand-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.page-header-title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
}

.page-header-desc {
  font-size: 13px;
  color: var(--muted-text);
  margin: 2px 0 0;
}

.content-card,
.summary-card {
  background: var(--surface-color);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 22px;
  box-shadow: var(--panel-shadow);
  position: relative;
}

.summary-card {
  background: linear-gradient(160deg, rgba(219, 0, 0, 0.08), rgba(138, 0, 0, 0.02));
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.summary-icon {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(219, 0, 0, 0.12);
  color: var(--brand-primary);
  font-size: 22px;
  margin-bottom: 16px;
}

.summary-label {
  font-size: 13px;
  color: var(--muted-text);
  margin-bottom: 6px;
}

.summary-value {
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 800;
  margin: 0 0 10px;
}

.summary-desc {
  font-size: 13px;
  color: var(--muted-text);
  margin: 0;
  line-height: 1.9;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.card-section-title {
  font-size: 16px;
  font-weight: 700;
}

.section-subtitle {
  color: var(--muted-text);
  font-size: 13px;
}

.wallet-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(219, 0, 0, 0.08);
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 700;
}

.pay-btn {
  min-width: 220px;
}

.quick-amounts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.quick-amount-btn {
  border: 1px solid var(--panel-border);
  background: var(--surface-soft);
  color: var(--brand-text);
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.quick-amount-btn:hover,
.quick-amount-btn.active {
  border-color: var(--brand-primary);
  background: rgba(219, 0, 0, 0.08);
  color: var(--brand-primary);
}

.quick-note {
  font-size: 13px;
  color: var(--muted-text);
  line-height: 1.9;
}

.history-table th {
  font-size: 12px;
  color: var(--muted-text);
  font-weight: 700;
  white-space: nowrap;
}

.history-table td {
  white-space: nowrap;
  vertical-align: middle;
}

.empty-state {
  text-align: center;
  padding: 42px 16px;
  color: var(--muted-text);
}

.empty-state i {
  display: block;
  font-size: 38px;
  opacity: 0.35;
  margin-bottom: 12px;
}

.compact-empty {
  padding-block: 48px;
}

@media (max-width: 767px) {
  .content-card,
  .summary-card {
    padding: 18px;
  }

  .pay-btn {
    width: 100%;
  }
}
</style>