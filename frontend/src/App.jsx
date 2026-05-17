import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  EventProvider,
  GameStateProvider,
  TeamStateProvider,
  LeaderboardProvider,
} from './context';
import JoinPage from './pages/JoinPage';
import PlayerPortal from './pages/PlayerPortal';
import AdminLayout from './pages/admin/AdminLayout';

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/join" />} />
      <Route path="/join" element={<JoinPage />} />
      <Route
        path="/play/:eventId"
        element={
          <GameStateProvider>
            <TeamStateProvider>
              <LeaderboardProvider>
                <PlayerPortal />
              </LeaderboardProvider>
            </TeamStateProvider>
          </GameStateProvider>
        }
      />
      <Route
        path="/admin/*"
        element={
          <GameStateProvider>
            <LeaderboardProvider>
              <AdminLayout />
            </LeaderboardProvider>
          </GameStateProvider>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <EventProvider>
        <AppContent />
      </EventProvider>
    </BrowserRouter>
  );
}

export default App;
