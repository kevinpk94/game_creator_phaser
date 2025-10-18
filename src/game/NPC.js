import Phaser from 'phaser';

const TILE_SIZE = 40;

export default class NPC extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, config) {
        // If no sprite is loaded, use a placeholder graphic
        const hasLoadedSprites = Object.keys(config.spriteConfig.sprites).some(dir => config.spriteConfig.sprites[dir].url && scene.textures.exists(`${config.id}_${dir}`));
        const textureKey = hasLoadedSprites ? `${config.id}_idle` : '__DEFAULT_NPC'; // Use a default key for placeholder

        super(scene, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, textureKey);

        this.id = config.id;
        this.isPlayer = false;
        this.isNPC = true;
        this.gridPos = { x, y };
        this.lastDir = 'idle';
        
        this.moveTimer = 0;
        this.patrolIndex = 0;
        this.patrolWaitTimer = 0;

        // If no sprite, draw a placeholder
        if (!hasLoadedSprites) {
            this.setTexture('__DEFAULT_NPC'); // Set a dummy texture to avoid Phaser warnings
            const graphics = scene.add.graphics();
            graphics.fillStyle(0x00ffaa, 1); // Green color for NPC
            graphics.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
            this.setTexture(graphics.generateTexture('__DEFAULT_NPC', TILE_SIZE, TILE_SIZE));
            graphics.destroy();
        }

        this.updateConfig(config);
        this.setDisplaySize(TILE_SIZE, TILE_SIZE);
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

    setGridPosition(x, y) {
        this.gridPos.x = x;
        this.gridPos.y = y;
        this.x = x * TILE_SIZE + TILE_SIZE / 2;
        this.y = y * TILE_SIZE + TILE_SIZE / 2;
    }

    updateConfig(newConfig) {
        const oldGridPos = { ...this.gridPos };
        if (this.config && this.config.movement.type !== newConfig.movement.type) {
            this.patrolIndex = 0;
            this.patrolWaitTimer = 0;
        }
        this.config = newConfig;
        this.movement = newConfig.movement;
        this.createAnims();
        this.playAnim('idle');
        this.setGridPosition(oldGridPos.x, oldGridPos.y);
    }

    update(delta) {
        if (this.moveTimer > 0) {
            this.moveTimer -= delta;
            return;
        }

        if (this.movement.type === 'random') {
            this.updateRandom(delta);
        } else if (this.movement.type === 'patrol') {
            this.updatePatrol(delta);
        }
    }

    updateRandom(delta) {
        this.moveTimer = this.movement.delay || 2000;
        const { x1, y1, x2, y2 } = this.movement.range;
        const newX = Phaser.Math.Between(x1, x2);
        const newY = Phaser.Math.Between(y1, y2);

        const tile = this.scene.tilemapLayer ? this.scene.tilemapLayer.getTileAt(newX, newY) : null;
        // Tile có index >= 0 là có tile, -1 là trống.
        const isCellSolid = () => tile && tile.index >= 0;

        if (!isCellSolid()) {
            this.setGridPosition(newX, newY);
        }
        this.playAnim('idle');
    }

    updatePatrol(delta) {
        if (this.patrolWaitTimer > 0) {
            this.patrolWaitTimer -= delta;
            this.playAnim('idle');
            return;
        }

        this.moveTimer = this.movement.speed || 200;
        const path = this.movement.path;
        if (!path || path.length === 0) return;

        if (this.patrolIndex >= path.length) {
            this.patrolIndex = 0;
        }

        const target = path[this.patrolIndex];
        const { x, y } = this.gridPos;
        let dir = 'idle';

        if (x === target.x && y === target.y) {
            this.patrolWaitTimer = this.movement.delay || 0;
            this.patrolIndex = (this.patrolIndex + 1) % path.length;
            this.playAnim('idle');
            return;
        }

        let newX = x, newY = y;
        if (x < target.x) { newX++; dir = 'right'; }
        else if (x > target.x) { newX--; dir = 'left'; }
        else if (y < target.y) { newY++; dir = 'down'; }
        else if (y > target.y) { newY--; dir = 'up'; }

        const tile = this.scene.tilemapLayer ? this.scene.tilemapLayer.getTileAt(newX, newY) : null;
        // Tile có index >= 0 là có tile, -1 là trống.
        const isCellSolid = () => tile && tile.index >= 0;

        if (!isCellSolid()) {
            this.setGridPosition(newX, newY);
            this.playAnim(dir);
        } else {
            this.patrolIndex = (this.patrolIndex + 1) % path.length;
            this.playAnim('idle');
        }
    }
}