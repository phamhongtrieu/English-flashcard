import { Volume2 } from 'lucide-react'
import { usePronunciation } from '../../hooks/usePronunciation'

export function PronunciationButton({ english, active }: { english: string; active: boolean }) {
  const { play, speaking, message } = usePronunciation(english, active)
  if (!active) return null
  return <div className="pronunciation-control">
    <button type="button" className={`pronunciation-button ${speaking ? 'is-speaking' : ''}`}
      aria-label="Phát âm tiếng Anh" aria-busy={speaking} title="Nghe phát âm tiếng Anh"
      onClick={event => { event.stopPropagation(); play() }}
      onKeyDown={event => {
        if (event.key !== ' ' && event.key !== 'Enter') return
        event.stopPropagation()
        if (event.repeat) event.preventDefault()
      }}
      onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') event.stopPropagation() }}>
      <Volume2 size={21} aria-hidden="true" />
    </button>
    <span className="pronunciation-status" role="status" aria-live="polite">{message}</span>
  </div>
}
