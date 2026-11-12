import { useEffect, useState } from 'react'

export function useTheme() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    try { localStorage.setItem('ef-theme', isDark ? 'dark' : 'light') } catch { /* Vẫn đổi giao diện khi bộ nhớ bị chặn. */ }
  }, [isDark])
  return { isDark, toggleTheme: () => setIsDark(value => !value) }
}
