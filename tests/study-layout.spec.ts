import { test, expect } from '@playwright/test'
import { openStudyFilters } from './helpers/studyFilters'

test('Bộ lọc mặc định đóng; mở/đóng giữ nguyên mọi lựa chọn, thẻ và câu trả lời', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/study/unit-2')
  const toggle = page.getByRole('button', { name: 'Bộ lọc Flashcard', exact: true })
  const section = page.getByLabel('Chủ đề', { exact: true })
  const input = page.getByRole('textbox', { name: 'Đáp án tiếng Anh', exact: true })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(section).toBeHidden()
  await expect(page.locator('.filter-summary')).toBeVisible()
  await expect(page.locator('.filter-count')).toHaveText('223 / 223 thẻ phù hợp')
  await openStudyFilters(page)
  await section.selectOption('a')
  await page.getByLabel('Nhóm từ', { exact: true }).selectOption('base_word')
  await page.getByLabel('Loại từ', { exact: true }).selectOption('n')
  await page.getByLabel('Chế độ học', { exact: true }).selectOption('new')
  await page.getByRole('switch', { name: 'Trộn thẻ' }).check()
  await page.getByRole('button', { name: 'Thẻ tiếp' }).click()
  await input.fill('attempt')
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click()
  const heading = await page.locator('.study-flashcard-face[aria-hidden="false"] h3').textContent()
  const counter = await page.locator('.study-top').textContent()
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }))
  await toggle.click()
  await expect(section).toBeHidden()
  await expect(page.locator('.filter-summary')).toContainText('Phần A')
  await expect(page.locator('.filter-summary')).toContainText('Base Word')
  await expect(page.locator('.filter-summary')).toContainText('Danh từ')
  await expect(page.locator('.filter-summary')).toContainText('Thẻ chưa học')
  await expect(page.locator('.filter-summary')).toContainText('Đang trộn')
  await expect(input).toHaveValue('attempt')
  await expect(page.locator('.typing-result')).toHaveText('Chưa chính xác, hãy thử lại!')
  await expect(page.locator('.study-top')).toHaveText(counter!)
  await openStudyFilters(page)
  await expect(section).toHaveValue('a')
  await expect(page.getByLabel('Nhóm từ', { exact: true })).toHaveValue('base_word')
  await expect(page.getByLabel('Loại từ', { exact: true })).toHaveValue('n')
  await expect(page.getByLabel('Chế độ học', { exact: true })).toHaveValue('new')
  await expect(page.getByRole('switch', { name: 'Trộn thẻ' })).toBeChecked()
  expect(await page.locator('.study-flashcard-face[aria-hidden="false"] h3').textContent()).toBe(heading)
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(storage)
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Enter')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
})

test('Flashcard/input xuất hiện trong màn hình đầu tiên ở desktop và mobile; không tràn ngang', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
  for (const [width, height] of [[1440, 900], [390, 844], [375, 812], [430, 932]]) {
    await page.setViewportSize({ width, height })
    for (const unit of ['unit-2', 'unit3']) {
      await page.goto(`/study/${unit}`)
      await expect(page.getByRole('button', { name: 'Bộ lọc Flashcard', exact: true })).toHaveAttribute('aria-expanded', 'false')
      const field = page.getByRole('textbox', { name: 'Đáp án tiếng Anh', exact: true })
      for (const dark of [false, true]) {
        await page.locator('html').evaluate((el, dark) => el.classList.toggle('dark', dark), dark)
        await expect(field).toBeInViewport({ ratio: 1 })
        await expect(page.getByRole('button', { name: 'Lật flashcard', exact: true })).toBeInViewport({ ratio: 1 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
      if (unit === 'unit3' && [1440, 390].includes(width)) await page.screenshot({ path: `test-results/study-compact-${width}.png`, fullPage: true })
    }
  }
})

test('Ghi chú nội bộ giữ trong JSON nhưng không xuất hiện trong DOM người học', async ({ page }) => {
  for (const [id, file] of [['unit-2', 'unit2'], ['unit3', 'unit3']]) {
    const data = await (await page.request.get(`/data/units/${file}.json`)).json()
    expect(data.reviewNotes.length).toBeGreaterThan(0)
    await page.goto(`/study/${id}`)
    await expect(page.getByRole('button', { name: 'Lật flashcard', exact: true })).toBeVisible()
    await expect(page.locator('.data-note')).toHaveCount(0)
    await expect(page.getByText(/Cần rà soát/)).toHaveCount(0)
    await page.getByRole('button', { name: 'Lật thẻ', exact: true }).click()
    await expect(page.getByText(/Cần rà soát/)).toHaveCount(0)
  }
})
