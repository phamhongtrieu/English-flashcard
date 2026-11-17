import type { Flashcard, LoadedUnit, PartOfSpeech, Unit, UnitData } from '../types/flashcard'
import { quizApproved, validateQuizLesson, validateQuizManifest } from './toeicQuizLoader'

export const TOEIC_UNIT_ID = 'toeic-600'

const toeicPosMap: Record<string, PartOfSpeech> = {
  'n.': 'n', n: 'n', 'v.': 'v', v: 'v', 'adj.': 'adj', adj: 'adj', 'adv.': 'adv', adv: 'adv',
  'phr. v.': 'phr.v', 'phr.v.': 'phr.v', 'phr.v': 'phr.v', 'prep.': 'prep', prep: 'prep', idiom: 'idiom',
}

function mapToeicPartOfSpeech(value: string | null): PartOfSpeech | null {
  if (!value) return null
  return toeicPosMap[value.trim().toLowerCase()] ?? null
}

const categories = new Set(['base_word', 'word_family', 'synonym', 'collocation'])
const parts = new Set(['n', 'v', 'adj', 'adv', 'v/adj', 'n/adj', 'adj/n', 'v/n', 'n/v', 'n.pl', 'phr.v'])
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const identifier = (value: unknown): value is string => text(value) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
const dataFile = (value: unknown): value is string => text(value) && /^data\/units\/[a-z0-9-]+\.json$/.test(value)

export function validateManifest(value: unknown): Unit[] {
  if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.units)) throw new Error('Manifest Unit không hợp lệ.')
  const ids = new Set<string>()
  const files = new Set<string>()
  for (const unit of value.units) {
    if (!object(unit) || !identifier(unit.id) || !text(unit.title) || !text(unit.description) || !dataFile(unit.dataFile)
      || (unit.number !== undefined && (!Number.isInteger(unit.number) || Number(unit.number) < 1))
      || !Array.isArray(unit.sections) || !unit.sections.length || ids.has(unit.id) || files.has(unit.dataFile)) throw new Error('Thông tin Unit trong manifest không hợp lệ hoặc bị trùng.')
    const sections = new Set<string>()
    for (const section of unit.sections) {
      if (!object(section) || !identifier(section.id) || !text(section.title) || typeof section.description !== 'string' || sections.has(section.id)) throw new Error('Chủ đề Unit không hợp lệ.')
      sections.add(section.id)
    }
    ids.add(unit.id); files.add(unit.dataFile)
  }
  return value.units as Unit[]
}

export function validateUnitData(value: unknown, unit: Unit): UnitData {
  if (!object(value) || value.schemaVersion !== 1 || value.unitId !== unit.id || !Array.isArray(value.flashcards) || !value.flashcards.length || !Array.isArray(value.reviewNotes)) throw new Error(`JSON của ${unit.title} không hợp lệ hoặc chưa có thẻ.`)
  const ids = new Set<string>()
  for (const card of value.flashcards) {
    if (!object(card) || !identifier(card.id) || !card.id.startsWith(`${unit.id}-`) || ids.has(card.id)
      || card.unitId !== unit.id || !unit.sections.some(section => section.id === card.section)
      || !text(card.english) || !text(card.vietnamese) || !text(card.category) || !categories.has(card.category)
      || (card.acceptedAnswers !== undefined && (!Array.isArray(card.acceptedAnswers) || !card.acceptedAnswers.length || !card.acceptedAnswers.every(text)))
      || (card.partOfSpeech !== null && (!text(card.partOfSpeech) || !parts.has(card.partOfSpeech)))
      || !Number.isInteger(card.sourceRow) || Number(card.sourceRow) < 1) throw new Error(`Flashcard của ${unit.title} không hợp lệ, sai Unit hoặc trùng ID.`)
    ids.add(card.id)
  }
  for (const note of value.reviewNotes) {
    if (!object(note) || !Number.isInteger(note.sourceRow) || Number(note.sourceRow) < 1 || !categories.has(String(note.category)) || !text(note.original) || !text(note.reason)) throw new Error('Ghi chú rà soát dữ liệu không hợp lệ.')
    if (!value.flashcards.some(card => card.sourceRow === note.sourceRow && card.category === note.category)) throw new Error('Ghi chú rà soát không khớp với hàng nguồn của thẻ.')
  }
  return value as unknown as UnitData
}

