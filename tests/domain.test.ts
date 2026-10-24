import { describe, it, expect } from 'vitest';
import {
  validateGarment,
  filterGarments,
  suggestOutfits,
  removeGarment,
  parseBackup,
  makeBackup,
} from '../src/domain';
import { initialState } from '../src/seed';

describe('衣橱业务与安全备份', () => {
  it('拒绝无名称和无图片的衣物', () => {
    expect(() => validateGarment({ name: ' ', image: '' })).toThrow('名称');
    expect(() => validateGarment({ name: '衬衫', image: '' })).toThrow('照片');
  });
  it('支持组合中文关键词、类别与收藏筛选', () => {
    const items = initialState().garments;
    expect(filterGarments(items, { query: '白', category: '上装' }).length).toBeGreaterThan(0);
    expect(filterGarments(items, { query: '不存在' })).toHaveLength(0);
    expect(filterGarments(items, { favorite: true }).every((g) => g.favorite)).toBe(true);
  });
  it('用用户衣橱给出不重复的上下装组合及解释', () => {
    const outfits = suggestOutfits(initialState().garments, '通勤');
    expect(outfits.length).toBeGreaterThan(0);
    for (const outfit of outfits) {
      expect(outfit.garmentIds.length).toBeGreaterThanOrEqual(2);
      expect(new Set(outfit.garmentIds).size).toBe(outfit.garmentIds.length);
      expect(outfit.reason.length).toBeGreaterThan(10);
    }
    expect(suggestOutfits([], '通勤')).toEqual([]);
  });
  it('删除衣物清理穿搭引用但保留试衣历史图片', () => {
    const state = initialState();
    const id = state.garments[0].id;
    state.outfits = [
      {
        id: 'o1',
        name: '搭配',
        garmentIds: [id, state.garments[1].id],
        occasion: '通勤',
        note: '',
        favorite: false,
        createdAt: '2026-10-24',
        wornDates: [],
      },
    ];
    const result = removeGarment(state, id);
    expect(result.garments.some((g) => g.id === id)).toBe(false);
    expect(result.outfits[0].garmentIds).not.toContain(id);
    expect(state.garments.some((g) => g.id === id)).toBe(true);
  });
  it('备份可恢复且不含服务密钥，拒绝损坏/错版本/坏图片', () => {
    const state = initialState();
    const serialized = makeBackup({ ...state, apiKey: 'secret-key' } as typeof state);
    expect(serialized).not.toContain('secret-key');
    expect(parseBackup(serialized).garments).toEqual(state.garments);
    expect(() => parseBackup('{}')).toThrow();
    expect(() => parseBackup('{')).toThrow();
    expect(() => parseBackup(serialized.replace('"version": 1', '"version": 9'))).toThrow();
    const malicious = JSON.parse(serialized);
    malicious.garments[0].image = 'javascript:alert(1)';
    expect(() => parseBackup(JSON.stringify(malicious))).toThrow('图片');
  });
});
