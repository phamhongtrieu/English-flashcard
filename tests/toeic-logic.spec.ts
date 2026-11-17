import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createQuizRound, gradeQuizAnswer, makeQuizQuestions, quizTextKey } from '../src/utils/toeicQuiz'
import { quizApproved, validateQuizLesson, validateQuizManifest } from '../src/services/toeicQuizLoader'
import { addQuizAnswer, emptyQuizProgress, parseQuizProgress, quizAccuracy, toeicQuizProgressKey } from '../src/utils/toeicQuizProgress'
import type { QuizEntry, QuizLessonData } from '../src/types/toeicQuiz'

const sample: QuizLessonData = JSON.parse(readFileSync(new URL('../public/data/toeic/lessons/demo-01.json', import.meta.url), 'utf8'))
const manifest = JSON.parse(readFileSync(new URL('../public/data/toeic/catalog.json', import.meta.url), 'utf8'))

test('Mẫu: 4 đáp án khác nhau, 1 đáp án đúng, xáo trộn đủ A/B/C/D, lượt 10 câu không lặp', () => {
  const entries = validateQuizLesson(sample, 'toeic-sample', 'demo-01').entries
  expect(entries[0].vietnamese).toBe('Quả táo, loại quả thường có vỏ đỏ hoặc xanh')
  expect(manifest.collections[0].lessons[0].title).toBe('Bài TOEIC 01')
  const positions = new Set<number>()
  for (let seed = 1; seed <= 30; seed++) {
    let state = seed
    const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32 }
    const questions = makeQuizQuestions(entries, entries, random)
    expect(questions).toHaveLength(12)
    for (const question of questions) {
      expect(new Set(question.options.map(option => quizTextKey(option.english))).size).toBe(4)
      expect(question.options.filter(option => gradeQuizAnswer(question, option.id))).toHaveLength(1)
      positions.add(question.options.findIndex(option => option.id === question.correctId))
    }
    const round = createQuizRound(questions, random)
    expect(round).toHaveLength(10)
    expect(new Set(round.map(question => question.id)).size).toBe(10)
  }
  expect([...positions].sort()).toEqual([0, 1, 2, 3])
})

test('Ưu tiên cùng bài; chỉ fallback trong pool đã duyệt và danh sách cho phép', () => {
  const entries = structuredClone(sample.entries)
  const correct = entries[0]
  entries.slice(3).forEach(entry => { entry.lessonId = 'another-lesson' })
  const questions = makeQuizQuestions([correct], entries, () => 0.5)
  const chosen = questions[0].options.map(option => option.id)
  expect(chosen).toContain(entries[1].id)
  expect(chosen).toContain(entries[2].id)
  expect(questions[0].options).toHaveLength(4)
  const restricted: QuizEntry = { ...correct, quiz: { ...correct.quiz, distractorIds: entries.slice(1, 3).map(entry => entry.id) } }
  expect(makeQuizQuestions([restricted], entries)).toEqual([])
})

test('Loại đáp án đồng nghĩa, cùng nghĩa và chữ trùng; không đủ thì bỏ câu', () => {
  const entries = structuredClone(sample.entries.slice(0, 5))
  entries[0].quiz.distractorIds = entries.slice(1).map(entry => entry.id)
  entries[1].english = '  APPLE '
  entries[2].quiz.answerAliases = ['apple']
  entries[3].vietnamese = entries[0].vietnamese
  expect(makeQuizQuestions([entries[0]], entries)).toHaveLength(0)
  const duplicates = structuredClone(sample.entries.slice(0, 4))
  duplicates[2].english = duplicates[1].english.toUpperCase()
  expect(makeQuizQuestions([duplicates[0]], duplicates)).toHaveLength(0)
})

test('Chặn quyền chưa duyệt, câu chưa duyệt, trùng ID, file ngoại bộ và sai schema', () => {
  expect(validateQuizManifest(manifest)).toHaveLength(2)
  expect(quizApproved(manifest.collections[0].approval)).toBe(false)
  expect(quizApproved(manifest.collections[1].approval)).toBe(true)
  const unlicensed = structuredClone(sample)
  unlicensed.approval.rightsStatus = 'unverified'
  expect(() => validateQuizLesson(unlicensed, sample.collectionId, sample.lessonId)).toThrow()
  const pending = structuredClone(sample) as unknown as { entries: { quiz: { status: string } }[] }
  pending.entries[0].quiz.status = 'pending'
  expect(() => validateQuizLesson(pending, sample.collectionId, sample.lessonId)).toThrow()
  const duplicates = structuredClone(sample)
  duplicates.entries[1].id = duplicates.entries[0].id
  expect(() => validateQuizLesson(duplicates, sample.collectionId, sample.lessonId)).toThrow()
  for (const path of ['https://example.com/data.json', '../data-preparation/toeic/units/toeic-01.json', 'data/toeic/lessons/../../private.json']) {
    const bad = structuredClone(manifest)
    bad.collections[1].lessons[0].dataFile = path
    expect(() => validateQuizManifest(bad)).toThrow()
  }
})

test('Tính điểm, chống chấm hai lần, lịch sử giới hạn 20 và tiến độ độc lập', () => {
  const run = { id: 'run-test', startedAt: '2026-11-17T00:00:00.000Z', total: 2 }
  let progress = addQuizAnswer(emptyQuizProgress(), run, 'question-one', true)
  expect(addQuizAnswer(progress, run, 'question-one', false)).toEqual(progress)
  progress = addQuizAnswer(progress, run, 'question-two', false)
  expect(progress.correct).toBe(1)
  expect(progress.incorrect).toBe(1)
  expect(progress.completedRuns).toBe(1)
  expect(quizAccuracy(progress)).toBe(50)
  expect(progress.answeredQuestionIds).toHaveLength(2)
  for (let i = 0; i < 25; i++) progress = addQuizAnswer(progress, { ...run, id: `run-${i}`, total: 1 }, 'question-one', true)
  expect(progress.attempts).toHaveLength(20)
  expect(progress.completedRuns).toBe(26)
  expect(progress.correct).toBe(26)
  expect(parseQuizProgress(JSON.stringify(progress))).toEqual(progress)
  expect(parseQuizProgress('broken')).toBeNull()
  expect(parseQuizProgress('{"version":1}')).toBeNull()
  expect(parseQuizProgress(null)).toEqual(emptyQuizProgress())
  expect(toeicQuizProgressKey('toeic-sample', 'demo-01')).not.toBe(toeicQuizProgressKey('toeic-vocabulary', 'toeic-01'))
})
