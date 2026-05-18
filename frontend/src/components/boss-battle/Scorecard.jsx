import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gameStateAdapter } from '../../utils/gameStateAdapter';

const Scorecard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);

  useEffect(() => {
    const unsubscribe = gameStateAdapter.subscribe((state) => {
      if (state.bossDefeated && !isVisible) {
        setIsVisible(true);
        setAllPlayers(state.allPlayersSorted);
      }
    });

    return unsubscribe;
  }, [isVisible]);

  const handleReset = () => {
    setIsVisible(false);
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          data-testid="scorecard-container"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="absolute top-0 right-0 h-full w-[400px] max-w-full z-50 bg-[#0B0C10]/95 backdrop-blur-2xl border-l-2 border-yellow-400 p-8 overflow-y-auto"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="mb-8">
            <h2
              className="text-4xl font-black text-white mb-2 tracking-tighter"
              style={{ fontFamily: 'Exo 2, sans-serif' }}
              data-testid="scorecard-title"
            >
              VICTORY!
            </h2>
            <p
              className="text-green-400 text-sm tracking-wider"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              Dragon Defeated
            </p>
          </div>

          <div className="mb-8">
            <h3
              className="text-xl font-bold text-yellow-400 mb-4 uppercase tracking-wide"
              style={{ fontFamily: 'Exo 2, sans-serif' }}
            >
              Final Standings
            </h3>
            <div className="flex flex-col gap-3">
              {allPlayers.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  data-testid={`scorecard-player-${index}`}
                  className={`p-4 border-b border-white/10 ${
                    index < 5 ? 'bg-yellow-400/10' : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-yellow-400 font-bold text-lg w-6"
                        style={{ fontFamily: 'Unbounded, display' }}
                        data-testid={`scorecard-rank-${index}`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <div
                          className="text-white font-bold"
                          style={{ fontFamily: 'JetBrains Mono, monospace' }}
                          data-testid={`scorecard-name-${index}`}
                        >
                          {player.name}
                        </div>
                        <div
                          className="text-xs text-gray-400"
                          style={{ fontFamily: 'JetBrains Mono, monospace' }}
                        >
                          {player.team}
                        </div>
                      </div>
                    </div>
                    <div
                      className="text-red-400 font-bold text-lg"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      data-testid={`scorecard-damage-${index}`}
                    >
                      {player.damage.toLocaleString()}
                    </div>
                  </div>
                  {index < 5 && (
                    <div className="text-xs text-yellow-400 uppercase tracking-wide">
                      ⭐ Top 5 Fighter
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <button
            onClick={handleReset}
            data-testid="reset-button"
            className="w-full py-3 bg-yellow-400 text-black font-bold uppercase tracking-wider hover:bg-yellow-300 transition-colors"
            style={{ fontFamily: 'Exo 2, sans-serif' }}
          >
            Battle Again
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Scorecard;
