<template>
  <div class="control-page p-20">
    <el-row :gutter="20">
      <el-col :span="10">
        <el-card header="手动驾驶舱" class="mb-20">
          <div class="joystick-container">
            <ManualJoystick />
          </div>
          
          <div class="mt-20 status-info">
            <p>当前模式: <el-tag>{{ store.status.mode }}</el-tag></p>
            <p>实时车速: {{ store.status.speed }} m/s</p>
          </div>
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card v-if="store.currentTask" header="任务执行监控">
          <h3>正在执行: {{ store.currentTask.name }}</h3>
          <el-progress 
            :percentage="Math.floor(store.currentTask.progress)" 
            :status="store.currentTask.status === 'FAILED' ? 'exception' : ''" 
            :stroke-width="20" 
            text-inside 
          />
          
          <div class="mt-20 step-box">
            <el-steps :active="store.currentTask.currentStepIndex" finish-status="success" align-center>
              <el-step v-for="step in store.currentTask.steps" :key="step" :title="step" />
            </el-steps>
          </div>
          
          <div class="mt-20" style="text-align: center;">
            <el-button type="danger" @click="store.stopTask">紧急终止任务</el-button>
          </div>
        </el-card>

        <el-card v-else header="任务模板管理">
          <template #header>
            <div class="card-header">
              <span>可用任务模板</span>
              <el-button type="primary" size="small" @click="showAddDialog = true">
                <el-icon><Plus /></el-icon> 新建模板
              </el-button>
            </div>
          </template>

          <el-table :data="store.taskTemplates" style="width: 100%" height="300px">
            <el-table-column prop="name" label="任务名称" width="150" />
            <el-table-column label="执行步骤">
              <template #default="scope">
                <el-tag v-for="step in scope.row.steps" :key="step" size="small" style="margin-right: 5px">
                  {{ step }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" align="right">
              <template #default="scope">
                <el-button size="small" type="success" @click="store.startTask(scope.row)">下发</el-button>
                <el-button size="small" type="danger" icon="Delete" circle @click="store.removeTaskTemplate(scope.row.id)" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showAddDialog" title="创建新任务模板" width="500px">
      <el-form label-width="80px">
        <el-form-item label="任务名称">
          <el-input v-model="newTask.name" placeholder="例如：C区定点拍照" />
        </el-form-item>
        <el-form-item label="任务步骤">
          <div class="step-input-area">
             <el-tag 
                v-for="(tag, index) in newTask.steps" 
                :key="index" 
                closable 
                @close="newTask.steps.splice(index, 1)"
                style="margin-right: 5px; margin-bottom: 5px;"
             >
               {{ tag }}
             </el-tag>
             <div style="margin-top: 10px; display: flex; gap: 10px;">
               <el-input v-model="stepInput" placeholder="输入步骤名" size="small" @keyup.enter="addStep" />
               <el-button type="primary" size="small" @click="addStep">添加</el-button>
             </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmAddTask">保存模板</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { useVehicleStore } from '@/pinia/vehicleStore';
import { ElMessage } from 'element-plus';
// 👇 引入 ManualJoystick 组件
import ManualJoystick from '@/components/Control/ManualJoystick.vue';

const store = useVehicleStore();

// --- 新建任务逻辑 ---
const showAddDialog = ref(false);
const stepInput = ref('');
const newTask = reactive({
  name: '',
  steps: [] as string[]
});

const addStep = () => {
  if (stepInput.value.trim()) {
    newTask.steps.push(stepInput.value.trim());
    stepInput.value = '';
  }
};

const confirmAddTask = () => {
  if (!newTask.name) return ElMessage.warning('请输入任务名称');
  if (newTask.steps.length === 0) return ElMessage.warning('请至少添加一个步骤');
  
  store.addTaskTemplate(newTask.name, [...newTask.steps]);
  showAddDialog.value = false;
  newTask.name = '';
  newTask.steps = [];
  ElMessage.success('模板创建成功');
};
</script>

<style scoped>
.p-20 { padding: 20px; }
.mb-20 { margin-bottom: 20px; }
.mt-20 { margin-top: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.step-box { background: #f5f7fa; padding: 20px; border-radius: 4px; }
.joystick-container {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}
.status-info {
  text-align: center;
  color: #666;
  font-size: 14px;
  line-height: 1.8;
}
</style>