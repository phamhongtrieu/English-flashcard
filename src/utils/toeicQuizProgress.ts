import type { QuizAttempt, QuizProgress } from '../types/toeicQuiz'

export const TOEIC_QUIZ_KEY = 'english-flashcard-toeic-quiz-v1'
export const toeicQuizProgressKey = (collectionId: string, lessonId: string) => `${TOEIC_QUIZ_KEY}:${encodeURIComponent(collectionId)}:${encodeURIComponent(lessonId)}`
export const emptyQuizProgress = (): QuizProgress => ({ version: 1, correct: 0, incorrect: 0, completedRuns: 0, answeredQuestionIds: [], attempts: [] })
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))

export function parseQuizProgress(raw: string | null): QuizProgress | null {
  if (raw === null) return emptyQuizProgress()
  try {
    const value: unknown = JSON.parse(raw)
    if (!object(value) || value.version !== 1 || !count(value.correct) || !count(value.incorrect) || !count(value.completedRuns)
      || !Array.isArray(value.answeredQuestionIds) || !value.answeredQuestionIds.every(identifier)
      || new Set(value.answeredQuestionIds).size !== value.answeredQuestionIds.length
      || !Array.isArray(value.attempts) || value.attempts.length > 20) return null
    const runIds = new Set<string>()
    for (const attempt of value.attempts) {
      if (!object(attempt) || !identifier(attempt.id) || runIds.has(attempt.id) || !date(attempt.startedAt) || !date(attempt.updatedAt)
        || !count(attempt.total) || attempt.total < 1 || attempt.total > 10 || !Array.isArray(attempt.answers)
        || attempt.answers.length > attempt.total) return null
      const questionIds = new Set<string>()
      for (const answer of attempt.answers) {
        if (!object(answer) || !identifier(answer.questionId) || questionIds.has(answer.questionId) || typeof answer.correct !== 'boolean') return null
        questionIds.add(answer.questionId)
      }
      runIds.add(attempt.id)
    }
    return value as unknown as QuizProgress
  } catch { return null }
}

export function loadQuizProgress(collectionId: string, lessonId: string): { progress: QuizProgress; warning: boolean } {
  try {
    const progress = parseQuizProgress(localStorage.getItem(toeicQuizProgressKey(collectionId, lessonId)))
    return { progress: progress ?? emptyQuizProgress(), warning: progress === null }
  } catch { return { progress: emptyQuizProgress(), warning: true } }
}

/** One answer is an idempotent event; unrelated Flashcard keys are never read or written. */
export function addQuizAnswer(progress: QuizProgress, run: Pick<QuizAttempt, 'id' | 'startedAt' | 'total'>,
  questionId: string, correct: boolean, now = new Date().toISOString()): QuizProgress {
  const previous = progress.attempts.find(attempt => attempt.id === run.id)
  if (previous?.answers.some(answer => answer.questionId === questionId) || (previous && previous.answers.length >= previous.total)) return progress
  const attempt: QuizAttempt = { ...run, updatedAt: now, answers: [...(previous?.answers ?? []), { questionId, correct }] }
  return { version: 1, correct: progress.correct + Number(correct), incorrect: progress.incorrect + Number(!correct),
    completedRuns: progress.completedRuns + Number(attempt.answers.length === run.total),
    answeredQuestionIds: [...new Set([...progress.answeredQuestionIds, questionId])],
    attempts: [...progress.attempts.filter(item => item.id !== run.id), attempt].slice(-20) }
}

export function persistQuizProgress(collectionId: string, lessonId: string, progress: QuizProgress): boolean {
  try { localStorage.setItem(toeicQuizProgressKey(collectionId, lessonId), JSON.stringify(progress)); return true }
  catch { return false }
}

export function quizAccuracy(progress: Pick<QuizProgress, 'correct' | 'incorrect'>): number {
  const answered = progress.correct + progress.incorrect
  return answered ? Math.round(progress.correct / answered * 100) : 0
}
