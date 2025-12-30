import { createRouter, createWebHistory } from 'vue-router';
import { ElMessage } from 'element-plus';

// 引入组件
import Dashboard from '@/views/Dashboard.vue';
import Login from '@/views/Login.vue';
import Task from '@/views/Task.vue'; 

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
      meta: { requiresAuth: true }
    },
    {
      path: '/task',
      name: 'Task',
      component: Task,
      meta: { 
        requiresAuth: true,
        // ✨ 仅限这两类角色访问
        roles: ['ADMIN', 'OPERATOR'] 
      }
    }
  ]
});

// 全局前置守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role') || 'VIEWER'; // 获取角色

  // 1. 检查是否登录
  if (to.meta.requiresAuth && !token) {
    next('/login');
    return;
  }

  // 2. 检查权限 (针对 /task 页面)
  if (to.meta.roles && Array.isArray(to.meta.roles)) {
    // 这里需要断言一下类型，或者告诉 TS string[] 包含 userRole
    // 简单的方式是把 userRole 当作 string 处理
    if (!to.meta.roles.includes(userRole)) {
      ElMessage.error('权限不足：该页面仅限 管理员 或 操作员 访问');
      
      // 🔴 修复点：将原来的三元运算改为 if-else
      if (from.path === '/login') {
        next(false); // 中断导航，停留在登录页
      } else {
        next('/');   // 否则强行跳回主页
      }
      return;
    }
  }

  next();
});

export default router;