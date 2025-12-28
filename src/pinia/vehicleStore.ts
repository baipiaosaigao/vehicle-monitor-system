import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { VehicleStatus, Log, Task, TaskTemplate } from '@/types/vehicle';
import dayjs from 'dayjs';

export const useVehicleStore = defineStore('vehicle', () => {
  // --- 状态 ---
  const status = ref<VehicleStatus>({
    speed: 0,
    battery: 100,
    mode: 'SIMULATION',
    // 👇 重庆理工大学两江校区坐标
    location: { lat: 29.7175, lng: 106.7585, bearing: 0 },
    isConnected: false,
    isEmergencyStopped: false
  });

  const logs = ref<Log[]>([]);
  const currentTask = ref<Task | null>(null);
  const sensorData = ref<number[]>([]); // 简化的传感器历史数据

  // 1. 新增：任务模板列表 (预置两个示例)
  const taskTemplates = ref<TaskTemplate[]>([
    { id: '1', name: '区域A-自动巡检', steps: ['路径规划', '自主避障', '定点巡航', '返航'] },
    { id: '2', name: '定点配送-B楼', steps: ['接单', '路径规划', '前往B楼', '卸货', '完成'] }
  ]);

  // --- 计算属性 ---
  const isLowBattery = computed(() => status.value.battery < 20);

  // --- 动作 ---
  function updateStatus(payload: Partial<VehicleStatus>) {
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
    addLog('ERROR', val ? '触发紧急停止！系统已锁定' : '紧急停止已解除');
  }

  // 2. 修改：startTask 接收模板对象
  function startTask(template: TaskTemplate) {
    if (status.value.isEmergencyStopped) {
      addLog('ERROR', '车辆处于急停状态，无法下发任务');
      return;
    }

    // --- 👇 新增：生成模拟的“规划路径”数据 ---
    // 我们算出未来一圈的坐标点，假装是 AI 算出来的
    const mockRoute: { lat: number; lng: number }[] = [];
    const centerLat = 29.7175;
    const centerLng = 106.7585;
    const radius = 0.0008;
    // 生成 36 个点形成一个圆圈
    for (let i = 0; i <= 360; i += 10) {
      const rad = i * Math.PI / 180;
      mockRoute.push({
        lat: centerLat + radius * Math.sin(rad),
        lng: centerLng + radius * Math.cos(rad)
      });
    }
    // ---------------------------------------

    currentTask.value = {
      id: Date.now().toString(),
      name: template.name,
      status: 'RUNNING',
      progress: 0,
      steps: [...template.steps], // 复制步骤
      currentStepIndex: 0,
      plannedRoute: mockRoute // 赋值进去
    };
    status.value.mode = 'AUTO';
    addLog('INFO', `AI任务开始: ${template.name}`);
  }

  function stopTask() {
    if (currentTask.value) {
      currentTask.value.status = 'FAILED';
      addLog('WARNING', '任务被人为终止');
      currentTask.value = null;
      status.value.mode = 'MANUAL';
      status.value.speed = 0;
    }
  }

  // 3. 新增：添加模板
  function addTaskTemplate(name: string, steps: string[]) {
    taskTemplates.value.push({
      id: Date.now().toString(),
      name,
      steps
    });
    addLog('INFO', `新建任务模板: ${name}`);
  }

  // 4. 新增：删除模板
  function removeTaskTemplate(id: string) {
    const index = taskTemplates.value.findIndex(t => t.id === id);
    if (index !== -1) {
      taskTemplates.value.splice(index, 1);
      addLog('INFO', `删除任务模板 (ID: ${id})`);
    }
  }

  return { 
    status, 
    logs, 
    currentTask, 
    sensorData, 
    taskTemplates, 
    isLowBattery, 
    updateStatus, 
    addLog, 
    setEmergencyStop, 
    startTask, 
    stopTask,
    addTaskTemplate, 
    removeTaskTemplate 
  };
});