import { useState } from 'react';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Activity, Clock, Shield, UserMinus, Users } from 'lucide-react';
import { useEvent, useLeaderboardContext } from '../../context';
import { useBattleLog } from '../../hooks';
import { db } from '../../firebase/config';
import HudPanel from '../../components/layout/HudPanel';

function Metric({ icon: Icon, label, value, accent = 'var(--neon-cyan)' }) {
  return (
    <div className="border border-[var(--border-dim)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center gap-3 mb-2">
        <Icon size={18} style={{ color: accent }} />
        <p className="font-rajdhani text-xs tracking-[0.25em] text-[var(--text-secondary)] uppercase">
          {label}
        </p>
      </div>
      <p className="font-orbitron text-2xl" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

export default function TeamAnalytics() {
  const { eventId } = useEvent();
  const { teams, loading, error } = useLeaderboardContext();
  const { log } = useBattleLog(eventId);
  const [message, setMessage] = useState('');

  const totalDamage = teams.reduce((sum, team) => sum + (Number(team.total_damage_dealt) || 0), 0);
  const totalSolves = teams.reduce((sum, team) => sum + (Number(team.puzzles_solved) || 0), 0);
  const teamsOnCooldown = teams.filter((team) => {
    return team.submission_cooldown_expiry && team.submission_cooldown_expiry > Date.now();
  }).length;
  const shieldedTeams = teams.filter((team) => team.shield_active).length;

  const handleRemoveTeamLogin = async (team) => {
    if (!eventId) return;

    const confirmed = window.confirm(
      `Remove login for ${team.team_name}? This deletes their team session from the event.`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'events', eventId, 'teams', team.teamId));
      await setDoc(doc(collection(db, 'events', eventId, 'battle_log')), {
        timestamp: Date.now(),
        event_type: 'ADMIN_ACTION',
        action: 'REMOVE_TEAM_LOGIN',
        team_name: team.team_name,
        team_id: team.teamId,
        message: `Raid Master removed login for ${team.team_name}`,
      });
      setMessage(`Removed login for ${team.team_name}.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Remove team login error:', err);
      setMessage(`Remove failed: ${err.message}`);
    }
  };

  if (!eventId) {
    return (
      <div className="p-8">
        <h1 className="font-orbitron text-3xl text-[var(--neon-cyan)] mb-4">TEAM ANALYTICS</h1>
        <p className="font-mono text-[var(--text-secondary)]">Select an event in Arena View first.</p>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col gap-8">
      <div>
        <h1 className="font-orbitron text-3xl text-[var(--neon-cyan)] mb-2">TEAM ANALYTICS</h1>
        <p className="font-mono text-sm text-[var(--text-secondary)]">EVENT: {eventId}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric icon={Users} label="Registered Teams" value={teams.length} />
        <Metric icon={Activity} label="Total Damage" value={totalDamage} accent="var(--neon-green)" />
        <Metric icon={Clock} label="Cooldowns" value={teamsOnCooldown} accent="var(--neon-amber)" />
        <Metric icon={Shield} label="Shields Active" value={shieldedTeams} accent="var(--neon-violet)" />
      </div>

      <HudPanel className="p-6">
        <h2 className="font-rajdhani font-bold text-[var(--neon-cyan)] tracking-[0.3em] mb-4">
          TEAM ROSTER
        </h2>
        {message && <p className="font-mono text-sm text-[var(--neon-amber)] mb-4">{message}</p>}
        {loading && <p className="font-mono text-[var(--text-secondary)]">Loading teams...</p>}
        {error && <p className="font-mono text-[var(--neon-red)]">{error}</p>}
        {!loading && teams.length === 0 && (
          <p className="font-mono text-[var(--text-secondary)]">No teams registered.</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-dim)] text-left">
                <th className="py-3 pr-4 font-rajdhani text-[var(--text-secondary)]">RANK</th>
                <th className="py-3 pr-4 font-rajdhani text-[var(--text-secondary)]">TEAM</th>
                <th className="py-3 pr-4 font-rajdhani text-[var(--text-secondary)]">DAMAGE</th>
                <th className="py-3 pr-4 font-rajdhani text-[var(--text-secondary)]">SOLVES</th>
                <th className="py-3 pr-4 font-rajdhani text-[var(--text-secondary)]">HINTS</th>
                <th className="py-3 pr-4 font-rajdhani text-[var(--text-secondary)]">STATUS</th>
                <th className="py-3 pr-4 font-rajdhani text-[var(--text-secondary)]">LOGIN</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => {
                const cooldownActive =
                  team.submission_cooldown_expiry && team.submission_cooldown_expiry > Date.now();
                const members = team.registered_members || team.member_names || [];

                return (
                  <tr key={team.teamId} className="border-b border-[var(--border-dim)]">
                    <td className="py-3 pr-4 font-orbitron text-[var(--text-muted)]">#{index + 1}</td>
                    <td className="py-3 pr-4">
                      <p className="font-rajdhani font-semibold text-[var(--text-primary)]">
                        {team.team_name}
                      </p>
                      <p className="font-mono text-xs text-[var(--text-muted)]">
                        {members.length > 0
                          ? members.map((name, i) => (
                              <span key={i}>
                                <span className="text-[var(--neon-cyan)] opacity-80">{name}</span>
                                {i < members.length - 1 && <span className="text-[var(--border-dim)]"> · </span>}
                              </span>
                            ))
                          : 'No members'}
                      </p>
                    </td>
                    <td className="py-3 pr-4 font-mono text-[var(--neon-green)]">
                      {team.total_damage_dealt || 0}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[var(--text-primary)]">
                      {team.puzzles_solved || 0}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[var(--neon-amber)]">
                      {team.hint_tokens || 0}
                    </td>
                    <td className="py-3 pr-4 font-mono text-sm">
                      {cooldownActive ? (
                        <span className="text-[var(--neon-red)]">COOLDOWN</span>
                      ) : team.shield_active ? (
                        <span className="text-[var(--neon-violet)]">SHIELD</span>
                      ) : (
                        <span className="text-[var(--neon-green)]">READY</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveTeamLogin(team)}
                        className="inline-flex items-center gap-2 text-[var(--neon-red)] font-rajdhani font-bold hover:drop-shadow-[var(--glow-red)]"
                        title="Remove team login"
                      >
                        <UserMinus size={16} />
                        REMOVE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </HudPanel>

      <HudPanel className="p-6">
        <h2 className="font-rajdhani font-bold text-[var(--neon-cyan)] tracking-[0.3em] mb-4">
          RECENT COMBAT LOG
        </h2>
        <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto font-mono text-sm">
          {log.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No battle log entries yet.</p>
          ) : (
            log.slice(0, 20).map((entry) => (
              <div key={entry.logId} className="border-b border-[var(--border-dim)] pb-2">
                <span className="text-[var(--text-muted)]">
                  {entry.timestamp?.toDate?.()?.toLocaleTimeString?.() ||
                    (typeof entry.timestamp === 'number'
                      ? new Date(entry.timestamp).toLocaleTimeString()
                      : '--:--')}
                </span>{' '}
                <span className="text-[var(--neon-amber)]">{entry.team_name || entry.action || 'SYSTEM'}</span>{' '}
                <span className="text-[var(--text-secondary)]">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </HudPanel>
    </div>
  );
}
