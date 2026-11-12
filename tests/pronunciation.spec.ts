import { openStudyFilters } from './helpers/studyFilters'
import { test, expect } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { UnitData } from '../src/types/flashcard'

type Voice = { lang: string; name: string; default: boolean }
type Call = { text: string; lang: string; voiceLang: string; rate: number; pitch: number; volume: number }
interface Harness {
  calls: Call[]
  cancels: number
  events: string[]
  finish: () => void
  fail: () => void
  setVoices: (voices: Voice[]) => void
  captureOldEnd: () => void
  callOldEnd: () => void
  detached: () => boolean
}
declare global { interface Window { speechTest: Harness } }

const us = { lang: 'en-US', name: 'English US', default: false }
const gb = { lang: 'en-GB', name: 'English GB', default: false }
const vi = { lang: 'vi-VN', name: 'Vietnamese', default: true }
const data: UnitData = JSON.parse(readFileSync(new URL('../public/data/units/unit2.json', import.meta.url), 'utf8'))
const unit3Data: UnitData = JSON.parse(readFileSync(new URL('../public/data/units/unit3.json', import.meta.url), 'utf8'))

test('Unit 3 phát âm đúng từ/cụm dài; chuyển Unit hủy đọc, không đổi tiến độ Unit 2', async ({ page }) => {
  await mockSpeech(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/study/unit3')
  await back(page)
  await speaker(page).click()
  expect(await page.evaluate(() => speechTest.calls.at(-1)?.text)).toBe('Diet')
  await openStudyFilters(page)
  await page.getByLabel('Chủ đề', { exact: true }).selectOption('c')
  await openStudyFilters(page)
  await page.getByLabel('Nhóm từ', { exact: true }).selectOption('collocation')
  const subset = unit3Data.flashcards.filter(card => card.section === 'c' && card.category === 'collocation')
  const longest = subset.reduce((a, b) => a.english.length > b.english.length ? a : b)
  for (let index = 0; index < subset.indexOf(longest); index++) await page.getByRole('button', { name: 'Thẻ tiếp' }).click()
  await back(page)
  await speaker(page).click()
  expect(await page.evaluate(() => speechTest.calls.at(-1)?.text)).toBe(longest.english)
  await expect(card(page)).toHaveAttribute('aria-pressed', 'true')
  const cancels = await page.evaluate(() => speechTest.cancels)
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }))
  await page.evaluate(() => { history.pushState({}, '', '/study/unit-2'); dispatchEvent(new PopStateEvent('popstate')) })
  await expect(page.getByRole('heading', { name: 'Vóc dáng cơ thể', exact: true })).toBeVisible()
  expect(await page.evaluate(() => speechTest.cancels)).toBeGreaterThan(cancels)
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(storage)
})

async function mockSpeech(target: Page | BrowserContext, voices = [vi, gb, us], error: 'none' | 'speak' | 'voices' = 'none') {
  await target.addInitScript(({ initialVoices, error }) => {
    class Utterance {
      text: string
      lang = ''
      voice: Voice | null = null
      rate = 1
      pitch = 1
      volume = 1
      onstart: (() => void) | null = null
      onend: (() => void) | null = null
      onerror: ((event: { error: string }) => void) | null = null
      constructor(text: string) { this.text = text }
    }
    const events = new EventTarget()
    let available = initialVoices
    let current: Utterance | null = null
    let last: Utterance | null = null
    let oldEnd: (() => void) | null = null
    const harness: Harness = {
      calls: [], cancels: 0, events: [],
      finish: () => { current?.onend?.(); current = null },
      fail: () => { current?.onerror?.({ error: 'synthesis-failed' }); current = null },
      setVoices: voices => { available = voices; events.dispatchEvent(new Event('voiceschanged')) },
      captureOldEnd: () => { oldEnd = current?.onend ?? null },
      callOldEnd: () => { oldEnd?.() },
      detached: () => !!last && last.onstart === null && last.onend === null && last.onerror === null,
    }
    const synth = Object.assign(events, {
      getVoices: () => { if (error === 'voices') throw new Error('Voice engine failed'); return available },
      cancel: () => { harness.cancels++; harness.events.push('cancel'); current?.onerror?.({ error: 'canceled' }); current = null },
      speak: (utterance: Utterance) => {
        if (error === 'speak') throw new Error('Speak failed')
        harness.calls.push({ text: utterance.text, lang: utterance.lang, voiceLang: utterance.voice?.lang ?? '', rate: utterance.rate, pitch: utterance.pitch, volume: utterance.volume })
        harness.events.push(`speak:${utterance.text}`)
        current = utterance; last = utterance
        utterance.onstart?.()
      },
    })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: Utterance })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth })
    window.speechTest = harness
  }, { initialVoices: voices, error })
}

