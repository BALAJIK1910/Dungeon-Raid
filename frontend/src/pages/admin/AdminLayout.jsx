import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../../context';
import { useAdminGuard } from '../../hooks';
import { signInWithGoogle, signOutUser } from '../../firebase/auth';
import ArenaView from './ArenaView';
import PuzzleMatrix from './PuzzleMatrix';
import TeamAnalytics from './TeamAnalytics';
import BossBattleView from './BossBattleView';

const AdminLayout = () => {
  const { user, loading } = useAuth();
  const authorized = useAdminGuard(user?.uid);
  const [signingIn, setSigningIn] = useState(false);

  // Show loading while verifying auth state
  if (loading || authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
        <p className="font-rajdhani text-[var(--neon-cyan)]">ADMIN VERIFICATION...</p>
      </div>
    );
  }

  // Not authenticated - show sign-in button
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
        <div className="text-center max-w-md">
          <h1 className="font-orbitron font-bold text-3xl text-[var(--neon-cyan)] mb-2">TECH WARZONE 2026</h1>
          <p className="font-rajdhani text-[var(--text-secondary)] mb-8">RAID MASTER PROTOCOL — INITIATE</p>
          <button
            onClick={async () => {
              setSigningIn(true);
              try {
                await signInWithGoogle();
              } catch (err) {
                console.error('Sign-in error:', err);
                alert('Sign-in failed. Please try again.');
              } finally {
                setSigningIn(false);
              }
            }}
            disabled={signingIn}
            className="px-8 py-3 bg-[var(--neon-cyan)] text-[var(--bg-deep)] font-rajdhani font-bold rounded hover:bg-[var(--neon-cyan)]/80 disabled:opacity-50 transition-colors"
          >
            {signingIn ? 'CONNECTING...' : '▶ SIGN IN WITH GOOGLE'}
          </button>
          <NavLink to="/join" className="block mt-6 text-[var(--neon-cyan)] font-rajdhani hover:underline text-sm">
            Back to Join Page
          </NavLink>
        </div>
      </div>
    );
  }

  // Authenticated but not authorized (in admin_users)
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
        <div className="text-center max-w-md">
          <p className="font-rajdhani text-[var(--neon-red)] mb-2 text-2xl">ACCESS DENIED</p>
          <p className="font-mono text-[var(--text-secondary)] mb-4">Unauthorized admin access attempt</p>
          <p className="font-mono text-sm text-[var(--text-tertiary)] mb-6">Your UID is not in the admin_users collection.</p>
          <button
            onClick={async () => {
              await signOutUser();
            }}
            className="px-6 py-2 bg-[var(--neon-red)] text-white font-rajdhani font-semibold rounded hover:bg-[var(--neon-red)]/80 transition-colors mb-4"
          >
            SIGN OUT
          </button>
          <NavLink to="/join" className="block mt-6 text-[var(--neon-cyan)] font-rajdhani hover:underline text-sm">
            Return to Join Page
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <nav className="w-[220px] bg-[var(--bg-deep)] border-r border-[var(--border-dim)] flex flex-col h-full flex-shrink-0">
        <div className="p-6">
          <h1 className="font-orbitron font-bold text-[var(--neon-cyan)] text-lg">ADMIN.SYS</h1>
        </div>
        <div className="flex flex-col flex-1 mt-4">
          <NavLink to="/admin/arena" className={({isActive}) => `px-6 py-3 font-rajdhani font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] border-l-4 transition-colors ${isActive ? 'border-[var(--neon-cyan)] bg-[var(--bg-raised)]' : 'border-transparent'}`}>
            ⬡ Arena View
          </NavLink>
          <NavLink to="/admin/puzzles" className={({isActive}) => `px-6 py-3 font-rajdhani font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] border-l-4 transition-colors ${isActive ? 'border-[var(--neon-cyan)] bg-[var(--bg-raised)]' : 'border-transparent'}`}>
            ⬡ Puzzle Matrix
          </NavLink>
          <NavLink to="/admin/analytics" className={({isActive}) => `px-6 py-3 font-rajdhani font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] border-l-4 transition-colors ${isActive ? 'border-[var(--neon-cyan)] bg-[var(--bg-raised)]' : 'border-transparent'}`}>
            ⬡ Team Analytics
          </NavLink>
          <NavLink to="/admin/boss" className={({isActive}) => `px-6 py-3 font-rajdhani font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-raised)] border-l-4 transition-colors ${isActive ? 'border-[var(--neon-amber)] bg-[var(--bg-raised)]' : 'border-transparent'}`}>
            ⚔ Boss Battle
          </NavLink>
        </div>
      </nav>
      <main className="flex-1 h-full overflow-auto bg-[var(--bg-void)] flex flex-col">
        <Routes>
          <Route path="arena" element={<ArenaView />} />
          <Route path="puzzles" element={<PuzzleMatrix />} />
          <Route path="analytics" element={<TeamAnalytics />} />
          <Route path="boss" element={<BossBattleView />} />
          <Route path="*" element={<Navigate to="/admin/arena" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminLayout;
