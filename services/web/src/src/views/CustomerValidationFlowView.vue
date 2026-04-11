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

  for (const item of stage.items) {
    if (item.type !== 'document' || !item.required) continue;
    const fieldKey = `field_${item.documentId}`;

    if (item.fieldType === 'file' || item.fieldType === 'image') {
      const hasNewFile = !!formFiles.value[fieldKey];
      const hasExistingFile = typeof formData.value[fieldKey] === 'number';
      if (!hasNewFile && !hasExistingFile) {
        errorText.value = `لطفا فیلد «${item.title}» را تکمیل کنید`;
        return false;
      }
    } else {
      const val = formData.value[fieldKey];
      if (val === undefined || val === null || String(val).trim() === '') {
        errorText.value = `لطفا فیلد «${item.title}» را تکمیل کنید`;
        return false;
      }
    }

    if ((item.fieldType === 'text') && item.max && formData.value[fieldKey]) {
      if (String(formData.value[fieldKey]).length > Number(item.max)) {
        errorText.value = `فیلد «${item.title}» حداکثر ${item.max} کاراکتر می‌تواند باشد`;
        return false;
      }
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const goPrev = () => {
  if (currentStageIndex.value > 0) {
    currentStageIndex.value--;
    errorText.value = '';
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

<style scoped>
/* ─── Base Layout ─── */
.vf-view {
  position: relative;
  padding: 22px 14px 52px;
  max-width: 1180px;
  margin: 0 auto;
}

.vf-shell {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.vf-sidebar {
  position: sticky;
  top: 96px;
  display: grid;
  gap: 12px;
}

.vf-main {
  display: grid;
  gap: 16px;
}

.vf-side-card {
  padding: 16px;
  border-radius: 22px;
  border: 1px solid var(--web-border, #e5e7eb);
  background: linear-gradient(180deg, var(--web-surface, #fff) 0%, var(--web-surface-soft, #fafbfc) 100%);
  box-shadow: 0 8px 34px rgba(15, 23, 42, 0.06);
}

.vf-side-card--brand {
  background: linear-gradient(135deg, #700000 0%, #a30d0d 45%, #d53838 100%);
  color: #fff;
  border-color: transparent;
}

.vf-side-card--warning {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: #fff7ed;
  border-color: #fed7aa;
}

.vf-side-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 10px;
  font-weight: 800;
}

.vf-side-card h2,
.vf-side-card strong,
.vf-side-list-title {
  font-weight: 900;
}

.vf-side-card--brand h2 {
  margin: 12px 0 6px;
  font-size: 22px;
  line-height: 1.45;
}

.vf-side-card--brand p {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.8;
  font-size: 13px;
}

.vf-side-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.vf-side-stat {
  padding: 10px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
}

.vf-side-stat span {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.74);
}

.vf-side-stat strong {
  display: block;
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.6;
}

.vf-side-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.vf-side-progress-head span {
  color: var(--web-primary, #8d0000);
  font-size: 12px;
  font-weight: 900;
}

.vf-side-progress-track {
  height: 10px;
  margin-top: 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}

.vf-side-progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #8d0000, #d22c2c);
}

.vf-side-progress-copy {
  margin: 10px 0 0;
  color: var(--web-muted, #6b7280);
  line-height: 1.8;
  font-size: 12px;
}

.vf-side-card--warning p {
  margin: 6px 0 0;
  color: #9a3412;
  line-height: 1.9;
  font-size: 13px;
}

.vf-side-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.vf-side-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--web-text, #111827);
  line-height: 1.8;
  font-size: 13px;
}

.vf-side-list li i {
  margin-top: 3px;
  color: #059669;
}

/* ─── Animated Background ─── */
.vf-bg { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: -1; }
.vf-bg-orb { position: absolute; border-radius: 999px; filter: blur(90px); }
.vf-bg-orb-1 { width: 500px; height: 500px; top: -120px; left: -180px; background: radial-gradient(circle, rgba(141, 0, 0, 0.18) 0%, transparent 70%); animation: vfFloat 20s ease-in-out infinite alternate; }
.vf-bg-orb-2 { width: 400px; height: 400px; bottom: 10%; right: -140px; background: radial-gradient(circle, rgba(205, 82, 82, 0.12) 0%, transparent 70%); animation: vfFloat 26s ease-in-out infinite alternate-reverse; }
.vf-bg-orb-3 { width: 300px; height: 300px; top: 45%; left: 50%; transform: translateX(-50%); background: radial-gradient(circle, rgba(141, 0, 0, 0.06) 0%, transparent 70%); animation: vfFloat 18s ease-in-out infinite alternate; }

@keyframes vfFloat {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-30px) scale(1.05); }
}

/* ─── Loading ─── */
.vf-loading-card {
  padding: 44px 26px;
  border-radius: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  font-weight: 700;
  font-size: 14px;
  color: var(--web-muted, #6b7280);
  background: var(--web-surface, #fff);
  border: 1px solid var(--web-border, #e5e7eb);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.06);
}

.vf-loading-card--error { color: #b42318; }
.vf-loading-card--error i { font-size: 32px; }

.vf-loading-pulse { display: flex; gap: 8px; }
.vf-loading-pulse span {
  width: 12px; height: 12px; border-radius: 999px;
  background: var(--web-primary, #8d0000);
  animation: vfPulse 1.4s ease-in-out infinite;
}
.vf-loading-pulse span:nth-child(2) { animation-delay: 0.2s; }
.vf-loading-pulse span:nth-child(3) { animation-delay: 0.4s; }
@keyframes vfPulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }

/* ─── Result Cards (Pending / Success) ─── */
.vf-result-card {
  text-align: center;
  padding: 42px 24px;
  border-radius: 26px;
  background: var(--web-surface, #fff);
  border: 1px solid var(--web-border, #e5e7eb);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.07);
}

.vf-result-illustration { margin-bottom: 24px; }

.vf-result-ring {
  width: 100px; height: 100px; border-radius: 999px; margin: 0 auto;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  display: flex; align-items: center; justify-content: center;
  animation: vfRingPulse 2s ease-in-out infinite;
}

.vf-result-ring--success { background: linear-gradient(135deg, #d1fae5, #6ee7b7); }

.vf-result-ring-inner {
  width: 68px; height: 68px; border-radius: 999px;
  background: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: #d97706;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.vf-result-ring--success .vf-result-ring-inner { color: #059669; }

@keyframes vfRingPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.3); } 50% { box-shadow: 0 0 0 16px rgba(217, 119, 6, 0); } }
.vf-result-ring--success { animation-name: vfRingPulseGreen; }
@keyframes vfRingPulseGreen { 0%, 100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.3); } 50% { box-shadow: 0 0 0 16px rgba(5, 150, 105, 0); } }

.vf-result-card h2 { margin: 0 0 12px; font-size: 24px; font-weight: 900; }
.vf-result-card p { margin: 0 0 24px; color: var(--web-muted, #6b7280); line-height: 1.9; max-width: 480px; margin-inline: auto; }

.vf-result-meta {
  display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
}
.vf-result-meta span { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--web-muted, #6b7280); font-weight: 700; }
.vf-result-actions { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }

/* ─── Hero Header ─── */
.vf-hero {
  display: flex; align-items: center; gap: 24px;
  padding: 28px 24px;
  border-radius: 26px;
  background: linear-gradient(135deg, #6d0000 0%, #a50e0e 40%, #c92a2a 80%, #e64545 100%);
  color: #fff;
  box-shadow: 0 24px 64px rgba(109, 0, 0, 0.3);
  margin-bottom: 0;
  position: relative; overflow: hidden;
}

.vf-hero::before {
  content: ''; position: absolute; width: 280px; height: 280px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.04); top: -100px; left: -80px;
}

.vf-hero::after {
  content: ''; position: absolute; width: 200px; height: 200px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.03); bottom: -60px; right: -40px;
}

.vf-hero-content { flex: 1; position: relative; z-index: 1; }

.vf-hero-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 14px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(4px);
  font-size: 11px; font-weight: 800; margin-bottom: 12px;
}

.vf-hero h1 { margin: 0; font-size: 23px; font-weight: 900; line-height: 1.45; }
.vf-hero-desc { margin: 8px 0 0; color: rgba(255, 255, 255, 0.75); line-height: 1.8; font-size: 13px; }

.vf-hero-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; }

.vf-hero-tag {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 30px; padding: 0 12px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(4px);
  font-size: 11px; font-weight: 700; color: #fff;
  transition: background 0.2s;
}

.vf-hero-tag--feature { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); }

.vf-hero-visual {
  flex-shrink: 0; position: relative; z-index: 1;
}

.vf-hero-shield {
  width: 76px; height: 76px; border-radius: 20px;
  background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  font-size: 30px; color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* ─── Reject Banner ─── */
.vf-reject-banner {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 16px 20px; border-radius: 18px;
  background: #fef2f2; border: 1px solid #fecaca;
  color: #991b1b; font-size: 13px; line-height: 1.9;
  margin-bottom: 20px;
}

.vf-reject-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: #fee2e2; display: flex; align-items: center; justify-content: center;
  font-size: 16px; flex-shrink: 0;
}

/* ─── Stepper ─── */
.vf-stepper-wrap {
  margin-bottom: 24px; overflow-x: auto; padding: 4px 0;
  -webkit-overflow-scrolling: touch;
}

.vf-stepper { display: flex; align-items: center; gap: 0; min-width: max-content; }

.vf-step-pair { display: contents; }

.vf-step {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  min-width: 72px; cursor: default; position: relative;
}

.vf-step--done { cursor: pointer; }

.vf-step-indicator {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 900;
  background: var(--web-surface, #fff);
  color: var(--web-muted, #9ca3af);
  border: 2px solid var(--web-border, #e5e7eb);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.vf-step--active .vf-step-indicator {
  background: linear-gradient(135deg, #8d0000, #c11212);
  color: #fff; border-color: transparent;
  box-shadow: 0 8px 24px rgba(141, 0, 0, 0.35);
  transform: scale(1.1);
}

.vf-step--done .vf-step-indicator {
  background: #059669; color: #fff; border-color: #059669;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.vf-step-text {
  font-size: 10px; font-weight: 700;
  color: var(--web-muted, #9ca3af);
  text-align: center; max-width: 80px; line-height: 1.5;
}

.vf-step--active .vf-step-text { color: var(--web-text, #1a1a1a); font-weight: 800; }
.vf-step--done .vf-step-text { color: #059669; }

.vf-step-connector {
  flex: 1; height: 2px; min-width: 24px;
  background: var(--web-border, #e5e7eb);
  margin-top: -24px; border-radius: 999px;
  transition: background 0.4s;
}

.vf-step-connector--done { background: #059669; }

/* ─── Alerts ─── */
.vf-alert {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; border-radius: 16px;
  font-weight: 700; font-size: 13px; line-height: 1.8;
  margin-bottom: 16px;
}

.vf-alert--error { background: #fef2f2; color: #b42318; border: 1px solid #fecaca; }
.vf-alert--success { background: #ecfdf5; color: #166534; border: 1px solid #bbf7d0; }
.vf-alert--info { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }

.vf-slide-enter-active, .vf-slide-leave-active { transition: all 0.3s ease; }
.vf-slide-enter-from, .vf-slide-leave-to { opacity: 0; transform: translateY(-8px); }

/* ─── Cards ─── */
.vf-card {
  padding: 32px;
  border-radius: 28px;
  background: var(--web-surface, #fff);
  border: 1px solid var(--web-border, #e5e7eb);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.05);
}

.vf-fade-enter-active, .vf-fade-leave-active { transition: all 0.35s ease; }
.vf-fade-enter-from { opacity: 0; transform: translateX(20px); }
.vf-fade-leave-to { opacity: 0; transform: translateX(-20px); }

/* ─── Payment Step ─── */
.vf-card--payment { overflow: hidden; }
.vf-payment { text-align: center; }

.vf-payment-visual { display: flex; flex-direction: column; align-items: center; gap: 14px; margin-bottom: 24px; }

.vf-payment-icon-ring {
  width: 76px; height: 76px; border-radius: 999px;
  background: linear-gradient(135deg, rgba(141, 0, 0, 0.08), rgba(141, 0, 0, 0.03));
  border: 2px solid rgba(141, 0, 0, 0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: #8d0000;
}

.vf-payment-amount {
  font-size: 32px; font-weight: 900;
  background: linear-gradient(135deg, #8d0000, #c11212);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

.vf-payment h2 { margin: 0 0 8px; font-size: 20px; font-weight: 800; }
.vf-payment-subtitle { color: var(--web-muted, #6b7280); margin: 0 0 20px; line-height: 1.8; }

.vf-payment-note {
  display: inline-flex; align-items: center; gap: 8px;
  max-width: 560px; margin: 0 auto 16px; padding: 12px 18px;
  border-radius: 14px; background: #fafbfc;
  color: var(--web-muted, #6b7280); font-size: 13px; line-height: 1.8;
  text-align: start; border: 1px solid var(--web-border, #e5e7eb);
}

.vf-payment-chips { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }

.vf-mini-chip {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 32px; padding: 0 14px; border-radius: 999px;
  background: var(--web-surface-soft, #f8f9fa);
  border: 1px solid var(--web-border, #e5e7eb);
  color: var(--web-muted, #6b7280); font-size: 12px; font-weight: 700;
}

.vf-invoice { display: flex; justify-content: center; gap: 16px; margin-bottom: 16px; font-size: 13px; font-weight: 700; color: var(--web-muted, #6b7280); }
.vf-invoice-status { color: var(--web-primary, #8d0000); }

.vf-payment-done {
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 52px; padding: 0 28px; border-radius: 16px;
  background: linear-gradient(135deg, #d1fae5, #ecfdf5);
  color: #059669; font-weight: 800; font-size: 15px;
  border: 1px solid #a7f3d0;
}

/* ─── Stage Header ─── */
.vf-stage-head {
  display: flex; align-items: flex-start; gap: 16px;
  margin-bottom: 20px; padding-bottom: 16px;
  border-bottom: 1px solid var(--web-border, #e5e7eb);
}

.vf-stage-number {
  width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(141, 0, 0, 0.08), rgba(141, 0, 0, 0.04));
  color: #8d0000; display: flex; align-items: center; justify-content: center;
  font-size: 17px; font-weight: 900;
}

.vf-stage-head h2 { margin: 0; font-size: 18px; font-weight: 800; }
.vf-stage-head p { margin: 6px 0 0; color: var(--web-muted, #6b7280); font-size: 12px; line-height: 1.8; }

.vf-stage-counter {
  margin-right: auto; margin-left: 0;
  min-height: 32px; padding: 0 14px; border-radius: 999px;
  background: var(--web-surface-soft, #f8f9fa); border: 1px solid var(--web-border, #e5e7eb);
  color: var(--web-muted, #6b7280); font-size: 12px; font-weight: 800;
  display: flex; align-items: center; white-space: nowrap;
}

/* ─── Field Cards ─── */
.vf-fields { display: grid; gap: 16px; }

.vf-field {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--web-border, #e5e7eb);
  background: var(--web-surface-soft, #fafbfc);
  transition: border-color 0.25s, box-shadow 0.25s;
}

.vf-field:focus-within {
  border-color: rgba(141, 0, 0, 0.25);
  box-shadow: 0 0 0 4px rgba(141, 0, 0, 0.05);
}

.vf-field--desc { background: transparent; border-style: dashed; }

.vf-field-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 12px; }

.vf-field-icon {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; flex-shrink: 0;
  background: rgba(141, 0, 0, 0.06); color: #8d0000;
}

.vf-field-icon--file, .vf-field-icon--image { background: #eff6ff; color: #2563eb; }
.vf-field-icon--number { background: #ecfdf5; color: #059669; }
.vf-field-icon--date { background: #fffbeb; color: #d97706; }

.vf-field-meta h3 { margin: 0; font-size: 14px; font-weight: 800; }

.vf-field-badges { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }

.vf-badge {
  display: inline-flex; align-items: center;
  min-height: 22px; padding: 0 8px; border-radius: 999px;
  font-size: 10px; font-weight: 800;
  background: var(--web-surface, #fff); border: 1px solid var(--web-border, #e5e7eb);
  color: var(--web-muted, #6b7280);
}

.vf-badge--required { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.vf-badge--optional { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }

.vf-field-help {
  margin: 0 0 10px; padding-right: 58px;
  color: var(--web-muted, #6b7280); font-size: 12px; line-height: 1.8;
}

.vf-field-input { margin-top: 4px; }

/* ─── Inputs ─── */
.vf-input {
  width: 100%; padding: 12px 16px;
  border-radius: 12px; border: 1.5px solid var(--web-border, #e5e7eb);
  background: var(--web-surface, #fff);
  font-family: inherit; font-size: 13px;
  color: var(--web-text, #1a1a1a);
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}

.vf-input:focus {
  border-color: rgba(141, 0, 0, 0.4);
  box-shadow: 0 0 0 3px rgba(141, 0, 0, 0.08);
}

textarea.vf-input { resize: vertical; min-height: 80px; }

.vf-input-footer { display: flex; justify-content: space-between; margin-top: 4px; }

.vf-char-count {
  font-size: 11px; color: var(--web-muted, #6b7280); font-weight: 700; direction: ltr;
}

.vf-date-wrap {
  position: relative;
}

.vf-date-wrap > i {
  position: absolute; top: 50%; right: 14px; transform: translateY(-50%);
  color: var(--web-muted, #9ca3af); font-size: 15px; pointer-events: none;
}

.vf-date-wrap .vf-input { padding-right: 40px; }

/* ─── File Upload ─── */
.vf-upload {
  display: block; cursor: pointer;
  border-radius: 16px; border: 2px dashed var(--web-border, #d1d5db);
  background: var(--web-surface, #fff);
  transition: all 0.25s;
  overflow: hidden;
}

.vf-upload:hover {
  border-color: rgba(141, 0, 0, 0.3);
  background: rgba(141, 0, 0, 0.01);
}

.vf-upload--filled {
  border-color: #059669; border-style: solid;
  background: #f0fdf4;
}

.vf-upload-inner {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 22px 14px; text-align: center;
  color: var(--web-muted, #6b7280);
}

.vf-upload-inner i { font-size: 28px; }
.vf-upload--filled .vf-upload-inner i { color: #059669; }
.vf-upload-inner span { font-size: 13px; font-weight: 700; }
.vf-upload-inner small { font-size: 11px; opacity: 0.7; }

.vf-upload-name {
  max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: #166534;
}

/* ─── Description Block ─── */
.vf-info-block {
  display: flex; gap: 12px; align-items: flex-start;
}

.vf-info-block > i { margin-top: 3px; color: var(--web-primary, #8d0000); font-size: 16px; }
.vf-info-block strong { display: block; font-size: 14px; margin-bottom: 4px; }
.vf-info-block p { margin: 0; color: var(--web-muted, #6b7280); line-height: 1.8; font-size: 13px; }

/* ─── Navigation ─── */
.vf-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 18px; gap: 10px;
}

/* ─── Buttons ─── */
.vf-btn {
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 42px; padding: 0 20px;
  border-radius: 14px; font-size: 13px; font-weight: 800;
  border: none; cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
}

.vf-btn-primary {
  background: linear-gradient(135deg, #8d0000, #c11212);
  color: #fff;
  box-shadow: 0 8px 28px rgba(141, 0, 0, 0.22);
}

.vf-btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 36px rgba(141, 0, 0, 0.32);
}

.vf-btn-primary:active:not(:disabled) { transform: translateY(0); }
.vf-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.vf-btn--lg { min-height: 50px; padding: 0 28px; font-size: 14px; border-radius: 16px; }

.vf-btn-ghost {
  background: transparent; color: var(--web-text, #1a1a1a);
  border: 1.5px solid var(--web-border, #e5e7eb);
}

.vf-btn-ghost:hover { background: var(--web-surface-soft, #f8f9fa); }

.vf-btn-secondary {
  background: var(--web-surface-soft, #f8f9fa);
  color: var(--web-text, #1a1a1a);
  border: 1.5px solid var(--web-border, #e5e7eb);
}

.vf-btn-secondary:hover { background: var(--web-surface, #fff); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06); }

@media (max-width: 991px) {
  .vf-shell { grid-template-columns: 1fr; }
  .vf-sidebar { position: static; order: 2; }
  .vf-main { order: 1; }
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .vf-view { padding: 14px 10px 36px; }
  .vf-hero { flex-direction: column; padding: 22px 18px; }
  .vf-hero h1 { font-size: 20px; }
  .vf-hero-visual { display: none; }
  .vf-stepper-wrap { margin-bottom: 16px; }
  .vf-step { min-width: 56px; }
  .vf-step-indicator { width: 38px; height: 38px; font-size: 13px; border-radius: 12px; }
  .vf-step-text { font-size: 10px; max-width: 60px; }
  .vf-step-connector { min-width: 16px; }
  .vf-card { padding: 18px 14px; border-radius: 20px; }
  .vf-stage-head { flex-wrap: wrap; }
  .vf-stage-counter { margin-right: 0; }
  .vf-nav { flex-direction: column; }
  .vf-btn { width: 100%; justify-content: center; }
  .vf-payment-amount { font-size: 28px; }
  .vf-field-help { padding-right: 0; }
  .vf-result-card { padding: 34px 18px; }
}

@media (max-width: 480px) {
  .vf-hero { padding: 22px 16px; border-radius: 24px; }
  .vf-hero-badge { font-size: 11px; padding: 5px 12px; }
  .vf-hero-tag { font-size: 11px; min-height: 28px; padding: 0 10px; }
}
</style>
