import { test, expect } from '@playwright/test';
test('小屏、横屏及桌面无横向溢出，主要页面资源可加载', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith('http://127.0.0.1:5173'))
      failures.push(`${r.status()} ${r.url()}`);
  });
  for (const [width, height, name] of [
    [375, 812, 'phone'],
    [812, 375, 'landscape'],
    [1440, 1000, 'desktop'],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '穿喜欢的，做自己。' })).toBeVisible();
    await page.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `artifacts/screenshots/${name}-today.png`, fullPage: true });
    await page.getByRole('button', { name: '衣橱', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `artifacts/screenshots/${name}-wardrobe.png`, fullPage: true });
    await page.getByRole('button', { name: '试衣间', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `artifacts/screenshots/${name}-tryon.png`, fullPage: true });
  }
  expect(failures).toEqual([]);
});
