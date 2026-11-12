import { useCallback, useEffect, useState } from 'react'
import type { Flashcard } from '../types/flashcard'

export function useFlashcardStudy(cards: readonly Flashcard[]) {
  const [cursor, setCursor] = useState({ id: cards[0]?.id, flipped: false, completed: false })
  const index = Math.max(0, cards.findIndex(card => card.id === cursor.id))
  const card = cards[index]
  const flipped = cursor.id === card?.id && cursor.flipped
  const flip = () => { if (card && !cursor.completed) setCursor({ id: card.id, flipped: !flipped, completed: false }) }
  const move = useCallback((direction: -1 | 1) => {
    if (cursor.completed || !card || index + direction < 0 || index + direction >= cards.length) return
    setCursor({ id: cards[index + direction].id, flipped: false, completed: false })
  }, [cards, card, cursor.completed, index])
  // Chọn ID kế tiếp trước khi cập nhật trạng thái khiến danh sách ôn thu ngắn.
  function advanceAfterRating() {
    const nextCard = cards[index + 1]
    setCursor({ id: nextCard?.id, flipped: false, completed: !nextCard })
  }
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [role="textbox"], [role="combobox"], [role="slider"]'))) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      move(event.key === 'ArrowLeft' ? -1 : 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [move])
  return { index, card, flipped, flip, previous: () => move(-1), next: () => move(1), completed: cursor.completed, advanceAfterRating }
}
