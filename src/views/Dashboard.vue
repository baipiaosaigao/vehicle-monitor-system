<template>
  <div class="dashboard p-20">
    <div class="header-bar mb-20">
      <div class="user-info">
        <h2 class="sys-title">无人车监控台</h2>
        <span class="divider">|</span>
        <span class="welcome">欢迎, {{ userStore.username }} <el-tag effect="dark" :type="roleTagType" size="small" class="ml-10">{{ userStore.role }}</el-tag></span>
      </div>
      <div class="header-actions">
        <el-button v-if="canControl" type="primary" size="small" @click="$router.push('/task')">AI 任务</el-button>
        <el-button type="danger" size="small" plain @click="userStore.logout()">退出</el-button>
      </div>
    </div>

    <el-row :gutter="15" class="mb-20">
      <el-col :span="4" v-for="item in statusItems" :key="item.label">
        <el-card shadow="hover" class="status-card" :body-style="{ padding: '12px' }">
          <div class="stat-value" :class="item.colorClass">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="main-row">
      <el-col :span="14" class="left-panel-col">
        <div class="split-layout">
          <el-card class="map-section" :body-style="{ padding: 0, height: '100%' }">
            <LiveMap />
          </el-card>
          <el-card class="camera-section" header="车载摄像头" :body-style="{ padding: 0, height: '100%' }">
            <CameraPanel />
          </el-card>
        </div>
      </el-col>

      <el-col :span="10" class="flex-col h-full">
        <el-card class="h-full right-card" :body-style="{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }">
          
          <el-tabs v-model="activeTab" class="dashboard-tabs" stretch>
            
            <el-tab-pane label="驾驶控制" name="control">
              <div class="tab-content">
                <div class="control-box">
                  <ManualJoystick v-if="canControl" />
                  <div v-else class="no-auth">无权限</div>
                </div>
                
                <div class="log-box-wrapper">
                  <div class="panel-title">实时日志</div>
                  <div class="log-scroll">
                    <div v-for="log in vehicleStore.logs" :key="log.id" class="log-item" :class="log.type">
                      [{{ log.time }}] {{ log.content }}
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="传感器监控" name="sensor">
              <div class="tab-content sensor-content">
                
                <div class="env-row">
                  <div class="env-item">
                    <div class="env-val" :class="{ 'warn': vehicleStore.status.env.temperature > 40 }">
                      {{ vehicleStore.status.env.temperature }}°C
                    </div>
                    <div class="env-label">温度</div>
                  </div>
                  <div class="env-item">
                    <div class="env-val">{{ vehicleStore.status.env.humidity }}%</div>
                    <div class="env-label">湿度</div>
                  </div>
                  <div class="env-item">
                    <div class="env-val">{{ vehicleStore.status.env.pressure }}hPa</div>
                    <div class="env-label">气压</div>
                  </div>
                </div>

                <div class="chart-box">
                  <div class="chart-title">IMU 加速度 (m/s²) & 陀螺仪 (deg/s)</div>
                  <div ref="imuChartRef" style="height: 180px; width: 100%"></div>
                </div>

                <div class="chart-box">
                  <div class="chart-title">毫米波雷达 & 超声波 (m)</div>
                  <div ref="distChartRef" style="height: 160px; width: 100%"></div>
                </div>

              </div>
            </el-tab-pane>

          </el-tabs>

        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useVehicleStore } from '@/pinia/vehicleStore';
import { useUserStore } from '@/pinia/userStore';
import LiveMap from '@/components/Map/LiveMap.vue';
import ManualJoystick from '@/components/Control/ManualJoystick.vue';
import CameraPanel from '@/components/Monitor/CameraPanel.vue';
import * as echarts from 'echarts';

const vehicleStore = useVehicleStore();
const userStore = useUserStore();
const activeTab = ref('control');

// 权限
const roleTagType = computed(() => userStore.role === 'ADMIN' ? 'danger' : 'info');
const canControl = computed(() => ['ADMIN', 'OPERATOR'].includes(userStore.role));

// 状态卡片
const statusItems = computed(() => [
  { label: '连接', value: vehicleStore.status.isConnected ? '在线' : '离线', colorClass: vehicleStore.status.isConnected ? 'text-green' : 'text-gray' },
  { label: '模式', value: vehicleStore.status.mode === 'AUTO' ? 'AI' : '人工', colorClass: 'text-blue' },
  { label: '车速', value: `${vehicleStore.status.speed} m/s`, colorClass: 'text-dark' },
  { label: '电池', value: `${vehicleStore.status.battery.toFixed(0)}%`, colorClass: vehicleStore.isLowBattery ? 'text-red' : 'text-green' },
  { label: '负载', value: `${vehicleStore.status.cpuUsage}%`, colorClass: vehicleStore.status.cpuUsage > 80 ? 'text-red' : 'text-green' },
  { label: '海拔', value: `${vehicleStore.status.altitude}m`, colorClass: 'text-dark' },
]);

// --- ECharts 逻辑 ---
const imuChartRef = ref();
const distChartRef = ref();
let imuChart: any = null;
let distChart: any = null;

