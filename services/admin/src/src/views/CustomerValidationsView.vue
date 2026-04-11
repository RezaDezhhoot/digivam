<script setup>
import { onMounted, ref, watch } from 'vue';
import { useConfirm } from '../composables/useConfirm.js';
import { useAppToast } from '../composables/useToast.js';
import AppPagination from '../components/AppPagination.vue';
import PersianDatePickerInput from '../components/PersianDatePickerInput.vue';
import {
  deleteCustomerValidation,
  getCustomerValidations,
  updateCustomerValidation
} from '../services/admin-api.js';

const { confirm } = useConfirm();
const toast = useAppToast();

const loading = ref(false);
const items = ref([]);
const total = ref(0);
const pages = ref(0);
const page = ref(1);
const limit = ref(10);

const filterStatus = ref('');
const filterSearch = ref('');

const editingItem = ref(null);
const adminAttachmentFile = ref(null);
const editForm = ref({
  status: '',
  result: '',
  expiresAt: '',
  data: null
});
const saving = ref(false);

const statusOptions = [
  { value: '', label: 'همه وضعیت ها' },
  { value: 'submit', label: 'ارسال شده' },
  { value: 'pending', label: 'در انتظار بررسی' },
  { value: 'approved', label: 'تایید شده' },
  { value: 'rejected', label: 'رد شده' },
  { value: 'expired', label: 'منقضی شده' }
];

const deepClone = (value) => JSON.parse(JSON.stringify(value ?? null));

const getItemFieldType = (item) => {
  if (!item || typeof item !== 'object') {
    return '';
  }

  const fieldType = String(item.fieldType || '').trim();
  if (fieldType) {
    return fieldType;
  }

  const rawType = String(item.type || '').trim();
  return rawType && rawType !== 'document' ? rawType : '';
};

const getItemFieldTypeLabel = (item) => {
  const labels = {
    file: 'فایل',
    text: 'متن',
    number: 'عدد',
    date: 'تاریخ'
  };

  return item?.fieldTypeLabel || item?.typeLabel || labels[getItemFieldType(item)] || getItemFieldType(item) || '-';
};

const isDocumentField = (item) => Boolean(item?.documentId);
const isFileField = (item) => getItemFieldType(item) === 'file';

const normalizeEditableData = (data) => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  return deepClone(data);
};

const buildQuery = () => {
  const params = new URLSearchParams();
  params.set('page', String(page.value));
  params.set('limit', String(limit.value));
  if (filterStatus.value) params.set('status', filterStatus.value);
  if (filterSearch.value.trim()) params.set('search', filterSearch.value.trim());
  return `?${params.toString()}`;
};

const load = async () => {
  loading.value = true;
  try {
    const data = await getCustomerValidations(buildQuery());
    items.value = data.items || [];
    total.value = data.total || 0;
    pages.value = data.pages || 0;
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.value = false;
  }
};

const openEdit = (item) => {
  editingItem.value = item;
  adminAttachmentFile.value = null;
  editForm.value = {
    status: item.status,
    result: item.result || '',
    expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 10) : '',
    data: normalizeEditableData(item.data)
  };
};

const closeEdit = () => {
  editingItem.value = null;
  adminAttachmentFile.value = null;
};

const handleAdminAttachmentChange = (event) => {
  adminAttachmentFile.value = event.target.files?.[0] || null;
};

