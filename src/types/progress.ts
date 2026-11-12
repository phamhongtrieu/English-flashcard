export type CardStatus = 'new' | 'known' | 'learning'
export type ProgressMap = Record<string, Record<string, CardStatus>>
export interface LearningProgress {
  progress: ProgressMap
  storageAvailable: boolean
  invalidEntries: boolean
}
export interface ProgressContextValue extends LearningProgress {
  statusOf: (unitId: string, cardId: string) => CardStatus
  markCard: (unitId: string, cardId: string, status: 'known' | 'learning') => void
}
