import { test, expect } from '@playwright/test';

test('homepage loads and displays title', async ({ page }) => {
  await page.goto('http://localhost:4173/');
  await expect(page).toHaveTitle(/creator hub/i);
});