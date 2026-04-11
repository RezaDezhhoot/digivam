<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
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
              <input id="customer-auth-code" v-model="password" class="form-control customer-auth-input" dir="ltr" inputmode="numeric" maxlength="4" placeholder="1234" />

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

<style scoped>
:global(.customer-auth-overlay) {
  position: fixed;
  inset: 0;
  z-index: 220;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(8, 10, 14, 0.58);
  backdrop-filter: blur(10px);
}

:global(.customer-auth-shell) {
  position: relative;
  width: min(100%, 560px);
  border-radius: 34px;
  border: 1px solid var(--web-border);
  background:
    radial-gradient(circle at top right, rgba(255, 106, 99, 0.14), transparent 30%),
    var(--web-surface);
  box-shadow: 0 28px 80px rgba(12, 16, 26, 0.28);
  padding: 28px;
}

:global(.customer-auth-close) {
  position: absolute;
  top: 18px;
  left: 18px;
  width: 42px;
  height: 42px;
  border: 1px solid var(--web-border);
  border-radius: 14px;
  background: var(--web-surface);
  color: var(--web-text);
  font-size: 24px;
  line-height: 1;
}

:global(.customer-auth-hero) h2 {
  margin: 10px 0 10px;
  font-size: 15px;
  font-weight: 900;
}

:global(.customer-auth-hero) p {
  margin: 0;
  color: var(--web-muted);
  line-height: 1.9;
}

:global(.customer-auth-kicker) {
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

:global(.customer-auth-stepper) {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
}

:global(.customer-auth-step) {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--web-muted);
  font-size: 13px;
  font-weight: 700;
}

:global(.customer-auth-step span) {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid var(--web-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--web-surface-soft);
}

:global(.customer-auth-step.active),
:global(.customer-auth-step.done) {
  color: var(--web-text);
}

:global(.customer-auth-step.active span),
:global(.customer-auth-step.done span) {
  background: var(--web-primary);
  border-color: var(--web-primary);
  color: #fff;
}

:global(.customer-auth-step-line) {
  flex: 1;
  height: 2px;
  background: var(--web-border);
}

:global(.customer-auth-step-line.active) {
  background: linear-gradient(90deg, var(--web-primary) 0%, var(--web-primary-dark) 100%);
}

:global(.customer-auth-message) {
  margin: 18px 0 0;
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 700;
}

:global(.customer-auth-message.error) {
  background: rgba(220, 38, 38, 0.1);
  color: #b91c1c;
}

:global(.customer-auth-message.success) {
  background: rgba(22, 163, 74, 0.1);
  color: #15803d;
}

:global(.customer-auth-retry) {
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(15, 118, 110, 0.16);
  background: rgba(15, 118, 110, 0.08);
  color: #0f766e;
  font-size: 12px;
  font-weight: 900;
  padding: 0 14px;
  margin-top: 12px;
}

:global(.customer-auth-form) {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

:global(.customer-auth-label) {
  font-size: 13px;
  font-weight: 800;
}

:global(.customer-auth-input) {
  min-height: 56px;
  border-radius: 18px;
  font-size: 18px;
}

:global(.customer-auth-actions) {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

:global(.customer-auth-primary),
:global(.customer-auth-secondary) {
  min-height: 50px;
  border-radius: 18px;
  font-size: 14px;
  font-weight: 800;
}

:global(.customer-auth-primary) {
  border: none;
  background: linear-gradient(135deg, var(--web-primary) 0%, #c11212 100%);
  color: #fff;
}

:global(.customer-auth-secondary) {
  flex: 1;
  border: 1px solid var(--web-border);
  background: var(--web-surface-soft);
  color: var(--web-text);
}

.customer-auth-fade-enter-active,
.customer-auth-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.customer-auth-fade-enter-from,
.customer-auth-fade-leave-to {
  opacity: 0;
}

:global([data-theme='dark']) .customer-auth-shell {
  background:
    radial-gradient(circle at top right, rgba(255, 106, 99, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(21, 28, 36, 0.99) 0%, rgba(15, 20, 28, 0.99) 100%);
}

:global([data-theme='dark']) .customer-auth-close,
:global([data-theme='dark']) .customer-auth-secondary {
  background: var(--web-surface-soft);
  border-color: var(--web-border);
  color: var(--web-text);
}

:global([data-theme='dark']) .customer-auth-message.error {
  background: rgba(248, 113, 113, 0.14);
  color: #fecaca;
}

:global([data-theme='dark']) .customer-auth-message.success {
  background: rgba(34, 197, 94, 0.14);
  color: #bbf7d0;
}

@media (max-width: 767px) {
  :global(.customer-auth-overlay) {
    align-items: flex-end;
    padding: 0;
  }

  :global(.customer-auth-shell) {
    width: 100%;
    border-radius: 28px 28px 0 0;
    padding: 22px 18px 28px;
  }

  :global(.customer-auth-hero) h2 {
    font-size: 12px;
  }

  :global(.customer-auth-actions) {
    display: grid;
  }
}
</style>