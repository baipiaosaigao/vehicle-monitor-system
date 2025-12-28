<template>
  <el-container class="app-wrapper">
    <el-aside width="220px" class="sidebar">
      <div class="logo">无人车监控系统</div>
      <el-menu router :default-active="$route.path" background-color="#304156" text-color="#fff">
        <el-menu-item index="/dashboard">
          <el-icon><Monitor /></el-icon> <span>实时监控</span>
        </el-menu-item>
        <el-menu-item index="/control">
          <el-icon><Aim /></el-icon> <span>任务控制</span>
        </el-menu-item>
        <el-menu-item index="/login" @click="logout">
          <el-icon><SwitchButton /></el-icon> <span>退出登录</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-main class="content-area">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { Monitor, Aim, SwitchButton } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const logout = () => { localStorage.removeItem('token'); };
</script>

<style scoped>
.app-wrapper { height: 100vh; }
.sidebar { background: #304156; color: #fff; }
.logo { height: 60px; line-height: 60px; text-align: center; font-weight: bold; font-size: 18px; border-bottom: 1px solid #1f2d3d; }
.content-area { padding: 0; background: #f0f2f5; }
</style>