<template>
  <div class="login-container">
    <div class="login-box">
      <h2 class="title">无人车远程控制系统</h2>
      <p class="subtitle">Unmanned Vehicle Control System</p>
      
      <el-form class="login-form" size="large">
        <el-form-item>
          <el-input 
            v-model="form.username" 
            placeholder="请输入账号 (admin/op/view)" 
            :prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item>
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码 (默认: 123456)" 
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
          登 录 SYSTEM
        </el-button>
        
        <div class="tips">
          <p>管理员: admin / 123456</p>
          <p>操作员: op / 123456</p>
          <p>查看员: view / 123456</p>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/pinia/userStore';
import { User, Lock } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);

const form = reactive({
  username: '',
  password: ''
});

const handleLogin = async () => {
  if (!form.username || !form.password) return ElMessage.warning('请输入账号密码');
  
  loading.value = true;
  
  // 模拟网络延迟，显得更真实
  setTimeout(() => {
    const success = userStore.login(form.username, form.password);
    if (success) {
      ElMessage.success(`欢迎回来，${form.username} [${userStore.role}]`);
      router.push('/'); // 跳转到主页
    } else {
      ElMessage.error('账号或密码错误');
    }
    loading.value = false;
  }, 800);
};
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1f2a3d 0%, #000 100%);
  color: #fff;
}

.login-box {
  width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
  text-align: center;
}

.title {
  font-size: 24px;
  margin-bottom: 5px;
  letter-spacing: 2px;
}

.subtitle {
  color: #888;
  margin-bottom: 30px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.login-btn {
  width: 100%;
  margin-top: 10px;
  background: linear-gradient(90deg, #409EFF, #337ecc);
  border: none;
  font-weight: bold;
  letter-spacing: 2px;
}

.tips {
  margin-top: 20px;
  font-size: 12px;
  color: #555;
  text-align: left;
  background: rgba(0,0,0,0.2);
  padding: 10px;
  border-radius: 4px;
}
</style>