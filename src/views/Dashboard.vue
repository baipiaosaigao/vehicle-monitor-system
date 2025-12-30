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

      <el-col :span="10" class="flex-col h-full gap-15">
        
        <el-card class="flex-1 control-sensor-card" :body-style="{ padding: '15px', height: '100%', overflowY: 'auto' }">
          <template #header>
            <div class="card-header">
              <span>驾驶与感知中心</span>
              <el-tag size="small" type="success" effect="plain">综合视图</el-tag>
            </div>
          </template>

          <div class="combined-panel">
            <div class="top-section">
              <div class="joystick-area">
                <ManualJoystick v-if="canControl" />
                <div v-else class="no-auth">无控制权限</div>
              </div>
              
              <div class="env-area">
                <div class="env-box">
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
                    <div class="env-val">{{ vehicleStore.status.env.pressure }}</div>
                    <div class="env-label">hPa</div>
                  </div>
                </div>
                <div class="sensor-status-tip">
                  <p><span class="dot green"></span> IMU 正常</p>
                  <p><span class="dot green"></span> 雷达 正常</p>
                </div>
              </div>
            </div>

            <el-divider style="margin: 15px 0;" />

            <div class="charts-section">
              <div class="chart-box">
                <div class="chart-title">
                  IMU 姿态监控 <span class="unit">(m/s² | deg/s)</span>
                </div>
                <div ref="imuChartRef" style="height: 160px; width: 100%"></div>
              </div>

              <div class="chart-box mt-10">
                <div class="chart-title">
                  避障雷达数据 <span class="unit">(m)</span>
                </div>
                <div ref="distChartRef" style="height: 140px; width: 100%"></div>
              </div>
            </div>
          </div>
        </el-card>

        <el-card class="log-card" :body-style="{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column' }">
          <template #header>
            <div class="card-header">
              <span>系统日志</span>
            </div>
          </template>
          <div class="log-scroll">
            <div v-for="log in vehicleStore.logs" :key="log.id" class="log-item" :class="log.type">
              <span class="time">[{{ log.time }}]</span> {{ log.content }}
            </div>
          </div>
        </el-card>

      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useVehicleStore } from '@/pinia/vehicleStore';
import { useUserStore } from '@/pinia/userStore';
import LiveMap from '@/components/Map/LiveMap.vue';
import ManualJoystick from '@/components/Control/ManualJoystick.vue';
import CameraPanel from '@/components/Monitor/CameraPanel.vue';
import * as echarts from 'echarts';

const vehicleStore = useVehicleStore();
const userStore = useUserStore();

// 权限与状态逻辑
const roleTagType = computed(() => userStore.role === 'ADMIN' ? 'danger' : 'info');
const canControl = computed(() => ['ADMIN', 'OPERATOR'].includes(userStore.role));
const statusItems = computed(() => [
  { label: '连接', value: vehicleStore.status.isConnected ? '在线' : '离线', colorClass: vehicleStore.status.isConnected ? 'text-green' : 'text-gray' },
  { label: '模式', value: vehicleStore.status.mode === 'AUTO' ? 'AI' : '人工', colorClass: 'text-blue' },
  { label: '车速', value: `${vehicleStore.status.speed} m/s`, colorClass: 'text-dark' },
  { label: '电池', value: `${vehicleStore.status.battery.toFixed(0)}%`, colorClass: vehicleStore.isLowBattery ? 'text-red' : 'text-green' },
  { label: '负载', value: `${vehicleStore.status.cpuUsage}%`, colorClass: vehicleStore.status.cpuUsage > 80 ? 'text-red' : 'text-green' },
  { label: '海拔', value: `${vehicleStore.status.altitude}m`, colorClass: 'text-dark' },
]);

// --- ECharts 初始化与更新 ---
const imuChartRef = ref();
const distChartRef = ref();
let imuChart: any = null;
let distChart: any = null;

