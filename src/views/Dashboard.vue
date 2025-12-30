<template>
  <div class="dashboard p-20">
    <div class="header-bar mb-10">
      <div class="user-info">
        <h2 class="sys-title">无人车监控台</h2>
        <span class="divider">|</span>
        <span class="welcome">欢迎, {{ userStore.username }} <el-tag effect="dark" :type="roleTagType" size="small" class="ml-10">{{ userStore.role }}</el-tag></span>
      </div>
      <div class="header-actions">
        <el-button v-if="canControl" type="success" size="small" plain :icon="Download" @click="handleExport">数据导出</el-button>
        <el-button v-if="canControl" type="primary" size="small" @click="$router.push('/task')">AI 任务</el-button>
        <el-button type="danger" size="small" plain @click="userStore.logout()">退出</el-button>
      </div>
    </div>

    <el-row :gutter="10" class="mb-10">
      <el-col :span="4" v-for="item in statusItems" :key="item.label">
        <el-card shadow="hover" class="status-card" :body-style="{ padding: '8px 12px' }">
          <div class="stat-value" :class="item.colorClass">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="10" class="main-row">
      <el-col :span="13" class="left-panel-col">
        <div class="split-layout">
          <el-card class="map-section" :body-style="{ padding: 0, height: '100%' }">
            <LiveMap />
          </el-card>
          <el-card class="camera-section" header="车载摄像头" :body-style="{ padding: 0, height: '100%' }">
            <CameraPanel />
          </el-card>
        </div>
      </el-col>

      <el-col :span="11" class="flex-col h-full gap-10">
        
        <el-card class="flex-1 control-sensor-card" :body-style="{ padding: '0', height: '100%' }">
          <template #header>
            <div class="card-header py-5">
              <span>驾驶与感知中心</span>
              <div class="status-indicators">
                <span class="dot green"></span> 数据流正常
              </div>
            </div>
          </template>

          <div class="combined-panel-horizontal">
            <div class="panel-left">
              <div class="joystick-wrapper-compact">
                <ManualJoystick v-if="canControl" />
                <div v-else class="no-auth">无控制权限</div>
              </div>
              
              <div class="env-compact">
                <div class="env-row">
                  <div class="env-mini-item">
                    <span class="label">温度</span>
                    <span class="val" :class="{ 'warn': vehicleStore.status.env.temperature > 40 }">
                      {{ vehicleStore.status.env.temperature }}°C
                    </span>
                  </div>
                  <div class="env-mini-item">
                    <span class="label">湿度</span>
                    <span class="val">{{ vehicleStore.status.env.humidity }}%</span>
                  </div>
                  <div class="env-mini-item">
                    <span class="label">气压</span>
                    <span class="val">{{ vehicleStore.status.env.pressure }}</span>
                  </div>
                </div>
              </div>
            </div>

            <el-divider direction="vertical" style="height: 100%; margin: 0;" />

            <div class="panel-right">
              <div class="chart-container flex-1">
                <div class="chart-header">IMU 姿态监控 (m/s²)</div>
                <div ref="imuChartRef" class="chart-body"></div>
              </div>
              <el-divider style="margin: 5px 0;" />
              <div class="chart-container flex-1">
                <div class="chart-header">避障雷达 (m)</div>
                <div ref="distChartRef" class="chart-body"></div>
              </div>
            </div>
          </div>
        </el-card>

        <el-card class="log-card" :body-style="{ padding: '5px 10px', height: '100%', display: 'flex', flexDirection: 'column' }">
          <div class="log-header-text">系统日志</div>
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
import { startMockEngine } from '@/utils/mockEngine';
import LiveMap from '@/components/Map/LiveMap.vue';
import ManualJoystick from '@/components/Control/ManualJoystick.vue';
import CameraPanel from '@/components/Monitor/CameraPanel.vue';
import * as echarts from 'echarts';
// ✨✨✨ 引入 xlsx 用于导出 ✨✨✨
import * as XLSX from 'xlsx';
import { Download } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';

const vehicleStore = useVehicleStore();
const userStore = useUserStore();

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

