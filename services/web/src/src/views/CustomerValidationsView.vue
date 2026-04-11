<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
import { getMyValidation, getMyValidations } from '../services/customer-panel.api.js';

const loading = ref(true);
const detailLoading = ref(false);
const errorText = ref('');
const items = ref([]);
const activeItem = ref(null);
const detailPanelRef = ref(null);
const page = ref(1);
const totalPages = ref(1);
const statusFilter = ref('');
const summary = ref({ total: 0, submit: 0, pending: 0, approved: 0, rejected: 0, expired: 0 });

const statusOrder = ['all', 'pending', 'approved', 'rejected', 'expired'];
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

const summaryCards = computed(() => [
  { key: 'all', label: statusLabels.all, value: Number(summary.value.total || 0) },
  { key: 'pending', label: statusLabels.pending, value: Number(summary.value.pending || 0) + Number(summary.value.submit || 0) },
  { key: 'approved', label: statusLabels.approved, value: Number(summary.value.approved || 0) },
  { key: 'rejected', label: statusLabels.rejected, value: Number(summary.value.rejected || 0) },
  { key: 'expired', label: statusLabels.expired, value: Number(summary.value.expired || 0) }
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

const loadDetail = async (itemId) => {
  if (!itemId) {
    activeItem.value = null;
    return;
  }

  detailLoading.value = true;

  try {
    const data = await getMyValidation(itemId);
    activeItem.value = data.item || null;

    if (window.innerWidth < 992 && detailPanelRef.value) {
      await nextTick();
      detailPanelRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    errorText.value = error.message;
  } finally {
    detailLoading.value = false;
  }
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

    if (!items.value.length) {
      activeItem.value = null;
      return;
    }

    const currentActiveId = Number(activeItem.value?.id || 0);
    const nextActive = items.value.find((item) => Number(item.id) === currentActiveId) || items.value[0];
    await loadDetail(nextActive.id);
  } catch (error) {
    errorText.value = error.message;
  } finally {
    loading.value = false;
  }
};

const setFilter = async (nextStatus) => {
  const resolved = nextStatus === 'all' ? '' : nextStatus;
  if (statusFilter.value === resolved) {
    return;
  }

  statusFilter.value = resolved;
  page.value = 1;
  await load();
};

const changePage = async (newPage) => {
  if (newPage < 1 || newPage > totalPages.value || newPage === page.value) {
    return;
  }

  page.value = newPage;
  await load();
};

onMounted(load);
watch(statusFilter, () => {
  activeItem.value = null;
});
</script>

<template>
  <section class="cv-page">
    <div v-if="loading" class="cv-loading">
      <div class="cv-spinner"></div>
      <span>در حال بارگذاری اعتبارسنجی‌ها ...</span>
    </div>
    <div v-else-if="errorText" class="cv-loading text-danger">{{ errorText }}</div>

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
            <span>{{ card.label }}</span>
            <strong>{{ new Intl.NumberFormat('fa-IR').format(card.value) }}</strong>
          </button>
        </div>

        <div v-if="!hasItems" class="cv-empty">
        <i class="fa-solid fa-clipboard-check"></i>
        <p>{{ statusFilter ? 'در این وضعیت هنوز موردی ثبت نشده است.' : 'هنوز اعتبارسنجی ثبت نکرده‌اید.' }}</p>
        <RouterLink class="cv-primary-link" to="/market">رفتن به بازار وام</RouterLink>
        </div>

        <div v-else class="cv-layout">
          <div class="cv-list-panel">
            <article
              v-for="item in items"
              :key="item.id"
              class="cv-card"
              :class="{ active: Number(activeItem?.id) === Number(item.id) }"
              @click="loadDetail(item.id)"
            >
            <div class="cv-card-top">
              <span class="cv-status-chip" :style="{ background: statusColors[item.status] || '#6b7280' }">
                {{ item.statusLabel }}
              </span>
              <span class="cv-date">{{ item.createdAtLabel || formatDate(item.createdAt) }}</span>
            </div>

            <h3>{{ item.validationTitle }}</h3>
            <p class="cv-card-text">{{ item.validationDescription || 'اعتبارسنجی ثبت شده شما در این بخش قابل پیگیری است.' }}</p>

            <div class="cv-meta-row">
              <span class="cv-method-chip" :class="item.selfValidation ? 'cv-method-self' : 'cv-method-digvam'">{{ item.selfValidationLabel }}</span>
              <span v-if="item.validationValidForLabel">{{ item.validationValidForLabel }}</span>
              <span v-if="Number(item.paidAmount || 0) > 0">{{ formatMoney(item.paidAmount) }}</span>
            </div>

            <div v-if="item.result" class="cv-result-box">
              <strong>نتیجه بررسی:</strong> {{ item.result }}
            </div>

            <div class="cv-actions">
              <RouterLink v-if="item.status === 'submit'" class="cv-inline-link" :to="`/customer/${item.selfValidation ? 'self-validation' : 'validation-flow'}/${item.validationId}`">ادامه تکمیل مراحل</RouterLink>
              <RouterLink v-else-if="item.status === 'rejected'" class="cv-inline-link warning" :to="`/customer/${item.selfValidation ? 'self-validation' : 'validation-flow'}/${item.validationId}`">ارسال مجدد</RouterLink>
              <RouterLink v-else-if="item.status === 'expired'" class="cv-inline-link" :to="`/customer/${item.selfValidation ? 'self-validation' : 'validation-flow'}/${item.validationId}`">شروع مجدد</RouterLink>
            </div>
            </article>
          </div>

        <aside class="cv-detail-panel" ref="detailPanelRef">
          <div v-if="detailLoading" class="cv-detail-empty">
            <div class="cv-spinner"></div>
            <span>در حال بارگذاری جزئیات ...</span>
          </div>
          <div v-else-if="!activeItem" class="cv-detail-empty">یک اعتبارسنجی را برای مشاهده جزئیات انتخاب کنید.</div>
          <template v-else>
            <div class="cv-detail-head">
              <div>
                <span class="cv-detail-kicker">اعتبارسنجی انتخاب شده</span>
                <h2>{{ activeItem.validationTitle }}</h2>
              </div>
              <span class="cv-status-chip" :style="{ background: statusColors[activeItem.status] || '#6b7280' }">
                {{ activeItem.statusLabel }}
              </span>
            </div>

            <div class="cv-detail-grid">
              <div class="cv-detail-item">
                <span>تاریخ ثبت</span>
                <strong>{{ activeItem.createdAtLabel || formatDate(activeItem.createdAt) }}</strong>
              </div>
              <div class="cv-detail-item">
                <span>آخرین بروزرسانی</span>
                <strong>{{ activeItem.updatedAtLabel || formatDate(activeItem.updatedAt) }}</strong>
              </div>
              <div class="cv-detail-item">
                <span>مدت اعتبار</span>
                <strong>{{ activeItem.validationValidForLabel || '-' }}</strong>
              </div>
              <div class="cv-detail-item">
                <span>هزینه پرداختی</span>
                <strong>{{ Number(activeItem.paidAmount || 0) > 0 ? formatMoney(activeItem.paidAmount) : 'بدون هزینه' }}</strong>
              </div>
              <div class="cv-detail-item" v-if="activeItem.expiresAt">
                <span>تاریخ انقضا</span>
                <strong>{{ activeItem.expiresAtLabel || formatDate(activeItem.expiresAt) }}</strong>
              </div>
              <div class="cv-detail-item">
                <span>روش انجام</span>
                <strong>
                  <span class="cv-method-chip" :class="activeItem.selfValidation ? 'cv-method-self' : 'cv-method-digvam'">{{ activeItem.selfValidationLabel }}</span>
                </strong>
              </div>
            </div>

            <div v-if="activeItem.validationDescription" class="cv-info-box">
              <strong>توضیح روش اعتبارسنجی</strong>
              <p>{{ activeItem.validationDescription }}</p>
            </div>

            <div v-if="activeItem.result" class="cv-info-box attention">
              <strong>نتیجه بررسی</strong>
              <p>{{ activeItem.result }}</p>
            </div>

            <div v-if="activeItem.data?.stages?.length" class="cv-stages-box">
              <strong>اطلاعات ارسالی</strong>
              <div v-for="(stage, si) in activeItem.data.stages" :key="si" class="cv-stage-section">
                <span class="cv-stage-title">{{ stage.title || `مرحله ${si + 1}` }}</span>
                <div class="cv-stage-items">
                  <div v-for="(field, fi) in (stage.items || [])" :key="fi" class="cv-field-row">
                    <span class="cv-field-label">{{ field.title || field.name || `فیلد ${fi + 1}` }}</span>
                    <template v-if="field.fieldType === 'file' && field.value && typeof field.value === 'object'">
                      <a class="cv-file-link" :href="field.value.url" target="_blank" rel="noreferrer">
                        <i class="fa-solid fa-file-arrow-down"></i>
                        {{ field.value.fileName }}
                      </a>
                    </template>
                    <span v-else class="cv-field-value">{{ field.value ?? '-' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="activeItem.uploadedFiles?.length" class="cv-files-box">
              <strong>فایل‌های ارسالی</strong>
              <a
                v-for="file in activeItem.uploadedFiles"
                :key="file.fileId"
                class="cv-file-link"
                :href="file.url"
                target="_blank"
                rel="noreferrer"
              >
                <i class="fa-solid fa-file-arrow-down"></i>
                {{ file.fileName }}
              </a>
            </div>

            <div class="cv-detail-actions">
              <RouterLink v-if="activeItem.status === 'submit'" class="cv-primary-link" :to="`/customer/${activeItem.selfValidation ? 'self-validation' : 'validation-flow'}/${activeItem.validationId}`">ادامه تکمیل مراحل</RouterLink>
              <RouterLink v-else-if="activeItem.status === 'rejected'" class="cv-primary-link warning" :to="`/customer/${activeItem.selfValidation ? 'self-validation' : 'validation-flow'}/${activeItem.validationId}`">ویرایش و ارسال مجدد</RouterLink>
              <RouterLink v-else-if="activeItem.status === 'expired'" class="cv-primary-link" :to="`/customer/${activeItem.selfValidation ? 'self-validation' : 'validation-flow'}/${activeItem.validationId}`">شروع مجدد اعتبارسنجی</RouterLink>
              <RouterLink v-else class="cv-secondary-link" to="/market">مشاهده بازار وام</RouterLink>
            </div>
          </template>
          </aside>
        </div>

        <div v-if="totalPages > 1" class="cv-pagination">
          <button type="button" :disabled="page <= 1" @click="changePage(page - 1)">قبلی</button>
          <span>صفحه {{ page }} از {{ totalPages }}</span>
          <button type="button" :disabled="page >= totalPages" @click="changePage(page + 1)">بعدی</button>
        </div>
      </CustomerPanelShell>
    </template>
  </section>
</template>

<style scoped>
.cv-page {
  display: grid;
  gap: 14px;
  padding: 20px 0 44px;
}

.cv-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 28px;
  border-radius: 30px;
  background: linear-gradient(135deg, #8d0000 0%, #c11212 100%);
  color: #fff;
  box-shadow: 0 26px 70px rgba(155, 0, 0, 0.18);
}

.cv-hero h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 900;
}

.cv-hero p {
  margin: 10px 0 0;
  max-width: 760px;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.84);
}

.cv-back-link,
.cv-primary-link,
.cv-secondary-link,
.cv-inline-link,
.cv-ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
}

.cv-back-link,
.cv-secondary-link,
.cv-ghost-btn {
  background: var(--web-surface-soft);
  border: 1px solid var(--web-border);
  color: var(--web-text);
}

.cv-primary-link,
.cv-inline-link {
  background: linear-gradient(135deg, #8d0000, #c11212);
  color: #fff;
}

.cv-primary-link.warning,
.cv-inline-link.warning {
  background: linear-gradient(135deg, #d97706, #f59e0b);
}

.cv-summary-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(138px, 1fr));
}

.cv-summary-card {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--web-border);
  background: var(--web-surface);
  box-shadow: var(--web-shadow);
  text-align: right;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.cv-summary-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--web-shadow-lg);
  border-color: var(--web-border-strong);
}

