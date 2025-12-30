<template>
  <div class="dashboard p-20">
    
    <div class="header-bar mb-20">
      <div class="user-info">
        <h2 class="sys-title">无人车监控台</h2>
        <span class="divider">|</span>
        <span class="welcome">
          欢迎, {{ userStore.username }} 
          <el-tag effect="dark" :type="roleTagType" size="small" class="ml-10">
            {{ userStore.role }}
          </el-tag>
        </span>
      </div>
      
      <div class="header-actions">
        <el-button 
          v-if="['ADMIN', 'OPERATOR'].includes(userStore.role)" 
          type="primary" 
          size="small" 
          :icon="Position" 
          @click="$router.push('/task')"
        >
          AI 任务规划
        </el-button>

        <el-button 
          v-if="canControl" 
          type="success" 
          size="small" 
          plain 
          :icon="Download" 
          @click="openExportDialog"
        >
          数据导出
        </el-button>

        <el-button type="danger" size="small" plain @click="handleLogout">
          退出登录
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="6" v-for="item in statusItems" :key="item.label">
        <el-card shadow="hover" class="status-card" :body-style="{ padding: '15px' }">
          <div class="stat-value" :class="item.colorClass">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="main-row">
      <el-col :span="16" class="left-panel-col">
        <div class="split-layout">
          <el-card class="map-section" :body-style="{ padding: 0, height: '100%' }">
            <LiveMap />
            <div class="map-overlay">
              GPS: {{ vehicleStore.status.location.lat.toFixed(5) }}, {{ vehicleStore.status.location.lng.toFixed(5) }}
            </div>
          </el-card>
          <el-card class="camera-section" header="车载摄像头" :body-style="{ padding: 0, height: '100%' }">
            <CameraPanel />
          </el-card>
        </div>
      </el-col>

      <el-col :span="8" class="flex-col h-full gap-20">
        <el-card header="手动驾驶" class="control-card">
          <template v-if="canControl">
            <ManualJoystick />
          </template>
          <template v-else>
            <div class="no-permission">
              <el-icon :size="30"><Lock /></el-icon>
              <p>当前角色无控制权限</p>
            </div>
          </template>
        </el-card>

        <el-card header="IMU 震动监控 (Admin Only)" class="chart-card">
          <div v-show="isAdmin" ref="chartRef" style="height: 220px; width: 100%"></div>
          <div v-if="!isAdmin" class="no-permission">
            <el-icon :size="30"><Hide /></el-icon>
            <p>仅管理员可查看调试数据</p>
          </div>
        </el-card>

        <el-card header="实时日志" class="flex-1 log-box" :body-style="{ padding: '10px', height: '100%' }">
          <div class="log-scroll">
            <div v-for="log in vehicleStore.logs" :key="log.id" class="log-item" :class="log.type">
              <span class="time">[{{ log.time }}]</span> {{ log.content }}
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="exportDialogVisible" title="导出数据记录" width="30%">
      <div class="export-options">
        <p>请选择需要导出的数据类型：</p>
        <el-checkbox v-model="exportOptions.sensor" label="历史传感器数据 (CSV/Excel)" size="large" />
        <el-checkbox v-model="exportOptions.logs" label="系统运行日志" size="large" />
        <el-checkbox v-model="exportOptions.alerts" label="告警/故障记录" size="large" />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="exportDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="isExporting" @click="handleExportConfirm">
            确认导出 (.xlsx)
          </el-button>
        </span>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, watch, reactive } from 'vue';
import { useVehicleStore } from '@/pinia/vehicleStore';
import { useUserStore } from '@/pinia/userStore';
import LiveMap from '@/components/Map/LiveMap.vue';
import ManualJoystick from '@/components/Control/ManualJoystick.vue';
import CameraPanel from '@/components/Monitor/CameraPanel.vue';
import * as echarts from 'echarts';
import { Lock, Hide, Download, Position } from '@element-plus/icons-vue'; // ✨ 引入 Position 图标
import { ElMessageBox, ElMessage } from 'element-plus';
import * as XLSX from 'xlsx'; 

const vehicleStore = useVehicleStore();
const userStore = useUserStore();

// --- 权限逻辑 ---
const roleTagType = computed(() => {
  switch (userStore.role) {
    case 'ADMIN': return 'danger';
    case 'OPERATOR': return 'warning';
    case 'VIEWER': return 'info';
    default: return '';
  }
});
const canControl = computed(() => ['ADMIN', 'OPERATOR'].includes(userStore.role));
const isAdmin = computed(() => userStore.role === 'ADMIN');

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出系统吗?', '提示', {
    confirmButtonText: '退出', cancelButtonText: '取消', type: 'warning',
  }).then(() => { userStore.logout(); });
};

// --- ECharts 逻辑 ---
const chartRef = ref();
const chartInstance = shallowRef();
const statusItems = computed(() => [
  { label: '连接状态', value: vehicleStore.status.isConnected ? '在线' : '离线', colorClass: vehicleStore.status.isConnected ? 'text-green' : 'text-gray' },
  { label: '驾驶模式', value: vehicleStore.status.mode === 'AUTO' ? 'AI托管' : '人工驾驶', colorClass: 'text-blue' },
  { label: '实时车速', value: `${vehicleStore.status.speed} m/s`, colorClass: vehicleStore.status.speed > 4 ? 'text-red' : 'text-dark' },
  { label: '剩余电量', value: `${vehicleStore.status.battery.toFixed(0)}%`, colorClass: vehicleStore.isLowBattery ? 'text-red' : 'text-green' },
]);

