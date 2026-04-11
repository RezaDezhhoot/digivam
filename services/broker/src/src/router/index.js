import { createRouter, createWebHistory } from 'vue-router';
import BrokerLayout from '../layouts/BrokerLayout.vue';
import BrokerPanelView from '../views/BrokerPanelView.vue';
import BrokerAuthView from '../views/BrokerAuthView.vue';
import BrokerDealsView from '../views/BrokerDealsView.vue';
import BrokerLoanCreateView from '../views/BrokerLoanCreateView.vue';
import BrokerNotificationsView from '../views/BrokerNotificationsView.vue';
import BrokerProfileView from '../views/BrokerProfileView.vue';
import BrokerTicketsView from '../views/BrokerTicketsView.vue';
import BrokerValidityView from '../views/BrokerValidityView.vue';

const routes = [
  { path: '/auth', name: 'broker-auth', component: BrokerAuthView, meta: { guestOnly: true } },
  {
    path: '/',
    component: BrokerLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'broker-dashboard',
        component: BrokerPanelView
      },
      {
        path: 'deals',
        name: 'broker-deals',
        component: BrokerDealsView
      },
      {
        path: 'deals/:id',
        name: 'broker-deal-detail',
        component: BrokerDealsView
      },
      {
        path: 'notifications',
        name: 'broker-notifications',
        component: BrokerNotificationsView
      },
      {
        path: 'profile',
        name: 'broker-profile',
        component: BrokerProfileView
      },
      {
        path: 'validity',
        name: 'broker-validity',
        component: BrokerValidityView
      },
      {
        path: 'loan/create',
        name: 'broker-loan-create',
        component: BrokerLoanCreateView
      },
      {
        path: 'tickets',
        name: 'broker-tickets',
        component: BrokerTicketsView
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const token = localStorage.getItem('broker_token');

  if (to.meta.requiresAuth && !token) {
    return '/auth';
  }

  if (to.meta.guestOnly && token) {
    return '/dashboard';
  }

  return true;
});

export default router;
