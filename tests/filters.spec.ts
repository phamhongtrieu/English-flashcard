import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { Flashcard } from '../src/types/flashcard'
import { defaultStudyFilters, filterFlashcards, matchesPartOfSpeech, shuffleFlashcards } from '../src/utils/studyDeck'

const cards: Flashcard[] = JSON.parse(readFileSync(new URL('../public/data/units/unit2.json', import.meta.url), 'utf8')).flashcards

test('Loại từ hỗn hợp, n.pl và null không suy đoán; tiện ích không sửa nguồn', () => {
  for (const [pos, matches] of [
    ['n/adj', ['n', 'adj']], ['v/adj', ['v', 'adj']], ['adj/n', ['adj', 'n']],
    ['v/n', ['v', 'n']], ['n/v', ['n', 'v']], ['phr.v', ['v']], ['n.pl', ['n']], ['adv', ['adv']], [null, ['other']],
  ] as const) {
    for (const filter of ['n', 'v', 'adj', 'adv', 'other'] as const) expect(matchesPartOfSpeech(pos, filter)).toBe((matches as readonly string[]).includes(filter))
    expect(matchesPartOfSpeech(pos, 'all')).toBe(true)
  }
  const source = Object.freeze(cards.map(card => Object.freeze({ ...card })))
  const before = JSON.stringify(source)
  const subset = filterFlashcards(source, { section: 'a', category: 'base_word', partOfSpeech: 'n' })
  expect(subset).toHaveLength(12)
  for (let attempt = 0; attempt < 10; attempt++) {
    const mixed = shuffleFlashcards(subset)
    expect(mixed).not.toBe(subset)
    expect(mixed.map(card => card.id).sort()).toEqual(subset.map(card => card.id).sort())
    expect(new Set(mixed.map(card => card.id)).size).toBe(subset.length)
  }
  expect(shuffleFlashcards([])).toEqual([])
  expect(shuffleFlashcards([cards[0]])).toEqual([cards[0]])
  expect(filterFlashcards(source, defaultStudyFilters())).toEqual(cards)
  expect(JSON.stringify(source)).toBe(before)
})

test('Từng bộ lọc chủ đề, nhóm từ, loại từ hiển thị đúng số lượng', async ({ page }) => {
  await page.goto('/study/unit-2')
  const section = page.getByLabel('Chủ đề', { exact: true })
  const category = page.getByLabel('Nhóm từ', { exact: true })
  const pos = page.getByLabel('Loại từ', { exact: true })
  const count = page.locator('.filter-count')
  for (const [value, expected] of Object.entries({ a: 57, b: 56, c: 55, d: 55 })) {
    await section.selectOption(value)
    await expect(count).toHaveText(`${expected} / 223 thẻ phù hợp`)
    await expect(page.locator('.study-top')).toContainText(`1 / ${expected}`)
  }
  await section.selectOption('all')
  for (const [value, expected] of Object.entries({ base_word: 50, word_family: 50, synonym: 73, collocation: 50 })) {
    await category.selectOption(value)
    await expect(count).toHaveText(`${expected} / 223 thẻ phù hợp`)
  }
  await category.selectOption('all')
  for (const value of ['n', 'v', 'adj', 'adv', 'other']) {
    // Oracle độc lập: n.pl là danh từ; null thuộc nhóm other, không đoán từ tiếng Anh.
    const expected = cards.filter(card => value === 'other' ? card.partOfSpeech === null : card.partOfSpeech?.split('/').some(part => part === value || (value === 'n' && part === 'n.pl'))).length
    await pos.selectOption(value)
    await expect(count).toHaveText(`${expected} / 223 thẻ phù hợp`)
  }
  await pos.selectOption('all')
  await expect(count).toHaveText('223 / 223 thẻ phù hợp')
})

