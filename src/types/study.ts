import type { FlashcardCategory } from './flashcard'

export type StudyMode = 'all' | 'new' | 'learning'

export type PartOfSpeechFilter = 'all' | 'n' | 'v' | 'adj' | 'adv' | 'other'
export interface StudyFilters {
  section: string
  category: FlashcardCategory | 'all'
  partOfSpeech: PartOfSpeechFilter
}
