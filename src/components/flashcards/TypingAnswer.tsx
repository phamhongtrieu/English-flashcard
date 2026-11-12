import { useId, useState } from 'react'
import type { Flashcard } from '../../types/flashcard'
import { isCorrectAnswer, normalizeAnswer } from '../../utils/answers'

export function TypingAnswer({ card, flipped, enabled, saved, onEnabled }: {
  card: Flashcard; flipped: boolean; enabled: boolean; saved: boolean; onEnabled: (enabled: boolean) => void
}) {
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const inputId = useId()
  const resultId = useId()
  return <section className="typing-answer" aria-label="Luyện gõ đáp án">
    <label className="shuffle-control typing-toggle">
      <input type="checkbox" role="switch" checked={enabled} onChange={event => onEnabled(event.target.checked)} />
      Luyện gõ đáp án
    </label>
    {!saved && <p className="typing-storage-notice" role="status">Chưa thể lưu lựa chọn luyện gõ trên trình duyệt này.</p>}
    {enabled && !flipped && <form className="typing-form" onSubmit={event => {
      event.preventDefault()
      if (normalizeAnswer(answer)) setResult(isCorrectAnswer(answer, card) ? 'correct' : 'incorrect')
    }}>
      <label className="sr-only" htmlFor={inputId}>Đáp án tiếng Anh</label>
      <div className="typing-input-row">
        <input id={inputId} type="text" value={answer} placeholder="Nhập từ tiếng Anh bạn nhớ..."
          autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          aria-describedby={result ? resultId : undefined}
          onChange={event => { setAnswer(event.target.value); setResult(null) }}
          onKeyDown={event => {
            if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.repeat)) event.preventDefault()
          }} />
        <button className="button button-primary" type="submit" disabled={!normalizeAnswer(answer)}>Kiểm tra</button>
      </div>
      <p id={resultId} className={`typing-result${result ? ` ${result}` : ''}`} role="status" aria-live="polite" aria-atomic="true">
        {result === 'correct' ? 'Chính xác!' : result === 'incorrect' ? 'Chưa chính xác, hãy thử lại!' : ''}
      </p>
    </form>}
  </section>
}