const saveEdit = async () => {
  if (!editingItem.value) return;
  saving.value = true;

  try {
    const payload = new FormData();
    payload.append('status', editForm.value.status);
    payload.append('result', editForm.value.result || '');

    if (editForm.value.expiresAt) {
      payload.append('expiresAt', editForm.value.expiresAt);
    }

    if (editForm.value.data && typeof editForm.value.data === 'object') {
      payload.append('data', JSON.stringify(normalizeEditableData(editForm.value.data)));
    }

    if (adminAttachmentFile.value) {
      payload.append('adminAttachment', adminAttachmentFile.value);
    }

    const response = await updateCustomerValidation(editingItem.value.id, payload);
    toast.success(response.message || 'بروزرسانی شد');
    closeEdit();
    await load();
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (item) => {
  const ok = await confirm('حذف اعتبارسنجی مشتری', `آیا از حذف اعتبارسنجی #${item.id} مطمئن هستید؟`);
  if (!ok) return;

  try {
    await deleteCustomerValidation(item.id);
    toast.success('اعتبارسنجی مشتری حذف شد');
    await load();
  } catch (error) {
    toast.error(error.message);
  }
};

const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;
const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');

const renderDataField = (key, value) => {
  if (value && typeof value === 'object' && value.fileId) {
    return `📎 ${value.fileName || key}`;
  }
  return String(value ?? '-');
};

const getFileUrl = (value) => {
  if (value && typeof value === 'object' && value.url) {
    return value.url;
  }
  return null;
};

const getFileName = (value, fallback = 'فایل') => {
  if (value && typeof value === 'object' && value.fileName) {
    return value.fileName;
  }
  return fallback;
};

watch([filterStatus, filterSearch], () => {
  page.value = 1;
  load();
});

watch(page, load);

onMounted(load);
</script>

<template>
  <section class="cv-view">
    <div class="cv-header">
      <div>
        <h2 class="cv-title">اعتبارسنجی های مشتریان</h2>
        <p class="cv-subtitle">مدیریت ، بررسی و تایید/رد اعتبارسنجی های درخواستی مشتریان</p>
      </div>
    </div>

    <div class="cv-filters">
      <div class="cv-filter-group">
        <label class="form-label">وضعیت</label>
        <select v-model="filterStatus" class="form-select form-select-sm">
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
      <div class="cv-filter-group cv-filter-search">
        <label class="form-label">جستجو</label>
        <input v-model="filterSearch" type="text" class="form-control form-control-sm" placeholder="نام ، موبایل ، کد ملی ...">
      </div>
    </div>

    <div v-if="loading" class="cv-loading">در حال بارگذاری ...</div>

    <div v-else-if="!items.length" class="cv-empty">اعتبارسنجی ای یافت نشد</div>

    <div v-else class="cv-table-wrap">
      <table class="cv-table">
        <thead>
          <tr>
            <th>#</th>
            <th>مشتری</th>
            <th>اعتبارسنجی</th>
            <th>روش</th>
            <th>وضعیت</th>
            <th>هزینه پرداختی</th>
            <th>تاریخ اعتبار</th>
            <th>تاریخ ثبت</th>
            <th>عملیات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.id }}</td>
            <td>
              <div class="cv-customer-cell">
                <strong>{{ item.customer?.name || '-' }}</strong>
                <span>{{ item.customer?.phone || '-' }}</span>
              </div>
            </td>
            <td>{{ item.validation?.title || '-' }}</td>
            <td>
              <span class="cv-method-badge" :class="item.selfValidation ? 'cv-method-self' : 'cv-method-digvam'">
                {{ item.selfValidationLabel || (item.selfValidation ? 'توسط مشتری' : 'توسط دیجی وام') }}
              </span>
            </td>
            <td>
              <span class="cv-status-badge" :style="{ background: item.statusColor + '18', color: item.statusColor }">
                {{ item.statusLabel }}
              </span>
            </td>
            <td>{{ formatMoney(item.paidAmount) }}</td>
            <td>{{ item.expiresAtLabel }}</td>
            <td>{{ item.createdAtLabel }}</td>
            <td>
              <div class="cv-actions">
                <button type="button" class="btn btn-sm btn-outline-primary" @click="openEdit(item)">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" @click="handleDelete(item)">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppPagination
      v-if="pages > 1"
      :current="page"
      :total="pages"
      @change="(p) => (page = p)"
    />

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="editingItem" class="cv-modal-overlay" @click.self="closeEdit">
          <div class="cv-modal-sheet">
            <div class="cv-modal-header">
              <h3>بررسی اعتبارسنجی #{{ editingItem.id }}</h3>
              <button type="button" class="cv-modal-close" @click="closeEdit">×</button>
            </div>

            <div class="cv-modal-body">
              <div class="cv-detail-grid">
                <div class="cv-detail-item">
                  <span>مشتری</span>
                  <strong>{{ editingItem.customer?.name || '-' }}</strong>
                </div>
                <div class="cv-detail-item">
                  <span>موبایل</span>
                  <strong>{{ editingItem.customer?.phone || '-' }}</strong>
                </div>
                <div class="cv-detail-item">
                  <span>کد ملی</span>
                  <strong>{{ editingItem.customer?.nationalCode || '-' }}</strong>
                </div>
                <div class="cv-detail-item">
                  <span>ایمیل</span>
                  <strong>{{ editingItem.customer?.email || '-' }}</strong>
                </div>
                <div class="cv-detail-item">
                  <span>اعتبارسنجی</span>
                  <strong>{{ editingItem.validation?.title || '-' }}</strong>
                </div>
                <div class="cv-detail-item">
                  <span>نوع</span>
                  <strong>{{ editingItem.validation?.type || '-' }}</strong>
                </div>
                <div class="cv-detail-item">
                  <span>هزینه پرداختی</span>
                  <strong>{{ formatMoney(editingItem.paidAmount) }}</strong>
                </div>
                <div class="cv-detail-item">
                  <span>تاریخ ثبت</span>
                  <strong>{{ formatDate(editingItem.createdAt) }}</strong>
                </div>
                <div class="cv-detail-item">
                  <span>روش انجام</span>
                  <strong>
                    <span class="cv-method-badge" :class="editingItem.selfValidation ? 'cv-method-self' : 'cv-method-digvam'">
                      {{ editingItem.selfValidationLabel || (editingItem.selfValidation ? 'توسط مشتری' : 'توسط دیجی وام') }}
                    </span>
                  </strong>
                </div>
                <div v-if="editingItem.selfValidation && editingItem.selfValidationFileUrl" class="cv-detail-item">
                  <span>فایل اعتبارسنجی شخصی</span>
                  <a :href="editingItem.selfValidationFileUrl" target="_blank" rel="noopener noreferrer" class="cv-file-link">
                    <i class="fa-solid fa-paperclip me-1"></i>{{ editingItem.selfValidationFileName || 'مشاهده فایل' }}
                  </a>
                </div>
                <div v-if="editingItem.adminAttachmentUrl" class="cv-detail-item">
                  <span>گزارش نهایی اعتبارسنجی</span>
                  <a :href="editingItem.adminAttachmentUrl" target="_blank" rel="noopener noreferrer" class="cv-file-link">
                    <i class="fa-solid fa-file-arrow-down me-1"></i>{{ editingItem.adminAttachmentFileName || 'دانلود گزارش نهایی' }}
                  </a>
                </div>
              </div>

              <div v-if="editingItem.data && typeof editingItem.data === 'object'" class="cv-submitted-data">
                <h4>اطلاعات ارسال شده توسط مشتری</h4>

                <template v-if="editingItem.data.stages && Array.isArray(editingItem.data.stages)">
                  <div v-for="(stage, si) in editingItem.data.stages" :key="si" class="cv-stage-block">
                    <div class="cv-stage-header">
                      <span class="cv-stage-number">{{ si + 1 }}</span>
                      <strong>{{ stage.title || `مرحله ${si + 1}` }}</strong>
                    </div>
                    <p v-if="stage.description" class="cv-stage-desc">{{ stage.description }}</p>
                    <div class="cv-data-grid">
                      <div v-for="item in (stage.items || [])" :key="item.id || item.title" class="cv-data-item">
                        <span>{{ item.title || '-' }}
                          <small v-if="isDocumentField(item)" class="text-muted">({{ getItemFieldTypeLabel(item) }})</small>
                        </span>
                        <template v-if="isFileField(item) && getFileUrl(item.value)">
                          <a :href="item.value.url" target="_blank" rel="noopener noreferrer" class="cv-file-link">
                            <i class="fa-solid fa-paperclip me-1"></i>{{ getFileName(item.value) }}
                          </a>
                        </template>
                        <template v-else-if="isFileField(item) && typeof item.value === 'number'">
                          <span class="text-muted"><i class="fa-solid fa-file me-1"></i>فایل #{{ item.value }}</span>
                        </template>
                        <strong v-else>{{ item.value ?? '-' }}</strong>
                      </div>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <div class="cv-data-grid">
                    <div v-for="(value, key) in editingItem.data" :key="key" class="cv-data-item">
                      <span>{{ key }}</span>
                      <template v-if="getFileUrl(value)">
                        <a :href="getFileUrl(value)" target="_blank" rel="noopener noreferrer" class="cv-file-link">
                          <i class="fa-solid fa-paperclip me-1"></i>{{ value.fileName || key }}
                        </a>
                      </template>
                      <strong v-else>{{ renderDataField(key, value) }}</strong>
                    </div>
                  </div>
                </template>
              </div>

              <div class="cv-form-section">
                <h4>ویرایش اعتبارسنجی</h4>

                <div class="mb-3">
                  <label class="form-label">وضعیت</label>
                  <select v-model="editForm.status" class="form-select">
                    <option value="submit">ارسال شده</option>
                    <option value="pending">در انتظار بررسی</option>
                    <option value="approved">تایید شده</option>
                    <option value="rejected">رد شده</option>
                    <option value="expired">منقضی شده</option>
                  </select>
                </div>

                <div class="mb-3">
                  <label class="form-label">نتیجه بررسی (پیام مدیر)</label>
                  <textarea v-model="editForm.result" class="form-control" rows="3" placeholder="پیام نتیجه بررسی ..."></textarea>
                </div>

                <div class="mb-3">
                  <label class="form-label">تاریخ اعتبار</label>
                  <PersianDatePickerInput v-model="editForm.expiresAt" placeholder="انتخاب تاریخ اعتبار" />
                  <small class="form-text text-muted">تاریخ به صورت شمسی انتخاب و هنگام ارسال به میلادی تبدیل می شود. در صورت خالی بودن و تایید شدن، از مقدار validFor اعتبارسنجی محاسبه می شود.</small>
                </div>

                <div class="mb-3">
                  <label class="form-label">گزارش نهایی اعتبار سنجی</label>
                  <input type="file" class="form-control" @change="handleAdminAttachmentChange" />
                  <small v-if="adminAttachmentFile" class="form-text text-muted">فایل انتخاب‌شده: {{ adminAttachmentFile.name }}</small>
                  <small v-else-if="editingItem.adminAttachmentUrl" class="form-text text-muted">
                    فایل فعلی:
                    <a :href="editingItem.adminAttachmentUrl" target="_blank" rel="noopener noreferrer" class="cv-file-link inline-link">{{ editingItem.adminAttachmentFileName || 'دانلود گزارش نهایی' }}</a>
                  </small>
                  <small v-else class="form-text text-muted">فایل نهایی بررسی که ادمین برای این اعتبارسنجی ثبت می‌کند.</small>
                </div>

                <div v-if="editForm.data && typeof editForm.data === 'object'" class="cv-edit-section">
                  <label class="form-label">ویرایش اطلاعات ارسالی مشتری</label>

                  <template v-if="editForm.data.stages && Array.isArray(editForm.data.stages)">
                    <div v-for="(stage, stageIndex) in editForm.data.stages" :key="stage.id || stageIndex" class="cv-stage-block cv-stage-block--editable">
                      <div class="cv-stage-header">
                        <span class="cv-stage-number">{{ stageIndex + 1 }}</span>
                        <strong>{{ stage.title || `مرحله ${stageIndex + 1}` }}</strong>
                      </div>
                      <p v-if="stage.description" class="cv-stage-desc">{{ stage.description }}</p>

                      <div class="cv-data-grid">
                        <div
                          v-for="item in (stage.items || []).filter(isDocumentField)"
                          :key="item.id || item.documentId"
                          class="cv-data-item"
                        >
                          <span>{{ item.title || '-' }}
                            <small class="text-muted">({{ getItemFieldTypeLabel(item) }})</small>
                          </span>

                          <template v-if="isFileField(item)">
                            <a v-if="getFileUrl(item.value)" :href="getFileUrl(item.value)" target="_blank" rel="noopener noreferrer" class="cv-file-link">
                              <i class="fa-solid fa-paperclip me-1"></i>{{ getFileName(item.value, item.title || 'فایل') }}
                            </a>
                            <span v-else-if="typeof item.value === 'number'" class="text-muted"><i class="fa-solid fa-file me-1"></i>فایل #{{ item.value }}</span>
                            <span v-else class="text-muted">فایلی برای این فیلد ثبت نشده است</span>
                            <small class="cv-input-note">مقدار فیلدهای فایل فقط قابل مشاهده است و در پایگاه داده فقط شناسه فایل ذخیره می شود.</small>
                          </template>

                          <input
                            v-else-if="getItemFieldType(item) === 'number'"
                            v-model="item.value"
                            type="number"
                            class="form-control"
                          >

                          <input
                            v-else-if="getItemFieldType(item) === 'date'"
                            v-model="item.value"
                            type="text"
                            class="form-control"
                            placeholder="مثلا 1405/01/18 یا 2026-04-07"
                          >

                          <textarea
                            v-else-if="String(item.value ?? '').length > 80"
                            v-model="item.value"
                            class="form-control"
                            rows="3"
                          ></textarea>

                          <input
                            v-else
                            v-model="item.value"
                            type="text"
                            class="form-control"
                          >
                        </div>
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    <div class="cv-data-grid">
                      <div v-for="(value, key) in editForm.data" :key="key" class="cv-data-item">
                        <span>{{ key }}</span>
                        <template v-if="getFileUrl(value)">
                          <a :href="getFileUrl(value)" target="_blank" rel="noopener noreferrer" class="cv-file-link">
                            <i class="fa-solid fa-paperclip me-1"></i>{{ getFileName(value, key) }}
                          </a>
                        </template>
                        <input v-else v-model="editForm.data[key]" type="text" class="form-control">
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <div class="cv-modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeEdit">انصراف</button>
              <button type="button" class="btn btn-primary" :disabled="saving" @click="saveEdit">
                {{ saving ? 'ذخیره ...' : 'ذخیره تغییرات' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.cv-view {
  display: grid;
  gap: 18px;
}

.cv-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.cv-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: var(--admin-text);
}

.cv-subtitle {
  margin: 6px 0 0;
  color: var(--admin-muted);
  font-size: 13px;
}

.cv-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.cv-filter-group {
  min-width: 170px;
}

.cv-filter-search {
  min-width: 250px;
  flex: 1;
}

.cv-loading,
.cv-empty {
  padding: 32px;
  text-align: center;
  color: var(--admin-muted);
  font-weight: 700;
  border-radius: 20px;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
}

.cv-table-wrap {
  overflow-x: auto;
  border-radius: 20px;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow);
}