// --- ✨✨✨ 数据导出逻辑 ✨✨✨ ---
const handleExport = () => {
  try {
    const wb = XLSX.utils.book_new();

    // 1. 准备传感器数据 (合并 IMU 和 雷达)
    // 注意：historyData 中的各个数组长度可能一致也可能微小差异，这里简单按索引合并
    const sensorSheetData = vehicleStore.historyData.accel.map((acc, index) => {
      const gyro = vehicleStore.historyData.gyro[index] || { x:0, y:0, z:0 };
      const dist = vehicleStore.historyData.distance[index] || { ultrasonic:0, radar:0 };
      return {
        '时间': acc.time,
        '加速度X': acc.x, '加速度Y': acc.y, '加速度Z': acc.z,
        '陀螺仪X': gyro.x, '陀螺仪Y': gyro.y, '陀螺仪Z': gyro.z,
        '超声波距离(m)': dist.ultrasonic,
        '雷达距离(m)': dist.radar
      };
    });
    const sensorSheet = XLSX.utils.json_to_sheet(sensorSheetData);
    XLSX.utils.book_append_sheet(wb, sensorSheet, "传感器历史数据");

    // 2. 准备所有日志
    const logSheetData = vehicleStore.logs.map(log => ({
      '时间': log.time,
      '类型': log.type,
      '内容': log.content
    }));
    const logSheet = XLSX.utils.json_to_sheet(logSheetData);
    XLSX.utils.book_append_sheet(wb, logSheet, "系统完整日志");

    // 3. 准备告警记录 (筛选 Warning 和 Error)
    const alertSheetData = vehicleStore.logs
      .filter(log => log.type === 'WARNING' || log.type === 'ERROR')
      .map(log => ({
        '时间': log.time,
        '级别': log.type,
        '告警内容': log.content
      }));
    const alertSheet = XLSX.utils.json_to_sheet(alertSheetData);
    XLSX.utils.book_append_sheet(wb, alertSheet, "告警记录");

    // 4. 下载文件
    const filename = `Vehicle_Data_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, filename);
    ElMessage.success(`导出成功: ${filename}`);
  } catch (e) {
    console.error(e);
    ElMessage.error('导出失败，请检查控制台');
  }
};

// --- ECharts ---
const imuChartRef = ref();
const distChartRef = ref();
let imuChart: any = null;
let distChart: any = null;

const initCharts = () => {
  if (imuChartRef.value) {
    imuChart = echarts.init(imuChartRef.value);
    imuChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['Ax', 'Ay', 'Az'], bottom: 0, icon: 'circle', itemWidth: 8 },
      grid: { top: 10, bottom: 20, left: 35, right: 10 },
      xAxis: { type: 'category', show: false },
      yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
      series: [
        { name: 'Ax', type: 'line', showSymbol: false, smooth: true, data: [] },
        { name: 'Ay', type: 'line', showSymbol: false, smooth: true, data: [] },
        { name: 'Az', type: 'line', showSymbol: false, smooth: true, data: [] }
      ]
    });
  }
  if (distChartRef.value) {
    distChart = echarts.init(distChartRef.value);
    distChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['超声波', '雷达'], bottom: 0, icon: 'roundRect', itemWidth: 8 },
      grid: { top: 10, bottom: 20, left: 35, right: 10 },
      xAxis: { type: 'category', show: false },
      yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' } } },
      series: [
        { name: '超声波', type: 'line', showSymbol: false, smooth: true, areaStyle: { opacity: 0.1 }, data: [] },
        { name: '雷达', type: 'line', showSymbol: false, smooth: true, data: [], itemStyle: { color: '#E6A23C' } }
      ]
    });
  }
};

watch(() => vehicleStore.historyData, (newVal) => {
  if (imuChart) {
    imuChart.setOption({
      xAxis: { data: newVal.accel.map(i => i.time) },
      series: [
        { data: newVal.accel.map(i => i.x) },
        { data: newVal.accel.map(i => i.y) },
        { data: newVal.accel.map(i => i.z) }
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
  startMockEngine();
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
/* 全局布局紧凑化 */
.p-20 { padding: 15px; height: 100vh; background: #f0f2f5; display: flex; flex-direction: column; box-sizing: border-box; }
.mb-10 { margin-bottom: 10px; }
.main-row { flex: 1; overflow: hidden; } 
.h-full { height: 100%; }
.flex-col { display: flex; flex-direction: column; }
.flex-1 { flex: 1; }
.gap-10 { gap: 10px; }

.header-bar { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 8px 15px; border-radius: 8px; }
.stat-value { font-size: 16px; font-weight: bold; }
.stat-label { font-size: 12px; color: #666; }
.text-green { color: #67C23A; } .text-red { color: #F56C6C; } .text-blue { color: #409EFF; } .text-dark { color: #303133; }

.split-layout { display: flex; flex-direction: column; height: 100%; gap: 10px; }
.map-section { flex: 3; min-height: 0; }
.camera-section { flex: 2; min-height: 0; }

.control-sensor-card { flex: 3; min-height: 0; display: flex; flex-direction: column; }
.log-card { flex: 1; min-height: 0; display: flex; flex-direction: column; }

.card-header { display: flex; justify-content: space-between; align-items: center; font-weight: bold; padding: 10px 15px; border-bottom: 1px solid #ebeef5; }
.py-5 { padding-top: 5px; padding-bottom: 5px; }
.status-indicators { font-size: 12px; color: #67C23A; display: flex; align-items: center; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #67C23A; margin-right: 5px; display: inline-block; }

.combined-panel-horizontal { display: flex; height: 100%; overflow: hidden; }
.panel-left { width: 40%; display: flex; flex-direction: column; padding: 10px; justify-content: space-between; background: #fafafa; }
.panel-right { width: 60%; display: flex; flex-direction: column; padding: 10px; }

.joystick-wrapper-compact { flex: 1; display: flex; justify-content: center; align-items: center; transform: scale(0.95); }
.env-compact { margin-top: 10px; background: #fff; border-radius: 6px; padding: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.env-row { display: flex; justify-content: space-around; }
.env-mini-item { text-align: center; }
.env-mini-item .label { display: block; font-size: 12px; color: #999; margin-bottom: 2px; }
.env-mini-item .val { font-size: 16px; font-weight: bold; color: #333; }
.env-mini-item .val.warn { color: #F56C6C; }

.chart-container { display: flex; flex-direction: column; min-height: 0; }
.chart-header { font-size: 12px; font-weight: bold; color: #606266; margin-bottom: 5px; padding-left: 5px; border-left: 3px solid #409EFF; }
.chart-body { flex: 1; width: 100%; min-height: 0; }

.no-auth { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; color: #999; }

.log-header-text { font-size: 12px; font-weight: bold; margin-bottom: 5px; color: #333; }
.log-scroll { flex: 1; overflow-y: auto; font-size: 12px; }
.log-item { margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } 
.log-item.ERROR { color: #F56C6C; }
.time { color: #999; margin-right: 5px; }
</style>