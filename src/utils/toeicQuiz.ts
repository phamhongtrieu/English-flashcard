import type { QuizEntry, QuizQuestion } from '../types/toeicQuiz'

export const quizTextKey = (text: string) => text.normalize('NFC').trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ')

export function shuffleQuiz<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]]
  }
  return shuffled
}

export function makeQuizQuestions(entries: readonly QuizEntry[], pool: readonly QuizEntry[], random: () => number = Math.random): QuizQuestion[] {
  const questions: QuizQuestion[] = []
  for (const entry of entries) {
    const aliases = new Set([entry.english, ...entry.quiz.answerAliases].map(quizTextKey))
    const prompt = quizTextKey(entry.vietnamese)
    // Also exclude aliases on every entry sharing this exact prompt. Semantic
    // equivalence beyond this requires the explicit, human-reviewed allowlist.
    for (const candidate of pool) {
      if (quizTextKey(candidate.vietnamese) === prompt) {
        for (const answer of [candidate.english, ...candidate.quiz.answerAliases]) aliases.add(quizTextKey(answer))
      }
    }
    const allowed = new Set(entry.quiz.distractorIds)
    const safe = pool.filter(candidate => candidate.id !== entry.id && allowed.has(candidate.id)
      && ![candidate.english, ...candidate.quiz.answerAliases].some(answer => aliases.has(quizTextKey(answer)))
      && quizTextKey(candidate.vietnamese) !== prompt)
    const local = shuffleQuiz(safe.filter(candidate => candidate.lessonId === entry.lessonId), random)
    const fallback = shuffleQuiz(safe.filter(candidate => candidate.lessonId !== entry.lessonId), random)
    const used = new Set(aliases)
    const distractors: QuizEntry[] = []
    for (const candidate of [...local, ...fallback]) {
      const key = quizTextKey(candidate.english)
      if (used.has(key)) continue
      used.add(key)
      distractors.push(candidate)
      if (distractors.length === 3) break
    }
    if (distractors.length !== 3) continue
    questions.push({ id: entry.id, prompt: entry.vietnamese, partOfSpeech: entry.partOfSpeech,
      correctId: entry.id, options: shuffleQuiz([entry, ...distractors], random).map(({ id, english }) => ({ id, english })) })
  }
  return questions
}

export function createQuizRound(questions: readonly QuizQuestion[], random: () => number = Math.random): QuizQuestion[] {
  return shuffleQuiz(questions, random).slice(0, 10).map(question => ({ ...question, options: shuffleQuiz(question.options, random) }))
}

export function gradeQuizAnswer(question: QuizQuestion, selectedId: string): boolean {
  return question.options.some(option => option.id === selectedId) && selectedId === question.correctId
}
