import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { useEvent } from '../../context';
import HudPanel from '../../components/layout/HudPanel';
import HudButton from '../../components/layout/HudButton';

export default function EventCreator() {
  const navigate = useNavigate();
  const { setEventId } = useEvent();

  const [formData, setFormData] = useState({
    event_name: '',
    boss_name: '',
    boss_avatar_url: '',
    boss_max_hp: 1000,
    intermission_duration_ms: 5000,
    hint_tokens_per_team: 2,
    powerups_enabled: true,
  });

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [deleteLoading, setDeleteLoading] = useState({});

  useEffect(() => {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sort client-side instead of server-side to avoid index requirements
      eventsList.sort((a, b) => {
        const timeA = a.created_at instanceof Date ? a.created_at : (a.created_at?.toDate?.() || new Date(0));
        const timeB = b.created_at instanceof Date ? b.created_at : (b.created_at?.toDate?.() || new Date(0));
        return timeB - timeA;
      });
      setEvents(eventsList);
    }, (error) => {
      console.error('Error listening to events:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'boss_max_hp' || name === 'intermission_duration_ms' || name === 'hint_tokens_per_team' ? parseInt(value) : value,
    }));
  };

  const validateForm = () => {
    if (!formData.event_name.trim()) {
      setMessageType('error');
      setMessage('✗ Event name is required');
      return false;
    }
    if (!formData.boss_name.trim()) {
      setMessageType('error');
      setMessage('✗ Boss name is required');
      return false;
    }
    if (formData.boss_max_hp <= 0) {
      setMessageType('error');
      setMessage('✗ Boss HP must be greater than 0');
      return false;
    }
    if (formData.intermission_duration_ms < 1000 || formData.intermission_duration_ms > 60000) {
      setMessageType('error');
      setMessage('✗ Intermission duration must be between 1000ms and 60000ms');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const eventData = {
        event_name: formData.event_name,
        boss_name: formData.boss_name,
        boss_avatar_url: formData.boss_avatar_url || 'https://via.placeholder.com/400',
        boss_max_hp: formData.boss_max_hp,
        boss_current_hp: formData.boss_max_hp,
        game_status: 'PENDING',
        active_puzzle_id: null,
        active_puzzle_index: 0,
        active_puzzle_status: 'PENDING',
        intermission_until: null,
        intermission_duration_ms: formData.intermission_duration_ms,
        hint_tokens_per_team: formData.hint_tokens_per_team,
        powerups_enabled: formData.powerups_enabled,
        created_at: new Date(),
        join_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        last_solved_by_team: null,
        last_solved_at: null,
      };

      const eventsRef = collection(db, 'events');
      const docRef = await addDoc(eventsRef, eventData);

      setMessageType('success');
      setMessage(`✓ Event "${formData.event_name}" created successfully! ID: ${docRef.id}`);

      setFormData({
        event_name: '',
        boss_name: '',
        boss_avatar_url: '',
        boss_max_hp: 1000,
        intermission_duration_ms: 5000,
        hint_tokens_per_team: 2,
        powerups_enabled: true,
      });

      setTimeout(() => setMessage(''), 4000);
    } catch (error) {
      console.error('Event creation error:', error);
      setMessageType('error');
      setMessage(`✗ Failed to create event: ${error.message}`);
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (eventId) => {
    setEventId(eventId);
    setMessageType('success');
    setMessage(`✓ Event selected! Navigating to Arena View...`);
    setTimeout(() => {
      navigate('/admin/arena');
    }, 500);
  };

  const handleDeleteEvent = async (eventId, eventName) => {
    if (!window.confirm(`Are you sure you want to delete event "${eventName}"? This cannot be undone.`)) {
      return;
    }

    setDeleteLoading((prev) => ({ ...prev, [eventId]: true }));

    try {
      const eventRef = doc(db, 'events', eventId);
      await deleteDoc(eventRef);
      setMessageType('success');
      setMessage(`✓ Event "${eventName}" deleted successfully`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Event deletion error:', error);
      setMessageType('error');
      setMessage(`✗ Failed to delete event: ${error.message}`);
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  return (
    <div className="p-8 flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="font-orbitron text-4xl text-[var(--neon-green)] mb-2">
          EVENT GENESIS
        </h1>
        <p className="font-mono text-[var(--text-secondary)] text-sm">
          Create a new raid event and configure the boss parameters
        </p>
      </div>

      {/* Creation Form */}
      <HudPanel className="p-6 max-w-2xl">
        <h2 className="font-rajdhani font-bold text-[var(--neon-cyan)] tracking-[0.3em] mb-6">
          NEW EVENT CONFIGURATION
        </h2>

        {message && (
          <div className={`mb-6 p-3 border rounded font-mono text-sm ${messageType === 'success'
            ? 'bg-[var(--neon-green)]/10 border-[var(--neon-green)] text-[var(--neon-green)]'
            : 'bg-[var(--neon-red)]/10 border-[var(--neon-red)] text-[var(--neon-red)]'
            }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Event Name */}
          <div>
            <label className="font-rajdhani text-[var(--text-secondary)] block mb-2">
              Event Name *
            </label>
            <input
              type="text"
              name="event_name"
              value={formData.event_name}
              onChange={handleInputChange}
              placeholder="e.g., Finals Raid 2026"
              className="w-full px-4 py-2 bg-[var(--bg-raised)] border border-[var(--neon-cyan)] text-[var(--text-primary)] font-mono rounded focus:outline-none focus:border-[var(--neon-cyan)]/50"
              disabled={loading}
            />
          </div>

          {/* Boss Name */}
          <div>
            <label className="font-rajdhani text-[var(--text-secondary)] block mb-2">
              Boss Name *
            </label>
            <input
              type="text"
              name="boss_name"
              value={formData.boss_name}
              onChange={handleInputChange}
              placeholder="e.g., The Algorithm"
              className="w-full px-4 py-2 bg-[var(--bg-raised)] border border-[var(--neon-cyan)] text-[var(--text-primary)] font-mono rounded focus:outline-none focus:border-[var(--neon-cyan)]/50"
              disabled={loading}
            />
          </div>

          {/* Boss Avatar URL */}
          <div>
            <label className="font-rajdhani text-[var(--text-secondary)] block mb-2">
              Boss Avatar URL (optional)
            </label>
            <input
              type="url"
              name="boss_avatar_url"
              value={formData.boss_avatar_url}
              onChange={handleInputChange}
              placeholder="https://example.com/boss.png"
              className="w-full px-4 py-2 bg-[var(--bg-raised)] border border-[var(--neon-cyan)] text-[var(--text-primary)] font-mono rounded focus:outline-none focus:border-[var(--neon-cyan)]/50"
              disabled={loading}
            />
          </div>

          {/* Boss Max HP */}
          <div>
            <label className="font-rajdhani text-[var(--text-secondary)] block mb-2">
              Boss Max HP *
            </label>
            <input
              type="number"
              name="boss_max_hp"
              value={formData.boss_max_hp}
              onChange={handleInputChange}
              min="1"
              className="w-full px-4 py-2 bg-[var(--bg-raised)] border border-[var(--neon-cyan)] text-[var(--text-primary)] font-mono rounded focus:outline-none focus:border-[var(--neon-cyan)]/50"
              disabled={loading}
            />
          </div>

          {/* Intermission Duration */}
          <div>
            <label className="font-rajdhani text-[var(--text-secondary)] block mb-2">
              Intermission Duration (ms) - between 1000 and 60000
            </label>
            <input
              type="number"
              name="intermission_duration_ms"
              value={formData.intermission_duration_ms}
              onChange={handleInputChange}
              min="1000"
              max="60000"
              step="1000"
              className="w-full px-4 py-2 bg-[var(--bg-raised)] border border-[var(--neon-cyan)] text-[var(--text-primary)] font-mono rounded focus:outline-none focus:border-[var(--neon-cyan)]/50"
              disabled={loading}
            />
          </div>

          {/* Hint Tokens Per Team */}
          <div>
            <label className="font-rajdhani text-[var(--text-secondary)] block mb-2">
              Hint Tokens Per Team
            </label>
            <input
              type="number"
              name="hint_tokens_per_team"
              value={formData.hint_tokens_per_team}
              onChange={handleInputChange}
              min="0"
              className="w-full px-4 py-2 bg-[var(--bg-raised)] border border-[var(--neon-cyan)] text-[var(--text-primary)] font-mono rounded focus:outline-none focus:border-[var(--neon-cyan)]/50"
              disabled={loading}
            />
          </div>

          {/* Powerups Enabled */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="powerups_enabled"
              name="powerups_enabled"
              checked={formData.powerups_enabled}
              onChange={handleInputChange}
              className="w-5 h-5 accent-[var(--neon-cyan)]"
              disabled={loading}
            />
            <label htmlFor="powerups_enabled" className="font-rajdhani text-[var(--text-secondary)]">
              Enable Powerups
            </label>
          </div>

          {/* Submit Button */}
          <HudButton
            type="submit"
            disabled={loading}
            className="w-full mt-4"
            variant="success"
          >
            {loading ? '⏳ CREATING EVENT...' : '⚡ CREATE EVENT'}
          </HudButton>
        </form>
      </HudPanel>

      {/* Recent Events */}
      <HudPanel className="p-6">
        <h2 className="font-rajdhani font-bold text-[var(--neon-cyan)] tracking-[0.3em] mb-4">
          RECENT EVENTS
        </h2>
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
          {events.length === 0 ? (
            <p className="font-mono text-[var(--text-muted)] text-sm">No events created yet</p>
          ) : (
            events.slice(0, 10).map((event) => (
              <div
                key={event.id}
                className="p-4 bg-[var(--bg-raised)] rounded border border-[var(--border-dim)] hover:border-[var(--neon-cyan)]/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-rajdhani font-semibold text-[var(--text-primary)]">
                      {event.event_name}
                    </h3>
                    <p className="font-mono text-xs text-[var(--text-muted)]">
                      ID: {event.id}
                    </p>
                  </div>
                  <span className={`font-mono text-xs px-2 py-1 rounded ${event.game_status === 'PENDING'
                    ? 'bg-[var(--neon-yellow)]/20 text-[var(--neon-yellow)]'
                    : event.game_status === 'ACTIVE'
                      ? 'bg-[var(--neon-green)]/20 text-[var(--neon-green)]'
                      : 'bg-[var(--neon-red)]/20 text-[var(--neon-red)]'
                    }`}>
                    {event.game_status}
                  </span>
                </div>
                <div className="flex gap-4 font-mono text-xs text-[var(--text-secondary)] mb-3">
                  <span>Boss: {event.boss_name}</span>
                  <span>HP: {event.boss_current_hp}/{event.boss_max_hp}</span>
                  <span>Code: {event.join_code}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectEvent(event.id)}
                    className="flex-1 px-3 py-2 bg-[var(--neon-cyan)] text-[var(--bg-deep)] font-rajdhani font-bold text-sm rounded hover:bg-[var(--neon-cyan)]/80 transition-colors disabled:opacity-50"
                    disabled={deleteLoading[event.id]}
                  >
                    SELECT EVENT
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id, event.event_name)}
                    className="px-3 py-2 bg-[var(--neon-red)] text-white font-rajdhani font-bold text-sm rounded hover:bg-[var(--neon-red)]/80 transition-colors disabled:opacity-50"
                    disabled={deleteLoading[event.id]}
                  >
                    {deleteLoading[event.id] ? '⏳' : '🗑'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </HudPanel>
    </div>
  );
}
