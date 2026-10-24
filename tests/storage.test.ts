import 'fake-indexeddb/auto';
import { it, expect } from 'vitest';
import { loadState, saveState } from '../src/storage';

it('首次建立示例衣橱；后续重启保留修改，清空也不会再次注入样例', async () => {
  const first = await loadState();
  expect(first.garments.length).toBe(8);
  first.profile.nickname = '林林';
  first.garments = [];
  await saveState(first);
  const restored = await loadState();
  expect(restored.profile.nickname).toBe('林林');
  expect(restored.garments).toEqual([]);
  const corrupt = { ...restored, version: 99 };
  await expect(saveState(corrupt as typeof restored)).rejects.toThrow();
  expect((await loadState()).profile.nickname).toBe('林林');
});
