import { createContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ProgressContextValue } from '../../types/progress'
import { loadProgress, parseCardStatus, parseProgressKey, progressKey, PROGRESS_KEY, statusOf, writeCardStatus } from '../../utils/progress'

export const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadProgress)
  const unsaved = useRef(new Set<string>())
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === null) { unsaved.current.clear(); setState(loadProgress()); return }
      if (!event.key.startsWith(PROGRESS_KEY + ':')) return
      const ids = parseProgressKey(event.key)
      if (!ids) return
      const [unitId, cardId] = ids
      unsaved.current.delete(event.key)
      const status = parseCardStatus(event.newValue)
      setState(previous => {
        const unit = { ...previous.progress[unitId] }
        if (status) unit[cardId] = status
        else delete unit[cardId]
        return { ...previous, invalidEntries: previous.invalidEntries || (event.newValue !== null && !status), progress: { ...previous.progress, [unitId]: unit } }
      })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value: ProgressContextValue = {
    ...state,
    statusOf: (unitId, cardId) => statusOf(state.progress, unitId, cardId),
    markCard: (unitId, cardId, status) => {
      const saved = writeCardStatus(unitId, cardId, status)
      const key = progressKey(unitId, cardId)
      if (saved) unsaved.current.delete(key)
      else unsaved.current.add(key)
      const allSaved = saved && unsaved.current.size === 0
      setState(previous => ({ ...previous, storageAvailable: allSaved, progress: {
        ...previous.progress, [unitId]: { ...previous.progress[unitId], [cardId]: status },
      } }))
    },
  }
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}
