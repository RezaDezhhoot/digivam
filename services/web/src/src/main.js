import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './assets/js/app.js';
import './assets/css/main.css';

const app = createApp(App);
app.use(router);
app.use(Toast, {
  position: 'top-left',
  timeout: 3500,
  rtl: true,
  closeOnClick: true,
  pauseOnHover: true
});
app.mount('#app');
