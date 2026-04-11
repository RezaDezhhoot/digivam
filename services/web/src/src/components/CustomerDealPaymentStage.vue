<script setup>
import { computed, ref } from 'vue';
import {
  advanceDealPaymentStage,
  startDealCashPayment,
  uploadDealCheckPaymentFile
} from '../services/customer-panel.api.js';

const props = defineProps({
  deal: { type: Object, required: true }
});

const emit = defineEmits(['updated']);

const busy = ref(false);
const feedbackText = ref('');
const feedbackTone = ref('info');
const fileInputRefs = ref({});
const selectedCheckFiles = ref({});

const paymentTypes = computed(() => (Array.isArray(props.deal?.paymentTypes) ? props.deal.paymentTypes : []));
const allDone = computed(() => paymentTypes.value.length > 0 && paymentTypes.value.every((item) => item.status === 'done'));
const canAdvance = computed(() => allDone.value && !busy.value);
const isActiveStep = computed(() => props.deal?.status === 'in_progress' && props.deal?.step === 'payment' && props.deal?.actBy === 'customer');

const showFeedback = (text, tone = 'info') => {
  feedbackText.value = text;
  feedbackTone.value = tone;
};

const clearFeedback = () => {
  feedbackText.value = '';
};

const getUploadedCheckFiles = (item) => {
  const files = Array.isArray(item?.values?.files) ? item.values.files : [];
  if (files.length) {
    return files;
  }

  if (item?.values?.fileUrl || item?.values?.fileName) {
    return [
      {
        fileId: item.values?.fileId,
        fileUrl: item.values?.fileUrl,
        fileName: item.values?.fileName
      }
    ];
  }

  return [];
};

const getSelectedCheckFiles = (paymentTypeId) => selectedCheckFiles.value[paymentTypeId] || [];

const triggerCheckPicker = (paymentTypeId) => {
  fileInputRefs.value[`check-${paymentTypeId}`]?.click();
};

const handleCheckSelection = (paymentTypeId, event) => {
  const nextFiles = Array.from(event.target.files || []);
  if (!nextFiles.length) {
    return;
  }

  selectedCheckFiles.value = {
    ...selectedCheckFiles.value,
    [paymentTypeId]: [...getSelectedCheckFiles(paymentTypeId), ...nextFiles]
  };

  event.target.value = '';
};

const removeSelectedCheckFile = (paymentTypeId, index) => {
  const files = [...getSelectedCheckFiles(paymentTypeId)];
  files.splice(index, 1);
  selectedCheckFiles.value = {
    ...selectedCheckFiles.value,
    [paymentTypeId]: files
  };
};

const handleCheckUpload = async (paymentTypeId) => {
  const files = getSelectedCheckFiles(paymentTypeId);
  if (!files.length) {
    showFeedback('حداقل یک فایل انتخاب کنید.', 'error');
    return;
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });

  clearFeedback();
  busy.value = true;
  try {
    const data = await uploadDealCheckPaymentFile(props.deal.id, paymentTypeId, formData);
    selectedCheckFiles.value = {
      ...selectedCheckFiles.value,
      [paymentTypeId]: []
    };
    emit('updated', data.deal || data.item);
    showFeedback(data.message || 'فایل‌های پرداخت بارگذاری شدند.', 'success');
  } catch (error) {
    showFeedback(error.message || 'بارگذاری فایل ناموفق بود.', 'error');
  } finally {
    busy.value = false;
  }
};

const handleCashPayment = async (paymentTypeId) => {
  clearFeedback();
  busy.value = true;
  try {
    const data = await startDealCashPayment(props.deal.id, paymentTypeId);
    if (data.paymentLink) {
      window.location.href = data.paymentLink;
    } else {
      showFeedback('لینک پرداخت دریافت نشد.', 'error');
    }
  } catch (error) {
    showFeedback(error.message || 'شروع پرداخت ناموفق بود.', 'error');
  } finally {
    busy.value = false;
  }
};

