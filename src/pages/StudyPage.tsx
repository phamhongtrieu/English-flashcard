import { ArrowLeft, ArrowRight, Check, RotateCcw, Info } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { LoadedUnit } from '../types/flashcard'
import { useUnitCatalog, useUnitData } from '../hooks/useUnitData'
import { unitLabel, unitStudyPath } from '../services/unitLoader'
import { DataState } from '../components/ui/DataState'
import { useFlashcardStudy } from '../hooks/useFlashcardStudy'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StudyFlashcard } from '../components/flashcards/StudyFlashcard'

export function StudyPage() {
  const { unitId } = useParams()
  if (!unitId) return <StudySelection />
  return <UnitStudy key={unitId} id={unitId} />
}

function StudySelection() {
  const { data, error } = useUnitCatalog()
  if (!data) return <DataState error={error} />
  return <div className="page-shell"><div className="page-heading"><h1>Chọn Unit để bắt đầu học</h1><p>Mỗi Unit là một bộ Flashcard độc lập.</p></div>
    {data.warnings.map(warning => <div className="notice" role="alert" key={warning}>{warning}</div>)}
    {data.entries.length ? data.entries.map(({ unit, data: unitData }) => <div className="panel study-progress" key={unit.id}><div><h2>{unit.title}</h2><span>{unitData.flashcards.length} thẻ</span></div><p>{unit.description}</p><Link className="button button-primary" to={unitStudyPath(unit)}>Bắt đầu học <ArrowRight size={17} /></Link></div>) : <div className="notice">Chưa có Unit hợp lệ được xuất bản.</div>}
  </div>
}

function UnitStudy({ id }: { id: string }) {
  const { data, error } = useUnitData(id)
  if (!data) return <DataState error={error} />
  return <StudySession key={data.unit.id} loaded={data} />
}

function StudySession({ loaded }: { loaded: LoadedUnit }) {
  const { unit, data } = loaded
  const cards = data.flashcards
  const { index, flipped, flip, previous, next } = useFlashcardStudy(cards.length)
  const reviewNotes = data.reviewNotes.filter(note => note.sourceRow === cards[index].sourceRow && note.category === cards[index].category)

  return <div className="page-shell study-page">
    <Link className="text-link back-link" to="/"><ArrowLeft size={16} /> Về trang chủ</Link>
    <div className="page-heading">
      <Badge>{unitLabel(unit)}</Badge>
      <h1>{unit.title}</h1><p>Một chút tập trung, thêm một từ mới.</p>
    </div>
    <div className="notice"><Info size={18} /><p>Nhấn vào thẻ hoặc nút “Lật thẻ” để xem đáp án. Dùng phím ← / → để chuyển thẻ.</p></div>
    <section className="study-workspace" aria-label="Khu vực học từ vựng">
      <div className="study-top"><span>Flashcard</span><span aria-live="polite" aria-atomic="true"><Badge subtle>{index + 1} / {cards.length}</Badge></span></div>
      <StudyFlashcard card={cards[index]} flipped={flipped} onFlip={flip} unitName={unitLabel(unit)} />
      <p id="study-card-hint" className="study-hint" aria-live="polite">{flipped ? 'Mặt sau · Tiếng Anh' : 'Mặt trước · Tiếng Việt'} · Nhấn để lật thẻ</p>
      {reviewNotes.map(note => <p className="data-note" key={`${note.sourceRow}-${note.category}`}>Cần rà soát · Hàng {note.sourceRow}: {note.reason}</p>)}
      <div className="study-controls" aria-label="Vùng điều khiển flashcard">
        <button className="button button-secondary" disabled={index === 0} onClick={previous}><ArrowLeft size={17} />Thẻ trước</button>
        <button className="button button-primary" onClick={flip}><RotateCcw size={17} />Lật thẻ</button>
        <button className="button button-secondary" disabled={index === cards.length - 1} onClick={next}>Thẻ tiếp<ArrowRight size={17} /></button>
      </div>
      <div className="assessment-controls"><button className="text-link" disabled><RotateCcw size={16} />Cần ôn lại</button><button className="text-link" disabled><Check size={16} />Đã thuộc</button></div>
    </section>
    <section className="study-progress panel">
      <div><h2>Tiến độ học</h2><span>0/{cards.length} thẻ đã học · 0%</span></div>
      <ProgressBar value={0} label="Tiến độ học chưa được ghi nhận" />
      <p>Hiện chỉ hỗ trợ lật và chuyển thẻ. Tiến độ học chưa được ghi nhận hoặc lưu trên thiết bị.</p>
    </section>
  </div>
}
