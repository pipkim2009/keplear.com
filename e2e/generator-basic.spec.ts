import { test, expect } from '@playwright/test'

test.describe('Generator', () => {
  test('loads generator page', async ({ page }) => {
    await page.goto('/generator')
    await expect(page).toHaveURL(/\/generator/)
  })

  test('displays instrument selector or instrument', async ({ page }) => {
    await page.goto('/generator')
    // Should show either an instrument selector or an instrument display
    const hasInstrument = await page
      .locator('[class*="instrument"], [class*="keyboard"], [class*="guitar"]')
      .first()
      .isVisible()
      .catch(() => false)
    const hasSelector = await page
      .locator('[class*="selector"], [class*="choose"]')
      .first()
      .isVisible()
      .catch(() => false)
    expect(hasInstrument || hasSelector).toBeTruthy()
  })

  test('chat panel toggle works', async ({ page }) => {
    await page.goto('/generator')
    const chatButton = page.locator('[aria-label="Open chat"]')
    if (await chatButton.isVisible()) {
      await chatButton.click()
      await expect(page.locator('[aria-label="Close chat"]')).toBeVisible()
    }
  })
})
