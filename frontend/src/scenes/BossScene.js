import Phaser from 'phaser';
import { gameStateAdapter } from '../utils/gameStateAdapter';

class BossScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BossScene' });
    this.defeatTriggered = false;
    this.lastBossHp = null;
  }

  preload() {
    this.load.image('boss', 'https://static.prod-images.emergentagent.com/jobs/42bbef03-b300-4fd2-8418-54a67adfe083/images/bc271e360a54eb4f2ca1121df89affeb896911843d8c2ff31113d1caf3cfcf69.png');
    this.load.image('background', 'https://static.prod-images.emergentagent.com/jobs/42bbef03-b300-4fd2-8418-54a67adfe083/images/583d5268e51c7880f4ede62248ae6976b514d3da4b4ab3c31592594259ac210a.png');
    this.load.image('player', 'https://static.prod-images.emergentagent.com/jobs/42bbef03-b300-4fd2-8418-54a67adfe083/images/6142c2d5aa846f5be73327b04ddb13ccc77f53e1bdc8d6c9d7e6462b65a573af.png');
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.background = this.add.image(width / 2, height / 2, 'background');
    this.background.setDisplaySize(width, height);

    // Boss sprite
    this.boss = this.add.sprite(width / 2, height / 2 - 50, 'boss');
    this.boss.setScale(0.6);
    this.boss.setData('originalScale', 0.6);

    // Boss idle animation (breathing effect)
    this.tweens.add({
      targets: this.boss,
      scaleX: 0.65,
      scaleY: 0.65,
      duration: 3000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    // Particle emitter for continuous cosmic effect
    this.particles = this.add.particles(0, 0, 'player', {
      speed: { min: 50, max: 100 },
      scale: { start: 0.1, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 2000,
      frequency: 200,
      tint: [0xFFE81F, 0x39FF14, 0xFF3B30, 0x00D9FF],
      blendMode: 'ADD',
      follow: this.boss
    });

    // Player characters at bottom
    this.playerSprites = [];
    const startX = width / 2 - 200;
    const bottomY = height - 80;

    gameStateAdapter.getTopPlayers().forEach((player, index) => {
      const sprite = this.add.sprite(startX + index * 100, bottomY, 'player');
      sprite.setScale(0.15);
      sprite.setData('playerId', player.id);
      sprite.setData('playerName', player.name);
      sprite.setTint(parseInt(player.color.replace('#', '0x')));
      this.playerSprites.push(sprite);
    });

    // Subscribe to game state changes for damage visualization
    this.unsubscribe = gameStateAdapter.subscribe((state) => {
      const currentHp = state.bossHealth;

      // Check if damage was dealt
      if (this.lastBossHp !== null && currentHp < this.lastBossHp) {
        this.screenShake();
        this.flashBoss();
      }

      this.lastBossHp = currentHp;

      // Check if boss is defeated (victory)
      if (state.bossDefeated && !this.defeatTriggered) {
        this.defeatTriggered = true;
        this.triggerBossDefeat();
      }

      // Check if game concluded (defeat - all questions exhausted)
      if (state.gameConcluded && state.gameOutcome === 'LOST' && !this.defeatTriggered) {
        this.defeatTriggered = true;
        this.triggerGameOver();
      }
    });

    // Initialize lastBossHp
    const initialState = gameStateAdapter.getState();
    this.lastBossHp = initialState.bossHealth;
  }

  screenShake() {
    this.cameras.main.shake(200, 0.005);
  }

  flashBoss() {
    this.boss.setTint(0xFFFFFF);
    this.time.delayedCall(100, () => {
      this.boss.clearTint();
      this.boss.setTint(0xFF3B30);
    });
    this.time.delayedCall(200, () => {
      this.boss.clearTint();
    });
  }

  triggerBossDefeat() {
    this.tweens.killTweensOf(this.boss);

    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 200, () => {
        const explosion = this.add.particles(this.boss.x, this.boss.y, 'player', {
          speed: { min: 200, max: 400 },
          scale: { start: 0.3, end: 0 },
          alpha: { start: 1, end: 0 },
          lifespan: 1000,
          quantity: 50,
          tint: [0xFFE81F, 0xFF3B30, 0xFFFFFF],
          blendMode: 'ADD'
        });

        this.time.delayedCall(1000, () => explosion.destroy());
      });
    }

    this.cameras.main.shake(1000, 0.02);

    this.tweens.add({
      targets: this.boss,
      alpha: 0,
      scale: 0.8,
      duration: 2000,
      ease: 'Power2',
      onUpdate: (tween) => {
        if (tween.progress > 0.5) {
          this.boss.setTint(0xFFFFFF);
        }
      }
    });

    this.time.delayedCall(2000, () => {
      this.cameras.main.flash(500, 255, 255, 255);
    });
  }

  triggerGameOver() {
    // Screen effect for defeat
    this.cameras.main.shake(500, 0.015);

    this.tweens.add({
      targets: this.boss,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0.3,
      duration: 1500,
      ease: 'Power2'
    });

    this.time.delayedCall(1500, () => {
      this.cameras.main.flash(300, 255, 0, 0);
    });
  }

  update() {
    // Update logic if needed
  }

  shutdown() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export default BossScene;

