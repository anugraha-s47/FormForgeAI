import {Link, Navigate, Route, Routes, useLocation} from 'react-router-dom'
import {useAuth} from './contexts/AuthContext'
import {useTheme} from './contexts/ThemeContext'
import BuilderPage from './pages/BuilderPage'
import DashboardPage from './pages/DashboardPage'
import PublicFormPage from './pages/PublicFormPage'
import AuthPage from './pages/AuthPage'
import LandingPage from './pages/LandingPage'

function ThemeToggle() {
  const {theme, toggleTheme} = useTheme()

  return (
    <button className="theme-toggle" onClick={toggleTheme} type="button">
      <span>{theme === 'dark' ? 'Light mode' : 'Night mode'}</span>
    </button>
  )
}

function ProtectedRoute({children}) {
  const {token, loading} = useAuth()
  const location = useLocation()

  if (loading) {
    return <main className="page centered-page">Loading your workspace...</main>
  }

  if (!token) {
    return <Navigate to="/auth" replace state={{from: location.pathname}} />
  }

  return children
}

function HomeRoute() {
  const {token, loading} = useAuth()

  if (loading) {
    return <main className="page centered-page">Preparing FormForge AI...</main>
  }

  return token ? <Navigate to="/workspace" replace /> : <LandingPage />
}

export default function App() {
  const {token, user, logout} = useAuth()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <Link className="brand" to={token ? '/workspace' : '/'}>
            FormForge AI
          </Link>
          <p className="topbar-copy">Prompt to form, with a cleaner builder and focused response flow.</p>
        </div>

        <div className="topbar-actions">
          <ThemeToggle />
          {token ? (
            <>
              <span className="user-chip">{user?.name || 'Creator'}</span>
              <button className="ghost-btn" type="button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <Link className="ghost-btn" to="/auth">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/workspace"
          element={
            <ProtectedRoute>
              <BuilderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/:id"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/forms/:slug" element={<PublicFormPage />} />
      </Routes>

      <div className="app-watermark">PoweredBy - NxtMock</div>
    </div>
  )
}