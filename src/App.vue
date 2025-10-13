<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { createPhaserGame } from './game/index.js';

import EditorToolbar from './components/EditorToolbar.vue';
import ScenePanel from './components/ScenePanel.vue'; // Sửa lại đường dẫn nếu cần
import InspectorPanel from './components/InspectorPanel.vue';

let gameContainer = ref(null);
let gameInstance = null;
const editMode = ref('obstacle'); // 'obstacle', 'player', 'npc'
const animDirections = ['idle', 'down', 'left', 'right', 'up'];

const characters = ref([
  {
    id: 'player',
    name: 'Nhân vật chính',
    type: 'player',
    spriteConfig: {
      frameWidth: 64,
      frameHeight: 64,
      sprites: {}, // { idle: { url, animMap, frameCount, sheetLoaded }, ... }
    },
    movement: null,
  }
]);

// Quản lý các nút bấm tùy chỉnh
const customButtons = ref([]);
let nextButtonId = 1;

// Quản lý lưới chướng ngại vật
const grid = ref([]);

let isDragging = false; // Cờ để kiểm soát việc cập nhật khi kéo thả
let dragTimeout = null;

// Quản lý các loại chướng ngại vật
const obstacleTypes = ref([
    {
        id: 'default_obstacle',
        name: 'Chướng ngại vật',
        type: 'obstacle',
        isSolid: true,
        spriteUrl: null,
    }
]);
let nextObstacleId = 1;

const selectedCharacterId = ref('player');
const selectedButtonId = ref(null);
const selectedObstacleTypeId = ref(null);
let nextNpcId = 1;

const selectedCharacter = computed(() => {
  // Reset selectedButtonId nếu một character được chọn
  if (selectedCharacterId.value) {
    selectedButtonId.value = null;
    selectedObstacleTypeId.value = null;
  }
  return characters.value.find(c => c.id === selectedCharacterId.value);
})

const selectedButton = computed(() => {
  // Reset selectedCharacterId nếu một button được chọn
  if (selectedButtonId.value) {
    selectedCharacterId.value = null;
    selectedObstacleTypeId.value = null;
  }
  return customButtons.value.find(b => b.id === selectedButtonId.value);
})

const selectedObstacleType = computed(() => {
  // Reset các lựa chọn khác nếu một obstacle type được chọn
  if (selectedObstacleTypeId.value) {
    selectedCharacterId.value = null;
    selectedButtonId.value = null;
  }
  return obstacleTypes.value.find(o => o.id === selectedObstacleTypeId.value);
})

// Computed properties to bind UI to the selected character's config
const spriteConfig = computed(() => selectedCharacter.value.spriteConfig);
const sprites = computed(() => spriteConfig.value.sprites);

function setEditMode(mode) {
  editMode.value = mode;
  if (gameInstance && gameInstance.setEditMode) {
    gameInstance.setEditMode(mode);
  }
}

function addNpc() {
  const newNpc = {
    id: `npc${nextNpcId++}`,
    name: `NPC ${nextNpcId - 1}`,
    type: 'npc',
    spriteConfig: {
      frameWidth: 64,
      frameHeight: 64,
      sprites: {},
    },
    movement: {
      type: 'random',
      range: { x1: 0, y1: 0, x2: 19, y2: 14 },
      delay: 2000,
      speed: 200,
      path: [{x: 1, y: 1}],
    },
  };
  characters.value.push(newNpc);
  selectedCharacterId.value = newNpc.id;
}

function addButton() {
  // Tìm ID lớn nhất hiện có trong mảng customButtons
  const maxId = customButtons.value.reduce((max, button) => {
    // Lấy phần số từ chuỗi ID, ví dụ: 'button12' -> 12
    const currentId = parseInt(button.id.replace('button', ''), 10);
    return currentId > max ? currentId : max;
  }, 0);

  const newId = maxId + 1;

  const newButton = {
    id: `button${newId}`,
    name: `Button ${newId}`,
    type: 'button',
    x: 150,
    y: 150,
    texture: '', // Người dùng sẽ cấu hình
    action: {
      type: 'play_anim',
      targetId: 'player', // Mặc định là player
      animName: 'attack' // Ví dụ, người dùng sẽ cấu hình
    }
  };
  customButtons.value.push(newButton);
  selectedButtonId.value = newButton.id;
}

function addObstacleType() {
    const newObstacleType = {
        id: `obstacle_${nextObstacleId++}`,
        name: `Vật cản ${nextObstacleId - 1}`,
        type: 'obstacle',
        isSolid: true,
        spriteUrl: null,
    };
    obstacleTypes.value.push(newObstacleType);
    selectedObstacleTypeId.value = newObstacleType.id;
}

