import { useVehicleStore } from '@/pinia/vehicleStore';

let timer: any = null;
let angle = 0;

const keys = {
  UP: false,
  DOWN: false,
  LEFT: false,
  RIGHT: false
};

export function startMockEngine() {
  const store = useVehicleStore();
  if (store.status.isConnected) return;
  
  store.updateStatus({ isConnected: true });
  store.addLog('INFO', '模拟引擎已启动 (Game Loop Mode)');

  timer = setInterval(() => {
    let { battery, speed } = store.status;
    let { lat, lng, bearing } = store.status.location;

    // 获取动态设置的参数 (使用 as any 避免类型检查报错)
    const limit = (store.status as any).limitSpeed || 5;     // 限速
    const turnRate = (store.status as any).turningAngle || 5; // 转向灵敏度

    // --- 紧急停止 ---
    if (store.status.isEmergencyStopped) {
      speed = 0;
    }
    // --- AI 模式 ---
    else if (store.status.mode === 'AUTO' && store.currentTask) {
       angle += 0.01;
       speed = 3.5; 
       lat = 29.7175 + 0.0008 * Math.sin(angle); 
       lng = 106.7585 + 0.0008 * Math.cos(angle);
       bearing = (angle * 180 / Math.PI) % 360;
       
       if (store.currentTask.progress < 100) store.currentTask.progress += 0.5;
       else {
         store.currentTask.status = 'COMPLETED';
         store.status.mode = 'MANUAL';
         store.currentTask = null;
       }
    }
    // --- 手动模式 ---
    else {
      // A. 处理转向 (使用动态参数 turnRate)
      if (keys.LEFT) bearing = (bearing - turnRate + 360) % 360;
      if (keys.RIGHT) bearing = (bearing + turnRate) % 360;

      // B. 处理加速/减速 (使用动态参数 limit)
      if (keys.UP) {
        speed = Math.min(limit, speed + 0.5); 
      } else if (keys.DOWN) {
        speed = Math.max(-3, speed - 0.5);
      } else {
        if (speed > 0) speed = Math.max(0, speed - 0.1);
        if (speed < 0) speed = Math.min(0, speed + 0.1);
      }

      // C. 计算位移
      if (Math.abs(speed) > 0.1) {
        const rad = bearing * Math.PI / 180;
        lat += speed * 0.000005 * Math.cos(rad); 
        lng += speed * 0.000005 * Math.sin(rad);
      }
    }

    // 更新数据
    const noise = (Math.random() - 0.5) * (Math.abs(speed) > 0 ? 3 : 0.3);
    store.sensorData.push(9.8 + noise);
    if (store.sensorData.length > 50) store.sensorData.shift();
    
    if (Math.abs(speed) > 0.1) battery = Math.max(0, battery - 0.01);

    store.updateStatus({
      battery,
      speed: parseFloat(speed.toFixed(1)),
      location: { lat, lng, bearing }
    });
  }, 50); 
}

export function setControlKey(key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', isPressed: boolean) {
  const store = useVehicleStore();
  if (isPressed && store.status.mode !== 'MANUAL') {
    store.updateStatus({ mode: 'MANUAL' });
    store.currentTask = null;
  }
  keys[key] = isPressed;
}