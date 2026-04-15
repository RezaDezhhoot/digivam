<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from '../composables/useTheme.js';
import { getSummary } from '../services/admin-api.js';

const router = useRouter();
const route = useRoute();
const { isDark, toggleTheme } = useTheme();
const sidebarOpen = ref(false);
const pendingFacilityCount = ref(0);
const pendingDealCount = ref(0);
const pendingCuctomerValidations = ref(0);
const pendingWithdrawals = ref(0);

const loadPendingCount = async () => {
  try {
    const data = await getSummary();
    pendingFacilityCount.value = Number(data.pendingFacilities || 0);
    pendingDealCount.value = Number(data.deals?.waitingAdmin || 0);
    pendingCuctomerValidations.value = Number(data?.customerValidations?.pending || 0);
    pendingWithdrawals.value = Number(data.pendingWithdrawals || 0);
  } catch {
    pendingFacilityCount.value = 0;
    pendingDealCount.value = 0;
    pendingCuctomerValidations.value = 0;
    pendingWithdrawals.value = 0;
  }
};

onMounted(loadPendingCount);

const navItems = [
  { to: '/', name: 'dashboard', icon: 'fa-solid fa-gauge-high', label: 'داشبورد' },
  { to: '/deals', relatedLinks: ['deal-detail'] ,name: 'deals', icon: 'fa-solid fa-briefcase', label: 'معاملات' },
  { to: '/brokers', name: 'brokers', icon: 'fa-solid fa-user-tie', label: 'کارگزاران' },
  { to: '/customers', name: 'customers', icon: 'fa-solid fa-users', label: 'مشتریان' },
  { to: '/settings', name: 'settings', icon: 'fa-solid fa-gear', label: 'تنظیمات پایه' },
  { to: '/guarantees', name: 'guarantees', icon: 'fa-solid fa-shield-halved', label: 'ضمانت ها' },
  { to: '/documents', name: 'documents', icon: 'fa-solid fa-folder-open', label: 'مستندات' },
  { to: '/facilities', name: 'facilities', icon: 'fa-solid fa-file-invoice-dollar', label: 'امتیازهای وام' },
  { to: '/notifications', name: 'notifications', icon: 'fa-solid fa-bell', label: 'نوتیفیکیشن ها' },
  { to: '/validations', name: 'validations', icon: 'fa-solid fa-list-check', label: 'روش های اعتبارسنجی' },
  { to: '/customer-validations', name: 'customer-validations', icon: 'fa-solid fa-clipboard-check', label: 'اعتبارسنجی مشتریان' },
  { to: '/loan-types', name: 'loan-types', icon: 'fa-solid fa-layer-group', label: 'انواع وام' },
  { to: '/transactions', name: 'transactions', icon: 'fa-solid fa-money-bill-transfer', label: 'تراکنش ها' },
  { to: '/withdrawals', name: 'withdrawals', icon: 'fa-solid fa-money-check-dollar', label: 'درخواست برداشت' },
  { to: '/tickets', name: 'tickets', icon: 'fa-solid fa-headset', label: 'پشتیبانی' },
  { to: '/admins', name: 'admins', icon: 'fa-solid fa-user-shield', label: 'مدیریت ادمین ها' },
  { to: '/tutorials', name: 'tutorials', icon: 'fa-solid fa-graduation-cap', label: 'آموزش ها' }
];

const pageTitle = computed(() => {
  const titles = {
    dashboard: 'داشبورد مدیریت',
    deals: 'مدیریت معاملات',
    'deal-detail': 'جزئیات معامله',
    brokers: 'مدیریت کارگزاران',
    customers: 'مدیریت مشتریان',
    admins: 'مدیریت ادمین ها',
    settings: 'تنظیمات پایه',
    guarantees: 'مدیریت ضمانت ها',
    documents: 'مدیریت مستندات',
    facilities: 'مدیریت امتیازهای وام',
    notifications: 'مدیریت نوتیفیکیشن ها',
    validations: 'مدیریت روش های اعتبارسنجی',
    'customer-validations': 'اعتبارسنجی های مشتریان',
    'loan-types': 'مدیریت انواع وام',
    transactions: 'تراکنش های سامانه',
    withdrawals: 'مدیریت درخواست برداشت',
    tickets: 'پشتیبانی و تیکت ها',
    tutorials: 'مدیریت آموزش ها'
  };
  return titles[route.name] || 'پنل مدیریت';
});