.cv-summary-card span {
  display: block;
  color: var(--web-muted);
  font-size: 12px;
  font-weight: 700;
}

.cv-summary-card strong {
  display: block;
  margin-top: 6px;
  font-size: 23px;
  font-weight: 900;
  color: var(--web-text);
}

.cv-summary-card.active {
  border-color: rgba(155, 0, 0, 0.28);
  box-shadow: 0 18px 40px rgba(155, 0, 0, 0.12);
}

.cv-loading,
.cv-empty,
.cv-detail-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 36px 24px;
  border-radius: 22px;
  text-align: center;
  background: var(--web-surface);
  border: 1px solid var(--web-border);
  color: var(--web-muted);
  font-weight: 700;
  font-size: 13px;
  flex-direction: column;
}

.cv-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--web-border);
  border-top-color: var(--web-primary);
  border-radius: 50%;
  animation: cvSpin 0.7s linear infinite;
}

@keyframes cvSpin {
  to { transform: rotate(360deg); }
}

.cv-empty {
  background: var(--web-surface);
  border: 1px solid var(--web-border);
}

.cv-empty i {
  font-size: 38px;
  color: var(--web-muted);
  margin-bottom: 14px;
}

.cv-layout {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 0.95fr) minmax(300px, 0.85fr);
}

