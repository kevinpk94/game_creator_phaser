<script setup>
import { computed } from 'vue';
import { NCard, NButton, NSpace } from 'naive-ui';

const props = defineProps({
  characters: Array,
  buttons: Array,
  tilesets: Array,
  editMode: String,
});

const selectedCharacterId = defineModel('selectedCharacterId');
const selectedButtonId = defineModel('selectedButtonId');
const selectedTilesetId = defineModel('selectedTilesetId');
const emit = defineEmits(['add-npc', 'add-button', 'add-tileset']);

</script>

<template>
  <aside class="editor-panel editor-panel-left">
    <n-card title="Đối tượng trong game" size="small" :bordered="false">
      <div class="scene-list">
        <div
          v-for="char in characters.filter(c => editMode === 'player' ? c.type === 'player' : (editMode === 'npc' ? c.type === 'npc' : false))"
          :key="char.id"
          class="scene-item"
          :class="{ 'scene-item-active': char.id === selectedCharacterId }"
          @click="selectedCharacterId = char.id"
        >
          <span>{{ char.name }} ({{ char.type }})</span>
        </div>
        <div
          v-if="editMode === 'button'"
          v-for="btn in buttons"
          :key="btn.id"
          class="scene-item"
          :class="{ 'scene-item-active': btn.id === selectedButtonId }"
          @click="selectedButtonId = btn.id"
        >
          <span>{{ btn.name }} (Button)</span>
        </div>
        <div
          v-if="editMode === 'tile'"
          v-for="ts in tilesets"
          :key="ts.id"
          class="scene-item"
          :class="{ 'scene-item-active': ts.id === selectedTilesetId }"
          @click="selectedTilesetId = ts.id"
        >
          <span>{{ ts.name }} (Tileset)</span>
        </div>
      </div>
      <template #footer>
        <n-button v-if="editMode === 'npc'" @click="emit('add-npc')" size="small" block>Thêm NPC</n-button>
        <n-button v-if="editMode === 'button'" @click="emit('add-button')" size="small" block>Thêm Nút</n-button>
        <n-button v-if="editMode === 'tile'" @click="emit('add-tileset')" size="small" block>Thêm Tileset</n-button>
      </template>
    </n-card>
  </aside>
</template>

<style scoped>
.editor-panel { width: 320px; background: #fff; flex-shrink: 0; overflow-y: auto; border-right: 1px solid #e0e0e6; }
.scene-list { display: flex; flex-direction: column; gap: 4px; }
.scene-item { padding: 8px 12px; border-radius: 4px; cursor: pointer; border: 1px solid transparent; }
.scene-item:hover { background-color: #f3f3f5; }
.scene-item-active { background-color: #e0e8f3; border-color: #a3c2e8; }
</style>