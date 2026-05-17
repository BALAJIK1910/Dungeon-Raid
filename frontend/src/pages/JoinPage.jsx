import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerTeam, loginTeam } from '../firebase/functions';
import HudPanel from '../components/layout/HudPanel';
import HudButton from '../components/layout/HudButton';

const JoinPage = () => {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState('');
  const [eventCode, setEventCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!teamName || !eventCode || !password) {
      setError('All fields are required.');
      return;
    }
    if (!isLoginMode && !members) {
      setError('Operatives list is required.');
      return;
    }
    if (eventCode.length < 4) {
      setError('ACCESS DENIED — INVALID CLEARANCE CODE');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      let eventId, teamId;

      if (isLoginMode) {
        // Call loginTeam
        const result = await loginTeam({
          joinCode: eventCode,
          teamName,
          password,
        });
        eventId = result.data.eventId;
        teamId = result.data.teamId;
      } else {
        // Parse members from textarea (one per line)
        const memberList = members
          .split('\n')
          .map(m => m.trim())
          .filter(m => m.length > 0);

        if (memberList.length === 0) {
          setError('Must designate at least one operative.');
          setLoading(false);
          return;
        }

        // Call registerTeam
        const result = await registerTeam({
          joinCode: eventCode,
          teamName,
          memberNames: memberList,
          password,
        });
        eventId = result.data.eventId;
        teamId = result.data.teamId;
      }

      // Store session info (no auth needed for free tier)
      sessionStorage.setItem('tw_eventId', eventId);
      sessionStorage.setItem('tw_teamId', teamId);
      sessionStorage.setItem('tw_teamName', teamName);

      // Navigate to game
      navigate(`/play/${eventId}`);
    } catch (err) {
      console.error('Action error:', err);
      
      // Map backend error codes to UI messages
      const errorCode = err.code || '';
      if (errorCode === 'INVALID_JOIN_CODE') {
        setError('ACCESS DENIED — INVALID CLEARANCE CODE');
      } else if (errorCode === 'TEAM_ALREADY_REGISTERED') {
        setError('UNIT NAME TAKEN — DESIGNATE ANOTHER CALLSIGN');
      } else if (errorCode === 'EVENT_NOT_ACTIVE') {
        setError('EVENT NOT ACCEPTING OPERATIVES YET');
      } else if (errorCode === 'TEAM_NOT_FOUND') {
        setError('UNIT NOT FOUND — VERIFY CALLSIGN');
      } else if (errorCode === 'INVALID_PASSWORD') {
        setError('ACCESS DENIED — INVALID PASSWORD');
      } else if (err.message.includes('INVALID_JOIN_CODE')) {
        setError('ACCESS DENIED — INVALID CLEARANCE CODE');
      } else if (err.message.includes('already')) {
        setError('UNIT NAME TAKEN — DESIGNATE ANOTHER CALLSIGN');
      } else {
        setError(err.message || 'Action failed. Try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background SVG Pattern placeholder */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, var(--neon-cyan) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <div className="z-10 w-full max-w-[480px]">
        <div className="text-center mb-10">
          <h1 className="font-orbitron font-black text-6xl text-[var(--neon-cyan)] animate-[glitch_2s_infinite]">
            TECH WARZONE<br/>2026
          </h1>
          <p className="font-rajdhani font-medium text-sm text-[var(--text-secondary)] tracking-[0.4em] mt-2">
            BOSS RAID PROTOCOL — INITIATED
          </p>
          <div className="h-[1px] w-full bg-[var(--neon-cyan)] mt-4 shadow-[var(--glow-cyan)]"></div>
        </div>

        <HudPanel className="p-8">
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => { setIsLoginMode(false); setError(''); }}
              className={`flex-1 py-2 font-rajdhani font-bold text-lg border-b-2 transition-colors ${!isLoginMode ? 'border-[var(--neon-cyan)] text-[var(--neon-cyan)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              NEW DEPLOYMENT
            </button>
            <button
              type="button"
              onClick={() => { setIsLoginMode(true); setError(''); }}
              className={`flex-1 py-2 font-rajdhani font-bold text-lg border-b-2 transition-colors ${isLoginMode ? 'border-[var(--neon-cyan)] text-[var(--neon-cyan)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              RESUME MISSION
            </button>
          </div>

          <form onSubmit={handleJoin} className="flex flex-col gap-6">
            <div>
              <input 
                type="text" 
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={loading}
                placeholder="DESIGNATE UNIT NAME" 
                className={`w-full bg-transparent border-b border-[var(--border-dim)] focus:border-[var(--neon-cyan)] text-[var(--text-primary)] font-mono p-2 focus:outline-none transition-colors disabled:opacity-50 ${error && !teamName ? 'border-[var(--neon-red)] shadow-[var(--glow-red)]' : ''}`}
              />
            </div>
            
            {!isLoginMode && (
              <div>
                <textarea 
                  rows="4" 
                  value={members}
                  onChange={(e) => setMembers(e.target.value)}
                  disabled={loading}
                  placeholder="LIST OPERATIVES (one per line)" 
                  className={`w-full bg-transparent border border-[var(--border-dim)] focus:border-[var(--neon-cyan)] text-[var(--text-primary)] font-mono p-2 focus:outline-none transition-colors resize-none disabled:opacity-50 ${error && !members ? 'border-[var(--neon-red)] shadow-[var(--glow-red)]' : ''}`}
                />
              </div>
            )}

            <div>
              <input 
                type="text" 
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                disabled={loading}
                placeholder="ENTER EVENT CODE" 
                className={`w-full bg-transparent border-b border-[var(--border-dim)] focus:border-[var(--neon-cyan)] text-[var(--text-primary)] font-mono p-2 tracking-[0.3em] uppercase focus:outline-none transition-colors disabled:opacity-50 ${error && eventCode.length < 4 ? 'border-[var(--neon-red)] shadow-[var(--glow-red)]' : ''}`}
              />
            </div>

            <div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="ENTER PASSWORD" 
                className={`w-full bg-transparent border-b border-[var(--border-dim)] focus:border-[var(--neon-cyan)] text-[var(--text-primary)] font-mono p-2 focus:outline-none transition-colors disabled:opacity-50 ${error && !password ? 'border-[var(--neon-red)] shadow-[var(--glow-red)]' : ''}`}
              />
            </div>

            {error && (
              <p className="text-[var(--neon-red)] font-mono text-sm animate-pulse">
                {error}
              </p>
            )}

            <HudButton 
              type="submit" 
              variant="success" 
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="text-xl">▶</span> {loading ? (isLoginMode ? 'CONNECTING...' : 'DEPLOYING...') : (isLoginMode ? 'RESUME MISSION' : 'DEPLOY TEAM')}
            </HudButton>
          </form>
        </HudPanel>
      </div>
    </div>
  );
};

export default JoinPage;
