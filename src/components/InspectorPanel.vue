<script setup>
import { ref, computed, watch } from 'vue';
import { NCard, NSpace, NInput, NButton, NInputNumber, NSwitch, NCollapse, NCollapseItem } from 'naive-ui';
import NpcMovementPanel from './NpcMovementPanel.vue';
import SpriteConfigPanel from './SpriteConfigPanel.vue';
import ButtonActionConfig from './ButtonActionConfig.vue';

const props = defineProps({
    selectedCharacter: Object,
    selectedButton: Object,
    selectedTileset: Object,
    animDirections: Array,
    selectedTileIndex: Number,
});

const emit = defineEmits(['remove-item', 'sprite-uploaded', 'sheet-loaded', 'frame-selected', 'tileset-image-uploaded', 'tile-selected']);

const tilesetImage = ref(null);
const tiles = ref([]);

const gridStyle = computed(() => {
    if (!tilesetImage.value) return {};
    return {
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${tilesetImage.value.naturalWidth}px`,
        height: `${tilesetImage.value.naturalHeight}px`,
    };
});

function generateTilesGrid() {
    if (!tilesetImage.value || !props.selectedTileset) return;

    const { tileWidth, tileHeight } = props.selectedTileset;
    const { naturalWidth, naturalHeight } = tilesetImage.value;
    const cols = Math.floor(naturalWidth / tileWidth);
    const rows = Math.floor(naturalHeight / tileHeight);
    const newTiles = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            newTiles.push({ id: r * cols + c, x: c * tileWidth, y: r * tileHeight });
        }
    }
    tiles.value = newTiles;
}

watch(() => props.selectedTileset?.imageUrl, generateTilesGrid);

// Đảm bảo grid được vẽ lại khi chọn một tileset khác đã có ảnh
watch(() => props.selectedTileset, (newTileset) => {
    if (newTileset && newTileset.imageUrl && tilesetImage.value) {
        generateTilesGrid();
    }
}, { flush: 'post' }); // Sử dụng flush: 'post' để đảm bảo DOM đã được cập nhật
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
        <n-card title="Hành động" size="small" v-if="selectedButton.actions">
          <n-collapse>
            <n-collapse-item title="Khi Nhấn (On Down)">
              <ButtonActionConfig v-model="selectedButton.actions.onDown" />
            </n-collapse-item>
            <n-collapse-item title="Khi Giữ (On Hold)">
              <ButtonActionConfig v-model="selectedButton.actions.onHold" />
            </n-collapse-item>
            <n-collapse-item title="Khi Thả (On Up)">
              <ButtonActionConfig v-model="selectedButton.actions.onUp" />
            </n-collapse-item>
          </n-collapse>
        </n-card>
      </n-space>
    </n-card>

    <n-card v-if="selectedTileset" title="Chi tiết Tileset" size="small" :bordered="false" class="inspector-card">
       <n-space vertical>
        <label>Tên</label>
        <n-input v-model:value="selectedTileset.name" placeholder="Tên tileset" />
        <label>Kích thước Tile (Rộng x Cao)</label>
        <n-space>
          <n-input-number v-model:value="selectedTileset.tileWidth" />
          <n-input-number v-model:value="selectedTileset.tileHeight" />
        </n-space>
        <label>Ảnh</label>
        <input type="file" accept="image/*" @change="e => emit('tileset-image-uploaded', e)" />
        <div v-if="selectedTileset.imageUrl" class="tileset-preview-container">
            <img 
                ref="tilesetImage"
                :src="selectedTileset.imageUrl" 
                @load="generateTilesGrid"
                style="max-width: 100%; border: 1px solid #ddd; image-rendering: pixelated;" 
            />
            <div class="tileset-grid" :style="gridStyle">
                <div 
                    v-for="tile in tiles" 
                    :key="tile.id" 
                    class="tile-selector"
                    :class="{ 'selected': tile.id === selectedTileIndex }"
                    :style="{ left: tile.x + 'px', top: tile.y + 'px', width: selectedTileset.tileWidth + 'px', height: selectedTileset.tileHeight + 'px' }"
                    @click="emit('tile-selected', tile.id)"
                >
                  <!-- Thêm một lớp để đảm bảo viền chọn luôn hiển thị rõ -->
                  <div class="tile-selector-overlay"></div>
                </div>
            </div>
        </div>
        <n-button
          v-if="selectedTileset.id !== 'default_tileset'"
          @click="emit('remove-item', selectedTileset)"
          type="error"
          size="small"
          block
        >
          Xóa Tileset
        </n-button>
      </n-space>
    </n-card>
  </aside>
</template>

<style scoped>
.editor-panel { width: 320px; background: #fff; flex-shrink: 0; overflow-y: auto; border-left: 1px solid #e0e0e6; }
.inspector-card .n-card__content { display: flex; flex-direction: column; gap: 16px; }
.tileset-preview-container {
    position: relative;
    max-width: 100%;
    overflow: auto;
    background-color: #eee;
}
.tile-selector {
    position: absolute;
    box-sizing: border-box;
    border: 1px solid rgba(0, 0, 0, 0.2);
    cursor: pointer;
}
.tile-selector:hover { background-color: rgba(255, 255, 0, 0.3); }
.tile-selector.selected { border: 2px solid #ff0000; }
.tile-selector.selected .tile-selector-overlay {
    /* Lớp phủ này đảm bảo viền không bị che khuất bởi các tile khác */
    position: absolute;
    top: -2px; left: -2px; right: -2px; bottom: -2px;
    border: 2px solid #ff0000;
}
</style>