const initCharts = () => {
  if (imuChartRef.value) {
    imuChart = echarts.init(imuChartRef.value);
    imuChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['Ax', 'Ay', 'Az', 'Gz'], bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
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
      legend: { data: ['超声波', '雷达'], bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
      grid: { top: 10, bottom: 25, left: 30, right: 10 },
      xAxis: { type: 'category', show: false },
      yAxis: { type: 'value', splitLine: { show: false } },
      visualMap: {
        show: false,
        pieces: [{ lte: 1, color: 'red' }, { gt: 1, color: '#409EFF' }],
        seriesIndex: 0 
      },
      series: [
        { name: '超声波', type: 'line', showSymbol: false, data: [] },
        { name: '雷达', type: 'line', showSymbol: false, data: [], itemStyle: { color: '#E6A23C' } }
      ]
    });
  }
};

// 监听数据更新
watch(() => vehicleStore.historyData, (newVal) => {
  if (imuChart) {
    imuChart.setOption({
      xAxis: { data: newVal.accel.map(i => i.time) },
      series: [
        { data: newVal.accel.map(i => i.x) },
        { data: newVal.accel.map(i => i.y) },
        { data: newVal.accel.map(i => i.z) },
        { data: newVal.gyro.map(i => i.z) }
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

onMounted(() => {
  initCharts();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  imuChart?.dispose();
  distChart?.dispose();
});

const handleResize = () => {
  imuChart?.resize();
  distChart?.resize();
};
</script>

<style scoped>
/* 基础布局 */
.p-20 { padding: 20px; height: 100vh; background: #f0f2f5; display: flex; flex-direction: column; box-sizing: border-box; }
.mb-20 { margin-bottom: 15px; }
.main-row { flex: 1; overflow: hidden; } 
.h-full { height: 100%; }
.flex-col { display: flex; flex-direction: column; }
.gap-15 { gap: 15px; } /* 右侧两张卡片的间距 */
.header-bar { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 10px 20px; border-radius: 8px; }
.stat-value { font-size: 18px; font-weight: bold; }
.stat-label { font-size: 12px; color: #666; }
.text-green { color: #67C23A; } .text-red { color: #F56C6C; } .text-blue { color: #409EFF; } .text-dark { color: #303133; }

.split-layout { display: flex; flex-direction: column; height: 100%; gap: 15px; }
.map-section { flex: 1.5; min-height: 0; }
.camera-section { flex: 1; min-height: 0; }

/* 右侧新布局样式 */
.control-sensor-card { flex: 2; min-height: 0; display: flex; flex-direction: column; } /* 上半部分占 2/3 */
.log-card { flex: 1; min-height: 0; display: flex; flex-direction: column; } /* 下半部分占 1/3 */

.card-header { display: flex; justify-content: space-between; align-items: center; font-weight: bold; }

/* 驾驶与感知面板内部 */
.combined-panel { display: flex; flex-direction: column; }
.top-section { display: flex; align-items: flex-start; gap: 20px; }
.joystick-area { flex: 0 0 auto; }
.env-area { flex: 1; display: flex; flex-direction: column; gap: 10px; justify-content: center; height: 100%; padding-top: 20px; }

.env-box { display: flex; justify-content: space-around; background: #f9fafc; padding: 10px; border-radius: 6px; }
.env-item { text-align: center; }
.env-val { font-size: 20px; font-weight: bold; color: #409EFF; }
.env-val.warn { color: #F56C6C; }
.env-label { font-size: 12px; color: #909399; }

.sensor-status-tip { display: flex; gap: 15px; font-size: 12px; color: #666; justify-content: center; }
.dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; background: #ccc; }
.dot.green { background: #67C23A; }

.charts-section { display: flex; flex-direction: column; gap: 10px; }
.chart-box { border: 1px solid #eee; border-radius: 6px; padding: 8px; background: #fff; }
.chart-title { font-size: 12px; font-weight: bold; margin-bottom: 5px; border-left: 3px solid #409EFF; padding-left: 8px; color: #333; }
.chart-title .unit { font-weight: normal; color: #999; font-size: 10px; margin-left: 5px; }
.mt-10 { margin-top: 10px; }

.no-auth { width: 100%; height: 150px; display: flex; justify-content: center; align-items: center; background: #f5f7fa; color: #999; border-radius: 8px; }

/* 日志样式 */
.log-scroll { flex: 1; overflow-y: auto; font-size: 12px; padding-right: 5px; }
.log-item { margin-bottom: 3px; line-height: 1.4; } 
.log-item.ERROR { color: #F56C6C; }
.time { color: #999; margin-right: 5px; }
</style>