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
        // Thêm các nút điều khiển ảo cho mobile
        this.virtualControls = { up: false, down: false, left: false, right: false };
        this.createVirtualControls();
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

    createVirtualControls() {
        const dpadSize = 50;
        const dpadAlpha = 0.4;
        const dpadX = 100;
        const dpadY = this.scene.cameras.main.height - 100;

        // Nút Trái
        const leftButton = this.scene.add.rectangle(dpadX - dpadSize, dpadY, dpadSize, dpadSize, 0xffffff, dpadAlpha).setInteractive();
        leftButton.setScrollFactor(0); // Giữ cố định trên màn hình
        leftButton.on('pointerdown', () => { this.virtualControls.left = true; });
        leftButton.on('pointerup', () => { this.virtualControls.left = false; });
        leftButton.on('pointerout', () => { this.virtualControls.left = false; }); // Xử lý khi ngón tay trượt ra ngoài

        // Nút Phải
        const rightButton = this.scene.add.rectangle(dpadX + dpadSize, dpadY, dpadSize, dpadSize, 0xffffff, dpadAlpha).setInteractive();
        rightButton.setScrollFactor(0);
        rightButton.on('pointerdown', () => { this.virtualControls.right = true; });
        rightButton.on('pointerup', () => { this.virtualControls.right = false; });
        rightButton.on('pointerout', () => { this.virtualControls.right = false; });

        // Nút Lên
        const upButton = this.scene.add.rectangle(dpadX, dpadY - dpadSize, dpadSize, dpadSize, 0xffffff, dpadAlpha).setInteractive();
        upButton.setScrollFactor(0);
        upButton.on('pointerdown', () => { this.virtualControls.up = true; });
        upButton.on('pointerup', () => { this.virtualControls.up = false; });
        upButton.on('pointerout', () => { this.virtualControls.up = false; });

        // Nút Xuống
        const downButton = this.scene.add.rectangle(dpadX, dpadY + dpadSize, dpadSize, dpadSize, 0xffffff, dpadAlpha).setInteractive();
        downButton.setScrollFactor(0);
        downButton.on('pointerdown', () => { this.virtualControls.down = true; });
        downButton.on('pointerup', () => { this.virtualControls.down = false; });
        downButton.on('pointerout', () => { this.virtualControls.down = false; });
    }

    update(delta) {
        // Không xử lý di chuyển nếu đang chơi animation one-shot
        if (this.isPlayingOneShot) return;

        let dir = 'idle';
        // Kiểm tra cả phím bấm và nút ảo
        if (this.cursors.left.isDown || this.virtualControls.left) dir = 'left';
        else if (this.cursors.right.isDown || this.virtualControls.right) dir = 'right';
        else if (this.cursors.up.isDown || this.virtualControls.up) dir = 'up';
        else if (this.cursors.down.isDown || this.virtualControls.down) dir = 'down';

        let moved = false;
        if (this.moveCooldown <= 0 && dir !== 'idle') {
            const { x, y } = this.gridPos;
            let newX = x, newY = y;

            if (dir === 'left' && x > 0) newX--;
            else if (dir === 'right' && x < GRID_COLS - 1) newX++;
            else if (dir === 'up' && y > 0) newY--;
            else if (dir === 'down' && y < GRID_ROWS - 1) newY++;

            const isCellSolid = () => {
                const obstacleId = this.scene.grid[newY][newX];
                if (obstacleId === 0) return false; // Ô trống
                const obstacleType = this.scene.obstacleTypes.get(obstacleId);
                return obstacleType ? obstacleType.isSolid : false; // Kiểm tra vật cản có isSolid không
            };

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