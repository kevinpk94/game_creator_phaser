// src/phaserGame.js
import Phaser from 'phaser';

let cursors;
let grid = [];
const TILE_SIZE = 40;
const GRID_COLS = 20;
const GRID_ROWS = 15;
let gridGraphics;
let obstacleGraphics;
let editMode = 'obstacle'; // 'obstacle', 'player', 'npc'
let moveCooldown = 0;

let characters = []; // { id, type, sprite, gridPos, movement, ... }
let mainPlayer = null;
let sceneInstance = null; // Để truy cập scene từ bên ngoài

// Vẽ grid nền
function drawGrid(graphics) {
    graphics.clear();
    graphics.lineStyle(1, 0x444444, 1);
    for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
            graphics.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

// Vẽ chướng ngại vật
function drawObstacles(graphics) {
    graphics.clear();
    for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
            if (grid[y][x] === 1) {
                graphics.fillStyle(0xff3333, 1);
                graphics.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            }
        }
    }
}

// --- LOGIC TẠO VÀ CẬP NHẬT NHÂN VẬT ---

function createCharacterAnims(scene, charConfig) {
    const { id, spriteConfig } = charConfig;
    const { sprites } = spriteConfig;
    for (const dir in sprites) {
        const key = `${id}_${dir}`;
        if (scene.textures.exists(key) && scene.textures.get(key).frameTotal > 1) {
            const animKey = `${id}_anim_${dir}`;
            if (!scene.anims.exists(animKey)) {
                scene.anims.create({
                    key: animKey,
                    frames: scene.anims.generateFrameNumbers(key, { start: 0, end: -1 }),
                    frameRate: 8,
                    repeat: -1
                });
            }
        }
    }
}

function createCharacterSprite(scene, charConfig) {
    const { id, type, spriteConfig, movement } = charConfig;
    const { sprites } = spriteConfig;

    const gridPos = { x: 0, y: 0 };
    let characterSprite;

    const hasLoadedSprites = Object.keys(sprites).some(dir => sprites[dir].url && scene.textures.exists(`${id}_${dir}`));

    if (hasLoadedSprites) {
        let mainDir = 'idle';
        if (!scene.textures.exists(`${id}_idle`) && scene.textures.exists(`${id}_down`)) mainDir = 'down';
        const playerKey = `${id}_${mainDir}`;

        characterSprite = scene.add.sprite(
            gridPos.x * TILE_SIZE + TILE_SIZE / 2,
            gridPos.y * TILE_SIZE + TILE_SIZE / 2,
            playerKey
        );

        createCharacterAnims(scene, charConfig);
        characterSprite.play(`${id}_anim_${mainDir}`);
    } else {
        // Placeholder graphics
        characterSprite = scene.add.graphics();
        const color = type === 'player' ? 0x00aaff : 0x00ffaa;
        characterSprite.fillStyle(color, 1);
        characterSprite.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        characterSprite.x = gridPos.x * TILE_SIZE + TILE_SIZE / 2;
        characterSprite.y = gridPos.y * TILE_SIZE + TILE_SIZE / 2;
    }

    if (characterSprite.setDisplaySize) {
        characterSprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
    }

    const char = {
        id,
        type,
        sprite: characterSprite,
        gridPos,
        movement,
        moveTimer: 0,
                lastDir: 'idle', // Hướng di chuyển cuối cùng
                patrolWaitTimer: 0, // Thời gian chờ tại điểm tuần tra
                patrolIndex: 0, // Vị trí điểm tuần tra hiện tại
        config: charConfig // Lưu lại config gốc
    };

    if (type === 'player') {
        mainPlayer = char;
    }

    return char;
}