.cv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.cv-table th,
.cv-table td {
  padding: 14px 16px;
  white-space: nowrap;
  text-align: start;
  border-bottom: 1px solid var(--admin-border);
}

.cv-table th {
  font-weight: 800;
  color: var(--admin-muted);
  font-size: 12px;
  background: var(--admin-surface-soft, rgba(0,0,0,0.02));
}

.cv-table tbody tr:last-child td {
  border-bottom: none;
}

.cv-table tbody tr:hover {
  background: var(--admin-surface-soft, rgba(0,0,0,0.02));
}

.cv-customer-cell {
  display: grid;
  gap: 2px;
}

.cv-customer-cell span {
  color: var(--admin-muted);
  font-size: 12px;
}

.cv-status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.cv-method-badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.cv-method-self {
  background: #eff6ff;
  color: #2563eb;
}

.cv-method-digvam {
  background: #f0fdf4;
  color: #16a34a;
}

.cv-actions {
  display: flex;
  gap: 6px;
}

.cv-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.cv-modal-sheet {
  width: 100%;
  max-width: 820px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

.cv-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--admin-border);
}

.cv-modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--admin-text);
}

.cv-modal-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 12px;
  background: var(--admin-surface-soft, rgba(0,0,0,0.04));
  color: var(--admin-text);
  font-size: 20px;
  cursor: pointer;
}

