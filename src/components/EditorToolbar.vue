<script setup>
import { NRadioGroup, NRadioButton, NSpace, NButton } from 'naive-ui';

const editMode = defineModel('editMode');
const emit = defineEmits(['export-game', 'import-game', 'restart-game']);

function triggerImport() {
    document.getElementById('import-file-input')?.click();
}
</script>

<template>
  <header class="editor-toolbar">
    <n-space align="center">
      <span>Chế độ:</span>
      <n-radio-group v-model:value="editMode" name="edit-mode" size="small">
        <n-radio-button value="obstacle">Chướng ngại vật</n-radio-button>
        <n-radio-button value="player">Đặt NV chính</n-radio-button>
        <n-radio-button value="npc">Đặt NPC</n-radio-button>
        <n-radio-button value="button">Nút bấm</n-radio-button>
      </n-radio-group>
    </n-space>
    <n-space>
        <n-button size="small" @click="emit('export-game')">Export JSON</n-button>
        <n-button size="small" @click="triggerImport">Import JSON</n-button>
        <input type="file" id="import-file-input" style="display: none" @change="e => emit('import-game', e)" accept=".json" />
        <n-button type="primary" size="small" @click="emit('restart-game')">
          Khởi động lại Game
        </n-button>
    </n-space>
  </header>
</template>

<style scoped>
.editor-toolbar {
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
</style>