# Tech Warzone 2026 — Backend Implementation

Complete Firebase backend for the Tech Warzone 2026 cooperative-competitive boss raid platform.

## Structure

```
backend/
├── functions/                    # Cloud Functions v2 (Node.js 20)
│   ├── src/
│   │   ├── index.js             # Entry point, exports all functions
│   │   ├── submitAnswer.js      # Answer submission & damage logic
│   │   ├── activatePowerup.js   # Power-up activation
│   │   ├── useHint.js           # Hint token consumption
│   │   ├── organiserControl.js  # Game state management
│   │   ├── registerTeam.js      # Team registration
│   │   ├── createEvent.js       # Event creation
│   │   ├── utils.js             # Game logic helpers
│   │   ├── errors.js            # Custom error types
│   │   ├── authHelpers.js       # Auth utilities
│   │   └── dbHelpers.js         # Database initialization
│   └── package.json
├── firestore-rules/
│   ├── firestore.rules          # Security rules (asymmetric access)
│   ├── firestore.indexes.json   # Required Firestore indexes
│   └── package.json
├── firebase.json                # Firebase project config
└── README.md                    # This file
```

## Cloud Functions

### 1. **submitAnswer** (`submitAnswer(eventId, puzzleId, answerText)`)
Validates team answer submissions with atomic transaction.

**Response:**
- `{ status: 'CORRECT', damage_dealt, new_team_total, new_boss_hp, game_concluded }`
- `{ status: 'WRONG', cooldown_seconds, strike_count, shield_used }`
- `{ status: 'error', code, message }`

**Features:**
- Answer normalization (lowercase, trim)
- Exponential cooldown on wrong answers (10s → 20s → 40s... capped at 120s)
- Shield power-up absorption
- Double Damage multiplier
- Time bonus detection
- Atomic boss HP reduction
- Automatic puzzle advance on correct answer
- Battle log entry creation

### 2. **activatePowerup** (`activatePowerup(eventId, powerupType, targetTeamId?)`)
Activate a power-up for the calling team.

**Power-up Types:**
- `SHIELD` — Nullifies next incorrect-answer cooldown
- `DOUBLE_DAMAGE` — Next correct answer deals 2× damage
- `TIME_FREEZE` — Adds 10 seconds to current intermission
- `SABOTAGE` — Forces target team into 15-second lockout

**Response:**
- `{ status: 'ACTIVATED', powerup_type, duration_ms, message }`
- Writes to `powerup_ledger` and `battle_log`

### 3. **useHint** (`useHint(eventId, puzzleId)`)
Consume a hint token and reveal puzzle hint.

**Response:**
- `{ status: 'SUCCESS', hint_text, penalty_applied, remaining_hint_tokens, new_total_damage }`
- Deducts `hint_damage_penalty` from team total damage

### 4. **organiserControl** (`organiserControl(eventId, action)`)
Organizer-only game state management.

**Actions:**
- `START` — Transition from PENDING to ACTIVE
- `PAUSE` — Pause active game
- `RESUME` — Resume paused game
- `INSTANT_KILL` — Defeat boss immediately
- `ADVANCE_PUZZLE` — Skip to next puzzle without awarding damage
- `TOGGLE_POWERUPS` — Enable/disable power-up system

**Response:**
- `{ status: 'SUCCESS', action, new_game_status, message }`

### 5. **registerTeam** (`registerTeam(eventId, joinCode, teamName, memberNames)`)
Register a team for an event and receive authentication token.

**Response:**
- `{ status: 'REGISTERED', team_id, custom_token, hint_tokens, message }`
- Creates anonymous Firebase Auth user with custom claims
- One team per event guaranteed (checked atomically)

### 6. **createEvent** (`createEvent(event_name, boss_name, boss_avatar_url, boss_max_hp, ...)`)
Organizer-only function to create a new event.

**Response:**
- `{ status: 'SUCCESS', event_id, join_code, event_name, boss_name, message }`
- Generates unique 6-character join code
- Initializes `global_state` document

## Firestore Schema

### `/events/{eventId}`
**Global State Document**
```javascript
{
  event_name: string,
  game_status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CONCLUDED',
  boss_name: string,
  boss_avatar_url: string,
  boss_max_hp: number,
  boss_current_hp: number,
  active_puzzle_id: string | null,
  active_puzzle_index: number,
  active_puzzle_status: 'PLAYING' | 'INTERMISSION',
  intermission_until: Timestamp,
  intermission_duration_ms: number,
  last_solved_by_team: string,
  last_solved_at: Timestamp,
  join_code: string (6-char),
  hint_tokens_per_team: number,
  powerups_enabled: boolean,
  created_at: Timestamp,
  created_by: string (organizer UID)
}
```

### `/events/{eventId}/teams/{teamId}`
**Team Document**
```javascript
{
  team_id: string,
  team_name: string,
  registered_members: Array<string>,
  total_damage_dealt: number,
  puzzles_solved: number,
  submission_cooldown_expiry: Timestamp | null,
  cooldown_strike_count: number,
  active_powerups: Array<string>,
  hint_tokens: number,
  shield_active: boolean,
  registered_at: Timestamp,
  uid: string (Firebase Auth UID)
}
```

