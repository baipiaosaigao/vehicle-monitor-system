<template>
  <div class="joystick-wrapper">
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
import { reactive, onMounted, onUnmounted } from 'vue';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { useVehicleStore } from '@/pinia/vehicleStore';
import { setControlKey } from '@/utils/mockEngine'; // 引入新方法

const store = useVehicleStore();
const activeKeys = reactive({ UP: false, DOWN: false, LEFT: false, RIGHT: false });

// 鼠标/触摸操作
const handlePress = (key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
  activeKeys[key] = true;
  setControlKey(key, true);
};
const handleRelease = (key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
  activeKeys[key] = false;
  setControlKey(key, false);
};

// 键盘操作
const onKeyDown = (e: KeyboardEvent) => {
  if (e.repeat) return; // 防止长按重复触发
  if (e.target instanceof HTMLInputElement) return;

  if (e.code === 'Space') { e.preventDefault(); store.setEmergencyStop(true); return; }

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
.d-pad-grid { display: grid; grid-template-areas: ". up ." "left center right" ". down ."; gap: 8px; justify-content: center; margin-bottom: 15px; }
.btn-up { grid-area: up; width: 50px; height: 50px; }
.btn-left { grid-area: left; width: 50px; height: 50px; }
.btn-right { grid-area: right; width: 50px; height: 50px; }
.btn-down { grid-area: down; width: 50px; height: 50px; }
.btn-center { grid-area: center; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: #f0f2f5; border-radius: 50%; font-weight: bold; color: #666; line-height: 1.1; }
.emergency-btn { margin-top: 10px; }
.hint-text { font-size: 12px; color: #999; margin-top: 8px; }
</style>