.cv-list-panel {
  display: grid;
  gap: 12px;
}

.cv-card,
.cv-detail-panel {
  background: var(--web-surface);
  border: 1px solid var(--web-border);
  box-shadow: var(--web-shadow);
}

.cv-card {
  padding: 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.cv-card:hover,
.cv-card.active {
  transform: translateY(-2px);
  border-color: rgba(155, 0, 0, 0.18);
  box-shadow: 0 24px 52px rgba(15, 23, 42, 0.08);
}

.cv-card-top,
.cv-actions,
.cv-detail-head,
.cv-detail-actions,
.cv-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.cv-status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.cv-date,
.cv-card-text,
.cv-meta-row,
.cv-detail-kicker,
.cv-detail-item span,
.cv-info-box p {
  color: var(--web-muted);
}

.cv-card h3,
.cv-detail-head h2 {
  margin: 10px 0 6px;
  font-size: 18px;
  font-weight: 900;
}

.cv-card-text {
  margin: 0;
  line-height: 1.9;
}

.cv-meta-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
  font-size: 11px;
  font-weight: 700;
}

.cv-method-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
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

.cv-result-box,
.cv-info-box,
.cv-files-box {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--web-surface-soft);
}

.cv-result-box,
.cv-info-box {
  line-height: 1.9;
}