const breadcrumbs = computed(() => {
  const items = [{ label: 'داشبورد', to: '/' }];

  if (route.name && route.name !== 'dashboard') {
    items.push({ label: pageTitle.value, to: route.fullPath, current: true });
  } else {
    items[0].current = true;
  }

  return items;
});

const logout = () => {
  localStorage.removeItem('admin_token');
  router.push('/login');
};

const closeSidebar = () => { sidebarOpen.value = false; };
</script>

<template>
  <div class="admin-shell">
    <!-- Mobile overlay -->
    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="closeSidebar"></div>

    <aside class="admin-sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-brand">
        <div class="brand-icon">
          <i class="fa-solid fa-chart-line"></i>
        </div>
        <div>
          <h1 class="brand-title">دی جی وام</h1>
          <p class="brand-subtitle">پنل مدیریت سامانه</p>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          class="nav-item"
          :to="item.to"
          :class="{'router-link-active': Array.isArray(item.relatedLinks) && item.relatedLinks.includes($route.name)}"
          @click="closeSidebar"
        >
          <i :class="item.icon" class="nav-icon"></i>
          <span>{{ item.label }}</span>
          <span v-if="item.name === 'facilities' && pendingFacilityCount > 0" class="nav-badge">{{ pendingFacilityCount }}</span>
          <span v-if="item.name === 'deals' && pendingDealCount > 0" class="nav-badge">{{ pendingDealCount }}</span>
          <span v-if="item.name === 'customer-validations' && pendingCuctomerValidations > 0" class="nav-badge">{{ pendingCuctomerValidations }}</span>
          <span v-if="item.name === 'withdrawals' && pendingWithdrawals > 0" class="nav-badge">{{ pendingWithdrawals }}</span>

        </router-link>
      </nav>

      <div class="sidebar-footer">
        <button class="sidebar-btn" @click="toggleTheme">
          <i :class="isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i>
          <span>{{ isDark ? 'حالت روشن' : 'حالت تیره' }}</span>
        </button>
        <button class="sidebar-btn sidebar-btn-logout" @click="logout">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span>خروج</span>
        </button>
      </div>
    </aside>

    <div class="admin-main">
      <div class="ambient-layer" aria-hidden="true">
        <!-- large blurred orbs -->
        <span class="amb-orb orb-1"></span>
        <span class="amb-orb orb-2"></span>
        <span class="amb-orb orb-3"></span>
        <span class="amb-orb orb-4"></span>
        <span class="amb-orb orb-5"></span>
        <!-- floating geometric shapes -->
        <span class="amb-shape shape-hex"></span>
        <span class="amb-shape shape-diamond"></span>
        <span class="amb-shape shape-ring"></span>
        <span class="amb-shape shape-square"></span>
        <span class="amb-shape shape-circle"></span>
        <span class="amb-shape shape-cross"></span>
        <!-- tiny drifting particles -->
        <span class="amb-dot dot-1"></span>
        <span class="amb-dot dot-2"></span>
        <span class="amb-dot dot-3"></span>
        <span class="amb-dot dot-4"></span>
        <span class="amb-dot dot-5"></span>
        <span class="amb-dot dot-6"></span>
        <span class="amb-dot dot-7"></span>
        <span class="amb-dot dot-8"></span>
        <!-- subtle grid mesh -->
        <span class="amb-grid"></span>
      </div>

      <header class="admin-topbar">
        <button class="topbar-menu-btn" @click="sidebarOpen = !sidebarOpen">
          <i class="fa-solid fa-bars"></i>
        </button>
        <div class="topbar-info">
          <h2 class="topbar-title">{{ pageTitle }}</h2>
          <div class="topbar-breadcrumbs">
            <template v-for="(item, index) in breadcrumbs">
              <router-link v-if="!item.current" :key="`link-${item.label}-${index}`" class="breadcrumb-link" :to="item.to">{{ item.label }}</router-link>
              <span v-else :key="`current-${item.label}-${index}`" class="breadcrumb-current">{{ item.label }}</span>
              <i v-if="index < breadcrumbs.length - 1" :key="`separator-${item.label}-${index}`" class="fa-solid fa-angle-left breadcrumb-separator"></i>
            </template>
          </div>
        </div>
        <div class="topbar-badge">
          <i class="fa-solid fa-circle-check"></i>
          مدیر سیستم
        </div>
      </header>

      <main class="admin-content">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped src="./styles/AdminLayout.css"></style>
