<script setup>
import { onMounted, ref } from 'vue';
import AppPagination from '../components/AppPagination.vue';
import { getWithdrawals, updateWithdrawal } from '../services/admin-api.js';
import { useAppToast } from '../composables/useToast.js';

const toast = useAppToast();

const items = ref([]);
const loading = ref(false);
const page = ref(1);
const limit = ref(15);
const total = ref(0);
const statusFilter = ref('');
const searchFilter = ref('');

const selectedItem = ref(null);
const editStatus = ref('');
const editMessage = ref('');
const editFile = ref(null);
const saving = ref(false);

const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;
const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');

const statusOptions = [
  { value: '', label: 'همه' },
  { value: 'pending', label: 'در انتظار' },
  { value: 'done', label: 'انجام شده' },
  { value: 'failed', label: 'رد شده' }
];

const statusClass = (status) => {
  if (status === 'done') return 'badge bg-success';
  if (status === 'failed') return 'badge bg-danger';
  return 'badge bg-warning text-dark';
};

const buildQuery = () => {
  const params = new URLSearchParams({ page: String(page.value), limit: String(limit.value) });
  if (statusFilter.value) params.set('status', statusFilter.value);
  if (searchFilter.value.trim()) params.set('search', searchFilter.value.trim());
  return `?${params.toString()}`;
};

const loadItems = async () => {
  loading.value = true;
  try {
    const data = await getWithdrawals(buildQuery());
    items.value = data.items || [];
    total.value = data.total || 0;
    page.value = data.page || 1;
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.value = false;
  }
};

const openEdit = (item) => {
  selectedItem.value = item;
  editStatus.value = item.status;
  editMessage.value = item.adminMessage || '';
  editFile.value = null;
};

const closeEdit = () => {
  selectedItem.value = null;
  editStatus.value = '';
  editMessage.value = '';
  editFile.value = null;
};

const handleFileChange = (event) => {
  editFile.value = event.target.files[0] || null;
};

const submitUpdate = async () => {
  if (!selectedItem.value) return;
  saving.value = true;
  try {
    const formData = new FormData();
    formData.append('status', editStatus.value);
    if (editMessage.value.trim()) formData.append('adminMessage', editMessage.value.trim());
    if (editFile.value) formData.append('adminFile', editFile.value);

    const data = await updateWithdrawal(selectedItem.value.id, formData);
    toast.success(data.message || 'درخواست به‌روزرسانی شد');
    closeEdit();
    await loadItems();
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.value = false;
  }
};

const handlePageChange = (newPage) => {
  page.value = newPage;
  loadItems();
};

const handleFilter = () => {
  page.value = 1;
  loadItems();
};

onMounted(loadItems);
</script>

