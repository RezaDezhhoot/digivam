<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { adminLogin } from '../services/admin-api.js';
import { useTheme } from '../composables/useTheme.js';
import { useAppToast } from '../composables/useToast.js';

const router = useRouter();
const toast = useAppToast();
const { isDark, toggleTheme } = useTheme();
const phone = ref('');
const password = ref('');
const loading = ref(false);

const submit = async () => {
  loading.value = true;
  try {
    const response = await adminLogin({ phone: phone.value, password: password.value });
    localStorage.setItem('admin_token', response.token);
    toast.success('ورود موفقیت‌آمیز');
    router.push('/');
  } catch (error) {
    toast.error(error.message);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <section class="login-page">
    <div class="container py-4 py-md-5">
      <div class="row justify-content-center">
        <div class="col-12 col-xl-10">
          <div class="login-grid">
            <div class="login-aside">
              <button class="btn login-theme-btn" @click="toggleTheme">
                <i :class="isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i>
              </button>
              <div class="mt-auto">
                <div class="aside-brand">
                  <i class="fa-solid fa-chart-line"></i>
                  <span>دی جی وام</span>
                </div>
                <h1 class="aside-title">کنسول مدیریت سامانه</h1>
                <p class="aside-desc">دسترسی به مدیریت کاربران، تایید احراز هویت و کنترل پنل عملیاتی.</p>
                <div class="aside-features">
                  <div class="aside-feature"><i class="fa-solid fa-shield-halved"></i> احراز هویت امن</div>
                  <div class="aside-feature"><i class="fa-solid fa-users-gear"></i> مدیریت کاربران</div>
                  <div class="aside-feature"><i class="fa-solid fa-gear"></i> تنظیمات سامانه</div>
                </div>
              </div>
            </div>

            <div class="login-form-section">
              <div class="login-form-inner">
                <div class="login-form-head">
                  <div class="form-head-icon"><i class="fa-solid fa-lock"></i></div>
                  <h2 class="form-head-title">ورود به پنل</h2>
                  <p class="form-head-desc">شماره همراه و رمز عبور خود را وارد کنید</p>
                </div>

                <form @submit.prevent="submit">
                  <div class="mb-3">
                    <label class="form-label form-label-required"><i class="fa-solid fa-phone me-1"></i> شماره همراه</label>
                    <input v-model="phone" class="form-control form-control-lg" dir="ltr" placeholder="09xxxxxxxxx" :disabled="loading" />
                  </div>
                  <div class="mb-4">
                    <label class="form-label form-label-required"><i class="fa-solid fa-key me-1"></i> رمز عبور</label>
                    <input v-model="password" type="password" class="form-control form-control-lg" dir="ltr" :disabled="loading" />
                  </div>

                  <button class="btn btn-primary w-100 btn-lg" :disabled="loading">
                    <i v-if="loading" class="fa-solid fa-spinner fa-spin me-1"></i>
                    <i v-else class="fa-solid fa-right-to-bracket me-1"></i>
                    {{ loading ? 'در حال ورود...' : 'ورود' }}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.login-page { min-height: 100vh; background: var(--admin-bg); display: flex; align-items: center; }

.login-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--admin-border);
  box-shadow: var(--admin-shadow-lg);
}

.login-aside {
  padding: 32px;
  min-height: 520px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(160deg, #0b5f83 0%, #064058 100%);
  color: #fff;
}

.login-theme-btn {
  align-self: flex-start;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.08);
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-theme-btn:hover { color: #fff; background: rgba(255,255,255,0.16); }

.aside-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 14px;
  letter-spacing: 0.05em;
  opacity: 0.8;
}
.aside-brand i { font-size: 18px; }
.aside-title { font-size: 26px; font-weight: 700; margin: 0 0 10px; }
.aside-desc { opacity: 0.65; margin: 0 0 24px; font-size: 14px; line-height: 1.7; }

.aside-features { display: flex; flex-direction: column; gap: 10px; }
.aside-feature {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px;
  background: rgba(255,255,255,0.08); font-size: 14px;
}

.login-form-section {
  background: var(--admin-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.login-form-inner { width: 100%; max-width: 380px; }

.login-form-head { text-align: center; margin-bottom: 28px; }
.form-head-icon {
  width: 56px; height: 56px; border-radius: 16px;
  background: var(--admin-primary-light); color: var(--admin-primary);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 22px; margin-bottom: 14px;
}
.form-head-title { font-size: 20px; font-weight: 700; margin: 0 0 6px; }
.form-head-desc { font-size: 13px; color: var(--admin-muted); margin: 0; }

@media (max-width: 991px) {
  .login-grid { grid-template-columns: 1fr; }
  .login-aside { min-height: 240px; }
}
</style>
