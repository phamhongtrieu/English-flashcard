import type { Flashcard } from '../types/flashcard'
import type { PartOfSpeechFilter, StudyFilters } from '../types/study'
import type { StudyMode } from '../types/study'
import type { CardStatus } from '../types/progress'

export const matchesStudyMode = (status: CardStatus, mode: StudyMode) => mode === 'all' || status === mode

export const defaultStudyFilters = (): StudyFilters => ({ section: 'all', category: 'all', partOfSpeech: 'all' })

export function matchesPartOfSpeech(value: Flashcard['partOfSpeech'], filter: PartOfSpeechFilter): boolean {
  if (filter === 'all') return true
  const parts = value?.toLowerCase().split('/').map(part => {
    const normalized = part.trim()
    return normalized === 'n.pl' ? 'n' : normalized === 'phr.v' ? 'v' : normalized
  }) ?? []
  const known = parts.filter(part => ['n', 'v', 'adj', 'adv'].includes(part))
  return filter === 'other' ? known.length === 0 : known.includes(filter)
}

export function filterFlashcards(cards: readonly Flashcard[], filters: StudyFilters): Flashcard[] {
  return cards.filter(card => (filters.section === 'all' || card.section === filters.section)
    && (filters.category === 'all' || card.category === filters.category)
    && matchesPartOfSpeech(card.partOfSpeech, filters.partOfSpeech))
}

/** Fisher–Yates trên bản sao, không thay đổi dữ liệu nguồn. */
export function shuffleFlashcards(cards: readonly Flashcard[]): Flashcard[] {
  const result = [...cards]
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}
