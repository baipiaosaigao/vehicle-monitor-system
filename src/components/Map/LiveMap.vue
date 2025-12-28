<template>
  <div id="map-container" class="map-view"></div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useVehicleStore } from '@/pinia/vehicleStore';

const store = useVehicleStore();
let map: L.Map;
let carMarker: L.Marker; // 改用 Marker 以支持自定义图标
let historyLine: L.Polyline;
const pathPoints: [number, number][] = [];

// 1. 定义一个带箭头的自定义图标 (CSS控制旋转)
const carIconDiv = L.divIcon({
  className: 'car-icon-container',
  html: `<div id="car-arrow" style="
    width: 0; height: 0; 
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 20px solid red;
    transform-origin: center center;
    transition: transform 0.1s linear; /* 平滑旋转动画 */
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10] // 中心点对齐
});

onMounted(() => {
  // 初始化地图 (两江校区)
  map = L.map('map-container').setView([29.7175, 106.7585], 18);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'OpenStreetMap'
  }).addTo(map);

  // 2. 使用箭头图标初始化小车
  carMarker = L.marker([29.7175, 106.7585], { icon: carIconDiv }).addTo(map);

  historyLine = L.polyline([], { color: 'blue', weight: 3 }).addTo(map);
});

watch(() => store.status.location, (newLoc) => {
  if (!map) return;
  const latlng: [number, number] = [newLoc.lat, newLoc.lng];
  
  // 移动图标
  carMarker.setLatLng(latlng);

  // 3. 核心修复：旋转图标朝向
  // 找到 DOM 元素并设置旋转角度 (bearing)
  const arrowEl = document.getElementById('car-arrow');
  if (arrowEl) {
    arrowEl.style.transform = `rotate(${newLoc.bearing}deg)`;
  }

  // 绘制轨迹
  const lastPoint = pathPoints[pathPoints.length - 1];
  if (!lastPoint || lastPoint[0] !== latlng[0] || lastPoint[1] !== latlng[1]) {
    pathPoints.push(latlng);
    if (pathPoints.length > 1000) pathPoints.shift();
    historyLine.setLatLngs(pathPoints);
  }
  
  // map.panTo(latlng); // 可选：开启跟随视角
}, { deep: true });
</script>

<style scoped>
.map-view { width: 100%; height: 100%; z-index: 1; }
/* 消除 Leaflet 默认容器的背景 */
:deep(.car-icon-container) {
  background: transparent;
  border: none;
}
</style>