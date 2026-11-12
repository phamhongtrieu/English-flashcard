import { openStudyFilters } from './helpers/studyFilters'
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { Unit, UnitData } from '../src/types/flashcard'
import { matchesPartOfSpeech, filterFlashcards, shuffleFlashcards, defaultStudyFilters } from '../src/utils/studyDeck'
import { progressKey } from '../src/utils/progress'

const manifest = JSON.parse(readFileSync(new URL('../public/data/units.json', import.meta.url), 'utf8')) as { units: Unit[] }
const data: UnitData = JSON.parse(readFileSync(new URL('../public/data/units/unit3.json', import.meta.url), 'utf8'))
const unit2Bytes = readFileSync(new URL('../public/data/units/unit2.json', import.meta.url))
const unit2: UnitData = JSON.parse(unit2Bytes.toString('utf8'))
const title = 'Nutrition, Fitness & Healthy Lifestyle'

test('Unit 3: đủ 50 hàng/200 ô nguồn, 217 thẻ hợp lệ, ID ổn định; Unit 2 nguyên vẹn', () => {
  expect(createHash('sha256').update(unit2Bytes).digest('hex')).toBe('45cbea2323863ff83f42aedc1575fea165cf210c45b923bdf5268ca57d7977b5')
  expect(manifest.units.find(unit => unit.id === 'unit3')?.dataFile).toBe('data/units/unit3.json')
  expect(data.flashcards).toHaveLength(217)
  expect(new Set([...unit2.flashcards, ...data.flashcards].map(card => card.id)).size).toBe(440)
  expect([...new Set(data.flashcards.map(card => card.sourceRow))].sort((a, b) => a! - b!)).toEqual(Array.from({ length: 50 }, (_, index) => index + 1))
  for (const [section, count] of Object.entries({ a: 55, b: 57, c: 53, d: 52 })) expect(data.flashcards.filter(card => card.section === section)).toHaveLength(count)
  for (const [category, count] of Object.entries({ base_word: 50, word_family: 51, synonym: 66, collocation: 50 })) expect(data.flashcards.filter(card => card.category === category)).toHaveLength(count)
  const audit = JSON.parse(readFileSync(new URL('../docs/unit3-source-rows.json', import.meta.url), 'utf8'))
  expect(audit.rows).toHaveLength(50)
  for (const row of audit.rows) {
    for (const [category, cell] of Object.entries(row.cells) as [string, { english: string; vietnamese: string; partOfSpeech: string | null }][]) {
      const cards = data.flashcards.filter(card => card.sourceRow === row.sourceRow && card.category === category)
      expect(cards.map(card => card.english)).toEqual(cell.english.split(' / '))
      const meanings = cell.vietnamese.split(' / ')
      expect(cards.map(card => card.vietnamese)).toEqual(cards.length > 1 && cards.length === meanings.length ? meanings : cards.map(() => cell.vietnamese))
      for (const card of cards) {
        expect(card.partOfSpeech).toBe(cell.partOfSpeech)
        expect(card.id).toMatch(/^unit3-r\d{3}-(base-word|word-family|synonym|collocation)-\d{2}$/)
        expect(card.unitId).toBe('unit3')
        expect(card.english.trim().length).toBeGreaterThan(0)
        expect(card.vietnamese.trim().length).toBeGreaterThan(0)
      }
    }
  }
  expect(data.flashcards.filter(card => card.partOfSpeech === null)).toHaveLength(50)
  expect(data.flashcards.find(card => card.english === 'Stamen')).toMatchObject({ sourceRow: 14, category: 'word_family', vietnamese: 'Nhị hoa (từ gốc khác)' })
  expect(data.reviewNotes.some(note => note.sourceRow === 14 && note.category === 'word_family')).toBe(true)
  expect(data.flashcards.filter(card => card.english === 'Longevity')).toHaveLength(2)
  expect(data.flashcards[0].english).toBe('Diet')
  expect(data.flashcards.at(-1)?.english).toBe('Enhance overall well-being')
})

test('Unit 3: lọc/trộn không sửa dữ liệu, n/v và phr.v hoạt động đúng', () => {
  const original = JSON.stringify(data)
  for (const card of data.flashcards.filter(card => card.partOfSpeech === 'n/v')) {
    expect(matchesPartOfSpeech(card.partOfSpeech, 'n')).toBe(true)
    expect(matchesPartOfSpeech(card.partOfSpeech, 'v')).toBe(true)
  }
  for (const card of data.flashcards.filter(card => card.partOfSpeech === 'phr.v')) {
    expect(matchesPartOfSpeech(card.partOfSpeech, 'v')).toBe(true)
    expect(matchesPartOfSpeech(card.partOfSpeech, 'other')).toBe(false)
  }
  for (const section of ['all', 'a', 'b', 'c', 'd']) {
    const filtered = filterFlashcards(data.flashcards, { ...defaultStudyFilters(), section })
    expect(shuffleFlashcards(filtered).map(card => card.id).sort()).toEqual(filtered.map(card => card.id).sort())
  }
  expect(JSON.stringify(data)).toBe(original)
})

