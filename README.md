# Tech Warzone 2026 - Full-Stack Multiplayer Raid Game

A real-time multiplayer game where teams solve puzzles to defeat a boss, with organizer controls and live leaderboard.

**Stack:** Firebase (Firestore + Auth + Cloud Functions) + React 18 + Vite + Framer Motion

---

## 📚 Documentation

Choose your guide based on your needs:

| Guide | Best For | Read Time |
|-------|----------|-----------|
| **[STEP_BY_STEP.md](STEP_BY_STEP.md)** | First time setup - follow exact steps | 30 min |
| **[QUICK_START.md](QUICK_START.md)** | Already set up before, quick reminder | 5 min |
| **[SETUP_GUIDE.md](SETUP_GUIDE.md)** | Reference for all details | 20 min |
| **[backend/README.md](backend/README.md)** | Backend architecture & functions | - |
| **[frontend/README.md](frontend/README.md)** | Frontend components & hooks | - |
| **[tech_warzone_integration_prompt.md](tech_warzone_integration_prompt.md)** | Full technical contract | - |

---

## 🚀 Quick Start (Already Configured)

```powershell
# Terminal 1: Start frontend dev server
cd C:\TechWar\frontend
npm run dev
# Opens at http://localhost:5173/

# Terminal 2: (Optional) Monitor function logs
cd C:\TechWar\backend
firebase functions:log
```

Visit:
- **Player**: `http://localhost:5173/join` → Register team, join game
- **Organizer**: `http://localhost:5173/admin` → Control game, view stats

---

## 🎮 How to Play

### As a Team Player
1. Go to **Join** page
2. Enter team name, member names, event join code
3. Submit to register and sign in
4. See puzzles, submit answers
5. Watch real-time damage dealt and team ranking
6. Use hints (limited) to get clues
7. Collect power-ups

### As an Organizer
1. Sign in with Google
2. Go to **Admin** → **Arena View**
3. See boss HP, all team rankings, battle log
4. **START** game to begin
5. **PAUSE** / **RESUME** as needed
6. **ADVANCE PUZZLE** to skip current puzzle
7. **INSTANT KILL** to end game and show final podium

---

## 📁 Project Structure

```
C:\TechWar\
├── backend/                          # Firebase backend
│   ├── functions/src/                # Cloud Functions (Node.js)
│   │   ├── registerTeam.js           # Team registration & auth
│   │   ├── submitAnswer.js           # Answer validation & damage
│   │   ├── useHint.js                # Hint consumption
│   │   ├── activatePowerup.js        # Power-up system
│   │   ├── organiserControl.js       # Game control (START/PAUSE/etc)
│   │   └── ...
│   ├── firestore-rules/              # Security rules & indexes
│   └── firebase.json                 # Firebase config
│
├── frontend/                         # React frontend
│   ├── src/
│   │   ├── firebase/                 # Firebase SDK setup
│   │   │   ├── config.js             # Firebase initialization
│   │   │   ├── auth.js               # Auth helpers
│   │   │   └── functions.js          # Callable function wrappers
│   │   ├── hooks/                    # Real-time Firestore listeners
│   │   │   ├── useGameState.js       # Global game state
│   │   │   ├── useTeamState.js       # Team data
│   │   │   ├── useActivePuzzle.js    # Current puzzle
│   │   │   ├── useLeaderboard.js     # Team rankings
│   │   │   └── ...
│   │   ├── context/                  # React context providers
│   │   │   ├── AuthContext.jsx       # Auth state + claims
│   │   │   ├── EventContext.jsx      # Event ID management
│   │   │   ├── GameStateContext.jsx  # Shared game state
│   │   │   └── ...
│   │   ├── pages/                    # Main pages
│   │   │   ├── JoinPage.jsx          # Team registration
│   │   │   ├── PlayerPortal.jsx      # Game board with state machine
│   │   │   └── admin/                # Organizer pages
│   │   ├── components/               # Reusable components
│   │   ├── design-system/            # CSS variables & animations
│   │   └── App.jsx                   # Router & providers
│   ├── .env                          # Firebase credentials (don't commit)
│   ├── .env.example                  # Template
│   └── package.json
│
├── STEP_BY_STEP.md                   # 📖 Setup guide with screenshots
├── QUICK_START.md                    # ⚡ Quick reference
└── SETUP_GUIDE.md                    # 📚 Detailed documentation
```

---

## 🔄 Real-Time Architecture

Every component subscribes to Firestore changes via custom hooks:

