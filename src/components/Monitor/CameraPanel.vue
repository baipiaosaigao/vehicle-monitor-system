<template>
  <div class="camera-panel" ref="panelRef">
    <div class="video-container">
      <video 
        ref="videoRef" 
        autoplay 
        playsinline 
        :class="['live-feed', currentViewClass]"
      ></video>
      
      <div class="osd-layer">
        <div class="top-left">
          <span class="rec-dot"></span> REC
          <span class="ml-10">CAM-01: {{ currentViewLabel }}</span>
        </div>
        <div class="bottom-right">
          {{ currentTime }} | {{ currentRes }} | FPS: 30
        </div>
      </div>

      <div v-if="!isStreamActive" class="no-signal">
        <el-icon class="is-loading"><Loading /></el-icon>
        <p>正在连接车载摄像头...</p>
        <el-button type="primary" size="small" @click="initCamera">重试连接</el-button>
      </div>
    </div>

    <div class="control-bar">
      <el-radio-group v-model="currentView" size="small" @change="handleViewChange">
        <el-radio-button label="front">前视 (M)</el-radio-button>
        <el-radio-button label="rear">后视 (R)</el-radio-button>
        <el-radio-button label="surround">环视 (360°)</el-radio-button>
      </el-radio-group>

      <div class="right-controls">
        <el-select v-model="currentRes" size="small" style="width: 90px" class="mr-10">
          <el-option label="1080P" value="1080P" />
          <el-option label="720P" value="720P" />
          <el-option label="480P" value="480P" />
        </el-select>

        <el-button 
          size="small" 
          :icon="isPaused ? VideoPlay : VideoPause" 
          circle 
          @click="togglePlay" 
          :type="isPaused ? 'danger' : 'success'"
        />
        
        <el-button size="small" :icon="FullScreen" circle @click="toggleFullscreen" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { VideoPlay, VideoPause, FullScreen, Loading } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const videoRef = ref<HTMLVideoElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const isStreamActive = ref(false);
const isPaused = ref(false);
const currentView = ref('front'); // front, rear, surround
const currentRes = ref('1080P');
const currentTime = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'));
let timeTimer: any = null;

// 1. 调用本地摄像头
const initCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 1280, height: 720 } 
    });
    
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      isStreamActive.value = true;
    }
  } catch (err) {
    console.error("无法调用摄像头:", err);
    isStreamActive.value = false;
    // 这里可以加一个 ElMessage.error('无法连接本地摄像头，请检查权限');
  }
};

// 2. 视角切换逻辑 (通过 CSS 类模拟)
const currentViewLabel = computed(() => {
  switch(currentView.value) {
    case 'front': return '主视';
    case 'rear': return '后视';
    case 'surround': return '环视';
    default: return '主视';
  }
});

const currentViewClass = computed(() => {
  return `view-${currentView.value}`;
});

// 虚拟切换，实际还是同一个流，这里仅做UI反馈
const handleViewChange = () => {
  // 可以在这里模拟 loading 效果
};

// 3. 播放/暂停
const togglePlay = () => {
  if (!videoRef.value) return;
  if (videoRef.value.paused) {
    videoRef.value.play();
    isPaused.value = false;
  } else {
    videoRef.value.pause();
    isPaused.value = true;
  }
};

// 4. 全屏控制
const toggleFullscreen = () => {
  if (!panelRef.value) return;
  if (!document.fullscreenElement) {
    panelRef.value.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

onMounted(() => {
  initCamera();
  timeTimer = setInterval(() => {
    currentTime.value = dayjs().format('HH:mm:ss');
  }, 1000);
});

onUnmounted(() => {
  if (timeTimer) clearInterval(timeTimer);
  // 停止摄像头流，释放资源
  if (videoRef.value && videoRef.value.srcObject) {
    const stream = videoRef.value.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
  }
});
</script>

<style scoped>
.camera-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.video-container {
  flex: 1;
  position: relative;
  background: #1a1a1a;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.live-feed {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 充满容器 */
  transition: all 0.5s ease;
}

/* --- 核心：使用 CSS 伪装不同的摄像头视角 --- */

/* 前视：正常 */
.view-front { filter: none; }

/* 后视：镜像 + 略微偏色 (模拟倒车影像) */
.view-rear { 
  transform: scaleX(-1); 
  filter: contrast(1.1) sepia(0.2); 
}

/* 环视：模拟广角/鱼眼效果 (稍微缩小并加模糊边缘，或者用 scale) */
.view-surround {
  transform: scale(0.8);
  filter: saturate(0.5);
  border-radius: 50%; /* 圆形遮罩模拟鱼眼 */
  border: 2px solid #0f0;
}

/* ---------------------------------------- */

.osd-layer {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none; /* 让点击穿透 */
  padding: 10px;
  color: #0f0; /* 黑客绿 */
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold;
  font-size: 14px;
  text-shadow: 1px 1px 2px black;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.top-left, .bottom-right {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 5px;
  border-radius: 2px;
}

.rec-dot {
  display: inline-block;
  width: 10px; height: 10px;
  background: red;
  border-radius: 50%;
  animation: blink 1s infinite;
}

@keyframes blink { 50% { opacity: 0; } }

.no-signal {
  color: #666;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.control-bar {
  height: 40px;
  background: #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
}

.right-controls {
  display: flex;
  align-items: center;
}
.mr-10 { margin-right: 10px; }
.ml-10 { margin-left: 10px; }
</style>