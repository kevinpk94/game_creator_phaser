<script setup>
import { NCard, NSpace, NSelect, NInputNumber, NButton } from 'naive-ui';

const movement = defineModel();

function addPatrolPoint() {
  if (movement.value && movement.value.type === 'patrol') {
    const lastPoint = movement.value.path[movement.value.path.length - 1] || {x: 0, y: 0};
    movement.value.path.push({ ...lastPoint });
  }
}
</script>

<template>
  <n-card title="Cấu hình di chuyển" size="small">
    <n-space vertical>
      <label>Loại di chuyển</label>
      <n-select v-model:value="movement.type" :options="[{label: 'Ngẫu nhiên', value: 'random'}, {label: 'Tuần tra', value: 'patrol'}]" />

      <div v-if="movement.type === 'random'">
        <label>Thời gian chờ (ms)</label>
        <n-input-number v-model:value="movement.delay" :min="100" />
        <label>Phạm vi (x1, y1, x2, y2)</label>
        <n-space>
          <n-input-number v-model:value="movement.range.x1" :min="0" :max="19" />
          <n-input-number v-model:value="movement.range.y1" :min="0" :max="14" />
          <n-input-number v-model:value="movement.range.x2" :min="0" :max="19" />
          <n-input-number v-model:value="movement.range.y2" :min="0"  :max="14"/>
        </n-space>
      </div>

      <div v-if="movement.type === 'patrol'">
        <label>Tốc độ di chuyển (ms/ô)</label>
        <n-input-number v-model:value="movement.speed" :min="50" />
        <label>Thời gian chờ tại điểm (ms)</label>
        <n-input-number v-model:value="movement.delay" :min="0" />
        <label>Các điểm tuần tra</label>
        <n-space v-for="(point, index) in movement.path" :key="index" align="center">
          <n-input-number v-model:value="point.x" :min="0" :max="19" placeholder="x" />
          <n-input-number v-model:value="point.y" :min="0" :max="14" placeholder="y" />
          <n-button @click="movement.path.splice(index, 1)" type="error" size="tiny" :disabled="movement.path.length <= 1">Xóa</n-button>
        </n-space>
        <n-button @click="addPatrolPoint" size="small" block>Thêm điểm</n-button>
      </div>
    </n-space>
  </n-card>
</template>