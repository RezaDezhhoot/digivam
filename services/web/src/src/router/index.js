import { createRouter, createWebHistory } from 'vue-router';
import WebLayout from '../layouts/WebLayout.vue';
import HomeView from '../views/HomeView.vue';
import LoanMarketView from '../views/LoanMarketView.vue';
import LoanDetailsView from '../views/LoanDetailsView.vue';
import RequestsView from '../views/RequestsView.vue';
import CustomerDashboardView from '../views/CustomerDashboardView.vue';
import CustomerDealsView from '../views/CustomerDealsView.vue';
import CustomerDealStartView from '../views/CustomerDealStartView.vue';
import CustomerProfileView from '../views/CustomerProfileView.vue';
import CustomerNotificationsView from '../views/CustomerNotificationsView.vue';
import CustomerValidationsView from '../views/CustomerValidationsView.vue';
import CustomerValidationFlowView from '../views/CustomerValidationFlowView.vue';
import SelfValidationView from '../views/SelfValidationView.vue';
import CustomerBookmarksView from '../views/CustomerBookmarksView.vue';
import CustomerRecentlyViewedView from '../views/CustomerRecentlyViewedView.vue';
import { CUSTOMER_TOKEN_KEY, readStoredCustomerProfile } from '../services/customer-auth.api.js';

const routes = [
  {
    path: '/',
    component: WebLayout,
    children: [
      { path: '', name: 'home', component: HomeView },
      { path: 'market', name: 'loan-market', component: LoanMarketView },
      { path: 'market/:slug', name: 'loan-details', component: LoanDetailsView },
      { path: 'requests', name: 'requests', component: RequestsView },
      { path: 'customer/dashboard', name: 'customer-dashboard', component: CustomerDashboardView, meta: { requiresCustomer: true, requiresProfile: true } },
      { path: 'customer/deals', name: 'customer-deals', component: CustomerDealsView, meta: { requiresCustomer: true, requiresProfile: true } },
      { path: 'customer/deals/start/:slug', name: 'customer-deal-start', component: CustomerDealStartView, meta: { requiresCustomer: true, requiresProfile: true } },
      { path: 'customer/deals/:id', name: 'customer-deal-detail', component: CustomerDealStartView, meta: { requiresCustomer: true, requiresProfile: true } },
      { path: 'customer/profile', name: 'customer-profile', component: CustomerProfileView, meta: { requiresCustomer: true } },
      { path: 'customer/notifications', name: 'customer-notifications', component: CustomerNotificationsView, meta: { requiresCustomer: true } },
      { path: 'customer/validations', name: 'customer-validations', component: CustomerValidationsView, meta: { requiresCustomer: true } },
      { path: 'customer/validation-flow/:validationId', name: 'customer-validation-flow', component: CustomerValidationFlowView, meta: { requiresCustomer: true } },
      { path: 'customer/self-validation/:validationId', name: 'customer-self-validation', component: SelfValidationView, meta: { requiresCustomer: true } },
      { path: 'customer/bookmarks', name: 'customer-bookmarks', component: CustomerBookmarksView, meta: { requiresCustomer: true } },
      { path: 'customer/recently-viewed', name: 'customer-recently-viewed', component: CustomerRecentlyViewedView, meta: { requiresCustomer: true } }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  if (!to.meta?.requiresCustomer) {
    return true;
  }

  const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
  if (!token) {
    return {
      name: 'home',
      query: {
        auth: '1',
        redirect: to.fullPath
      }
    };
  }

  const profile = readStoredCustomerProfile();
  if (to.meta.requiresProfile && profile && profile.profile === false && to.name !== 'customer-profile') {
    return { name: 'customer-profile' };
  }

  return true;
});

export default router;
