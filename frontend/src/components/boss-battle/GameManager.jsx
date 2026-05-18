import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import BossScene from '../../scenes/BossScene';

const GameManager = () => {
  const gameRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#050505',
      scene: [BossScene],
      physics: {
        default: 'arcade',
        arcade: {
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    gameRef.current = new Phaser.Game(config);

    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="game-canvas-container"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    />
  );
};

export default GameManager;
