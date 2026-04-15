<script setup>
import { computed, onMounted, ref } from 'vue';
import PersianDatePickerInput from '../components/PersianDatePickerInput.vue';
import CustomerPanelShell from '../components/CustomerPanelShell.vue';
import { useRouter } from 'vue-router';
import { useCustomerSession } from '../composables/useCustomerSession.js';
import { getCustomerProfile, updateCustomerAvatar, updateCustomerProfile } from '../services/customer-profile.api.js';

const router = useRouter();
const { updateProfile } = useCustomerSession();

const loading = ref(true);
const saving = ref(false);
const avatarSaving = ref(false);
const errorText = ref('');
const successText = ref('');
const profile = ref(null);
const avatarFile = ref(null);
const avatarPreview = ref('');

const form = ref({
  name: '',
  email: '',
  nationalCode: '',
  birthdate: '',
  password: ''
});

const isFirstCompletion = computed(() => !profile.value?.profile);
const avatarInitial = computed(() => String(profile.value?.name || 'م').trim().charAt(0) || 'م');
const shellStats = computed(() => [
  { label: 'شماره همراه', value: profile.value?.phone || '-' },
  { label: 'وضعیت', value: profile.value?.profile ? 'تکمیل شده' : 'نیازمند تکمیل' },
  { label: 'کد ملی', value: form.value.nationalCode || '-' }
]);

const syncForm = (nextProfile) => {
  profile.value = nextProfile;
  form.value = {
    name: nextProfile?.name || '',
    email: nextProfile?.email || '',
    nationalCode: nextProfile?.nationalCode || '',
    birthdate: nextProfile?.birthdate ? String(nextProfile.birthdate).slice(0, 10) : '',
    password: ''
  };
  avatarPreview.value = nextProfile?.avatar || '';
};

const load = async () => {
  loading.value = true;
  errorText.value = '';

  try {
    const data = await getCustomerProfile();
    syncForm(data.profile);
    updateProfile(data.profile);
  } catch (error) {
    errorText.value = error.message;
  } finally {
    loading.value = false;
  }
};

const onAvatarChange = (event) => {
  const file = event.target.files?.[0] || null;
  avatarFile.value = file;

  if (!file) {
    avatarPreview.value = profile.value?.avatar || '';
    return;
  }

  avatarPreview.value = URL.createObjectURL(file);
};

const saveProfile = async () => {
  saving.value = true;
  errorText.value = '';
  successText.value = '';

  try {
    const wasIncomplete = isFirstCompletion.value;
    const data = await updateCustomerProfile(form.value);
    syncForm(data.profile);
    updateProfile(data.profile);
    successText.value = data.message;

    if (wasIncomplete) {
      await router.push('/customer/dashboard');
    }
  } catch (error) {
    errorText.value = error.message;
  } finally {
    saving.value = false;
  }
};

const saveAvatar = async () => {
  if (!avatarFile.value) {
    return;
  }

  avatarSaving.value = true;
  errorText.value = '';
  successText.value = '';

  try {
    const data = new FormData();
    data.append('avatar', avatarFile.value);
    const response = await updateCustomerAvatar(data);
    syncForm(response.profile);
    updateProfile(response.profile);
    successText.value = response.message;
    avatarFile.value = null;
  } catch (error) {
    errorText.value = error.message;
  } finally {
    avatarSaving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <section class="customer-profile-view">
    <div v-if="loading" class="customer-profile-loading">
      <div class="customer-profile-spinner"></div>
      <span>در حال بارگذاری پروفایل مشتری...</span>
    </div>
    <div v-else-if="errorText && !profile" class="customer-profile-loading text-danger">{{ errorText }}</div>

    <template v-else>
      <CustomerPanelShell
        kicker="پروفایل مشتری"
        :title="isFirstCompletion ? 'تکمیل ثبت نام' : 'ویرایش پروفایل'"
        :description="isFirstCompletion
          ? 'برای ادامه استفاده از امکانات پنل مشتری، اطلاعات هویتی و امنیتی خود را کامل کنید.'
          : 'اطلاعات حساب، آواتار و مشخصات فردی خود را از این بخش مدیریت کنید.'"
        :stats="shellStats"
      >

      <p v-if="errorText" class="customer-profile-message error">{{ errorText }}</p>
      <p v-if="successText" class="customer-profile-message success">{{ successText }}</p>

      <section class="customer-profile-grid">
        <article class="card customer-avatar-card">
          <div class="customer-avatar-preview">
            <img v-if="avatarPreview" :src="avatarPreview" alt="آواتار مشتری" />
            <span v-else>{{ avatarInitial }}</span>
          </div>

          <div>
            <h2>آواتار</h2>
            <p>یک تصویر مناسب برای حساب خود انتخاب کنید تا در پنل مشتری نمایش داده شود.</p>
          </div>

          <input type="file" accept="image/*" class="form-control" @change="onAvatarChange" />
          <button type="button" class="customer-profile-btn secondary" :disabled="avatarSaving || !avatarFile" @click="saveAvatar">
            {{ avatarSaving ? 'در حال ذخیره آواتار...' : 'ذخیره آواتار' }}
          </button>
        </article>

        <article class="card customer-profile-card">
          <div class="customer-form-grid">
            <div class="customer-form-item full">
              <label>
                نام و نام خانوادگی
                <span class="customer-form-required-mark" aria-hidden="true">*</span>
              </label>
              <input v-model="form.name" class="form-control" placeholder="نام کامل به فارسی" required />
            </div>

            <div class="customer-form-item">
              <label>ایمیل</label>
              <input v-model="form.email" class="form-control" dir="ltr" placeholder="name@example.com" />
            </div>

            <div class="customer-form-item">
              <label>
                کد ملی
                <span class="customer-form-required-mark" aria-hidden="true">*</span>
              </label>
              <input v-model="form.nationalCode" class="form-control" dir="ltr" placeholder="0012345678" required />
            </div>

            <div class="customer-form-item">
              <label>تاریخ تولد</label>
              <PersianDatePickerInput v-model="form.birthdate" />
            </div>

            <div class="customer-form-item">
              <label>
                {{ isFirstCompletion ? 'رمز عبور' : 'رمز عبور جدید' }}
                <span v-if="isFirstCompletion" class="customer-form-required-mark" aria-hidden="true">*</span>
              </label>
              <input
                v-model="form.password"
                type="password"
                class="form-control"
                dir="ltr"
                :required="isFirstCompletion"
                :placeholder="isFirstCompletion ? 'حداقل 6 کاراکتر با حروف بزرگ، کوچک و عدد' : 'در صورت نیاز رمز جدید وارد کنید'"
              />
            </div>
          </div>

          <div class="customer-profile-actions">
            <button type="button" class="customer-profile-btn primary" :disabled="saving" @click="saveProfile">
              {{ saving ? 'در حال ذخیره...' : isFirstCompletion ? 'تکمیل ثبت نام' : 'ذخیره تغییرات' }}
            </button>
          </div>
        </article>
      </section>
      </CustomerPanelShell>
    </template>
  </section>
</template>

<style scoped src="./styles/CustomerProfileView.css"></style>