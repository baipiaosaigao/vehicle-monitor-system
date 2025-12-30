// 文件路径: src/pinia/vehicleStore.ts

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { VehicleStatus, Log, Task, TaskTemplate } from '@/types/vehicle';
import dayjs from 'dayjs';
import { ElNotification } from 'element-plus';

export const useVehicleStore = defineStore('vehicle', () => {
  // --- 1. 基础状态 ---
  const status = ref<VehicleStatus>({
    speed: 0,
    battery: 100,
    mode: 'SIMULATION',
    location: { lat: 29.7175, lng: 106.7585, bearing: 0 },
    isConnected: false,
    isEmergencyStopped: false,
    limitSpeed: 5,
    turningAngle: 5
  } as VehicleStatus); // 强制断言

  const logs = ref<Log[]>([]);
  const currentTask = ref<Task | null>(null);
  const sensorData = ref<number[]>([]);

  // ✨✨✨ 2. 新增：任务相关状态 (这就是你报错缺少的！) ✨✨✨
  const remainingTime = ref(0);   // 剩余时间
  const isTaskPaused = ref(false); // 任务是否暂停

  const taskTemplates = ref<TaskTemplate[]>([
    { id: '1', name: '区域A-自动巡检', steps: ['路径规划', '自主避障', '定点巡航', '返航'] },
    { id: '2', name: '定点配送-B楼', steps: ['接单', '路径规划', '前往B楼', '卸货', '完成'] }
  ]);

  // --- 3. 计算属性 ---
  const isLowBattery = computed(() => status.value.battery < 20);

  // --- 4. 基础动作 ---
  function updateStatus(payload: any) {
    status.value = { ...status.value, ...payload };
  }

  function addLog(type: 'INFO' | 'WARNING' | 'ERROR', content: string) {
    logs.value.unshift({
      id: Date.now().toString(),
      time: dayjs().format('HH:mm:ss'),
      type,
      content
    });
    if (logs.value.length > 50) logs.value.pop();
  }

  function setEmergencyStop(val: boolean) {
    status.value.isEmergencyStopped = val;
    status.value.speed = 0;
    status.value.mode = 'MANUAL';
    if(currentTask.value) currentTask.value.status = 'FAILED';
    addLog('ERROR', val ? '触发紧急停止！系统已锁定' : '紧急停止已解除');
  }

  // --- ✨ 5. 任务控制动作 (核心逻辑) ---

  // 模拟生成路径
  function generateMockRoute() {
    const route = [];
    const centerLat = 29.7175, centerLng = 106.7585;
    for (let i = 0; i < 360; i += 10) {
      const rad = i * Math.PI / 180;
      route.push({
        lat: centerLat + 0.0008 * Math.sin(rad),
        lng: centerLng + 0.0008 * Math.cos(rad)
      });
    }
    return route;
  }

  function startTask(template: TaskTemplate) {
    if (status.value.isEmergencyStopped) {
      ElNotification({ title: '无法执行', message: '车辆处于急停状态，请先解锁', type: 'error' });
      return;
    }

    currentTask.value = {
      id: Date.now().toString(),
      name: template.name,
      status: 'RUNNING',
      progress: 0,
      steps: [...template.steps],
      currentStepIndex: 0,
      plannedRoute: generateMockRoute() // 生成路径
    };
    
    status.value.mode = 'AUTO';
    remainingTime.value = 120; // 假定 120秒
    isTaskPaused.value = false;
    
    addLog('INFO', `任务下发成功: ${template.name}`);
  }

  function pauseTask() {
    if (currentTask.value && currentTask.value.status === 'RUNNING') {
      isTaskPaused.value = true;
      currentTask.value.status = 'PAUSED';
      status.value.speed = 0;
      addLog('WARNING', '任务已暂停');
    }
  }

  function resumeTask() {
    if (currentTask.value && isTaskPaused.value) {
      isTaskPaused.value = false;
      currentTask.value.status = 'RUNNING';
      addLog('INFO', '任务继续执行');
    }
  }

  function stopTask(reason: string = '人为终止') {
    if (currentTask.value) {
      currentTask.value.status = 'FAILED';
      status.value.mode = 'MANUAL';
      status.value.speed = 0;
      
      ElNotification({ title: '任务终止', message: `原因: ${reason}`, type: 'warning' });
      addLog('ERROR', `任务失败: ${reason}`);
      
      currentTask.value = null;
      isTaskPaused.value = false;
    }
  }

  // 拖拽地图修改航点
  function updateWaypoint(index: number, lat: number, lng: number) {
    if (currentTask.value && currentTask.value.plannedRoute) {
      currentTask.value.plannedRoute[index] = { lat, lng };
      addLog('INFO', `调整航点 [${index}] 坐标`);
    }
  }

  function addTaskTemplate(name: string, steps: string[]) {
    taskTemplates.value.push({ id: Date.now().toString(), name, steps });
    addLog('INFO', `新建模板: ${name}`);
  }

  function removeTaskTemplate(id: string) {
    const idx = taskTemplates.value.findIndex(t => t.id === id);
    if(idx !== -1) taskTemplates.value.splice(idx, 1);
  }

  // ✨✨✨ 6. 必须把所有新变量都 return 出去 ✨✨✨
  return { 
    status, 
    logs, 
    currentTask, 
    sensorData, 
    taskTemplates, 
    isLowBattery,
    // 👇 这两个就是你报错缺失的属性
    remainingTime, 
    isTaskPaused,
    // 👇 动作方法
    updateStatus, 
    addLog, 
    setEmergencyStop, 
    startTask, 
    pauseTask, 
    resumeTask, 
    stopTask, 
    updateWaypoint,
    addTaskTemplate, 
    removeTaskTemplate 
  };
});