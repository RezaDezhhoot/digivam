<script setup>
import { computed, onMounted, ref } from 'vue';
import PersianDatePickerInput from '../components/PersianDatePickerInput.vue';
import {
  getBrokerProfile,
  updateBrokerAvatar,
  updateBrokerLevel1,
  updateBrokerLevel2
} from '../services/broker-profile.api.js';
import { useAppToast } from '../composables/useToast.js';
import { brokerVerifySteps, getBrokerVerifyMeta } from '../utils/broker-verify-level.js';

const toast = useAppToast();
const loading = ref(false);
const profile = ref(null);
const verifyLevel = ref(1);
const activeStep = ref(1);

const form = ref({
  name: '',
  nationalCode: '',
  birthdate: '',
  sheba: '',
  postalCode: '',
  address: ''
});

const idCartImage = ref(null);
const birthCertificateImage = ref(null);
const avatar = ref(null);
const idCartPreview = ref('');
const birthCertificatePreview = ref('');
const avatarPreview = ref('');
const documentsProgress = ref(0);
const avatarProgress = ref(0);
const uploadingDocuments = ref(false);
const uploadingAvatar = ref(false);
const savingLevel1 = ref(false);
const savingLevel2 = ref(false);
const verifySteps = brokerVerifySteps;
const currentVerifyMeta = computed(() => getBrokerVerifyMeta(verifyLevel.value));

const stepMeta = computed(() => {
  if (activeStep.value === 1) return { title: 'تایید هویت مرحله اول (اطلاعات پایه)', description: 'اطلاعات پایه هویتی خود را تکمیل کنید.', icon: 'fa-solid fa-id-card' };
  if (activeStep.value === 2) return { title: 'تایید هویت مرحله دوم (بارگزاری مدارک)', description: 'اطلاعات بانکی، آدرس و مدارک خود را ثبت کنید.', icon: 'fa-solid fa-file-arrow-up' };
  return { title: 'تایید شده', description: 'احراز هویت شما تکمیل شده است و از این بخش می‌توانید آواتار را مدیریت کنید.', icon: 'fa-solid fa-circle-check' };
});

/* Check if existing files are present (no re-upload required) */
const hasExistingIdCart = computed(() => !!profile.value?.idCart && !idCartImage.value);
const hasExistingBirthCertificate = computed(() => !!profile.value?.birthCertificate && !birthCertificateImage.value);
const hasExistingAvatar = computed(() => !!profile.value?.avatar && !avatar.value);

const setFilePreview = (target, file) => {
  if (!file) { target.value = ''; return; }
  target.value = URL.createObjectURL(file);
};

const syncProfile = (data) => {
  profile.value = data.profile;
  verifyLevel.value = Number(data.profile.verifyLevel || 1);
  activeStep.value = Number(data.profile.verifyLevel || 1);
  form.value = {
    name: data.profile.name || '',
    nationalCode: data.profile.nationalCode || '',
    birthdate: data.profile.birthdate ? String(data.profile.birthdate).slice(0, 10) : '',
    sheba: data.profile.sheba || '',
    postalCode: data.profile.postalCode || '',
    address: data.profile.address || ''
  };
  idCartPreview.value = data.profile.idCart || '';
  birthCertificatePreview.value = data.profile.birthCertificate || '';
  avatarPreview.value = data.profile.avatar || '';
  window.dispatchEvent(new CustomEvent('broker-profile-updated', { detail: data.profile }));
};

const load = async () => {
  loading.value = true;
  try {
    const data = await getBrokerProfile();
    syncProfile(data);
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.value = false;
  }
};

const saveLevel1 = async () => {
  savingLevel1.value = true;
  try {
    await updateBrokerLevel1({ name: form.value.name, nationalCode: form.value.nationalCode, birthdate: form.value.birthdate });
    toast.success('اطلاعات مرحله اول ذخیره شد');
    await load();
    activeStep.value = 2;
  } catch (error) {
    toast.error(error.message);
  } finally {
    savingLevel1.value = false;
  }
};