<template>
  <section class="animate-in">
    <div class="page-header mb-3">
      <h1 class="page-header-title"><i class="fa-solid fa-money-check-dollar me-2"></i>درخواست‌های برداشت</h1>
    </div>

    <div class="content-card mb-3">
      <div class="row g-2 align-items-end">
        <div class="col-12 col-md-4">
          <label class="form-label">جست‌وجو (نام/شماره کارگزار)</label>
          <input v-model="searchFilter" type="text" class="form-control" placeholder="جست‌وجو..." @keyup.enter="handleFilter" />
        </div>
        <div class="col-12 col-md-3">
          <label class="form-label">وضعیت</label>
          <select v-model="statusFilter" class="form-select" @change="handleFilter">
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="col-12 col-md-2">
          <button class="btn btn-primary w-100" @click="handleFilter">
            <i class="fa-solid fa-filter me-1"></i>فیلتر
          </button>
        </div>
      </div>
    </div>

    <div class="content-card">
      <div v-if="loading" class="text-center py-4">
        <i class="fa-solid fa-spinner fa-spin"></i> در حال بارگذاری...
      </div>

      <div v-else-if="!items.length" class="text-center text-muted py-4">
        درخواست برداشتی یافت نشد.
      </div>

      <template v-else>
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>کارگزار</th>
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th>پیام</th>
                <th>فایل</th>
                <th>تاریخ ثبت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td>{{ item.id }}</td>
                <td>
                  <strong>{{ item.brokerName || '-' }}</strong>
                  <br /><small class="text-muted">{{ item.brokerPhone || '' }}</small>
                </td>
                <td>{{ formatMoney(item.amount) }}</td>
                <td><span :class="statusClass(item.status)">{{ item.statusLabel }}</span></td>
                <td>{{ item.adminMessage || '-' }}</td>
                <td>
                  <a v-if="item.adminFileUrl" :href="item.adminFileUrl" target="_blank" class="btn btn-sm btn-outline-secondary">
                    <i class="fa-solid fa-paperclip me-1"></i>مشاهده
                  </a>
                  <span v-else>-</span>
                </td>
                <td>{{ formatDate(item.createdAt) }}</td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" @click="openEdit(item)">
                    <i class="fa-solid fa-pen me-1"></i>ویرایش
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <AppPagination :current-page="page" :total="total" :limit="limit" @change="handlePageChange" />
      </template>
    </div>

    <Teleport to="body">
      <Transition name="wd-modal">
        <div v-if="selectedItem" class="withdrawal-modal-backdrop" @click.self="closeEdit">
          <div class="wd-modal" role="dialog" aria-modal="true">
            <div class="wd-modal-header">
              <div>
                <span class="wd-modal-kicker">مدیریت درخواست برداشت</span>
                <h2>درخواست #{{ selectedItem.id }}</h2>
              </div>
              <button type="button" class="wd-modal-close" @click="closeEdit"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div class="wd-modal-body">
              <!-- Broker Info Section -->
              <div class="wd-section">
                <div class="wd-section-title"><i class="fa-solid fa-user-tie"></i><span>اطلاعات کارگزار</span></div>
                <div class="wd-info-grid">
                  <div class="wd-info-card wd-info-card--wide">
                    <i class="fa-solid fa-user"></i>
                    <div>
                      <span>نام کارگزار</span>
                      <strong>{{ selectedItem.brokerName || '-' }}</strong>
                    </div>
                  </div>
                  <div class="wd-info-card">
                    <i class="fa-solid fa-phone"></i>
                    <div>
                      <span>شماره تماس</span>
                      <strong class="dir-ltr">{{ selectedItem.brokerPhone || '-' }}</strong>
                    </div>
                  </div>
                  <div v-if="selectedItem.brokerNationalCode" class="wd-info-card">
                    <i class="fa-solid fa-id-card"></i>
                    <div>
                      <span>کد ملی</span>
                      <strong>{{ selectedItem.brokerNationalCode }}</strong>
                    </div>
                  </div>
                  <div v-if="selectedItem.brokerBirthdate" class="wd-info-card">
                    <i class="fa-solid fa-calendar"></i>
                    <div>
                      <span>تاریخ تولد</span>
                      <strong>{{ selectedItem.brokerBirthdate }}</strong>
                    </div>
                  </div>
                  <div v-if="selectedItem.brokerSheba" class="wd-info-card wd-info-card--wide">
                    <i class="fa-solid fa-building-columns"></i>
                    <div>
                      <span>شماره شبا</span>
                      <strong class="dir-ltr">{{ selectedItem.brokerSheba }}</strong>
                    </div>
                  </div>
                  <div v-if="selectedItem.brokerPostalCode" class="wd-info-card">
                    <i class="fa-solid fa-envelope"></i>
                    <div>
                      <span>کد پستی</span>
                      <strong>{{ selectedItem.brokerPostalCode }}</strong>
                    </div>
                  </div>
                  <div v-if="selectedItem.brokerAddress" class="wd-info-card wd-info-card--wide">
                    <i class="fa-solid fa-location-dot"></i>
                    <div>
                      <span>آدرس</span>
                      <strong>{{ selectedItem.brokerAddress }}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Amount Section -->
              <div class="wd-amount-box">
                <div class="wd-amount-icon"><i class="fa-solid fa-coins"></i></div>
                <div>
                  <span>مبلغ درخواست</span>
                  <strong>{{ formatMoney(selectedItem.amount) }}</strong>
                </div>
                <span class="wd-amount-date"><i class="fa-regular fa-calendar me-1"></i>{{ formatDate(selectedItem.createdAt) }}</span>
              </div>

              <!-- Edit Section -->
              <div class="wd-section">
                <div class="wd-section-title"><i class="fa-solid fa-pen-to-square"></i><span>تغییر وضعیت</span></div>
                <div class="wd-form-grid">
                  <div class="wd-form-group">
                    <label class="wd-label">وضعیت <span class="wd-required">*</span></label>
                    <select v-model="editStatus" class="wd-select">
                      <option value="pending">در انتظار</option>
                      <option value="done">انجام شده</option>
                      <option value="failed">رد شده</option>
                    </select>
                  </div>
                  <div class="wd-form-group wd-form-group--full">
                    <label class="wd-label">پیام برای کارگزار</label>
                    <textarea v-model="editMessage" class="wd-textarea" rows="3" maxlength="2000" placeholder="پیام اختیاری برای اطلاع‌رسانی به کارگزار..."></textarea>
                  </div>
                  <div class="wd-form-group wd-form-group--full">
                    <label class="wd-label">فایل ضمیمه</label>
                    <label class="wd-file-upload">
                      <input type="file" @change="handleFileChange" hidden />
                      <i class="fa-solid fa-cloud-arrow-up"></i>
                      <span>{{ editFile ? editFile.name : 'انتخاب فایل' }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="wd-modal-footer">
              <button type="button" class="wd-btn wd-btn--ghost" @click="closeEdit">انصراف</button>
              <button type="button" class="wd-btn wd-btn--primary" :disabled="saving" @click="submitUpdate">
                <i v-if="saving" class="fa-solid fa-spinner fa-spin me-1"></i>
                <i v-else class="fa-solid fa-check me-1"></i>
                {{ saving ? 'در حال ذخیره...' : 'ذخیره تغییرات' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped src="./styles/WithdrawalsView.css"></style>
