<script setup>
import { NCard, NSpace, NSelect, NInput } from 'naive-ui';

const action = defineModel();

const actionTypes = [
  { label: 'Không có', value: 'none' },
  { label: 'Chơi Animation', value: 'play_anim' },
  { label: 'Di chuyển', value: 'move' },
];

const moveDirections = [
  { label: 'Trái', value: 'left' },
  { label: 'Phải', value: 'right' },
  { label: 'Lên', value: 'up' },
  { label: 'Xuống', value: 'down' },
];
</script>

<template>
  <n-space vertical>
    <label>Loại hành động</label>
    <n-select v-model:value="action.type" :options="actionTypes" />
    <div v-if="action.type === 'play_anim'">
      <label>Tên Animation</label>
      <n-input v-model:value="action.animName" placeholder="Tên animation để chơi" />
    </div>
    <div v-if="action.type === 'move'">
      <label>Hướng di chuyển</label>
      <n-select v-model:value="action.direction" :options="moveDirections" />
    </div>
  </n-space>
</template>