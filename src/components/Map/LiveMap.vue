<template>
  <div class="map-wrapper">
    <div id="amap-container" class="amap-container"></div>
    <div class="debug-info" v-if="isDebug">
      GPS: {{ store.status.location.lng.toFixed(6) }}, {{ store.status.location.lat.toFixed(6) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue';
import { useVehicleStore } from '@/pinia/vehicleStore';

// 声明全局 AMap
declare let AMap: any;

const store = useVehicleStore();
const isDebug = ref(true); // 开启调试显示

let map: any = null;
let vehicleMarker: any = null;
let plannedPathPolyline: any = null; // 绿色虚线 (AI规划)
let realPathPolyline: any = null;    // 蓝色实线 (实时轨迹)

// ✨✨✨ 关键修复 1：使用本地数组管理轨迹，而不是依赖 AMap 对象 ✨✨✨
let trackPathArr: number[][] = []; 

onMounted(() => {
  initAMap();
});

onUnmounted(() => {
  if (map) map.destroy();
});

const initAMap = () => {
  if (typeof AMap === 'undefined') {
    console.error('AMap 未加载，请检查 index.html');
    return;
  }

  // 1. 初始化地图
  map = new AMap.Map('amap-container', {
    zoom: 18, // 稍微放大一点，看细节
    center: [store.status.location.lng, store.status.location.lat],
    viewMode: '2D',
    resizeEnable: true,
    mapStyle: 'amap://styles/normal',
  });

  // 2. 创建车辆 Marker
  vehicleMarker = new AMap.Marker({
    position: [store.status.location.lng, store.status.location.lat],
    icon: new AMap.Icon({
      size: new AMap.Size(26, 40),
      image: 'https://webapi.amap.com/images/car.png',
      imageSize: new AMap.Size(26, 40),
      imageOffset: new AMap.Pixel(0, 0) // 修正中心点
    }),
    offset: new AMap.Pixel(-13, -20),
    angle: store.status.location.bearing,
    map: map,
    zIndex: 200
  });

  // 3. 规划路径线 (虚线)
  plannedPathPolyline = new AMap.Polyline({
    path: [],
    strokeColor: "#67C23A", // 绿
    strokeWeight: 6,
    strokeStyle: "dashed",
    strokeDasharray: [10, 5],
    map: map,
    zIndex: 50
  });

  // 4. 实时轨迹线 (实线)
  realPathPolyline = new AMap.Polyline({
    path: [], 
    strokeColor: "#409EFF", // 蓝
    strokeWeight: 6,        // 线粗一点更容易看清
    strokeStyle: "solid",
    lineJoin: 'round',
    lineCap: 'round',
    map: map,
    zIndex: 100
  });
  
  // 初始化时先把当前点加进去
  trackPathArr.push([store.status.location.lng, store.status.location.lat]);
};

// --- 监听车辆位置 ---
watch(() => store.status.location, (loc) => {
  if (!map || !vehicleMarker) return;
  
  // 构造高德坐标格式 [lng, lat]
  const newPos = [loc.lng, loc.lat];

  // 1. 移动小车图标
  vehicleMarker.setPosition(newPos);
  vehicleMarker.setAngle(loc.bearing);

  // ✨✨✨ 关键修复 2：强制地图中心跟随小车 ✨✨✨
  // 这样车永远在屏幕中间，你就能看到它在动了
  map.setCenter(newPos);

  // ✨✨✨ 关键修复 3：更新轨迹数组并重绘 ✨✨✨
  // 如果车动了（距离上一个点有位移），才加点，防止静止时堆积点
  const lastPos = trackPathArr[trackPathArr.length - 1];
  if (!lastPos || (Math.abs(lastPos[0] - newPos[0]) > 0.000001 || Math.abs(lastPos[1] - newPos[1]) > 0.000001)) {
    trackPathArr.push(newPos);
    
    // 限制轨迹长度，防止内存溢出 (保留最近 1000 个点)
    if (trackPathArr.length > 1000) trackPathArr.shift();
    
    // 重新设置路径
    if (realPathPolyline) {
      realPathPolyline.setPath(trackPathArr);
    }
  }

}, { deep: true });

// --- 监听规划路径 ---
watch(() => store.currentTask, (newTask) => {
  if (!map || !plannedPathPolyline) return;
  if (newTask && newTask.plannedRoute) {
    const path = newTask.plannedRoute.map(p => [p.lng, p.lat]);
    plannedPathPolyline.setPath(path);
    // 任务开始时，缩放地图以展示全貌
    map.setFitView([plannedPathPolyline]); 
  } else {
    plannedPathPolyline.setPath([]);
  }
}, { deep: true });
</script>

<style scoped>
.map-wrapper { width: 100%; height: 100%; position: relative; background-color: #f0f2f5; }
.amap-container { width: 100%; height: 100%; }
.debug-info {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 4px;
  z-index: 999;
}
</style>