const speaker = (page: Page) => page.getByRole('button', { name: 'Phát âm tiếng Anh', exact: true })
const card = (page: Page) => page.getByRole('button', { name: 'Lật flashcard', exact: true })
async function back(page: Page) {
  await page.getByRole('button', { name: 'Lật thẻ', exact: true }).click()
  await expect(card(page)).toHaveAttribute('aria-pressed', 'true')
}

test('Physique/Physical đúng payload, chỉ phát khi nhấn; phát lại sau khi kết thúc', async ({ page }) => {
  await mockSpeech(page)
  await page.goto('/study/unit-2')
  await expect(speaker(page)).toHaveCount(0)
  await back(page)
  expect(await page.evaluate(() => speechTest.calls.length)).toBe(0)
  const storageBefore = await page.evaluate(() => JSON.stringify({ ...localStorage }))
  await speaker(page).click()
  await expect(card(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(speaker(page)).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByText('Đang phát âm…', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => speechTest.calls[0])).toEqual({ text: 'Physique', lang: 'en-US', voiceLang: 'en-US', rate: 0.9, pitch: 1, volume: 1 })
  await page.evaluate(() => speechTest.finish())
  await expect(speaker(page)).toHaveAttribute('aria-busy', 'false')
  await speaker(page).click()
  expect(await page.evaluate(() => speechTest.calls.length)).toBe(2)
  await page.getByRole('button', { name: 'Thẻ tiếp' }).click()
  await expect(speaker(page)).toHaveCount(0)
  await back(page)
  expect(await page.evaluate(() => speechTest.calls.length)).toBe(2)
  await speaker(page).click()
  expect(await page.evaluate(() => speechTest.calls.at(-1)?.text)).toBe('Physical')
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(storageBefore)
})

test('Enter/Space trên loa không lật; ArrowRight/ArrowLeft tiếp tục điều hướng', async ({ page }) => {
  await mockSpeech(page)
  await page.goto('/study/unit-2')
  await back(page)
  await speaker(page).focus()
  await page.keyboard.press('Space')
  await expect(card(page)).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => speechTest.calls.length)).toBe(1)
  await page.evaluate(() => speechTest.finish())
  await page.keyboard.press('Enter')
  await expect(card(page)).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => speechTest.calls.length)).toBe(2)
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.study-top')).toContainText('2 / 223')
  await expect(card(page)).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.study-top')).toContainText('1 / 223')
})

