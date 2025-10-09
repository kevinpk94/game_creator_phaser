// src/phaserGame.js
import Phaser from 'phaser';

let player;
let cursors;
let grid = [];
const TILE_SIZE = 40;
const GRID_COLS = 20;
const GRID_ROWS = 15;
let gridGraphics;
let obstacleGraphics;
let playerGridPos = { x: 0, y: 0 };
let moveCooldown = 0;

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

async function blobUrlToBase64(blobUrl) {
  const response = await fetch(blobUrl)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
// Lưu sprite url cho từng hướng
let userSpriteUrls = {};

// Hàm khởi tạo game, export đúng chuẩn
export function createPhaserGame(parentId = 'game-container', spriteImageRef, defaultSpritePath = 'assets/character/idle_down.png', spriteConfig = {}) {
    // spriteConfig: { idle: {url, frameWidth, frameHeight, animFrames}, ... }
    async function preload() {
        // Load sprite sheet cho từng hướng
        const dirs = ['idle', 'down', 'left', 'right', 'up'];
        let spriteConfig = (this.sys && this.sys.game && this.sys.game.spriteConfig) ? this.sys.game.spriteConfig : {};
        let urls = (this.sys && this.sys.game && this.sys.game.userSpriteUrls) ? this.sys.game.userSpriteUrls : {};
        // Lấy frameWidth/frameHeight dùng chung
        let frameWidth = spriteConfig.frameWidth || 64;
        let frameHeight = spriteConfig.frameHeight || 64;
        for (const dir of dirs) {
            let url = urls[dir];
            if (url) {
                if (url.endsWith('.png')) {
                    this.load.spritesheet('player_' + dir, url, { frameWidth, frameHeight });
                } else {
                    // const base64 = await blobUrlToBase64(url)
                    console.log(url)
                    this.load.spritesheet('player_' + dir, url, { frameWidth, frameHeight });
                }

                
            }
        }
        // Nếu không có idle thì load mặc định
        if (!urls['idle']) {
            this.load.spritesheet('player_idle', 'assets/character/idle_down.png', { frameWidth: 64, frameHeight: 64 });
        }

        
        this.load.once('complete', () => {
            console.log('Loaded OK')
            this.load.start()
        })
    }

    function create() {
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

        // Player bắt đầu ở ô (0,0)
        playerGridPos = { x: 0, y: 0 };
        // Sprite config từng hướng
        const dirs = ['idle', 'down', 'left', 'right', 'up'];
        let spriteConfig = (this.sys && this.sys.game && this.sys.game.spriteConfig) ? this.sys.game.spriteConfig : {};
        // Tạo player với sprite sheet idle (hoặc down nếu không có idle)
        let mainDir = 'idle';
        if (!this.textures.exists('player_idle') && this.textures.exists('player_down')) mainDir = 'down';
        let playerKey = 'player_' + mainDir;
        if (this.textures.exists(playerKey) && this.textures.get(playerKey).frameTotal > 1) {
            // Lấy frame đầu tiên user chọn cho hướng mainDir, đảm bảo hợp lệ
            let totalFrames = this.textures.get(playerKey).frameTotal;
            let firstFrame = 0;
            if (spriteConfig[mainDir]?.animFrames && spriteConfig[mainDir].animFrames.length > 0) {
                let f = spriteConfig[mainDir].animFrames[0];
                firstFrame = (f >= 0 && f < totalFrames) ? f : 0;
            }
            player = this.add.sprite(
                playerGridPos.x * TILE_SIZE + TILE_SIZE / 2,
                playerGridPos.y * TILE_SIZE + TILE_SIZE / 2,
                playerKey, firstFrame
            );
            // Animation động cho từng hướng
            for (const dir of dirs) {
                const key = 'player_' + dir;
                if (this.textures.exists(key) && this.textures.get(key).frameTotal > 1) {
                    const totalFrames = this.textures.get(key).frameTotal;
                    // Chỉ lấy frame hợp lệ, animFrames riêng từng hướng
                    const frames = (spriteConfig[dir]?.animFrames || [0])
                        .filter(f => f >= 0 && f < totalFrames)
                        .map(f => ({ key, frame: f }));

                    if (frames.length > 0 && !this.anims.exists(dir)) {
                        const config = {
                            key: dir,
                            frames: this.anims.generateFrameNumbers( 'player_' + dir , { start: 0, end: totalFrames - 1, first: totalFrames - 1 }),
                            frameRate: 8,
                            repeat: -1
                        };

                        this.anims.create(config);
                    }
                }
            }
            player.play(mainDir);
            player.setDisplaySize(TILE_SIZE, TILE_SIZE);
        } else {
            // Nếu không có sprite sheet thì dùng image idle/down
            let imgKey = this.textures.exists('player_idle') ? 'player_idle' : (this.textures.exists('player_down') ? 'player_down' : null);
            player = this.add.image(
                playerGridPos.x * TILE_SIZE + TILE_SIZE / 2,
                playerGridPos.y * TILE_SIZE + TILE_SIZE / 2,
                imgKey
            );
            player.setDisplaySize(TILE_SIZE, TILE_SIZE);
        }
        // Đảm bảo player luôn có body để cập nhật vị trí (cho sprite sheet)
        if (this.physics && this.physics.add && player && !player.body) {
            this.physics.add.existing(player);
            player.body.setCollideWorldBounds(true);
        }

        // Khởi tạo phím điều khiển
        cursors = this.input.keyboard.createCursorKeys();
        moveCooldown = 0;

        // Thêm text hướng dẫn
        this.add.text(20, 20, 'Dùng phím mũi tên để di chuyển nhân vật. Click vào ô để thêm/xóa chướng ngại vật.', { fontSize: '18px', color: '#fff' });

        // Xử lý click để thêm/xóa chướng ngại vật
        this.input.on('pointerdown', pointer => {
            const x = Math.floor(pointer.x / TILE_SIZE);
            const y = Math.floor(pointer.y / TILE_SIZE);
            if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
                grid[y][x] = grid[y][x] === 1 ? 0 : 1;
                drawObstacles(obstacleGraphics);
            }
        });
    }

    let lastDir = 'idle';
    function update(time, delta) {
        if (!player || !cursors) return;
        let dir = null;
        let { x, y } = playerGridPos;
        // Ưu tiên phát hiện hướng nhấn phím
        if (cursors.left.isDown) dir = 'left';
        else if (cursors.right.isDown) dir = 'right';
        else if (cursors.up.isDown) dir = 'up';
        else if (cursors.down.isDown) dir = 'down';
        else dir = 'idle';

        // Di chuyển nếu có thể
        let moved = false;
        if (moveCooldown <= 0) {
            if (dir === 'left' && x > 0 && grid[y][x - 1] !== 1) {
                playerGridPos.x--;
                moved = true;
            } else if (dir === 'right' && x < GRID_COLS - 1 && grid[y][x + 1] !== 1) {
                playerGridPos.x++;
                moved = true;
            } else if (dir === 'up' && y > 0 && grid[y - 1][x] !== 1) {
                playerGridPos.y--;
                moved = true;
            } else if (dir === 'down' && y < GRID_ROWS - 1 && grid[y + 1][x] !== 1) {
                playerGridPos.y++;
                moved = true;
            }
            if (moved) {
                player.x = playerGridPos.x * TILE_SIZE + TILE_SIZE / 2;
                player.y = playerGridPos.y * TILE_SIZE + TILE_SIZE / 2;
                moveCooldown = 120;
            }
        } else {
            moveCooldown -= delta;
        }

        // Luôn phát lại animation nếu hướng thay đổi hoặc vừa di chuyển
        if (player.anims && player.anims.animationManager) {
            if ((dir && dir !== lastDir) || moved) {
                if (player.anims.animationManager.exists(dir)) player.anims.play(dir, true);
                else if (player.anims.animationManager.exists('idle')) player.anims.play('idle', true);
                lastDir = dir;
            }
        }
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
        physics: { default: 'arcade' }
    };
    const game = new Phaser.Game(config);
    // Cho phép thay sprite từng hướng từ bên ngoài
    game.changePlayerSprite = (urls) => {
        userSpriteUrls = urls;
        game.userSpriteUrls = urls;
        if (game.scene && game.scene.scenes && game.scene.scenes[0]) {
            game.scene.scenes[0].scene.restart();
        }
    };
    // Lấy sprite url từng hướng từ ref nếu có
    if (spriteImageRef && typeof spriteImageRef.value === 'object') {
        userSpriteUrls = { ...spriteImageRef.value };
        game.userSpriteUrls = userSpriteUrls;
    } else if (defaultSpritePath) {
        userSpriteUrls = { idle: defaultSpritePath };
        game.userSpriteUrls = userSpriteUrls;
    }
    // Lưu config frame/anim vào game instance
    game.spriteConfig = spriteConfig;
    return game;
    // ...existing code...
}
