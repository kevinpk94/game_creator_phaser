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
        this.characters = new Map(); // Use Map to store characters by ID
        this.buttons = new Map(); // Map để lưu các nút bấm tùy chỉnh
        this.tilesets = new Map(); // Map để lưu các tileset
        this.tilemap = null; // Tilemap object
        this.tilemapLayer = null; // Tilemap layer
        this.mainPlayer = null;
        this.editMode = 'tile';
        this.selectedButtonSprite = null;
        this.activeTilesetId = null; // ID của tileset đang được chọn
        this.activeTileIndex = 0; // Index cục bộ của tile trong tileset đó
        this.dpad = { up: false, down: false, left: false, right: false };
        this.heldButtons = new Set(); // Set để lưu các nút đang được giữ
    }

    init(data) {
        this.initialConfigs = data.configs || { characters: [], buttons: [], tilesets: [], grid: [] };
        this.initialGrid = this.initialConfigs.grid || [];
    }

    preload() {
        const initialCharacterConfigs = this.initialConfigs.characters || [];
        const initialTilesetConfigs = this.initialConfigs.tilesets || [];

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

        // Load tileset images
        for (const tilesetConfig of initialTilesetConfigs) {
            if (tilesetConfig.imageUrl && !this.textures.exists(tilesetConfig.id)) {
                this.load.image(tilesetConfig.id, tilesetConfig.imageUrl);
            }
        }
    }

    create() {
        this.grid = this.initialGrid.length > 0 ? this.initialGrid : Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(-1));

        this.gridGraphics = this.add.graphics();
        this.drawGrid();

        // Tạo tilemap
        this.tilemap = this.make.tilemap({ data: this.grid, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });

        // Tạo nhân vật và nút bấm từ config ban đầu
        (this.initialConfigs.tilesets || []).forEach(config => this.addTileset(config));
        (this.initialConfigs.characters || []).forEach(config => this.addCharacter(config));
        (this.initialConfigs.buttons || []).forEach(config => this.addButton(config));

        // Vẽ lại chướng ngại vật ban đầu nếu có
        this.createDPad();

        this.createTilemapLayer();

        this.input.on('pointerdown', this.handlePointerDown, this);
    }

    update(time, delta) {
        this.characters.forEach(char => {
            char.update(delta);
        });

        // Cập nhật di chuyển của người chơi dựa trên D-pad
        Object.keys(this.dpad).forEach(dir => {
            if (this.dpad[dir] && this.mainPlayer) this.mainPlayer.moveInDirection(dir);
        });

        // Xử lý hành động "onHold" cho các nút đang được giữ
        this.heldButtons.forEach(buttonId => {
            const button = this.buttons.get(buttonId);
            if (button && button.config.actions.onHold.type !== 'none') {
                this.executeAction(button.config.actions.onHold);
            }
        });
    }

    executeAction(action) {
        const target = this.characters.get(action.targetId || 'player');
        if (!target) return;

        if (action.type === 'play_anim' && target.playOneShotAnimation) {
            target.playOneShotAnimation(action.animName);
        } else if (action.type === 'move' && target.moveInDirection) {
            target.moveInDirection(action.direction);
        }
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
        } else if (this.editMode === 'tile' && !isCharCell && this.tilemapLayer && this.activeTilesetId) {
            const currentTile = this.tilemapLayer.getTileAt(x, y);
            
            // Tìm tileset tương ứng trong tilemap của Phaser
            const phaserTileset = this.tilemap.getTileset(this.activeTilesetId);
            if (!phaserTileset) {
                console.warn(`Tileset with id "${this.activeTilesetId}" not found in tilemap.`);
                return;
            }

            // Tính toán Global ID (GID) của tile cần đặt
            // GID = firstgid của tileset + index cục bộ của tile
            const tileIndexToPlace = phaserTileset.firstgid + this.activeTileIndex;

            // Đặt tile mới, nếu ô đã có tile đó thì xóa đi (đặt lại là -1 hoặc tile trống)
            this.tilemapLayer.putTileAt(currentTile && currentTile.index === tileIndexToPlace ? -1 : tileIndexToPlace, x, y);
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

    createTilemapLayer() {
        if (this.tilemapLayer) {
            this.tilemapLayer.destroy();
        }

        // Lấy tất cả các tileset đã được tải texture
        const loadedTilesets = [];
        this.tilesets.forEach(config => {
            if (config.imageUrl && this.textures.exists(config.id)) {
                const tileset = this.tilemap.addTilesetImage(config.id, config.id, config.tileWidth, config.tileHeight);
                if (tileset) {
                    loadedTilesets.push(tileset);
                }
            }
        });

        // Nếu không có tileset nào được tải, không làm gì cả
        if (loadedTilesets.length === 0) return;

        // Tạo layer với tất cả các tileset đã tải
        this.tilemapLayer = this.tilemap.createLayer(0, loadedTilesets, 0, 0);
    }

    createDPad() {
        const dpadSize = 40;
        const dpadMargin = 20; // Tăng khoảng cách lề
        const dpadContainerX = dpadMargin + dpadSize * 1.5; // Dịch sang phải
        const dpadContainerY = this.scale.height - dpadMargin - dpadSize * 2.5; // Dịch lên trên
        const dpadAlpha = 0.5;

        const directions = {
            up: { x: dpadContainerX, y: dpadContainerY },
            down: { x: dpadContainerX, y: dpadContainerY + dpadSize * 2 },
            left: { x: dpadContainerX - dpadSize, y: dpadContainerY + dpadSize },
            right: { x: dpadContainerX + dpadSize, y: dpadContainerY + dpadSize }
        };

        for (const dir in directions) {
            const pos = directions[dir];
            const button = this.add.rectangle(pos.x, pos.y, dpadSize, dpadSize, 0xcccccc, dpadAlpha)
                .setInteractive()
                .setScrollFactor(0);

            // Thêm icon mũi tên
            let arrow;
            if (dir === 'up') arrow = '▲';
            else if (dir === 'down') arrow = '▼';
            else if (dir === 'left') arrow = '◄';
            else if (dir === 'right') arrow = '►';

            this.add.text(pos.x, pos.y, arrow, { fontSize: '24px', color: '#111' })
                .setOrigin(0.5)
                .setScrollFactor(0);

            button.on('pointerdown', () => {
                if (this.editMode === 'player' || this.editMode === 'npc' || this.editMode === 'tile') return;
                this.dpad[dir] = true;
            });
            button.on('pointerup', () => {
                this.dpad[dir] = false;
            });
            button.on('pointerout', () => {
                if (this.dpad[dir]) {
                    this.dpad[dir] = false;
                }
            });
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

        const { id, x, y, texture, actions } = buttonConfig;
        const buttonSize = 50;
        const buttonAlpha = 0.7;

        let button;
        if (texture && this.textures.exists(texture)) {
            button = this.add.image(x, y, texture).setInteractive({ useHandCursor: true });
        } else {
            button = this.add.circle(x, y, buttonSize / 2, 0xcccccc, buttonAlpha).setInteractive({ useHandCursor: true });
        }

        button.config = buttonConfig; // Lưu config vào sprite để dễ truy cập
        this.input.setDraggable(button);
        button.setScrollFactor(0);

        button.on('pointerdown', () => {
            if (this.editMode === 'button') {
                this.game.events.emit('buttonSelected', id);
            } else if (actions.onDown.type !== 'none') {
                this.executeAction(actions.onDown);
                this.heldButtons.add(id); // Thêm vào danh sách nút đang giữ
            } else {
                // Thực hiện hành động của nút khi không ở chế độ edit
                const target = this.characters.get(action.targetId);
                if (target && target.playOneShotAnimation) {
                    target.playOneShotAnimation(action.animName);
                }
            }
        });

        button.on('pointerup', () => {
            this.heldButtons.delete(id); // Xóa khỏi danh sách nút đang giữ
            if (this.editMode !== 'button' && actions.onUp.type !== 'none') {
                this.executeAction(actions.onUp);
            }
        });
        // Nếu con trỏ rời khỏi nút, cũng coi như là 'pointerup'
        button.on('pointerout', () => this.heldButtons.delete(id));

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

    selectButton(buttonId) {
        // Bỏ highlight nút cũ
        if (this.selectedButtonSprite) {
            this.selectedButtonSprite.setStrokeStyle(); // Xóa stroke
        }

        const button = this.buttons.get(buttonId);
        if (button) {
            // Highlight nút mới
            button.setStrokeStyle(4, 0xef4444, 1); // Thêm viền màu đỏ
            this.selectedButtonSprite = button;
        }
    }

    addTileset(tilesetConfig) {
        this.tilesets.set(tilesetConfig.id, tilesetConfig);
        if (tilesetConfig.imageUrl && !this.textures.exists(tilesetConfig.id)) {
            this.load.image(tilesetConfig.id, tilesetConfig.imageUrl);
            this.load.once('complete', () => this.createTilemapLayer());
            this.load.start();
        } else {
            this.createTilemapLayer();
        }
    }

    updateTileset(tilesetConfig) {
        // Cập nhật thông tin trong map
        this.tilesets.set(tilesetConfig.id, tilesetConfig);

        // Nếu có sprite mới và chưa được tải, thì tải nó
        if (tilesetConfig.imageUrl && !this.textures.exists(tilesetConfig.id)) {
            this.load.image(tilesetConfig.id, tilesetConfig.imageUrl);
            this.load.once('complete', () => this.createTilemapLayer());
            this.load.start();
        } else {
            // Nếu không có sprite mới hoặc sprite đã tồn tại, chỉ cần vẽ lại
            this.createTilemapLayer();
        }
    }

    removeTileset(tilesetId) {
        this.tilesets.delete(tilesetId);
        // TODO: Xóa các tile của tileset này khỏi grid
        this.createTilemapLayer();
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
        // Khi chuyển khỏi chế độ 'button', bỏ chọn nút
        if (mode !== 'button' && this.selectedButtonSprite) {
            this.selectedButtonSprite.setStrokeStyle();
            this.selectedButtonSprite = null;
        }
    }

    setActiveTile(tilesetId, tileIndex) {
        this.activeTilesetId = tilesetId;
        this.activeTileIndex = tileIndex;
    }
}