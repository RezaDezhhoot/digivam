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

const loadPendingCount = async () => {
  try {
    const data = await getSummary();
    pendingFacilityCount.value = Number(data.pendingFacilities || 0);
    pendingDealCount.value = Number(data.deals?.waitingAdmin || 0);
    pendingCuctomerValidations.value = Number(data?.customerValidations?.pending || 0)
  } catch {
    pendingFacilityCount.value = 0;
    pendingDealCount.value = 0;
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
  { to: '/tickets', name: 'tickets', icon: 'fa-solid fa-headset', label: 'پشتیبانی' },
  { to: '/admins', name: 'admins', icon: 'fa-solid fa-user-shield', label: 'مدیریت ادمین ها' }
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
    tickets: 'پشتیبانی و تیکت ها'
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

<style scoped>
.admin-shell {
  min-height: 100vh;
  display: flex;
}

/* --- Sidebar --- */
.admin-sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(180deg, #0b5f83 0%, #064058 100%);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #fff;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 8px;
}

.brand-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.brand-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}

.brand-subtitle {
  font-size: 12px;
  margin: 0;
  opacity: 0.6;
}

/* --- Nav items --- */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-left: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 10px;
  color: rgba(255,255,255,0.75);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s ease;
  position: relative;
}

.nav-item:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

.nav-item.router-link-exact-active,
.nav-item.router-link-active {
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-weight: 700;
}

.nav-item.router-link-exact-active::before,
.nav-item.router-link-active::before {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: #fff;
  border-radius: 4px;
}

.nav-icon {
  width: 20px;
  text-align: center;
  font-size: 15px;
  flex-shrink: 0;
}

.nav-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  margin-right: auto;
  line-height: 1;
}

/* --- Sidebar footer --- */
.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
}

.sidebar-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: none;
  color: rgba(255,255,255,0.75);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar-btn:hover {
  background: rgba(255,255,255,0.12);
  color: #fff;
}

.sidebar-btn-logout:hover {
  background: rgba(239,68,68,0.2);
  color: #fca5a5;
}

/* --- Main content --- */
.admin-main {
  flex: 1;
  margin-right: var(--sidebar-width);
  min-width: 0;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* ====== Ambient Background Layer ====== */
.ambient-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

/* --- Large blurred orbs --- */
.amb-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(6px);
  opacity: 0.4;
  animation: orbDrift 18s ease-in-out infinite alternate;
}

.orb-1 {
  width: 280px; height: 280px;
  top: -90px; left: 8%;
  background: radial-gradient(circle, rgba(11,95,131,0.20) 0%, transparent 72%);
}

.orb-2 {
  width: 360px; height: 360px;
  top: 22%; left: 68%;
  background: radial-gradient(circle, rgba(34,160,107,0.14) 0%, transparent 74%);
  animation-duration: 22s; animation-delay: -5s;
}

.orb-3 {
  width: 240px; height: 240px;
  bottom: -60px; left: 44%;
  background: radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 74%);
  animation-duration: 20s; animation-delay: -8s;
}

.orb-4 {
  width: 200px; height: 200px;
  top: 52%; left: 4%;
  background: radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%);
  animation-duration: 24s; animation-delay: -12s;
}

.orb-5 {
  width: 180px; height: 180px;
  top: 10%; left: 42%;
  background: radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 72%);
  animation-duration: 26s; animation-delay: -3s;
}

/* --- Floating geometric shapes --- */
.amb-shape {
  position: absolute;
  opacity: 0.12;
  animation: shapeDrift 28s linear infinite;
}

.shape-hex {
  width: 46px; height: 46px;
  top: 8%; left: 26%;
  background: var(--admin-primary);
  clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
  animation-duration: 32s;
}

.shape-diamond {
  width: 32px; height: 32px;
  top: 58%; left: 82%;
  background: var(--admin-accent);
  clip-path: polygon(50% 0%,100% 50%,50% 100%,0% 50%);
  animation-duration: 26s; animation-delay: -4s;
}

.shape-ring {
  width: 56px; height: 56px;
  top: 35%; left: 14%;
  border: 2.5px solid rgba(11,95,131,0.18);
  border-radius: 999px;
  animation-duration: 35s; animation-delay: -10s;
}

.shape-square {
  width: 28px; height: 28px;
  top: 72%; left: 56%;
  background: rgba(99,102,241,0.16);
  border-radius: 6px;
  animation-duration: 30s; animation-delay: -7s;
}

.shape-circle {
  width: 22px; height: 22px;
  top: 16%; left: 76%;
  background: rgba(14,165,233,0.18);
  border-radius: 999px;
  animation-duration: 24s; animation-delay: -2s;
}