function removeButton() {
    // Tương tự removeCharacter, sẽ được thêm vào InspectorPanel
    const index = customButtons.value.findIndex(b => b.id === selectedButtonId.value);
    if (index > -1) {
        customButtons.value.splice(index, 1);
        selectedButtonId.value = null;
    }
}

function removeCharacter() {
  const index = characters.value.findIndex(c => c.id === selectedCharacterId.value);
  if (index > -1 && characters.value[index].type === 'npc') {
    characters.value.splice(index, 1);
    selectedCharacterId.value = 'player';
  }
}

function addPatrolPoint() {
  const movement = selectedCharacter.value?.movement;
  if (movement && movement.type === 'patrol') {
    const lastPoint = movement.path[movement.path.length - 1] || {x: 0, y: 0};
    movement.path.push({ ...lastPoint });
  }
}

function onObstacleSpriteUpload(e) {
    if (!selectedObstacleType.value) return;
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            selectedObstacleType.value.spriteUrl = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function onSpriteUpload(dir, e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        if (!sprites.value[dir]) {
          sprites.value[dir] = { url: '', animMap: [], frameCount: 1, sheetLoaded: false };
        }
        sprites.value[dir].url = event.target.result; // Gán chuỗi base64
        sprites.value[dir].sheetLoaded = false;
    };
    reader.readAsDataURL(file);
  }
}

function onSheetLoad(dir, e) {
  const img = e.target;
  const fw = spriteConfig.value.frameWidth || 64;
  const frameCount = Math.floor(img.naturalWidth / fw);
  sprites.value[dir].frameCount = frameCount;
  sprites.value[dir].sheetLoaded = true;
}

function selectFrame(dir, idx) {
  if (!sprites.value[dir].animMap) sprites.value[dir].animMap = [];
  const arr = sprites.value[dir].animMap;
  const i = arr.indexOf(idx);
  if (i === -1) arr.push(idx); else arr.splice(i, 1);
  sprites.value[dir].animMap = [...arr];
}

function isFrameSelected(dir, idx) {
  const animMap = sprites.value[dir]?.animMap;
  return animMap && animMap.includes(idx);
}

function restartGame(importedGrid = null) {
    if (gameInstance && gameInstance.destroy) {
        gameInstance.destroy(true);
        gameInstance = null;
    }
    // Nếu có grid được import, sử dụng nó, nếu không, sử dụng grid hiện tại
    grid.value = importedGrid || grid.value;
    startGame();
}
// --- LOGIC LIVE UPDATE ---
watch(characters, (newChars, oldChars) => {
  if (!gameInstance || !newChars || !oldChars) return;

  // Tìm các nhân vật đã bị xóa
  for (const oldChar of oldChars) {
    if (!newChars.some(newChar => newChar.id === oldChar.id)) {
      gameInstance.removeCharacter(oldChar.id);
    }
  }

  // Tìm các nhân vật mới hoặc đã được cập nhật
  for (const newChar of newChars) {
    const oldChar = oldChars.find(c => c.id === newChar.id);
    if (!oldChar) {
      // Nhân vật mới
      gameInstance.addCharacter(newChar);
    } else {
      // Nhân vật đã được cập nhật
      // Sử dụng JSON.stringify để so sánh sâu một cách đơn giản
      if (JSON.stringify(newChar) !== JSON.stringify(oldChar)) {
        gameInstance.updateCharacter(newChar);
      }
    }
  }
}, { deep: true });

watch(customButtons, (newButtons, oldButtons) => {
    if (!gameInstance || !newButtons || !oldButtons) return;

    for (const oldBtn of oldButtons) {
        if (!newButtons.some(newBtn => newBtn.id === oldBtn.id)) {
            gameInstance.removeButton(oldBtn.id);
        }
    }

    for (const newBtn of newButtons) {
        const oldBtn = oldButtons.find(b => b.id === newBtn.id);
        if (!oldBtn) {
            gameInstance.addButton(newBtn);
        } else {
            if (JSON.stringify(newBtn) !== JSON.stringify(oldBtn)) {
                // Chỉ cập nhật nếu không phải đang kéo thả
                if (!isDragging) {
                    gameInstance.updateButton(newBtn);
                }
            }
        }
    }
}, { deep: true });

watch(obstacleTypes, (newObstacles, oldObstacles) => {
    if (!gameInstance || !newObstacles || !oldObstacles) return;

    for (const oldObs of oldObstacles) {
        if (!newObstacles.some(newObs => newObs.id === oldObs.id)) {
            gameInstance.removeObstacleType(oldObs.id);
        }
    }

    for (const newObs of newObstacles) {
        const oldObs = oldObstacles.find(o => o.id === newObs.id);
        if (!oldObs) {
            gameInstance.addObstacleType(newObs);
        } else {
            if (JSON.stringify(newObs) !== JSON.stringify(oldObs)) {
                gameInstance.updateObstacleType(newObs);
            }
        }
    }
}, { deep: true });

