import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToeicQuizCatalog } from '../hooks/useToeicQuizCatalog'
import { loadQuizProgress, quizAccuracy, TOEIC_QUIZ_KEY } from '../utils/toeicQuizProgress'
import type { LoadedQuizLesson } from '../types/toeicQuiz'

function LessonTile({ entry }: { entry: LoadedQuizLesson }) {
  const { progress, warning } = loadQuizProgress(entry.collection.id, entry.lesson.id)
  const playable = entry.questions.length > 0 && !entry.reason
  const covered = entry.questions.filter(question => progress.answeredQuestionIds.includes(question.id)).length
  const completed = playable && covered === entry.questions.length
  return <article className={`toeic-lesson ${playable ? '' : 'is-pending'}`}>
    <div className="toeic-lesson-number">{String(entry.lesson.number).padStart(2, '0')}</div>
    <div className="toeic-lesson-body"><h3>{entry.lesson.title}</h3>
      {playable ? <>
        <p>{entry.questions.length} câu hỏi hợp lệ · Mỗi lượt tối đa 10 câu</p>
        <p className="toeic-lesson-state">{completed ? 'Đã hoàn thành bài' : `Đã luyện ${covered}/${entry.questions.length} câu`} · {progress.completedRuns} lượt hoàn thành</p>
        <progress aria-label={`Tiến độ ${entry.lesson.title}`} value={covered} max={entry.questions.length} />
        <p>{progress.correct} đúng · {progress.incorrect} sai · {quizAccuracy(progress)}% chính xác</p>
        {warning && <p role="status">Chưa đọc được tiến độ đã lưu.</p>}
        <Link className="button button-primary" to={`/toeic/lesson/${entry.lesson.id}`}>Bắt đầu trắc nghiệm</Link>
        {progress.attempts.length > 0 && <details className="toeic-history"><summary>Lịch sử luyện tập ({progress.attempts.length} lượt gần nhất)</summary><ol>{[...progress.attempts].reverse().map(attempt => <li key={attempt.id}><time dateTime={attempt.updatedAt}>{new Date(attempt.updatedAt).toLocaleString('vi-VN')}</time><span>{attempt.answers.filter(answer => answer.correct).length}/{attempt.answers.length} đúng · {attempt.answers.length === attempt.total ? 'Hoàn thành' : `Đang luyện ${attempt.answers.length}/${attempt.total}`}</span></li>)}</ol></details>}
      </> : <><p>{entry.reason ?? 'Bài chưa có dữ liệu hợp lệ.'}</p><span className="badge badge-subtle">CHƯA MỞ</span></>}
    </div>
  </article>
}

export function ToeicPage() {
  const { catalog, loading, error, retry } = useToeicQuizCatalog()
  const [, refresh] = useState(0)
  useEffect(() => {
    const onStorage = (event: StorageEvent) => { if (event.key === null || event.key.startsWith(TOEIC_QUIZ_KEY + ':')) refresh(value => value + 1) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return <div className="toeic-page">
    <header className="toeic-heading"><span className="badge">KHÔNG GIAN TRẮC NGHIỆM</span><h1>TOEIC Vocabulary</h1><p>Một nghĩa tiếng Việt. Bốn lựa chọn. Từng bước ghi nhớ từ vựng.</p></header>
    {loading && <p role="status">Đang tải danh mục bài học…</p>}
    {error && <div className="toeic-notice" role="alert"><p>{error}</p><button className="button button-secondary" onClick={retry}>Thử tải lại</button></div>}
    {catalog && <>
      {catalog.warnings.length > 0 && <div className="toeic-notice" role="status">Một số bài chưa thể mở.<details><summary>Chi tiết</summary><ul>{catalog.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></details></div>}
      <section aria-labelledby="toeic-lessons-heading"><div className="toeic-section-heading"><h2 id="toeic-lessons-heading">50 bài TOEIC Vocabulary</h2><p>Chọn một bài để luyện tập trắc nghiệm bốn đáp án. Mỗi lượt tối đa 10 câu và lưu tiến độ riêng.</p></div>
        <div className="toeic-lessons" data-testid="toeic-planned-lessons">{catalog.lessons.filter(entry => entry.collection.kind === 'toeic').map(entry => <LessonTile key={entry.lesson.id} entry={entry} />)}</div>
      </section>
    </>}
  </div>
}