### `/events/{eventId}/puzzle_pool/{puzzleId}`
**Puzzle Document**
```javascript
{
  puzzle_id: string,
  sequence_order: number,
  question_payload: string (Markdown),
  question_type: 'TEXT' | 'CODE' | 'CIPHER' | 'IMAGE_URL',
  correct_answer: string (normalized),
  answer_aliases: Array<string>,
  fixed_damage_value: number,
  hint_text: string,
  hint_damage_penalty: number,
  time_bonus_enabled: boolean,
  time_bonus_window_seconds: number,
  time_bonus_damage: number,
  created_at: Timestamp
}
```

### `/events/{eventId}/battle_log/{logId}`
**Battle Log Entry (Append-Only)**
```javascript
{
  log_id: string,
  timestamp: Timestamp,
  event_type: 'PUZZLE_SOLVED' | 'HINT_USED' | 'POWERUP_ACTIVATED' | 'GAME_EVENT',
  team_name: string,
  team_id: string,
  puzzle_id: string | null,
  damage_dealt: number,
  message: string,
  // Additional fields based on event_type
}
```

### `/events/{eventId}/powerup_ledger/{ledgerId}`
**Power-up Usage Ledger**
```javascript
{
  ledger_id: string,
  team_id: string,
  team_name: string,
  powerup_type: string,
  activated_at: Timestamp,
  expires_at: Timestamp | null,
  target_team_id: string | null,
  target_team_name: string | null
}
```

## Security Rules

### Asymmetric Access (Teams vs Organizers)

**Teams:**
- Can only read their own team document
- Can only read non-sensitive puzzle fields (text, type, not answer/damage)
- Cannot see boss HP or damage values
- Cannot modify global state
- Can read battle log for context

**Organizers:**
- Can read all data (full global state, all teams, all puzzles)
- Can write to global state and manage events
- Cannot directly write to battle log or powerup ledger (Cloud Functions only)

### Key Security Features
- All mutations go through Cloud Functions (atomic transactions)
- Custom claims enforce role-based access
- Firestore Rules validate access at database layer
- Answer validation, damage calculation, cooldown management server-side only
- Boss HP hidden from team tokens

## Setup & Deployment

### 1. Prerequisites
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project created at [Firebase Console](https://console.firebase.google.com)

### 2. Installation
```bash
cd backend/functions
npm install
```

### 3. Local Development (Emulator)
```bash
firebase emulators:start --import=data --export-on-exit
```

### 4. Deploy to Production
```bash
firebase deploy --only functions,firestore:rules,firestore:indexes
```

### 5. Create First Event (via Firebase Console)
```javascript
// In Firebase Cloud Functions logs
const createEvent = require('./functions/src/createEvent');
await createEvent({
  event_name: "Tech Fest 2026",
  boss_name: "The Algorithm Guardian",
  boss_avatar_url: "https://...",
  boss_max_hp: 1000,
  intermission_duration_ms: 5000
}, { auth: { uid: "organizer_uid", token: { role: "organizer" } } });
```

## Testing & Validation

### Example Payloads

**Register Team**
```javascript
{
  eventId: "abc123xyz",
  joinCode: "A7K92M",
  teamName: "ByteKnights",
  memberNames: ["Alice", "Bob", "Charlie"]
}
```

**Submit Answer**
```javascript
{
  eventId: "abc123xyz",
  puzzleId: "puzzle_0",
  answerText: "my answer"
}
```

**Activate Power-Up**
```javascript
{
  eventId: "abc123xyz",
  powerupType: "DOUBLE_DAMAGE"
}
```

## Monitoring & Logs

View real-time logs:
```bash
firebase functions:log
```

## Common Issues

### "TEAM_ALREADY_REGISTERED"
- Team name already exists in this event
- Solution: Use unique team name or register for a different event

### "SUBMISSION_LOCKED"
- Team is in cooldown from wrong answer
- Cooldown duration returned in error response

### "TOO_LATE"
- Answer submitted after puzzle was solved
- Wait for next puzzle in intermission

### "GAME_NOT_ACTIVE"
- Game status is not ACTIVE (check organizer console)
- Organizer must call START action first

## Performance Notes

- Designed for **50 concurrent teams** per event
- Firestore billing: $0.06 per 100k reads, $0.18 per 100k writes
- Cloud Functions: $0.40 per million invocations
- Real-time listeners use IndexedDB persistence for offline resilience

## Architecture Decisions

1. **No Direct Client Writes** — All mutations via Cloud Functions for integrity
2. **Atomic Transactions** — Complex operations (answer submission) use transactions
3. **Server-Side Calculations** — Damage, cooldown, time bonus computed server-side
4. **Asymmetric Security Rules** — Different data visibility based on role
5. **Append-Only Audit Trail** — Battle log for post-event analysis
