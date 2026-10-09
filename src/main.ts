import { createApp } from 'vue';
import '@fontsource/andika/400.css';
import '@fontsource/andika/700.css';
import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/800.css';
import './styles/main.css';
import App from './App.vue';
import { router } from './router';
import { i18n } from './i18n';

createApp(App).use(i18n).use(router).mount('#app');
