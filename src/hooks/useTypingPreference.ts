import { useState } from 'react'

export const TYPING_PREFERENCE_KEY = 'english-flashcard-typing-enabled-v1'

export function useTypingPreference() {
  const [preference, setPreference] = useState(() => {
    try {
      const value = localStorage.getItem(TYPING_PREFERENCE_KEY)
      return { enabled: value !== 'false', saved: true }
    } catch { return { enabled: true, saved: false } }
  })
  function setEnabled(enabled: boolean) {
    let saved = true
    try { localStorage.setItem(TYPING_PREFERENCE_KEY, String(enabled)) }
    catch { saved = false }
    setPreference({ enabled, saved })
  }
  return { ...preference, setEnabled }
}