test('Trang chủ mở Unit 3; duyệt đủ 217 thẻ, đầu/cuối, lật và bàn phím', async ({ page }) => {
  test.setTimeout(120_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const tile = page.locator('.unit-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
  await expect(tile).toContainText('217 thẻ')
  await tile.getByRole('link', { name: 'Bắt đầu học', exact: true }).click()
  await expect(page).toHaveURL(/\/study\/unit3$/)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  const card = page.getByRole('button', { name: 'Lật flashcard', exact: true })
  await expect(page.getByRole('button', { name: 'Thẻ trước' })).toBeDisabled()
  for (let index = 0; index < data.flashcards.length; index++) {
    await expect(card.getByRole('heading')).toHaveText(data.flashcards[index].vietnamese)
    await expect(page.locator('.study-top')).toContainText(`${index + 1} / 217`)
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    if (index < data.flashcards.length - 1) await page.getByRole('button', { name: 'Thẻ tiếp' }).click()
  }
  await expect(page.getByRole('button', { name: 'Thẻ tiếp' })).toBeDisabled()
  await card.focus()
  await page.keyboard.press('Space')
  await expect(card.getByRole('heading')).toHaveText('Enhance overall well-being')
  await page.keyboard.press('ArrowLeft')
  await expect(card).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.study-top')).toContainText('216 / 217')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.study-top')).toContainText('217 / 217')
})

test('Chuyển Unit thật: Physique trùng từ nhưng trạng thái độc lập, ôn tập/thống kê/refresh', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const oldCard = unit2.flashcards.find(card => card.english === 'Physique')!
  const newCard = data.flashcards.find(card => card.english === 'Physique')!
  await page.goto('/')
  const oldRecord = JSON.stringify({ version: 1, status: 'known' })
  await page.evaluate(({ oldKey, newKey, oldRecord }) => {
    localStorage.setItem(oldKey, oldRecord)
    localStorage.setItem(newKey, JSON.stringify({ version: 1, status: 'learning' }))
  }, { oldKey: progressKey(oldCard.unitId, oldCard.id), newKey: progressKey(newCard.unitId, newCard.id), oldRecord })
  await page.goto('/study/unit3?mode=learning')
  await expect(page.locator('.filter-count')).toHaveText('1 / 217 thẻ phù hợp')
  await expect(page.getByRole('heading', { name: newCard.vietnamese, exact: true })).toBeVisible()
  await openStudyFilters(page)
  await page.getByRole('switch', { name: 'Trộn thẻ' }).check()
  await page.getByRole('button', { name: 'Lật thẻ', exact: true }).click()
  await page.getByRole('button', { name: 'Đã thuộc', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Đã hoàn thành lượt học!' })).toBeVisible()
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey(oldCard.unitId, oldCard.id))).toBe(oldRecord)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Không có từ chưa thuộc phù hợp' })).toBeVisible()
  await page.evaluate(() => { history.pushState({}, '', '/study/unit-2'); dispatchEvent(new PopStateEvent('popstate')) })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Human Development & Health')
  await expect(page.locator('.study-top')).toContainText('Đã thuộc')
  await page.evaluate(() => { history.pushState({}, '', '/study/unit3'); dispatchEvent(new PopStateEvent('popstate')) })
  await expect(page.getByRole('heading', { name: 'Chế độ ăn uống', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lật flashcard', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('navigation').getByRole('link', { name: 'Thống kê' }).click()
  await expect(page.getByRole('region', { name: `Thống kê ${title}` })).toContainText('217 thẻ · 216 chưa học · 1 đã thuộc · 0 chưa thuộc')
  await expect(page.getByRole('region', { name: 'Thống kê Human Development & Health' })).toContainText('223 thẻ · 222 chưa học · 1 đã thuộc · 0 chưa thuộc')
})

test('Unit 3: bộ lọc nguồn, trộn bật/tắt và trạng thái rỗng', async ({ page }) => {
  await page.goto('/study/unit3')
  for (const [section, count] of Object.entries({ a: 55, b: 57, c: 53, d: 52 })) {
    await openStudyFilters(page)
    await page.getByLabel('Chủ đề', { exact: true }).selectOption(section)
    await expect(page.locator('.filter-count')).toHaveText(`${count} / 217 thẻ phù hợp`)
  }
  await openStudyFilters(page)
  await page.getByLabel('Chủ đề', { exact: true }).selectOption('b')
  await openStudyFilters(page)
  await page.getByLabel('Nhóm từ', { exact: true }).selectOption('synonym')
  await openStudyFilters(page)
  await page.getByLabel('Loại từ', { exact: true }).selectOption('v')
  await expect(page.locator('.filter-count')).toHaveText('1 / 217 thẻ phù hợp')
  await expect(page.getByRole('heading', { name: 'Làm cho săn lại', exact: true })).toBeVisible()
  await openStudyFilters(page)
  await page.getByRole('switch', { name: 'Trộn thẻ' }).check()
  await openStudyFilters(page)
  await page.getByRole('switch', { name: 'Trộn thẻ' }).uncheck()
  await openStudyFilters(page)
  await page.getByLabel('Nhóm từ', { exact: true }).selectOption('collocation')
  await expect(page.getByRole('heading', { name: 'Không có thẻ phù hợp' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lật flashcard', exact: true })).toHaveCount(0)
})
