import { test, expect } from '@playwright/test'

test('Các route trực tiếp, refresh, điều hướng và trang 404', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const [path, title] of [['/', 'Học từ vựng tiếng Anh thông minh hơn.'], ['/study', 'Chọn Unit để bắt đầu học'], ['/study/unit-2', 'Human Development & Health'], ['/statistics', 'Mỗi bước nhỏ đều đáng nhớ.'], ['/khong-ton-tai', 'Trang này chưa có trong bộ thẻ.']]) {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
  }
  await page.getByRole('navigation').getByRole('link', { name: 'Học từ vựng' }).click()
  await expect(page).toHaveURL(/\/study$/)
  await page.getByRole('link', { name: 'Bắt đầu học' }).first().click()
  await expect(page.getByRole('button', { name: 'Lật thẻ', exact: true })).toBeEnabled()
  expect(errors).toEqual([])
})

test('Chế độ sáng/tối đổi giao diện và lưu qua refresh, điều hướng', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  const light = await page.locator('html').evaluate(el => getComputedStyle(el).backgroundColor)
  await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(light)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByRole('navigation').getByRole('link', { name: 'Thống kê' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Chuyển sang giao diện sáng' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  expect(await page.evaluate(() => localStorage.getItem('ef-theme'))).toBe('light')
})

for (const width of [320, 390, 768, 1440]) {
  test(`Responsive ${width}px, mọi trang trong hai chế độ`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    for (const path of ['/', '/study', '/study/unit-2', '/study/unit3', '/statistics', '/404']) {
      await page.goto(path)
      for (const dark of [false, true]) {
        await page.locator('html').evaluate((el, isDark) => el.classList.toggle('dark', isDark), dark)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        for (const link of await page.getByRole('navigation').getByRole('link').all()) await expect(link).toBeVisible()
      }
    }
  })
}

test('Chỉ lật/chuyển chưa ghi đánh giá; vẫn chạy khi LocalStorage bị chặn', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('ef-progress-v1', '{untouched'))
  await page.goto('/study/unit-2')
  await page.getByRole('button', { name: 'Lật thẻ', exact: true }).click()
  await page.getByRole('button', { name: 'Thẻ tiếp' }).click()
  expect(await page.evaluate(() => localStorage.getItem('ef-progress-v1'))).toBe('{untouched')
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Storage blocked') } })
  })
  await page.goto('/study/unit-2')
  await page.getByRole('button', { name: 'Lật thẻ', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Physique', exact: true })).toBeVisible()
})

test('Ảnh kiểm tra desktop và mobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.goto('/')
  await expect(page.locator('.unit-card')).toHaveCount(2)
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click()
  await page.screenshot({ path: 'test-results/home-mobile-dark.png', fullPage: true })
})
