import { defineStore } from 'pinia';
import { ref } from 'vue';

// 定义三种角色
export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export const useUserStore = defineStore('user', () => {

  // 从 localStorage 读取，实现“记住登录状态”
  const token = ref(localStorage.getItem('token') || '');
  const username = ref(localStorage.getItem('username') || '');
  const role = ref<UserRole>((localStorage.getItem('role') as UserRole) || 'VIEWER');

  // 模拟登录逻辑
  function login(user: string, pass: string): boolean {
    // 简单模拟后端验证：
    // 1. 管理员 (admin / 123456) -> 全权限
    // 2. 操作员 (op / 123456) -> 能看能控
    // 3. 查看员 (view / 123456) -> 只能看
    
    if (pass !== '123456') return false; // 密码统一 123456

    let userRole: UserRole = 'VIEWER';
    if (user === 'admin') userRole = 'ADMIN';
    else if (user === 'op') userRole = 'OPERATOR';
    else if (user === 'view') userRole = 'VIEWER';
    else return false; // 用户名不对

    // 登录成功，保存状态
    token.value = 'mock-token-' + Date.now();
    username.value = user;
    role.value = userRole;

    // 持久化存储 (记住我)
    localStorage.setItem('token', token.value);
    localStorage.setItem('username', username.value);
    localStorage.setItem('role', role.value);

    return true;
  }

  // 注销逻辑
  function logout() {
    token.value = '';
    username.value = '';
    role.value = 'VIEWER';
    localStorage.clear();
    // 刷新页面或跳转回登录页
    window.location.href = '/login'; 
  }

  return { token, username, role, login, logout };
});