<script setup>
import { NCard, NSpace, NInput, NButton, NInputNumber } from 'naive-ui';
import NpcMovementPanel from './NpcMovementPanel.vue';
import SpriteConfigPanel from './SpriteConfigPanel.vue';

const props = defineProps({
  selectedCharacter: Object,
  selectedButton: Object,
  selectedObstacleType: Object,
  animDirections: Array,
});

const emit = defineEmits(['remove-item', 'sprite-uploaded', 'sheet-loaded', 'frame-selected', 'obstacle-sprite-uploaded']);

</script>

<template>
  <aside class="editor-panel editor-panel-right">
    <n-card v-if="selectedCharacter" title="Chi tiết đối tượng" size="small" :bordered="false" class="inspector-card">
      <n-space vertical>
        <label>Tên</label>
        <n-input v-model:value="selectedCharacter.name" placeholder="Tên nhân vật" />
        <n-button
          v-if="selectedCharacter.type === 'npc'"
          @click="emit('remove-item', selectedCharacter)"
          type="error"
          size="small"
          block
        >
          Xóa NPC
        </n-button>
      </n-space>

      <NpcMovementPanel v-if="selectedCharacter.type === 'npc'" v-model="selectedCharacter.movement" />

      <SpriteConfigPanel v-model:sprite-config="selectedCharacter.spriteConfig" v-model:sprites="selectedCharacter.spriteConfig.sprites" :anim-directions="animDirections" @sprite-uploaded="(dir, e) => emit('sprite-uploaded', dir, e)" @sheet-loaded="(dir, e) => emit('sheet-loaded', dir, e)" @frame-selected="(dir, idx) => emit('frame-selected', dir, idx)" />
    </n-card>

    <n-card v-if="selectedButton" title="Chi tiết Nút bấm" size="small" :bordered="false" class="inspector-card">
       <n-space vertical>
        <label>Tên Nút</label>
        <n-input v-model:value="selectedButton.name" placeholder="Tên nút bấm" />
        <label>Vị trí X</label>
        <n-input-number v-model:value="selectedButton.x" />
        <label>Vị trí Y</label>
        <n-input-number v-model:value="selectedButton.y" />
        <label>Texture Key (để trống nếu muốn hình chữ nhật)</label>
        <n-input v-model:value="selectedButton.texture" placeholder="Key của ảnh nút" />
        <n-button
          @click="emit('remove-item', selectedButton)"
          type="error"
          size="small"
          block
        >
          Xóa Nút
        </n-button>
      </n-space>
      <n-card title="Hành động" size="small">
        <label>ID Nhân vật mục tiêu</label>
        <n-input v-model:value="selectedButton.action.targetId" placeholder="player" />
        <label>Tên Animation</label>
        <n-input v-model:value="selectedButton.action.animName" placeholder="Tên animation để chơi" />
      </n-card>
    </n-card>

    <n-card v-if="selectedObstacleType" title="Chi tiết Vật cản" size="small" :bordered="false" class="inspector-card">
       <n-space vertical>
        <label>Tên</label>
        <n-input v-model:value="selectedObstacleType.name" placeholder="Tên vật cản" />
        <label>Ảnh</label>
        <input type="file" accept="image/*" @change="e => emit('obstacle-sprite-uploaded', e)" />
        <img v-if="selectedObstacleType.spriteUrl" :src="selectedObstacleType.spriteUrl" style="max-width: 100%; border: 1px solid #ddd;" />
        <label>Là vật cản cứng?</label>
        <n-switch v-model:value="selectedObstacleType.isSolid" />
        <n-button
          v-if="selectedObstacleType.id !== 'default_obstacle'"
          @click="emit('remove-item', selectedObstacleType)"
          type="error"
          size="small"
          block
        >
          Xóa Vật cản
        </n-button>
      </n-space>
    </n-card>
  </aside>
</template>

<style scoped>
.editor-panel { width: 320px; background: #fff; flex-shrink: 0; overflow-y: auto; border-left: 1px solid #e0e0e6; }
.inspector-card .n-card__content { display: flex; flex-direction: column; gap: 16px; }
</style>