```
Firestore Collections
    ↓
useGameState() → Global puzzle/boss state
useTeamState() → Team damage/cooldown/hints
useActivePuzzle() → Current puzzle content
useLeaderboard() → Team rankings
useBattleLog() → Event history
    ↓
React Context Providers (prevent duplicate subscriptions)
    ↓
Components (auto-update on data change)
```

**Cloud Functions handle game logic atomically:**
- Answer validation
- Damage calculations
- Cooldown enforcement
- Puzzle advancement
- Power-up effects

---

## 🔐 Security Model

### Authentication
- **Teams**: Anonymous auth with custom claims
- **Organizers**: Google sign-in + UID allowlist (`admin_users`)

### Firestore Security Rules
- Players can only read player-safe fields (questions, not answers)
- Teams can only update their own documents
- Organizers can read all data
- Cloud Functions are trusted to write game state

---

## ⚙️ Key Features

| Feature | Status | Details |
|---------|--------|---------|
| Real-time Firestore sync | ✅ | All data updates live across all clients |
| Team registration | ✅ | Secure team creation with member list |
| Puzzle submission | ✅ | Answer validation with damage calculation |
| Cooldown system | ✅ | Exponential backoff on wrong answers |
| Power-ups | ✅ | SHIELD, DOUBLE_DAMAGE, TIME_FREEZE, SABOTAGE |
| Hints | ✅ | Limited tokens with damage penalty |
| Organizer controls | ✅ | START/PAUSE/RESUME/ADVANCE_PUZZLE/INSTANT_KILL |
| Live scoreboard | ✅ | Real-time team rankings by damage |
| Battle log | ✅ | Event audit trail |
| Connection monitoring | ✅ | Status banner when offline |
| Admin auth guard | ✅ | Role-based access control |

---

## 🛠️ Development

### Building Frontend
```powershell
cd frontend
npm run build  # Optimized production build
npm run dev    # Start dev server with hot reload
```

### Deploying Backend
```powershell
cd backend
firebase deploy --only functions      # Deploy Cloud Functions
firebase deploy --only firestore:rules # Deploy security rules
firebase deploy --only firestore:indexes # Deploy indexes
firebase deploy                        # Deploy everything
```

### Environment Setup
Create `.env` in `frontend/` with Firebase credentials:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

---

## 📦 Dependencies

### Frontend
- React 19.2
- React Router 7.15
- Framer Motion 12.38 (animations)
- Lucide React 1.16 (icons)
- Firebase 12.13 (SDK)
- Vite 5.x (build tool)

### Backend
- Firebase SDK (Cloud Functions)
- Firestore (database)
- Firebase Auth (authentication)

---

## 🚀 Deployment (Production)

### Deploy to Firebase Hosting
```powershell
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

Live at: `https://techwarzone-2026.web.app`

---

## 📖 API Reference

### Cloud Functions (Called from Frontend)

#### `registerTeam(eventId, joinCode, teamName, memberNames)`
Register new team and create auth session.

#### `submitAnswer(eventId, puzzleId, answerText)`
Submit answer to current puzzle.

#### `useHint(eventId, puzzleId)`
Consume a hint token and get clue.

#### `activatePowerup(eventId, powerupType, targetTeamId?)`
Activate earned power-up.

#### `organiserControl(eventId, action)`
Game control: START, PAUSE, RESUME, ADVANCE_PUZZLE, INSTANT_KILL.

See [backend/README.md](backend/README.md) for full API docs.

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Configuration not found" | Check `.env` in `frontend/` root |
| Functions deploy fails | Check `backend/functions/.env` |
| Join fails with "Invalid code" | Verify `join_code` in Firestore matches |
| Admin access denied | Check UID in `admin_users` collection |
| No real-time updates | Redeploy security rules |

See [STEP_BY_STEP.md](STEP_BY_STEP.md#-if-something-goes-wrong) for more troubleshooting.

---

## 📞 Quick Commands

```powershell
# Start development
npm run dev          # Frontend on port 5173
firebase functions:log  # Monitor backend

# Build & deploy
npm run build        # Production build
firebase deploy      # Deploy backend + hosting

# Check setup
cat frontend/.env    # View Firebase config
```

---

## 🎯 Next Steps

1. Follow [STEP_BY_STEP.md](STEP_BY_STEP.md) for first-time setup
2. Start dev server: `npm run dev`
3. Create test event in Firestore
4. Register as team and play
5. Sign in as organizer to control game

---

## 📝 License

Tech Warzone 2026 - All Rights Reserved

---

**Ready to raid?** 🎮 Let's go! Start with [STEP_BY_STEP.md](STEP_BY_STEP.md)
