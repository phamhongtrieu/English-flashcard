import { openStudyFilters } from './helpers/studyFilters'
import { test, expect, chromium } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Flashcard, Unit, UnitData } from '../src/types/flashcard'
import { parseCardStatus, progressKey, summarizeProgress } from '../src/utils/progress'

const data: UnitData = JSON.parse(readFileSync(new URL('../public/data/units/unit2.json', import.meta.url), 'utf8'))
const manifest = JSON.parse(readFileSync(new URL('../public/data/units.json', import.meta.url), 'utf8')) as { schemaVersion: number; units: Unit[] }
const catalogTotal = manifest.units.reduce((total, unit) => total + JSON.parse(readFileSync(new URL(`../public/${unit.dataFile}`, import.meta.url), 'utf8')).flashcards.length, 0)
const first = data.flashcards[0], second = data.flashcards[1], third = data.flashcards[2]
async function seed(page: Page, entries: { unitId: string; cardId: string; status: string }[]) {
  await page.goto('/')
  await page.evaluate(entries => {
    for (const entry of entries) localStorage.setItem(entry.key, JSON.stringify({ version: 1, status: entry.status }))
  }, entries.map(entry => ({ key: progressKey(entry.unitId, entry.cardId), status: entry.status })))
}
async function rate(page: Page, status: 'Đã thuộc' | 'Chưa thuộc') {
  await page.getByRole('button', { name: 'Lật thẻ', exact: true }).click()
  await page.getByRole('button', { name: status, exact: true }).click()
}
async function stored(page: Page, card: Flashcard) {
  return page.evaluate(key => localStorage.getItem(key), progressKey(card.unitId, card.id))
}

test('Định dạng tiến độ: trạng thái hợp lệ, lỗi JSON, thống kê 0 và loại ID cũ khỏi tổng', () => {
  for (const status of ['new', 'known', 'learning']) expect(parseCardStatus(JSON.stringify({ version: 1, status }))).toBe(status)
  for (const raw of ['{broken', 'null', '[]', '{"version":2,"status":"known"}', '{"version":1,"status":"oops"}']) expect(parseCardStatus(raw)).toBeNull()
  expect(summarizeProgress([], {})).toEqual({ total: 0, known: 0, learning: 0, new: 0, percent: 0 })
  expect(summarizeProgress([first], { [first.unitId]: { [first.id]: 'known', 'old-card': 'known' } })).toEqual({ total: 1, known: 1, learning: 0, new: 0, percent: 100 })
})

