import { ChevronDown, RotateCcw, Shuffle, SlidersHorizontal } from 'lucide-react'
import { useId, useState } from 'react'
import type { Unit } from '../../types/flashcard'
import type { StudyFilters as Filters, PartOfSpeechFilter, StudyMode } from '../../types/study'

export const categoryOptions: { value: Filters['category']; label: string }[] = [
  { value: 'all', label: 'Tất cả nhóm từ' },
  { value: 'base_word', label: 'Từ cốt lõi (Base Word)' },
  { value: 'word_family', label: 'Họ từ (Word Family)' },
  { value: 'synonym', label: 'Đồng nghĩa (Synonym)' },
  { value: 'collocation', label: 'Cụm từ (Collocation)' },
]
export const posOptions: { value: PartOfSpeechFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả loại từ' }, { value: 'n', label: 'Danh từ (n)' },
  { value: 'v', label: 'Động từ (v)' }, { value: 'adj', label: 'Tính từ (adj)' },
  { value: 'adv', label: 'Trạng từ (adv)' }, { value: 'other', label: 'Khác/Không xác định' },
]

interface Props {
  mode: StudyMode
  onMode: (mode: StudyMode) => void
  unit: Unit
  filters: Filters
  shuffled: boolean
  count: number
  total: number
  onChange: (filters: Filters) => void
  onShuffle: (value: boolean) => void
  onReset: () => void
}

export function StudyFilters({ unit, filters, shuffled, count, total, onChange, onShuffle, onReset, mode, onMode }: Props) {
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()
  const active = [
    filters.section !== 'all' ? unit.sections.find(section => section.id === filters.section)?.title : undefined,
    filters.category !== 'all' ? categoryOptions.find(option => option.value === filters.category)?.label : undefined,
    filters.partOfSpeech !== 'all' ? posOptions.find(option => option.value === filters.partOfSpeech)?.label : undefined,
  ].filter(Boolean)

  return <section className="study-filters panel" aria-label="Bộ lọc Flashcard">
    <div className="filter-heading"><h2><button className="filter-toggle" type="button" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(value => !value)}><SlidersHorizontal size={17} />Bộ lọc Flashcard<ChevronDown className={expanded ? 'is-expanded' : ''} size={16} /></button></h2><p role="status" className="filter-count">{count} / {total} thẻ phù hợp</p></div>
    <p className="filter-summary">Đang áp dụng: {mode === 'learning' ? 'Ôn tập từ chưa thuộc · ' : mode === 'new' ? 'Thẻ chưa học · ' : ''}{active.length ? active.join(' · ') : 'Tất cả thẻ'} · {shuffled ? 'Đang trộn' : 'Thứ tự gốc'}</p>
    <div id={contentId} hidden={!expanded}>
    <label className="study-mode-label">Chế độ học<select aria-label="Chế độ học" value={mode} onChange={event => onMode(event.target.value as StudyMode)}>
      <option value="all">Tất cả thẻ</option><option value="new">Tiếp tục học thẻ chưa học</option><option value="learning">Ôn tập từ chưa thuộc</option>
    </select></label>
    <div className="filter-fields">
      <label>Chủ đề<select aria-label="Chủ đề" value={filters.section} onChange={event => onChange({ ...filters, section: event.target.value })}>
        <option value="all">Tất cả chủ đề</option>{unit.sections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}
      </select></label>
      <label>Nhóm từ<select aria-label="Nhóm từ" value={filters.category} onChange={event => onChange({ ...filters, category: event.target.value as Filters['category'] })}>
        {categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
      <label>Loại từ<select aria-label="Loại từ" value={filters.partOfSpeech} onChange={event => onChange({ ...filters, partOfSpeech: event.target.value as PartOfSpeechFilter })}>
        {posOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
    </div>
    <div className="filter-footer"><button className="text-link" type="button" onClick={onReset}><RotateCcw size={14} />Đặt lại bộ lọc</button>
      <label className="shuffle-control"><input type="checkbox" role="switch" checked={shuffled} onChange={event => onShuffle(event.target.checked)} /><Shuffle size={15} />Trộn thẻ</label>
    </div>
    <p className="filter-help">Đổi bộ lọc hoặc bật/tắt trộn sẽ bắt đầu lại từ thẻ đầu. Đặt lại bộ lọc giữ lựa chọn trộn hiện tại.</p>
    </div>
  </section>
}
