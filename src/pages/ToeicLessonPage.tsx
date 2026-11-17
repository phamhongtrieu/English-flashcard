import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ToeicQuizRound } from '../components/toeic/ToeicQuizRound'
import { useToeicQuizCatalog } from '../hooks/useToeicQuizCatalog'

export function ToeicLessonPage() {
  const { lessonId } = useParams()
  const { catalog, loading, error, retry } = useToeicQuizCatalog()
  const [round, setRound] = useState(0)
  const entry = catalog?.lessons.find(item => item.lesson.id === lessonId)
  return <div className="toeic-page">
    <Link className="text-link" to="/toeic">← TOEIC Vocabulary</Link>
    {loading && <p role="status">Đang chuẩn bị câu hỏi…</p>}
    {error && <div className="toeic-notice" role="alert"><p>{error}</p><button className="button button-secondary" onClick={retry}>Thử tải lại</button></div>}
    {catalog && (!entry || entry.reason || !entry.questions.length) && <section className="toeic-panel" role="alert"><h1>Bài học chưa sẵn sàng</h1><p>{entry?.reason ?? 'Bài học không tồn tại hoặc chưa đủ dữ liệu trắc nghiệm hợp lệ.'}</p><Link className="button button-secondary" to="/toeic">Về danh sách bài</Link></section>}
    {entry && !entry.reason && entry.questions.length > 0 && <>
      <header className="toeic-heading"><span className="badge">TOEIC QUIZ</span><h1>{entry.lesson.title}</h1><p>Trắc nghiệm bốn đáp án. Lượt luyện tối đa 10 câu, không lặp câu.</p></header>
      <ToeicQuizRound key={`${entry.lesson.id}-${round}`} entry={entry} onReplay={() => setRound(value => value + 1)} />
    </>}
  </div>
}
