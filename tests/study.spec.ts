import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { Flashcard } from '../src/types/flashcard'

const cards: Flashcard[] = JSON.parse(readFileSync(new URL('../public/data/units/unit2.json', import.meta.url), 'utf8')).flashcards

test('Toàn bộ thẻ Unit 2: lật hai chiều, thứ tự, reset mặt trước và giới hạn điều hướng', async ({ page }) => {
  test.setTimeout(240_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/study/unit-2')
  const card = page.getByRole('button', { name: 'Lật flashcard', exact: true })
  const flip = page.getByRole('button', { name: 'Lật thẻ', exact: true })
  const previous = page.getByRole('button', { name: 'Thẻ trước' })
  const next = page.getByRole('button', { name: 'Thẻ tiếp' })
  await expect(previous).toBeDisabled()
  for (const [index, item] of cards.entries()) {
    if (index % 50 === 0) console.log(`Đang kiểm tra thẻ ${index + 1}/${cards.length}`)
    await expect(page.locator('.study-top')).toContainText(`${index + 1} / ${cards.length}`)
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    await expect(card.getByRole('heading', { name: item.vietnamese, exact: true })).toBeVisible()
    await expect(card.locator('.study-flashcard-face[aria-hidden="false"]')).toContainText('UNIT 02')
    await card.click()
    await expect(card).toHaveAttribute('aria-pressed', 'true')
    await expect(card.getByRole('heading', { name: item.english, exact: true })).toBeVisible()
    await flip.click()
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    await flip.click()
    if (index < cards.length - 1) await next.click()
  }
  await expect(next).toBeDisabled()
  await page.keyboard.press('ArrowRight')
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  for (let index = cards.length - 2; index >= 0; index--) {
    await previous.click()
    await expect(card).toHaveAttribute('aria-pressed', 'false')
    await expect(card.getByRole('heading', { name: cards[index].vietnamese, exact: true })).toBeVisible()
    await flip.click()
  }
  await expect(previous).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Đã thuộc', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Chưa thuộc', exact: true })).toBeEnabled()
})

test('Bàn phím: Space/Enter lật một lần, bỏ qua giữ phím và không chuyển khi nhập liệu', async ({ page }) => {
  await page.goto('/study/unit-2')
  const card = page.getByRole('button', { name: 'Lật flashcard', exact: true })
  await card.focus()
  await page.keyboard.down('Space')
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.down('Space')
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.up('Space')
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Enter')
  await expect(card).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.study-top')).toContainText(`2 / ${cards.length}`)
  await expect(card).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.study-top')).toContainText(`1 / ${cards.length}`)
  for (const tag of ['input', 'textarea', 'select', 'div']) {
    await page.evaluate(tag => {
      const element = document.createElement(tag)
      element.id = 'test-input'
      if (tag === 'div') element.contentEditable = 'true'
      document.body.append(element)
      element.focus()
    }, tag)
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.study-top')).toContainText(`1 / ${cards.length}`)
    await page.locator('#test-input').evaluate(el => el.remove())
  }
  // Nút lật dùng hành vi bàn phím mặc định của button, không bị listener toàn cục xử lý lại.
  const flip = page.getByRole('button', { name: 'Lật thẻ', exact: true })
  await flip.focus()
  await page.keyboard.press('Space')
  await expect(card).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Enter')
  await expect(card).toHaveAttribute('aria-pressed', 'false')
})

test('Animation 180 độ trên mobile: chạm, kích thước ổn định và chữ đọc đúng chiều', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4173/study/unit-2')
  const card = page.getByRole('button', { name: 'Lật flashcard', exact: true })
  const rotator = page.locator('.study-flashcard-rotator')
  await card.scrollIntoViewIfNeeded()
  const cardBox = () => card.evaluate(element => {
    const box = element.getBoundingClientRect()
    return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height }
  })
  const before = await cardBox()
  await card.tap()
  await expect.poll(() => rotator.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m11)).toBeCloseTo(-1, 4)
  expect(await cardBox()).toEqual(before)
  const back = page.locator('.study-flashcard-back')
  expect(await back.evaluate(el => getComputedStyle(el).backfaceVisibility)).toBe('hidden')
  expect(await back.evaluate(el => {
    const parent = new DOMMatrix(getComputedStyle(el.parentElement!).transform)
    return parent.multiply(new DOMMatrix(getComputedStyle(el).transform)).m11
  })).toBeCloseTo(1, 4)
  await page.screenshot({ path: 'test-results/study-mobile-answer.png', fullPage: true })
  await card.tap()
  await expect.poll(() => rotator.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m11)).toBeCloseTo(1, 4)
  expect(await cardBox()).toEqual(before)
  for (let index = 1; index < 5; index++) {
    await page.getByRole('button', { name: 'Thẻ tiếp' }).tap()
    const front = await card.boundingBox()
    await card.tap()
    await expect.poll(() => rotator.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m11)).toBeCloseTo(-1, 4)
    const backSize = await card.boundingBox()
    expect(backSize?.width).toBe(front?.width)
    expect(backSize?.height).toBe(front?.height)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await context.close()
})