onMounted(() => {
  if (isAdmin.value && chartRef.value) initChart();
  window.addEventListener('resize', handleResize);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (chartInstance.value) chartInstance.value.dispose();
});
const initChart = () => {
  chartInstance.value = echarts.init(chartRef.value);
  chartInstance.value.setOption({
    grid: { top: 10, bottom: 20, left: 30, right: 10 },
    xAxis: { type: 'category', show: false },
    yAxis: { type: 'value', min: 8, max: 12, splitLine: { show: false } },
    series: [{ type: 'line', data: [], smooth: true, showSymbol: false, lineStyle: { width: 1, color: '#409EFF' } }]
  });
};
const handleResize = () => { chartInstance.value?.resize(); };
watch(() => vehicleStore.sensorData, (data) => {
  if (chartInstance.value) chartInstance.value.setOption({ series: [{ data }] });
}, { deep: true });

// --- 导出逻辑 ---
const exportDialogVisible = ref(false);
const isExporting = ref(false);
const exportOptions = reactive({ sensor: true, logs: true, alerts: true });

const openExportDialog = () => { exportDialogVisible.value = true; };

const generateMockHistory = () => {
  const data = [];
  const now = new Date();
  for (let i = 0; i < 50; i++) {
    const time = new Date(now.getTime() - i * 1000 * 60);
    data.push({
      timestamp: time.toLocaleString(),
      speed: (Math.random() * 5 + 2).toFixed(2) + ' m/s',
      battery: (100 - i * 0.5).toFixed(1) + '%',
      latitude: (39.9 + Math.random() * 0.01).toFixed(6),
      longitude: (116.3 + Math.random() * 0.01).toFixed(6),
      status: Math.random() > 0.9 ? 'WARNING' : 'NORMAL'
    });
  }
  return data;
};

const handleExportConfirm = () => {
  isExporting.value = true;
  setTimeout(() => {
    try {
      const wb = XLSX.utils.book_new();
      if (exportOptions.sensor) {
        const ws_sensor = XLSX.utils.json_to_sheet(generateMockHistory());
        XLSX.utils.book_append_sheet(wb, ws_sensor, "传感器历史数据");
      }
      if (exportOptions.logs) {
        const logData = vehicleStore.logs.map(log => ({ Time: log.time, Type: log.type, Content: log.content }));
        const ws_logs = XLSX.utils.json_to_sheet(logData);
        XLSX.utils.book_append_sheet(wb, ws_logs, "系统日志");
      }
      if (exportOptions.alerts) {
        const alertData: any[] = vehicleStore.logs.filter(l => l.type === 'WARNING' || l.type === 'ERROR').map(l => ({ Time: l.time, Level: l.type, Message: l.content }));
        if(alertData.length === 0) alertData.push({ Time: '-', Level: '-', Message: '无异常记录' });
        const ws_alerts = XLSX.utils.json_to_sheet(alertData);
        XLSX.utils.book_append_sheet(wb, ws_alerts, "告警记录");
      }
      const fileName = `Vehicle_Data_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      ElMessage.success('导出成功！');
      exportDialogVisible.value = false;
    } catch (e) {
      ElMessage.error('导出失败');
      console.error(e);
    } finally {
      isExporting.value = false;
    }
  }, 1000);
};
</script>

<style scoped>
/* 保持所有原有样式，直接复制即可 */
.p-20 { padding: 20px; height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; background-color: #f0f2f5; }
.mb-20 { margin-bottom: 15px; }
.main-row { flex: 1; overflow: hidden; } 
.h-full { height: 100%; }
.flex-col { display: flex; flex-direction: column; }
.gap-20 { gap: 15px; }
.ml-10 { margin-left: 10px; }
.header-bar { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 10px 20px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
.header-actions { display: flex; gap: 10px; }
.sys-title { font-size: 18px; margin: 0; display: inline-block; vertical-align: middle; color: #303133; }
.divider { margin: 0 15px; color: #dcdfe6; }
.welcome { font-size: 14px; color: #606266; }
.no-permission { height: 100%; min-height: 120px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #f5f7fa; color: #909399; border-radius: 4px; }
.no-permission p { margin-top: 10px; font-size: 12px; }
.left-panel-col { height: 100%; }
.split-layout { display: flex; flex-direction: column; height: 100%; gap: 15px; }
.map-section { flex: 1.5; min-height: 0; position: relative; }
.camera-section { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.map-overlay { position: absolute; top: 10px; left: 50px; background: rgba(0,0,0,0.7); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px; z-index: 2000; backdrop-filter: blur(4px); pointer-events: none; }
.text-green { color: #67C23A; }
.text-red { color: #F56C6C; }
.text-blue { color: #409EFF; }
.text-gray { color: #909399; }
.stat-value { font-size: 22px; font-weight: bold; line-height: 1.2; }
.stat-label { font-size: 12px; color: #666; }
.control-card { flex: 0 0 auto; }
.chart-card { flex: 0 0 auto; }
.log-box { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.log-scroll { overflow-y: auto; flex: 1; }
.log-item { font-size: 12px; margin-bottom: 2px; line-height: 1.4; }
.log-item.ERROR { color: #F56C6C; }
.log-item.WARNING { color: #E6A23C; }
.log-item.INFO { color: #606266; }
.export-options { display: flex; flex-direction: column; gap: 10px; padding: 10px 20px; }
</style>