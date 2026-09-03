import {useState} from 'react'
import {Navigate, useLocation} from 'react-router-dom'
import {useAuth} from '../contexts/AuthContext'

const initialForm = {name: '', email: '', password: ''}

export default function AuthPage() {
  const {token, login, signup} = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState('signup')
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (token) {
    return <Navigate to={location.state?.from || '/workspace'} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      if (mode === 'signup') {
        await signup(form)
      } else {
        await login({email: form.email, password: form.password})
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page auth-page">
      <section className="auth-shell">
        <div className="auth-promo">
          <span className="eyebrow">Account</span>
          <h1>Build polished forms from a simple prompt.</h1>
          <p>Sign in to generate drafts, edit questions, publish links, and review responses in one compact workspace.</p>
          <div className="auth-metrics">
            <div>
              <strong>1 prompt</strong>
              <span>to draft a schema</span>
            </div>
            <div>
              <strong>2 modes</strong>
              <span>light and dark</span>
            </div>
            <div>
              <strong>Live preview</strong>
              <span>before publishing</span>
            </div>
          </div>
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="segmented-control">
            <button className={mode === 'signup' ? 'segmented active' : 'segmented'} type="button" onClick={() => setMode('signup')}>
              Sign up
            </button>
            <button className={mode === 'login' ? 'segmented active' : 'segmented'} type="button" onClick={() => setMode('login')}>
              Login
            </button>
          </div>

          {mode === 'signup' && (
            <input
              className="input"
              placeholder="Your name"
              value={form.name}
              onChange={(event) => setForm({...form, name: event.target.value})}
            />
          )}

          <input
            className="input"
            type="email"
            placeholder="name@company.com"
            value={form.email}
            onChange={(event) => setForm({...form, email: event.target.value})}
          />

          <input
            className="input"
            type="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={(event) => setForm({...form, password: event.target.value})}
          />

          {error && <p className="error-text">{error}</p>}

          <button className="primary-btn wide-btn" type="submit" disabled={busy}>
            {busy ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}