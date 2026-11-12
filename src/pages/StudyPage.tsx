import { ArrowLeft, ArrowRight, Check, RotateCcw, Info } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import type { Flashcard, LoadedUnit } from '../types/flashcard'
import { useUnitCatalog, useUnitData } from '../hooks/useUnitData'
import { unitLabel, unitStudyPath } from '../services/unitLoader'
import { DataState } from '../components/ui/DataState'
import { useStudyDeck } from '../hooks/useStudyDeck'
import { StudyFilters } from '../components/flashcards/StudyFilters'
import { useFlashcardStudy } from '../hooks/useFlashcardStudy'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StudyFlashcard } from '../components/flashcards/StudyFlashcard'
import { useLearningProgress } from '../hooks/useLearningProgress'
import { summarizeProgress } from '../utils/progress'
import { matchesStudyMode } from '../utils/studyDeck'
import { StorageNotice } from '../components/ui/StorageNotice'
import { UnitProgress } from '../components/flashcards/UnitProgress'
import type { StudyMode } from '../types/study'
import { TypingAnswer } from '../components/flashcards/TypingAnswer'
import { useTypingPreference } from '../hooks/useTypingPreference'

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
    {data.entries.length ? data.entries.map(({ unit, data: unitData }) => <div className="panel study-progress" key={unit.id}><div><h2>{unit.title}</h2><span>{unitData.flashcards.length} thẻ</span></div><p>{unit.description}</p><UnitProgress unit={unit} cards={unitData.flashcards} /><Link className="button button-primary" to={unitStudyPath(unit)}>Bắt đầu học <ArrowRight size={17} /></Link></div>) : <div className="notice">Chưa có Unit hợp lệ được xuất bản.</div>}
  </div>
}

function UnitStudy({ id }: { id: string }) {
  const { data, error } = useUnitData(id)
  if (!data) return <DataState error={error} />
  return <StudySession key={data.unit.id} loaded={data} />
}

function StudySession({ loaded }: { loaded: LoadedUnit }) {
  const typing = useTypingPreference()
  const { unit, data } = loaded
  const learning = useLearningProgress()
  const [search, setSearch] = useSearchParams()
  const initialMode = search.get('mode')
  const deck = useStudyDeck(data.flashcards, learning.statusOf, initialMode === 'new' || initialMode === 'learning' ? initialMode : 'all')
  const cards = deck.cards.filter(card => matchesStudyMode(learning.statusOf(card.unitId, card.id), deck.mode))
  const stats = summarizeProgress(data.flashcards, learning.progress)
  function changeMode(mode: StudyMode) {
    deck.setMode(mode)
    setSearch(mode === 'all' ? {} : { mode }, { replace: true })
  }

  return <div className="page-shell study-page">
    <Link className="text-link back-link" to="/"><ArrowLeft size={16} /> Về trang chủ</Link>
    <div className="page-heading">
      <Badge>{unitLabel(unit)}</Badge>
      <h1>{unit.title}</h1><p>Một chút tập trung, thêm một từ mới.</p>
    </div>
    <div className="notice"><Info size={18} /><p>Nhấn vào thẻ hoặc nút “Lật thẻ” để xem đáp án. Dùng phím ← / → để chuyển thẻ.</p></div>
    <StorageNotice />
    <StudyFilters mode={deck.mode} onMode={changeMode} unit={unit} filters={deck.filters} shuffled={deck.shuffled} count={cards.length} total={data.flashcards.length}
      onChange={deck.setFilters} onShuffle={deck.setShuffled} onReset={deck.resetFilters} />
    {deck.cards.length ? <StudyDeck key={deck.revision} loaded={loaded} cards={cards} mode={deck.mode} restart={deck.restart} showAll={() => changeMode('all')} typing={typing} /> : <section className="study-empty panel" aria-label="Kết quả lọc">
      <h2>{deck.mode === 'learning' ? 'Không có từ chưa thuộc phù hợp' : deck.mode === 'new' ? 'Không còn thẻ chưa học phù hợp' : 'Không có thẻ phù hợp'}</h2><p>Hãy chọn bộ lọc hoặc chế độ học khác để tiếp tục.</p>
      {deck.mode !== 'all' && <button className="button button-primary" onClick={() => changeMode('all')}>Học tất cả thẻ</button>}
      <button type="button" className="button button-secondary" onClick={deck.resetFilters}><RotateCcw size={16} />Đặt lại bộ lọc</button>
    </section>}
    <section className="study-progress panel">
      <div><h2>Tiến độ học</h2><span>{stats.known}/{stats.total} thẻ đã thuộc · {stats.percent}%</span></div>
      <ProgressBar value={stats.percent} label="Tỷ lệ đã thuộc của Unit" />
      <p>{stats.new} chưa học · {stats.learning} chưa thuộc. {learning.storageAvailable ? 'Tiến độ được lưu trên trình duyệt này.' : 'Chưa thể lưu trên thiết bị.'}</p>
    </section>
  </div>
}

