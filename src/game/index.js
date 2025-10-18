import Phaser from 'phaser';
import MainScene from './MainScene';

export function createPhaserGame(parentId = 'game-container', initialConfigs = {}) {
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: parentId,
        backgroundColor: '#222',
        scene: [MainScene],
    };

    const game = new Phaser.Game(config);

    // Store initial character configs to pass to the scene
    game.initialConfigs = initialConfigs;

    game.events.on('ready', () => {
        const scene = game.scene.getScene('MainScene');
        // Pass initial character configs to the scene
        scene.scene.start('MainScene', { configs: game.initialConfigs });
    });
    
    game.setEditMode = (mode) => {
        const scene = game.scene.getScene('MainScene');
        if (scene && scene.scene.isActive()) {
            scene.setEditMode(mode);
        }
    };

    game.addCharacter = (charConfig) => {
        const scene = game.scene.getScene('MainScene');
        if (scene && scene.scene.isActive()) {
            // Logic load texture before creating character
            const loader = new Phaser.Loader.LoaderPlugin(scene);
            const { id, spriteConfig } = charConfig;
            const { frameWidth, frameHeight, sprites } = spriteConfig;

            for (const dir in sprites) {
                if (sprites[dir].url && !scene.textures.exists(`${id}_${dir}`)) {
                    loader.spritesheet(`${id}_${dir}`, sprites[dir].url, { frameWidth, frameHeight });
                }
            }
            loader.once('complete', () => {
                scene.addCharacter(charConfig);
                loader.destroy();
            });
            loader.start();
        }
    };

    game.removeCharacter = (charId) => {
        const scene = game.scene.getScene('MainScene');
        if (scene && scene.scene.isActive()) {
            scene.removeCharacter(charId);
        }
    };

    game.updateCharacter = (charConfig) => {
        const scene = game.scene.getScene('MainScene');
        if (scene && scene.scene.isActive()) {
            // Bổ sung logic tải texture mới trước khi cập nhật
            const loader = new Phaser.Loader.LoaderPlugin(scene);
            const { id, spriteConfig } = charConfig;
            const { frameWidth, frameHeight, sprites } = spriteConfig;

            for (const dir in sprites) {
                if (sprites[dir].url && !scene.textures.exists(`${id}_${dir}`)) {
                    loader.spritesheet(`${id}_${dir}`, sprites[dir].url, { frameWidth, frameHeight });
                }
            }

            loader.once('complete', () => {
                scene.updateCharacter(charConfig);
                loader.destroy();
            });
            loader.start();
        }
    };

    game.addButton = (buttonConfig) => {
        const scene = game.scene.getScene('MainScene');
        if (scene && scene.scene.isActive()) {
            scene.addButton(buttonConfig);
        }
    };
    game.removeButton = (buttonId) => {
        const scene = game.scene.getScene('MainScene');
        if (scene && scene.scene.isActive()) {
            scene.removeButton(buttonId);
        }
    };
    game.updateButton = (buttonConfig) => {
        // For simplicity, we'll just remove and re-add the button
        game.removeButton(buttonConfig.id);
        game.addButton(buttonConfig);
    };

    game.selectButton = (buttonId) => {
        const scene = game.scene.getScene('MainScene');
        if (scene && scene.scene.isActive()) {
            scene.selectButton(buttonId);
        }
    };

    // --- Obstacle Live Update ---
    game.addTileset = (tilesetConfig) => {
        const scene = game.scene.getScene('MainScene');
        if (scene && scene.scene.isActive()) {
            scene.addTileset(tilesetConfig);
        }
    };
    game.removeTileset = (tilesetId) => {
        const scene = game.scene.getScene('MainScene');
        if (scene && scene.scene.isActive()) {
            scene.removeTileset(tilesetId);
        }
    };
    game.updateTileset = (tilesetConfig) => {
        const scene = game.scene.getScene('MainScene');
        if (scene && scene.scene.isActive()) {
            scene.updateTileset(tilesetConfig);
        }
    };

    game.setActiveTile = (tilesetId, tileIndex) => {
        const scene = game.scene.getScene('MainScene');
        if (scene && scene.scene.isActive()) {
            scene.setActiveTile(tilesetId, tileIndex);
        }
    };

    game.getGridData = () => {
        const scene = game.scene.getScene('MainScene');
        if (scene && scene.scene.isActive()) {
            return scene.getGrid();
        }
        return [];
    };

    return game;
}
