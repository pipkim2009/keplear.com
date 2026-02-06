import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Keplear/)
  })

  test('navigates to sandbox', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Start Training')
    await expect(page).toHaveURL(/\/sandbox/)
  })

  test('navigates to dashboard via header', async ({ page }) => {
    await page.goto('/')
    const dashboardLink = page.locator('header a[href="/dashboard"]')
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click()
      await expect(page).toHaveURL(/\/dashboard/)
    }
  })

  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await expect(page.locator('text=Page Not Found')).toBeVisible()
  })

  test('back button works', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Start Training')
    await expect(page).toHaveURL(/\/sandbox/)
    await page.goBack()
    await expect(page).toHaveURL('/')
  })

  test('legal pages are accessible', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.locator('h1')).toContainText(/Privacy/)

    await page.goto('/terms')
    await expect(page.locator('h1')).toContainText(/Terms/)
  })
})
