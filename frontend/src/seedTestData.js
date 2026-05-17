import { db } from './firebase/config';
import { collection, doc, setDoc } from 'firebase/firestore';

/**
 * Run this once to seed test data into Firestore
 * Usage: Copy into browser console and run
 */
async function seedTestPuzzle() {
  try {
    console.log('🌱 Seeding test puzzle...');
    
    const puzzleRef = doc(db, 'events', 'test_event_1', 'puzzle_pool', 'puzzle_1');
    
    await setDoc(puzzleRef, {
      sequence_order: 1,
      question_type: 'TEXT',
      question_payload: 'What is 2 + 2?',
      correct_answer: '4',
      fixed_damage_value: 100,
      hint_damage_penalty: 10,
      hint_text: 'It\'s a small number',
      time_bonus_enabled: false,
      created_at: new Date(),
    });
    
    console.log('✅ Test puzzle created!');
    console.log('Path: /events/test_event_1/puzzle_pool/puzzle_1');
  } catch (err) {
    console.error('❌ Error seeding puzzle:', err);
  }
}

// Expose globally for console access
window.seedTestPuzzle = seedTestPuzzle;

console.log('📝 To seed test data, run: seedTestPuzzle()');
