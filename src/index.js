import Phaser from 'phaser';
import MainScene from './game/MainScene';

export function createPhaserGame(parentId = 'game-container', characterConfigs = []) {
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
    game.initialCharacterConfigs = characterConfigs;

    game.events.on('ready', () => {
        const scene = game.scene.getScene('MainScene');
        // Pass initial character configs to the scene
        scene.scene.start('MainScene', { characterConfigs: game.initialCharacterConfigs });
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
            scene.updateCharacter(charConfig);
        }
    };

    return game;
}