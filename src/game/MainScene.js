import Phaser from 'phaser';
import Player from './Player';
import NPC from './NPC';

const TILE_SIZE = 40;
const GRID_COLS = 20;
const GRID_ROWS = 15;

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.grid = [];
        this.gridGraphics = null;
        this.obstacleGraphics = null;
        this.characters = new Map(); // Use Map to store characters by ID
        this.buttons = new Map(); // Map để lưu các nút bấm tùy chỉnh
        this.obstacleTypes = new Map(); // Map để lưu các loại chướng ngại vật
        this.obstacleLayer = null; // Layer để chứa các sprite chướng ngại vật
        this.mainPlayer = null;
        this.editMode = 'obstacle';
    }

    init(data) {
        this.initialConfigs = data.configs || { characters: [], buttons: [], obstacles: [], grid: [] };
        this.initialGrid = this.initialConfigs.grid || [];
    }

    preload() {
        const initialCharacterConfigs = this.initialConfigs.characters || [];
        const initialObstacleConfigs = this.initialConfigs.obstacles || [];

        // Load character sprites
        for (const charConfig of initialCharacterConfigs) {
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

        // Load obstacle sprites
        for (const obsConfig of initialObstacleConfigs) {
            if (obsConfig.spriteUrl && !this.textures.exists(obsConfig.id)) {
                this.load.image(obsConfig.id, obsConfig.spriteUrl);
            }
        }
    }

    create() {
        this.grid = this.initialGrid.length > 0 ? this.initialGrid : Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));

        this.gridGraphics = this.add.graphics();
        this.drawGrid();

        this.obstacleLayer = this.add.container(0, 0);

        // Tạo nhân vật và nút bấm từ config ban đầu
        (this.initialConfigs.obstacles || []).forEach(config => this.addObstacleType(config));
        (this.initialConfigs.characters || []).forEach(config => this.addCharacter(config));
        (this.initialConfigs.buttons || []).forEach(config => this.addButton(config));

        // Vẽ lại chướng ngại vật ban đầu nếu có
        this.drawObstacles();

        this.input.on('pointerdown', this.handlePointerDown, this);
    }

    update(time, delta) {
        this.characters.forEach(char => {
            char.update(delta);
        });
    }

    handlePointerDown(pointer) {
        const x = Math.floor(pointer.x / TILE_SIZE);
        const y = Math.floor(pointer.y / TILE_SIZE);

        if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;

        const isCharCell = [...this.characters.values()].some(c => c.gridPos.x === x && c.gridPos.y === y);

        if (this.editMode === 'player' && this.mainPlayer && !isCharCell) {
            this.mainPlayer.setGridPosition(x, y);
        } else if (this.editMode === 'npc' && !isCharCell) {
            // Find first available NPC to place (currently at 0,0)
            const npcToPlace = [...this.characters.values()].find(c => c.isNPC && c.gridPos.x === 0 && c.gridPos.y === 0);
            if (npcToPlace) {
                npcToPlace.setGridPosition(x, y);
            }
        } else if (this.editMode === 'obstacle' && !isCharCell) {
            this.grid[y][x] = this.grid[y][x] === 1 ? 0 : 1;
            // TODO: Thay '1' bằng ID của obstacle được chọn
            const activeObstacleId = 'default_obstacle'; // Tạm thời
            this.grid[y][x] = this.grid[y][x] === activeObstacleId ? 0 : activeObstacleId;
            this.drawObstacles(); // Vẽ lại toàn bộ layer
            // Thông báo cho Vue về sự thay đổi của grid
            this.game.events.emit('gridupdated', this.grid);
        }
    }

    drawGrid() {
        this.gridGraphics.clear();
        this.gridGraphics.lineStyle(1, 0x444444, 1);
        for (let y = 0; y < GRID_ROWS; y++) {
            for (let x = 0; x < GRID_COLS; x++) {
                this.gridGraphics.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    drawObstacles() {
        this.obstacleLayer.removeAll(true); // Xóa tất cả sprite cũ
        for (let y = 0; y < GRID_ROWS; y++) {
            for (let x = 0; x < GRID_COLS; x++) {
                const obstacleId = this.grid[y][x];
                if (obstacleId !== 0 && this.obstacleTypes.has(obstacleId)) {
                    const obsType = this.obstacleTypes.get(obstacleId);
                    if (obsType.spriteUrl && this.textures.exists(obsType.id)) {
                        const sprite = this.add.image(x * TILE_SIZE, y * TILE_SIZE, obsType.id).setOrigin(0, 0);
                        sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
                        this.obstacleLayer.add(sprite);
                    } else {
                        // Fallback to red square if no image
                        const graphics = this.add.graphics();
                        graphics.fillStyle(0xff3333, 1);
                        graphics.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                        this.obstacleLayer.add(graphics);
                    }
                }
            }
        }
    }

    addCharacter(charConfig) {
        if (this.characters.has(charConfig.id)) return;

        let character;
        if (charConfig.type === 'player') {
            character = new Player(this, 0, 0, charConfig);
            this.mainPlayer = character;
        } else {
            character = new NPC(this, 0, 0, charConfig);
        }

        this.add.existing(character); // Add to scene's display list
        this.characters.set(charConfig.id, character);
        return character;
    }

    addButton(buttonConfig) {
        if (this.buttons.has(buttonConfig.id)) return;

        const { id, x, y, texture, action } = buttonConfig;
        const buttonSize = 50;
        const buttonAlpha = 0.7;

        let button;
        if (texture && this.textures.exists(texture)) {
            button = this.add.image(x, y, texture).setInteractive();
        } else {
            button = this.add.circle(x, y, buttonSize / 2, 0xcccccc, buttonAlpha).setInteractive();
        }

        this.input.setDraggable(button);
        button.setScrollFactor(0);

        button.on('pointerdown', () => {
            const target = this.characters.get(action.targetId);
            if (target && target.playOneShotAnimation) {
                target.playOneShotAnimation(action.animName);
            }
        });

        button.on('dragstart', () => {
            if (this.game.events) {
                this.game.events.emit('buttondragstart');
            }
        });

        button.on('drag', (pointer, dragX, dragY) => {
            button.setPosition(dragX, dragY);
        });

        button.on('dragend', () => {
            if (this.game.events) {
                this.game.events.emit('buttondragged', id, Math.round(button.x), Math.round(button.y));
            }
        });

        this.buttons.set(id, button);
    }

    addObstacleType(obstacleConfig) {
        this.obstacleTypes.set(obstacleConfig.id, obstacleConfig);
        if (obstacleConfig.spriteUrl && !this.textures.exists(obstacleConfig.id)) {
            this.load.image(obstacleConfig.id, obstacleConfig.spriteUrl);
            this.load.once('complete', () => this.drawObstacles());
            this.load.start();
        }
    }

    updateObstacleType(obstacleConfig) {
        // Cập nhật thông tin trong map
        this.obstacleTypes.set(obstacleConfig.id, obstacleConfig);

        // Nếu có sprite mới và chưa được tải, thì tải nó
        if (obstacleConfig.spriteUrl && !this.textures.exists(obstacleConfig.id)) {
            this.load.image(obstacleConfig.id, obstacleConfig.spriteUrl);
            this.load.once('complete', () => this.drawObstacles());
            this.load.start();
        } else {
            // Nếu không có sprite mới hoặc sprite đã tồn tại, chỉ cần vẽ lại
            this.drawObstacles();
        }
    }

    removeObstacleType(obstacleId) {
        this.obstacleTypes.delete(obstacleId);
        // Xóa các obstacle tegoại này khỏi grid
        // ... (logic này có thể thêm sau)
        this.drawObstacles();
    }

    getGrid() {
        return this.grid;
    }

    removeButton(buttonId) {
        const button = this.buttons.get(buttonId);
        if (button) {
            button.destroy();
            this.buttons.delete(buttonId);
        }
    }

    removeCharacter(charId) {
        const character = this.characters.get(charId);
        if (character) {
            this.characters.delete(charId);
            character.destroy(); // Remove from scene
        }
    }

    updateCharacter(charConfig) {
        const character = this.characters.get(charConfig.id);
        if (character) {
            character.updateConfig(charConfig);
        }
    }

    setEditMode(mode) {
        this.editMode = mode;
    }
}