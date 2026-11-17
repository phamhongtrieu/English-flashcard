import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { QuizLessonData } from '../src/types/toeicQuiz'

// Independent public demo only: no real private TOEIC vocabulary in the browser.
test('Lượt ít hơn 10 hiển thị số thực tế và giữ 50 bài TOEIC thật đóng', async ({ page }) => {
  const sample: QuizLessonData = JSON.parse(readFileSync(new URL('../public/data/toeic/lessons/demo-01.json', import.meta.url), 'utf8'))
  sample.entries = sample.entries.slice(0, 4)
  for (const entry of sample.entries) entry.quiz.distractorIds = sample.entries.filter(other => other.id !== entry.id).map(other => other.id)
  await page.route('**/data/toeic/lessons/demo-01.json', route => route.fulfill({ json: sample }))
  await page.goto('/toeic')
  const planned = page.getByTestId('toeic-planned-lessons')
  await expect(planned.locator('article')).toHaveCount(50)
  await expect(planned.getByRole('link')).toHaveCount(0)
  await expect(page.locator('.toeic-samples')).toContainText('4 câu hỏi hợp lệ')
  await page.getByRole('link', { name: 'Bắt đầu trắc nghiệm' }).click()
  const options = page.getByRole('group', { name: 'Bốn đáp án tiếng Anh' }).getByRole('button')
  const seen = new Set<string>()
  for (let i = 0; i < 4; i++) {
    await expect(page.locator('.toeic-question-meta')).toContainText(`Câu ${i + 1} / 4`)
    const id = await page.locator('.toeic-question').getAttribute('data-question-id')
    expect(seen.has(id!)).toBe(false)
    seen.add(id!)
    const word = sample.entries.find(entry => entry.id === id)!.english
    const labels = await options.locator('> span:nth-child(2)').allTextContents()
    await options.nth(labels.indexOf(word)).click()
    await page.getByRole('button', { name: i === 3 ? 'Xem tổng kết' : 'Câu tiếp theo', exact: true }).click()
  }
  await expect(page.locator('.toeic-score')).toHaveText('4 / 4 câu đúng')
})
