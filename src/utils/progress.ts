import type { Flashcard } from '../types/flashcard'
import type { CardStatus, LearningProgress, ProgressMap } from '../types/progress'

export const PROGRESS_KEY = 'english-flashcard-progress-v1'
export const progressKey = (unitId: string, cardId: string) => `${PROGRESS_KEY}:${encodeURIComponent(unitId)}:${encodeURIComponent(cardId)}`
const validId = (id: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
export function parseProgressKey(key: string): [string, string] | null {
  if (!key.startsWith(PROGRESS_KEY + ':')) return null
  try {
    const parts = key.slice(PROGRESS_KEY.length + 1).split(':').map(decodeURIComponent)
    return parts.length === 2 && parts.every(validId) ? [parts[0], parts[1]] : null
  } catch { return null }
}
export function parseCardStatus(raw: string | null): CardStatus | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null')
    if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1 || !('status' in value)) return null
    return value.status === 'new' || value.status === 'known' || value.status === 'learning' ? value.status : null
  } catch { return null }
}
export const statusOf = (progress: ProgressMap, unitId: string, cardId: string): CardStatus => progress[unitId]?.[cardId] ?? 'new'

export function loadProgress(): LearningProgress {
  const progress: ProgressMap = {}
  let invalidEntries = false
  let storageAvailable = true
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)
      if (!key?.startsWith(PROGRESS_KEY + ':') || key.endsWith(':probe')) continue
      const ids = parseProgressKey(key)
      const status = parseCardStatus(localStorage.getItem(key))
      if (!ids || !status) { invalidEntries = true; continue }
      const [unitId, cardId] = ids
      progress[unitId] = { ...progress[unitId], [cardId]: status }
    }
    // Kiểm tra quyền ghi sau khi đọc để vẫn giữ dữ liệu đã lưu khi quota đầy.
    const probe = PROGRESS_KEY + ':probe'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
  } catch { storageAvailable = false }
  return { progress, storageAvailable, invalidEntries }
}
export function writeCardStatus(unitId: string, cardId: string, status: CardStatus): boolean {
  if (!validId(unitId) || !validId(cardId) || !['new', 'known', 'learning'].includes(status)) return false
  try {
    localStorage.setItem(progressKey(unitId, cardId), JSON.stringify({ version: 1, status }))
    return true
  } catch { return false }
}
export function summarizeProgress(cards: readonly Flashcard[], progress: ProgressMap) {
  let known = 0, learning = 0
  for (const card of cards) {
    const status = statusOf(progress, card.unitId, card.id)
    if (status === 'known') known++
    if (status === 'learning') learning++
  }
  const total = cards.length
  return { total, known, learning, new: total - known - learning, percent: total ? Math.round(known / total * 10000) / 100 : 0 }
}
