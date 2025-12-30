import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { VehicleStatus, Log, Task, TaskTemplate } from '@/types/vehicle';
import dayjs from 'dayjs';
import { ElNotification } from 'element-plus';

export const useVehicleStore = defineStore('vehicle', () => {
  const status = ref<VehicleStatus>({
    speed: 0,
    battery: 100,
    mode: 'SIMULATION',
    location: { lat: 29.712477, lng: 106.789922, bearing: 0 },
    isConnected: false,
    isEmergencyStopped: false,
    limitSpeed: 5,
    turningAngle: 5,
    altitude: 260,
    cpuUsage: 15,
    memUsage: 30,
    // ✨✨✨ 初始化新传感器数据 ✨✨✨
    imu: { ax: 0, ay: 0, az: 9.8, gx: 0, gy: 0, gz: 0 },
    env: { temperature: 25, humidity: 40, pressure: 1013 },
    ultrasonicDist: 2.5,
    radarDist: 5.0
  } as VehicleStatus);

  const logs = ref<Log[]>([]);
  const currentTask = ref<Task | null>(null);
  
  // ✨✨✨ 历史数据队列 (用于 ECharts 折线图) ✨✨✨
  // 我们不再只存一个 sensorData，而是分门别类
  const historyData = ref({
    accel: [] as { time: string, x: number, y: number, z: number }[],
    gyro: [] as { time: string, x: number, y: number, z: number }[],
    distance: [] as { time: string, ultrasonic: number, radar: number }[]
  });

  // 旧的 sensorData 留着防止报错，但主要用上面的 historyData
  const sensorData = ref<number[]>([]); 

  const remainingTime = ref(0);
  const isTaskPaused = ref(false);

  const taskTemplates = ref<TaskTemplate[]>([
    { id: '1', name: '新区域-自动巡检', steps: ['路径规划', '自主避障', '定点巡航', '返航'] },
    { id: '2', name: '定点配送-C楼', steps: ['接单', '路径规划', '前往目标', '卸货', '完成'] }
  ]);

  const isLowBattery = computed(() => status.value.battery < 20);

  function updateStatus(payload: any) { status.value = { ...status.value, ...payload }; }

  // 推送传感器历史数据 (供 MockEngine 调用)
  function pushSensorHistory() {
    const time = dayjs().format('HH:mm:ss');
    const MAX_LEN = 50; // 最多保留50个点
    
    // IMU 加速度
    historyData.value.accel.push({ time, x: status.value.imu.ax, y: status.value.imu.ay, z: status.value.imu.az });
    if (historyData.value.accel.length > MAX_LEN) historyData.value.accel.shift();

    // IMU 陀螺仪
    historyData.value.gyro.push({ time, x: status.value.imu.gx, y: status.value.imu.gy, z: status.value.imu.gz });
    if (historyData.value.gyro.length > MAX_LEN) historyData.value.gyro.shift();

    // 测距数据
    historyData.value.distance.push({ time, ultrasonic: status.value.ultrasonicDist, radar: status.value.radarDist });
    if (historyData.value.distance.length > MAX_LEN) historyData.value.distance.shift();
  }

  function addLog(type: 'INFO' | 'WARNING' | 'ERROR', content: string) {
    logs.value.unshift({ id: Date.now().toString(), time: dayjs().format('HH:mm:ss'), type, content });
    if (logs.value.length > 50) logs.value.pop();
  }

  function setEmergencyStop(val: boolean) {
    status.value.isEmergencyStopped = val;
    status.value.speed = 0;
    status.value.mode = 'MANUAL';
    if(currentTask.value) currentTask.value.status = 'FAILED';
    addLog('ERROR', val ? '触发紧急停止！系统已锁定' : '紧急停止已解除');
  }

  // 模拟路径生成 (保持不变)
  function generateMockRoute() {
    const route = [];
    const centerLat = 29.712477, centerLng = 106.789922;
    for (let i = 0; i < 360; i += 10) {
      const rad = i * Math.PI / 180;
      route.push({ lat: centerLat + 0.0008 * Math.sin(rad), lng: centerLng + 0.0008 * Math.cos(rad) });
    }
    return route;
  }

  function startTask(template: TaskTemplate) {
    if (status.value.isEmergencyStopped) {
      ElNotification({ title: '无法执行', message: '急停中', type: 'error' });
      return;
    }
    currentTask.value = {
      id: Date.now().toString(),
      name: template.name,
      status: 'RUNNING',
      progress: 0,
      steps: [...template.steps],
      currentStepIndex: 0,
      plannedRoute: generateMockRoute()
    };
    status.value.mode = 'AUTO';
    remainingTime.value = 120;
    isTaskPaused.value = false;
    addLog('INFO', `任务下发: ${template.name}`);
  }

  function pauseTask() {
    if (currentTask.value?.status === 'RUNNING') {
      isTaskPaused.value = true;
      currentTask.value.status = 'PAUSED';
      status.value.speed = 0;
    }
  }

  function resumeTask() {
    if (currentTask.value && isTaskPaused.value) {
      isTaskPaused.value = false;
      currentTask.value.status = 'RUNNING';
    }
  }

  function stopTask(reason: string = '终止') {
    if (currentTask.value) {
      currentTask.value.status = 'FAILED';
      status.value.mode = 'MANUAL';
      status.value.speed = 0;
      ElNotification({ title: '任务终止', message: reason, type: 'warning' });
      addLog('ERROR', reason);
      currentTask.value = null;
    }
  }

  function updateWaypoint(index: number, lat: number, lng: number) {
    if (currentTask.value?.plannedRoute) currentTask.value.plannedRoute[index] = { lat, lng };
  }

  function addTaskTemplate(name: string, steps: string[]) {
    taskTemplates.value.push({ id: Date.now().toString(), name, steps });
  }

  function removeTaskTemplate(id: string) {
    const idx = taskTemplates.value.findIndex(t => t.id === id);
    if(idx !== -1) taskTemplates.value.splice(idx, 1);
  }

  return { 
    status, logs, currentTask, sensorData, historyData, // ✨ 导出 historyData
    taskTemplates, isLowBattery, remainingTime, isTaskPaused,
    updateStatus, addLog, setEmergencyStop, startTask, pauseTask, resumeTask, stopTask, 
    updateWaypoint, addTaskTemplate, removeTaskTemplate, pushSensorHistory 
  };
});