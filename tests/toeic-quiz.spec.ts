import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { QuizLessonData } from '../src/types/toeicQuiz'
import { toeicQuizProgressKey } from '../src/utils/toeicQuizProgress'

const sample: QuizLessonData = JSON.parse(readFileSync(new URL('../public/data/toeic/lessons/demo-01.json', import.meta.url), 'utf8'))
const sampleKey = toeicQuizProgressKey('toeic-sample', 'demo-01')
const options = (page: Page) => page.getByRole('group', { name: 'Bốn đáp án tiếng Anh' }).getByRole('button')
const mascot = (page: Page) => page.getByRole('complementary', { name: 'Bạn đồng hành khủng long' })

test('50 bài đóng, một bài mẫu độc lập; truy cập bài chưa duyệt không chơi được', async ({ page }) => {
  const forbidden: string[] = []
  page.on('request', request => { if (/data-preparation|toeic_600_words\.csv|data\/toeic\/lessons\/toeic-/.test(request.url())) forbidden.push(request.url()) })
  await page.goto('/toeic')
  await expect(page.getByRole('heading', { name: 'TOEIC Vocabulary', exact: true })).toBeVisible()
  const planned = page.getByTestId('toeic-planned-lessons')
  await expect(planned.locator('article')).toHaveCount(50)
  await expect(planned.getByRole('link')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Bắt đầu trắc nghiệm' })).toHaveCount(1)
  await page.goto('/toeic/lesson/toeic-03')
  await expect(page.getByRole('heading', { name: 'Bài học chưa sẵn sàng' })).toBeVisible()
  await expect(options(page)).toHaveCount(0)
  await page.goto('/toeic/lesson/not-a-lesson')
  await expect(page.getByRole('alert')).toContainText('không tồn tại')
  expect(forbidden).toEqual([])
})

test('10 câu, phản hồi đúng/sai và mascot, khóa lựa chọn, tính điểm, lưu riêng và luyện lại', async ({ page }) => {
  const oldKey = 'english-flashcard-progress-v1:unit-2:unit-2-test'
  const sentinel = JSON.stringify({ version: 1, status: 'known' })
  await page.addInitScript(({ oldKey, sentinel }) => localStorage.setItem(oldKey, sentinel), { oldKey, sentinel })
  await page.goto('/toeic/lesson/demo-01')
  await expect(options(page)).toHaveCount(4)
  await expect(mascot(page)).toHaveAttribute('data-state', 'idle')
  await expect(mascot(page)).toHaveAttribute('data-walking', 'false')
  await expect(mascot(page).getByRole('switch')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Đáp án tiếng Anh' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Lật flashcard' })).toHaveCount(0)
  const seen = new Set<string>()
  for (let i = 0; i < 10; i++) {
    const questionId = await page.locator('.toeic-question').getAttribute('data-question-id')
    expect(seen.has(questionId!)).toBe(false)
    seen.add(questionId!)
    const word = sample.entries.find(entry => entry.id === questionId)!.english
    const labels = await options(page).locator('> span:nth-child(2)').allTextContents()
    expect(new Set(labels.map(label => label.trim().toLowerCase())).size).toBe(4)
    const position = labels.indexOf(word)
    const correct = i % 2 === 0
    await options(page).nth(correct ? position : (position + 1) % 4).click()
    for (const button of await options(page).all()) await expect(button).toBeDisabled()
    await expect(page.locator('.toeic-feedback')).toContainText(correct ? 'Chính xác!' : `Đáp án đúng: ${word}`)
    await expect(mascot(page)).toHaveAttribute('data-state', correct ? 'correct' : 'incorrect')
    if (correct) await expect(mascot(page).locator('.mascot-sparkles')).toHaveCount(1)
    const next = page.getByRole('button', { name: i === 9 ? 'Xem tổng kết' : 'Câu tiếp theo', exact: true })
    await next.click()
  }
  await expect(page.getByRole('heading', { name: 'Bạn đã đi thêm một chặng!' })).toBeVisible()
  await expect(page.locator('.toeic-score')).toHaveText('5 / 10 câu đúng')
  await expect(page.locator('.toeic-metrics')).toContainText('50%')
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), sampleKey)
  expect(stored.correct).toBe(5)
  expect(stored.incorrect).toBe(5)
  expect(stored.completedRuns).toBe(1)
  expect(stored.attempts[0].answers).toHaveLength(10)
  expect(await page.evaluate(key => localStorage.getItem(key), oldKey)).toBe(sentinel)
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.includes('toeic-vocabulary')))).toEqual([])
  await page.getByRole('button', { name: 'Luyện lượt mới' }).click()
  await expect(page.locator('.toeic-question-meta')).toContainText('Câu 1 / 10')
  await page.getByRole('main').getByRole('link', { name: 'TOEIC Vocabulary' }).click()
  await page.reload()
  await expect(page.locator('.toeic-samples')).toContainText('5 đúng · 5 sai · 50% chính xác')
  await page.getByText('Lịch sử luyện tập (1 lượt gần nhất)').click()
  await expect(page.locator('.toeic-history')).toContainText('5/10 đúng')
})

test('Responsive 320–1440, dark mode và mascot không chồng lựa chọn', async ({ page }) => {
  await page.goto('/toeic/lesson/demo-01')
  await expect(options(page)).toHaveCount(4)
  await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const a = (await page.locator('.toeic-options').boundingBox())!
    const b = (await mascot(page).boundingBox())!
    expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true)
    if (width === 375 || width === 1440) await page.screenshot({ path: `.work/toeic-${width}-dark.png`, fullPage: true })
  }
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('Dữ liệu bài lỗi / manifest lỗi có thông báo và không mở Quiz', async ({ page }) => {
  await page.route('**/data/toeic/lessons/demo-01.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"schemaVersion":1}' }))
  await page.goto('/toeic/lesson/demo-01')
  await expect(page.getByRole('heading', { name: 'Bài học chưa sẵn sàng' })).toBeVisible()
  await expect(options(page)).toHaveCount(0)
  await page.route('**/data/toeic/catalog.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await page.goto('/toeic')
  await expect(page.getByRole('alert')).toContainText('Danh mục TOEIC không hợp lệ')
  await expect(page.getByRole('button', { name: 'Thử tải lại' })).toBeVisible()
})

test('LocalStorage bị chặn vẫn chơi được và cảnh báo', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('Blocked') } })
  await page.goto('/toeic/lesson/demo-01')
  await options(page).first().click()
  await expect(page.locator('.toeic-notice')).toContainText('Chưa thể đọc hoặc lưu tiến độ')
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click()
  await expect(page.locator('.toeic-question-meta')).toContainText('Câu 2 / 10')
})
