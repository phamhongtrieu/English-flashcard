import { Layers3, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { partOfSpeechLabels } from '../../data'
import type { Flashcard } from '../../types/flashcard'

export function FlashcardPreview({ card, answer = false, decorative = false, unitName, pronunciation }: { card: Flashcard; answer?: boolean; decorative?: boolean; unitName?: string; pronunciation?: ReactNode }) {
  return <div className={`flashcard ${answer ? 'flashcard-answer' : ''} ${decorative ? 'flashcard-hero' : ''}`}>
    <div className="flashcard-top"><span><Layers3 size={15} />{answer ? 'MẶT SAU · TIẾNG ANH' : 'MẶT TRƯỚC · TIẾNG VIỆT'}</span><Sparkles size={18} /></div>
    <div className="flashcard-content"><span className="card-eyebrow">{answer ? 'TỪ VỰNG' : 'NGHĨA CỦA TỪ'}</span><h3>{answer ? card.english : card.vietnamese}</h3><span className="part-of-speech">{card.partOfSpeech ? partOfSpeechLabels[card.partOfSpeech] : 'PDF không ghi loại từ'}</span>{pronunciation !== undefined && <div className="pronunciation-slot">{pronunciation}</div>}</div>
    <div className="flashcard-bottom"><span>{unitName ?? card.unitId}</span><span>{answer ? 'Tiếng Anh' : 'Tiếng Việt'}</span></div>
  </div>
}
