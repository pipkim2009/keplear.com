import { test, expect } from '@playwright/test'

test.describe('Sandbox', () => {
  test('loads sandbox page', async ({ page }) => {
    await page.goto('/sandbox')
    await expect(page).toHaveURL(/\/sandbox/)
  })

  test('displays instrument selector or instrument', async ({ page }) => {
    await page.goto('/sandbox')
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
    await page.goto('/sandbox')
    const chatButton = page.locator('[aria-label="Open chat"]')
    if (await chatButton.isVisible()) {
      await chatButton.click()
      await expect(page.locator('[aria-label="Close chat"]')).toBeVisible()
    }
  })
})