.cv-info-box.attention {
  background: #fff7ed;
}

.cv-result-box strong,
.cv-info-box strong,
.cv-files-box strong {
  display: block;
  margin-bottom: 8px;
}

.cv-detail-panel {
  border-radius: 22px;
  padding: 18px;
  position: sticky;
  top: 92px;
  align-self: start;
}

.cv-detail-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(155, 0, 0, 0.08);
  color: var(--web-primary);
  font-size: 11px;
  font-weight: 800;
}

.cv-detail-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;
}

.cv-detail-item {
  padding: 12px;
  border-radius: 15px;
  background: var(--web-surface-soft);
}

.cv-detail-item span {
  display: block;
  font-size: 11px;
  font-weight: 700;
}

.cv-detail-item strong {
  display: block;
  margin-top: 6px;
  font-size: 14px;
}

.cv-file-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 0 12px;
  border-radius: 12px;
  background: var(--web-surface);
  border: 1px solid var(--web-border);
  color: var(--web-text);
  text-decoration: none;
}

.cv-files-box {
  display: grid;
  gap: 10px;
}

.cv-stages-box {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--web-surface-soft);
}

.cv-stages-box > strong {
  display: block;
  margin-bottom: 12px;
}

.cv-stage-section {
  margin-bottom: 14px;
}

.cv-stage-section:last-child {
  margin-bottom: 0;
}

.cv-stage-title {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: var(--web-primary);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--web-border);
}

.cv-stage-items {
  display: grid;
  gap: 8px;
}

.cv-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--web-surface);
}

.cv-field-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--web-muted);
  flex-shrink: 0;
}

.cv-field-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--web-text);
  text-align: left;
  direction: ltr;
}

.cv-pagination button {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid var(--web-border);
  background: var(--web-surface);
  font-size: 13px;
  font-weight: 700;
}

.cv-pagination button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 991px) {
  .cv-layout,
  .cv-detail-grid {
    grid-template-columns: 1fr;
  }

  .cv-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cv-detail-panel {
    position: static;
  }
}

@media (max-width: 767px) {
  .cv-card,
  .cv-detail-panel {
    padding: 16px;
  }

  .cv-summary-grid {
    grid-template-columns: 1fr;
  }

  .cv-card-top,
  .cv-actions,
  .cv-detail-head,
  .cv-detail-actions,
  .cv-pagination {
    align-items: stretch;
  }

  .cv-primary-link,
  .cv-secondary-link,
  .cv-inline-link,
  .cv-back-link {
    width: 100%;
  }
}

:root[data-theme='dark'] .cv-hero {
  background: linear-gradient(135deg, #3d0000 0%, #6d1010 100%);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.4);
}

:root[data-theme='dark'] .cv-method-self {
  background: rgba(37, 99, 235, 0.14);
  color: #93c5fd;
}

:root[data-theme='dark'] .cv-method-digvam {
  background: rgba(22, 163, 74, 0.14);
  color: #86efac;
}

:root[data-theme='dark'] .cv-info-box.attention {
  background: rgba(217, 119, 6, 0.1);
}

:root[data-theme='dark'] .cv-pagination button {
  background: var(--web-surface);
  border-color: var(--web-border);
  color: var(--web-text);
}
</style>