.cv-modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.cv-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--admin-border);
}

.cv-detail-grid,
.cv-data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.cv-stage-block {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface-soft, rgba(0,0,0,0.015));
}

.cv-stage-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.cv-stage-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--admin-primary, #0b5f83);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}

.cv-stage-header strong {
  font-size: 15px;
}

.cv-stage-desc {
  font-size: 13px;
  color: var(--admin-muted);
  margin: 0 0 12px;
}

.cv-detail-item,
.cv-data-item {
  padding: 12px;
  border-radius: 14px;
  background: var(--admin-surface-soft, rgba(0,0,0,0.02));
  border: 1px solid var(--admin-border);
}

.cv-detail-item span,
.cv-data-item span {
  display: block;
  font-size: 12px;
  color: var(--admin-muted);
  margin-bottom: 4px;
}

.cv-detail-item strong,
.cv-data-item strong {
  display: block;
  font-size: 14px;
  word-break: break-word;
}

.cv-file-link {
  display: block;
  color: var(--admin-primary, #0b5f83);
  font-weight: 700;
  text-decoration: none;
  word-break: break-word;
}

.cv-file-link:hover {
  text-decoration: underline;
}

.cv-edit-section {
  display: grid;
  gap: 14px;
}

.cv-stage-block--editable {
  margin-bottom: 0;
}

.cv-input-note {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: var(--admin-muted);
}

.cv-submitted-data h4,
.cv-form-section h4 {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 800;
  color: var(--admin-text);
}

.cv-form-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--admin-border);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .cv-filters {
    flex-direction: column;
  }

  .cv-filter-group,
  .cv-filter-search {
    min-width: 100%;
  }

  .cv-detail-grid,
  .cv-data-grid {
    grid-template-columns: 1fr;
  }

  .cv-modal-sheet {
    max-width: 100%;
  }
}
</style>
