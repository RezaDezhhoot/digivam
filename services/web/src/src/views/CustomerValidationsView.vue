<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
import { getMyValidation, getMyValidations } from '../services/customer-panel.api.js';

const loading = ref(true);
const detailLoading = ref(false);
const errorText = ref('');
const items = ref([]);
const activeItem = ref(null);
const showModal = ref(false);
const page = ref(1);
const totalPages = ref(1);
const statusFilter = ref('');
const summary = ref({ total: 0, submit: 0, pending: 0, approved: 0, rejected: 0, expired: 0 });

const statusLabels = {
  all: 'همه',
  pending: 'در انتظار بررسی',
  approved: 'تایید شده',
  rejected: 'رد شده',
  expired: 'منقضی شده'
};
const statusColors = {
  submit: '#6366f1',
  pending: '#d97706',
  approved: '#22a06b',
  rejected: '#dc2626',
  expired: '#6b7280'
};
const statusIcons = {
  submit: 'fa-solid fa-paper-plane',
  pending: 'fa-solid fa-hourglass-half',
  approved: 'fa-solid fa-circle-check',
  rejected: 'fa-solid fa-circle-xmark',
  expired: 'fa-solid fa-clock'
};

const summaryCards = computed(() => [
  { key: 'all', label: statusLabels.all, value: Number(summary.value.total || 0), icon: 'fa-solid fa-layer-group' },
  { key: 'pending', label: statusLabels.pending, value: Number(summary.value.pending || 0) + Number(summary.value.submit || 0), icon: 'fa-solid fa-hourglass-half' },
  { key: 'approved', label: statusLabels.approved, value: Number(summary.value.approved || 0), icon: 'fa-solid fa-circle-check' },
  { key: 'rejected', label: statusLabels.rejected, value: Number(summary.value.rejected || 0), icon: 'fa-solid fa-circle-xmark' },
  { key: 'expired', label: statusLabels.expired, value: Number(summary.value.expired || 0), icon: 'fa-solid fa-clock' }
]);

const shellStats = computed(() => [
  { label: 'کل اعتبارسنجی', value: new Intl.NumberFormat('fa-IR').format(Number(summary.value.total || 0)) },
  { label: 'در جریان', value: new Intl.NumberFormat('fa-IR').format(Number(summary.value.pending || 0) + Number(summary.value.submit || 0)) },
  { label: 'تایید شده', value: new Intl.NumberFormat('fa-IR').format(Number(summary.value.approved || 0)) },
  { label: 'رد شده', value: new Intl.NumberFormat('fa-IR').format(Number(summary.value.rejected || 0)) }
]);

const hasItems = computed(() => items.value.length > 0);

const formatDate = (value) => (value ? new Date(value).toLocaleString('fa-IR') : '-');
const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;

const openDetail = async (itemId) => {
  if (!itemId) return;
  detailLoading.value = true;
  showModal.value = true;
  activeItem.value = null;

  try {
    const data = await getMyValidation(itemId);
    activeItem.value = data.item || null;
  } catch (error) {
    errorText.value = error.message;
    showModal.value = false;
  } finally {
    detailLoading.value = false;
  }
};

const closeModal = () => {
  showModal.value = false;
  activeItem.value = null;
};

const load = async () => {
  loading.value = true;
  errorText.value = '';

  try {
    const data = await getMyValidations({
      page: page.value,
      limit: 12,
      status: statusFilter.value || undefined
    });

    items.value = data.items || [];
    summary.value = data.summary || summary.value;
    totalPages.value = Math.max(Number(data.pages || 1), 1);
  } catch (error) {
    errorText.value = error.message;
  } finally {
    loading.value = false;
  }
};

const setFilter = async (nextStatus) => {
  const resolved = nextStatus === 'all' ? '' : nextStatus;
  if (statusFilter.value === resolved) return;
  statusFilter.value = resolved;
  page.value = 1;
  await load();
};

const changePage = async (newPage) => {
  if (newPage < 1 || newPage > totalPages.value || newPage === page.value) return;
  page.value = newPage;
  await load();
};

onMounted(load);
</script>

