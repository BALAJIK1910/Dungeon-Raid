/**
 * Seed test data to Firestore
 * Run: node seed-test-data.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'techwar-6e1d6-firebase-adminsdk-key.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (err) {
  console.error('❌ Service account key not found. Using default credentials...');
  admin.initializeApp();
}

const db = admin.firestore();

async function seedTestData() {
  try {
    console.log('🌱 Starting seed process...\n');

    // 1. Create test event (if doesn't exist)
    console.log('📝 Creating test event...');
    const eventRef = db.collection('events').doc('test_event_1');
    await eventRef.set({
      event_name: 'Test Raid',
      game_status: 'PENDING',
      boss_name: 'System Overlord',
      boss_max_hp: 1000,
      boss_current_hp: 1000,
      join_code: 'TESTCODE',
      active_puzzle_id: 'puzzle_1',
      hint_tokens_per_team: 3,
      powerups_enabled: true,
      created_at: new Date(),
    }, { merge: true });
    console.log('✅ Event created/updated\n');

    // 2. Create global_state subcollection
    console.log('📝 Creating global_state...');
    const globalStateRef = db.collection('events').doc('test_event_1').collection('global_state').doc('state');
    await globalStateRef.set({
      game_status: 'PENDING',
      active_puzzle_id: 'puzzle_1',
      active_puzzle_status: 'PLAYING',
      boss_name: 'System Overlord',
      boss_current_hp: 1000,
      boss_max_hp: 1000,
      created_at: new Date(),
    }, { merge: true });
    console.log('✅ Global state created\n');

    // 3. Create puzzle_pool with test puzzle
    console.log('📝 Creating test puzzle...');
    const puzzleRef = db.collection('events').doc('test_event_1').collection('puzzle_pool').doc('puzzle_1');
    await puzzleRef.set({
      sequence_order: 1,
      question_type: 'TEXT',
      question_payload: 'What is 2 + 2?',
      correct_answer: '4',
      fixed_damage_value: 100,
      hint_damage_penalty: 10,
      hint_text: 'It\'s a small number',
      time_bonus_enabled: false,
      created_at: new Date(),
    }, { merge: true });
    console.log('✅ Test puzzle created\n');

    console.log('🎉 Seed complete! Data structure:');
    console.log('  📍 /events/test_event_1');
    console.log('     📂 Event document');
    console.log('     📂 /global_state/state');
    console.log('     📂 /puzzle_pool/puzzle_1');
    console.log('\n✨ Ready to test! Event code: TESTCODE');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  }
}

seedTestData();