const handleAdvance = async () => {
  if (!canAdvance.value) {
    return;
  }

  clearFeedback();
  busy.value = true;
  try {
    const data = await advanceDealPaymentStage(props.deal.id);
    emit('updated', data.deal || data.item);
    showFeedback('مرحله پرداخت تکمیل شد.', 'success');
  } catch (error) {
    showFeedback(error.message || 'خطا در تکمیل مرحله پرداخت.', 'error');
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <section class="payment-stage-card">
    <div class="payment-stage-head">
      <div>
        <span class="payment-kicker">مرحله پرداخت</span>
        <h3>تکمیل روش‌های پرداخت</h3>
        <p v-if="allDone">همه روش‌های پرداخت انجام شده‌اند. روی دکمه «مرحله بعد» بزنید تا پرونده به مرحله انتقال برود.</p>
        <p v-else>برای هر روش پرداخت اقدام لازم را انجام دهید تا دکمه پیشرفت فعال شود.</p>
      </div>
      <div class="payment-stage-badge" :class="allDone ? 'done' : 'pending'">
        {{ allDone ? 'پرداخت‌ها تکمیل شدند' : 'در انتظار پرداخت' }}
      </div>
    </div>

    <div v-if="feedbackText" class="payment-feedback" :class="`tone-${feedbackTone}`">{{ feedbackText }}</div>

    <div v-if="paymentTypes.length" class="payment-items-grid">
      <article
        v-for="item in paymentTypes"
        :key="item.id || item.paymentType"
        class="payment-item-card"
        :class="item.status === 'done' ? 'is-done' : 'is-pending'"
      >
        <div class="payment-item-top">
          <div class="payment-item-meta">
            <strong>{{ item.paymentTypeLabel }}</strong>
            <span class="payment-item-amount">{{ Number(item.amount).toLocaleString('fa-IR') }} تومان</span>
          </div>
          <span class="payment-item-badge" :class="item.status === 'done' ? 'badge-done' : 'badge-pending'">
            {{ item.status === 'done' ? 'انجام شد' : 'در انتظار' }}
          </span>
        </div>

        <p v-if="item.description" class="payment-item-desc">{{ item.description }}</p>

        <div v-if="item.paymentType === 'check'" class="payment-check-stack">
          <div v-if="getUploadedCheckFiles(item).length" class="payment-uploaded-files">
            <strong>فایل‌های ثبت‌شده</strong>
            <div class="payment-selected-file-list">
              <a
                v-for="file in getUploadedCheckFiles(item)"
                :key="file.fileId || file.fileUrl || file.fileName"
                :href="file.fileUrl"
                class="payment-file-chip payment-file-chip--uploaded"
                target="_blank"
                rel="noreferrer"
              >
                {{ file.fileName || 'فایل پرداخت' }}
              </a>
            </div>
          </div>

          <div v-if="getSelectedCheckFiles(item.id).length" class="payment-selected-files">
            <strong>فایل‌های آماده بارگذاری</strong>
            <div class="payment-selected-file-list">
              <button
                v-for="(file, index) in getSelectedCheckFiles(item.id)"
                :key="`${file.name}-${file.size}-${index}`"
                type="button"
                class="payment-file-chip"
                @click="removeSelectedCheckFile(item.id, index)"
              >
                <span>{{ file.name }}</span>
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <input
            :ref="(el) => { fileInputRefs[`check-${item.id}`] = el; }"
            type="file"
            accept="image/*,application/pdf"
            class="payment-file-input"
            multiple
            @change="handleCheckSelection(item.id, $event)"
          />

          <div v-if="isActiveStep" class="payment-item-actions payment-item-actions--stack">
            <button type="button" class="payment-file-label" :disabled="busy" @click="triggerCheckPicker(item.id)">
              {{ getSelectedCheckFiles(item.id).length ? 'افزودن فایل‌های بیشتر' : 'افزودن فایل' }}
            </button>
            <button
              v-if="getUploadedCheckFiles(item).length"
              type="button"
              class="payment-secondary-btn"
              :disabled="busy"
              @click="triggerCheckPicker(item.id)"
            >
              افزودن فایل های بیشتر
            </button>
            <button
              type="button"
              class="payment-action-btn"
              :disabled="busy || !getSelectedCheckFiles(item.id).length"
              @click="handleCheckUpload(item.id)"
            >
              {{ busy ? '...' : 'بارگذاری فایل‌ها' }}
            </button>
          </div>

          <div v-else-if="item.status === 'done' && getUploadedCheckFiles(item).length" class="payment-done-note">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            فایل‌های چک یا سفته ثبت شده‌اند.
          </div>
        </div>

        <div v-else-if="item.paymentType === 'cash' && item.status === 'done'" class="payment-done-note">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          پرداخت نقدی تایید شده است.
        </div>

        <div v-else-if="item.paymentType === 'cash' && isActiveStep" class="payment-item-actions">
          <button type="button" class="payment-primary-btn" :disabled="busy" @click="handleCashPayment(item.id)">
            {{ busy ? 'در حال اتصال...' : 'پرداخت آنلاین' }}
          </button>
        </div>
      </article>
    </div>

    <div v-else class="payment-empty-note">هنوز روشی برای پرداخت تعریف نشده است.</div>

    <div v-if="isActiveStep" class="payment-advance-section">
      <button type="button" class="payment-advance-btn" :disabled="!canAdvance" @click="handleAdvance">
        {{ busy ? 'در حال پردازش...' : 'مرحله بعد: انتقال امتیاز' }}
      </button>
      <p v-if="!allDone" class="payment-advance-hint">برای فعال شدن این دکمه، همه روش‌های پرداخت را تکمیل کنید.</p>
    </div>
  </section>
</template>

<style scoped>
.payment-stage-card {
  display: grid;
  gap: 20px;
}

.payment-stage-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.payment-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(14, 116, 144, 0.12);
  color: #0f766e;
  font-size: 11px;
  font-weight: 900;
  margin-bottom: 10px;
}

.payment-stage-head h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
}

