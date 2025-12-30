import { useVehicleStore } from '@/pinia/vehicleStore';

let timer: any = null;
let angle = 0;
const keys = { UP: false, DOWN: false, LEFT: false, RIGHT: false };

export function startMockEngine() {
  const store = useVehicleStore();
  if (store.status.isConnected) return;
  
  store.updateStatus({ isConnected: true });
  store.addLog('INFO', '模拟引擎启动 (全传感器版)');

  timer = setInterval(() => {
    let { battery, speed, altitude, cpuUsage, memUsage } = store.status;
    let { lat, lng, bearing } = store.status.location;
    let { imu, env, ultrasonicDist, radarDist } = store.status;

    const limit = (store.status as any).limitSpeed || 5;
    const turnRate = (store.status as any).turningAngle || 5;

    // --- 1. 模拟环境数据 (缓慢变化) ---
    // 温度 25度上下浮动
    env.temperature = parseFloat((25 + Math.sin(Date.now() / 10000)).toFixed(1));
    // 湿度
    env.humidity = parseFloat((40 + Math.cos(Date.now() / 8000) * 5).toFixed(1));
    // 气压 (随海拔微调)
    env.pressure = Math.floor(1013 - (altitude - 260) / 10);

    // --- 2. 模拟测距数据 ---
    // 超声波 (近距离 0-5m)
    ultrasonicDist = parseFloat((2.5 + Math.sin(Date.now() / 500)).toFixed(2));
    // 毫米波雷达 (远距离 0-50m)
    radarDist = parseFloat((15 + Math.cos(Date.now() / 1000) * 10).toFixed(2));

    // --- 3. 模拟 IMU (根据运动状态) ---
    // 基础重力
    imu.ax = (Math.random() - 0.5) * 0.2;
    imu.ay = (Math.random() - 0.5) * 0.2;
    imu.az = 9.8 + (Math.random() - 0.5) * 0.2;
    imu.gx = 0; imu.gy = 0; imu.gz = 0;

    // 如果有速度，加速度波动增大
    if (Math.abs(speed) > 0) {
      imu.ax += (Math.random() - 0.5) * 2;
      imu.ay += (Math.random() - 0.5) * 2;
      imu.az += (Math.random() - 0.5) * 2;
      altitude += (Math.random() - 0.5) * 0.2;
    }
    // 如果在转向，陀螺仪 Z 轴有数据
    if (keys.LEFT) imu.gz = 15 + Math.random();
    if (keys.RIGHT) imu.gz = -15 - Math.random();


    // --- 4. 车辆运动逻辑 (原有) ---
    // ... 运动逻辑省略修改，保持原有即可 ...
    // 为了节省篇幅，这里简写，请保持原文件里的运动逻辑不变
    // 只展示变量更新部分
    
    // 简化的运动逻辑占位
    if (store.status.isEmergencyStopped) { speed = 0; }
    else if (store.status.mode === 'AUTO' && store.currentTask) {
       angle += 0.01;
       speed = 3.5; 
       lat = 29.712477 + 0.0008 * Math.sin(angle); 
       lng = 106.789922 + 0.0008 * Math.cos(angle);
       bearing = (angle * 180 / Math.PI) % 360;
       // ... AI逻辑保持不变
    } else {
       // ... 手动逻辑保持不变 (记得更新 lat/lng/bearing)
       if (keys.LEFT) bearing = (bearing - turnRate + 360) % 360;
       if (keys.RIGHT) bearing = (bearing + turnRate) % 360;
       if (keys.UP) speed = Math.min(limit, speed + 0.5);
       else if (keys.DOWN) speed = Math.max(-3, speed - 0.5);
       else { if(speed>0) speed -= 0.1; if(speed<0) speed += 0.1; }
       
       if (Math.abs(speed) > 0.1) {
          const rad = (90 - bearing) * Math.PI / 180;
          lat += speed * 0.000005 * Math.sin(rad);
          lng += speed * 0.000005 * Math.cos(rad);
       }
    }

    // --- 5. 更新状态 ---
    cpuUsage = 15 + Math.abs(speed) * 2;
    if (Math.abs(speed) > 0.1) battery = Math.max(0, battery - 0.01);

    store.updateStatus({
      battery,
      altitude: parseFloat(altitude.toFixed(1)),
      cpuUsage: parseFloat(cpuUsage.toFixed(1)),
      memUsage: parseFloat(memUsage.toFixed(1)),
      speed: parseFloat(speed.toFixed(1)),
      location: { lat, lng, bearing },
      // ✨ 更新传感器
      imu, env, ultrasonicDist, radarDist
    });

    // ✨✨✨ 推送历史数据用于绘图 ✨✨✨
    store.pushSensorHistory();

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