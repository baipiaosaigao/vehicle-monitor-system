import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import { startMockEngine } from './utils/mockEngine';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ElementPlus);

// 启动全局模拟引擎
startMockEngine();

app.mount('#app');