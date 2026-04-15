<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ShamsiDateInput from '../components/ShamsiDateInput.vue';
import {
  finalizeValidation,
  getValidationStages,
  getValidationStatus,
  initValidation,
  resubmitValidation,
  saveValidationStage,
  startValidationPayment,
  verifyValidationPayment
} from '../services/customer-panel.api.js';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const errorText = ref('');
const validation = ref(null);
const existingRecord = ref(null);
const isResubmit = ref(false);
const customerValidationId = ref(null);

const currentStageIndex = ref(0);
const formData = ref({});
const formFiles = ref({});
const fieldErrors = ref({});
const submitting = ref(false);
const stageSaving = ref(false);
const submitSuccess = ref(false);
const showPaymentStep = ref(false);
const paymentDone = ref(false);
const paymentLoading = ref(false);
const paymentMessage = ref('');
const paymentInvoice = ref(null);

const stages = computed(() => validation.value?.stages || []);
const hasCost = computed(() => Number(validation.value?.amount || 0) > 0);
const totalSteps = computed(() => stages.value.length + (showPaymentStep.value ? 1 : 0));
const isPaymentStep = computed(() => showPaymentStep.value && currentStageIndex.value === 0);
const adjustedStageIndex = computed(() => showPaymentStep.value ? currentStageIndex.value - 1 : currentStageIndex.value);
const actualStage = computed(() => stages.value[adjustedStageIndex.value] || null);
const isLastStep = computed(() => currentStageIndex.value === totalSteps.value - 1);
const hasPaymentCallback = computed(() => Boolean(route.query.Authority && route.query.Status));

const formatMoney = (value) => `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} تومان`;

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const getFieldPlaceholder = (item) => {
  if (item.fieldType === 'text' && item.max) return `حداکثر ${item.max} کاراکتر`;
  if (item.fieldType === 'number' && item.max) return `حداکثر ${item.max}`;
  return item.help || item.title;
};

const getFieldConstraints = (item) => {
  const constraints = [];
  if (item.required) constraints.push('الزامی');
  if (item.fieldType === 'file' && item.mimes) constraints.push(`فرمت: ${item.mimes.split(',').map(m => m.split('/').pop()).join(', ')}`);
  if (item.fieldType === 'file' && item.max) constraints.push(`حداکثر حجم: ${formatFileSize(item.max)}`);
  if (item.fieldType === 'text' && item.max) constraints.push(`حداکثر ${item.max} کاراکتر`);
  if (item.fieldType === 'number' && item.max) constraints.push(`حداکثر ${item.max}`);
  return constraints;
};

const getFieldIcon = (item) => {
  const map = { file: 'fa-solid fa-cloud-arrow-up', text: 'fa-solid fa-font', number: 'fa-solid fa-hashtag', date: 'fa-solid fa-calendar-days', image: 'fa-solid fa-image' };
  return map[item.fieldType] || 'fa-solid fa-circle-dot';
};

const resetPaymentState = () => {
  paymentDone.value = false;
  paymentLoading.value = false;
  paymentMessage.value = '';
  paymentInvoice.value = null;
};

const ensureCustomerValidationRecord = async () => {
  if (customerValidationId.value) return customerValidationId.value;

  if (!hasCost.value) {
    const data = await initValidation({ validationId: validation.value.id });
    customerValidationId.value = data.customerValidationId;
    return customerValidationId.value;
  }

  throw new Error('ابتدا پرداخت اعتبارسنجی را تکمیل کنید');
};

const saveCurrentStage = async () => {
  const recordId = await ensureCustomerValidationRecord();
  const stage = actualStage.value;
  if (!stage) return;

  const fd = new FormData();
  fd.append('stageIndex', String(adjustedStageIndex.value));

  const fields = {};
  for (const item of stage.items) {
    if (item.type !== 'document') continue;
    const fieldKey = `field_${item.documentId}`;
    if (item.fieldType === 'file' || item.fieldType === 'image') {
      const file = formFiles.value[fieldKey];
      if (file) fd.append(fieldKey, file);
    } else {
      fields[fieldKey] = formData.value[fieldKey] ?? '';
    }
  }

  fd.append('fields', JSON.stringify(fields));
  await saveValidationStage(recordId, fd);
};