// Hàm khởi tạo game, export đúng chuẩn
export function createPhaserGame(parentId = 'game-container', characterConfigs = []) {
    async function preload() {
        // Load sprite sheets for all characters
        for (const charConfig of characterConfigs) {
            const { id, spriteConfig } = charConfig;
            const { frameWidth, frameHeight, sprites } = spriteConfig;

            for (const dir in sprites) {
                const spriteInfo = sprites[dir];
                if (spriteInfo.url) {
                    const key = `${id}_${dir}`;
                    if (!this.textures.exists(key)) {
                        this.load.spritesheet(key, spriteInfo.url, { frameWidth, frameHeight });
                    }
                }
            }
        }
    }

    function create() {
        sceneInstance = this;
        console.log('Game created');
        // Khởi tạo grid dữ liệu (0: tile trống, 1: chướng ngại vật)
        grid = [];
        for (let y = 0; y < GRID_ROWS; y++) {
            let row = [];
            for (let x = 0; x < GRID_COLS; x++) {
                row.push(0);
            }
            grid.push(row);
        }

        // Vẽ grid nền
        gridGraphics = this.add.graphics();
        drawGrid(gridGraphics);

        // Vẽ chướng ngại vật
        obstacleGraphics = this.add.graphics();
        drawObstacles(obstacleGraphics);

        // Create characters
        characters = [];
        mainPlayer = null;
        for (const charConfig of characterConfigs) {
            characters.push(createCharacterSprite(this, charConfig));
        }

        // Khởi tạo phím điều khiển
        cursors = this.input.keyboard.createCursorKeys();
        moveCooldown = 0;

        // Xử lý click để thêm/xóa chướng ngại vật
        this.input.on('pointerdown', pointer => {
            const x = Math.floor(pointer.x / TILE_SIZE);
            const y = Math.floor(pointer.y / TILE_SIZE);

            if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;

            // Check if clicking on any character
            const isCharCell = characters.some(c => c.gridPos.x === x && c.gridPos.y === y);

            if (editMode === 'player' && mainPlayer && !isCharCell) {
                mainPlayer.gridPos.x = x;
                mainPlayer.gridPos.y = y;
                mainPlayer.sprite.x = x * TILE_SIZE + TILE_SIZE / 2;
                mainPlayer.sprite.y = y * TILE_SIZE + TILE_SIZE / 2;
            } else if (editMode === 'npc' && !isCharCell) {
                // Find first available NPC to place
                const npcToPlace = characters.find(c => c.type === 'npc' && c.gridPos.x === 0 && c.gridPos.y === 0);
                if (npcToPlace) {
                    npcToPlace.gridPos.x = x;
                    npcToPlace.gridPos.y = y;
                    npcToPlace.sprite.x = x * TILE_SIZE + TILE_SIZE / 2;
                    npcToPlace.sprite.y = y * TILE_SIZE + TILE_SIZE / 2;
                }
            } else if (editMode === 'obstacle' && !isCharCell) {
                grid[y][x] = grid[y][x] === 1 ? 0 : 1;
                drawObstacles(obstacleGraphics);
            }
        });
    }

    let lastDir = 'idle';
    function update(time, delta) {
        if (!cursors) return;

        // Update main player
        if (mainPlayer) {
            updatePlayer(delta);
        }

        // Update NPCs
        characters.forEach(char => {
            if (char.type === 'npc') {
                updateNpc(char, delta);
            }
        });
    }

    function updatePlayer(delta) {
        let dir = 'idle';
        if (cursors.left.isDown) dir = 'left';
        else if (cursors.right.isDown) dir = 'right';
        else if (cursors.up.isDown) dir = 'up';
        else if (cursors.down.isDown) dir = 'down';

        let moved = false;
        if (moveCooldown <= 0 && dir !== 'idle') {
            const { x, y } = mainPlayer.gridPos;
            let newX = x, newY = y;

            if (dir === 'left' && x > 0) newX--;
            else if (dir === 'right' && x < GRID_COLS - 1) newX++;
            else if (dir === 'up' && y > 0) newY--;
            else if (dir === 'down' && y < GRID_ROWS - 1) newY++;

            if ((newX !== x || newY !== y) && grid[newY][newX] !== 1) {
                mainPlayer.gridPos.x = newX;
                mainPlayer.gridPos.y = newY;
                mainPlayer.sprite.x = newX * TILE_SIZE + TILE_SIZE / 2;
                mainPlayer.sprite.y = newY * TILE_SIZE + TILE_SIZE / 2;
                moved = true;
                moveCooldown = 200;
            }
        }

        if (moveCooldown > 0) {
            moveCooldown -= delta;
        }

        const animKey = `${mainPlayer.id}_anim_${dir}`;
        if (mainPlayer.sprite.anims && (dir !== mainPlayer.lastDir || moved)) {
            if (mainPlayer.sprite.anims.animationManager.exists(animKey)) {
                mainPlayer.sprite.play(animKey, true);
            }
            mainPlayer.lastDir = dir;
        }
    }

    function playNpcAnim(npc, dir) {
        if (npc.lastDir === dir) return;
        const animKey = `${npc.id}_anim_${dir}`;
        if (npc.sprite.anims?.animationManager.exists(animKey)) {
            npc.sprite.play(animKey, true);
        } else {
            const idleAnimKey = `${npc.id}_anim_idle`;
            if (npc.sprite.anims?.animationManager.exists(idleAnimKey)) {
                npc.sprite.play(idleAnimKey, true);
            }
        }
        npc.lastDir = dir;
    }

    function updateNpc(npc, delta) {
        if (npc.moveTimer > 0) {
            npc.moveTimer -= delta;
            return;
        }

        if (npc.movement.type === 'random') {
            npc.moveTimer = npc.movement.delay || 2000;
            const { x1, y1, x2, y2 } = npc.movement.range;
            const newX = Phaser.Math.Between(x1, x2);
            const newY = Phaser.Math.Between(y1, y2);

            if (grid[newY][newX] !== 1) {
                npc.gridPos.x = newX;
                npc.gridPos.y = newY;
                npc.sprite.x = newX * TILE_SIZE + TILE_SIZE / 2;
                npc.sprite.y = newY * TILE_SIZE + TILE_SIZE / 2;
            }
            playNpcAnim(npc, 'idle');
        } else if (npc.movement.type === 'patrol') {
            if (npc.patrolWaitTimer > 0) {
                npc.patrolWaitTimer -= delta;
                playNpcAnim(npc, 'idle');
                return;
            }

            npc.moveTimer = npc.movement.speed || 200;

            const path = npc.movement.path;
            if (!path || path.length === 0) return;

            // Đảm bảo patrolIndex hợp lệ
            if (npc.patrolIndex >= path.length) {
                npc.patrolIndex = 0;
            }

            const target = path[npc.patrolIndex];
            const { x, y } = npc.gridPos;
            let dir = 'idle';

            // Nếu đã đến đích, chuyển sang điểm tiếp theo
            if (x === target.x && y === target.y) {
                npc.patrolWaitTimer = npc.movement.delay || 0;
                npc.patrolIndex = (npc.patrolIndex + 1) % path.length;
                playNpcAnim(npc, 'idle');
                return;
            }

            // Di chuyển từng bước về phía đích
            let newX = x, newY = y;
            if (x < target.x) { newX++; dir = 'right'; }
            else if (x > target.x) { newX--; dir = 'left'; }
            else if (y < target.y) { newY++; dir = 'down'; }
            else if (y > target.y) { newY--; dir = 'up'; }

            // Kiểm tra chướng ngại vật
            if (grid[newY] && grid[newY][newX] !== 1) {
                npc.gridPos.x = newX;
                npc.gridPos.y = newY;
                npc.sprite.x = newX * TILE_SIZE + TILE_SIZE / 2;
                npc.sprite.y = newY * TILE_SIZE + TILE_SIZE / 2;
                playNpcAnim(npc, dir);
            } else {
                // Nếu gặp vật cản, chờ và thử lại ở lần cập nhật sau
                // Hoặc có thể thêm logic tìm đường đi khác ở đây
                npc.patrolIndex = (npc.patrolIndex + 1) % path.length; // Bỏ qua điểm này và đến điểm tiếp theo
                playNpcAnim(npc, 'idle');
            }
        }
        // Có thể thêm các loại di chuyển khác ở đây (patrol, v.v.)
    }

    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: parentId,
        backgroundColor: '#222',
        scene: {
            preload,
            create,
            update
        },
    };
    const game = new Phaser.Game(config);

    // Cho phép thay đổi chế độ edit từ bên ngoài
    game.setEditMode = (mode) => {
        editMode = mode;
    };

    // --- CÁC HÀM LIVE UPDATE ---
    game.addCharacter = (charConfig) => {
        if (!sceneInstance || characters.some(c => c.id === charConfig.id)) return;
        
        const loader = new Phaser.Loader.LoaderPlugin(sceneInstance);
        const { id, spriteConfig } = charConfig;
        const { frameWidth, frameHeight, sprites } = spriteConfig;

        for (const dir in sprites) {
            if (sprites[dir].url) {
                loader.spritesheet(`${id}_${dir}`, sprites[dir].url, { frameWidth, frameHeight });
            }
        }

        loader.once('complete', () => {
            const newChar = createCharacterSprite(sceneInstance, charConfig);
            characters.push(newChar);
            loader.destroy();
        });
        loader.start();
    };

    game.removeCharacter = (charId) => {
        const index = characters.findIndex(c => c.id === charId);
        if (index > -1) {
            characters[index].sprite.destroy();
            characters.splice(index, 1);
        }
    };

    game.updateCharacter = (charConfig) => {
        if (!sceneInstance) return;
        const char = characters.find(c => c.id === charConfig.id);
        if (!char) return;

        // Cập nhật các thuộc tính không phải sprite
        char.movement = charConfig.movement;
        char.config = charConfig;

        // Nếu thay đổi loại di chuyển, reset patrolIndex
        if (char.config.movement.type !== charConfig.movement.type) {
            char.patrolIndex = 0;
            char.patrolWaitTimer = 0;
        }

        // Hủy sprite cũ và tạo lại để cập nhật hình ảnh/animation
        const oldSprite = char.sprite;
        const oldGridPos = { ...char.gridPos };
        
        const newChar = createCharacterSprite(sceneInstance, charConfig);
        char.sprite = newChar.sprite;
        char.gridPos = oldGridPos; // Giữ nguyên vị trí
        char.sprite.x = oldGridPos.x * TILE_SIZE + TILE_SIZE / 2;
        char.sprite.y = oldGridPos.y * TILE_SIZE + TILE_SIZE / 2;
        oldSprite.destroy();
    };

    return game;
}
