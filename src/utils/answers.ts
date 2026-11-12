import type { Flashcard } from '../types/flashcard'

export function normalizeAnswer(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US')
}

/** Only the canonical answer and explicitly declared alternatives are accepted. */
export function isCorrectAnswer(value: string, card: Pick<Flashcard, 'english' | 'acceptedAnswers'>): boolean {
  const answer = normalizeAnswer(value)
  return answer.length > 0 && [card.english, ...(card.acceptedAnswers ?? [])].some(candidate => normalizeAnswer(candidate) === answer)
}
