import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gameStateAdapter } from '../../utils/gameStateAdapter';

const ActionFigures = () => {
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
      data-testid="action-figures-container"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-6 items-end justify-center z-10"
      style={{ pointerEvents: 'none' }}
    >
      {topPlayers.map((player, index) => (
        <motion.div
          key={player.id}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          data-testid={`action-figure-${index}`}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <img
              src="https://static.prod-images.emergentagent.com/jobs/42bbef03-b300-4fd2-8418-54a67adfe083/images/6142c2d5aa846f5be73327b04ddb13ccc77f53e1bdc8d6c9d7e6462b65a573af.png"
              alt={player.name}
              className="w-16 h-16 object-contain"
              style={{ filter: `drop-shadow(0 0 8px ${player.color})` }}
            />
            <div
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black"
              style={{
                backgroundColor: player.color,
                fontFamily: 'Unbounded, display'
              }}
            >
              {index + 1}
            </div>
          </div>
          <div
            className="mt-2 text-xs text-white font-bold text-center"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {player.name}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ActionFigures;
