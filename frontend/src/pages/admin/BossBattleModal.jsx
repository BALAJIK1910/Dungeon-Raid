import React from 'react';
import BossBattleView from './BossBattleView';

const BossBattleModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="relative w-full h-[90vh] max-w-7xl bg-[var(--bg-deep)] border-2 border-[var(--neon-amber)] rounded-lg overflow-hidden shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 px-4 py-2 bg-[var(--neon-red)] text-white font-rajdhani font-bold rounded hover:bg-[var(--neon-red)]/80 transition-colors"
        >
          ✕ CLOSE
        </button>

        {/* Boss Battle View */}
        <div className="w-full h-full overflow-hidden">
          <BossBattleView />
        </div>
      </div>
    </div>
  );
};

export default BossBattleModal;
