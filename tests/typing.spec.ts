import { openStudyFilters } from './helpers/studyFilters'
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { Unit, UnitData } from '../src/types/flashcard'
import { normalizeAnswer, isCorrectAnswer } from '../src/utils/answers'
import { progressKey } from '../src/utils/progress'
import { TYPING_PREFERENCE_KEY } from '../src/hooks/useTypingPreference'
import { validateUnitData } from '../src/services/unitLoader'

const unit2: UnitData = JSON.parse(readFileSync(new URL('../public/data/units/unit2.json', import.meta.url), 'utf8'))
const manifest = JSON.parse(readFileSync(new URL('../public/data/units.json', import.meta.url), 'utf8')) as { units: Unit[] }
const input = (page: Page) => page.getByRole('textbox', { name: 'Đáp án tiếng Anh', exact: true })
const check = (page: Page) => page.getByRole('button', { name: 'Kiểm tra', exact: true })
const flip = (page: Page) => page.getByRole('button', { name: 'Lật thẻ', exact: true })
const card = (page: Page) => page.getByRole('button', { name: 'Lật flashcard', exact: true })
const toggle = (page: Page) => page.getByRole('switch', { name: 'Luyện gõ đáp án', exact: true })
const result = (page: Page) => page.locator('.typing-result')

test('So sánh chính xác, Unicode/whitespace, đáp án khai báo; không tự tách slash hoặc đồng nghĩa', () => {
  for (const answer of ['physique', 'PHYSIQUE', ' physique ', '\tPhysique\n']) expect(isCorrectAnswer(answer, { english: 'Physique' })).toBe(true)
  for (const answer of ['', '  ', 'physic', 'physical', 'body shape']) expect(isCorrectAnswer(answer, { english: 'Physique' })).toBe(false)
  expect(normalizeAnswer('  BOOST\t metabolic  \nrate ')).toBe('boost metabolic rate')
  expect(isCorrectAnswer('cafe\u0301', { english: 'café' })).toBe(true)
  expect(isCorrectAnswer('color', { english: 'Colour', acceptedAnswers: ['Color'] })).toBe(true)
  expect(isCorrectAnswer('colour', { english: 'Colour', acceptedAnswers: ['Color'] })).toBe(true)
  expect(isCorrectAnswer('fat', { english: 'Fat / Fatty acids' })).toBe(false)
  expect(isCorrectAnswer('fat / fatty acids', { english: 'Fat / Fatty acids' })).toBe(true)
  expect(isCorrectAnswer('firmup', { english: 'Firm up' })).toBe(false)
  const data = structuredClone(unit2)
  Object.assign(data.flashcards[0], { acceptedAnswers: ['Explicit alternative'] })
  expect(validateUnitData(data, manifest.units[0])).toBe(data)
  for (const invalid of [null, [], [''], ['  '], [3], 'Physique']) {
    Object.assign(data.flashcards[0], { acceptedAnswers: invalid })
    expect(() => validateUnitData(data, manifest.units[0])).toThrow()
  }
  for (const [name, hash] of [['unit2', '45cbea2323863ff83f42aedc1575fea165cf210c45b923bdf5268ca57d7977b5'], ['unit3', '4d4edadea8dc6e37e9d8fd86a2c6989155caf6ec1da5e871d7a254398cb2968f']]) {
    expect(createHash('sha256').update(readFileSync(new URL(`../public/data/units/${name}.json`, import.meta.url))).digest('hex')).toBe(hash)
  }
})

test('Rỗng, sai, thử lại, hoa/thường và khoảng trắng: chỉ kiểm tra, không đổi thẻ/tiến độ', async ({ page }) => {
  await page.goto('/study/unit-2')
  await expect(toggle(page)).toBeChecked()
  const before = await page.evaluate(() => JSON.stringify({ ...localStorage }))
  await expect(check(page)).toBeDisabled()
  await input(page).fill(' \t ')
  await expect(check(page)).toBeDisabled()
  for (const answer of ['physic', 'physical']) {
    await input(page).fill(answer)
    await check(page).click()
    await expect(result(page)).toHaveText('Chưa chính xác, hãy thử lại!')
    await expect(card(page)).toHaveAttribute('aria-pressed', 'false')
    await expect(card(page).getByRole('heading')).toHaveText('Vóc dáng cơ thể')
  }
  for (const answer of ['physique', 'PHYSIQUE', '  physique  ']) {
    await input(page).fill(answer)
    await expect(result(page)).toBeEmpty()
    await check(page).click()
    await expect(result(page)).toHaveText('Chính xác!')
    await expect(page.locator('.study-top')).toContainText('1 / 223')
    await expect(page.locator('.study-top')).toContainText('Chưa học')
    await expect(page.getByRole('button', { name: 'Đã thuộc', exact: true })).toHaveCount(0)
  }
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(before)
})