test('Hủy khi lật mặt Việt, đổi thẻ, rời trang; callback cũ không sửa lượt mới', async ({ page }) => {
  await mockSpeech(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/study/unit-2')
  await back(page)
  await speaker(page).click()
  await page.evaluate(() => speechTest.captureOldEnd())
  await speaker(page).click()
  await page.evaluate(() => speechTest.callOldEnd())
  await expect(speaker(page)).toHaveAttribute('aria-busy', 'true')
  expect(await page.evaluate(() => speechTest.events.slice(-2))).toEqual(['cancel', 'speak:Physique'])
  let cancels = await page.evaluate(() => speechTest.cancels)
  await page.getByRole('button', { name: 'Lật thẻ', exact: true }).click()
  await expect(speaker(page)).toHaveCount(0)
  expect(await page.evaluate(() => speechTest.cancels)).toBeGreaterThan(cancels)
  expect(await page.evaluate(() => speechTest.detached())).toBe(true)
  await back(page)
  await speaker(page).click()
  cancels = await page.evaluate(() => speechTest.cancels)
  await page.getByRole('button', { name: 'Thẻ tiếp' }).click()
  expect(await page.evaluate(() => speechTest.cancels)).toBeGreaterThan(cancels)
  await back(page)
  await speaker(page).click()
  await page.evaluate(() => speechTest.captureOldEnd())
  cancels = await page.evaluate(() => speechTest.cancels)
  await page.getByRole('navigation').getByRole('link', { name: 'Thống kê' }).click()
  expect(await page.evaluate(() => speechTest.cancels)).toBeGreaterThan(cancels)
  expect(await page.evaluate(() => speechTest.detached())).toBe(true)
  await page.evaluate(() => { speechTest.callOldEnd(); speechTest.setVoices([ { lang: 'en-US', name: 'Late voice', default: true } ]) })
  expect(errors).toEqual([])
})

test('Fallback giọng tiếng Anh khác; voiceschanged tải muộn không tự đọc', async ({ page }) => {
  await mockSpeech(page, [])
  await page.goto('/study/unit-2')
  await back(page)
  await speaker(page).click()
  await expect(page.getByText('Chưa có giọng tiếng Anh. Vui lòng thử lại sau.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => speechTest.calls.length)).toBe(0)
  await page.evaluate(voices => speechTest.setVoices(voices), [vi, gb])
  await expect(page.getByText('Chưa có giọng tiếng Anh. Vui lòng thử lại sau.', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => speechTest.calls.length)).toBe(0)
  await speaker(page).click()
  expect(await page.evaluate(() => speechTest.calls.at(-1)?.voiceLang)).toBe('en-GB')
})

test('Không chọn giọng Việt khi không có tiếng Anh', async ({ page }) => {
  await mockSpeech(page, [vi])
  await page.goto('/study/unit-2')
  await back(page)
  await speaker(page).click()
  expect(await page.evaluate(() => speechTest.calls.length)).toBe(0)
  await expect(page.getByText('Chưa có giọng tiếng Anh. Vui lòng thử lại sau.', { exact: true })).toBeVisible()
  await expect(card(page)).toHaveAttribute('aria-pressed', 'true')
})

test('Không hỗ trợ SpeechSynthesis: thông báo, không crash hoặc lật ngoài ý muốn', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined }))
  await page.goto('/study/unit-2')
  await back(page)
  await expect(page.getByText('Trình duyệt này không hỗ trợ phát âm.', { exact: true })).toBeVisible()
  await speaker(page).click()
  await expect(card(page)).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Thẻ tiếp' }).click()
  await expect(page.locator('.study-top')).toContainText('2 / 223')
})

for (const failure of ['speak', 'voices'] as const) {
  test(`Engine lỗi ${failure}: xử lý an toàn`, async ({ page }) => {
    await mockSpeech(page, [us], failure)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/study/unit-2')
    await back(page)
    await speaker(page).click()
    await expect(page.getByText('Không thể phát âm lúc này. Vui lòng thử lại.', { exact: true })).toBeVisible()
    await expect(speaker(page)).toHaveAttribute('aria-busy', 'false')
    expect(errors).toEqual([])
  })
}

test('Lỗi phát âm bất đồng bộ kết thúc trạng thái đang đọc và cho thử lại', async ({ page }) => {
  await mockSpeech(page)
  await page.goto('/study/unit-2')
  await back(page)
  await speaker(page).click()
  await page.evaluate(() => speechTest.fail())
  await expect(speaker(page)).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByText('Không thể phát âm lúc này. Vui lòng thử lại.', { exact: true })).toBeVisible()
  await speaker(page).click()
  await expect(speaker(page)).toHaveAttribute('aria-busy', 'true')
})

test('Mobile touch, cụm dài, Dark Mode và kích thước thẻ ổn định', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  try {
    await mockSpeech(context)
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4173/study/unit-2')
    await openStudyFilters(page)
    await page.getByLabel('Chủ đề', { exact: true }).selectOption('c')
    await openStudyFilters(page)
    await page.getByLabel('Nhóm từ', { exact: true }).selectOption('collocation')
    const subset = data.flashcards.filter(card => card.section === 'c' && card.category === 'collocation')
    const longest = subset.reduce((result, card) => card.english.length > result.english.length ? card : result)
    for (let i = 0; i < subset.findIndex(card => card.id === longest.id); i++) await page.getByRole('button', { name: 'Thẻ tiếp' }).tap()
    const before = await card(page).boundingBox()
    await page.getByRole('button', { name: 'Lật thẻ', exact: true }).tap()
    const button = speaker(page)
    await button.tap()
    await expect(card(page)).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => speechTest.calls.at(-1)?.text)).toBe(longest.english)
    const buttonSize = await button.boundingBox()
    expect(buttonSize!.width).toBeGreaterThanOrEqual(44)
    expect(buttonSize!.height).toBeGreaterThanOrEqual(44)
    expect((await card(page).boundingBox())!.height).toBe(before!.height)
    await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).tap()
    await expect(button).toHaveCSS('background-color', 'rgb(52, 42, 75)')
    await page.screenshot({ path: 'test-results/pronunciation-mobile-dark.png', fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  } finally { await context.close() }
})
