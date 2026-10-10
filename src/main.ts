import { createApp } from 'vue';
import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-800.css';
import './styles/main.css';
import './styles/game.css';
import App from './App.vue';
import { router } from './router';
import { i18n } from './i18n';
import { startOffline } from './lib/offline';
import { installAudioUnlock } from './lib/audio';

installAudioUnlock();
void startOffline();
createApp(App).use(i18n).use(router).mount('#app');