test('Lật tự do; giữ nội dung/kết quả hai chiều và khi bật/tắt; chuyển thẻ reset', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/study/unit-2')
  await flip(page).click()
  await expect(input(page)).toHaveCount(0)
  await expect(check(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Đã thuộc', exact: true })).toBeEnabled()
  await flip(page).click()
  for (const answer of ['wrong', 'PHYSIQUE']) {
    await input(page).fill(answer)
    await check(page).click()
    const feedback = await result(page).textContent()
    await flip(page).click()
    await expect(input(page)).toHaveCount(0)
    await flip(page).click()
    await expect(input(page)).toHaveValue(answer)
    await expect(result(page)).toHaveText(feedback!)
  }
  await toggle(page).uncheck()
  await expect(input(page)).toHaveCount(0)
  await toggle(page).check()
  await expect(input(page)).toHaveValue('PHYSIQUE')
  await expect(result(page)).toHaveText('Chính xác!')
  await page.getByRole('button', { name: 'Thẻ tiếp' }).click()
  await expect(input(page)).toHaveValue('')
  await expect(result(page)).toBeEmpty()
  await page.getByRole('button', { name: 'Thẻ trước' }).click()
  await expect(input(page)).toHaveValue('')
})

test('Enter kiểm tra, Space nhập, mũi tên sửa văn bản; phím tắt thẻ vẫn hoạt động ngoài input', async ({ page }) => {
  await page.goto('/study/unit-2')
  await input(page).fill('Physique')
  await input(page).press('Enter')
  await expect(result(page)).toHaveText('Chính xác!')
  await expect(card(page)).toHaveAttribute('aria-pressed', 'false')
  await input(page).press('End')
  await input(page).press('Space')
  await expect(input(page)).toHaveValue('Physique ')
  await expect(result(page)).toBeEmpty()
  await input(page).press('ArrowLeft')
  expect(await input(page).evaluate(el => (el as HTMLInputElement).selectionStart)).toBe('Physique'.length)
  await input(page).press('ArrowRight')
  expect(await input(page).evaluate(el => (el as HTMLInputElement).selectionStart)).toBe('Physique '.length)
  await expect(page.locator('.study-top')).toContainText('1 / 223')
  await card(page).focus()
  await page.keyboard.press('Space')
  await expect(card(page)).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Enter')
  await expect(card(page)).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.study-top')).toContainText('2 / 223')
  await expect(input(page)).toHaveValue('')
})

test('Cụm nhiều từ; đổi bộ lọc, mode, trộn và Unit reset kết quả kể cả cùng thẻ đầu', async ({ page }) => {
  await page.goto('/study/unit-2')
  await openStudyFilters(page)
  await page.getByLabel('Nhóm từ', { exact: true }).selectOption('collocation')
  await input(page).fill('  ATHLETIC    physique ')
  await check(page).click()
  await expect(result(page)).toHaveText('Chính xác!')
  await openStudyFilters(page)
  await page.getByLabel('Chủ đề', { exact: true }).selectOption('a')
  await expect(input(page)).toHaveValue('')
  await expect(result(page)).toBeEmpty()
  for (const change of [
    () => page.getByRole('switch', { name: 'Trộn thẻ' }).check(),
    () => page.getByLabel('Chế độ học', { exact: true }).selectOption('new'),
    () => page.getByLabel('Loại từ', { exact: true }).selectOption('other'),
  ]) {
    await input(page).fill('attempt')
    await check(page).click()
    await openStudyFilters(page)
    await change()
    await expect(input(page)).toHaveValue('')
    await expect(result(page)).toBeEmpty()
  }
  await input(page).fill('old Unit')
  await check(page).click()
  await page.evaluate(() => { history.pushState({}, '', '/study/unit3'); dispatchEvent(new PopStateEvent('popstate')) })
  await expect(input(page)).toHaveValue('')
  await input(page).fill('DIET')
  await check(page).click()
  await expect(result(page)).toHaveText('Chính xác!')
})

test('acceptedAnswers khai báo trong JSON được loader dùng, không tự đoán đồng nghĩa/slash', async ({ page }) => {
  const data = structuredClone(unit2)
  data.flashcards[0] = { ...data.flashcards[0], english: 'Original / literal', acceptedAnswers: ['Explicit alternative'] }
  await page.route('**/data/units/unit2.json', route => route.fulfill({ json: data }))
  await page.goto('/study/unit-2')
  for (const [answer, expected] of [['original', false], ['literal', false], ['body shape', false], ['Original / literal', true], [' EXPLICIT   alternative ', true]] as const) {
    await input(page).fill(answer)
    await check(page).click()
    await expect(result(page)).toHaveText(expected ? 'Chính xác!' : 'Chưa chính xác, hãy thử lại!')
  }
})

test('Kiểm tra không đánh giá tự động; vẫn chủ động đánh dấu sau khi lật', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/study/unit-2')
  await input(page).fill('wrong')
  await check(page).click()
  await flip(page).click()
  await page.getByRole('button', { name: 'Đã thuộc', exact: true }).click()
  await expect(input(page)).toHaveValue('')
  await expect(result(page)).toBeEmpty()
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey(unit2.unitId, unit2.flashcards[0].id))).toBe(JSON.stringify({ version: 1, status: 'known' }))
  await input(page).fill('Physical')
  await check(page).click()
  await flip(page).click()
  await page.getByRole('button', { name: 'Chưa thuộc', exact: true }).click()
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey(unit2.unitId, unit2.flashcards[1].id))).toBe(JSON.stringify({ version: 1, status: 'learning' }))
})

