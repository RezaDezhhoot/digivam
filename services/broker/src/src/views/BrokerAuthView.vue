<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { requestOtp, verifyOtp } from '../services/broker-auth.api.js';
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
  busy.value = true;
  try {
    const payload = await verifyOtp(normalizePhone(phone.value), password.value);
    localStorage.setItem('broker_token', payload.token);
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
                  <input v-model="password" class="form-control form-control-lg wizard-input" dir="ltr" inputmode="numeric" maxlength="4" placeholder="1234" :disabled="busy" />
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

<style scoped>
.auth-wizard-page { min-height: 100vh; background: var(--page-bg);display: flex; align-items: center; }

.auth-grid {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--panel-border);
  background: var(--surface-color);
  box-shadow: var(--panel-shadow);
}

.auth-aside {
  background: linear-gradient(180deg, var(--brand-primary) 0%, var(--brand-secondary) 100%);
  color: #fff;
  padding: 28px;
  display: flex;
  flex-direction: column;
}
.auth-aside-copy { margin-top: auto; }

.auth-feature-list { padding: 0; margin: 0; list-style: none; display: grid; gap: 12px; }
.auth-feature-list li {
  padding: 14px 16px; border-radius: 12px;
  background: rgba(255,255,255,0.08);
  display: flex; align-items: center; gap: 10px;
}
.feature-icon { font-size: 16px; opacity: 0.8; }

.auth-theme-btn {
  align-self: flex-start;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.08);
  display: flex; align-items: center; gap: 6px;
}
.auth-theme-btn:hover { color: #fff; background: rgba(255,255,255,0.16); }

.wizard-card { background: var(--surface-color); overflow: hidden; }

.wizard-head {
  padding: 28px 28px 18px;
  background: var(--surface-soft);
  border-bottom: 1px solid var(--panel-border);
}
.wizard-head-icon {
  width: 44px; height: 44px; border-radius: 12px;
  background: var(--chip-bg); color: var(--brand-primary);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; margin-bottom: 14px;
}

.wizard-kicker { font-size: 12px; letter-spacing: 0.12em; color: var(--brand-primary); font-weight: 700; }
.wizard-body { padding: 24px 28px 28px; }

.wizard-steps { display: flex; align-items: center; gap: 10px; }
.wizard-step { display: flex; align-items: center; gap: 8px; color: var(--muted-text); font-size: 14px; }
.wizard-step.active { color: var(--brand-primary); font-weight: 600; }

.wizard-badge {
  width: 32px; height: 32px; border-radius: 999px;
  border: 1px solid var(--panel-border-strong);
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--surface-color); font-size: 13px;
}
.wizard-step.active .wizard-badge { background: var(--brand-primary); color: #fff; border-color: var(--brand-primary); }

.wizard-line { flex: 1; height: 2px; background: var(--panel-border); }
.wizard-line.active { background: var(--brand-primary); }

.wizard-input { border-color: var(--panel-border-strong); border-radius: 12px; }
.wizard-input:focus { border-color: var(--brand-primary); box-shadow: 0 0 0 0.2rem rgba(219,0,0,0.12); }

.btn-wizard {
  background: var(--brand-primary); border-color: var(--brand-primary);
  color: #fff; border-radius: 12px;
}
.btn-wizard:hover, .btn-wizard:focus { background: var(--brand-secondary); border-color: var(--brand-secondary); color: #fff; }

.wizard-link { color: var(--brand-primary); text-decoration: none; }
.wizard-link:hover { color: var(--brand-secondary); }

@media (max-width: 991px) { .auth-grid { grid-template-columns: 1fr; } .auth-aside { min-height: 280px; } }
@media (max-width: 575px) { .wizard-head, .wizard-body { padding-left: 18px; padding-right: 18px; } .wizard-step span:last-child { font-size: 12px; } }
</style>
