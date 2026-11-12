import { BookOpen, CheckCheck, CircleDashed, ChartNoAxesCombined, Info } from 'lucide-react'
import { demoStatistics } from '../data'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { percentage } from '../utils/percentage'

export function StatisticsPage() {
  const demo = demoStatistics
  const value = percentage(demo.studied, demo.total)
  const metrics = [{ label: 'Tổng số thẻ đã học', value: demo.studied, icon: BookOpen, color: 'purple' }, { label: 'Số thẻ đã thuộc', value: demo.mastered, icon: CheckCheck, color: 'green' }, { label: 'Số thẻ chưa thuộc', value: demo.unmastered, icon: CircleDashed, color: 'orange' }]
  return <div className="page-shell"><div className="page-heading"><Badge><ChartNoAxesCombined size={14} /> GÓC NHÌN HỌC TẬP</Badge><h1>Mỗi bước nhỏ đều đáng nhớ.</h1><p>Theo dõi hành trình học từ vựng của bạn.</p></div><div className="notice"><Info size={18} /><p><strong>Dữ liệu demo.</strong> Các số liệu dưới đây chỉ minh họa giao diện, không phản ánh tiến độ học thực tế và không ghi vào LocalStorage.</p></div><section className="metrics-grid" aria-label="Số liệu demo">{metrics.map(({ label, value: count, icon: Icon, color }) => <article className="metric-card panel" key={label}><div><span className={`metric-icon ${color}`}><Icon size={23} /></span><Badge subtle>Demo</Badge></div><p>{label}</p><strong>{count.toString().padStart(2, '0')}<span> thẻ</span></strong></article>)}</section><section className="statistics-progress panel"><div className="section-heading"><div><h2>Tiến độ học</h2><p>{demo.unitLabel}</p></div><Badge>Demo</Badge></div><div className="progress-summary"><strong>{value}%</strong><span>{demo.studied}/{demo.total} thẻ đã học (demo)</span></div><ProgressBar value={value} label="Tiến độ minh họa, dữ liệu demo" /><div className="progress-legend"><span><i className="legend-dot" />Đã học (demo): {demo.studied}</span><span><i className="legend-dot muted" />Chưa học (demo): {demo.total - demo.studied}</span></div></section><p className="page-footnote">Thống kê từ tiến độ thực tế sẽ được kết nối khi chức năng học được phát triển.</p></div>
}
