export type RunMode = 'MANUAL' | 'AUTO' | 'SIMULATION';

export interface Location {
  lat: number;
  lng: number;
  bearing: number;
}

// 激光雷达点 (保持不变)
export interface LidarPoint {
  angle: number;
  distance: number;
  opacity: number;
  isObstacle: boolean;
}

// ✨✨✨ 新增：IMU 6轴数据接口 ✨✨✨
export interface ImuData {
  ax: number; ay: number; az: number; // 加速度
  gx: number; gy: number; gz: number; // 陀螺仪
}

// ✨✨✨ 新增：环境感知数据接口 ✨✨✨
export interface EnvData {
  temperature: number; // 温度
  humidity: number;    // 湿度
  pressure: number;    // 气压
}

export interface VehicleStatus {
  isConnected: boolean;
  mode: RunMode;
  speed: number;
  battery: number;
  location: Location;
  isEmergencyStopped: boolean;
  limitSpeed?: number;
  turningAngle?: number;
  altitude: number;
  cpuUsage: number;
  memUsage: number;

  // ✨ 新增实时传感器状态
  imu: ImuData;
  env: EnvData;
  ultrasonicDist: number; // 超声波距离 (m)
  radarDist: number;      // 毫米波雷达距离 (m)
}

// 日志和任务接口保持不变...
export interface Log {
  id: string;
  time: string;
  type: 'INFO' | 'WARNING' | 'ERROR';
  content: string;
}

export interface Task {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  progress: number;
  steps: string[];
  currentStepIndex: number;
  plannedRoute?: { lat: number; lng: number }[]; 
}

export interface TaskTemplate {
  id: string;
  name: string;
  steps: string[];
}