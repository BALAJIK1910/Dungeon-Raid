import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gameStateAdapter } from '../../utils/gameStateAdapter';

const Leaderboard = () => {
  const [topPlayers, setTopPlayers] = useState([]);

  useEffect(() => {
    const unsubscribe = gameStateAdapter.subscribe((state) => {
      setTopPlayers(state.topPlayers);
    });

    setTopPlayers(gameStateAdapter.getTopPlayers());

    return unsubscribe;
  }, []);

  return (
    <div
      data-testid="leaderboard-container"
      className="absolute top-6 left-6 w-80 max-w-full z-20"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="bg-black/80 backdrop-blur-md border border-green-500/30 p-4">
        <h2
          className="text-2xl font-bold text-yellow-400 mb-4 tracking-wider uppercase"
          style={{ fontFamily: 'Exo 2, sans-serif' }}
        >
          Top Fighters
        </h2>
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {topPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{
                  layout: { duration: 0.3, ease: 'easeInOut' },
                  opacity: { duration: 0.2 }
                }}
                data-testid={`leaderboard-player-${index}`}
                className="flex justify-between items-center p-3 bg-black/60 border border-green-500/20 backdrop-blur-md"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span
                    className="text-yellow-400 font-bold text-xl w-8"
                    style={{ fontFamily: 'Unbounded, display' }}
                    data-testid={`player-rank-${index}`}
                  >
                    #{index + 1}
                  </span>
                  <div className="flex-1">
                    <div
                      className="text-white truncate font-bold"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      data-testid={`player-name-${index}`}
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
                  data-testid={`player-damage-${index}`}
                >
                  {player.damage.toLocaleString()}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
