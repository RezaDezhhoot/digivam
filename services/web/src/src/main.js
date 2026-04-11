import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './assets/js/app.js';
import './assets/css/main.css';

createApp(App).use(router).mount('#app');
