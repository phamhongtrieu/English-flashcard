import { Link } from 'react-router-dom'
import type { Flashcard, Unit } from '../../types/flashcard'
import { useLearningProgress } from '../../hooks/useLearningProgress'
import { summarizeProgress } from '../../utils/progress'
import { unitStudyPath } from '../../services/unitLoader'
import { ProgressBar } from '../ui/ProgressBar'

export function UnitProgress({ unit, cards }: { unit: Unit; cards: Flashcard[] }) {
  const { progress } = useLearningProgress()
  const stats = summarizeProgress(cards, progress)
  return <div className="unit-learning-progress">
    <p>{stats.known}/{stats.total} đã thuộc · {stats.learning} chưa thuộc · {stats.new} chưa học</p>
    <ProgressBar value={stats.percent} label={`Tỷ lệ đã thuộc ${unit.title}`} />
    {stats.new > 0 && <Link className="text-link" to={`${unitStudyPath(unit)}?mode=new`}>Tiếp tục học thẻ chưa học</Link>}
  </div>
}
