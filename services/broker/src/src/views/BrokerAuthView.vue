<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import OtpCodeInput from '../components/OtpCodeInput.vue';
import { persistBrokerSession, requestOtp, verifyOtp } from '../services/broker-auth.api.js';
import { useTheme } from '../composables/useTheme.js';
import { useAppToast } from '../composables/useToast.js';

const router = useRouter();
const { isDark, toggleTheme } = useTheme();
const toast = useAppToast();

const step = ref('phone');
const phone = ref('');
const password = ref('');
const resendIn = ref(0);
const busy = ref(false);

let timerId = null;

const canResend = computed(() => resendIn.value <= 0 && !busy.value);

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('09') && digits.length === 11) return digits;
  if (digits.startsWith('9') && digits.length === 10) return `0${digits}`;
  return digits;
};

const startTimer = (seconds) => {
  resendIn.value = Number(seconds || 0);
  if (timerId) clearInterval(timerId);
  if (resendIn.value <= 0) return;
  timerId = setInterval(() => {
    if (resendIn.value <= 1) { clearInterval(timerId); timerId = null; resendIn.value = 0; return; }
    resendIn.value -= 1;
  }, 1000);
};

const submitPhone = async () => {
  busy.value = true;
  try {
    const payload = await requestOtp(normalizePhone(phone.value));
    step.value = 'password';
    startTimer(payload.resendIn || 90);
    toast.success(payload.message || 'کد تایید ارسال شد');
  } catch (error) {
    if (error.status === 409) {
      step.value = 'password';
      startTimer(error.data?.resendIn || 90);
      toast.success(error.message || 'کد تایید قبلا ارسال شده است');
    } else {
      toast.error(error.message);
    }
  } finally {
    busy.value = false;
  }
};

const submitPassword = async () => {
  if (password.value.length !== 4) {
    toast.error('کد تایید باید ۴ رقم باشد');
    return;
  }

  busy.value = true;
  try {
    const payload = await verifyOtp(normalizePhone(phone.value), password.value);
    persistBrokerSession(payload);
    toast.success(payload.message || 'ورود موفقیت آمیز');
    setTimeout(() => router.push('/dashboard'), 400);
  } catch (error) {
    toast.error(error.message);
  } finally {
    busy.value = false;
  }
};

const resendOtp = async () => { if (!canResend.value) return; await submitPhone(); };
const goBack = () => { step.value = 'phone'; password.value = ''; };
const currentStep = computed(() => (step.value === 'phone' ? 1 : 2));
</script>

<template>
  <section class="auth-wizard-page">
    <div class="container py-4 py-md-5">
      <div class="row justify-content-center">
        <div class="col-12 col-xl-10">
          <div class="auth-grid shadow-sm">
            <div class="auth-aside">
              <button class="btn auth-theme-btn ms-auto" @click="toggleTheme">
                <i :class="isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i>
                {{ isDark ? 'حالت روشن' : 'حالت تیره' }}
              </button>
              <div class="auth-aside-copy">
                <p class="wizard-kicker mb-2"><i class="fa-solid fa-handshake me-1"></i> دی جی وام</p>
                <h1 class="display-6 fw-bold mb-3">ورود به پنل کارگزار</h1>
                <p class="mb-4 text-white-50">احراز هویت مرحله‌ای برای ورود امن به کارتابل کارگزاری.</p>
                <ul class="auth-feature-list">
                  <li><i class="fa-solid fa-mobile-screen-button feature-icon"></i> دریافت کد تایید با شماره همراه</li>
                  <li><i class="fa-solid fa-clipboard-check feature-icon"></i> تکمیل پروفایل و احراز هویت مرحله‌ای</li>
                  <li><i class="fa-solid fa-file-invoice-dollar feature-icon"></i> دسترسی به ثبت امتیاز وام</li>
                </ul>
              </div>
            </div>

            <div class="wizard-card">
              <div class="wizard-head">
                <div class="wizard-head-icon"><i class="fa-solid fa-right-to-bracket"></i></div>
                <p class="wizard-kicker mb-2">ورود کارگزار</p>
                <h1 class="h4 mb-1">احراز هویت کارگزار</h1>
                <p class="mb-0 text-secondary">ورود مرحله ای به کارتابل دی جی وام</p>

                <div class="wizard-steps mt-4">
                  <div class="wizard-step" :class="{ active: currentStep >= 1 }">
                    <span class="wizard-badge"><i class="fa-solid fa-phone"></i></span>
                    <span>شماره موبایل</span>
                  </div>
                  <div class="wizard-line" :class="{ active: currentStep === 2 }"></div>
                  <div class="wizard-step" :class="{ active: currentStep >= 2 }">
                    <span class="wizard-badge"><i class="fa-solid fa-key"></i></span>
                    <span>کد تایید</span>
                  </div>
                </div>
              </div>

              <form class="wizard-body" @submit.prevent="step === 'phone' ? submitPhone() : submitPassword()">
                <div v-if="step === 'phone'" class="mb-3">
                  <label class="form-label form-label-required"><i class="fa-solid fa-mobile-screen me-1"></i> شماره همراه</label>
                  <input v-model="phone" class="form-control form-control-lg wizard-input" dir="ltr" inputmode="numeric" placeholder="09xxxxxxxxx" :disabled="busy" />
                </div>

                <div v-if="step === 'password'" class="mb-3">
                  <label class="form-label form-label-required"><i class="fa-solid fa-mobile-screen me-1"></i> شماره همراه</label>
                  <input v-model="phone" class="form-control text-muted form-control-lg wizard-input mb-3" dir="ltr" disabled />
                  <label class="form-label form-label-required"><i class="fa-solid fa-key me-1"></i> کد تایید 4 رقمی</label>
                  <OtpCodeInput v-model="password" :disabled="busy" :auto-focus="step === 'password'" />
                </div>

                <button class="btn btn-wizard w-100 btn-lg" type="submit" :disabled="busy">
                  <i v-if="busy" class="fa-solid fa-spinner fa-spin me-1"></i>
                  {{ step === 'phone' ? 'ارسال کد تایید' : 'تایید و ورود' }}
                </button>

                <div v-if="step === 'password'" class="d-flex justify-content-between align-items-center mt-3 gap-2 flex-wrap">
                  <button class="btn btn-link wizard-link p-0" type="button" @click="goBack"><i class="fa-solid fa-arrow-right me-1"></i> بازگشت به مرحله قبل</button>
                  <button class="btn btn-link wizard-link p-0" type="button" :disabled="!canResend" @click="resendOtp">
                    <i class="fa-solid fa-rotate-right me-1"></i>
                    {{ canResend ? 'ارسال مجدد کد' : `ارسال مجدد تا ${resendIn} ثانیه` }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="./styles/BrokerAuthView.css"></style>
