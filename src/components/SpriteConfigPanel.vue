<script setup>
import { NCard, NInputNumber } from 'naive-ui';

const props = defineProps({
  animDirections: Array,
});

const spriteConfig = defineModel('spriteConfig');
const sprites = defineModel('sprites');

const emit = defineEmits(['sprite-uploaded', 'sheet-loaded', 'frame-selected']);

function isFrameSelected(dir, idx) {
  const animMap = sprites.value[dir]?.animMap;
  return animMap && animMap.includes(idx);
}
</script>

<template>
  <n-card title="Cấu hình Sprite" size="small">
    <div style="display:flex;gap:12px;margin-bottom:12px;align-items:center;">
      <label style="font-size:13px;font-weight:500;">Kích thước frame:</label>
      <n-input-number v-model:value="spriteConfig.frameWidth" :min="1" :max="256" size="small" placeholder="W" />
      <span style="font-size:13px;">x</span>
      <n-input-number v-model:value="spriteConfig.frameHeight" :min="1" :max="256" size="small" placeholder="H" />
    </div>
    <div v-for="dir in animDirections" :key="dir" style="margin-bottom:12px;">
      <div style="font-size:13px;font-weight:500;margin-bottom:2px;">{{ dir }}</div>
      <div style="display:flex;align-items:center;gap:6px;">
        <input type="file" accept="image/*" @change="e => emit('sprite-uploaded', dir, e)" style="width:120px;" />
        <div style="display:flex;flex-direction:column;align-items:flex-start;">
          <label v-if="sprites[dir]" style="font-size:11px;color:#888;">Số frame</label>
          <n-input-number v-if="sprites[dir]" v-model:value="sprites[dir].frameCount" :min="1" :max="32" size="small" placeholder="Frames" />
        </div>
      </div>
      <div v-if="sprites[dir]?.url" style="margin:4px 0; max-width: 100%; overflow-x: auto;">
        <img :src="sprites[dir].url" @load="e => emit('sheet-loaded', dir, e)" :style="{
          width: (spriteConfig.frameWidth||64)*(sprites[dir].frameCount||1) + 'px',
          height: (spriteConfig.frameHeight||64) + 'px',
          border: '1px solid #ddd'
        }" />
      </div>
      <div v-if="sprites[dir]?.sheetLoaded" style="max-width: 100%; overflow-x: auto; padding-bottom: 5px;">
        <div style="display:flex;gap:2px;">
          <div v-for="idx in sprites[dir].frameCount" :key="idx" @click="emit('frame-selected', dir, idx-1)" :style="{
            minWidth: (spriteConfig.frameWidth||64)+'px', height: (spriteConfig.frameHeight||64)+'px', border: isFrameSelected(dir, idx-1) ? '2px solid #18a058' : '1px solid #bbb', cursor:'pointer', background:'#fff', position:'relative', boxSizing:'border-box', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'
          }">
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(24,160,88,0.12);" v-if="isFrameSelected(dir, idx-1)"></div>
            <img :src="sprites[dir].url" :style="{
              position:'absolute',left:-(idx-1)*(spriteConfig.frameWidth||64)+'px',top:'0',width:(spriteConfig.frameWidth||64)*(sprites[dir].frameCount||1)+'px',height:(spriteConfig.frameHeight||64)+'px',pointerEvents:'none',userSelect:'none'
            }" draggable="false" />
            <span style="position:absolute;bottom:2px;right:4px;font-size:10px;color:#888;background:#fff8;padding:0 2px;border-radius:2px;">{{ idx-1 }}</span>
          </div>
        </div>
      </div>
    </div>
  </n-card>
</template>