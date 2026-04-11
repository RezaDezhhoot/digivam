<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getValidationStages, getValidationStatus, submitSelfValidation } from '../services/customer-panel.api.js';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorText = ref('');
const submitting = ref(false);
const submitSuccess = ref(false);
const submitMessage = ref('');

const validationId = ref(null);
const validationData = ref(null);
const existingRecord = ref(null);

const selectedFile = ref(null);
const dragActive = ref(false);
const showTrainingVideo = ref(false);

const allowedTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff'
];

const allowedExtensions = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff';
const maxFileSize = 100 * 1024 * 1024;

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isValidFile = (file) => {
  if (!file) return false;
  if (file.size > maxFileSize) return false;
  if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) return false;
  return true;
};

const onFileChange = (event) => {
  const file = event.target.files?.[0];
  if (file && isValidFile(file)) {
    selectedFile.value = file;
  } else if (file) {
    errorText.value = 'فرمت یا حجم فایل مجاز نیست. حداکثر ۱۰۰ مگابایت، فرمت‌های PDF، Word یا تصویری.';
    setTimeout(() => { errorText.value = ''; }, 5000);
  }
};

const onDrop = (event) => {
  dragActive.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file && isValidFile(file)) {
    selectedFile.value = file;
  } else if (file) {
    errorText.value = 'فرمت یا حجم فایل مجاز نیست. حداکثر ۱۰۰ مگابایت، فرمت‌های PDF، Word یا تصویری.';
    setTimeout(() => { errorText.value = ''; }, 5000);
  }
};

const removeFile = () => {
  selectedFile.value = null;
};

const closeView = () => {
  router.back();
};

const statusLabel = computed(() => (selectedFile.value ? 'آماده ارسال' : 'در انتظار بارگذاری گزارش'));
const pageTitle = computed(() => validationData.value?.title || 'اعتبارسنجی');
const pageSubtitle = computed(() => validationData.value?.subtitle || 'بارگذاری گزارش اعتبارسنجی');
const guideTitle = computed(() => validationData.value?.guideTitle || 'راهنما');
const guideText = computed(() => validationData.value?.guide || '');
const uploadTitle = computed(() => validationData.value?.uploadLabel || 'بارگذاری گزارش');
const noteText = computed(() => validationData.value?.note || '');
const backLabel = computed(() => validationData.value?.backLabel || 'بازگشت به انتخاب روش');
const trainingVideoUrl = computed(() => validationData.value?.trainingVideoUrl || route.query.videoUrl || '');