test('Đánh dấu, tự chuyển, đổi đánh giá và refresh: chỉ cập nhật record của thẻ đó', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/study/unit-2')
  await expect(page.getByRole('button', { name: 'Đã thuộc', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Chưa thuộc', exact: true })).toHaveCount(0)
  await rate(page, 'Đã thuộc')
  expect(JSON.parse((await stored(page, first))!)).toEqual({ version: 1, status: 'known' })
  await expect(page.locator('.study-top')).toContainText('2 / 223')
  await expect(page.getByRole('button', { name: 'Lật flashcard', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: 'Lật flashcard', exact: true })).toBeFocused()
  const firstRecord = await stored(page, first)
  await rate(page, 'Chưa thuộc')
  expect(await stored(page, first)).toBe(firstRecord)
  expect(JSON.parse((await stored(page, second))!).status).toBe('learning')
  await page.getByRole('button', { name: 'Thẻ trước' }).click()
  await expect(page.locator('.study-top')).toContainText('Chưa thuộc')
  await rate(page, 'Đã thuộc')
  expect(JSON.parse((await stored(page, second))!).status).toBe('known')
  await page.reload()
  await expect(page.locator('.study-top')).toContainText('Đã thuộc')
  await page.getByRole('navigation').getByRole('link', { name: 'Thống kê' }).click()
  const metrics = page.getByRole('region', { name: 'Thống kê tổng hợp' })
  await expect(metrics.locator('.metric-card').nth(0).locator('strong')).toHaveText(`${catalogTotal} thẻ`)
  await expect(metrics.locator('.metric-card').nth(1).locator('strong')).toHaveText(`${catalogTotal - 2} thẻ`)
  await expect(metrics.locator('.metric-card').nth(2).locator('strong')).toHaveText('2 thẻ')
  await expect(page.getByRole('progressbar', { name: 'Tỷ lệ đã thuộc tổng hợp' })).toHaveAttribute('aria-valuenow', String(Math.round(2 / catalogTotal * 10000) / 100))
})

test('Ôn tập thu ngắn danh sách không bỏ qua thẻ; learning còn lại, thẻ cuối hoàn thành', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seed(page, [first, second, third].map(card => ({ unitId: card.unitId, cardId: card.id, status: 'learning' })))
  await page.goto('/study/unit-2?mode=learning')
  await expect(page.locator('.filter-count')).toHaveText('3 / 223 thẻ phù hợp')
  await rate(page, 'Đã thuộc')
  await expect(page.getByRole('heading', { name: second.vietnamese, exact: true })).toBeVisible()
  await expect(page.locator('.study-top')).toContainText('1 / 2')
  await rate(page, 'Chưa thuộc')
  await expect(page.getByRole('heading', { name: third.vietnamese, exact: true })).toBeVisible()
  await rate(page, 'Đã thuộc')
  await expect(page.getByRole('heading', { name: 'Đã hoàn thành lượt học!' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lật flashcard' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Học lại lượt này' }).click()
  await expect(page.locator('.filter-count')).toHaveText('1 / 223 thẻ phù hợp')
  await expect(page.getByRole('heading', { name: second.vietnamese, exact: true })).toBeVisible()
  await rate(page, 'Đã thuộc')
  await expect(page.getByRole('heading', { name: 'Đã hoàn thành lượt học!' })).toBeVisible()
  await page.getByRole('button', { name: 'Học lại lượt này' }).click()
  await expect(page.getByRole('heading', { name: 'Không có từ chưa thuộc phù hợp' })).toBeVisible()
})

test('Tiếp tục học thẻ mới, chia sẻ trạng thái qua bộ lọc/trộn và hoàn thành subset', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seed(page, [{ unitId: first.unitId, cardId: first.id, status: 'known' }])
  await page.goto('/')
  await page.getByRole('link', { name: 'Tiếp tục học thẻ chưa học', exact: true }).first().click()
  await expect(page.locator('.filter-count')).toHaveText('222 / 223 thẻ phù hợp')
  await expect(page.getByRole('heading', { name: second.vietnamese, exact: true })).toBeVisible()
  await openStudyFilters(page)
  await page.getByLabel('Nhóm từ', { exact: true }).selectOption('word_family')
  await openStudyFilters(page)
  await page.getByLabel('Loại từ', { exact: true }).selectOption('adv')
  await openStudyFilters(page)
  await page.getByRole('switch', { name: 'Trộn thẻ' }).check()
  await expect(page.locator('.study-top')).toContainText('1 / 1')
  await rate(page, 'Chưa thuộc')
  await expect(page.getByRole('heading', { name: 'Đã hoàn thành lượt học!' })).toBeVisible()
  await openStudyFilters(page)
  await page.getByLabel('Chế độ học', { exact: true }).selectOption('learning')
  await expect(page.locator('.study-top')).toContainText('Chưa thuộc')
  await rate(page, 'Đã thuộc')
  await expect(page.getByRole('heading', { name: 'Đã hoàn thành lượt học!' })).toBeVisible()
})

test('Unit độc lập và dữ liệu hỏng không ghi đè dữ liệu hợp lệ', async ({ page }) => {
  const fixtureUnit: Unit = { ...manifest.units[0], id: 'fixture-unit', title: 'Unit kiểm thử', dataFile: 'data/units/fixture-unit.json' }
  // Cùng card ID cố ý để kiểm tra namespace Unit trong lớp lưu, record ngoài catalog không bị xóa.
  await seed(page, [{ unitId: first.unitId, cardId: first.id, status: 'known' }, { unitId: fixtureUnit.id, cardId: first.id, status: 'learning' }])
  await page.evaluate(key => localStorage.setItem(key, '{broken'), progressKey(second.unitId, second.id))
  await page.goto('/study/unit-2')
  await expect(page.getByRole('alert')).toContainText('không hợp lệ')
  await expect(page.locator('.study-top')).toContainText('Đã thuộc')
  const fixtureRecord = await page.evaluate(key => localStorage.getItem(key), progressKey(fixtureUnit.id, first.id))
  await rate(page, 'Chưa thuộc')
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey(fixtureUnit.id, first.id))).toBe(fixtureRecord)
  expect(await stored(page, second)).toBe('{broken')
  await page.reload()
  await expect(page.locator('.study-top')).toContainText('Chưa thuộc')
})

test('LocalStorage bị chặn: vẫn học/thống kê trong phiên và báo không lưu được', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('blocked') } }))
  await page.goto('/study/unit-2')
  await expect(page.getByRole('alert')).toContainText('Không thể lưu tiến độ')
  await rate(page, 'Đã thuộc')
  await page.getByRole('navigation').getByRole('link', { name: 'Thống kê' }).click()
  await expect(page.locator('.metric-card').nth(2).locator('strong')).toHaveText('1 thẻ')
  await page.reload()
  await expect(page.locator('.metric-card').nth(2).locator('strong')).toHaveText('0 thẻ')
})

test('Unit rỗng và catalog rỗng: không crash, thống kê không chia cho 0', async ({ page }) => {
  await page.route('**/data/units.json', route => route.fulfill({ json: { ...manifest, units: [manifest.units[0]] } }))
  await page.route('**/data/units/unit2.json', route => route.fulfill({ json: { ...data, flashcards: [] } }))
  await page.goto('/study/unit-2')
  await expect(page.getByRole('alert')).toBeVisible()
  await page.goto('/statistics')
  await expect(page.getByRole('progressbar', { name: 'Tỷ lệ đã thuộc tổng hợp' })).toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('.metric-card').first().locator('strong')).toHaveText('0 thẻ')
})

