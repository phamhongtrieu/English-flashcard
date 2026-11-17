export interface QuizApproval {
  rightsStatus: 'verified' | 'unverified'
  rightsReference: string
  contentStatus: 'approved' | 'pending'
}

export interface QuizLesson {
  id: string
  number: number
  title: string
  dataFile: string | null
}

export interface QuizCollection {
  id: string
  title: string
  kind: 'toeic' | 'sample'
  approval: QuizApproval
  lessons: QuizLesson[]
}

/** Reviewed distractor IDs are mandatory: lexical heuristics cannot prove meaning. */
export interface QuizEntry {
  id: string
  lessonId: string
  english: string
  vietnamese: string
  partOfSpeech: string | null
  quiz: {
    status: 'approved'
    answerAliases: string[]
    distractorIds: string[]
  }
}

export interface QuizLessonData {
  schemaVersion: 1
  collectionId: string
  lessonId: string
  approval: QuizApproval
  entries: QuizEntry[]
}

export interface QuizQuestion {
  id: string
  prompt: string
  partOfSpeech: string | null
  options: { id: string; english: string }[]
  correctId: string
}

export interface LoadedQuizLesson {
  lesson: QuizLesson
  collection: QuizCollection
  questions: QuizQuestion[]
  reason: string | null
}

export interface QuizCatalog {
  lessons: LoadedQuizLesson[]
  warnings: string[]
}

export interface QuizAttempt {
  id: string
  startedAt: string
  updatedAt: string
  total: number
  answers: { questionId: string; correct: boolean }[]
}

export interface QuizProgress {
  version: 1
  correct: number
  incorrect: number
  completedRuns: number
  answeredQuestionIds: string[]
  attempts: QuizAttempt[]
}
