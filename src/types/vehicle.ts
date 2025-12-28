export type RunMode = 'MANUAL' | 'AUTO' | 'SIMULATION';

export interface Location {
  lat: number;
  lng: number;
  bearing: number;
}

export interface VehicleStatus {
  speed: number;
  battery: number;
  mode: RunMode;
  location: Location;
  isConnected: boolean;
  isEmergencyStopped: boolean; // 急停状态
}

export interface Task {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  steps: string[];
  currentStepIndex: number;

  // 新增：规划出的路径点 (用于在地图上画虚线)
  plannedRoute: { lat: number; lng: number }[];
}

export interface Log {
  id: string;
  time: string;
  type: 'INFO' | 'WARNING' | 'ERROR';
  content: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  steps: string[]; // 例如: ["路径规划", "自动巡航", "拍照"]
}