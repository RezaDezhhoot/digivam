<script setup>
import { computed, ref } from 'vue';
import Swal from 'sweetalert2';
import PersianDatePickerInput from './PersianDatePickerInput.vue';
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
const checkFormData = ref({});

const paymentTypes = computed(() => (Array.isArray(props.deal?.paymentTypes) ? props.deal.paymentTypes : []));
const allDone = computed(() => paymentTypes.value.length > 0 && paymentTypes.value.every((item) => item.status === 'done'));
const canAdvance = computed(() => allDone.value && !busy.value);
const isLockedByAdminReview = computed(() => Boolean(props.deal?.adminReviewMode));
const isActiveStep = computed(
  () => !isLockedByAdminReview.value && props.deal?.status === 'in_progress' && props.deal?.step === 'payment' && props.deal?.actBy === 'customer'
);

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
        downloadUrl: item.values?.downloadUrl,
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

const getCheckForm = (paymentTypeId) => {
  if (!checkFormData.value[paymentTypeId]) {
    checkFormData.value[paymentTypeId] = { checkDate: '', nationalCode: '', fullName: '', sayadRegistered: false };
  }
  return checkFormData.value[paymentTypeId];
};

const handleCheckUpload = async (paymentTypeId) => {
  const files = getSelectedCheckFiles(paymentTypeId);
  if (!files.length) {
    showFeedback('حداقل یک فایل انتخاب کنید.', 'error');
    return;
  }

  const form = getCheckForm(paymentTypeId);
  if (!form.checkDate) {
    showFeedback('تاریخ چک الزامی است.', 'error');
    return;
  }
  if (!form.nationalCode || !/^\d{10}$/.test(form.nationalCode)) {
    showFeedback('کد ملی باید ۱۰ رقم باشد.', 'error');
    return;
  }
  if (!form.fullName || form.fullName.trim().length < 3) {
    showFeedback('نام و نام خانوادگی الزامی است.', 'error');
    return;
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });
  formData.append('checkDate', form.checkDate);
  formData.append('nationalCode', form.nationalCode);
  formData.append('fullName', form.fullName.trim());
  formData.append('sayadRegistered', form.sayadRegistered ? 'true' : 'false');

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

  const { isConfirmed } = await Swal.fire({ title: 'تکمیل پرداخت', text: 'همه پرداخت‌ها تکمیل شده‌اند. پرونده به مرحله انتقال امتیاز برود؟', icon: 'question', confirmButtonText: 'بله، ادامه', cancelButtonText: 'انصراف', showCancelButton: true, reverseButtons: true });
  if (!isConfirmed) {
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

    <div v-if="isLockedByAdminReview" class="payment-feedback tone-error">
      این پرونده در حال بررسی مدیریت است و تا پایان بررسی، پرداخت یا تغییر مرحله از سمت شما غیرفعال شده است.
    </div>

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
          <div v-if="item.status === 'done' && item.values" class="check-extra-info">
            <div v-if="item.values.checkDate" class="check-info-row">
              <span>تاریخ چک:</span>
              <strong>{{ item.values.checkDate }}</strong>
            </div>
            <div v-if="item.values.fullName" class="check-info-row">
              <span>نام صاحب چک:</span>
              <strong>{{ item.values.fullName }}</strong>
            </div>
            <div v-if="item.values.nationalCode" class="check-info-row">
              <span>کد ملی:</span>
              <strong>{{ item.values.nationalCode }}</strong>
            </div>
            <div class="check-info-row">
              <span>ثبت در سامانه صیاد:</span>
              <strong>{{ item.values.sayadRegistered ? 'بله' : 'خیر' }}</strong>
            </div>
          </div>

          <div v-if="isActiveStep && item.status !== 'done'" class="check-extra-form">
            <div class="check-form-row">
              <label class="check-form-label">تاریخ چک <span class="check-form-required">*</span></label>
              <PersianDatePickerInput
                :model-value="getCheckForm(item.id).checkDate"
                placeholder="تاریخ چک را انتخاب کنید"
                @update:model-value="getCheckForm(item.id).checkDate = $event"
              />
            </div>
            <div class="check-form-row">
              <label class="check-form-label">کد ملی صاحب چک <span class="check-form-required">*</span></label>
              <input
                v-model="getCheckForm(item.id).nationalCode"
                type="text"
                class="check-form-input"
                maxlength="10"
                placeholder="کد ملی ۱۰ رقمی"
                inputmode="numeric"
              />
            </div>
            <div class="check-form-row">
              <label class="check-form-label">نام و نام خانوادگی <span class="check-form-required">*</span></label>
              <input
                v-model="getCheckForm(item.id).fullName"
                type="text"
                class="check-form-input"
                maxlength="100"
                placeholder="نام و نام خانوادگی صاحب چک"
              />
            </div>
            <div class="check-form-row check-form-row--checkbox">
              <label class="check-form-checkbox-label">
                <input
                  v-model="getCheckForm(item.id).sayadRegistered"
                  type="checkbox"
                  class="check-form-checkbox"
                />
                <span>چک در سامانه صیاد ثبت شده است</span>
              </label>
            </div>
          </div>

          <div v-if="getUploadedCheckFiles(item).length" class="payment-uploaded-files">
            <strong>فایل‌های ثبت‌شده</strong>
            <div class="payment-selected-file-list">
              <a
                v-for="file in getUploadedCheckFiles(item)"
                :key="file.fileId || file.fileUrl || file.fileName"
                :href="file.downloadUrl || file.fileUrl"
                download
                class="payment-file-chip payment-file-chip--uploaded"
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

<style scoped src="./styles/CustomerDealPaymentStage.css"></style>
