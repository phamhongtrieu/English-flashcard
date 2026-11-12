export type FlashcardCategory = 'base_word' | 'word_family' | 'synonym' | 'collocation'
export type PartOfSpeech = 'n' | 'v' | 'adj' | 'adv' | 'v/adj' | 'n/adj' | 'adj/n' | 'v/n' | 'n.pl'

export interface Flashcard {
  id: string
  unitId: string
  section: string
  category: FlashcardCategory
  vietnamese: string
  english: string
  partOfSpeech: PartOfSpeech | null
  /** Số hàng trong PDF gốc; null chỉ dành cho dữ liệu minh họa cũ. */
  sourceRow: number | null
}

export interface Unit {
  id: string
  number?: number
  title: string
  description: string
  sections: { id: string; title: string; description: string }[]
  dataFile: string
}

export interface UnitData {
  schemaVersion: 1
  unitId: string
  flashcards: Flashcard[]
  reviewNotes: { sourceRow: number; category: FlashcardCategory; original: string; reason: string }[]
}

export interface LoadedUnit { unit: Unit; data: UnitData }
