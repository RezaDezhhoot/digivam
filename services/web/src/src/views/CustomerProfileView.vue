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

<style scoped>
.customer-profile-view {
  display: grid;
  gap: 18px;
}

.customer-profile-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 48px 28px;
  border-radius: 30px;
  background: var(--web-surface);
  border: 1px solid var(--web-border);
  color: var(--web-muted);
  font-weight: 700;
  font-size: 14px;
}

.customer-profile-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--web-border);
  border-top-color: var(--web-primary);
  border-radius: 50%;
  animation: cpSpin 0.7s linear infinite;
}

@keyframes cpSpin {
  to { transform: rotate(360deg); }
}

.customer-profile-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  flex-wrap: wrap;
  padding: 28px;
  border-radius: 34px;
  background: linear-gradient(135deg, rgba(155, 0, 0, 0.08) 0%, var(--web-surface) 100%);
  border: 1px solid var(--web-border);
  box-shadow: var(--web-shadow);
}

.customer-profile-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--web-primary-soft);
  color: var(--web-primary);
  font-size: 12px;
  font-weight: 800;
}

.customer-profile-hero h1 {
  margin: 12px 0 10px;
  font-size: 32px;
  font-weight: 900;
}

.customer-profile-hero p {
  margin: 0;
  max-width: 720px;
  line-height: 1.9;
  color: var(--web-muted);
}

.customer-profile-meta {
  display: grid;
  gap: 10px;
}

.customer-profile-meta span,
.customer-profile-message {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.customer-profile-meta span {
  background: var(--web-surface-soft);
}

.customer-profile-message {
  width: fit-content;
}

.customer-profile-message.error {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
}

.customer-profile-message.success {
  background: rgba(22, 163, 74, 0.1);
  color: #15803d;
}

.customer-profile-grid {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 18px;
}

.customer-avatar-card,
.customer-profile-card {
  padding: 24px;
  border-radius: 30px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.customer-avatar-card:hover,
.customer-profile-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--web-shadow-lg);
}

.customer-avatar-card {
  display: grid;
  gap: 18px;
  align-content: start;
}

.customer-avatar-preview {
  width: 120px;
  height: 120px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 900;
  overflow: hidden;
}

.customer-avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.customer-avatar-card h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 900;
}

.customer-avatar-card p {
  margin: 0;
  color: var(--web-muted);
  line-height: 1.8;
}

.customer-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.customer-form-item {
  display: grid;
  gap: 8px;
}

.customer-form-item.full {
  grid-column: 1 / -1;
}

.customer-form-item label {
  font-size: 13px;
  font-weight: 800;
}

.customer-form-required-mark {
  color: #dc2626;
  font-weight: 900;
}

.customer-profile-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.customer-profile-btn {
  min-height: 50px;
  padding: 0 22px;
  border-radius: 18px;
  font-size: 14px;
  font-weight: 800;
}

.customer-profile-btn.primary {
  border: none;
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  color: #fff;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.customer-profile-btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(155, 0, 0, 0.2);
}

.customer-profile-btn.secondary {
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
  color: var(--web-text);
}

:global([data-theme='dark']) .customer-profile-view .customer-profile-hero {
  background: linear-gradient(135deg, rgba(255, 106, 99, 0.12) 0%, rgba(16, 23, 32, 0.99) 42%, rgba(10, 15, 23, 0.99) 100%);
  border-color: rgba(151, 176, 214, 0.16);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
}

:global([data-theme='dark']) .customer-profile-view .customer-profile-hero p,
:global([data-theme='dark']) .customer-profile-view .customer-avatar-card p {
  color: #becbdd;
}

:global([data-theme='dark']) .customer-profile-view .customer-profile-meta span {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(151, 176, 214, 0.12);
  color: #f5f8ff;
}

:global([data-theme='dark']) .customer-profile-view .customer-profile-message.error {
  background: rgba(248, 113, 113, 0.14);
  color: #fecaca;
}

:global([data-theme='dark']) .customer-profile-view .customer-profile-message.success {
  background: rgba(34, 197, 94, 0.14);
  color: #bbf7d0;
}

:global([data-theme='dark']) .customer-profile-view .customer-form-item label,
:global([data-theme='dark']) .customer-profile-view .customer-avatar-card h2,
:global([data-theme='dark']) .customer-profile-view .customer-profile-hero h1 {
  color: #f5f8ff;
}

:global([data-theme='dark']) .customer-profile-view .customer-profile-btn.secondary {
  background: var(--web-surface-soft);
  border-color: rgba(151, 176, 214, 0.18);
  color: #f5f8ff;
}

:global([data-theme='dark']) .customer-profile-view .customer-form-required-mark {
  color: #fca5a5;
}

@media (max-width: 991px) {
  .customer-profile-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .customer-form-grid {
    grid-template-columns: 1fr;
  }

  .customer-profile-hero h1 {
    font-size: 28px;
  }
}
</style>