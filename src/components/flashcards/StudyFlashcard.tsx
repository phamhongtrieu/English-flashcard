import { motion, useReducedMotion } from 'motion/react'
import { FlashcardPreview } from './FlashcardPreview'
import type { Flashcard } from '../../types/flashcard'
import { PronunciationButton } from './PronunciationButton'

export function StudyFlashcard({ card, flipped, onFlip, unitName, onAnswerVisible }: { card: Flashcard; flipped: boolean; onFlip: () => void; unitName: string; onAnswerVisible?: () => void }) {
  const reducedMotion = useReducedMotion()
  return <div className="study-flashcard" role="button" tabIndex={0}
    aria-label="Lật flashcard" aria-pressed={flipped} aria-describedby="study-card-hint"
    onClick={onFlip}
    onKeyDown={event => {
      if (event.target !== event.currentTarget) return
      if (event.key !== ' ' && event.key !== 'Enter') return
      event.preventDefault()
      if (!event.repeat && !event.nativeEvent.isComposing) onFlip()
    }}>
    <motion.div key={card.id} className="study-flashcard-rotator" initial={false}
      onAnimationComplete={() => { if (flipped) onAnswerVisible?.() }}
      animate={{ rotateY: flipped ? 180 : 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.4, 0, 0.2, 1] }}>
      <div className="study-flashcard-face" aria-hidden={flipped}><FlashcardPreview card={card} unitName={unitName} /></div>
      <div className="study-flashcard-face study-flashcard-back" aria-hidden={!flipped}><FlashcardPreview card={card} unitName={unitName} answer pronunciation={<PronunciationButton key={card.id} english={card.english} active={flipped} />} /></div>
    </motion.div>
  </div>
}