.payment-stage-head p {
  margin: 6px 0 0;
  color: var(--web-muted);
  font-size: 12px;
  line-height: 1.9;
}

.payment-stage-badge {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.payment-stage-badge.pending {
  background: rgba(234, 88, 12, 0.12);
  color: #c2410c;
}

.payment-stage-badge.done {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.payment-feedback {
  padding: 13px 15px;
  border-radius: 18px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 800;
}

.payment-feedback.tone-success {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.18);
  color: #15803d;
}

.payment-feedback.tone-error {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.2);
  color: #b91c1c;
}

.payment-feedback.tone-info {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.18);
  color: #1d4ed8;
}

.payment-items-grid {
  display: grid;
  gap: 14px;
}

.payment-item-card {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid var(--web-border);
  background: color-mix(in srgb, var(--web-surface) 80%, transparent);
  display: grid;
  gap: 12px;
}

.payment-item-card.is-done {
  border-color: rgba(34, 197, 94, 0.22);
  background: rgba(34, 197, 94, 0.06);
}

.payment-item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.payment-item-meta {
  display: grid;
  gap: 4px;
}

.payment-item-meta strong {
  font-size: 14px;
  font-weight: 900;
}

.payment-item-amount {
  font-size: 13px;
  font-weight: 800;
  color: #0f766e;
}

.payment-item-badge {
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
}

.badge-done {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}

.badge-pending {
  background: rgba(234, 88, 12, 0.1);
  color: #c2410c;
}

.payment-item-desc {
  margin: 0;
  color: var(--web-muted);
  font-size: 12px;
  line-height: 1.8;
}

.payment-done-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: #15803d;
}

.payment-check-stack {
  display: grid;
  gap: 12px;
}

.payment-uploaded-files,
.payment-selected-files {
  display: grid;
  gap: 8px;
}

.payment-uploaded-files strong,
.payment-selected-files strong {
  font-size: 12px;
  font-weight: 900;
  color: var(--web-text);
}

.payment-selected-file-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.payment-file-chip {
  border: 1px solid rgba(15, 118, 110, 0.18);
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  border-radius: 999px;
  min-height: 34px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.payment-file-chip--uploaded {
  color: #0f766e;
  background: rgba(15, 118, 110, 0.08);
}

.payment-item-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.payment-item-actions--stack {
  align-items: stretch;
}

.payment-file-input {
  display: none;
}

.payment-file-label,
.payment-action-btn,
.payment-primary-btn,
.payment-secondary-btn {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
}

.payment-file-label {
  border: 1px dashed rgba(15, 118, 110, 0.28);
  background: rgba(15, 118, 110, 0.06);
  color: #0f766e;
}

.payment-action-btn {
  border: 1px solid var(--web-border-strong);
  background: color-mix(in srgb, var(--web-surface) 82%, transparent);
  color: var(--web-text);
}

.payment-primary-btn {
  border: 1px solid var(--web-primary);
  background: linear-gradient(135deg, var(--web-primary) 0%, #c2410c 100%);
  color: #fff;
}

.payment-secondary-btn {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.86);
  color: #0f172a;
}

.payment-file-label:disabled,
.payment-action-btn:disabled,
.payment-primary-btn:disabled,
.payment-secondary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.payment-empty-note {
  padding: 28px 18px;
  border-radius: 22px;
  border: 1px dashed var(--web-border);
  color: var(--web-muted);
  font-size: 12px;
  text-align: center;
}

.payment-advance-section {
  display: grid;
  gap: 8px;
}

.payment-advance-btn {
  width: 100%;
  min-height: 54px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 900;
  border: 1px solid var(--web-primary);
  background: linear-gradient(135deg, var(--web-primary) 0%, #c2410c 100%);
  color: #fff;
  transition: opacity 0.2s;
}

.payment-advance-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.payment-advance-hint {
  margin: 0;
  color: var(--web-muted);
  font-size: 11px;
  text-align: center;
}
</style>
