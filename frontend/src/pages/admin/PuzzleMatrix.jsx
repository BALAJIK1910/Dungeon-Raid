import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useEvent } from '../../context';
import { usePuzzlePool } from '../../hooks';
import { db } from '../../firebase/config';
import HudPanel from '../../components/layout/HudPanel';
import HudButton from '../../components/layout/HudButton';

const emptyPuzzle = {
  sequence_order: '',
  question_type: 'TEXT',
  question_payload: '',
  correct_answer: '',
  answer_aliases: '',
  fixed_damage_value: '100',
  hint_text: '',
  hint_damage_penalty: '10',
  time_bonus_enabled: false,
  time_bonus_window_seconds: '30',
  time_bonus_damage: '25',
};

function splitAliases(value) {
  return value
    .split(/[\n,]/)
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-rajdhani text-xs tracking-[0.2em] text-[var(--text-secondary)] uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full bg-[var(--bg-deep)] border border-[var(--border-dim)] text-[var(--text-primary)] font-mono px-3 py-2 focus:outline-none focus:border-[var(--neon-cyan)]';

export default function PuzzleMatrix() {
  const { eventId } = useEvent();
  const { puzzles, loading, error } = usePuzzlePool(eventId);
  const [form, setForm] = useState(emptyPuzzle);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const nextSequence = useMemo(() => {
    const maxSequence = puzzles.reduce(
      (max, puzzle) => Math.max(max, Number(puzzle.sequence_order) || 0),
      0
    );
    return maxSequence + 1;
  }, [puzzles]);

  useEffect(() => {
    setForm((current) => {
      if (current.sequence_order) return current;
      return { ...current, sequence_order: String(nextSequence) };
    });
  }, [nextSequence]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm({ ...emptyPuzzle, sequence_order: String(nextSequence + 1) });
  };

  const handleAddPuzzle = async (event) => {
    event.preventDefault();

    if (!eventId) {
      setMessage('Select an event in Arena View first.');
      return;
    }

    if (!form.question_payload.trim() || !form.correct_answer.trim()) {
      setMessage('Question and answer are required.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const puzzleRef = doc(collection(db, 'events', eventId, 'puzzle_pool'));
      const puzzleData = {
        puzzle_id: puzzleRef.id,
        sequence_order: Number(form.sequence_order) || nextSequence,
        question_type: form.question_type,
        question_payload: form.question_payload.trim(),
        correct_answer: form.correct_answer.trim(),
        answer_aliases: splitAliases(form.answer_aliases),
        fixed_damage_value: Number(form.fixed_damage_value) || 100,
        hint_text: form.hint_text.trim(),
        hint_damage_penalty: Number(form.hint_damage_penalty) || 0,
        time_bonus_enabled: form.time_bonus_enabled,
        time_bonus_window_seconds: Number(form.time_bonus_window_seconds) || 30,
        time_bonus_damage: Number(form.time_bonus_damage) || 0,
        created_at: Date.now(),
      };

      await setDoc(puzzleRef, puzzleData);
      setMessage(`Puzzle ${puzzleData.sequence_order} added.`);
      resetForm();
    } catch (err) {
      console.error('Puzzle add error:', err);
      setMessage(`Add failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePuzzle = async (puzzleId) => {
    if (!eventId || !window.confirm('Delete this puzzle from Firestore?')) return;

    try {
      await deleteDoc(doc(db, 'events', eventId, 'puzzle_pool', puzzleId));
      setMessage('Puzzle deleted.');
    } catch (err) {
      console.error('Puzzle delete error:', err);
      setMessage(`Delete failed: ${err.message}`);
    }
  };

  if (!eventId) {
    return (
      <div className="p-8">
        <h1 className="font-orbitron text-3xl text-[var(--neon-cyan)] mb-4">PUZZLE MATRIX</h1>
        <p className="font-mono text-[var(--text-secondary)]">Select an event in Arena View first.</p>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col gap-8">
      <div>
        <h1 className="font-orbitron text-3xl text-[var(--neon-cyan)] mb-2">PUZZLE MATRIX</h1>
        <p className="font-mono text-sm text-[var(--text-secondary)]">EVENT: {eventId}</p>
      </div>

      <HudPanel className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Plus size={18} className="text-[var(--neon-green)]" />
          <h2 className="font-rajdhani font-bold text-[var(--neon-green)] tracking-[0.3em]">
            ADD PUZZLE
          </h2>
        </div>

        <form onSubmit={handleAddPuzzle} className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <Field label="Sequence">
            <input
              className={inputClass}
              type="number"
              min="1"
              value={form.sequence_order}
              onChange={(event) => updateField('sequence_order', event.target.value)}
            />
          </Field>

          <Field label="Type">
            <select
              className={inputClass}
              value={form.question_type}
              onChange={(event) => updateField('question_type', event.target.value)}
            >
              <option value="TEXT">TEXT</option>
              <option value="CODE">CODE</option>
              <option value="MCQ">MCQ</option>
              <option value="IMAGE">IMAGE</option>
            </select>
          </Field>

          <Field label="Damage">
            <input
              className={inputClass}
              type="number"
              min="1"
              value={form.fixed_damage_value}
              onChange={(event) => updateField('fixed_damage_value', event.target.value)}
            />
          </Field>

          <Field label="Hint Penalty">
            <input
              className={inputClass}
              type="number"
              min="0"
              value={form.hint_damage_penalty}
              onChange={(event) => updateField('hint_damage_penalty', event.target.value)}
            />
          </Field>

          <Field label="Question">
            <textarea
              className={`${inputClass} min-h-[120px] resize-y`}
              value={form.question_payload}
              onChange={(event) => updateField('question_payload', event.target.value)}
            />
          </Field>

          <Field label="Correct Answer">
            <input
              className={inputClass}
              value={form.correct_answer}
              onChange={(event) => updateField('correct_answer', event.target.value)}
            />
          </Field>

          <Field label="Answer Aliases">
            <textarea
              className={`${inputClass} min-h-[120px] resize-y`}
              value={form.answer_aliases}
              onChange={(event) => updateField('answer_aliases', event.target.value)}
            />
          </Field>

          <Field label="Hint Text">
            <textarea
              className={`${inputClass} min-h-[120px] resize-y`}
              value={form.hint_text}
              onChange={(event) => updateField('hint_text', event.target.value)}
            />
          </Field>

          <div className="xl:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 border border-[var(--border-dim)] bg-[var(--bg-deep)] px-3 py-2">
              <input
                type="checkbox"
                checked={form.time_bonus_enabled}
                onChange={(event) => updateField('time_bonus_enabled', event.target.checked)}
              />
              <span className="font-rajdhani font-semibold text-[var(--text-primary)]">TIME BONUS</span>
            </label>

            <Field label="Bonus Window">
              <input
                className={inputClass}
                type="number"
                min="1"
                value={form.time_bonus_window_seconds}
                onChange={(event) => updateField('time_bonus_window_seconds', event.target.value)}
              />
            </Field>

            <Field label="Bonus Damage">
              <input
                className={inputClass}
                type="number"
                min="0"
                value={form.time_bonus_damage}
                onChange={(event) => updateField('time_bonus_damage', event.target.value)}
              />
            </Field>
          </div>

          <div className="xl:col-span-4 flex flex-wrap items-center gap-4">
            <HudButton
              type="submit"
              variant="success"
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save size={16} /> {saving ? 'SAVING' : 'SAVE PUZZLE'}
            </HudButton>
            {message && <p className="font-mono text-sm text-[var(--neon-amber)]">{message}</p>}
          </div>
        </form>
      </HudPanel>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        {loading && <p className="font-mono text-[var(--text-secondary)]">Loading puzzle pool...</p>}
        {error && <p className="font-mono text-[var(--neon-red)]">{error}</p>}
        {!loading && puzzles.length === 0 && (
          <p className="font-mono text-[var(--text-secondary)]">No puzzles loaded for this event.</p>
        )}

        {puzzles.map((puzzle) => (
          <div
            key={puzzle.puzzleId}
            className="border border-[var(--border-dim)] bg-[var(--bg-surface)] p-4"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="font-orbitron text-[var(--neon-cyan)] text-sm">
                  DIRECTIVE #{puzzle.sequence_order || '?'} / {puzzle.question_type || 'TEXT'}
                </p>
                <p className="font-mono text-xs text-[var(--text-muted)]">{puzzle.puzzleId}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDeletePuzzle(puzzle.puzzleId)}
                className="text-[var(--neon-red)] hover:drop-shadow-[var(--glow-red)]"
                title="Delete puzzle"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <p className="font-mono text-[var(--text-primary)] whitespace-pre-wrap mb-4">
              {puzzle.question_payload}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="font-rajdhani text-[var(--text-secondary)]">ANSWER</p>
                <p className="font-mono text-[var(--neon-green)]">{puzzle.correct_answer}</p>
              </div>
              <div>
                <p className="font-rajdhani text-[var(--text-secondary)]">DAMAGE</p>
                <p className="font-mono text-[var(--text-primary)]">{puzzle.fixed_damage_value || 0}</p>
              </div>
              <div>
                <p className="font-rajdhani text-[var(--text-secondary)]">ALIASES</p>
                <p className="font-mono text-[var(--text-primary)]">
                  {(puzzle.answer_aliases || []).length}
                </p>
              </div>
              <div>
                <p className="font-rajdhani text-[var(--text-secondary)]">BONUS</p>
                <p className="font-mono text-[var(--text-primary)]">
                  {puzzle.time_bonus_enabled ? `${puzzle.time_bonus_damage || 0}` : 'OFF'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
