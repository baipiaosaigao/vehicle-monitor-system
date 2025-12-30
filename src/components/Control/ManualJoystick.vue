<template>
  <div class="joystick-wrapper">
    
    <div class="params-panel">
      <div class="param-row">
        <span class="label">限速设置: <span class="val">{{ getLimitSpeed }} m/s</span></span>
        <el-slider 
          v-model="limitSpeedModel" 
          :min="1" :max="15" :step="1" 
          size="small" 
          :disabled="store.status.isEmergencyStopped"
        />
      </div>
      <div class="param-row">
        <span class="label">转向角度: <span class="val">{{ getTurningAngle }}°</span></span>
        <el-slider 
          v-model="turningAngleModel" 
          :min="1" :max="45" :step="1" 
          size="small" 
          :disabled="store.status.isEmergencyStopped"
        />
      </div>
    </div>
    
    <div class="d-pad-grid">
      <el-button class="btn-up" :type="activeKeys.UP ? 'primary' : 'default'" :icon="ArrowUp" 
        @mousedown="handlePress('UP')" @mouseup="handleRelease('UP')" @mouseleave="handleRelease('UP')" />
      
      <el-button class="btn-left" :type="activeKeys.LEFT ? 'primary' : 'default'" :icon="ArrowLeft" 
        @mousedown="handlePress('LEFT')" @mouseup="handleRelease('LEFT')" @mouseleave="handleRelease('LEFT')" />
        
      <div class="btn-center speed-display">
        {{ store.status.speed }}<br><span style="font-size:8px">km/h</span>
      </div>
      
      <el-button class="btn-right" :type="activeKeys.RIGHT ? 'primary' : 'default'" :icon="ArrowRight" 
        @mousedown="handlePress('RIGHT')" @mouseup="handleRelease('RIGHT')" @mouseleave="handleRelease('RIGHT')" />
        
      <el-button class="btn-down" :type="activeKeys.DOWN ? 'primary' : 'default'" :icon="ArrowDown" 
        @mousedown="handlePress('DOWN')" @mouseup="handleRelease('DOWN')" @mouseleave="handleRelease('DOWN')" />
    </div>
    
    <div class="emergency-btn">
      <el-button type="danger" style="width: 100%" @click="store.setEmergencyStop(!store.status.isEmergencyStopped)">
        {{ store.status.isEmergencyStopped ? '解锁车辆' : '紧急停止 (Space)' }}
      </el-button>
    </div>
    <div class="hint-text">长按键盘方向键 ↑ ↓ ← → 驾驶</div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted, computed } from 'vue';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { useVehicleStore } from '@/pinia/vehicleStore';
import { setControlKey } from '@/utils/mockEngine';

const store = useVehicleStore();
const activeKeys = reactive({ UP: false, DOWN: false, LEFT: false, RIGHT: false });

// --- 计算属性：绑定 Store 中的动态参数 ---
// 使用 computed 的 get/set 代理 store 中的 any 类型字段
const limitSpeedModel = computed({
  get: () => (store.status as any).limitSpeed || 5,
  set: (val) => store.updateStatus({ limitSpeed: val })
});

const turningAngleModel = computed({
  get: () => (store.status as any).turningAngle || 5,
  set: (val) => store.updateStatus({ turningAngle: val })
});

// 单纯用于显示的 computed
const getLimitSpeed = computed(() => (store.status as any).limitSpeed || 5);
const getTurningAngle = computed(() => (store.status as any).turningAngle || 5);

// --- 核心逻辑：按键处理与日志记录 ---
const handlePress = (key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
  if(store.status.isEmergencyStopped) return; // 急停时禁用
  
  activeKeys[key] = true;
  setControlKey(key, true);

  // ✨✨✨ 新增：记录操作日志 ✨✨✨
  const actionMap: Record<string, string> = { 
    'UP': '前进指令', 
    'DOWN': '后退/刹车指令', 
    'LEFT': '左转指令', 
    'RIGHT': '右转指令' 
  };

  const currentSpeed = store.status.speed;
  // 格式：指令类型 | 参数 | 执行结果
  const logContent = `手动控制: ${actionMap[key]} | 参数: 当前速度 ${currentSpeed}m/s | 状态: 下发成功`;
  
  store.addLog('INFO', logContent);
};

const handleRelease = (key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
  activeKeys[key] = false;
  setControlKey(key, false);
};

// --- 键盘事件监听 ---
const onKeyDown = (e: KeyboardEvent) => {
  if (e.repeat) return; 
  if (e.target instanceof HTMLInputElement) return;

  if (e.code === 'Space') { e.preventDefault(); store.setEmergencyStop(true); return; }
  
  // 急停时禁用键盘驾驶
  if(store.status.isEmergencyStopped) return;

  switch(e.key) {
    case 'ArrowUp': case 'w': case 'W': handlePress('UP'); break;
    case 'ArrowDown': case 's': case 'S': handlePress('DOWN'); break;
    case 'ArrowLeft': case 'a': case 'A': handlePress('LEFT'); break;
    case 'ArrowRight': case 'd': case 'D': handlePress('RIGHT'); break;
  }
};

const onKeyUp = (e: KeyboardEvent) => {
  switch(e.key) {
    case 'ArrowUp': case 'w': case 'W': handleRelease('UP'); break;
    case 'ArrowDown': case 's': case 'S': handleRelease('DOWN'); break;
    case 'ArrowLeft': case 'a': case 'A': handleRelease('LEFT'); break;
    case 'ArrowRight': case 'd': case 'D': handleRelease('RIGHT'); break;
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});
</script>

<style scoped>
.joystick-wrapper { background: #fff; padding: 15px; border-radius: 8px; text-align: center; }

/* 参数面板样式 */
.params-panel { margin-bottom: 20px; background: #f8f9fa; padding: 10px; border-radius: 6px; }
.param-row { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; font-size: 12px; color: #666; }
.param-row .label { width: 100px; text-align: left; }
.param-row .val { color: #409EFF; font-weight: bold; margin-left: 2px;}
.param-row .el-slider { flex: 1; }

.d-pad-grid { display: grid; grid-template-areas: ". up ." "left center right" ". down ."; gap: 8px; justify-content: center; margin-bottom: 15px; }
.btn-up { grid-area: up; width: 50px; height: 50px; }
.btn-left { grid-area: left; width: 50px; height: 50px; }
.btn-right { grid-area: right; width: 50px; height: 50px; }
.btn-down { grid-area: down; width: 50px; height: 50px; }
.btn-center { grid-area: center; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: #f0f2f5; border-radius: 50%; font-weight: bold; color: #666; line-height: 1.1; }
.emergency-btn { margin-top: 10px; }
.hint-text { font-size: 12px; color: #999; margin-top: 8px; }
</style>