import Phaser from 'phaser';

const TILE_SIZE = 40;
const GRID_COLS = 20; // Assuming these are still needed for boundary checks
const GRID_ROWS = 15;

export default class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, config) {
        // If no sprite is loaded, use a placeholder graphic
        const hasLoadedSprites = Object.keys(config.spriteConfig.sprites).some(dir => config.spriteConfig.sprites[dir].url && scene.textures.exists(`${config.id}_${dir}`));
        const textureKey = hasLoadedSprites ? `${config.id}_idle` : '__DEFAULT'; // Use a default key for placeholder

        super(scene, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, textureKey);

        this.id = config.id;
        this.config = config;
        this.gridPos = { x, y };
        this.isPlayer = true;
        this.isNPC = false;
        this.moveCooldown = 0;
        this.lastDir = 'idle';
        this.isPlayingOneShot = false; // Cờ để kiểm tra animation one-shot

        // If no sprite, draw a placeholder
        if (!hasLoadedSprites) {
            this.setTexture('__DEFAULT'); // Set a dummy texture to avoid Phaser warnings
            const graphics = scene.add.graphics();
            graphics.fillStyle(0x00aaff, 1); // Blue color for player
            graphics.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
            this.setTexture(graphics.generateTexture('__DEFAULT', TILE_SIZE, TILE_SIZE));
            graphics.destroy();
        }

        this.createAnims();
        this.playAnim('idle');
        this.setDisplaySize(TILE_SIZE, TILE_SIZE);

        this.cursors = this.scene.input.keyboard.createCursorKeys();
    }

    createAnims() {
        const { id, spriteConfig } = this.config;
        const { sprites } = spriteConfig;
        for (const dir in sprites) {
            const key = `${id}_${dir}`;
            if (this.scene.textures.exists(key) && this.scene.textures.get(key).frameTotal > 1) {
                const animKey = `${id}_anim_${dir}`;
                if (!this.scene.anims.exists(animKey)) {
                    this.scene.anims.create({
                        key: animKey,
                        frames: this.scene.anims.generateFrameNumbers(key, { start: 0, end: -1 }),
                        frameRate: 8,
                        repeat: -1
                    });
                }
            }
        }
    }

    playAnim(dir) {
        if (this.lastDir === dir) return;
        const animKey = `${this.id}_anim_${dir}`;
        if (this.anims && this.anims.animationManager.exists(animKey)) {
            this.play(animKey, true);
        } else {
            const idleAnimKey = `${this.id}_anim_idle`;
            if (this.anims && this.anims.animationManager.exists(idleAnimKey)) {
                this.play(idleAnimKey, true);
            }
        }
        this.lastDir = dir;
    }

    /**
     * Chơi một animation một lần và quay lại trạng thái idle.
     * @param {string} animName Tên của animation (không bao gồm prefix)
     * @param {boolean} returnToIdle Có quay lại anim 'idle' sau khi hoàn thành không
     */
    playOneShotAnimation(animName, returnToIdle = true) {
        if (this.isPlayingOneShot) return;

        const animKey = `${this.id}_anim_${animName}`;
        if (this.anims.exists(animKey)) {
            this.isPlayingOneShot = true;
            this.play(animKey, true);

            this.once(`animationcomplete-${animKey}`, () => {
                this.isPlayingOneShot = false;
                if (returnToIdle) {
                    this.playAnim('idle');
                }
            });
        }
    }

    setGridPosition(x, y) {
        this.gridPos.x = x;
        this.gridPos.y = y;
        this.x = x * TILE_SIZE + TILE_SIZE / 2;
        this.y = y * TILE_SIZE + TILE_SIZE / 2;
    }

    updateConfig(newConfig) {
        const oldGridPos = { ...this.gridPos };
        this.config = newConfig;
        this.createAnims();
        this.playAnim('idle');
        this.setGridPosition(oldGridPos.x, oldGridPos.y);
    }

    /**
     * Di chuyển nhân vật một ô theo hướng chỉ định.
     * @param {string} direction 'left', 'right', 'up', 'down'
     */
    moveInDirection(direction) {
        if (this.isPlayingOneShot || this.moveCooldown > 0) return;

        const { x, y } = this.gridPos;
        let newX = x, newY = y;

        if (direction === 'left' && x > 0) newX--;
        else if (direction === 'right' && x < GRID_COLS - 1) newX++;
        else if (direction === 'up' && y > 0) newY--;
        else if (direction === 'down' && y < GRID_ROWS - 1) newY++;

        // Cập nhật kiểm tra va chạm với tilemap
        const tile = this.scene.tilemapLayer ? this.scene.tilemapLayer.getTileAt(newX, newY) : null;
        // Tile có index >= 0 là có tile, -1 là trống.
        const isCellSolid = tile && tile.index >= 0;

        if ((newX !== x || newY !== y) && !isCellSolid) {
            this.setGridPosition(newX, newY);
            this.playAnim(direction);
            this.moveCooldown = 150; // Giảm cooldown để di chuyển mượt hơn
        }
    }

    update(delta) {
        // Không xử lý di chuyển nếu đang chơi animation one-shot
        if (this.isPlayingOneShot) return;

        let dir = 'idle';
        if (this.cursors.left.isDown) dir = 'left';
        else if (this.cursors.right.isDown) dir = 'right';
        else if (this.cursors.up.isDown) dir = 'up';
        else if (this.cursors.down.isDown) dir = 'down';

        let moved = false;
        if (this.moveCooldown <= 0 && dir !== 'idle') {
            const { x, y } = this.gridPos;
            let newX = x, newY = y;

            if (dir === 'left' && x > 0) newX--;
            else if (dir === 'right' && x < GRID_COLS - 1) newX++;
            else if (dir === 'up' && y > 0) newY--;
            else if (dir === 'down' && y < GRID_ROWS - 1) newY++;

            const tile = this.scene.tilemapLayer ? this.scene.tilemapLayer.getTileAt(newX, newY) : null;
            // Tile có index >= 0 là có tile, -1 là trống.
            const isCellSolid = () => tile && tile.index >= 0;

            if ((newX !== x || newY !== y) && !isCellSolid()) {
                this.setGridPosition(newX, newY);
                moved = true;
                this.moveCooldown = 200;
            }
        }

        if (this.moveCooldown > 0) {
            this.moveCooldown -= delta;
        }

        if (dir !== this.lastDir || moved) {
            this.playAnim(dir);
        }
    }
}