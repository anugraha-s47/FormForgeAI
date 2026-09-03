import {createContext, useContext, useEffect, useState} from 'react'
import {api} from '../lib/api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'formforge-token'

export function AuthProvider({children}) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      if (!token) {
        if (active) setLoading(false)
        return
      }

      try {
        const data = await api.me(token)
        if (active) setUser(data.user)
      } catch (_error) {
        localStorage.removeItem(TOKEN_KEY)
        if (active) {
          setToken('')
          setUser(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    bootstrap()
    return () => {
      active = false
    }
  }, [token])

  const storeSession = (payload) => {
    localStorage.setItem(TOKEN_KEY, payload.token)
    setToken(payload.token)
    setUser(payload.user)
  }

  const signup = async (payload) => {
    const data = await api.signup(payload)
    storeSession(data)
    return data
  }

  const login = async (payload) => {
    const data = await api.login(payload)
    storeSession(data)
    return data
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setUser(null)
  }

  return <AuthContext.Provider value={{token, user, loading, signup, login, logout}}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)