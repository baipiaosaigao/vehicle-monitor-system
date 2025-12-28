import { createRouter, createWebHistory } from 'vue-router';
// 引入你的组件
import Dashboard from '@/views/Dashboard.vue';
import Control from '@/views/Control.vue';
import Login from '@/views/Login.vue'; // 👈 引入登录页

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    {
      path: '/',
      name: 'Dashboard',
      component: Dashboard,
      meta: { requiresAuth: true } // 👈 标记需要登录
    },
    {
      path: '/control',
      name: 'Control',
      component: Control,
      meta: { requiresAuth: true }
    }
  ]
});

// 全局前置守卫 (关卡)
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  
  if (to.meta.requiresAuth && !token) {
    // 如果要去需要登录的页面，但没token，就踢回登录页
    next('/login');
  } else {
    next();
  }
});

export default router;