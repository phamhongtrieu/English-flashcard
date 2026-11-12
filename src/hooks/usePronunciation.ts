import { useCallback, useEffect, useRef, useState } from 'react'

type Issue = 'unsupported' | 'no-english' | 'error' | null

function speechEngine(): SpeechSynthesis | null {
  try {
    const engine = window.speechSynthesis
    return engine && typeof window.SpeechSynthesisUtterance === 'function'
      && typeof engine.getVoices === 'function' && typeof engine.speak === 'function'
      && typeof engine.cancel === 'function' ? engine : null
  } catch { return null }
}

export function chooseEnglishVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const language = (voice: SpeechSynthesisVoice) => voice.lang.toLowerCase().replaceAll('_', '-')
  const english = voices.filter(voice => /^en(?:-|$)/.test(language(voice)))
  return english.find(voice => language(voice) === 'en-us')
    ?? english.find(voice => voice.default) ?? english[0]
}

/** Mỗi lần đọc được giữ bằng ref; cleanup không gọi setState. */
export function usePronunciation(text: string, active: boolean) {
  const [speaking, setSpeaking] = useState(false)
  const [issue, setIssue] = useState<Issue>(null)
  const mounted = useRef(false)
  const engine = useRef<SpeechSynthesis | null>(null)
  const current = useRef<SpeechSynthesisUtterance | null>(null)

  const cancelCurrent = useCallback(() => {
    const utterance = current.current
    if (!utterance) return
    current.current = null
    utterance.onstart = null
    utterance.onend = null
    utterance.onerror = null
    try { engine.current?.cancel() } catch { /* Không để lỗi engine ảnh hưởng Flashcard. */ }
  }, [])

  useEffect(() => {
    mounted.current = true
    const synth = speechEngine()
    engine.current = synth
    if (!synth) setIssue('unsupported')
    const refreshVoices = () => {
      if (!mounted.current || !synth) return
      try {
        // Tải trước danh sách, nhưng không tự phát khi voiceschanged.
        const voice = chooseEnglishVoice(synth.getVoices())
        if (voice) setIssue(previous => previous === 'no-english' ? null : previous)
      } catch { setIssue('error') }
    }
    refreshVoices()
    try { synth?.addEventListener('voiceschanged', refreshVoices) } catch { setIssue('error') }
    return () => {
      mounted.current = false
      try { synth?.removeEventListener('voiceschanged', refreshVoices) } catch { /* Cleanup vẫn hủy lượt đọc. */ }
      cancelCurrent()
      engine.current = null
    }
  }, [cancelCurrent])

  useEffect(() => {
    if (active) return
    cancelCurrent()
    setSpeaking(false)
    setIssue(engine.current ? null : 'unsupported')
  }, [active, cancelCurrent])

  function play() {
    if (!active || !mounted.current) return
    const synth = engine.current
    if (!synth) { setIssue('unsupported'); return }
    cancelCurrent()
    setSpeaking(false)
    setIssue(null)
    try {
      // speechSynthesis là hàng đợi dùng chung: hủy trước khi thêm lượt đọc mới.
      synth.cancel()
      const voice = chooseEnglishVoice(synth.getVoices())
      if (!voice) { setIssue('no-english'); return }
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.voice = voice
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1
      current.current = utterance
      const isCurrent = () => mounted.current && current.current === utterance
      utterance.onstart = () => { if (isCurrent()) setSpeaking(true) }
      utterance.onend = () => {
        if (!isCurrent()) return
        current.current = null
        setSpeaking(false)
      }
      utterance.onerror = event => {
        if (!isCurrent()) return
        current.current = null
        setSpeaking(false)
        if (event.error !== 'canceled' && event.error !== 'interrupted') setIssue('error')
      }
      setSpeaking(true)
      synth.speak(utterance)
    } catch {
      cancelCurrent()
      if (mounted.current) { setSpeaking(false); setIssue('error') }
    }
  }

  const message = issue === 'unsupported' ? 'Trình duyệt này không hỗ trợ phát âm.'
    : issue === 'no-english' ? 'Chưa có giọng tiếng Anh. Vui lòng thử lại sau.'
    : issue === 'error' ? 'Không thể phát âm lúc này. Vui lòng thử lại.'
    : speaking ? 'Đang phát âm…' : ''
  return { play, speaking, message }
}
