<template>
  <div class="ai-task-panel">
    
    <div v-if="store.currentTask" class="running-state">
      <div class="task-header">
        <span class="task-name">{{ store.currentTask.name }}</span>
        <el-tag :type="store.isTaskPaused ? 'warning' : 'success'" effect="dark" size="small">
          {{ store.isTaskPaused ? '已暂停' : '执行中' }}
        </el-tag>
      </div>

      <div class="progress-section">
        <el-progress 
          :percentage="Math.floor(store.currentTask.progress)" 
          :status="store.isTaskPaused ? 'warning' : ''"
          :stroke-width="10"
        />
        <div class="time-left">预计剩余: {{ store.remainingTime }}s</div>
      </div>

      <div class="steps-timeline">
        <el-scrollbar height="100%">
          <el-timeline>
            <el-timeline-item
              v-for="(step, index) in store.currentTask.steps"
              :key="index"
              :type="index <= store.currentTask.currentStepIndex ? 'primary' : ''"
              :hollow="index > store.currentTask.currentStepIndex"
              :timestamp="index === store.currentTask.currentStepIndex ? '当前步骤' : ''"
            >
              {{ step }}
            </el-timeline-item>
          </el-timeline>
        </el-scrollbar>
      </div>

      <div class="control-actions">
        <el-button 
          v-if="!store.isTaskPaused" 
          type="warning" :icon="VideoPause" circle 
          @click="store.pauseTask" 
          title="暂停"
        />
        <el-button 
          v-else 
          type="success" :icon="VideoPlay" circle 
          @click="store.resumeTask" 
          title="继续"
        />
        
        <el-popconfirm title="确定终止当前任务吗?" @confirm="store.stopTask('用户手动终止')">
          <template #reference>
            <el-button type="danger" :icon="SwitchButton" circle title="终止任务" />
          </template>
        </el-popconfirm>
      </div>
    </div>

    <div v-else class="idle-state">
      <div class="empty-tip">
        <el-icon :size="40" color="#ddd"><List /></el-icon>
        <p>选择任务模板以开始</p>
      </div>
      
      <div class="template-list">
        <div 
          v-for="tpl in store.taskTemplates" 
          :key="tpl.id" 
          class="tpl-item"
          @click="handleSelectTemplate(tpl)"
        >
          <div class="tpl-info">
            <span class="name">{{ tpl.name }}</span>
            <span class="step-count">{{ tpl.steps.length }} 步骤</span>
          </div>
          <el-button type="primary" link :icon="VideoPlay">执行</el-button>
        </div>
      </div>

      <el-button class="add-btn" plain style="width: 100%" :icon="Plus" @click="addDialogVisible = true">
        新建任务模板
      </el-button>
    </div>

    <el-dialog v-model="addDialogVisible" title="新建任务" width="300px" append-to-body>
      <el-form :model="newTpl" label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="newTpl.name" placeholder="例如: C区巡逻" />
        </el-form-item>
        <el-form-item label="步骤">
          <el-input type="textarea" v-model="newTpl.stepsStr" placeholder="用逗号分隔，如: 出发,到达,拍照" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate">保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useVehicleStore } from '@/pinia/vehicleStore';
import { VideoPause, VideoPlay, SwitchButton, List, Plus } from '@element-plus/icons-vue';
import type { TaskTemplate } from '@/types/vehicle';

const store = useVehicleStore();
const addDialogVisible = ref(false);

const newTpl = reactive({ name: '', stepsStr: '' });

const handleSelectTemplate = (tpl: TaskTemplate) => {
  store.startTask(tpl);
};

const saveTemplate = () => {
  if(!newTpl.name || !newTpl.stepsStr) return;
  // 支持中文逗号和英文逗号分隔
  const steps = newTpl.stepsStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
  store.addTaskTemplate(newTpl.name, steps);
  addDialogVisible.value = false;
  newTpl.name = ''; newTpl.stepsStr = '';
};
</script>

<style scoped>
.ai-task-panel { height: 100%; display: flex; flex-direction: column; background: #fff; border-radius: 4px; padding: 15px; box-sizing: border-box; }

/* 运行态样式 */
.running-state { display: flex; flex-direction: column; height: 100%; }
.task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.task-name { font-weight: bold; font-size: 16px; }
.progress-section { margin-bottom: 20px; text-align: center; }
.time-left { margin-top: 5px; font-size: 12px; color: #909399; }
.steps-timeline { flex: 1; overflow: hidden; margin-bottom: 10px; padding: 0 10px; }
.control-actions { display: flex; justify-content: center; gap: 20px; padding-top: 15px; border-top: 1px solid #eee; margin-top: auto; }

/* 空闲态样式 */
.idle-state { height: 100%; display: flex; flex-direction: column; gap: 10px; }
.empty-tip { text-align: center; color: #909399; padding: 20px 0; }
.empty-tip p { margin-top: 5px; font-size: 12px; }
.template-list { flex: 1; overflow-y: auto; padding-right: 5px; }
.tpl-item { 
  display: flex; justify-content: space-between; align-items: center; 
  padding: 12px; border: 1px solid #ebeef5; border-radius: 6px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; 
}
.tpl-item:hover { border-color: #409EFF; background: #ecf5ff; }
.tpl-info { display: flex; flex-direction: column; }
.tpl-info .name { font-size: 14px; font-weight: 500; color: #303133; }
.tpl-info .step-count { font-size: 12px; color: #999; margin-top: 2px; }
.add-btn { margin-top: 10px; }
</style>