.shape-cross {
  width: 30px; height: 30px;
  top: 82%; left: 22%;
  background: rgba(34,160,107,0.14);
  clip-path: polygon(35% 0%,65% 0%,65% 35%,100% 35%,100% 65%,65% 65%,65% 100%,35% 100%,35% 65%,0% 65%,0% 35%,35% 35%);
  animation-duration: 28s; animation-delay: -15s;
}

/* --- Drifting particles --- */
.amb-dot {
  position: absolute;
  border-radius: 999px;
  background: var(--admin-primary);
  opacity: 0.16;
  animation: dotRise linear infinite;
}

.dot-1 { width: 5px; height: 5px; left: 10%; bottom: -10px; animation-duration: 18s; }
.dot-2 { width: 4px; height: 4px; left: 25%; bottom: -10px; animation-duration: 22s; animation-delay: -3s; }
.dot-3 { width: 6px; height: 6px; left: 40%; bottom: -10px; animation-duration: 20s; animation-delay: -7s; }
.dot-4 { width: 3px; height: 3px; left: 55%; bottom: -10px; animation-duration: 24s; animation-delay: -1s; }
.dot-5 { width: 5px; height: 5px; left: 70%; bottom: -10px; animation-duration: 19s; animation-delay: -10s; }
.dot-6 { width: 4px; height: 4px; left: 85%; bottom: -10px; animation-duration: 21s; animation-delay: -5s; }
.dot-7 { width: 3px; height: 3px; left: 33%; bottom: -10px; animation-duration: 26s; animation-delay: -14s; opacity: 0.10; }
.dot-8 { width: 5px; height: 5px; left: 62%; bottom: -10px; animation-duration: 23s; animation-delay: -9s; opacity: 0.12; }

/* --- Subtle grid mesh --- */
.amb-grid {
  position: absolute;
  inset: 0;
  opacity: 0.025;
  background-image:
    linear-gradient(var(--admin-primary) 1px, transparent 1px),
    linear-gradient(90deg, var(--admin-primary) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: gridShift 40s linear infinite;
}

/* --- Topbar --- */
.admin-topbar {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--admin-shadow);
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
}

.topbar-menu-btn {
  display: none;
  background: none;
  border: 1px solid var(--admin-border);
  border-radius: 10px;
  width: 40px;
  height: 40px;
  color: var(--admin-text);
  font-size: 16px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

.topbar-info { flex: 1; }

.topbar-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 12px;
}

.breadcrumb-link,
.breadcrumb-current,
.breadcrumb-separator {
  color: var(--admin-muted);
}

.breadcrumb-link {
  text-decoration: none;
}

.breadcrumb-link:hover {
  color: var(--admin-primary);
}

.breadcrumb-current {
  color: var(--admin-text);
  font-weight: 700;
}

.topbar-title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
}

.topbar-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--admin-primary-light);
  color: var(--admin-primary);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.admin-content {
  flex: 1;
  position: relative;
  z-index: 1;
}

.sidebar-backdrop {
  display: none;
}

/* ====== Ambient keyframes ====== */
@keyframes orbDrift {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  25%  { transform: translate3d(18px, -12px, 0) scale(1.04); }
  50%  { transform: translate3d(-10px, 22px, 0) scale(1.08); }
  75%  { transform: translate3d(14px, 8px, 0) scale(0.97); }
  100% { transform: translate3d(0, 0, 0) scale(1); }
}

@keyframes shapeDrift {
  0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0.12; }
  25%  { transform: translate(30px, -20px) rotate(45deg) scale(1.08); opacity: 0.16; }
  50%  { transform: translate(-15px, 35px) rotate(120deg) scale(0.92); opacity: 0.10; }
  75%  { transform: translate(20px, 10px) rotate(220deg) scale(1.04); opacity: 0.14; }
  100% { transform: translate(0, 0) rotate(360deg) scale(1); opacity: 0.12; }
}

@keyframes dotRise {
  0%   { transform: translateY(0) translateX(0); opacity: 0; }
  10%  { opacity: 0.16; }
  90%  { opacity: 0.16; }
  100% { transform: translateY(-110vh) translateX(30px); opacity: 0; }
}

@keyframes gridShift {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(60px, 60px); }
}

/* --- Responsive --- */
@media (max-width: 991px) {
  .admin-sidebar {
    transform: translateX(100%);
  }

  .admin-sidebar.open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 999;
  }

  .admin-main {
    margin-right: 0;
    padding: 16px;
  }

  .topbar-menu-btn {
    display: flex;
  }
}
</style>