const handleSubmit = async () => {
  if (!selectedFile.value || submitting.value) return;

  submitting.value = true;
  errorText.value = '';

  try {
    const formData = new FormData();
    formData.append('validationId', String(validationId.value));
    formData.append('file', selectedFile.value);

    const result = await submitSelfValidation(formData);
    submitSuccess.value = true;
    submitMessage.value = result.message || 'گزارش شما با موفقیت ثبت شد';
  } catch (error) {
    errorText.value = error.message || 'خطا در ارسال گزارش';
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  validationId.value = Number(route.params.validationId);

  if (!validationId.value) {
    errorText.value = 'شناسه اعتبارسنجی نامعتبر است';
    loading.value = false;
    return;
  }

  try {
    const [statusData, stagesData] = await Promise.all([
      getValidationStatus(validationId.value),
      getValidationStages(validationId.value)
    ]);

    if (statusData.hasRecord && ['submit', 'pending', 'approved'].includes(statusData.item?.status)) {
      existingRecord.value = statusData.item;
    } else {
      existingRecord.value = null;
    }

    validationData.value = {
      title: stagesData?.title || route.query.title || 'اعتبارسنجی',
      subtitle: route.query.subtitle || 'بارگذاری گزارش اعتبارسنجی',
      guideTitle: route.query.guideTitle || 'راهنما',
      guide: stagesData?.selfValidationGuide || route.query.guide || '',
      note: stagesData?.selfValidationNote || route.query.note || '',
      uploadLabel: stagesData?.selfValidationUploadLabel || route.query.uploadLabel || 'بارگذاری گزارش',
      trainingVideoUrl: stagesData?.trainingVideoUrl || route.query.videoUrl || '',
      backLabel: route.query.backLabel || 'بازگشت به انتخاب روش'
    };
  } catch (error) {
    errorText.value = error.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="sv-page">
    <div class="sv-backdrop"></div>
    <div class="sv-shell">
      <div class="sv-modal-card">
        <button type="button" class="sv-close-btn" @click="closeView">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div v-if="loading" class="sv-loading">
          <i class="fa-solid fa-spinner fa-spin"></i>
          در حال بارگذاری ...
        </div>

        <template v-else-if="submitSuccess">
          <div class="sv-success-card">
            <i class="fa-solid fa-circle-check"></i>
            <h2>گزارش ارسال شد</h2>
            <p>{{ submitMessage }}</p>
            <p class="sv-success-note">گزارش شما توسط کارشناسان بررسی خواهد شد و نتیجه از طریق اعلان‌ها اطلاع‌رسانی می‌شود.</p>
            <div class="sv-success-actions">
              <button type="button" class="sv-btn sv-btn-primary" @click="router.push('/customer/validations')">مشاهده اعتبارسنجی‌های من</button>
              <button type="button" class="sv-btn sv-btn-ghost" @click="closeView">بازگشت</button>
            </div>
          </div>
        </template>

        <template v-else-if="existingRecord">
          <div class="sv-status-card">
            <i class="fa-solid fa-info-circle"></i>
            <h2>درخواست فعال</h2>
            <p>شما قبلا برای این اعتبارسنجی درخواست ثبت کرده‌اید.</p>
            <div class="sv-status-info">
              <span>وضعیت: <strong :style="{ color: existingRecord.statusColor }">{{ existingRecord.statusLabel }}</strong></span>
            </div>
            <button type="button" class="sv-btn sv-btn-primary" @click="router.push('/customer/validations')">مشاهده اعتبارسنجی‌های من</button>
          </div>
        </template>

        <template v-else>
          <div class="sv-header-row">
            <div class="sv-header-copy">
              <h1>{{ pageTitle }}</h1>
              <p>{{ pageSubtitle }}</p>
              <button type="button" class="sv-back-link" @click="closeView">
                <i class="fa-solid fa-arrow-right"></i>
                {{ backLabel }}
              </button>
            </div>
          </div>

          <div class="sv-info-grid">
            <div v-if="guideText" class="sv-guide-panel">
              <div class="sv-panel-head">
                <span class="sv-panel-dot"></span>
                <strong>{{ guideTitle }}</strong>
              </div>
              <p>{{ guideText }}</p>
            </div>

            <div v-if="trainingVideoUrl" class="sv-guide-panel sv-guide-panel-alt">
              <div class="sv-panel-head">
                <span class="sv-panel-dot"></span>
                <strong>راهنمای تصویری</strong>
              </div>
              <p>برای مشاهده راهنمای تصویری اعتبارسنجی، ویدیو را باز کنید.</p>
              <button type="button" class="sv-video-toggle" @click="showTrainingVideo = !showTrainingVideo">
                <i :class="showTrainingVideo ? 'fa-solid fa-eye-slash' : 'fa-solid fa-play'"></i>
                {{ showTrainingVideo ? 'بستن ویدیو' : 'مشاهده ویدیو' }}
              </button>
              <Transition name="sv-video-slide">
                <video v-if="showTrainingVideo" :src="trainingVideoUrl" controls preload="metadata" class="sv-video-player"></video>
              </Transition>
            </div>
          </div>

          <div class="sv-upload-card">
            <div class="sv-upload-head">
              <strong>{{ uploadTitle }}</strong>
              <span>فرمت‌های مجاز: تصویر، PDF، Word</span>
            </div>

            <div
              class="sv-dropzone"
              :class="{ active: dragActive, 'has-file': selectedFile }"
              @dragover.prevent="dragActive = true"
              @dragleave.prevent="dragActive = false"
              @drop.prevent="onDrop"
            >
              <template v-if="selectedFile">
                <div class="sv-file-preview">
                  <i class="fa-solid fa-file-lines"></i>
                  <div class="sv-file-info">
                    <span class="sv-file-name">{{ selectedFile.name }}</span>
                    <span class="sv-file-size">{{ formatFileSize(selectedFile.size) }}</span>
                  </div>
                  <button type="button" class="sv-file-remove" @click="removeFile">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </template>
              <template v-else>
                <i class="fa-solid fa-cloud-arrow-up sv-dropzone-icon"></i>
                <p>برای شروع آپلود، فایل خود را درگ کنید</p>
                <div class="sv-dropzone-divider">
                  <span></span>
                  <em>یا</em>
                  <span></span>
                </div>
                <label class="sv-browse-btn">
                  مرور فایل‌ها
                  <input type="file" :accept="allowedExtensions" class="d-none" @change="onFileChange" />
                </label>
              </template>
            </div>
          </div>

          <div v-if="noteText" class="sv-note-box">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>
              <strong>نکته مهم</strong>
              <p>{{ noteText }}</p>
            </div>
          </div>

          <div v-if="errorText" class="sv-error">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ errorText }}
          </div>

          <div class="sv-status-bar">
            <span>{{ statusLabel }}</span>
          </div>

          <button
            type="button"
            class="sv-submit-btn"
            :disabled="!selectedFile || submitting"
            @click="handleSubmit"
          >
            <i v-if="submitting" class="fa-solid fa-spinner fa-spin"></i>
            {{ submitting ? 'در حال ارسال ...' : 'ارسال گزارش' }}
          </button>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sv-page {
  min-height: 100vh;
  position: relative;
  padding: 24px 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.sv-backdrop {
  position: absolute;
  inset: 0;
  backdrop-filter: blur(12px);
}

.sv-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 680px;
}

.sv-modal-card {
  position: relative;
  padding: 22px 20px 18px;
  border-radius: 24px;
  background: var(--web-surface);
  border: 1px solid rgba(148, 163, 184, 0.15);
  box-shadow: 0 36px 120px rgba(5, 10, 18, 0.48);
  color: var(--bs-heading-color);
  direction: rtl;
}

.sv-loading {
  text-align: center;
  padding: 60px 0;
  color: var(--bs-heading-color);
  font-size: 15px;
}

.sv-loading i {
  display: block;
  font-size: 28px;
  margin-bottom: 12px;
}

.sv-close-btn {
  position: absolute;
  top: 18px;
  left: 18px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  background: rgba(71, 85, 105, 0.2);
  color: var(--bs-heading-color);
  cursor: pointer;
}

.sv-close-btn:hover {
  background: rgba(71, 85, 105, 0.36);
}

.sv-header-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;
  padding-left: 44px;
}