async function readJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`, { signal })
  if (!response.ok) throw new Error(`Không tải được dữ liệu (${response.status}). Vui lòng thử lại.`)
  try { return await response.json() } catch { throw new Error('File dữ liệu JSON bị lỗi hoặc không tồn tại.') }
}
async function loadToeicFlashcardUnit(signal?: AbortSignal): Promise<LoadedUnit> {
  const collections = validateQuizManifest(await readJson('data/toeic/catalog.json', signal))
  const toeicCollection = collections.find(col => col.id === 'toeic-vocabulary' && col.kind === 'toeic')
  if (!toeicCollection || !quizApproved(toeicCollection.approval)) throw new Error('Bộ từ vựng TOEIC chưa sẵn sàng.')
  const loadedLessons = await Promise.all(toeicCollection.lessons.map(async lesson => {
    if (!lesson.dataFile) return null
    const data = validateQuizLesson(await readJson(lesson.dataFile, signal), toeicCollection.id, lesson.id)
    return { lesson, entries: data.entries }
  }))
  const sections: Unit['sections'] = []
  const flashcards: Flashcard[] = []
  for (const item of loadedLessons) {
    if (!item) continue
    sections.push({ id: item.lesson.id, title: item.lesson.title, description: `${item.entries.length} từ vựng TOEIC.` })
    for (const entry of item.entries) {
      flashcards.push({
        id: entry.id,
        unitId: TOEIC_UNIT_ID,
        section: item.lesson.id,
        category: 'base_word',
        vietnamese: entry.vietnamese,
        english: entry.english,
        acceptedAnswers: entry.quiz.answerAliases.length ? entry.quiz.answerAliases : [entry.english],
        partOfSpeech: mapToeicPartOfSpeech(entry.partOfSpeech),
        sourceRow: null,
      })
    }
  }
  if (!flashcards.length) throw new Error('Bộ 600 Từ Vựng TOEIC chưa có thẻ hợp lệ.')
  const unit: Unit = {
    id: TOEIC_UNIT_ID,
    title: '600 Từ Vựng TOEIC',
    description: `Bộ ${flashcards.length} thẻ từ vựng TOEIC thông dụng chia theo ${sections.length} bài học.`,
    sections,
    dataFile: 'data/toeic/catalog.json',
  }
  return { unit, data: { schemaVersion: 1, unitId: TOEIC_UNIT_ID, flashcards, reviewNotes: [] } }
}

export async function loadManifest(signal?: AbortSignal): Promise<Unit[]> {
  return validateManifest(await readJson('data/units.json', signal))
}
export async function loadUnit(unitId: string, signal?: AbortSignal): Promise<LoadedUnit> {
  if (unitId === TOEIC_UNIT_ID) return loadToeicFlashcardUnit(signal)
  const manifest = await loadManifest(signal)
  const unit = manifest.find(item => item.id === unitId)
  if (!unit) throw new Error('Unit không tồn tại hoặc chưa được xuất bản.')
  return { unit, data: validateUnitData(await readJson(unit.dataFile, signal), unit) }
}
export async function loadCatalog(signal?: AbortSignal): Promise<{ entries: LoadedUnit[]; warnings: string[] }> {
  const manifest = await loadManifest(signal)
  const results = await Promise.allSettled([
    ...manifest.map(async unit => ({ unit, data: validateUnitData(await readJson(unit.dataFile, signal), unit) })),
    loadToeicFlashcardUnit(signal),
  ])
  const entries: LoadedUnit[] = []
  const warnings: string[] = []
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') entries.push(result.value)
    else {
      const title = index < manifest.length ? manifest[index].title : '600 Từ Vựng TOEIC'
      warnings.push(`Không thể hiển thị ${title}: ${result.reason instanceof Error ? result.reason.message : 'Dữ liệu lỗi.'}`)
    }
  })
  return { entries, warnings }
}
export const unitStudyPath = (unit: Unit) => `/study/${encodeURIComponent(unit.id)}`
export const unitLabel = (unit: Unit) => unit.number ? `UNIT ${String(unit.number).padStart(2, '0')}` : unit.id === TOEIC_UNIT_ID ? 'TOEIC 600' : unit.title
