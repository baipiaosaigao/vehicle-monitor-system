// 文件路径: src/types/vehicle.ts

export type RunMode = 'MANUAL' | 'AUTO' | 'SIMULATION';

export interface Location {
  lat: number;
  lng: number;
  bearing: number;
}

export interface VehicleStatus {
  isConnected: boolean;
  mode: RunMode;
  speed: number;
  battery: number;
  location: Location;
  isEmergencyStopped: boolean;
  limitSpeed?: number;    // 限速设置
  turningAngle?: number;  // 转向灵敏度
}

export interface Log {
  id: string;
  time: string;
  type: 'INFO' | 'WARNING' | 'ERROR';
  content: string;
}

export interface Task {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED'; // 增加 PAUSED 状态
  progress: number;
  steps: string[];
  currentStepIndex: number;
  // ✨ 新增：规划路径点，用于地图绘制
  plannedRoute?: { lat: number; lng: number }[]; 
}

export interface TaskTemplate {
  id: string;
  name: string;
  steps: string[];
}