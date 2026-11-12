import type { PartOfSpeech } from '../types/flashcard'

export const partOfSpeechLabels: Record<PartOfSpeech, string> = {
  n: 'Danh từ (n)', v: 'Động từ (v)', adj: 'Tính từ (adj)', adv: 'Trạng từ (adv)', 'v/adj': 'Động từ / Tính từ (v/adj)',
  'n/adj': 'Danh từ / Tính từ (n/adj)', 'adj/n': 'Tính từ / Danh từ (adj/n)', 'v/n': 'Động từ / Danh từ (v/n)', 'n.pl': 'Danh từ số nhiều (n.pl)',
}
// Số liệu minh họa độc lập với dữ liệu Unit xuất bản.
export const demoStatistics = { studied: 4, mastered: 3, unmastered: 1, total: 5, unitLabel: 'Unit 2 · Human Development & Health' }
