import type { QuizApproval, QuizCatalog, QuizCollection, QuizEntry, QuizLessonData } from '../types/toeicQuiz'
import { makeQuizQuestions, quizTextKey } from '../utils/toeicQuiz'

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const id = (value: unknown): value is string => text(value) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(text)
const approvalShape = (value: unknown): value is QuizApproval => object(value)
  && ['verified', 'unverified'].includes(String(value.rightsStatus)) && typeof value.rightsReference === 'string'
  && ['approved', 'pending'].includes(String(value.contentStatus))
export const quizApproved = (approval: QuizApproval) => approval.rightsStatus === 'verified'
  && approval.contentStatus === 'approved' && approval.rightsReference.trim().length > 0

export function validateQuizManifest(value: unknown): QuizCollection[] {
  if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.collections)) throw new Error('Danh mục TOEIC không hợp lệ.')
  const collectionIds = new Set<string>()
  const lessonIds = new Set<string>()
  const files = new Set<string>()
  for (const collection of value.collections) {
    if (!object(collection) || !id(collection.id) || collectionIds.has(collection.id) || !text(collection.title)
      || !['toeic', 'sample'].includes(String(collection.kind)) || !approvalShape(collection.approval)
      || !Array.isArray(collection.lessons)) throw new Error('Bộ trắc nghiệm không hợp lệ.')
    collectionIds.add(collection.id)
    const numbers = new Set<number>()
    for (const lesson of collection.lessons) {
      if (!object(lesson) || !id(lesson.id) || lessonIds.has(lesson.id) || !text(lesson.title)
        || !Number.isInteger(lesson.number) || Number(lesson.number) < 1 || numbers.has(Number(lesson.number))
        || (lesson.dataFile !== null && (!text(lesson.dataFile) || !/^data\/toeic\/lessons\/[a-z0-9-]+\.json$/.test(lesson.dataFile) || files.has(lesson.dataFile)))) {
        throw new Error('Thông tin bài trắc nghiệm không hợp lệ hoặc trùng ID.')
      }
      lessonIds.add(lesson.id)
      numbers.add(Number(lesson.number))
      if (text(lesson.dataFile)) files.add(lesson.dataFile)
    }
  }
  return value.collections as QuizCollection[]
}

export function validateQuizLesson(value: unknown, collectionId: string, lessonId: string): QuizLessonData {
  if (!object(value) || value.schemaVersion !== 1 || value.collectionId !== collectionId || value.lessonId !== lessonId
    || !approvalShape(value.approval) || !quizApproved(value.approval) || !Array.isArray(value.entries) || !value.entries.length) {
    throw new Error('Dữ liệu bài chưa hợp lệ hoặc chưa được duyệt quyền sử dụng/nội dung.')
  }
  const ids = new Set<string>()
  const english = new Set<string>()
  for (const entry of value.entries) {
    if (!object(entry) || !id(entry.id) || ids.has(entry.id) || entry.lessonId !== lessonId
      || !text(entry.english) || english.has(quizTextKey(entry.english)) || !text(entry.vietnamese)
      || !(entry.partOfSpeech === null || text(entry.partOfSpeech)) || !object(entry.quiz)
      || entry.quiz.status !== 'approved' || !strings(entry.quiz.answerAliases)
      || !Array.isArray(entry.quiz.distractorIds) || entry.quiz.distractorIds.length < 3
      || !entry.quiz.distractorIds.every(id) || new Set(entry.quiz.distractorIds).size !== entry.quiz.distractorIds.length
      || entry.quiz.distractorIds.includes(entry.id)) throw new Error('Câu hỏi chưa được rà soát hoặc dữ liệu đáp án không hợp lệ.')
    ids.add(entry.id)
    english.add(quizTextKey(entry.english))
  }
  return value as unknown as QuizLessonData
}

async function readJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`, { signal })
  if (!response.ok) throw new Error(`Không tải được dữ liệu (${response.status}).`)
  return response.json()
}

/** Only the independently authored public catalog is read, never preparation files. */
export async function loadToeicQuizCatalog(signal?: AbortSignal): Promise<QuizCatalog> {
  const collections = validateQuizManifest(await readJson('data/toeic/catalog.json', signal))
  const warnings: string[] = []
  const lessons: QuizCatalog['lessons'] = []
  for (const collection of collections) {
    const results = await Promise.all(collection.lessons.map(async lesson => {
      if (!quizApproved(collection.approval) || !lesson.dataFile) return { lesson, entries: [] as QuizEntry[], reason: 'Đang chuẩn bị dữ liệu được phép sử dụng.' }
      try {
        const data = validateQuizLesson(await readJson(lesson.dataFile, signal), collection.id, lesson.id)
        return { lesson, entries: data.entries, reason: null }
      } catch (error) {
        if (signal?.aborted) throw error
        const reason = error instanceof Error ? error.message : 'Dữ liệu không hợp lệ.'
        warnings.push(`${lesson.title}: ${reason}`)
        return { lesson, entries: [] as QuizEntry[], reason }
      }
    }))
    // IDs must be unique across this collection, not just within each lesson.
    const counts = new Map<string, number>()
    for (const result of results) for (const entry of result.entries) counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1)
    const conflicting = new Set(results.filter(result => result.entries.some(entry => counts.get(entry.id)! > 1)).map(result => result.lesson.id))
    const pool = results.filter(result => !conflicting.has(result.lesson.id)).flatMap(result => result.entries)
    for (const result of results) {
      const questions = conflicting.has(result.lesson.id) ? [] : makeQuizQuestions(result.entries, pool)
      const reason = result.reason ?? (conflicting.has(result.lesson.id) ? 'ID bị trùng giữa các bài.'
        : questions.length ? null : 'Chưa đủ bốn đáp án đã rà soát; bài chưa mở.')
      lessons.push({ collection, lesson: result.lesson, questions, reason })
    }
  }
  return { lessons, warnings }
}
