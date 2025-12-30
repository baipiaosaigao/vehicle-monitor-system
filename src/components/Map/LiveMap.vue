<template>
  <div class="map-wrapper">
    <div id="amap-container" class="amap-container"></div>
    
    <div class="debug-panel">
      <div class="debug-row">状态: {{ store.status.isConnected ? '🟢 在线' : '🔴 离线' }}</div>
      <div class="debug-row">模式: <b>{{ store.status.mode }}</b></div>
      <div class="debug-row">速度: <b>{{ store.status.speed }}</b> m/s</div>
      <div class="debug-row">急停: <span :style="{color: store.status.isEmergencyStopped ? 'red' : '#0f0'}">{{ store.status.isEmergencyStopped ? '已锁定' : '正常' }}</span></div>
      <div class="debug-row">GPS: {{ store.status.location.lng.toFixed(6) }}, {{ store.status.location.lat.toFixed(6) }}</div>
      <div class="debug-row" v-if="store.currentTask">任务: {{ store.currentTask.name }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { useVehicleStore } from '@/pinia/vehicleStore';

// 声明全局 AMap
declare let AMap: any;

const store = useVehicleStore();
let map: any = null;
let vehicleMarker: any = null;
let realPathPolyline: any = null;
let plannedPathPolyline: any = null;
let trackPathArr: number[][] = [];

onMounted(() => {
  initAMap();
});

onUnmounted(() => {
  if (map) map.destroy();
});

const initAMap = () => {
  if (typeof AMap === 'undefined') {
    console.error('AMap 未加载');
    return;
  }

  map = new AMap.Map('amap-container', {
    zoom: 18,
    center: [store.status.location.lng, store.status.location.lat],
    viewMode: '2D',
    resizeEnable: true,
    mapStyle: 'amap://styles/normal',
  });

  // 小车 Marker
  vehicleMarker = new AMap.Marker({
    position: [store.status.location.lng, store.status.location.lat],
    icon: new AMap.Icon({
      size: new AMap.Size(26, 40),
      image: 'https://webapi.amap.com/images/car.png',
      imageSize: new AMap.Size(26, 40),
      imageOffset: new AMap.Pixel(0, 0)
    }),
    offset: new AMap.Pixel(-13, -20),
    angle: store.status.location.bearing,
    map: map,
    zIndex: 200
  });

  // 轨迹线 (蓝)
  realPathPolyline = new AMap.Polyline({
    path: [],
    strokeColor: "#409EFF",
    strokeWeight: 6,
    map: map,
    zIndex: 100
  });

  // 规划线 (绿虚线)
  plannedPathPolyline = new AMap.Polyline({
    path: [],
    strokeColor: "#67C23A",
    strokeWeight: 5,
    strokeStyle: "dashed",
    map: map,
    zIndex: 50
  });

  trackPathArr.push([store.status.location.lng, store.status.location.lat]);
};

// 监听位置变化
watch(() => store.status.location, (loc) => {
  if (!map || !vehicleMarker) return;
  
  const newPos = [loc.lng, loc.lat];
  
  // 1. 更新车
  vehicleMarker.setPosition(newPos);
  vehicleMarker.setAngle(loc.bearing);
  
  // 2. 视角跟随
  map.setCenter(newPos);

  // 3. 更新轨迹 (只要动了就画)
  const lastPos = trackPathArr[trackPathArr.length - 1];
  if (!lastPos || Math.abs(lastPos[0] - newPos[0]) > 0.000001 || Math.abs(lastPos[1] - newPos[1]) > 0.000001) {
    trackPathArr.push(newPos);
    if (trackPathArr.length > 500) trackPathArr.shift(); // 限制长度
    if (realPathPolyline) realPathPolyline.setPath(trackPathArr);
  }
}, { deep: true });

// 监听任务变化
watch(() => store.currentTask, (newTask) => {
  if (!map || !plannedPathPolyline) return;
  if (newTask && newTask.plannedRoute) {
    plannedPathPolyline.setPath(newTask.plannedRoute.map(p => [p.lng, p.lat]));
  } else {
    plannedPathPolyline.setPath([]);
  }
}, { deep: true });
</script>

<style scoped>
.map-wrapper { width: 100%; height: 100%; position: relative; }
.amap-container { width: 100%; height: 100%; }

/* 调试面板样式 */
.debug-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  z-index: 999;
  pointer-events: none; /* 穿透点击，不影响地图操作 */
}
.debug-row { margin-bottom: 4px; }
</style>