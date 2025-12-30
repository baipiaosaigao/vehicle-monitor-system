<template>
  <div class="task-page">
    <div class="header-bar">
      <div class="left">
        <el-button :icon="ArrowLeft" @click="$router.push('/')">返回监控大屏</el-button>
        <span class="page-title">AI 任务规划中心</span>
      </div>
      <div class="right">
        <span class="user-role">当前身份: {{ userStore.role }}</span>
      </div>
    </div>

    <div class="content-row">
      <div class="map-container">
        <el-card shadow="never" :body-style="{ padding: 0, height: '100%' }">
          <LiveMap />
          <div class="map-tip">
            <el-icon><InfoFilled /></el-icon>
            可在地图上拖拽途经点调整路线
          </div>
        </el-card>
      </div>

      <div class="panel-container">
        <el-card shadow="never" class="h-full" header="任务控制台">
          <AITaskPanel />
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/pinia/userStore';
import LiveMap from '@/components/Map/LiveMap.vue';
import AITaskPanel from '@/components/Control/AITaskPanel.vue'; 
import { ArrowLeft, InfoFilled } from '@element-plus/icons-vue';

const userStore = useUserStore();
</script>

<style scoped>
.task-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
}

.header-bar {
  height: 60px;
  background: #fff;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  z-index: 10;
}
.page-title { margin-left: 15px; font-size: 18px; font-weight: bold; color: #303133; }
.user-role { font-size: 14px; color: #909399; background: #f4f4f5; padding: 4px 8px; border-radius: 4px; }

.content-row {
  flex: 1;
  display: flex;
  padding: 20px;
  gap: 20px;
  overflow: hidden;
}

.map-container { flex: 1; position: relative; display: flex; flex-direction: column; }
.panel-container { width: 400px; display: flex; flex-direction: column; }
.h-full { height: 100%; display: flex; flex-direction: column; }

.map-tip {
  position: absolute; top: 10px; left: 50px;
  background: rgba(255, 255, 255, 0.9); padding: 8px 12px;
  border-radius: 4px; font-size: 12px; color: #606266;
  display: flex; align-items: center; gap: 5px;
  z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  pointer-events: none;
}
</style>