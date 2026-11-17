import type { Flashcard, UnitData } from './flashcard'

/** Preparation only. No TOEIC source data is imported into the application. */
export interface PreparedToeicCard extends Flashcard {
  partOfSpeechOriginal: string
  example: string
  exampleTranslation: string
  pronunciation: string
  explanation: string
  source: {
    record: number
    lineStart: number
    lineEnd: number
    topic: string
    topicUrl: string
  }
  review: {
    status: 'unreviewed' | 'needs-review'
    issues: { code: string; field: string; reason: string }[]
  }
}

export interface PreparedToeicUnitData extends UnitData {
  flashcards: PreparedToeicCard[]
  publication: { rightsStatus: 'unverified'; publishable: false }
}
