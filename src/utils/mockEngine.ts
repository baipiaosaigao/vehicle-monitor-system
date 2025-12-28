import { useVehicleStore } from '@/pinia/vehicleStore';

let timer: any = null;
let angle = 0;

// 1. 新增：按键状态记录 (解决反应迟钝问题)
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

  // 2. 提速：从 100ms 改为 50ms，响应更灵敏
  timer = setInterval(() => {
    let { battery, speed } = store.status;
    let { lat, lng, bearing } = store.status.location;

    // --- 紧急停止 ---
    if (store.status.isEmergencyStopped) {
      speed = 0;
    }
    // --- AI 模式 ---
    else if (store.status.mode === 'AUTO' && store.currentTask) {
       // ... AI 跑圈逻辑保持不变 ...
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
    // --- 手动模式 (核心重构) ---
    else {
      // A. 处理转向 (原地转，或者边跑边转)
      // 每次 tick 转 5 度，非常丝滑
      if (keys.LEFT) bearing = (bearing - 5 + 360) % 360;
      if (keys.RIGHT) bearing = (bearing + 5) % 360;

      // B. 处理加速/减速
      if (keys.UP) {
        // 按住上键：快速加速，最高 8m/s
        speed = Math.min(8, speed + 0.5); 
      } else if (keys.DOWN) {
        // 按住下键：倒车/刹车
        speed = Math.max(-3, speed - 0.5);
      } else {
        // 没按键：模拟自然摩擦力缓慢减速
        if (speed > 0) speed = Math.max(0, speed - 0.1);
        if (speed < 0) speed = Math.min(0, speed + 0.1);
      }

      // C. 计算位移 (根据当前车头朝向 bearing)
      if (Math.abs(speed) > 0.1) {
        // 将角度转换为弧度 (注意地图坐标系: 0度是北/上)
        const rad = bearing * Math.PI / 180;
        // 计算 lat(y) 和 lng(x) 的增量
        // 注意：Leaflet中 lat是垂直方向，lng是水平方向
        // cos(0) = 1 (向北), sin(0) = 0
        lat += speed * 0.000005 * Math.cos(rad); 
        lng += speed * 0.000005 * Math.sin(rad);
      }
    }

    // 更新数据
    const noise = (Math.random() - 0.5) * (Math.abs(speed) > 0 ? 3 : 0.3);
    store.sensorData.push(9.8 + noise);
    if (store.sensorData.length > 50) store.sensorData.shift();
    
    // 只有真正在跑才耗电
    if (Math.abs(speed) > 0.1) battery = Math.max(0, battery - 0.01);

    store.updateStatus({
      battery,
      speed: parseFloat(speed.toFixed(1)),
      location: { lat, lng, bearing }
    });
  }, 50); 
}

// 3. 暴露给 Vue 组件的控制接口
// 不再直接改状态，而是只改“按键开关”
export function setControlKey(key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', isPressed: boolean) {
  const store = useVehicleStore();
  // 一旦有人操作，强制切回手动
  if (isPressed && store.status.mode !== 'MANUAL') {
    store.updateStatus({ mode: 'MANUAL' });
    store.currentTask = null;
  }
  keys[key] = isPressed;
}