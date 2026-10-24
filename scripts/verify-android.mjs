// Runs only against the dedicated Yixu emulator. Optional --live uploads public demo images.
import { _android, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const devices = await _android.devices();
const device = devices.find((d) => d.serial() === 'emulator-5582');
const evidence = { checkedAt: new Date().toISOString(), serial: 'emulator-5582', checks: [] };
function record(name, details = {}) {
  evidence.checks.push({ name, ...details });
  console.log(JSON.stringify({ name, ...details }));
}
async function attach() {
  const page = await (await device.webView({ pkg: 'com.yixu.wardrobe' })).page();
  page.setDefaultTimeout(15_000);
  return page;
}
try {
  if (!device) throw new Error('Start scripts/start-emulator.ps1 and install the APK first');
  let page = await attach();
  if (await page.getByRole('button', { name: '关闭', exact: true }).isVisible())
    await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '今日', exact: true }).click();
  await expect(page.getByRole('heading', { name: '穿喜欢的，做自己。' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/android-today.png' });
  record('APK packaged assets loaded', { url: page.url() });
  const backupDate = new Date().toISOString().slice(0, 10);
  const raw = (await device.shell(`cat /sdcard/Download/*${backupDate}.json`)).toString();
  const backup = JSON.parse(raw);
  if (!backup.garments.some((g) => g.name === '安卓导入白衬衫'))
    throw new Error('Native imported photo not found in the exported backup');
  record('Native photo import and system backup export', {
    garmentCount: backup.garments.length,
    backupBytes: Buffer.byteLength(raw),
    version: backup.version,
  });
  await device.shell(
    'am force-stop com.yixu.wardrobe; am start -W -n com.yixu.wardrobe/.MainActivity',
  );
  page = await attach();
  await page.context().setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '衣橱', exact: true }).click();
  await page.getByLabel('搜索衣橱').fill('安卓导入');
  await expect(page.getByRole('button', { name: '查看 安卓导入白衬衫' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/screenshots/android-offline-persistence.png' });
  const online = await page.evaluate(() => navigator.onLine);
  if (online) throw new Error('WebView offline emulation did not take effect');
  record('Process restart followed by offline reload preserves imported garment', { online });
  await device.shell('input keyevent KEYCODE_BACK; echo back');
  await expect(page.getByRole('heading', { name: '穿喜欢的，做自己。' })).toBeVisible();
  record('Android system back returns to Today');
  await page.context().setOffline(false);
  if (process.argv.includes('--live')) {
    await page.getByRole('button', { name: '试衣间', exact: true }).click();
    await page.getByRole('button', { name: '使用示例模特' }).click();
    await page.getByRole('button', { name: '选择 云朵白 · 宽松衬衫' }).click();
    await page.getByRole('button', { name: '生成试衣效果', exact: true }).click();
    await page.getByRole('button', { name: '同意并开始试衣' }).click();
    await Promise.race([
      page.getByText('已保存在本地', { exact: true }).waitFor({ timeout: 245_000 }),
      page
        .locator('.error-message')
        .waitFor({ timeout: 245_000 })
        .then(async () => {
          throw new Error(await page.locator('.error-message').innerText());
        }),
    ]);
    const image = await page
      .getByAltText('云朵白 · 宽松衬衫的真实 AI 试衣结果')
      .getAttribute('src');
    if (!image?.startsWith('data:image/jpeg;base64,'))
      throw new Error('Native AI result was not persisted locally');
    await writeFile(
      'artifacts/android-live-result.jpg',
      Buffer.from(image.split(',')[1], 'base64'),
    );
    await page.screenshot({ path: 'artifacts/screenshots/android-live-tryon.png', fullPage: true });
    record('Native APK real FASHN generation and local history', {
      resultBytes: Buffer.from(image.split(',')[1], 'base64').length,
    });
  }
  await device.screenshot({ path: 'artifacts/screenshots/android-device-verified.png' });
  evidence.success = true;
} catch (error) {
  evidence.error = String(error);
  console.error(evidence.error);
  process.exitCode = 1;
} finally {
  await writeFile(
    process.argv.includes('--live')
      ? 'artifacts/android-verification-live.json'
      : 'artifacts/android-verification.json',
    JSON.stringify(evidence, null, 2),
  );
  await Promise.all(devices.map((d) => d.close()));
}