const applyPaymentVerificationResult = (payload) => {
  paymentDone.value = Boolean(payload?.paid);
  paymentInvoice.value = payload?.invoice || null;
  paymentMessage.value = payload?.message || '';

  if (payload?.customerValidationId) {
    customerValidationId.value = payload.customerValidationId;
  }

  if (paymentDone.value && showPaymentStep.value && totalSteps.value > 1) {
    currentStageIndex.value = 1;
  }
};

const verifyReturnedPayment = async (validationId) => {
  if (!hasPaymentCallback.value || isResubmit.value) return;
  paymentLoading.value = true;
  try {
    const data = await verifyValidationPayment({
      validationId,
      Authority: String(route.query.Authority || ''),
      Status: String(route.query.Status || '')
    });
    applyPaymentVerificationResult(data);
    if (!data.paid) errorText.value = data.message || 'پرداخت تایید نشد';
  } catch (error) {
    errorText.value = error.message;
  } finally {
    paymentLoading.value = false;
    if (hasPaymentCallback.value) {
      router.replace({ path: route.path, query: {} }).catch(() => {});
    }
  }
};

const validateCurrentStage = () => {
  if (isPaymentStep.value) {
    if (!paymentDone.value) {
      errorText.value = 'ابتدا پرداخت اعتبارسنجی را با موفقیت انجام دهید';
      return false;
    }
    errorText.value = '';
    return true;
  }

  const stage = actualStage.value;
  if (!stage) return true;

  const perFieldErrors = {};
  let hasError = false;

  for (const item of stage.items) {
    if (item.type !== 'document' || !item.required) continue;
    const fieldKey = `field_${item.documentId}`;

    if (item.fieldType === 'file' || item.fieldType === 'image') {
      const hasNewFile = !!formFiles.value[fieldKey];
      const hasExistingFile = typeof formData.value[fieldKey] === 'number';
      if (!hasNewFile && !hasExistingFile) {
        perFieldErrors[fieldKey] = 'این فیلد الزامی است';
        hasError = true;
      }
    } else {
      const val = formData.value[fieldKey];
      if (val === undefined || val === null || String(val).trim() === '') {
        perFieldErrors[fieldKey] = 'این فیلد الزامی است';
        hasError = true;
      }
    }

    if ((item.fieldType === 'text') && item.max && formData.value[fieldKey]) {
      if (String(formData.value[fieldKey]).length > Number(item.max)) {
        perFieldErrors[fieldKey] = `حداکثر ${item.max} کاراکتر`;
        hasError = true;
      }
    }
  }

  fieldErrors.value = perFieldErrors;

  if (hasError) {
    errorText.value = 'لطفا فیلدهای مشخص‌شده را تکمیل کنید';
    return false;
  }

  errorText.value = '';
  return true;
};

