import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { StudyMascot } from '../flashcards/StudyMascot'
import { createQuizRound, gradeQuizAnswer } from '../../utils/toeicQuiz'
import { addQuizAnswer, loadQuizProgress, persistQuizProgress, quizAccuracy } from '../../utils/toeicQuizProgress'
import type { LoadedQuizLesson } from '../../types/toeicQuiz'

export function ToeicQuizRound({ entry, onReplay }: { entry: LoadedQuizLesson; onReplay: () => void }) {
  const [round] = useState(() => createQuizRound(entry.questions))
  const [run] = useState(() => ({ id: `run-${crypto.randomUUID()}`, startedAt: new Date().toISOString(), total: round.length }))
  const [storage] = useState(() => loadQuizProgress(entry.collection.id, entry.lesson.id))
  const [progress, setProgress] = useState(storage.progress)
  const [warning, setWarning] = useState(storage.warning)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<{ questionId: string; selectedId: string; correct: boolean }[]>([])
  const lock = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const nextButton = useRef<HTMLButtonElement>(null)
  const question = round[index]
  const answer = answers[index]
  const finished = index === round.length
  const correct = answers.filter(item => item.correct).length
  useEffect(() => { heading.current?.focus() }, [index])
  useEffect(() => { if (answer) nextButton.current?.focus() }, [answer])

  function select(selectedId: string) {
    if (lock.current || !question || answer) return
    lock.current = true
    const result = gradeQuizAnswer(question, selectedId)
    setAnswers(previous => [...previous, { questionId: question.id, selectedId, correct: result }])
    // Merge the latest saved progress when available, preserving newer attempts from another tab.
    const latest = loadQuizProgress(entry.collection.id, entry.lesson.id)
    const base = latest.warning || warning ? progress : latest.progress
    const updated = addQuizAnswer(base, run, question.id, result)
    setProgress(updated)
    const saved = persistQuizProgress(entry.collection.id, entry.lesson.id, updated)
    setWarning(!saved)
  }

  function next() {
    if (!answer || !lock.current) return
    lock.current = false
    setIndex(value => value + 1)
  }

  return <div className="toeic-round">
    {warning && <p role="status" className="toeic-notice">Chưa thể đọc hoặc lưu tiến độ an toàn trên trình duyệt. Kết quả lượt này vẫn hiển thị.</p>}
    {finished ? <section className="toeic-panel toeic-summary" aria-labelledby="quiz-heading">
      <span className="badge">ĐÃ HOÀN THÀNH LƯỢT LUYỆN</span>
      <h2 id="quiz-heading" ref={heading} tabIndex={-1}>Bạn đã đi thêm một chặng!</h2>
      <p className="toeic-score">{correct}<span> / {round.length} câu đúng</span></p>
      <div className="toeic-metrics"><span><strong>{correct}</strong>Đúng</span><span><strong>{round.length - correct}</strong>Sai</span><span><strong>{quizAccuracy({ correct, incorrect: round.length - correct })}%</strong>Chính xác</span></div>
      <p>Mỗi lượt luyện là một cơ hội nhớ lâu hơn.</p>
      <div className="toeic-actions"><button className="button button-primary" onClick={onReplay}>Luyện lượt mới</button><Link className="button button-secondary" to="/toeic">Về danh sách bài</Link></div>
    </section> : <section className="toeic-panel toeic-question" aria-labelledby="quiz-heading" data-question-id={question.id}>
      <div className="toeic-question-meta"><span className="badge">CHỌN MỘT ĐÁP ÁN</span><span>Câu {index + 1} / {round.length}</span></div>
      <progress aria-label="Tiến độ lượt luyện" value={answers.length} max={round.length} />
      <p className="toeic-prompt-label">Từ tiếng Anh nào có nghĩa là…</p>
      <h2 id="quiz-heading" ref={heading} tabIndex={-1}>{question.prompt}</h2>
      {question.partOfSpeech && <span className="part-of-speech">{question.partOfSpeech}</span>}
      <div className="toeic-options" role="group" aria-label="Bốn đáp án tiếng Anh">{question.options.map((option, position) => {
        const right = Boolean(answer && option.id === question.correctId)
        const wrong = Boolean(answer && option.id === answer.selectedId && !answer.correct)
        return <button key={option.id} type="button" disabled={Boolean(answer)} aria-pressed={answer?.selectedId === option.id}
          className={`toeic-option ${right ? 'is-correct' : ''} ${wrong ? 'is-incorrect' : ''}`} onClick={() => select(option.id)}>
          <span className="toeic-letter">{'ABCD'[position]}</span><span>{option.english}</span>
          {right && <span className="toeic-option-mark">✓ Đáp án đúng</span>}{wrong && <span className="toeic-option-mark">✕ Bạn đã chọn</span>}
        </button>
      })}</div>
      <div className="toeic-feedback" role="status" aria-live="polite">{answer ? answer.correct ? 'Chính xác! Bạn làm tốt lắm.'
        : `Chưa đúng. Đáp án đúng: ${question.options.find(option => option.id === question.correctId)?.english}.` : 'Chọn A, B, C hoặc D để kiểm tra.'}</div>
      <div className="toeic-actions"><span>{correct} đúng · {answers.length - correct} sai</span><button ref={nextButton} type="button" className="button button-primary" disabled={!answer} onClick={next}>{index === round.length - 1 ? 'Xem tổng kết' : 'Câu tiếp theo'}</button></div>
    </section>}
    <div className="toeic-companion"><StudyMascot key={finished ? 'summary' : question.id} state={finished ? 'correct' : answer ? answer.correct ? 'correct' : 'incorrect' : 'idle'}
      message={finished ? 'Luyện tập đều đặn, tiến bộ mỗi ngày!' : answer ? answer.correct ? 'Đúng rồi! Tiếp tục nhé!' : 'Không sao, mình cùng ghi nhớ từ này nhé!' : 'Mình chờ bạn chọn đáp án nhé!'} stationary /></div>
  </div>
}