const saveLevel2 = async () => {
  savingLevel2.value = true;
  try {
    const data = new FormData();
    data.append('sheba', form.value.sheba);
    data.append('postalCode', form.value.postalCode);
    data.append('address', form.value.address);
    if (idCartImage.value) data.append('idCartImage', idCartImage.value);
    if (birthCertificateImage.value) data.append('birthCertificateImage', birthCertificateImage.value);
    const hasFiles = Boolean(idCartImage.value || birthCertificateImage.value);
    uploadingDocuments.value = hasFiles;
    documentsProgress.value = 0;
    await updateBrokerLevel2(data, (progress) => { documentsProgress.value = progress; });
    toast.success('اطلاعات مرحله دوم ذخیره شد');
    await load();
    activeStep.value = 3;
  } catch (error) {
    console.log(error);
    
    toast.error(error.message);
  } finally {
    uploadingDocuments.value = false;
    savingLevel2.value = false;
  }
};

const saveAvatar = async () => {
  if (!avatar.value && !hasExistingAvatar.value) {
    toast.warning('لطفا تصویر آواتار را انتخاب کنید');
    return;
  }
  if (!avatar.value) {
    toast.info('آواتار قبلا ثبت شده است');
    return;
  }
  try {
    const data = new FormData();
    data.append('avatar', avatar.value);
    uploadingAvatar.value = true;
    avatarProgress.value = 0;
    await updateBrokerAvatar(data, (progress) => { avatarProgress.value = progress; });
    toast.success('آواتار ذخیره شد');
    await load();
  } catch (error) {
    toast.error(error.message);
  } finally {
    uploadingAvatar.value = false;
  }
};

const onIdCartChange = (event) => { idCartImage.value = event.target.files?.[0] || null; setFilePreview(idCartPreview, idCartImage.value); };
const onBirthCertificateChange = (event) => { birthCertificateImage.value = event.target.files?.[0] || null; setFilePreview(birthCertificatePreview, birthCertificateImage.value); };
const onAvatarChange = (event) => { avatar.value = event.target.files?.[0] || null; setFilePreview(avatarPreview, avatar.value); };

onMounted(load);
</script>

