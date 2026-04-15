<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import OtpCodeInput from './OtpCodeInput.vue';
import { requestCustomerOtp, verifyCustomerOtp } from '../services/customer-auth.api.js';
import { useCustomerSession } from '../composables/useCustomerSession.js';

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  redirectTo: {
    type: String,
    default: '/customer/dashboard'
  }
});

const emit = defineEmits(['close']);

const router = useRouter();
const { applySession } = useCustomerSession();

const step = ref('phone');
const phone = ref('');
const password = ref('');
const busy = ref(false);
const resendIn = ref(0);
const errorText = ref('');
const successText = ref('');

let timerId = null;

const maskedPhone = computed(() => {
  const value = String(phone.value || '');
  if (value.length !== 11) {
    return value;
  }

  return value;
});

const reset = () => {
  step.value = 'phone';
  password.value = '';
  resendIn.value = 0;
  errorText.value = '';
  successText.value = '';
  stopTimer();
};

const stopTimer = () => {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
};

const startTimer = (seconds) => {
  stopTimer();
  resendIn.value = Number(seconds || 0);

  if (resendIn.value < 1) {
    return;
  }

  timerId = window.setInterval(() => {
    resendIn.value -= 1;
    if (resendIn.value <= 0) {
      stopTimer();
    }
  }, 1000);
};

const close = () => {
  emit('close');
};

const retryCurrentAction = async () => {
  if (busy.value) {
    return;
  }

  if (step.value === 'phone') {
    await submitPhone();
    return;
  }

  await submitOtp();
};

const submitPhone = async () => {
  busy.value = true;
  errorText.value = '';
  successText.value = '';

  try {
    const data = await requestCustomerOtp({ phone: phone.value });
    successText.value = data.message;
    step.value = 'otp';
    startTimer(data.resendIn);
  } catch (error) {
    if (error.status === 409) {
      successText.value = error.message;
      errorText.value = '';
      step.value = 'otp';
      startTimer(error.data?.resendIn || 0);
    } else {
      errorText.value = error.message;
    }
  } finally {
    busy.value = false;
  }
};

const resendCode = async () => {
  if (resendIn.value > 0) {
    return;
  }

  await submitPhone();
};

const submitOtp = async () => {
  if (password.value.length !== 4) {
    errorText.value = 'کد تایید باید ۴ رقم باشد';
    return;
  }

  busy.value = true;
  errorText.value = '';
  successText.value = '';

  try {
    const data = await verifyCustomerOtp({ phone: phone.value, password: password.value });
    applySession(data);
    close();

    if (data.nextStep === 'profile') {
      await router.push('/customer/profile');
      return;
    }

    await router.push(props.redirectTo || '/customer/dashboard');
  } catch (error) {
    errorText.value = error.message;
  } finally {
    busy.value = false;
  }
};

watch(
  () => props.open,
  (open) => {
    if (open) {
      errorText.value = '';
      successText.value = '';
      password.value = '';
      return;
    }

    reset();
  }
);

onBeforeUnmount(() => {
  stopTimer();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="customer-auth-fade">
      <div v-if="open" class="customer-auth-overlay" @click.self="close">
        <div class="customer-auth-shell">
          <button type="button" class="customer-auth-close" @click="close">×</button>

          <div class="customer-auth-hero">
            <span class="customer-auth-kicker">ورود / عضویت مشتری</span>
            <h2>{{ step === 'phone' ? 'شماره همراه خود را وارد کنید' : 'کد تایید پیامک شده را ثبت کنید' }}</h2>
            <p>
              {{
                step === 'phone'
                  ? 'اگر قبلا ثبت نام کرده باشید، پس از تایید کد مستقیما وارد پنل می‌شوید.'
                  : `کد تایید برای ${maskedPhone} ارسال شد. اگر پروفایل شما کامل نباشد، بعد از تایید به صفحه تکمیل ثبت نام هدایت می‌شوید.`
              }}
            </p>
          </div>

          <div class="customer-auth-stepper">
            <div class="customer-auth-step" :class="{ active: true, done: step !== 'phone' }">
              <span>1</span>
              <strong>شماره موبایل</strong>
            </div>
            <div class="customer-auth-step-line" :class="{ active: step !== 'phone' }"></div>
            <div class="customer-auth-step" :class="{ active: step === 'otp' }">
              <span>2</span>
              <strong>کد تایید</strong>
            </div>
          </div>

          <p v-if="errorText" class="customer-auth-message error">{{ errorText }}</p>
          <p v-if="successText" class="customer-auth-message success">{{ successText }}</p>
          <button v-if="errorText" type="button" class="customer-auth-retry" :disabled="busy" @click="retryCurrentAction">
            {{ busy ? 'در حال تلاش...' : 'تلاش مجدد' }}
          </button>

          <form class="customer-auth-form" @submit.prevent="step === 'phone' ? submitPhone() : submitOtp()">
            <template v-if="step === 'phone'">
              <label class="customer-auth-label" for="customer-auth-phone">شماره همراه</label>
              <input id="customer-auth-phone" v-model="phone" class="form-control customer-auth-input" dir="ltr" inputmode="numeric" maxlength="11" placeholder="09xxxxxxxxx" />

              <button type="submit" class="customer-auth-primary" :disabled="busy">
                {{ busy ? 'در حال ارسال...' : 'ارسال کد تایید' }}
              </button>
            </template>

            <template v-else>
              <label class="customer-auth-label" for="customer-auth-code">کد تایید</label>
              <OtpCodeInput v-model="password" :disabled="busy" :auto-focus="open && step === 'otp'" />

              <div class="customer-auth-actions">
                <button type="button" class="customer-auth-secondary" :disabled="busy" @click="step = 'phone'">ویرایش شماره</button>
                <button type="button" class="customer-auth-secondary" :disabled="busy || resendIn > 0" @click="resendCode">
                  {{ resendIn > 0 ? `ارسال مجدد تا ${resendIn} ثانیه` : 'ارسال مجدد کد' }}
                </button>
              </div>

              <button type="submit" class="customer-auth-primary" :disabled="busy">
                {{ busy ? 'در حال بررسی...' : 'تایید و ادامه' }}
              </button>
            </template>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped src="./styles/CustomerAuthModal.css"></style>