test('Bộ lọc kết hợp, reset đầu/mặt Việt, bàn phím và không có kết quả', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/study/unit-2')
  const section = page.getByLabel('Chủ đề', { exact: true })
  const category = page.getByLabel('Nhóm từ', { exact: true })
  const pos = page.getByLabel('Loại từ', { exact: true })
  const card = page.getByRole('button', { name: 'Lật flashcard', exact: true })
  await section.selectOption('a')
  await category.selectOption('base_word')
  await pos.selectOption('n')
  await expect(page.locator('.filter-count')).toHaveText('12 / 223 thẻ phù hợp')
  await expect(page.locator('.filter-summary')).toContainText('Phần A')
  await page.getByRole('button', { name: 'Thẻ tiếp' }).click()
  await card.click()
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  // A và D đều có 12 danh từ base_word: reset phải dựa trên lượt học, không chỉ số lượng.
  await section.selectOption('d')
  await expect(page.locator('.study-top')).toContainText('1 / 12')
  await expect(card).toHaveAttribute('aria-pressed', 'false')
  await expect(card.getByRole('heading', { name: 'Tâm lý học', exact: true })).toBeVisible()
  await card.focus()
  await page.keyboard.press('Space')
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(card).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.study-top')).toContainText('2 / 12')
  await category.selectOption('collocation')
  await expect(page.getByRole('heading', { name: 'Không có thẻ phù hợp' })).toBeVisible()
  await expect(page.locator('.filter-count')).toHaveText('0 / 223 thẻ phù hợp')
  await expect(card).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await page.getByRole('region', { name: 'Kết quả lọc' }).getByRole('button', { name: 'Đặt lại bộ lọc' }).click()
  await expect(page.locator('.study-top')).toContainText('1 / 223')
  await expect(card).toHaveAttribute('aria-pressed', 'false')
  await expect(section).toHaveValue('all')
  await expect(category).toHaveValue('all')
  await expect(pos).toHaveValue('all')
})

test('Trộn chỉ tập đã lọc, không mất/trùng, giữ thứ tự khi lật/rerender và tắt về thứ tự gốc', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => { Math.random = () => 0 })
  await page.goto('/study/unit-2')
  await page.getByLabel('Chủ đề', { exact: true }).selectOption('a')
  await page.getByLabel('Nhóm từ', { exact: true }).selectOption('base_word')
  const expected = cards.filter(card => card.section === 'a' && card.category === 'base_word').map(card => card.vietnamese)
  const toggle = page.getByRole('switch', { name: 'Trộn thẻ' })
  await toggle.check()
  const card = page.getByRole('button', { name: 'Lật flashcard', exact: true })
  const mixed: string[] = []
  for (let index = 0; index < expected.length; index++) {
    mixed.push((await card.getByRole('heading').textContent())!)
    await page.getByRole('button', { name: 'Lật thẻ', exact: true }).click()
    if (index < expected.length - 1) await page.getByRole('button', { name: 'Thẻ tiếp' }).click()
  }
  expect(mixed).not.toEqual(expected)
  expect([...mixed].sort()).toEqual([...expected].sort())
  expect(new Set(mixed).size).toBe(expected.length)
  await expect(page.getByRole('button', { name: 'Thẻ tiếp' })).toBeDisabled()
  await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click()
  await expect(page.locator('.study-top')).toContainText('13 / 13')
  for (let index = mixed.length - 2; index >= 0; index--) {
    await page.getByRole('button', { name: 'Thẻ trước' }).click()
    await expect(card.getByRole('heading')).toHaveText(mixed[index])
  }
  await toggle.uncheck()
  await expect(page.locator('.study-top')).toContainText('1 / 13')
  await expect(card).toHaveAttribute('aria-pressed', 'false')
  for (let index = 0; index < expected.length; index++) {
    await expect(card.getByRole('heading')).toHaveText(expected[index])
    if (index < expected.length - 1) await page.getByRole('button', { name: 'Thẻ tiếp' }).click()
  }
  // Đổi bộ lọc khi đang trộn phải tạo lượt mới chỉ gồm kết quả mới.
  await toggle.check()
  await page.getByLabel('Chủ đề', { exact: true }).selectOption('b')
  await expect(page.locator('.study-top')).toContainText('1 / 13')
  const sectionB = cards.filter(card => card.section === 'b' && card.category === 'base_word')
  await expect(card.getByRole('heading')).toHaveText(sectionB[1].vietnamese)
})

for (const width of [320, 390, 768, 1440]) {
  test(`Bộ lọc responsive ${width}px và Dark Mode`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/study/unit-2')
    for (const dark of [false, true]) {
      await page.locator('html').evaluate((el, value) => el.classList.toggle('dark', value), dark)
      await page.getByLabel('Chủ đề', { exact: true }).selectOption('d')
      await expect(page.locator('.filter-count')).toHaveText('55 / 223 thẻ phù hợp')
      for (const select of await page.getByRole('combobox').all()) {
        const box = await select.boundingBox()
        expect(box!.width).toBeGreaterThan(100)
        expect(box!.x + box!.width).toBeLessThanOrEqual(width)
      }
      await expect(page.getByRole('switch', { name: 'Trộn thẻ' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    if (width === 390) await page.screenshot({ path: 'test-results/study-filters-mobile-dark.png', fullPage: true })
  })
}
