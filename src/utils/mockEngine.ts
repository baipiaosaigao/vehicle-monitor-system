import { useVehicleStore } from '@/pinia/vehicleStore';

let timer: any = null;
let angle = 0;

// 按键状态记录
const keys = { UP: false, DOWN: false, LEFT: false, RIGHT: false };

export function startMockEngine() {
  const store = useVehicleStore();
  
  // 防止重复启动
  if (store.status.isConnected) return;
  
  store.updateStatus({ isConnected: true });
  store.addLog('INFO', '模拟引擎已启动 (Fix版)');

  // 50ms 刷新一次 (20FPS)
  timer = setInterval(() => {
    // 1. 从 Store 获取当前状态 (解构出数值)
    let { battery, speed, altitude, cpuUsage, memUsage } = store.status;
    let { lat, lng, bearing } = store.status.location;
    let { imu, env, ultrasonicDist, radarDist } = store.status;

    // 获取限速和转向灵敏度
    const limit = (store.status as any).limitSpeed || 5;
    const turnRate = (store.status as any).turningAngle || 5;

    // --- 模拟环境与传感器数据 ---
    env.temperature = parseFloat((25 + Math.sin(Date.now() / 10000)).toFixed(1));
    env.humidity = parseFloat((40 + Math.cos(Date.now() / 8000) * 5).toFixed(1));
    env.pressure = Math.floor(1013 - (altitude - 260) / 10);
    
    ultrasonicDist = parseFloat((2.5 + Math.sin(Date.now() / 500)).toFixed(2));
    radarDist = parseFloat((15 + Math.cos(Date.now() / 1000) * 10).toFixed(2));

    // 模拟 IMU 震动
    imu.ax = (Math.random() - 0.5) * 0.2;
    imu.ay = (Math.random() - 0.5) * 0.2;
    imu.az = 9.8 + (Math.random() - 0.5) * 0.2;
    imu.gx = 0; imu.gy = 0; imu.gz = 0;

    // --- 车辆运动逻辑 ---

    // 情况 A: 紧急停止
    if (store.status.isEmergencyStopped) {
      speed = 0;
    } 
    // 情况 B: AI 自动驾驶模式
    else if (store.status.mode === 'AUTO' && store.currentTask) {
       angle += 0.01;
       speed = 3.5; 
       // AI 绕圈逻辑 (中心点：弘远楼)
       lat = 29.712477 + 0.0008 * Math.sin(angle); 
       lng = 106.789922 + 0.0008 * Math.cos(angle);
       bearing = (angle * 180 / Math.PI) % 360;
       
       // 模拟 AI 模式下的传感器波动
       altitude += (Math.random() - 0.5) * 0.2;
       
       if (store.currentTask.progress < 100) store.currentTask.progress += 0.5;
       else {
         store.currentTask.status = 'COMPLETED';
         store.status.mode = 'MANUAL'; // 任务结束切回手动
         store.currentTask = null;
         speed = 0;
       }
    } 
    // 情况 C: 手动驾驶模式 (关键修复部分)
    else {
      // 1. 处理转向
      if (keys.LEFT) bearing = (bearing - turnRate + 360) % 360;
      if (keys.RIGHT) bearing = (bearing + turnRate) % 360;
      
      // 模拟转向时的陀螺仪数据
      if (keys.LEFT) imu.gz = 15;
      if (keys.RIGHT) imu.gz = -15;

      // 2. 处理加速/减速
      if (keys.UP) {
        speed = Math.min(limit, speed + 0.5); 
      } else if (keys.DOWN) {
        speed = Math.max(-3, speed - 0.5); // 倒车最高 -3m/s
      } else {
        // 自然减速 (摩擦力)
        if (speed > 0) speed = Math.max(0, speed - 0.1);
        if (speed < 0) speed = Math.min(0, speed + 0.1);
      }

      // 3. ✨✨✨ 关键：根据速度和角度计算新坐标 ✨✨✨
      if (Math.abs(speed) > 0.1) {
        // 高德地图角度转换：0度是北，顺时针
        // 数学计算需要弧度，且数学通常以东为0度
        // 简单推导：dLat(y) = speed * cos(bearing), dLng(x) = speed * sin(bearing)
        // 注意：Web Mercator 投影下，纬度越高，经度距离越短，这里做简易估算
        
        const rad = (90 - bearing) * Math.PI / 180; 
        
        // 0.000005 是一个经验系数，将米转换为经纬度度数 (约 0.5米/tick)
        lat += speed * 0.000005 * Math.sin(rad); 
        lng += speed * 0.000005 * Math.cos(rad);
        
        // 运动时增加震动和负载
        imu.az += (Math.random() - 0.5); 
        altitude += (Math.random() - 0.5) * 0.2;
      }
    }

    // --- 更新状态回 Store ---
    cpuUsage = 15 + Math.abs(speed) * 2;
    if (Math.abs(speed) > 0.1) battery = Math.max(0, battery - 0.01);

    store.updateStatus({
      battery,
      altitude: parseFloat(altitude.toFixed(1)),
      cpuUsage: parseFloat(cpuUsage.toFixed(1)),
      memUsage: parseFloat(memUsage.toFixed(1)),
      speed: parseFloat(speed.toFixed(1)),
      location: { lat, lng, bearing }, // 更新位置
      imu, env, ultrasonicDist, radarDist // 更新传感器
    });
    
    // 推送历史数据给图表
    store.pushSensorHistory();

  }, 50); 
}

// 导出按键控制函数 (供 ManualJoystick.vue 使用)
export function setControlKey(key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', isPressed: boolean) {
  const store = useVehicleStore();
  // 如果当前不是手动模式，按键时强制切回手动
  if (isPressed && store.status.mode !== 'MANUAL') {
    store.updateStatus({ mode: 'MANUAL' });
    store.currentTask = null;
  }
  keys[key] = isPressed;
}