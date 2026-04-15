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

<style scoped src="./styles/SelfValidationView.css"></style>
