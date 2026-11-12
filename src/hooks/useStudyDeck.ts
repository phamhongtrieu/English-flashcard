import { useState } from 'react'
import type { Flashcard } from '../types/flashcard'
import type { StudyFilters, StudyMode } from '../types/study'
import type { CardStatus } from '../types/progress'
import { defaultStudyFilters, filterFlashcards, matchesStudyMode, shuffleFlashcards } from '../utils/studyDeck'

export function useStudyDeck(source: readonly Flashcard[], statusOf: (unitId: string, cardId: string) => CardStatus, initialMode: StudyMode = 'all') {
  function createCards(filters: StudyFilters, shuffled: boolean, mode: StudyMode) {
    const matches = filterFlashcards(source, filters).filter(card => matchesStudyMode(statusOf(card.unitId, card.id), mode))
    return shuffled ? shuffleFlashcards(matches) : matches
  }
  const [deck, setDeck] = useState(() => ({
    filters: defaultStudyFilters(), shuffled: false, mode: initialMode,
    cards: createCards(defaultStudyFilters(), false, initialMode), revision: 0,
  }))
  function startDeck(filters: StudyFilters, shuffled: boolean, mode: StudyMode) {
    const cards = createCards(filters, shuffled, mode)
    setDeck(previous => ({ filters, shuffled, mode, cards, revision: previous.revision + 1 }))
  }
  return {
    ...deck,
    setFilters: (filters: StudyFilters) => startDeck(filters, deck.shuffled, deck.mode),
    setShuffled: (shuffled: boolean) => startDeck(deck.filters, shuffled, deck.mode),
    setMode: (mode: StudyMode) => startDeck(deck.filters, deck.shuffled, mode),
    restart: () => startDeck(deck.filters, deck.shuffled, deck.mode),
    resetFilters: () => startDeck(defaultStudyFilters(), deck.shuffled, deck.mode),
  }
}