const initCharts = () => {
  if (imuChartRef.value) {
    imuChart = echarts.init(imuChartRef.value);
    imuChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['Ax', 'Ay', 'Az', 'Gz'], bottom: 0, textStyle: { fontSize: 10 } },
      grid: { top: 10, bottom: 25, left: 30, right: 10 },
      xAxis: { type: 'category', show: false },
      yAxis: { type: 'value', splitLine: { show: false } },
      series: [
        { name: 'Ax', type: 'line', showSymbol: false, data: [] },
        { name: 'Ay', type: 'line', showSymbol: false, data: [] },
        { name: 'Az', type: 'line', showSymbol: false, data: [] },
        { name: 'Gz', type: 'line', showSymbol: false, yAxisIndex: 0, data: [], lineStyle: { type: 'dashed' } }
      ]
    });
  }

  if (distChartRef.value) {
    distChart = echarts.init(distChartRef.value);
    distChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['超声波', '雷达'], bottom: 0 },
      grid: { top: 10, bottom: 25, left: 30, right: 10 },
      xAxis: { type: 'category', show: false },
      yAxis: { type: 'value', splitLine: { show: false } },
      visualMap: {
        show: false,
        pieces: [{ lte: 1, color: 'red' }, { gt: 1, color: '#409EFF' }], // 距离<1m 变红
        seriesIndex: 0 
      },
      series: [
        { name: '超声波', type: 'line', showSymbol: false, data: [] },
        { name: '雷达', type: 'line', showSymbol: false, data: [], itemStyle: { color: '#E6A23C' } }
      ]
    });
  }
};

// 监听数据更新图表
watch(() => vehicleStore.historyData, (newVal) => {
  if (activeTab.value !== 'sensor') return; // 不在当前页不渲染，省资源

  if (imuChart) {
    imuChart.setOption({
      xAxis: { data: newVal.accel.map(i => i.time) },
      series: [
        { data: newVal.accel.map(i => i.x) },
        { data: newVal.accel.map(i => i.y) },
        { data: newVal.accel.map(i => i.z) },
        { data: newVal.gyro.map(i => i.z) } // 只画Gz演示，避免线太多
      ]
    });
  }

  if (distChart) {
    distChart.setOption({
      xAxis: { data: newVal.distance.map(i => i.time) },
      series: [
        { data: newVal.distance.map(i => i.ultrasonic) },
        { data: newVal.distance.map(i => i.radar) }
      ]
    });
  }
}, { deep: true });

// 切换 Tab 时重绘图表 (解决 display:none 导致的宽度问题)
watch(activeTab, (val) => {
  if (val === 'sensor') {
    nextTick(() => {
      if (!imuChart) initCharts();
      else { imuChart.resize(); distChart.resize(); }
    });
  }
});

onMounted(() => {
  // 默认不加载图表，等切到 tab
  window.addEventListener('resize', () => { imuChart?.resize(); distChart?.resize(); });
});
onBeforeUnmount(() => {
  imuChart?.dispose();
  distChart?.dispose();
});
</script>

<style scoped>
.p-20 { padding: 20px; height: 100vh; background: #f0f2f5; display: flex; flex-direction: column; box-sizing: border-box; }
.mb-20 { margin-bottom: 15px; }
.main-row { flex: 1; overflow: hidden; } 
.h-full { height: 100%; }
.flex-col { display: flex; flex-direction: column; }
.header-bar { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 10px 20px; border-radius: 8px; }
.stat-value { font-size: 18px; font-weight: bold; }
.stat-label { font-size: 12px; color: #666; }
.text-green { color: #67C23A; } .text-red { color: #F56C6C; } .text-blue { color: #409EFF; } .text-dark { color: #303133; }

.split-layout { display: flex; flex-direction: column; height: 100%; gap: 15px; }
.map-section { flex: 1.5; min-height: 0; }
.camera-section { flex: 1; min-height: 0; }

.right-card { overflow: hidden; }
.dashboard-tabs { height: 100%; display: flex; flex-direction: column; }
:deep(.el-tabs__content) { flex: 1; overflow: hidden; padding: 0 !important; }
.tab-content { height: 100%; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }

.control-box { flex: 0 0 auto; display: flex; justify-content: center; }
.log-box-wrapper { flex: 1; display: flex; flex-direction: column; min-height: 0; border: 1px solid #ebeef5; border-radius: 4px; padding: 10px; }
.panel-title { font-weight: bold; margin-bottom: 5px; font-size: 14px; }
.log-scroll { flex: 1; overflow-y: auto; font-size: 12px; }
.log-item { margin-bottom: 2px; } .log-item.ERROR { color: #F56C6C; }

/* 传感器监控页样式 */
.env-row { display: flex; justify-content: space-around; background: #f9fafc; padding: 10px; border-radius: 6px; }
.env-item { text-align: center; }
.env-val { font-size: 20px; font-weight: bold; color: #409EFF; }
.env-val.warn { color: #F56C6C; }
.env-label { font-size: 12px; color: #909399; }

.chart-box { border: 1px solid #eee; border-radius: 6px; padding: 10px; background: #fff; }
.chart-title { font-size: 13px; font-weight: bold; margin-bottom: 10px; border-left: 3px solid #409EFF; padding-left: 8px; }
</style>