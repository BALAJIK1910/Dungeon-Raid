import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Gamepad2,
  Cpu,
  LineChart,
  Flame,
  LogOut,
  User,
  Pin,
  PinOff
} from 'lucide-react';
import { useAuth } from '../../context';
import { signOutUser } from '../../firebase/auth';

const Sidebar = () => {
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const activeState = isHovered || isPinned;

  // Navigation items config
  const navItems = [
    {
      to: '/admin/create-event',
      label: 'Create Event',
      icon: Zap,
      activeColor: 'var(--neon-green)',
      glowClass: 'shadow-[0_0_12px_rgba(0,255,136,0.25)]',
      accentText: 'text-[var(--neon-green)]'
    },
    {
      to: '/admin/arena',
      label: 'Arena View',
      icon: Gamepad2,
      activeColor: 'var(--neon-cyan)',
      glowClass: 'shadow-[0_0_12px_rgba(0,240,255,0.25)]',
      accentText: 'text-[var(--neon-cyan)]'
    },
    {
      to: '/admin/puzzles',
      label: 'Puzzle Matrix',
      icon: Cpu,
      activeColor: 'var(--neon-cyan)',
      glowClass: 'shadow-[0_0_12px_rgba(0,240,255,0.25)]',
      accentText: 'text-[var(--neon-cyan)]'
    },
    {
      to: '/admin/analytics',
      label: 'Team Analytics',
      icon: LineChart,
      activeColor: 'var(--neon-cyan)',
      glowClass: 'shadow-[0_0_12px_rgba(0,240,255,0.25)]',
      accentText: 'text-[var(--neon-cyan)]'
    },
    {
      to: '/admin/boss',
      label: 'Boss Battle',
      icon: Flame,
      activeColor: 'var(--neon-amber)',
      glowClass: 'shadow-[0_0_12px_rgba(255,179,0,0.25)]',
      accentText: 'text-[var(--neon-amber)]'
    }
  ];

  // Motion variants
  const sidebarVariants = {
    collapsed: {
      width: 80,
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
    },
    expanded: {
      width: 260,
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const textVariants = {
    collapsed: {
      opacity: 0,
      x: -12,
      transition: { duration: 0.15 }
    },
    expanded: {
      opacity: 1,
      x: 0,
      transition: { delay: 0.08, duration: 0.2 }
    }
  };

  const profileVariants = {
    collapsed: {
      padding: '12px 16px',
      justifyContent: 'center',
      transition: { duration: 0.2 }
    },
    expanded: {
      padding: '16px 20px',
      justifyContent: 'flex-start',
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.nav
      className="absolute left-0 top-0 h-screen bg-[var(--bg-deep)] border-r border-[var(--border-dim)] flex flex-col justify-between overflow-hidden z-50 shadow-[5px_0_25px_rgba(0,0,0,0.5)] select-none backdrop-blur-md"
      initial="collapsed"
      animate={activeState ? 'expanded' : 'collapsed'}
      variants={sidebarVariants}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Decorative vertical glow strip */}
      <div 
        className="absolute top-0 right-0 w-[1px] h-full transition-opacity duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, transparent, ${activeState ? 'var(--neon-cyan)' : 'var(--border-dim)'}, transparent)`,
          opacity: activeState ? 0.7 : 0.2
        }}
      />

      {/* Top Header section */}
      <div>
        <div className="h-[72px] flex items-center justify-between border-b border-[var(--border-dim)] px-6 relative overflow-hidden">
          {/* Hexagonal grid effect background on header */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(var(--neon-cyan)_1px,transparent_1px)] [background-size:12px_12px]" />
          
          <div className="flex items-center gap-3">
            {/* Pulsing hex/circle logo container */}
            <div className="w-8 h-8 rounded border border-[var(--neon-cyan)] flex items-center justify-center bg-[var(--bg-surface)] shadow-[0_0_8px_rgba(0,240,255,0.2)] flex-shrink-0 animate-pulse">
              <span className="font-orbitron font-extrabold text-[var(--neon-cyan)] text-sm tracking-tighter">⬡</span>
            </div>
            
            <AnimatePresence>
              {activeState && (
                <motion.div
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  variants={textVariants}
                  className="flex flex-col whitespace-nowrap"
                >
                  <span className="font-orbitron font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-cyan-dim)] text-base tracking-wide leading-none">
                    TECH WARZONE
                  </span>
                  <span className="font-mono text-[var(--text-secondary)] text-[10px] tracking-[0.2em] mt-0.5 uppercase">
                    SYS ADMIN.v2
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pin toggle button - premium feature */}
          <AnimatePresence>
            {activeState && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? 'Unpin Sidebar' : 'Pin Sidebar'}
                className={`p-1.5 rounded cursor-pointer transition-colors ${
                  isPinned 
                    ? 'text-[var(--neon-cyan)] bg-[var(--bg-raised)] border border-[var(--neon-cyan)]/30 shadow-[0_0_8px_rgba(0,240,255,0.15)]' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-raised)]'
                }`}
              >
                {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation list */}
        <div className="flex flex-col gap-1 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center h-[52px] font-rajdhani font-bold text-sm tracking-wider uppercase border-l-4 transition-all duration-200 relative group overflow-hidden select-none ${
                    isActive
                      ? `border-l-[${item.activeColor}] bg-[var(--bg-surface)] text-[var(--text-primary)] ${item.glowClass}`
                      : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-raised)]/50 hover:text-[var(--text-primary)]'
                  }`
                }
                style={({ isActive }) => ({
                  borderLeftColor: isActive ? item.activeColor : 'transparent'
                })}
              >
                {/* Glow bar highlight behind item on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-raised)] to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-200 pointer-events-none" />

                {/* Left vertical visual line to match cyberpunk dashboard design */}
                <div 
                  className="absolute left-0 top-0 w-[2px] h-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ backgroundColor: item.activeColor }}
                />

                {/* Nav icon container */}
                <div className="w-[80px] h-full flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="transition-transform duration-200 group-hover:scale-110" />
                </div>

                {/* Nav label text */}
                <AnimatePresence>
                  {activeState && (
                    <motion.span
                      initial="collapsed"
                      animate="expanded"
                      exit="collapsed"
                      variants={textVariants}
                      className="whitespace-nowrap select-none font-semibold"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Organizer Profile Footer */}
      <motion.div
        variants={profileVariants}
        animate={activeState ? 'expanded' : 'collapsed'}
        className="border-t border-[var(--border-dim)] bg-[var(--bg-void)]/40 flex flex-col gap-3 relative overflow-hidden"
      >
        <div className="flex items-center gap-3">
          {/* Glowing Avatar */}
          <div className="relative flex-shrink-0">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Organizer"
                className="w-10 h-10 rounded-full border border-[var(--border-dim)] object-cover shadow-[0_0_10px_rgba(0,0,0,0.5)] group-hover:border-[var(--neon-cyan)]/50 transition-colors duration-300"
              />
            ) : (
              <div className="w-10 h-10 rounded-full border border-[var(--border-dim)] bg-[var(--bg-surface)] flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                <User size={18} className="text-[var(--text-secondary)]" />
              </div>
            )}
            {/* Status Indicator Dot (Online / Active Organizer) */}
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-[var(--neon-green)] ring-2 ring-[var(--bg-deep)] animate-pulse" />
          </div>

          {/* Organizer Info */}
          <AnimatePresence>
            {activeState && (
              <motion.div
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                variants={textVariants}
                className="flex flex-col whitespace-nowrap overflow-hidden flex-1"
              >
                <span className="font-rajdhani font-bold text-[var(--text-primary)] text-sm tracking-wide leading-none truncate">
                  {user?.displayName || 'RAID MASTER'}
                </span>
                <span className="font-mono text-[var(--text-secondary)] text-[11px] tracking-normal mt-1 truncate">
                  {user?.email || 'admin@techwar.net'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Expanded Logout Trigger */}
        <AnimatePresence>
          {activeState && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.05, duration: 0.18 }}
              onClick={async () => {
                try {
                  await signOutUser();
                } catch (err) {
                  console.error('Sign-out error:', err);
                }
              }}
              className="w-full flex items-center justify-center gap-2 h-10 border border-[var(--neon-red)]/40 hover:border-[var(--neon-red)] bg-transparent hover:bg-[var(--neon-red)]/10 text-[var(--neon-red)] font-rajdhani font-bold text-xs uppercase tracking-wider rounded cursor-pointer transition-all duration-200 select-none shadow-[inset_0_0_6px_rgba(255,23,68,0.05)] hover:shadow-[0_0_12px_rgba(255,23,68,0.2)]"
            >
              <LogOut size={14} />
              <span>TERMINATE SESSION</span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.nav>
  );
};

export default Sidebar;
