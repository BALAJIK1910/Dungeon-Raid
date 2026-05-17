import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HudPanel from './HudPanel';
import HudButton from './HudButton';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, requireInput = false, expectedInput = "CONFIRM" }) => {
  const [inputValue, setInputValue] = useState("");

  const isConfirmDisabled = requireInput && inputValue.toUpperCase() !== expectedInput.toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md"
          >
            <HudPanel className="p-6 border-red-500 w-full">
              <h2 className="font-orbitron font-bold text-xl text-[var(--neon-red)] mb-4 uppercase tracking-widest">
                ⚠ {title}
              </h2>
              <p className="font-mono text-[var(--text-primary)] mb-6 whitespace-pre-line">
                {message}
              </p>
              
              {requireInput && (
                <div className="mb-6">
                  <p className="font-mono text-[var(--text-secondary)] mb-2 text-sm">
                    Type {expectedInput} to proceed:
                  </p>
                  <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full bg-[var(--bg-raised)] border border-[var(--border-dim)] focus:border-[var(--neon-red)] text-white font-mono p-2 focus:outline-none focus:shadow-[var(--glow-red)] transition-all"
                  />
                </div>
              )}

              <div className="flex justify-end gap-4">
                <HudButton onClick={onClose}>ABORT</HudButton>
                <HudButton 
                  variant="danger" 
                  onClick={() => {
                    if (!isConfirmDisabled) {
                      onConfirm();
                      setInputValue("");
                    }
                  }}
                  disabled={isConfirmDisabled}
                  className={isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  EXECUTE
                </HudButton>
              </div>
            </HudPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
