<script setup>
import { onMounted, ref } from 'vue';
import AppPagination from '../components/AppPagination.vue';
import { getInvoiceTransactions, getWalletTransactions } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();
const activeTab = ref('invoices');

const invoiceItems = ref([]);
const invoiceLoading = ref(false);
const invoicePage = ref(1);
const invoiceLimit = ref(10);
const invoiceTotal = ref(0);
const invoiceFilters = ref({ search: '', status: '', holderType: '' });

const walletItems = ref([]);
const walletLoading = ref(false);
const walletPage = ref(1);
const walletLimit = ref(10);
const walletTotal = ref(0);
const walletFilters = ref({ search: '', type: '', holderType: '', confirmed: '' });

const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;
const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');
const formatNumber = (value) => new Intl.NumberFormat('fa-IR').format(Number(value || 0));

const setActiveTab = (tab) => {
  activeTab.value = tab;
};

const buildInvoiceQuery = () => {
  const params = new URLSearchParams({
    page: String(invoicePage.value),
    limit: String(invoiceLimit.value)
  });

  if (invoiceFilters.value.search.trim()) {
    params.set('search', invoiceFilters.value.search.trim());
  }

  if (invoiceFilters.value.status) {
    params.set('status', invoiceFilters.value.status);
  }

  if (invoiceFilters.value.holderType) {
    params.set('holderType', invoiceFilters.value.holderType);
  }

  return `?${params.toString()}`;
};

const buildWalletQuery = () => {
  const params = new URLSearchParams({
    page: String(walletPage.value),
    limit: String(walletLimit.value)
  });

  if (walletFilters.value.search.trim()) {
    params.set('search', walletFilters.value.search.trim());
  }

  if (walletFilters.value.type) {
    params.set('type', walletFilters.value.type);
  }

  if (walletFilters.value.holderType) {
    params.set('holderType', walletFilters.value.holderType);
  }

  if (walletFilters.value.confirmed) {
    params.set('confirmed', walletFilters.value.confirmed);
  }

  return `?${params.toString()}`;
};

const loadInvoices = async () => {
  invoiceLoading.value = true;

  try {
    const data = await getInvoiceTransactions(buildInvoiceQuery());
    invoiceItems.value = data.items || [];
    invoicePage.value = Number(data.page || 1);
    invoiceLimit.value = Number(data.limit || 10);
    invoiceTotal.value = Number(data.total || 0);
  } catch (error) {
    toast.error(error.message);
  } finally {
    invoiceLoading.value = false;
  }
};

const loadWalletTransactions = async () => {
  walletLoading.value = true;

  try {
    const data = await getWalletTransactions(buildWalletQuery());
    walletItems.value = data.items || [];
    walletPage.value = Number(data.page || 1);
    walletLimit.value = Number(data.limit || 10);
    walletTotal.value = Number(data.total || 0);
  } catch (error) {
    toast.error(error.message);
  } finally {
    walletLoading.value = false;
  }
};

const applyInvoiceFilters = async () => {
  invoicePage.value = 1;
  await loadInvoices();
};

const resetInvoiceFilters = async () => {
  invoiceFilters.value = { search: '', status: '', holderType: '' };
  invoicePage.value = 1;
  await loadInvoices();
};

const applyWalletFilters = async () => {
  walletPage.value = 1;
  await loadWalletTransactions();
};

const resetWalletFilters = async () => {
  walletFilters.value = { search: '', type: '', holderType: '', confirmed: '' };
  walletPage.value = 1;
  await loadWalletTransactions();
};

const changeInvoicePage = async (page) => {
  invoicePage.value = page;
  await loadInvoices();
};

const changeWalletPage = async (page) => {
  walletPage.value = page;
  await loadWalletTransactions();
};

onMounted(async () => {
  await Promise.all([loadInvoices(), loadWalletTransactions()]);
});
</script>