test('Lựa chọn lưu key riêng qua refresh/chuyển Unit; tiến độ cũ và thống kê không đổi', async ({ page }) => {
  await page.goto('/')
  const key = progressKey(unit2.unitId, unit2.flashcards[0].id)
  const record = JSON.stringify({ version: 1, status: 'learning' })
  await page.evaluate(({ key, record }) => localStorage.setItem(key, record), { key, record })
  await page.goto('/study/unit-2?mode=learning')
  await input(page).fill('Physique')
  await check(page).click()
  await toggle(page).uncheck()
  expect(await page.evaluate(key => localStorage.getItem(key), TYPING_PREFERENCE_KEY)).toBe('false')
  await page.reload()
  await expect(toggle(page)).not.toBeChecked()
  await expect(input(page)).toHaveCount(0)
  await page.goto('/study/unit3')
  await expect(toggle(page)).not.toBeChecked()
  await toggle(page).check()
  await page.reload()
  await expect(input(page)).toBeVisible()
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(record)
  await page.goto('/statistics')
  await expect(page.getByRole('region', { name: 'Thống kê Human Development & Health' })).toContainText('223 thẻ · 222 chưa học · 0 đã thuộc · 1 chưa thuộc')
})

for (const scenario of ['blocked', 'corrupt', 'quota'] as const) {
  test(`Lựa chọn ${scenario}: không crash, vẫn nhập/lật, không ghi đè progress`, async ({ page }) => {
    await page.addInitScript(({ scenario, key }) => {
      if (scenario === 'blocked') Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('blocked') } })
      else if (scenario === 'corrupt') localStorage.setItem(key, '{broken')
      else {
        const original = Storage.prototype.setItem
        Storage.prototype.setItem = function(name, value) {
          if (name === key) throw new DOMException('Quota', 'QuotaExceededError')
          original.call(this, name, value)
        }
      }
    }, { scenario, key: TYPING_PREFERENCE_KEY })
    await page.goto('/study/unit-2')
    await expect(input(page)).toBeVisible()
    await toggle(page).uncheck()
    await expect(input(page)).toHaveCount(0)
    await openStudyFilters(page)
    await page.getByLabel('Chủ đề', { exact: true }).selectOption('a')
    await expect(toggle(page)).not.toBeChecked()
    await toggle(page).check()
    await input(page).fill('physique')
    await check(page).click()
    await expect(result(page)).toHaveText('Chính xác!')
    await flip(page).click()
    await expect(card(page)).toHaveAttribute('aria-pressed', 'true')
    if (scenario !== 'corrupt') await expect(page.getByText('Chưa thể lưu lựa chọn luyện gõ trên trình duyệt này.', { exact: true })).toBeVisible()
  })
}

test('Mobile touch, Light/Dark, input/nút dễ nhấn và không tràn ngang', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  try {
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4173/study/unit3')
    await input(page).fill('diet')
    await check(page).tap()
    await expect(result(page)).toHaveText('Chính xác!')
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const dark of [false, true]) {
        await page.locator('html').evaluate((el, dark) => el.classList.toggle('dark', dark), dark)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        expect((await input(page).boundingBox())!.height).toBeGreaterThanOrEqual(44)
        expect((await check(page).boundingBox())!.height).toBeGreaterThanOrEqual(44)
      }
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('.typing-answer').scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'test-results/typing-mobile-dark.png', fullPage: true })
    await flip(page).tap()
    await expect(input(page)).toHaveCount(0)
    await flip(page).tap()
    await expect(input(page)).toHaveValue('diet')
    await expect(result(page)).toHaveText('Chính xác!')
  } finally { await context.close() }
})
