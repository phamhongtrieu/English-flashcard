import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { Unit, UnitData } from '../src/types/flashcard'

const manifest = JSON.parse(readFileSync(new URL('../public/data/units.json', import.meta.url), 'utf8')) as { schemaVersion: number; units: Unit[] }
const unitData: UnitData = JSON.parse(readFileSync(new URL('../public/data/units/unit2.json', import.meta.url), 'utf8'))

test('Dữ liệu xuất bản: 50 hàng, A/B/C/D, category, IDs và nghĩa nguồn', () => {
  expect(manifest.units.map(unit => unit.id)).toEqual(['unit-2'])
  expect(unitData.flashcards).toHaveLength(223)
  expect(new Set(unitData.flashcards.map(card => card.id)).size).toBe(223)
  expect([...new Set(unitData.flashcards.map(card => card.sourceRow))].sort((a, b) => a! - b!)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1))
  for (const [section, count] of Object.entries({ a: 57, b: 56, c: 55, d: 55 })) expect(unitData.flashcards.filter(card => card.section === section)).toHaveLength(count)
  for (const [category, count] of Object.entries({ base_word: 50, word_family: 50, synonym: 73, collocation: 50 })) expect(unitData.flashcards.filter(card => card.category === category)).toHaveLength(count)
  expect(unitData.flashcards.filter(card => card.partOfSpeech === null)).toHaveLength(50)
  expect(unitData.reviewNotes).toHaveLength(19)
  const audit = JSON.parse(readFileSync(new URL('../docs/unit2-source-rows.json', import.meta.url), 'utf8'))
  for (const row of audit.rows) {
    for (const category of ['base_word', 'word_family', 'synonym', 'collocation']) {
      const cards = unitData.flashcards.filter(card => card.sourceRow === row.sourceRow && card.category === category)
      expect(cards.length).toBeGreaterThan(0)
      if (category !== 'synonym') {
        expect(cards[0].english).toBe(row.cells[category].english)
        expect(cards[0].vietnamese).toBe(row.cells[category].vietnamese)
      }
    }
  }
})

test('Trang chủ dùng số lượng thật và mở đúng Unit, refresh giữ route', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.unit-card')).toHaveCount(1)
  await expect(page.locator('.unit-meta')).toContainText('223 thẻ')
  await page.locator('.unit-card').getByRole('link', { name: 'Bắt đầu học' }).click()
  await expect(page).toHaveURL(/\/study\/unit-2$/)
  await expect(page.locator('.study-top')).toContainText('1 / 223')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Vóc dáng cơ thể', exact: true })).toBeVisible()
})

test('Unit chưa xuất bản: thông báo lỗi và không đoán đường dẫn JSON', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('/data/units/')) requests.push(request.url()) })
  await page.goto('/study/unit-3')
  await expect(page.getByRole('alert')).toContainText('Unit không tồn tại')
  await expect(page.getByRole('button', { name: 'Lật flashcard' })).toHaveCount(0)
  expect(requests).toEqual([])
})

test('Loading khi tải chậm', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/data/units/unit2.json', async route => { await gate; await route.fulfill({ json: unitData }) })
  await page.goto('/study/unit-2')
  await expect(page.getByRole('status')).toContainText('Đang tải')
  release()
  await expect(page.locator('.study-top')).toContainText('1 / 223')
})

for (const scenario of ['syntax', 'empty', 'duplicate', 'wrong-unit', 'wrong-section', 'wrong-category', 'wrong-pos', 'missing-row', 'manifest', 'http']) {
  test(`Không crash với dữ liệu lỗi: ${scenario}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const data = structuredClone(unitData)
    if (scenario === 'empty') data.flashcards = []
    if (scenario === 'duplicate') data.flashcards.push(data.flashcards[0])
    if (scenario === 'wrong-unit') data.flashcards[0].unitId = 'wrong-unit'
    if (scenario === 'wrong-section') data.flashcards[0].section = 'unknown'
    if (scenario === 'wrong-category') Object.assign(data.flashcards[0], { category: 'unknown' })
    if (scenario === 'wrong-pos') Object.assign(data.flashcards[0], { partOfSpeech: 'unknown' })
    if (scenario === 'missing-row') data.flashcards[0].sourceRow = null
    if (scenario === 'manifest') await page.route('**/data/units.json', route => route.fulfill({ json: { units: [{}] } }))
    else await page.route('**/data/units/unit2.json', route => scenario === 'syntax' ? route.fulfill({ body: '{broken', contentType: 'application/json' }) : scenario === 'http' ? route.fulfill({ status: 404 }) : route.fulfill({ json: data }))
    await page.goto('/study/unit-2')
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Lật flashcard' })).toHaveCount(0)
    expect(errors).toEqual([])
    await page.goto('/')
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.locator('.unit-card')).toHaveCount(0)
  })
}

test('Nhiều Unit qua fixture mạng, không xuất bản Unit giả; đổi Unit không giữ thẻ cũ', async ({ page }) => {
  // Chỉ fixture trong bộ nhớ trình duyệt, dùng lại dữ liệu PDF, không tạo file Unit mới.
  const fixtureUnit: Unit = { ...manifest.units[0], id: 'fixture-unit', number: undefined, title: 'Bộ dữ liệu kiểm thử', dataFile: 'data/units/fixture-unit.json' }
  const fixtureData: UnitData = { schemaVersion: 1, unitId: fixtureUnit.id, flashcards: [{ ...unitData.flashcards.at(-1)!, id: 'fixture-unit-r050-collocation-01', unitId: fixtureUnit.id }], reviewNotes: [] }
  await page.route('**/data/units.json', route => route.fulfill({ json: { schemaVersion: 1, units: [...manifest.units, fixtureUnit] } }))
  await page.route('**/data/units/fixture-unit.json', route => route.fulfill({ json: fixtureData }))
  await page.goto('/')
  await expect(page.locator('.unit-card')).toHaveCount(2)
  await page.locator('.unit-card').first().getByRole('link', { name: 'Bắt đầu học' }).click()
  await page.getByRole('button', { name: 'Lật thẻ', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Physique', exact: true })).toBeVisible()
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/data/units/fixture-unit.json', async route => { await gate; await route.fulfill({ json: fixtureData }) })
  // Thay tham số route ngay trong SPA để kiểm tra vòng đời state/request cũ.
  await page.evaluate(() => {
    history.pushState({}, '', '/study/fixture-unit')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page.getByRole('status')).toContainText('Đang tải')
  await expect(page.getByRole('heading', { name: 'Physique', exact: true })).toHaveCount(0)
  release()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fixtureUnit.title)
  await expect(page.locator('.study-top')).toContainText('1 / 1')
  await expect(page.getByRole('button', { name: 'Lật flashcard' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('heading', { name: fixtureData.flashcards[0].vietnamese, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thẻ trước' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Thẻ tiếp' })).toBeDisabled()
})
