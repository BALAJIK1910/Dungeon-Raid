import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gameStateAdapter } from '../../utils/gameStateAdapter';

const Scorecard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [outcome, setOutcome] = useState('WON');

  useEffect(() => {
    const unsubscribe = gameStateAdapter.subscribe((state) => {
      // Show scorecard when game concludes (either victory or defeat)
      if ((state.bossDefeated || state.gameConcluded) && !isVisible) {
        setIsVisible(true);
        setAllPlayers(state.allPlayersSorted);
        setOutcome(state.gameOutcome || 'WON');
      }
    });

    return unsubscribe;
  }, [isVisible]);

  const isVictory = outcome === 'WON';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          data-testid="scorecard-container"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="absolute top-0 right-0 h-full w-[400px] max-w-full z-50 bg-[#0B0C10]/95 backdrop-blur-2xl border-l-2 p-8 overflow-y-auto"
          style={{ pointerEvents: 'auto', borderColor: isVictory ? '#FFE81F' : '#FF3B30' }}
        >
          <div className="mb-8">
            <h2
              className={`text-4xl font-black mb-2 tracking-tighter ${isVictory ? 'text-green-400' : 'text-red-400'}`}
              style={{ fontFamily: 'Exo 2, sans-serif' }}
              data-testid="scorecard-title"
            >
              {isVictory ? 'VICTORY!' : 'DEFEATED!'}
            </h2>
            <p
              className={`text-sm tracking-wider ${isVictory ? 'text-green-400' : 'text-red-400'}`}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {isVictory ? 'Dragon Defeated' : 'All Questions Exhausted'}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Scorecard;