<template>
  <div class="animate-in transaction-page">
    <section class="page-header mb-3">
      <div class="page-header-info">
        <div class="page-header-icon"><i class="fa-solid fa-money-bill-transfer"></i></div>
        <div>
          <h1 class="page-title">تراکنش های سامانه</h1>
          <p class="page-subtitle">تمام فاکتورهای پرداخت و تراکنش‌های کیف پول را از یکجا مدیریت و بررسی کنید.</p>
        </div>
      </div>
      <div class="transaction-stats">
        <div class="stat-chip">
          <span>کل فاکتورها</span>
          <strong>{{ formatNumber(invoiceTotal) }}</strong>
        </div>
        <div class="stat-chip stat-chip-green">
          <span>کل تراکنش های کیف پول</span>
          <strong>{{ formatNumber(walletTotal) }}</strong>
        </div>
      </div>
    </section>

    <section class="tabs-shell mb-3">
      <button
        type="button"
        class="transaction-tab"
        :class="{ active: activeTab === 'invoices' }"
        @click="setActiveTab('invoices')"
      >
        <span class="transaction-tab-icon"><i class="fa-solid fa-file-invoice-dollar"></i></span>
        <span class="transaction-tab-copy">
          <strong>تراکنش های invoice</strong>
          <small>{{ formatNumber(invoiceTotal) }} رکورد</small>
        </span>
      </button>
      <button
        type="button"
        class="transaction-tab"
        :class="{ active: activeTab === 'wallets' }"
        @click="setActiveTab('wallets')"
      >
        <span class="transaction-tab-icon"><i class="fa-solid fa-wallet"></i></span>
        <span class="transaction-tab-copy">
          <strong>تراکنش های کیف پول</strong>
          <small>{{ formatNumber(walletTotal) }} رکورد</small>
        </span>
      </button>
    </section>

    <transition name="tab-panel" mode="out-in">
      <section v-if="activeTab === 'invoices'" key="invoices" class="card transaction-card panel-spotlight">
        <div class="section-head">
          <div>
            <h2 class="section-title">فاکتورهای پرداخت</h2>
            <p class="section-subtitle">فهرست invoiceهای ایجاد شده در درگاه پرداخت</p>
          </div>
        </div>

        <div class="filter-grid mb-3">
          <div>
            <label class="filter-label">جستجو</label>
            <input v-model="invoiceFilters.search" class="form-control" placeholder="نام، موبایل، کد ملی، شناسه پرداخت" @keyup.enter="applyInvoiceFilters" />
          </div>
          <div>
            <label class="filter-label">وضعیت</label>
            <select v-model="invoiceFilters.status" class="form-select" @change="applyInvoiceFilters">
              <option value="">همه</option>
              <option value="pending">در انتظار پرداخت</option>
              <option value="paid">پرداخت شده</option>
              <option value="error">ناموفق</option>
            </select>
          </div>
          <div>
            <label class="filter-label">پرداخت کننده</label>
            <select v-model="invoiceFilters.holderType" class="form-select" @change="applyInvoiceFilters">
              <option value="">همه</option>
              <option value="broker">کارگزار</option>
              <option value="customer">مشتری</option>
              <option value="admin">ادمین</option>
            </select>
          </div>
          <div class="filter-actions">
            <button class="btn btn-primary" :disabled="invoiceLoading" @click="applyInvoiceFilters">
              <i class="fa-solid fa-magnifying-glass me-1"></i> اعمال
            </button>
            <button class="btn btn-outline-secondary" @click="resetInvoiceFilters">
              <i class="fa-solid fa-rotate-left me-1"></i> پاکسازی
            </button>
          </div>
        </div>

        <div v-if="invoiceLoading" class="spinner-overlay">
          <i class="fa-solid fa-spinner"></i>
          <span>در حال بارگذاری فاکتورها...</span>
        </div>
        <div v-else-if="!invoiceItems.length" class="empty-state">
          <i class="fa-solid fa-file-invoice-dollar"></i>
          <p>فاکتوری یافت نشد</p>
        </div>
        <div v-else class="table-responsive">
          <table class="table table-striped align-middle mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>پرداخت کننده</th>
                <th>نوع</th>
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th>Authority</th>
                <th>Ref</th>
                <th>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in invoiceItems" :key="item.id">
                <td class="fw-semibold">{{ formatNumber(item.id) }}</td>
                <td>
                  <div class="holder-cell-title">{{ item.payerName }}</div>
                  <div class="holder-cell-meta">{{ item.payerPhone }}</div>
                  <div class="holder-cell-meta">{{ item.payerNationalCode }}</div>
                </td>
                <td>
                  <span class="type-chip type-chip-blue">{{ item.userModelLabel }}</span>
                  <div class="holder-cell-meta mt-1">{{ item.subjectLabel || '-' }}</div>
                  <div class="holder-cell-meta">{{ item.driverLabel }}</div>
                </td>
                <td>
                  <div class="fw-semibold">{{ formatMoney(item.totalAmount) }}</div>
                  <div class="holder-cell-meta">اصل: {{ formatMoney(item.amount) }}</div>
                </td>
                <td>
                  <span class="status-pill" :class="`status-${item.status}`">{{ item.statusLabel }}</span>
                </td>
                <td class="mono-cell">{{ item.transactionId || '-' }}</td>
                <td class="mono-cell">{{ item.paymentRef || '-' }}</td>
                <td>{{ formatDate(item.paidAt || item.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <AppPagination :page="invoicePage" :limit="invoiceLimit" :total="invoiceTotal" :disabled="invoiceLoading" @change="changeInvoicePage" />
      </section>

      <section v-else key="wallets" class="card transaction-card panel-spotlight">
        <div class="section-head">
          <div>
            <h2 class="section-title">تراکنش های کیف پول</h2>
            <p class="section-subtitle">واریزها و برداشت‌های ثبت شده روی walletها</p>
          </div>
        </div>

        <div class="filter-grid filter-grid-wallet mb-3">
          <div>
            <label class="filter-label">جستجو</label>
            <input v-model="walletFilters.search" class="form-control" placeholder="نام، موبایل، کد ملی، UUID، مبلغ" @keyup.enter="applyWalletFilters" />
          </div>
          <div>
            <label class="filter-label">نوع تراکنش</label>
            <select v-model="walletFilters.type" class="form-select" @change="applyWalletFilters">
              <option value="">همه</option>
              <option value="deposit">واریز</option>
              <option value="withdraw">برداشت</option>
            </select>
          </div>
          <div>
            <label class="filter-label">دارنده</label>
            <select v-model="walletFilters.holderType" class="form-select" @change="applyWalletFilters">
              <option value="">همه</option>
              <option value="broker">کارگزار</option>
              <option value="customer">مشتری</option>
              <option value="admin">ادمین</option>
            </select>
          </div>
          <div>
            <label class="filter-label">تایید</label>
            <select v-model="walletFilters.confirmed" class="form-select" @change="applyWalletFilters">
              <option value="">همه</option>
              <option value="1">تایید شده</option>
              <option value="0">تایید نشده</option>
            </select>
          </div>
          <div class="filter-actions">
            <button class="btn btn-primary" :disabled="walletLoading" @click="applyWalletFilters">
              <i class="fa-solid fa-magnifying-glass me-1"></i> اعمال
            </button>
            <button class="btn btn-outline-secondary" @click="resetWalletFilters">
              <i class="fa-solid fa-rotate-left me-1"></i> پاکسازی
            </button>
          </div>
        </div>

        <div v-if="walletLoading" class="spinner-overlay">
          <i class="fa-solid fa-spinner"></i>
          <span>در حال بارگذاری تراکنش‌ها...</span>
        </div>
        <div v-else-if="!walletItems.length" class="empty-state">
          <i class="fa-solid fa-wallet"></i>
          <p>تراکنشی ثبت نشده است</p>
        </div>
        <div v-else class="table-responsive">
          <table class="table table-striped align-middle mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>دارنده</th>
                <th>نوع</th>
                <th>موضوع</th>
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th>فاکتور مرتبط</th>
                <th>پرداخت کننده</th>
                <th>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in walletItems" :key="item.id">
                <td class="fw-semibold">{{ formatNumber(item.id) }}</td>
                <td>
                  <div class="holder-cell-title">{{ item.holderName }}</div>
                  <div class="holder-cell-meta">{{ item.holderPhone }}</div>
                  <div class="holder-cell-meta">{{ item.holderTypeLabel }}</div>
                </td>
                <td>
                  <span class="type-chip" :class="item.type === 'deposit' ? 'type-chip-green' : 'type-chip-red'">{{ item.typeLabel }}</span>
                </td>
                <td>{{ item.subjectLabel || '-' }}</td>
                <td class="fw-semibold">{{ formatMoney(item.amount) }}</td>
                <td>
                  <span class="status-pill" :class="item.confirmed ? 'status-paid' : 'status-pending'">
                    {{ item.confirmed ? 'تایید شده' : 'در انتظار تایید' }}
                  </span>
                </td>
                <td>
                  <div class="holder-cell-title">{{ item.invoiceId ? `#${formatNumber(item.invoiceId)}` : '-' }}</div>
                  <div class="holder-cell-meta">{{ item.invoiceTransactionId || '-' }}</div>
                  <div class="holder-cell-meta">{{ item.invoicePaymentRef || '-' }}</div>
                </td>
                <td>
                  <div class="holder-cell-title">{{ item.invoicePayerName || '-' }}</div>
                  <div class="holder-cell-meta">{{ item.invoiceUserModelLabel || '-' }}</div>
                  <div class="holder-cell-meta">{{ item.invoicePayerPhone || '-' }}</div>
                </td>
                <td>{{ formatDate(item.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <AppPagination :page="walletPage" :limit="walletLimit" :total="walletTotal" :disabled="walletLoading" @change="changeWalletPage" />
      </section>
    </transition>
  </div>
</template>

<style scoped src="./styles/TransactionsView.css"></style>