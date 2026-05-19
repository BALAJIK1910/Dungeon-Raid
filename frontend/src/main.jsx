import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/boss-battle.css'
import App from './App.jsx'
import { AuthProvider } from './context'
import './seedTestData.js'  // Import seed functions for dev testing

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
