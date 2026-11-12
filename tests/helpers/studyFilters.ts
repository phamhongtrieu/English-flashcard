import type { Page } from '@playwright/test'

/** Expand only when an existing test needs to operate the filter controls. */
export async function openStudyFilters(page: Page) {
  const button = page.getByRole('button', { name: 'Bộ lọc Flashcard', exact: true })
  if (await button.getAttribute('aria-expanded') === 'false') await button.click()
}