<template>
  <section class="animate-in">
    <div class="page-header">
      <div class="page-header-icon"><i :class="stepMeta.icon"></i></div>
      <div>
        <h1 class="page-header-title">پروفایل</h1>
        <p class="page-header-desc">{{ currentVerifyMeta.description }}</p>
      </div>
      <div class="ms-auto page-header-actions">
        <span class="chip" :class="`chip-${currentVerifyMeta.tone}`">
          <i :class="currentVerifyMeta.icon" class="me-1"></i>{{ currentVerifyMeta.label }}
        </span>
        <span class="chip"><i class="fa-solid fa-phone me-1"></i> {{ profile?.phone || 'شماره ثبت نشده' }}</span>
      </div>
    </div>

    <!-- Stepper -->
    <div class="profile-stepper mt-3">
      <div class="stepper-item" :class="{ active: activeStep >= 1, done: activeStep > 1 }">
        <span class="stepper-badge"><i v-if="activeStep > 1" class="fa-solid fa-check"></i><template v-else>1</template></span>
        <p>{{ verifySteps[0].shortLabel }}</p>
      </div>
      <div class="stepper-line" :class="{ active: activeStep >= 2 }"></div>
      <div class="stepper-item" :class="{ active: activeStep >= 2, done: activeStep > 2 }">
        <span class="stepper-badge"><i v-if="activeStep > 2" class="fa-solid fa-check"></i><template v-else>2</template></span>
        <p>{{ verifySteps[1].shortLabel }}</p>
      </div>
      <div class="stepper-line" :class="{ active: activeStep >= 3 }"></div>
      <div class="stepper-item" :class="{ active: activeStep >= 3 }">
        <span class="stepper-badge">3</span>
        <p>{{ verifySteps[2].shortLabel }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="content-card mt-3">
      <div class="spinner-overlay"><i class="fa-solid fa-spinner fa-spin"></i></div>
    </div>

    <!-- Step 1 -->
    <div v-if="!loading && activeStep === 1" class="content-card mt-3">
      <h2 class="card-section-title"><i class="fa-solid fa-id-card me-2"></i>{{ stepMeta.title }}</h2>
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label form-label-required"><i class="fa-solid fa-user me-1"></i> نام</label>
          <input v-model="form.name" class="form-control" />
          <small class="text-muted">نام را به فارسی وارد کنید</small>
        </div>
        <div class="col-md-4">
          <label class="form-label form-label-required"><i class="fa-solid fa-fingerprint me-1"></i> کد ملی</label>
          <input v-model="form.nationalCode" class="form-control" dir="ltr" />
        </div>
        <div class="col-md-4">
          <label class="form-label form-label-required"><i class="fa-solid fa-calendar-days me-1"></i> تاریخ تولد</label>
          <PersianDatePickerInput v-model="form.birthdate" />
        </div>
        <div class="col-12 d-flex justify-content-end">
          <button class="btn btn-primary px-4" :disabled="savingLevel1" @click="saveLevel1">
            <i v-if="savingLevel1" class="fa-solid fa-spinner fa-spin me-1"></i>
            <i v-else class="fa-solid fa-arrow-left me-1"></i> مرحله بعدی
          </button>
        </div>
      </div>
    </div>

    <!-- Step 2 -->
    <div v-else-if="!loading && activeStep === 2" class="content-card mt-3">
      <h2 class="card-section-title"><i class="fa-solid fa-file-arrow-up me-2"></i>{{ stepMeta.title }}</h2>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label form-label-required"><i class="fa-solid fa-building-columns me-1"></i> شماره شبا</label>
          <input v-model="form.sheba" class="form-control" dir="ltr" placeholder="IR062960000000100324200001" />
          <small class="text-muted">نمونه معتبر: IR062960000000100324200001</small>
        </div>
        <div class="col-md-6">
          <label class="form-label form-label-required"><i class="fa-solid fa-location-dot me-1"></i> کد پستی</label>
          <input v-model="form.postalCode" class="form-control" dir="ltr" />
        </div>
        <div class="col-12">
          <label class="form-label form-label-required"><i class="fa-solid fa-map-location-dot me-1"></i> آدرس</label>
          <textarea v-model="form.address" class="form-control" rows="3"></textarea>
        </div>

        <!-- ID Card -->
        <div class="col-md-6">
          <label class="form-label">
            <i class="fa-solid fa-id-card me-1"></i> تصویر کارت ملی
            <span v-if="!hasExistingIdCart" class="text-danger">*</span>
            <span v-else class="form-label-note">(اختیاری)</span>
            <span v-if="hasExistingIdCart" class="badge bg-success-subtle text-success ms-1"><i class="fa-solid fa-check me-1"></i>موجود</span>
          </label>
          <input type="file" accept="image/*" class="form-control" @change="onIdCartChange" />
          <small v-if="hasExistingIdCart" class="text-muted">تصویر قبلی موجود است. فقط در صورت تمایل به تغییر فایل جدید انتخاب کنید.</small>
          <div v-if="idCartPreview" class="preview-box mt-2">
            <img :src="idCartPreview" alt="پیش نمایش کارت ملی" class="preview-image" />
          </div>
        </div>

        <!-- Birth Certificate -->
        <div class="col-md-6">
          <label class="form-label">
            <i class="fa-solid fa-file-image me-1"></i> تصویر شناسنامه
            <span v-if="!hasExistingBirthCertificate" class="text-danger">*</span>
            <span v-else class="form-label-note">(اختیاری)</span>
            <span v-if="hasExistingBirthCertificate" class="badge bg-success-subtle text-success ms-1"><i class="fa-solid fa-check me-1"></i>موجود</span>
          </label>
          <input type="file" accept="image/*" class="form-control" @change="onBirthCertificateChange" />
          <small v-if="hasExistingBirthCertificate" class="text-muted">تصویر قبلی موجود است. فقط در صورت تمایل به تغییر فایل جدید انتخاب کنید.</small>
          <div v-if="birthCertificatePreview" class="preview-box mt-2">
            <img :src="birthCertificatePreview" alt="پیش نمایش شناسنامه" class="preview-image" />
          </div>
        </div>

        <!-- Upload Progress -->
        <div v-if="uploadingDocuments" class="col-12">
          <label class="form-label"><i class="fa-solid fa-cloud-arrow-up me-1"></i> وضعیت بارگذاری مدارک</label>
          <div class="progress upload-progress-shell">
            <div class="progress-bar" role="progressbar" :style="{ width: `${documentsProgress}%` }">{{ documentsProgress }}%</div>
          </div>
        </div>
        <div class="col-12 d-flex justify-content-between flex-wrap gap-2">
          <button class="btn btn-outline-secondary px-4" @click="activeStep = 1"><i class="fa-solid fa-arrow-right me-1"></i> مرحله قبل</button>
          <button class="btn btn-primary px-4" :disabled="savingLevel2" @click="saveLevel2">
            <i v-if="savingLevel2" class="fa-solid fa-spinner fa-spin me-1"></i>
            <i v-else class="fa-solid fa-cloud-arrow-up me-1"></i> ثبت اطلاعات
          </button>
        </div>
      </div>
    </div>

    <!-- Step 3: Verified + Avatar -->
    <div v-else-if="!loading" class="content-card mt-3">
      <h2 class="card-section-title"><i class="fa-solid fa-camera me-2"></i>{{ stepMeta.title }}</h2>
      <div class="verify-success-panel mb-4">
        <div class="verify-success-icon"><i class="fa-solid fa-circle-check"></i></div>
        <div>
          <h3 class="verify-success-title">{{ currentVerifyMeta.label }}</h3>
          <p class="verify-success-desc">احراز هویت شما مطابق سطح بندی کارگزار تایید شده است. در این مرحله می‌توانید تصویر آواتار خود را ثبت یا به روزرسانی کنید.</p>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label form-label-optional">
            <i class="fa-solid fa-image me-1"></i> تصویر آواتار
            <span v-if="hasExistingAvatar" class="badge bg-success-subtle text-success ms-1"><i class="fa-solid fa-check me-1"></i>موجود</span>
          </label>
          <input type="file" accept="image/*" class="form-control" @change="onAvatarChange" />
          <small v-if="hasExistingAvatar" class="text-muted">آواتار قبلی موجود است. فقط در صورت تمایل به تغییر فایل جدید انتخاب کنید.</small>
        </div>
        <div v-if="avatarPreview" class="col-12">
          <div class="preview-box">
            <img :src="avatarPreview" alt="پیش نمایش آواتار" class="preview-image preview-avatar" />
          </div>
        </div>
        <div v-if="uploadingAvatar" class="col-12">
          <label class="form-label"><i class="fa-solid fa-cloud-arrow-up me-1"></i> وضعیت بارگذاری آواتار</label>
          <div class="progress upload-progress-shell">
            <div class="progress-bar" role="progressbar" :style="{ width: `${avatarProgress}%` }">{{ avatarProgress }}%</div>
          </div>
        </div>
        <div class="col-12 d-flex justify-content-between flex-wrap gap-2">
          <button class="btn btn-outline-secondary px-4" @click="activeStep = 2"><i class="fa-solid fa-arrow-right me-1"></i> مرحله قبل</button>
          <button class="btn btn-primary px-4" :disabled="uploadingAvatar" @click="saveAvatar">
            <i v-if="uploadingAvatar" class="fa-solid fa-spinner fa-spin me-1"></i>
            <i v-else class="fa-solid fa-cloud-arrow-up me-1"></i> ثبت آواتار
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="./styles/BrokerProfileView.css"></style>
