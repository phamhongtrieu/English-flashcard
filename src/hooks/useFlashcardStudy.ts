import { useCallback, useEffect, useState } from 'react'

export function useFlashcardStudy(cardCount: number) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const flip = () => setFlipped(value => !value)
  const move = useCallback((direction: -1 | 1) => {
    // Không reset mặt thẻ khi điều hướng vượt đầu/cuối danh sách.
    if (index + direction < 0 || index + direction >= cardCount) return
    setIndex(index + direction)
    setFlipped(false)
  }, [index, cardCount])

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

  return { index, flipped, flip, previous: () => move(-1), next: () => move(1) }
}