const goNext = async () => {
  if (!validateCurrentStage()) return;

  if (!isPaymentStep.value) {
    stageSaving.value = true;
    errorText.value = '';
    try {
      await saveCurrentStage();
    } catch (error) {
      errorText.value = error.message;
      stageSaving.value = false;
      return;
    }
    stageSaving.value = false;
  }

  if (currentStageIndex.value < totalSteps.value - 1) {
    currentStageIndex.value++;
    errorText.value = '';
    fieldErrors.value = {};
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const goPrev = () => {
  if (currentStageIndex.value > 0) {
    currentStageIndex.value--;
    errorText.value = '';
    fieldErrors.value = {};
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const handleFileChange = (documentId, event) => {
  const file = event.target.files?.[0];
  if (file) formFiles.value[`field_${documentId}`] = file;
};

const handlePayment = async () => {
  if (!validation.value?.id) return;
  paymentLoading.value = true;
  errorText.value = '';
  paymentMessage.value = '';
  try {
    const data = await startValidationPayment({ validationId: validation.value.id });
    paymentInvoice.value = data.invoice || null;
    paymentMessage.value = data.message || 'در حال انتقال به درگاه پرداخت';
    if (!data.paymentLink) throw new Error('لینک پرداخت ایجاد نشد');
    window.location.assign(data.paymentLink);
  } catch (error) {
    errorText.value = error.message;
    paymentLoading.value = false;
  }
};

const handleSubmit = async () => {
  if (!validateCurrentStage()) return;
  submitting.value = true;
  errorText.value = '';
  try {
    await saveCurrentStage();

    if (isResubmit.value && existingRecord.value) {
      const fd = new FormData();
      fd.append('data', JSON.stringify({}));
      await resubmitValidation(existingRecord.value.id, fd);
    } else {
      const recordId = await ensureCustomerValidationRecord();
      await finalizeValidation(recordId);
    }

    submitSuccess.value = true;
    resetPaymentState();
  } catch (error) {
    errorText.value = error.message;
  } finally {
    submitting.value = false;
  }
};

const prefillFromExistingData = (data) => {
  if (!data) return;
  const existingStages = Array.isArray(data.stages) ? data.stages : [];
  for (const stage of existingStages) {
    for (const item of Array.isArray(stage?.items) ? stage.items : []) {
      if (!item?.documentId) continue;
      const fieldKey = `field_${item.documentId}`;
      if (item.value !== undefined && item.value !== null && item.value !== '' && item.value !== '__file_pending__') {
        formData.value[fieldKey] = item.value;
      }
    }
  }
};

const findResumeStageIndex = (data) => {
  if (!data) return 0;
  const existingStages = Array.isArray(data.stages) ? data.stages : [];
  for (let i = 0; i < existingStages.length; i++) {
    const items = Array.isArray(existingStages[i]?.items) ? existingStages[i].items : [];
    const hasEmptyRequired = items.some(
      (item) => item?.documentId && item?.value === null
    );
    if (hasEmptyRequired || !items.length) return i;
  }
  return existingStages.length > 0 ? existingStages.length - 1 : 0;
};

const load = async () => {
  loading.value = true;
  errorText.value = '';
  validation.value = null;
  existingRecord.value = null;
  isResubmit.value = false;
  submitSuccess.value = false;
  customerValidationId.value = null;
  formData.value = {};
  formFiles.value = {};
  resetPaymentState();

  try {
    const validationId = Number(route.params.validationId);
    if (!validationId) {
      errorText.value = 'شناسه اعتبارسنجی نامعتبر است';
      loading.value = false;
      return;
    }

    const [stagesData, statusData] = await Promise.all([
      getValidationStages(validationId),
      getValidationStatus(validationId)
    ]);

    validation.value = stagesData;

    if (statusData.hasRecord && statusData.item) {
      existingRecord.value = statusData.item;

      if (statusData.item.status === 'approved') {
        router.replace('/customer/validations');
        return;
      }

      if (statusData.item.status === 'pending') return;

      if (statusData.item.status === 'submit') {
        if (statusData.item.selfValidation) {
          router.replace(`/customer/self-validation/${validationId}`);
          return;
        }
        customerValidationId.value = statusData.item.id;
        prefillFromExistingData(statusData.item.data);
        const cost = Number(stagesData.amount || 0);
        showPaymentStep.value = false;
        paymentDone.value = cost > 0;
        const resumeIdx = findResumeStageIndex(statusData.item.data);
        currentStageIndex.value = resumeIdx;
        loading.value = false;
        return;
      }

      if (statusData.item.status === 'rejected') {
        if (statusData.item.selfValidation) {
          router.replace(`/customer/self-validation/${validationId}`);
          return;
        }
        isResubmit.value = true;
        customerValidationId.value = statusData.item.id;
        prefillFromExistingData(statusData.item.data);
      }

      if (statusData.item.status === 'expired') {
        existingRecord.value = null;
        isResubmit.value = false;
      }
    }

    const cost = Number(stagesData.amount || 0);
    showPaymentStep.value = cost > 0 && !isResubmit.value;
    currentStageIndex.value = 0;

    if (showPaymentStep.value && hasPaymentCallback.value) {
      await verifyReturnedPayment(validationId);
    }
  } catch (error) {
    errorText.value = error.message;
  } finally {
    loading.value = false;
  }
};

onMounted(load);
watch(() => route.params.validationId, load);
</script>

<template>
  <section class="vf-view">
    <div class="vf-bg" aria-hidden="true">
      <span class="vf-bg-orb vf-bg-orb-1"></span>
      <span class="vf-bg-orb vf-bg-orb-2"></span>
      <span class="vf-bg-orb vf-bg-orb-3"></span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="vf-loading-card">
      <div class="vf-loading-pulse"><span></span><span></span><span></span></div>
      <span>در حال بارگذاری مراحل اعتبارسنجی ...</span>
    </div>

    <!-- Error -->
    <div v-else-if="!validation && errorText" class="vf-loading-card vf-loading-card--error">
      <i class="fa-solid fa-circle-exclamation"></i>
      <span>{{ errorText }}</span>
    </div>

    <!-- Pending Status -->
    <template v-else-if="existingRecord && existingRecord.status === 'pending'">
      <div class="vf-result-card vf-result-card--pending">
        <div class="vf-result-illustration">
          <div class="vf-result-ring"><div class="vf-result-ring-inner"><i class="fa-solid fa-hourglass-half"></i></div></div>
        </div>
        <h2>اعتبارسنجی در انتظار بررسی</h2>
        <p>اعتبارسنجی شما ثبت شده و توسط کارشناسان در حال بررسی است.<br>نتیجه از طریق اعلان و پیامک اطلاع‌رسانی خواهد شد.</p>
        <div class="vf-result-meta">
          <span><i class="fa-solid fa-clipboard-check"></i> {{ existingRecord.validationTitle }}</span>
          <span><i class="fa-solid fa-calendar"></i> {{ existingRecord.createdAtLabel }}</span>
        </div>
        <button type="button" class="vf-btn vf-btn-secondary" @click="router.push('/customer/dashboard')">
          <i class="fa-solid fa-arrow-right"></i> بازگشت به داشبورد
        </button>
      </div>
    </template>

    <!-- Success -->
    <template v-else-if="submitSuccess">
      <div class="vf-result-card vf-result-card--success">
        <div class="vf-result-illustration">
          <div class="vf-result-ring vf-result-ring--success"><div class="vf-result-ring-inner"><i class="fa-solid fa-check"></i></div></div>
        </div>
        <h2>اعتبارسنجی با موفقیت ثبت شد!</h2>
        <p>اطلاعات شما ارسال شد و در انتظار بررسی توسط کارشناسان است.</p>
        <div class="vf-result-actions">
          <button type="button" class="vf-btn vf-btn-primary" @click="router.push('/customer/validations')">
            <i class="fa-solid fa-list-check"></i> مشاهده اعتبارسنجی‌ها
          </button>
          <button type="button" class="vf-btn vf-btn-ghost" @click="router.push('/customer/dashboard')">بازگشت به داشبورد</button>
        </div>
      </div>
    </template>

    <!-- Main Wizard -->
    <template v-else-if="validation">
      <div class="vf-shell">
        <aside class="vf-sidebar">
          <div class="vf-side-card vf-side-card--brand">
            <span class="vf-side-kicker">نقشه مسیر اعتبارسنجی</span>
            <h2>{{ isResubmit ? 'ارسال مجدد پرونده' : (validation.introTitle || validation.title || 'اعتبارسنجی توسط دیجی وام') }}</h2>
            <p>{{ validation.introDescription || validation.description || 'مراحل را قدم‌به‌قدم تکمیل کنید تا وضعیت شما برای ثبت درخواست وام آماده شود.' }}</p>

            <div class="vf-side-stats">
              <div class="vf-side-stat">
                <span>مرحله فعلی</span>
                <strong>{{ currentStageIndex + 1 }} / {{ totalSteps }}</strong>
              </div>
              <div class="vf-side-stat">
                <span>هزینه</span>
                <strong>{{ hasCost ? formatMoney(validation.amount) : 'رایگان' }}</strong>
              </div>
              <div class="vf-side-stat">
                <span>اعتبار</span>
                <strong>{{ validation.validForLabel || 'بدون انقضا' }}</strong>
              </div>
              <div class="vf-side-stat">
                <span>وضعیت</span>
                <strong>{{ isResubmit ? 'در حال اصلاح' : 'در حال تکمیل' }}</strong>
              </div>
            </div>
          </div>

          <div class="vf-side-card">
            <div class="vf-side-progress-head">
              <strong>پیشرفت تکمیل</strong>
              <span>{{ Math.round(((currentStageIndex + 1) / totalSteps) * 100) }}%</span>
            </div>
            <div class="vf-side-progress-track"><span :style="{ width: `${((currentStageIndex + 1) / totalSteps) * 100}%` }"></span></div>
            <p class="vf-side-progress-copy">از نوار مرحله‌ای سمت راست برای درک بهتر مسیر و از این باکس برای دید سریع به وضعیت فعلی استفاده کنید.</p>
          </div>

          <div v-if="isResubmit && existingRecord?.result" class="vf-side-card vf-side-card--warning">
            <div class="vf-reject-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
            <div>
              <strong>دلیل رد درخواست قبلی</strong>
              <p>{{ existingRecord.result }}</p>
            </div>
          </div>

          <div class="vf-side-card">
            <strong class="vf-side-list-title">خروجی این مسیر</strong>
            <ul class="vf-side-list">
              <li v-for="feature in (validation.featureLines || [])" :key="feature">
                <i class="fa-solid fa-circle-check"></i>
                <span>{{ feature }}</span>
              </li>
              <li v-if="!(validation.featureLines || []).length">
                <i class="fa-solid fa-circle-check"></i>
                <span>ثبت یکپارچه مدارک، پرداخت و ارسال نهایی در یک جریان واحد</span>
              </li>
            </ul>
          </div>
        </aside>

        <div class="vf-main">
          <div class="vf-hero">
            <div class="vf-hero-content">
              <div class="vf-hero-badge">
                <i class="fa-solid fa-shield-halved"></i>
                <span>{{ isResubmit ? 'ویرایش مجدد' : 'اعتبارسنجی' }}</span>
              </div>
              <h1>{{ isResubmit ? 'ارسال مجدد اعتبارسنجی' : (validation.introTitle || validation.title || 'اعتبارسنجی توسط دیجی وام') }}</h1>
              <p v-if="validation.introDescription || validation.description" class="vf-hero-desc">{{ validation.introDescription || validation.description }}</p>

              <div class="vf-hero-tags">
                <span v-if="validation.validForLabel" class="vf-hero-tag"><i class="fa-solid fa-clock"></i> {{ validation.validForLabel }}</span>
                <span class="vf-hero-tag"><i class="fa-solid fa-coins"></i> {{ hasCost ? formatMoney(validation.amount) : 'رایگان' }}</span>
                <span class="vf-hero-tag"><i class="fa-solid fa-layer-group"></i> {{ validation.stepsLabel || (stages.length + ' مرحله') }}</span>
              </div>
            </div>
            <div class="vf-hero-visual" aria-hidden="true">
              <div class="vf-hero-shield"><i class="fa-solid fa-shield-halved"></i></div>
            </div>
          </div>

          <div class="vf-stepper-wrap">
            <div class="vf-stepper">
              <div v-for="(_, idx) in totalSteps" :key="idx" class="vf-step-pair">
                <div
                  class="vf-step"
                  :class="{ 'vf-step--active': idx === currentStageIndex, 'vf-step--done': idx < currentStageIndex }"
                  @click="idx < currentStageIndex ? (currentStageIndex = idx) : null"
                >
                  <div class="vf-step-indicator">
                    <i v-if="idx < currentStageIndex" class="fa-solid fa-check"></i>
                    <span v-else>{{ idx + 1 }}</span>
                  </div>
                  <div class="vf-step-text">
                    <template v-if="showPaymentStep && idx === 0">پرداخت</template>
                    <template v-else>{{ stages[showPaymentStep ? idx - 1 : idx]?.title || `مرحله ${idx + 1}` }}</template>
                  </div>
                </div>
                <div v-if="idx < totalSteps - 1" class="vf-step-connector" :class="{ 'vf-step-connector--done': idx < currentStageIndex }"></div>
              </div>
            </div>
          </div>

          <Transition name="vf-slide">
            <div v-if="errorText" class="vf-alert vf-alert--error">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>{{ errorText }}</span>
            </div>
          </Transition>

          <Transition name="vf-fade" mode="out-in">
            <div v-if="isPaymentStep" key="payment" class="vf-card vf-card--payment">
          <div class="vf-payment">
            <div class="vf-payment-visual">
              <div class="vf-payment-icon-ring">
                <i class="fa-solid fa-credit-card"></i>
              </div>
              <div class="vf-payment-amount">{{ formatMoney(validation.amount) }}</div>
            </div>

            <h2>پرداخت هزینه اعتبارسنجی</h2>
            <p class="vf-payment-subtitle">برای شروع مراحل اعتبارسنجی، ابتدا هزینه زیر را پرداخت کنید.</p>

            <div v-if="validation.description" class="vf-payment-note">
              <i class="fa-solid fa-info-circle"></i>
              <span>{{ validation.description }}</span>
            </div>

            <div class="vf-payment-chips">
              <span v-if="validation.validForLabel" class="vf-mini-chip"><i class="fa-solid fa-clock"></i> {{ validation.validForLabel }}</span>
              <span class="vf-mini-chip"><i class="fa-solid fa-layer-group"></i> {{ stages.length }} مرحله</span>
            </div>

            <div v-if="paymentMessage" class="vf-alert" :class="paymentDone ? 'vf-alert--success' : 'vf-alert--info'">
              <i :class="paymentDone ? 'fa-solid fa-circle-check' : 'fa-solid fa-info-circle'"></i>
              <span>{{ paymentMessage }}</span>
            </div>

            <div v-if="paymentInvoice" class="vf-invoice">
              <span>فاکتور #{{ paymentInvoice.id }}</span>
              <span class="vf-invoice-status">{{ paymentInvoice.statusLabel }}</span>
            </div>

            <button v-if="!paymentDone" type="button" class="vf-btn vf-btn-primary vf-btn--lg" :disabled="paymentLoading" @click="handlePayment">
              <i :class="paymentLoading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-lock'"></i>
              {{ paymentLoading ? 'در حال انتقال...' : 'پرداخت امن و ادامه' }}
            </button>
            <div v-else class="vf-payment-done">
              <i class="fa-solid fa-circle-check"></i> پرداخت با موفقیت انجام شد
            </div>
          </div>
        </div>

        <!-- Form Steps -->
            <div v-else-if="actualStage" :key="`stage-${adjustedStageIndex}`" class="vf-card">
          <div class="vf-stage-head">
            <div class="vf-stage-number">{{ adjustedStageIndex + 1 }}</div>
            <div>
              <h2>{{ actualStage.title }}</h2>
              <p v-if="actualStage.description">{{ actualStage.description }}</p>
            </div>
            <div class="vf-stage-counter">{{ adjustedStageIndex + 1 }} / {{ stages.length }}</div>
          </div>

          <div class="vf-fields">
            <div v-for="item in actualStage.items" :key="item.id" class="vf-field" :class="{ 'vf-field--desc': item.type === 'description' }">
              <template v-if="item.type === 'document'">
                <div class="vf-field-header">
                  <div class="vf-field-icon" :class="`vf-field-icon--${item.fieldType}`">
                    <i :class="getFieldIcon(item)"></i>
                  </div>
                  <div class="vf-field-meta">
                    <h3>{{ item.title }}</h3>
                    <div class="vf-field-badges">
                      <span v-if="item.required" class="vf-badge vf-badge--required">الزامی</span>
                      <span v-else class="vf-badge vf-badge--optional">اختیاری</span>
                      <span v-for="(c, ci) in getFieldConstraints(item)" :key="ci" class="vf-badge">{{ c }}</span>
                    </div>
                  </div>
                </div>

                <p v-if="item.help" class="vf-field-help">{{ item.help }}</p>

                <div class="vf-field-input">
                  <!-- File Upload -->
                  <template v-if="item.fieldType === 'file' || item.fieldType === 'image'">
                    <label class="vf-upload" :class="{ 'vf-upload--filled': formFiles[`field_${item.documentId}`] || typeof formData[`field_${item.documentId}`] === 'number' }">
                      <input type="file" :accept="item.mimes || '*/*'" @change="handleFileChange(item.documentId, $event)" hidden>
                      <div class="vf-upload-inner">
                        <template v-if="formFiles[`field_${item.documentId}`]">
                          <i class="fa-solid fa-file-circle-check"></i>
                          <span class="vf-upload-name">{{ formFiles[`field_${item.documentId}`].name }}</span>
                          <small>{{ formatFileSize(formFiles[`field_${item.documentId}`].size) }}</small>
                        </template>
                        <template v-else-if="typeof formData[`field_${item.documentId}`] === 'number'">
                          <i class="fa-solid fa-file-circle-check"></i>
                          <span class="vf-upload-name">فایل قبلا آپلود شده</span>
                          <small>برای تغییر، فایل جدید انتخاب کنید</small>
                        </template>
                        <template v-else>
                          <i class="fa-solid fa-cloud-arrow-up"></i>
                          <span>فایل را اینجا رها کنید یا کلیک کنید</span>
                          <small v-if="item.mimes">{{ item.mimes.split(',').map(m => m.split('/').pop()).join(', ') }}</small>
                        </template>
                      </div>
                    </label>
                  </template>

                  <!-- Text -->
                  <template v-else-if="item.fieldType === 'text'">
                    <textarea
                      v-model="formData[`field_${item.documentId}`]"
                      class="vf-input"
                      rows="3"
                      :placeholder="getFieldPlaceholder(item)"
                      :maxlength="item.max || undefined"
                    ></textarea>
                    <div v-if="item.max" class="vf-input-footer">
                      <span></span>
                      <span class="vf-char-count">{{ String(formData[`field_${item.documentId}`] || '').length }} / {{ item.max }}</span>
                    </div>
                  </template>

                  <!-- Number -->
                  <template v-else-if="item.fieldType === 'number'">
                    <input
                      v-model="formData[`field_${item.documentId}`]"
                      type="number"
                      class="vf-input"
                      :placeholder="getFieldPlaceholder(item)"
                      :max="item.max || undefined"
                    >
                  </template>

                  <!-- Date (Shamsi) -->
                  <template v-else-if="item.fieldType === 'date'">
                    <div class="vf-date-wrap">
                      <i class="fa-solid fa-calendar-days"></i>
                      <ShamsiDateInput
                        :model-value="formData[`field_${item.documentId}`] || ''"
                        class="vf-input vf-shamsi-input"
                        placeholder="انتخاب تاریخ شمسی"
                        @update:model-value="(v) => (formData[`field_${item.documentId}`] = v)"
                      />
                    </div>
                  </template>

                  <!-- Default -->
                  <template v-else>
                    <input
                      v-model="formData[`field_${item.documentId}`]"
                      type="text"
                      class="vf-input"
                      :placeholder="getFieldPlaceholder(item)"
                      :maxlength="item.max || undefined"
                    >
                  </template>
                </div>
                <div v-if="fieldErrors[`field_${item.documentId}`]" class="vf-field-error"><i class="fa-solid fa-circle-exclamation"></i> {{ fieldErrors[`field_${item.documentId}`] }}</div>
              </template>

              <template v-else-if="item.type === 'description'">
                <div class="vf-info-block">
                  <i class="fa-solid fa-circle-info"></i>
                  <div>
                    <strong v-if="item.title">{{ item.title }}</strong>
                    <p v-if="item.description">{{ item.description }}</p>
                  </div>
                </div>
              </template>
            </div>
          </div>
            </div>
          </Transition>

          <div class="vf-nav">
            <button v-if="currentStageIndex > 0" type="button" class="vf-btn vf-btn-ghost" :disabled="stageSaving" @click="goPrev">
              <i class="fa-solid fa-arrow-right"></i> مرحله قبل
            </button>
            <span v-else></span>

            <button
              v-if="!isLastStep"
              type="button"
              class="vf-btn vf-btn-primary"
              :disabled="stageSaving"
              @click="goNext"
            >
              <i v-if="stageSaving" class="fa-solid fa-spinner fa-spin"></i>
              {{ stageSaving ? 'در حال ذخیره ...' : 'مرحله بعد' }} <i v-if="!stageSaving" class="fa-solid fa-arrow-left"></i>
            </button>

            <button
              v-else
              type="button"
              class="vf-btn vf-btn-primary vf-btn--lg"
              :disabled="submitting"
              @click="handleSubmit"
            >
              <i :class="submitting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-paper-plane'"></i>
              {{ submitting ? 'در حال ارسال ...' : 'ارسال نهایی اعتبارسنجی' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped src="./styles/CustomerValidationFlowView.css"></style>