test('Chuyển Unit và thống kê theo Unit: kết quả đánh giá độc lập', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const unit: Unit = { ...manifest.units[0], id: 'fixture-unit', title: 'Unit kiểm thử độc lập', dataFile: 'data/units/fixture-unit.json' }
  const card: Flashcard = { ...first, id: 'fixture-unit-card-01', unitId: unit.id }
  await page.route('**/data/units.json', route => route.fulfill({ json: { schemaVersion: 1, units: [...manifest.units, unit] } }))
  await page.route('**/data/units/fixture-unit.json', route => route.fulfill({ json: { schemaVersion: 1, unitId: unit.id, flashcards: [card], reviewNotes: [] } }))
  await page.goto('/study/unit-2')
  await rate(page, 'Đã thuộc')
  await page.evaluate(() => { history.pushState({}, '', '/study/fixture-unit'); dispatchEvent(new PopStateEvent('popstate')) })
  await expect(page.locator('.study-top')).toContainText('Chưa học')
  await rate(page, 'Chưa thuộc')
  await expect(page.getByRole('heading', { name: 'Đã hoàn thành lượt học!' })).toBeVisible()
  await page.evaluate(() => { history.pushState({}, '', '/study/unit-2'); dispatchEvent(new PopStateEvent('popstate')) })
  await expect(page.locator('.study-top')).toContainText('Đã thuộc')
  expect(JSON.parse((await stored(page, first))!).status).toBe('known')
  expect(JSON.parse((await stored(page, card))!).status).toBe('learning')
  await page.getByRole('navigation').getByRole('link', { name: 'Thống kê' }).click()
  await expect(page.locator('.metric-card').first().locator('strong')).toHaveText(`${catalogTotal + 1} thẻ`)
  await expect(page.getByRole('region', { name: `Thống kê ${unit.title}` })).toContainText('1 chưa thuộc')
})

test('Quota lỗi ghi vẫn đọc được tiến độ cũ, giữ đánh giá mới trong phiên', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seed(page, [{ unitId: first.unitId, cardId: first.id, status: 'known' }])
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('english-flashcard-progress-v1')) throw new DOMException('Quota exceeded', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await page.goto('/study/unit-2')
  await expect(page.getByRole('alert')).toContainText('Không thể lưu tiến độ')
  await expect(page.locator('.study-top')).toContainText('Đã thuộc')
  await page.getByRole('button', { name: 'Thẻ tiếp' }).click()
  await rate(page, 'Chưa thuộc')
  expect(await stored(page, second)).toBeNull()
  await page.getByRole('navigation').getByRole('link', { name: 'Thống kê' }).click()
  await expect(page.locator('.metric-card').nth(3).locator('strong')).toHaveText('1 thẻ')
  await page.reload()
  await expect(page.locator('.metric-card').nth(2).locator('strong')).toHaveText('1 thẻ')
  await expect(page.locator('.metric-card').nth(3).locator('strong')).toHaveText('0 thẻ')
})

test('Đóng/mở lại trình duyệt với cùng profile giữ tiến độ', async () => {
  test.setTimeout(60_000)
  const profile = mkdtempSync(join(tmpdir(), 'english-flashcard-progress-test-'))
  const firstBrowser = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true, reducedMotion: 'reduce' })
  try {
    const page = await firstBrowser.newPage()
    await page.goto('http://127.0.0.1:4173/study/unit-2')
    await rate(page, 'Đã thuộc')
  } finally { await firstBrowser.close() }
  const reopened = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true })
  try {
    const page = await reopened.newPage()
    await page.goto('http://127.0.0.1:4173/study/unit-2')
    await expect(page.locator('.study-top')).toContainText('Đã thuộc')
    expect(JSON.parse((await stored(page, first))!).status).toBe('known')
  } finally { await reopened.close() }
})

test('Phục hồi quyền ghi không che cảnh báo khi còn record chưa lưu', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    let blocked = true
    addEventListener('enable-progress-storage', () => { blocked = false })
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (blocked && key.startsWith('english-flashcard-progress-v1')) throw new DOMException('Quota', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await page.goto('/study/unit-2')
  await rate(page, 'Đã thuộc')
  expect(await stored(page, first)).toBeNull()
  await page.evaluate(() => dispatchEvent(new Event('enable-progress-storage')))
  await rate(page, 'Đã thuộc')
  expect(JSON.parse((await stored(page, second))!).status).toBe('known')
  await expect(page.getByRole('alert')).toContainText('Không thể lưu tiến độ')
  await page.getByRole('button', { name: 'Thẻ trước' }).click()
  await page.getByRole('button', { name: 'Thẻ trước' }).click()
  await rate(page, 'Đã thuộc')
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(JSON.parse((await stored(page, first))!).status).toBe('known')
})
