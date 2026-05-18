import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gameStateAdapter } from '../../utils/gameStateAdapter';

const HealthBar = () => {
  const [health, setHealth] = useState(100);
  const [currentHealth, setCurrentHealth] = useState(100000);
  const [maxHealth, setMaxHealth] = useState(100000);

  useEffect(() => {
    const unsubscribe = gameStateAdapter.subscribe((state) => {
      setHealth(state.bossHealthPercentage);
      setCurrentHealth(state.bossHealth);
      setMaxHealth(state.bossMaxHealth);
    });

    const state = gameStateAdapter.getState();
    setHealth(state.bossHealthPercentage);
    setCurrentHealth(state.bossHealth);
    setMaxHealth(state.bossMaxHealth);

    return unsubscribe;
  }, []);

  return (
    <div
      data-testid="boss-health-container"
      className="absolute top-6 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-20"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="bg-black/80 backdrop-blur-md border-2 border-yellow-400/50 p-4">
        <div
          className="text-center text-yellow-400 text-sm uppercase tracking-[0.3em] font-bold mb-2"
          style={{ fontFamily: 'Exo 2, sans-serif' }}
        >
          Celestial Dragon
        </div>
        <div className="h-8 w-full bg-black/80 border-2 border-gray-800 overflow-hidden relative">
          <motion.div
            data-testid="health-bar-fill"
            className="h-full bg-gradient-to-r from-red-600 to-red-400"
            initial={{ width: '100%' }}
            animate={{ width: `${health}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center text-white font-bold tracking-widest text-sm"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
            data-testid="health-bar-text"
          >
            {currentHealth.toLocaleString()} / {maxHealth.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthBar;