.sv-header-copy {
  text-align: right;
  width: 100%;
}

.sv-header-copy h1 {
  font-size: 30px;
  line-height: 1.2;
  margin: 0;
  font-weight: 800;
    color: var(--bs-heading-color);
}

.sv-header-copy p {
  margin: 6px 0 10px;
  font-size: 13px;
    color: var(--bs-heading-color);
}

.sv-back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
    color: var(--bs-heading-color);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.sv-back-link:hover {
    color: var(--bs-heading-color);
}

.sv-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.sv-guide-panel {
  min-height: 96px;
  padding: 16px;
  border-radius: 14px;
  background: var(--web-surface-soft);
  border: 1px solid rgba(59, 130, 246, 0.18);
}

.sv-guide-panel-alt {
  background: var(--web-surface-soft);
}

.sv-panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.sv-panel-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #3b82f6;
  flex-shrink: 0;
}

.sv-panel-head strong {
  font-size: 15px;
  font-weight: 700;
  color: #60a5fa;
  text-align: right;
}

.sv-guide-panel p {
  margin: 0;
  font-size: 12px;
    color: var(--bs-heading-color);
  line-height: 1.9;
  white-space: pre-line;
  text-align: right;
}

.sv-video-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(128deg, #1b75d1 9%, #0e3c6b 100%);
    color: var(--bs-heading-color);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.sv-video-toggle:hover {
  opacity: 0.9;
}

.sv-video-player {
  width: 100%;
  border-radius: 12px;
  max-height: 280px;
  margin-top: 12px;
  background: #000;
}

.sv-video-slide-enter-active,
.sv-video-slide-leave-active {
  transition: all 0.28s ease;
  overflow: hidden;
}

.sv-video-slide-enter-from,
.sv-video-slide-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
}

.sv-upload-card {
  margin-bottom: 12px;
  padding: 16px;
  border-radius: 16px;
  background: var(--web-surface-soft);
  border: 1px solid rgba(59, 130, 246, 0.18);
}

.sv-upload-head {
  margin-bottom: 14px;
  text-align: right;
}

.sv-upload-head strong {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: var(--bs-heading-color);
}

.sv-upload-head span {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--bs-heading-color);
}

.sv-dropzone {
  border: 2px dashed var(--web-border, #d1d5db);
  border-radius: 14px;
  padding: 28px 18px;
  text-align: center;
  transition: border-color 0.2s, background 0.2s;
  cursor: pointer;
  background: var(--web-surface-soft);
  border-color: rgba(229, 62, 62, 0.45);
}

.sv-dropzone.active {
  border-color: #f87171;
  background: #ffe9e9;
}

.sv-dropzone.has-file {
  border-style: solid;
  border-color: rgba(74, 222, 128, 0.75);
  background: #edfdf3;
  padding: 18px;
}

.sv-dropzone-icon {
  font-size: 30px;
  color: #f87171;
  margin-bottom: 10px;
}

.sv-dropzone p {
  margin: 0 0 4px;
  color: var(--bs-heading-color);
  font-size: 13px;
  font-weight: 700;
}

.sv-dropzone-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 220px;
  margin: 2px auto 0;
}

