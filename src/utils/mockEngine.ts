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
  store.addLog('INFO', '模拟引擎启动 (全功能版)');

  // 50ms 刷新一次 (20FPS)
  timer = setInterval(() => {
    // 1. 获取当前状态快照
    const s = store.status;
    let { battery, speed, altitude, cpuUsage, memUsage } = s;
    let { lat, lng, bearing } = s.location;
    
    // 传感器数据 (浅拷贝避免直接引用修改导致Vue监听问题)
    const imu = { ...s.imu };
    const env = { ...s.env };
    let { ultrasonicDist, radarDist } = s;

    // 参数设置
    const limit = s.limitSpeed || 5;
    const turnRate = s.turningAngle || 5;

    // --- 1. 模拟环境数据 (缓慢变化) ---
    env.temperature = parseFloat((25 + Math.sin(Date.now() / 10000)).toFixed(1)); // 25°C 浮动
    env.humidity = parseFloat((40 + Math.cos(Date.now() / 8000) * 5).toFixed(1)); // 40% 浮动
    env.pressure = Math.floor(1013 - (altitude - 260) / 10); // 气压随海拔微调

    // --- 2. 模拟测距数据 ---
    // 超声波 (近距离 0-5m)
    ultrasonicDist = parseFloat((2.5 + Math.sin(Date.now() / 500)).toFixed(2));
    // 毫米波雷达 (远距离 5-25m)
    radarDist = parseFloat((15 + Math.cos(Date.now() / 1000) * 10).toFixed(2));

    // --- 3. 模拟 IMU (基础重力) ---
    imu.ax = (Math.random() - 0.5) * 0.2;
    imu.ay = (Math.random() - 0.5) * 0.2;
    imu.az = 9.8 + (Math.random() - 0.5) * 0.2;
    imu.gx = 0; imu.gy = 0; imu.gz = 0;

    // --- 4. 核心运动逻辑 ---

    // A. 急停状态
    if (s.isEmergencyStopped) {
      speed = 0;
    } 
    // B. AI 自动驾驶模式
    else if (s.mode === 'AUTO' && store.currentTask) {
       angle += 0.01;
       speed = 3.5; 

       // AI 绕圈算法 (中心点：弘远楼)
       lat = 29.712477 + 0.0008 * Math.sin(angle); 
       lng = 106.789922 + 0.0008 * Math.cos(angle);
       bearing = (angle * 180 / Math.PI) % 360;
       
       // 模拟运动时的传感器震动
       imu.az += (Math.random() - 0.5);
       altitude += (Math.random() - 0.5) * 0.2;

       // ✨✨✨ 关键修复：AI 任务时间递减 ✨✨✨
       if (store.remainingTime > 0) {
         store.remainingTime -= 0.05; // 50ms = 0.05s
       }

       // 任务进度
       if (store.currentTask.progress < 100) {
         store.currentTask.progress += 0.5;
       } else {
         store.currentTask.status = 'COMPLETED';
         store.updateStatus({ mode: 'MANUAL' }); // 任务完成切回手动
         store.currentTask = null;
         speed = 0;
       }
    } 
    // C. 手动驾驶模式
    else {
       // 1. 处理转向
       if (keys.LEFT) {
         bearing = (bearing - turnRate + 360) % 360;
         imu.gz = 15; // 左转陀螺仪
       }
       if (keys.RIGHT) {
         bearing = (bearing + turnRate) % 360;
         imu.gz = -15; // 右转陀螺仪
       }

       // 2. 处理加速/减速
       if (keys.UP) {
         speed = Math.min(limit, speed + 0.5);
       } else if (keys.DOWN) {
         speed = Math.max(-3, speed - 0.5);
       } else {
         // 自然减速(摩擦力)
         if (speed > 0.1) speed -= 0.1;
         else if (speed < -0.1) speed += 0.1;
         else speed = 0;
       }

       // 3. 计算位移 (解决手动控制小车不动的问题)
       if (Math.abs(speed) > 0.1) {
          const rad = (90 - bearing) * Math.PI / 180;
          // 0.000005 为米转经纬度的大致系数
          lat += speed * 0.000005 * Math.sin(rad);
          lng += speed * 0.000005 * Math.cos(rad);

          // 运动时加速度波动增大
          imu.ax += (Math.random() - 0.5) * 2;
          imu.ay += (Math.random() - 0.5) * 2;
          imu.az += (Math.random() - 0.5) * 2;
          altitude += (Math.random() - 0.5) * 0.2;
       }
    }

    // --- 5. 统一更新状态 ---
    cpuUsage = 15 + Math.abs(speed) * 2;
    if (Math.abs(speed) > 0.1) battery = Math.max(0, battery - 0.01);

    store.updateStatus({
      battery,
      altitude: parseFloat(altitude.toFixed(1)),
      cpuUsage: parseFloat(cpuUsage.toFixed(1)),
      memUsage: parseFloat(memUsage.toFixed(1)),
      speed: parseFloat(speed.toFixed(1)),
      location: { lat, lng, bearing },
      // 更新传感器数据
      imu, env, ultrasonicDist, radarDist
    });

    // 推送历史数据用于 ECharts 绘图
    store.pushSensorHistory();

  }, 50); 
}

export function setControlKey(key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', isPressed: boolean) {
  const store = useVehicleStore();
  // 抢夺控制权：如果是 AI 模式，按下键盘强制切回手动
  if (isPressed && store.status.mode !== 'MANUAL') {
    store.updateStatus({ mode: 'MANUAL' });
    store.currentTask = null;
  }
  keys[key] = isPressed;
}