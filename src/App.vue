

<script setup>
import { ref, computed, onMounted } from 'vue';
import { createPhaserGame } from './phaserGame';
import { NInputNumber, NButton, NCard } from 'naive-ui';

let gameContainer = ref(null);
let gameInstance = null;
const animDirections = ['idle', 'down', 'left', 'right', 'up'];
// Sprite config cho từng hướng
const spriteImages = ref({}); // { idle: url, down: url, ... }
const frameWidth = ref(64); // dùng chung cho tất cả hướng
const frameHeight = ref(64);
const animMap = ref({}); // { idle: [0,1], ... }
const sheetLoaded = ref({}); // { idle: true, ... }
const frameCounts = ref({}); // { idle: 4, ... }

function onSpriteUpload(dir, e) {
  const file = e.target.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    spriteImages.value[dir] = url;
    sheetLoaded.value[dir] = false;
    // Nếu là hướng idle thì đổi luôn sprite cho game demo
    if (dir === 'idle' && gameInstance && gameInstance.changePlayerSprite) {
      gameInstance.changePlayerSprite(url);
    }
  }
}

function onSheetLoad(dir, e) {
  const img = e.target;
  const fw = frameWidths.value[dir] || 64;
  frameCounts.value[dir] = Math.floor(img.naturalWidth / fw);
  sheetLoaded.value[dir] = true;
}

function selectFrame(dir, idx) {
  if (!animMap.value[dir]) animMap.value[dir] = [];
  const arr = animMap.value[dir];
  const i = arr.indexOf(idx);
  if (i === -1) arr.push(idx); else arr.splice(i, 1);
  animMap.value[dir] = [...arr];
}

function isFrameSelected(dir, idx) {
  return animMap.value[dir] && animMap.value[dir].includes(idx);
}

function startGame() {
  if (gameInstance && gameInstance.destroy) gameInstance.destroy(true);
  // Chuẩn bị config chung
  const spriteConfig = {
    frameWidth: frameWidth.value || 64,
    frameHeight: frameHeight.value || 64
  };
  for (const dir of animDirections) {
    spriteConfig[dir] = {
      url: spriteImages.value[dir],
      animFrames: animMap.value[dir] || [0]
    };
  }
  gameInstance = createPhaserGame('game-container', spriteImages, undefined, spriteConfig);
}

onMounted(() => {
  startGame();
});
</script>


<template>
  <div style="display: flex; flex-direction: row; align-items: flex-start; gap: 0;">
    <div style="flex: 1;">
      <div ref="gameContainer" id="game-container" style="width: 800px; height: 600px; border: 1px solid #ccc;"></div>
      <p>Chào mừng bạn đến với công cụ tạo game 2D. Các tính năng sẽ được bổ sung tiếp theo.</p>
    </div>
  <div style="width: 50vw; min-width: 320px; background: #f8f8fa; border-left: 1px solid #eee; height: 600px; box-sizing: border-box; padding: 16px 16px; display: flex; flex-direction: column; align-items: stretch; overflow-y: auto;">
      <n-card title="Sprite từng hướng" size="small" style="box-shadow:none; margin-bottom: 8px;">
        <div style="display:flex;gap:12px;margin-bottom:12px;align-items:center;">
          <label style="font-size:13px;font-weight:500;">Kích thước frame (dùng chung):</label>
          <n-input-number v-model:value="frameWidth" :min="1" :max="256" size="small" placeholder="W" show-button="always" />
          <span style="font-size:13px;">x</span>
          <n-input-number v-model:value="frameHeight" :min="1" :max="256" size="small" placeholder="H" show-button="always" />
        </div>
        <div v-for="dir in animDirections" :key="dir" style="margin-bottom:12px;">
          <div style="font-size:13px;font-weight:500;margin-bottom:2px;">{{ dir }}</div>
          <div style="display:flex;align-items:center;gap:6px;">
            <input type="file" accept="image/*" @change="e=>onSpriteUpload(dir,e)" style="width:120px;" />
            <div style="display:flex;flex-direction:column;align-items:flex-start;">
              <label style="font-size:11px;color:#888;">Số frame</label>
              <n-input-number v-model:value="frameCounts[dir]" :min="1" :max="32" size="small" placeholder="Frames"  show-button="always" />
            </div>
          </div>
          <div v-if="dir==='down'" style="font-size:11px;color:#888;margin-bottom:2px;">Nhập đúng số frame và kích thước từng frame theo ảnh upload. VD: 6 frame, W=32, H=48</div>
          <div v-if="spriteImages[dir]" style="margin:4px 0;">
            <img :src="spriteImages[dir]" :width="(frameWidth||64)*(frameCounts[dir]||1)" :height="frameHeight||64" style="max-width:100%;border:1px solid #ddd;" />
          </div>
          <div v-if="sheetLoaded[dir]">
            <div style="display:flex;gap:2px;">
              <div v-for="idx in frameCounts[dir]" :key="idx" @click="selectFrame(dir, idx-1)" :style="{
                width: (frameWidth||64)+'px', height: (frameHeight||64)+'px', border: isFrameSelected(dir, idx-1) ? '2px solid #18a058' : '1px solid #bbb', cursor:'pointer', background:'#fff', position:'relative', boxSizing:'border-box', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'
              }">
                <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(24,160,88,0.12);" v-if="isFrameSelected(dir, idx-1)"></div>
                <img :src="spriteImages[dir]" :style="{
                  position:'absolute',left:-(idx-1)*(frameWidth||64)+'px',top:'0',width:(frameWidth||64)*(frameCounts[dir]||1)+'px',height:(frameHeight||64)+'px',pointerEvents:'none',userSelect:'none'
                }" draggable="false" />
                <span style="position:absolute;bottom:2px;right:4px;font-size:10px;color:#888;background:#fff8;padding:0 2px;border-radius:2px;">{{ idx-1 }}</span>
              </div>
            </div>
          </div>
        </div>
        <n-button type="primary" size="small" block @click="startGame">Khởi động lại</n-button>
      </n-card>
    </div>
  </div>
// Xử lý JSON animMap nhập từ textarea
const animMapStr = ref(JSON.stringify(animMap.value));
function onAnimMapBlur() {
  try {
    const obj = JSON.parse(animMapStr.value);
    animMap.value = obj;
  } catch {}
}
</template>

<style scoped>
#game-container {
  margin-top: 16px;
  background: #222;
}
</style>
