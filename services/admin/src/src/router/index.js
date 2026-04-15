import { createRouter, createWebHistory } from 'vue-router';
import AdminLayout from '../layouts/AdminLayout.vue';
import AdminLoginView from '../views/AdminLoginView.vue';
import AdminDealsView from '../views/AdminDealsView.vue';
import DashboardView from '../views/DashboardView.vue';
import LoanApprovalsView from '../views/LoanApprovalsView.vue';
import UsersView from '../views/UsersView.vue';

const routes = [
  {
    path: '/login',
    name: 'admin-login',
    component: AdminLoginView,
    meta: { guestOnly: true }
  },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: DashboardView },
      { path: 'deals', name: 'deals', component: AdminDealsView },
      { path: 'deals/:id', name: 'deal-detail', component: AdminDealsView },
      { path: 'brokers', name: 'brokers', component: LoanApprovalsView },
      { path: 'customers', name: 'customers', component: UsersView },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../views/SettingsView.vue')
      },
      {
        path: 'guarantees',
        name: 'guarantees',
        component: () => import('../views/GuaranteesView.vue')
      },
      {
        path: 'documents',
        name: 'documents',
        component: () => import('../views/DocumentsView.vue')
      },
      {
        path: 'facilities',
        name: 'facilities',
        component: () => import('../views/FacilitiesView.vue')
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('../views/NotificationsView.vue')
      },
      {
        path: 'validations',
        name: 'validations',
        component: () => import('../views/ValidationsView.vue')
      },
      {
        path: 'customer-validations',
        name: 'customer-validations',
        component: () => import('../views/CustomerValidationsView.vue')
      },
      {
        path: 'loan-types',
        name: 'loan-types',
        component: () => import('../views/LoanTypesView.vue')
      },
      {
        path: 'transactions',
        name: 'transactions',
        component: () => import('../views/TransactionsView.vue')
      },
      {
        path: 'tickets',
        name: 'tickets',
        component: () => import('../views/TicketsView.vue')
      },
      {
        path: 'admins',
        name: 'admins',
        component: () => import('../views/AdminsView.vue')
      },
      {
        path: 'tutorials',
        name: 'tutorials',
        component: () => import('../views/TutorialsView.vue')
      },
      {
        path: 'withdrawals',
        name: 'withdrawals',
        component: () => import('../views/WithdrawalsView.vue')
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const token = localStorage.getItem('admin_token');

  if (to.meta.requiresAuth && !token) {
    return '/login';
  }

  if (to.meta.guestOnly && token) {
    return '/';
  }

  return true;
});

export default router;
