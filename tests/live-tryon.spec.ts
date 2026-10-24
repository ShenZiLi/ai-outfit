import { test, expect } from '@playwright/test';
test('真实公共模型：本地衣物→上传→生成→本地历史→保存穿搭', async ({ page }) => {
  test.skip(
    process.env.YIXU_LIVE_AI !== '1',
    '设置 YIXU_LIVE_AI=1 才会上传公开示例并消耗公共 GPU 额度',
  );
  test.setTimeout(260_000);
  await page.goto('/');
  await page.getByRole('button', { name: '试衣间', exact: true }).click();
  await page.getByRole('button', { name: '使用示例模特' }).click();
  await page.getByRole('button', { name: '选择 云朵白 · 宽松衬衫' }).click();
  await page.getByRole('button', { name: '生成试衣效果', exact: true }).click();
  await page.getByRole('button', { name: '同意并开始试衣' }).click();
  await Promise.race([
    expect(page.getByText('已保存在本地', { exact: true })).toBeVisible({ timeout: 245_000 }),
    page
      .locator('.error-message')
      .waitFor({ timeout: 245_000 })
      .then(async () => {
        throw new Error(await page.locator('.error-message').innerText());
      }),
  ]);
  const result = page.getByAltText('云朵白 · 宽松衬衫的真实 AI 试衣结果');
  await expect(result).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  await expect(result).toBeInViewport();
  await page.screenshot({ path: 'artifacts/screenshots/live-browser-tryon.png', fullPage: true });
  await page.getByRole('button', { name: '保存到穿搭集' }).click();
  await page.getByLabel('穿搭名称').fill('白衬衫 · 真实试衣');
  await page.getByRole('button', { name: '保存穿搭', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '试衣间', exact: true }).click();
  await expect(page.getByRole('button', { name: '查看试衣 云朵白 · 宽松衬衫' })).toBeVisible();
  await page.getByRole('button', { name: '穿搭集', exact: true }).click();
  await expect(page.getByRole('heading', { name: '白衬衫 · 真实试衣' })).toBeVisible();
});
