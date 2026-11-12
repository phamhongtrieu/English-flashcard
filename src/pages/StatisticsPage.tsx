import { BookOpen, CheckCheck, CircleDashed, ChartNoAxesCombined } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { DataState } from '../components/ui/DataState'
import { StorageNotice } from '../components/ui/StorageNotice'
import { useUnitCatalog } from '../hooks/useUnitData'
import { useLearningProgress } from '../hooks/useLearningProgress'
import { summarizeProgress } from '../utils/progress'
import { unitStudyPath } from '../services/unitLoader'

export function StatisticsPage() {
  const { data, error } = useUnitCatalog()
  const { progress, storageAvailable } = useLearningProgress()
  if (!data) return <DataState error={error} />
  const stats = summarizeProgress(data.entries.flatMap(entry => entry.data.flashcards), progress)
  const metrics = [
    { label: 'Tổng số Flashcard', value: stats.total, icon: BookOpen, color: 'purple' },
    { label: 'Chưa học', value: stats.new, icon: CircleDashed, color: 'purple' },
    { label: 'Đã thuộc', value: stats.known, icon: CheckCheck, color: 'green' },
    { label: 'Chưa thuộc', value: stats.learning, icon: CircleDashed, color: 'orange' },
  ]
  return <div className="page-shell">
    <div className="page-heading"><Badge><ChartNoAxesCombined size={14} /> GÓC NHÌN HỌC TẬP</Badge><h1>Mỗi bước nhỏ đều đáng nhớ.</h1><p>Theo dõi hành trình học từ vựng của bạn.</p></div>
    <StorageNotice />
    {data.warnings.map(warning => <div className="notice" role="alert" key={warning}>{warning}</div>)}
    <section className="metrics-grid progress-metrics" aria-label="Thống kê tổng hợp">{metrics.map(({ label, value, icon: Icon, color }) => <article className="metric-card panel" key={label}><div><span className={`metric-icon ${color}`}><Icon size={23} /></span></div><p>{label}</p><strong>{value}<span> thẻ</span></strong></article>)}</section>
    <section className="statistics-progress panel">
      <div className="section-heading"><div><h2>Tiến độ học</h2><p>Tổng hợp các Unit đã xuất bản có dữ liệu hợp lệ.</p></div><Badge>{data.entries.length} Unit</Badge></div>
      <div className="progress-summary"><strong>{stats.percent}%</strong><span>{stats.known}/{stats.total} thẻ đã thuộc</span></div>
      <ProgressBar value={stats.percent} label="Tỷ lệ đã thuộc tổng hợp" />
      <p className="page-footnote">{storageAvailable ? 'Tiến độ được lưu trên trình duyệt này, không đồng bộ giữa các thiết bị.' : 'Đang hiển thị tiến độ trong phiên hiện tại; chưa thể lưu vào trình duyệt.'}</p>
    </section>
    {data.entries.map(({ unit, data: unitData }) => {
      const summary = summarizeProgress(unitData.flashcards, progress)
      return <section className="statistics-progress panel unit-statistics" key={unit.id} aria-label={`Thống kê ${unit.title}`}>
        <div className="section-heading"><div><h2>{unit.title}</h2><p>{summary.total} thẻ · {summary.new} chưa học · {summary.known} đã thuộc · {summary.learning} chưa thuộc</p></div></div>
        <div className="progress-summary"><strong>{summary.percent}%</strong><span>Tỷ lệ đã thuộc</span></div>
        <ProgressBar value={summary.percent} label={`Tỷ lệ đã thuộc ${unit.title}`} />
        <div className="statistics-actions"><Link className="button button-primary" to={`${unitStudyPath(unit)}?mode=new`}>Tiếp tục học thẻ chưa học</Link><Link className="button button-secondary" to={`${unitStudyPath(unit)}?mode=learning`}>Ôn tập từ chưa thuộc</Link></div>
      </section>
    })}
    {!data.entries.length && <p className="page-footnote">Chưa có Unit hợp lệ để thống kê.</p>}
  </div>
}