function StudyDeck({ loaded, cards, mode, restart, showAll, typing }: { loaded: LoadedUnit; cards: Flashcard[]; mode: StudyMode; restart: () => void; showAll: () => void; typing: ReturnType<typeof useTypingPreference> }) {
  const { unit, data } = loaded
  const session = useFlashcardStudy(cards)
  const { statusOf, markCard } = useLearningProgress()
  const { index, card, flipped, flip, previous, next } = session
  const [readyCardId, setReadyCardId] = useState<string>()
  const canRate = flipped && readyCardId === card?.id
  const workspace = useRef<HTMLElement>(null)
  const focusAfterRating = useRef(false)
  useEffect(() => {
    if (!focusAfterRating.current) return
    focusAfterRating.current = false
    workspace.current?.querySelector<HTMLElement>('.study-flashcard, h2')?.focus({ preventScroll: true })
  }, [card?.id, session.completed])
  function rate(status: 'known' | 'learning') {
    if (!canRate || !card || session.completed) return
    focusAfterRating.current = true
    session.advanceAfterRating()
    markCard(unit.id, card.id, status)
  }
  if (session.completed) return <section ref={workspace} className="study-empty panel study-completion" aria-label="Hoàn thành lượt học">
    <h2 tabIndex={-1}>Đã hoàn thành lượt học!</h2><p>Những đánh giá của bạn đã được cập nhật. Bạn có thể bắt đầu lượt mới để đánh dấu lại.</p>
    <button className="button button-primary" onClick={restart}>Học lại lượt này</button>
    <Link className="button button-secondary" to="/statistics">Xem thống kê</Link>
  </section>
  if (!card) return <section className="study-empty panel"><h2>{mode === 'learning' ? 'Không còn từ chưa thuộc trong lượt này' : 'Không còn thẻ phù hợp trong lượt này'}</h2><button className="button button-primary" onClick={showAll}>Học tất cả thẻ</button></section>
  const reviewNotes = data.reviewNotes.filter(note => note.sourceRow === card.sourceRow && note.category === card.category)
  const statusLabels = { new: 'Chưa học', known: 'Đã thuộc', learning: 'Chưa thuộc' }
  return <section ref={workspace} className="study-workspace" aria-label="Khu vực học từ vựng">
      <div className="study-top"><span>Flashcard · {statusLabels[statusOf(unit.id, card.id)]}</span><span aria-live="polite" aria-atomic="true"><Badge subtle>{index + 1} / {cards.length}</Badge></span></div>
      <StudyFlashcard card={card} flipped={flipped} onFlip={flip} unitName={unitLabel(unit)} onAnswerVisible={() => setReadyCardId(card.id)} />
      <p id="study-card-hint" className="study-hint" aria-live="polite">{flipped ? 'Mặt sau · Tiếng Anh' : 'Mặt trước · Tiếng Việt'} · Nhấn để lật thẻ</p>
      {reviewNotes.map(note => <p className="data-note" key={`${note.sourceRow}-${note.category}`}>Cần rà soát · Hàng {note.sourceRow}: {note.reason}</p>)}
      <TypingAnswer key={card.id} card={card} flipped={flipped} enabled={typing.enabled} saved={typing.saved} onEnabled={typing.setEnabled} />
      <div className="study-controls" aria-label="Vùng điều khiển flashcard">
        <button className="button button-secondary" disabled={index === 0} onClick={previous}><ArrowLeft size={17} />Thẻ trước</button>
        <button className="button button-primary" onClick={flip}><RotateCcw size={17} />Lật thẻ</button>
        <button className="button button-secondary" disabled={index === cards.length - 1} onClick={next}>Thẻ tiếp<ArrowRight size={17} /></button>
      </div>
      <div className="assessment-controls" aria-live="polite">
        {canRate ? <><button className="button button-secondary" onClick={() => rate('learning')}><RotateCcw size={16} />Chưa thuộc</button><button className="button button-primary" onClick={() => rate('known')}><Check size={16} />Đã thuộc</button></> : <p className="study-hint">Lật sang tiếng Anh để đánh dấu mức độ ghi nhớ.</p>}
      </div>
    </section>
}
