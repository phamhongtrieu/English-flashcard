import type { PartOfSpeech } from '../types/flashcard'

export const partOfSpeechLabels: Record<PartOfSpeech, string> = {
  'n/v': 'Danh từ / Động từ (n/v)', 'phr.v': 'Cụm động từ (phr.v)',
  n: 'Danh từ (n)', v: 'Động từ (v)', adj: 'Tính từ (adj)', adv: 'Trạng từ (adv)', 'v/adj': 'Động từ / Tính từ (v/adj)',
  'n/adj': 'Danh từ / Tính từ (n/adj)', 'adj/n': 'Tính từ / Danh từ (adj/n)', 'v/n': 'Động từ / Danh từ (v/n)', 'n.pl': 'Danh từ số nhiều (n.pl)',
}
