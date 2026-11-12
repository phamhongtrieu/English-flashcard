import { openStudyFilters } from './helpers/studyFilters'
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { correctMessages, incorrectMessages, idleMessages, typingMessages } from '../src/data/mascotMessages'

const mascot = (page: Page) => page.getByRole('complementary', { name: 'Bạn đồng hành khủng long' })
const input = (page: Page) => page.getByRole('textbox', { name: 'Đáp án tiếng Anh', exact: true })
const check = (page: Page) => page.getByRole('button', { name: 'Kiểm tra', exact: true })
const flip = (page: Page) => page.getByRole('button', { name: 'Lật thẻ', exact: true })
const bubble = (page: Page) => mascot(page).locator('.mascot-bubble')

test('idle, focus/typing, đúng/sai, sửa nội dung và giữ câu thoại qua render', async ({ page }) => {
  await page.goto('/study/unit-2')
  await expect(mascot(page)).toHaveAttribute('data-state', 'idle')
  expect(idleMessages).toContain(await bubble(page).textContent())
  await input(page).focus()
  await expect(mascot(page)).toHaveAttribute('data-state', 'typing')
  expect(typingMessages).toContain(await bubble(page).textContent())
  await input(page).blur()
  await expect(mascot(page)).toHaveAttribute('data-state', 'idle')
  await input(page).fill('physic')
  await input(page).blur()
  await expect(mascot(page)).toHaveAttribute('data-state', 'typing')
  await check(page).click()
  await expect(mascot(page)).toHaveAttribute('data-state', 'incorrect')
  expect(incorrectMessages).toContain(await bubble(page).textContent())
  await input(page).fill('PHYSIQUE')
  await expect(mascot(page)).toHaveAttribute('data-state', 'typing')
  await check(page).click()
  await expect(mascot(page)).toHaveAttribute('data-state', 'correct')
  const message = await bubble(page).textContent()
  expect(correctMessages).toContain(message)
  await input(page).focus()
  await input(page).blur()
  await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click()
  await expect(bubble(page)).toHaveText(message!)
  await expect(mascot(page)).toHaveAttribute('data-state', 'correct')
  await expect(page.locator('.study-top')).toContainText('1 / 223')
  await expect(page.locator('.study-top')).toContainText('Chưa học')
})

test('Câu phản hồi lấy từ danh sách, chỉ chọn lại khi kiểm tra; không tự đổi theo focus', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.99 })
  await page.goto('/study/unit-2')
  await input(page).fill('Physique')
  await input(page).press('Enter')
  await expect(bubble(page)).toHaveText(correctMessages.at(-1)!)
  await page.evaluate(() => { Math.random = () => 0 })
  await input(page).blur()
  await expect(bubble(page)).toHaveText(correctMessages.at(-1)!)
  await check(page).click()
  await expect(bubble(page)).toHaveText(correctMessages[0])
  await input(page).fill('wrong')
  await check(page).click()
  await expect(bubble(page)).toHaveText(incorrectMessages[0])
})

test('Reset khi chuyển thẻ, lọc/trộn/mode, chuyển Unit; rời trang không lỗi unmount', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/study/unit-2')
  for (const change of [
    () => page.getByRole('button', { name: 'Thẻ tiếp' }).click(),
    () => page.getByRole('button', { name: 'Thẻ trước' }).click(),
    () => page.getByLabel('Chủ đề', { exact: true }).selectOption('a'),
    () => page.getByLabel('Nhóm từ', { exact: true }).selectOption('base_word'),
    () => page.getByLabel('Loại từ', { exact: true }).selectOption('n'),
    () => page.getByRole('switch', { name: 'Trộn thẻ' }).check(),
    () => page.getByLabel('Chế độ học', { exact: true }).selectOption('new'),
    () => page.evaluate(() => { history.pushState({}, '', '/study/unit3'); dispatchEvent(new PopStateEvent('popstate')) }),
  ]) {
    await input(page).fill('wrong')
    await check(page).click()
    await expect(mascot(page)).toHaveAttribute('data-state', 'incorrect')
    await openStudyFilters(page)
    await change()
    await expect(mascot(page)).toHaveAttribute('data-state', 'idle')
    await expect(input(page)).toHaveValue('')
  }
  await page.getByRole('navigation').getByRole('link', { name: 'Thống kê' }).click()
  await expect(mascot(page)).toHaveCount(0)
  expect(errors).toEqual([])
})

test('Ẩn theo vùng luyện gõ/mặt sau; không thay input, phản hồi và LocalStorage', async ({ page }) => {
  await page.goto('/study/unit-2')
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }))
  await input(page).fill('Physique')
  await check(page).click()
  const message = await bubble(page).textContent()
  await flip(page).click()
  await expect(mascot(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Physique', exact: true })).toBeVisible()
  await flip(page).click()
  await expect(mascot(page)).toHaveAttribute('data-state', 'correct')
  await expect(bubble(page)).toHaveText(message!)
  await expect(input(page)).toHaveValue('Physique')
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(storage)
  const toggle = page.getByRole('switch', { name: 'Luyện gõ đáp án', exact: true })
  await toggle.uncheck()
  await expect(mascot(page)).toHaveCount(0)
  await toggle.check()
  await expect(mascot(page)).toHaveAttribute('data-state', 'correct')
})

test('Desktop bên phải, mobile bên dưới: không chồng input/nút, Light/Dark không tràn ngang', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
  await page.goto('/study/unit-2')
  for (const width of [320, 390, 600, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const dark of [false, true]) {
      await page.locator('html').evaluate((el, dark) => el.classList.toggle('dark', dark), dark)
      const m = (await mascot(page).boundingBox())!
      const f = (await page.locator('.typing-form').boundingBox())!
      const field = (await input(page).boundingBox())!
      const button = (await check(page).boundingBox())!
      if (width > 600) expect(m.x).toBeGreaterThanOrEqual(f.x + f.width)
      else expect(m.y).toBeGreaterThanOrEqual(f.y + f.height)
      for (const box of [field, button]) {
        const overlap = m.x < box.x + box.width && m.x + m.width > box.x && m.y < box.y + box.height && m.y + m.height > box.y
        expect(overlap).toBe(false)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await expect(bubble(page)).toBeVisible()
    }
  }
  for (const [width, theme] of [[1440, 'light'], [390, 'dark']] as const) {
    await page.setViewportSize({ width, height: 1000 })
    await page.locator('html').evaluate((el, dark) => el.classList.toggle('dark', dark), theme === 'dark')
    await page.locator('.typing-answer').screenshot({ path: `test-results/mascot-${width}-${theme}.png` })
  }
})

test('Reduced motion tắt bounce; trạng thái vẫn đúng bằng mobile touch', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  try {
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4173/study/unit3')
    await input(page).tap()
    await expect(mascot(page)).toHaveAttribute('data-state', 'typing')
    await input(page).fill('Diet')
    await check(page).tap()
    await expect(mascot(page)).toHaveAttribute('data-state', 'correct')
    const body = mascot(page).locator('.mascot-illustration')
    await expect(body).toHaveCSS('transform', 'none')
    await expect(bubble(page)).toHaveCSS('opacity', '1')
  } finally { await context.close() }
})
