import { ArrowDown, ArrowRight, Brain, Heart, Leaf, PersonStanding, Sparkles, Layers3, BookOpen, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { useUnitCatalog } from '../hooks/useUnitData'
import { unitLabel, unitStudyPath } from '../services/unitLoader'
import { Badge } from '../components/ui/Badge'
import { FlashcardPreview } from '../components/flashcards/FlashcardPreview'

const sectionIcons = [PersonStanding, Leaf, Brain, Heart]
export function HomePage() {
  const reduced = useReducedMotion()
  const { data, error } = useUnitCatalog()
  const entries = data?.entries ?? []
  const preview = entries[0]?.data.flashcards[0]
  return <>
    <section className="hero">
      <div className="hero-copy"><Badge><span className="status-dot" /> MỖI NGÀY MỘT CHÚT TIẾN BỘ</Badge><h1>Học từ vựng tiếng Anh <span>thông minh hơn.</span></h1><p>Những từ mới, những bước tiến nhỏ.<br />Biến việc học từ vựng thành một thói quen bạn yêu thích.</p><div className="hero-actions"><Link to="/study" className="button button-primary">Bắt đầu học <ArrowRight size={18} /></Link><a href="#units" className="text-link">Khám phá bài học <ArrowDown size={16} /></a></div><div className="hero-points"><span><Check size={15} /> Đơn giản, dễ tập trung</span><span><Check size={15} /> Học theo chủ đề</span></div></div>
      <motion.div className="hero-visual" initial={reduced ? false : { opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
        <div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="visual-spark spark-one">✧</span><span className="visual-spark spark-two">✦</span>
        <div className="back-card back-card-one" /><div className="back-card back-card-two" />{preview ? <FlashcardPreview card={preview} unitName={unitLabel(entries[0].unit)} decorative /> : <div className="flashcard flashcard-hero" role="status">{error ? 'Không tải được dữ liệu.' : data ? 'Chưa có Unit được xuất bản.' : 'Đang tải Flashcard…'}</div>}
        <div className="floating-note"><span className="note-icon"><Brain size={21} /></span><div>Học nhẹ nhàng<strong>Ghi nhớ lâu hơn</strong></div><Sparkles size={17} /></div>
        <span className="visual-caption">Một chiếc thẻ. Một từ mới. Một bước tiến.</span>
      </motion.div>
    </section>
    <section id="units" className="units-section"><div className="section-heading"><div><span className="eyebrow">GÓC HỌC TẬP CỦA BẠN</span><h2>Hôm nay, mình học gì?</h2><p>Chọn một Unit và bắt đầu hành trình từ vựng.</p></div><Badge subtle>{entries.length} Unit</Badge></div>
      {!data && <div className="notice" role={error ? 'alert' : 'status'}>{error ?? 'Đang tải danh sách Unit…'}</div>}
      {data?.warnings.map(warning => <div className="notice" role="alert" key={warning}>{warning}</div>)}
      {data && !entries.length && <div className="notice">Chưa có Unit hợp lệ được xuất bản.</div>}
      {entries.map(({ unit, data: unitData }) => {
        const flashcards = unitData.flashcards
        return <article key={unit.id} className="unit-card"><div className="unit-intro"><div className="unit-book"><BookOpen size={34} /><span>{unit.number ? String(unit.number).padStart(2, '0') : ''}</span></div><Badge>{unitLabel(unit)}</Badge><h3>{unit.title}</h3><p>{unit.description}</p><div className="unit-meta"><span><Layers3 size={15} />{flashcards.filter(c => c.unitId === unit.id).length} thẻ</span><span>{unit.sections.length} nhóm chủ đề</span></div><Link to={unitStudyPath(unit)} className="button button-primary">Bắt đầu học<ArrowRight size={17} /></Link></div>
      <div className="unit-sections"><div className="topics-heading"><h4>Các nhóm chủ đề</h4><span>Nội dung từ PDF</span></div><div className="topics-grid">{unit.sections.map((section, index) => { const Icon = sectionIcons[index % sectionIcons.length]; const count = flashcards.filter(c => c.unitId === unit.id && c.section === section.id).length; return <div key={section.id} className={`topic topic-${index}`}><span className="topic-icon"><Icon size={22} /></span><div><h4>{section.title}</h4><p>{section.description}</p><span className="topic-count">{count ? `${count} thẻ` : 'Chưa có dữ liệu'}</span></div></div> })}</div><p className="data-note">{flashcards.length} thẻ từ PDF · {unitData.reviewNotes.length ? `${unitData.reviewNotes.length} mục nguồn cần rà soát, đã được ghi chú.` : 'Dữ liệu đã được kiểm tra.'}</p></div></article> })}
    </section>
    <section className="preview-section"><div className="section-heading"><div><span className="eyebrow">LÀM QUEN VỚI FLASHCARD</span><h2>Nhỏ gọn trên thẻ. Lớn dần trong trí nhớ.</h2><p>Đọc nghĩa tiếng Việt, thử nhớ từ tiếng Anh và đối chiếu đáp án.</p></div><Badge subtle><Sparkles size={13} /> Xem trước</Badge></div>{preview && <div className="preview-pair"><FlashcardPreview card={preview} unitName={unitLabel(entries[0].unit)} /><span className="preview-arrow"><ArrowRight size={24} /></span><FlashcardPreview card={preview} unitName={unitLabel(entries[0].unit)} answer /></div>}<p className="preview-disclaimer">Hai mặt được hiển thị riêng để minh họa. Mở trang học để nhấn và lật thẻ.</p></section>
  </>
}