// --- LOCALSTORAGE & STATE MANAGEMENT ---

function debounce(func, timeout = 300){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

const saveState = debounce(() => {
    console.log("Saving state to localStorage...");
    const state = {
        characters: characters.value,
        customButtons: customButtons.value,
        obstacleTypes: obstacleTypes.value,
        grid: grid.value, // Lưu cả grid
    };
    localStorage.setItem('gameCreatorState', JSON.stringify(state));
}, 500);

function loadState() {
    const savedState = localStorage.getItem('gameCreatorState');
    if (savedState) {
        console.log("Loading state from localStorage...");
        const state = JSON.parse(savedState);
        characters.value = state.characters || [];
        customButtons.value = state.customButtons || [];
        obstacleTypes.value = state.obstacleTypes || [];
        grid.value = state.grid || [];
    }
}

// Watch all data sources to trigger save
watch([characters, customButtons, obstacleTypes, grid], saveState, { deep: true });

function startGame() {
  if (!gameInstance) {
    gameInstance = createPhaserGame('game-container', { 
        characters: characters.value, 
        buttons: customButtons.value,
        obstacles: obstacleTypes.value,
        grid: grid.value // Truyền grid đã load hoặc mặc định
    });
    if (gameInstance && gameInstance.setEditMode) {
      gameInstance.setEditMode(editMode.value);
    }
    // Lắng nghe các sự kiện từ Phaser
    if (gameInstance && gameInstance.events) {
      // Kéo thả nút
      gameInstance.events.on('buttondragstart', () => {
        isDragging = true;
        clearTimeout(dragTimeout);
      });
      gameInstance.events.on('buttondragged', (buttonId, x, y) => {
        const button = customButtons.value.find(b => b.id === buttonId);
        if (button) {
          button.x = x;
          button.y = y;
        }
        // Đặt lại cờ sau một khoảng trễ ngắn để cho phép cập nhật cuối cùng
        dragTimeout = setTimeout(() => { isDragging = false; }, 100);
      });
      // Cập nhật grid
      gameInstance.events.on('gridupdated', (newGrid) => {
        grid.value = newGrid;
      });
    }
  }
}

onMounted(() => {
  loadState();
  startGame();
});
</script>

<script>
function handleExport(gameData) {
    // Đảm bảo grid được lấy là grid mới nhất
    gameData.grid = gameInstance?.getGridData() || gameData.grid;
    const jsonString = JSON.stringify(gameData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleImport(event, callback) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            callback(importedData);
        } catch (error) {
            console.error("Error parsing JSON file:", error);
            alert("File JSON không hợp lệ!");
        }
    };
    reader.readAsText(file);
    // Reset input để có thể chọn lại cùng file
    event.target.value = '';
}
</script>


<template>
  <div class="editor-layout">
    <EditorToolbar 
        v-model:edit-mode="editMode" 
        @update:edit-mode="setEditMode" 
        @restart-game="restartGame"
        @export-game="handleExport({ characters, customButtons, obstacleTypes, grid })"
        @import-game="handleImport($event, (data) => {
            characters.value = data.characters || [];
            customButtons.value = data.customButtons || [];
            obstacleTypes.value = data.obstacleTypes || [];
            // Cần truyền grid vào game khi restart
            restartGame(data.grid);
        })"
    />

    <main class="editor-main">
      <ScenePanel 
        :characters="characters" 
        :buttons="customButtons"
        :obstacle-types="obstacleTypes"
        :edit-mode="editMode"
        v-model:selected-character-id="selectedCharacterId" 
        v-model:selected-button-id="selectedButtonId"
        v-model:selected-obstacle-type-id="selectedObstacleTypeId"
        @add-npc="addNpc"
        @add-button="addButton"
        @add-obstacle-type="addObstacleType"
      />

      <section class="editor-viewport">
        <div ref="gameContainer" id="game-container"></div>
      </section>

      <InspectorPanel
        :selected-character="selectedCharacter"
        :selected-button="selectedButton"
        :selected-obstacle-type="selectedObstacleType"
        :anim-directions="animDirections"
        @remove-character="removeCharacter"
        @obstacle-sprite-uploaded="onObstacleSpriteUpload"
        @sprite-uploaded="onSpriteUpload"
        @sheet-loaded="onSheetLoad"
        @frame-selected="selectFrame"
      />
    </main>
  </div>
</template>

<style>
html, body, #app { height: 100%; margin: 0; }
.editor-layout { display: flex; flex-direction: column; height: 100vh; background: #f0f2f5; }
.editor-main { display: flex; flex: 1; overflow: hidden; }
.editor-viewport { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; }
#game-container { width: 800px; height: 600px; background: #222; flex-shrink: 0; }
</style>
