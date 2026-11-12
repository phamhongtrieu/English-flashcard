import flashcards from '../data/flashcards.json'
import type { LearningProgress } from '../types/progress'

export const PROGRESS_KEY = 'ef-progress-v1'
export const emptyProgress = (): LearningProgress => ({ version: 1, studiedCardIds: [], masteredCardIds: [] })
const validIds = new Set(flashcards.map(card => card.id))
export function normalizeProgress(value: unknown): LearningProgress {
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1) return emptyProgress()
  const data = value as Record<string, unknown>
  const clean = (ids: unknown): string[] => Array.isArray(ids)
    ? [...new Set(ids.filter((id): id is string => typeof id === 'string' && validIds.has(id)))] : []
  const studiedCardIds = clean(data.studiedCardIds)
  return { version: 1, studiedCardIds, masteredCardIds: clean(data.masteredCardIds).filter(id => studiedCardIds.includes(id)) }
}
export function loadProgress(): LearningProgress {
  try { return normalizeProgress(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null')) } catch { return emptyProgress() }
}
export function saveProgress(progress: LearningProgress): boolean {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(normalizeProgress(progress))); return true } catch { return false }
}