.sv-dropzone-divider span {
  flex: 1;
  height: 1px;
  background: rgba(148, 163, 184, 0.4);
}

.sv-dropzone-divider em {
  font-style: normal;
  font-size: 12px;
  color: #64748b;
}

.sv-browse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  min-height: 36px;
  padding: 0 16px;
  background: #fff1f2;
  color: #b91c1c;
  border: 1px solid rgba(248, 113, 113, 0.6);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.sv-browse-btn:hover {
  background: #ffe4e6;
}

.sv-file-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: right;
}

.sv-file-preview > i {
  font-size: 28px;
  color: #4ade80;
  flex-shrink: 0;
}

.sv-file-info {
  flex: 1;
  min-width: 0;
  text-align: right;
}

.sv-file-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sv-file-size {
  font-size: 12px;
  color: #64748b;
}

.sv-file-remove {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff1f2;
  border: 1px solid rgba(248, 113, 113, 0.35);
  border-radius: 8px;
  color: #dc2626;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 14px;
}

.sv-file-remove:hover {
  background: #ffe4e6;
}

.sv-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 12px;
  color: #be123c;
  font-size: 13px;
  margin-bottom: 16px;
}

.sv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.sv-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sv-btn-primary {
  background: linear-gradient(135deg, #d35a5a 0%, #b53d45 100%);
  color: #fff;
}

.sv-btn-primary:hover:not(:disabled) {
  opacity: 0.85;
}

.sv-btn-ghost {
  background: transparent;
  color: var(--bs-heading-color);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.sv-btn-ghost:hover {
  background: rgba(71, 85, 105, 0.22);
}

.sv-submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  padding: 0 14px;
  font-size: 15px;
  font-weight: 700;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #d35a5a 0%, #b53d45 100%);
  color: var(--bs-heading-color);
  cursor: pointer;
}

.sv-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sv-submit-btn:not(:disabled):hover {
  opacity: 0.9;
}

.sv-success-card,
.sv-status-card {
  text-align: right;
  padding: 36px 20px;
  background: #ffffff;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 18px;
}

.sv-success-card > i {
  font-size: 48px;
  color: #22a06b;
  margin-bottom: 16px;
  display: block;
  text-align: center;
}

.sv-status-card > i {
  font-size: 48px;
  color: #6366f1;
  margin-bottom: 16px;
  display: block;
  text-align: center;
}

.sv-success-card h2,
.sv-status-card h2 {
  font-size: 18px;
  font-weight: 800;
  margin: 0 0 8px;
  color: #0f172a;
}

.sv-success-card p,
.sv-status-card p {
  color: #475569;
  font-size: 13px;
  margin: 0 0 6px;
}

.sv-success-note {
  font-size: 12px !important;
  color: #64748b !important;
}

.sv-success-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  margin-top: 24px;
}

.sv-status-info {
  margin: 14px 0 20px;
  font-size: 14px;
  color: #0f172a;
}

.sv-note-box {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: #fff8e8;
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 14px;
  margin-bottom: 12px;
}

.sv-note-box > i {
  font-size: 20px;
  color: #f59e0b;
  flex-shrink: 0;
  margin-top: 2px;
}

.sv-note-box strong {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #fbbf24;
  margin-bottom: 4px;
}

.sv-note-box p {
  margin: 0;
  font-size: 13px;
  color: #92400e;
  line-height: 1.8;
  white-space: pre-line;
}

.sv-status-bar {
  padding: 10px 14px;
  border-radius: 10px;
  background: #fef2f2;
  text-align: center;
  margin-bottom: 12px;
}

.sv-status-bar span {
  font-size: 12px;
  font-weight: 600;
  color: #991b1b;
}

@media (max-width: 640px) {
  .sv-page {
    padding: 10px;
    align-items: flex-start;
  }

  .sv-modal-card {
    padding: 18px 14px 16px;
    border-radius: 20px;
  }

  .sv-header-copy h1 {
    font-size: 24px;
  }

  .sv-info-grid {
    grid-template-columns: 1fr;
  }

  .sv-dropzone {
    padding: 22px 12px;
  }

  .sv-success-actions {
    flex-direction: column;
  }

  .sv-close-btn {
    top: 16px;
    left: 16px;
  }
}
</style>
