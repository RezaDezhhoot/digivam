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
  if (value && typeof value === 'object' && (value.downloadUrl || value.url)) {
    return value.downloadUrl || value.url;
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
                  <a :href="editingItem.selfValidationFileDownloadUrl || editingItem.selfValidationFileUrl" download rel="noopener noreferrer" class="cv-file-link">
                    <i class="fa-solid fa-paperclip me-1"></i>{{ editingItem.selfValidationFileName || 'مشاهده فایل' }}
                  </a>
                </div>
                <div v-if="editingItem.adminAttachmentUrl" class="cv-detail-item">
                  <span>گزارش نهایی اعتبارسنجی</span>
                  <a :href="editingItem.adminAttachmentDownloadUrl || editingItem.adminAttachmentUrl" download rel="noopener noreferrer" class="cv-file-link">
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
                          <a :href="item.value.downloadUrl || item.value.url" download rel="noopener noreferrer" class="cv-file-link">
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
                        <a :href="getFileUrl(value)" download rel="noopener noreferrer" class="cv-file-link">
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
                    <a :href="editingItem.adminAttachmentDownloadUrl || editingItem.adminAttachmentUrl" download rel="noopener noreferrer" class="cv-file-link inline-link">{{ editingItem.adminAttachmentFileName || 'دانلود گزارش نهایی' }}</a>
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
                          <a :href="getFileUrl(value)" download rel="noopener noreferrer" class="cv-file-link">
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

<style scoped src="./styles/CustomerValidationsView.css"></style>
