import {createContext, useContext, useEffect, useState} from 'react'

const ThemeContext = createContext(null)
const THEME_KEY = 'formforge-theme'

export function ThemeProvider({children}) {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }

  return <ThemeContext.Provider value={{theme, toggleTheme}}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)