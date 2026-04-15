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

<style scoped src="./styles/AdminLoginView.css"></style>