<template>
  <section class="cv-page">
    <div v-if="loading" class="cv-loading">
      <div class="cv-spinner"></div>
      <span>در حال بارگذاری اعتبارسنجی‌ها ...</span>
    </div>
    <div v-else-if="errorText && !items.length" class="cv-loading text-danger">{{ errorText }}</div>

    <template v-else>
      <CustomerPanelShell
        kicker="اعتبارسنجی‌های مشتری"
        title="مدیریت اعتبارسنجی‌های من"
        description="همه درخواست‌های ثبت شده، نتیجه بررسی، وضعیت پرداخت و فایل‌های ارسالی خود را از این صفحه پیگیری کنید."
        :stats="shellStats"
      >
        <div class="cv-summary-grid">
          <button
            v-for="card in summaryCards"
            :key="card.key"
            type="button"
            class="cv-summary-card"
            :class="{ active: (statusFilter || 'all') === (card.key === 'all' ? '' : card.key) || (!statusFilter && card.key === 'all') }"
            @click="setFilter(card.key)"
          >
            <div class="cv-summary-icon"><i :class="card.icon"></i></div>
            <div>
              <span>{{ card.label }}</span>
              <strong>{{ new Intl.NumberFormat('fa-IR').format(card.value) }}</strong>
            </div>
          </button>
        </div>

        <div v-if="!hasItems" class="cv-empty">
          <div class="cv-empty-icon"><i class="fa-solid fa-clipboard-check"></i></div>
          <h3>{{ statusFilter ? 'موردی یافت نشد' : 'هنوز اعتبارسنجی ندارید' }}</h3>
          <p>{{ statusFilter ? 'در این وضعیت هنوز موردی ثبت نشده است.' : 'برای شروع اعتبارسنجی به بازار وام مراجعه کنید.' }}</p>
          <RouterLink class="cv-primary-link" to="/market"><i class="fa-solid fa-store me-1"></i>رفتن به بازار وام</RouterLink>
        </div>

        <div v-else class="cv-cards-grid">
          <article
            v-for="item in items"
            :key="item.id"
            class="cv-card"
            @click="openDetail(item.id)"
          >
            <div class="cv-card-header">
              <span class="cv-status-chip" :style="{ '--chip-color': statusColors[item.status] || '#6b7280' }">
                <i :class="statusIcons[item.status] || 'fa-solid fa-circle'" class="cv-chip-icon"></i>
                {{ item.statusLabel }}
              </span>
              <span class="cv-date"><i class="fa-regular fa-calendar me-1"></i>{{ item.createdAtLabel || formatDate(item.createdAt) }}</span>
            </div>

            <h3>{{ item.validationTitle }}</h3>
            <p class="cv-card-desc">{{ item.validationDescription || 'اعتبارسنجی ثبت شده شما' }}</p>

            <div class="cv-card-tags">
              <span class="cv-tag" :class="item.selfValidation ? 'cv-tag--blue' : 'cv-tag--green'">
                <i :class="item.selfValidation ? 'fa-solid fa-user' : 'fa-solid fa-shield-halved'" class="me-1"></i>
                {{ item.selfValidationLabel }}
              </span>
              <span v-if="item.validationValidForLabel" class="cv-tag"><i class="fa-solid fa-clock me-1"></i>{{ item.validationValidForLabel }}</span>
              <span v-if="Number(item.paidAmount || 0) > 0" class="cv-tag"><i class="fa-solid fa-coins me-1"></i>{{ formatMoney(item.paidAmount) }}</span>
            </div>

            <div v-if="item.result" class="cv-card-result">
              <i class="fa-solid fa-message-dots"></i>
              <span>{{ item.result }}</span>
            </div>

            <div v-if="item.adminAttachmentDownloadUrl" class="cv-card-report">
              <a :href="item.adminAttachmentDownloadUrl" download rel="noreferrer" @click.stop>
                <i class="fa-solid fa-file-arrow-down me-1"></i>دانلود گزارش نهایی
              </a>
            </div>

            <div class="cv-card-footer">
              <RouterLink v-if="item.status === 'submit'" class="cv-inline-link" :to="`/customer/${item.selfValidation ? 'self-validation' : 'validation-flow'}/${item.validationId}`" @click.stop>ادامه تکمیل</RouterLink>
              <RouterLink v-else-if="item.status === 'rejected'" class="cv-inline-link warning" :to="`/customer/${item.selfValidation ? 'self-validation' : 'validation-flow'}/${item.validationId}`" @click.stop>ارسال مجدد</RouterLink>
              <RouterLink v-else-if="item.status === 'expired'" class="cv-inline-link" :to="`/customer/${item.selfValidation ? 'self-validation' : 'validation-flow'}/${item.validationId}`" @click.stop>شروع مجدد</RouterLink>
              <button type="button" class="cv-detail-btn" @click.stop="openDetail(item.id)"><i class="fa-solid fa-eye me-1"></i>مشاهده جزئیات</button>
            </div>
          </article>
        </div>

        <div v-if="totalPages > 1" class="cv-pagination">
          <button type="button" :disabled="page <= 1" @click="changePage(page - 1)"><i class="fa-solid fa-chevron-right me-1"></i>قبلی</button>
          <span>صفحه {{ new Intl.NumberFormat('fa-IR').format(page) }} از {{ new Intl.NumberFormat('fa-IR').format(totalPages) }}</span>
          <button type="button" :disabled="page >= totalPages" @click="changePage(page + 1)">بعدی<i class="fa-solid fa-chevron-left ms-1"></i></button>
        </div>
      </CustomerPanelShell>
    </template>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="cv-modal">
        <div v-if="showModal" class="cv-modal-overlay" @click.self="closeModal">
          <div class="cv-modal-container" role="dialog" aria-modal="true">
            <div class="cv-modal-header">
              <div>
                <span class="cv-modal-kicker">جزئیات اعتبارسنجی</span>
                <h2 v-if="activeItem">{{ activeItem.validationTitle }}</h2>
              </div>
              <button type="button" class="cv-modal-close" @click="closeModal"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div class="cv-modal-body">
              <div v-if="detailLoading" class="cv-modal-loading">
                <div class="cv-spinner"></div>
                <span>در حال بارگذاری ...</span>
              </div>

              <template v-else-if="activeItem">
                <div class="cv-modal-status-row">
                  <span class="cv-status-chip cv-status-chip--lg" :style="{ '--chip-color': statusColors[activeItem.status] || '#6b7280' }">
                    <i :class="statusIcons[activeItem.status] || 'fa-solid fa-circle'" class="cv-chip-icon"></i>
                    {{ activeItem.statusLabel }}
                  </span>
                  <span class="cv-tag" :class="activeItem.selfValidation ? 'cv-tag--blue' : 'cv-tag--green'">
                    <i :class="activeItem.selfValidation ? 'fa-solid fa-user' : 'fa-solid fa-shield-halved'" class="me-1"></i>
                    {{ activeItem.selfValidationLabel }}
                  </span>
                </div>

                <div class="cv-modal-meta">
                  <div class="cv-meta-card">
                    <i class="fa-regular fa-calendar"></i>
                    <div>
                      <span>تاریخ ثبت</span>
                      <strong>{{ activeItem.createdAtLabel || formatDate(activeItem.createdAt) }}</strong>
                    </div>
                  </div>
                  <div class="cv-meta-card">
                    <i class="fa-solid fa-arrow-rotate-right"></i>
                    <div>
                      <span>آخرین بروزرسانی</span>
                      <strong>{{ activeItem.updatedAtLabel || formatDate(activeItem.updatedAt) }}</strong>
                    </div>
                  </div>
                  <div class="cv-meta-card">
                    <i class="fa-solid fa-hourglass-half"></i>
                    <div>
                      <span>مدت اعتبار</span>
                      <strong>{{ activeItem.validationValidForLabel || 'بدون انقضا' }}</strong>
                    </div>
                  </div>
                  <div class="cv-meta-card">
                    <i class="fa-solid fa-coins"></i>
                    <div>
                      <span>هزینه پرداختی</span>
                      <strong>{{ Number(activeItem.paidAmount || 0) > 0 ? formatMoney(activeItem.paidAmount) : 'بدون هزینه' }}</strong>
                    </div>
                  </div>
                  <div v-if="activeItem.expiresAt" class="cv-meta-card">
                    <i class="fa-solid fa-calendar-xmark"></i>
                    <div>
                      <span>تاریخ انقضا</span>
                      <strong>{{ activeItem.expiresAtLabel || formatDate(activeItem.expiresAt) }}</strong>
                    </div>
                  </div>
                </div>

                <div v-if="activeItem.validationDescription" class="cv-modal-info">
                  <div class="cv-modal-info-head"><i class="fa-solid fa-info-circle"></i><strong>توضیح روش اعتبارسنجی</strong></div>
                  <p>{{ activeItem.validationDescription }}</p>
                </div>

                <div v-if="activeItem.result" class="cv-modal-info cv-modal-info--result">
                  <div class="cv-modal-info-head"><i class="fa-solid fa-clipboard-check"></i><strong>نتیجه بررسی</strong></div>
                  <p>{{ activeItem.result }}</p>
                </div>

                <div v-if="activeItem.data?.stages?.length" class="cv-modal-stages">
                  <h3><i class="fa-solid fa-list-check me-2"></i>اطلاعات ارسالی</h3>
                  <div v-for="(stage, si) in activeItem.data.stages" :key="si" class="cv-modal-stage">
                    <div class="cv-modal-stage-head">
                      <span class="cv-modal-stage-num">{{ si + 1 }}</span>
                      <span>{{ stage.title || `مرحله ${si + 1}` }}</span>
                    </div>
                    <div class="cv-modal-stage-items">
                      <div v-for="(field, fi) in (stage.items || [])" :key="fi" class="cv-modal-field">
                        <span class="cv-modal-field-label">{{ field.title || field.name || `فیلد ${fi + 1}` }}</span>
                        <template v-if="field.fieldType === 'file' && field.value && typeof field.value === 'object'">
                          <a class="cv-modal-file-link" :href="field.value.downloadUrl || field.value.url" download rel="noreferrer">
                            <i class="fa-solid fa-file-arrow-down"></i>
                            {{ field.value.fileName }}
                          </a>
                        </template>
                        <span v-else class="cv-modal-field-value">{{ field.value ?? '-' }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else-if="activeItem.uploadedFiles?.length" class="cv-modal-files">
                  <h3><i class="fa-solid fa-paperclip me-2"></i>فایل‌های ارسالی</h3>
                  <a
                    v-for="file in activeItem.uploadedFiles"
                    :key="file.fileId"
                    class="cv-modal-file-link"
                    :href="file.downloadUrl || file.url"
                    download
                    rel="noreferrer"
                  >
                    <i class="fa-solid fa-file-arrow-down"></i>
                    {{ file.fileName }}
                  </a>
                </div>

                <div v-if="activeItem.adminAttachmentDownloadUrl" class="cv-modal-files cv-modal-files--report">
                  <h3><i class="fa-solid fa-file-circle-check me-2"></i>گزارش نهایی اعتبارسنجی</h3>
                  <a
                    class="cv-modal-file-link cv-modal-file-link--report"
                    :href="activeItem.adminAttachmentDownloadUrl"
                    download
                    rel="noreferrer"
                  >
                    <i class="fa-solid fa-file-arrow-down"></i>
                    {{ activeItem.adminAttachmentFileName || 'دانلود گزارش نهایی' }}
                  </a>
                </div>

                <div class="cv-modal-actions">
                  <RouterLink v-if="activeItem.status === 'submit'" class="cv-primary-link" :to="`/customer/${activeItem.selfValidation ? 'self-validation' : 'validation-flow'}/${activeItem.validationId}`">
                    <i class="fa-solid fa-arrow-left me-1"></i>ادامه تکمیل مراحل
                  </RouterLink>
                  <RouterLink v-else-if="activeItem.status === 'rejected'" class="cv-primary-link warning" :to="`/customer/${activeItem.selfValidation ? 'self-validation' : 'validation-flow'}/${activeItem.validationId}`">
                    <i class="fa-solid fa-pen me-1"></i>ویرایش و ارسال مجدد
                  </RouterLink>
                  <RouterLink v-else-if="activeItem.status === 'expired'" class="cv-primary-link" :to="`/customer/${activeItem.selfValidation ? 'self-validation' : 'validation-flow'}/${activeItem.validationId}`">
                    <i class="fa-solid fa-rotate me-1"></i>شروع مجدد اعتبارسنجی
                  </RouterLink>
                  <button type="button" class="cv-ghost-btn" @click="closeModal">بستن</button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped src="./styles/CustomerValidationsView.css"></style>