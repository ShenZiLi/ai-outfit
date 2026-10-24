export const categories = ['上装', '下装', '外套', '连衣裙', '鞋履', '配饰'] as const;
export const occasions = ['日常', '通勤', '约会', '运动', '旅行'] as const;
export const seasons = ['四季', '春秋', '夏季', '冬季'] as const;
export type Category = typeof categories[number];
export type Occasion = typeof occasions[number];
export type Season = typeof seasons[number];
export interface Garment {
  id: string; name: string; image: string; category: Category; color: string;
  season: Season; occasions: Occasion[]; brand: string; price: number;
  favorite: boolean; wornCount: number; createdAt: string; isSample?: boolean;
}
export interface Outfit {
  id: string; name: string; garmentIds: string[]; occasion: Occasion; note: string;
  favorite: boolean; createdAt: string; wornDates: string[]; image?: string;
}
export interface TryonResult {
  id: string; image: string; person: string; garmentImage: string;
  garmentId: string; garmentName: string; provider: 'idm' | 'aliyun'; createdAt: string;
}
export interface Profile {
  nickname: string; height: number; weight: number; photo: string;
  provider: 'idm' | 'aliyun'; apiBase: string;
}
export interface WardrobeState {
  version: 1; garments: Garment[]; outfits: Outfit[]; history: TryonResult[]; profile: Profile;
}
export const uid = () => crypto.randomUUID();
export const today = () => new Date().toLocaleDateString('en-CA');
export function validImage(value: unknown): value is string {
  return typeof value === 'string' && value.length < 12_000_000 &&
    (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value) ||
     /^\/images\/[a-z0-9-]+\.(svg|jpg|jpeg|webp|png)$/.test(value));
}
export function validateGarment(item: Partial<Garment>) {
  if (!item.name?.trim()) throw new Error('请填写衣物名称');
  if (item.name.trim().length > 60) throw new Error('名称不能超过 60 个字');
  if (!validImage(item.image)) throw new Error('请选择有效的衣物照片');
  if (item.category && !categories.includes(item.category)) throw new Error('衣物分类无效');
  if (item.price !== undefined && (!Number.isFinite(item.price) || item.price < 0 || item.price > 1_000_000)) throw new Error('请填写有效价格');
}
export function filterGarments(items: Garment[], filter: { query?: string; category?: string; favorite?: boolean; season?: string }) {
  const terms = filter.query?.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean) || [];
  return items.filter(g => (!filter.category || g.category === filter.category) &&
    (!filter.favorite || g.favorite) && (!filter.season || g.season === filter.season || g.season === '四季') &&
    terms.every(term => [g.name, g.brand, g.category, g.color, g.season, ...g.occasions].join(' ').toLocaleLowerCase().includes(term)));
}
export function suggestOutfits(items: Garment[], occasion: Occasion): { garmentIds: string[]; reason: string; name: string }[] {
  const rank = (g: Garment) => (g.occasions.includes(occasion) ? 10 : 0) + (g.favorite ? 2 : 0) - g.wornCount / 100;
  const sorted = [...items].sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id));
  const tops = sorted.filter(g => g.category === '上装');
  const bottoms = sorted.filter(g => g.category === '下装');
  const shoes = sorted.filter(g => g.category === '鞋履');
  const outer = sorted.find(g => g.category === '外套' && g.occasions.includes(occasion));
  const results: ReturnType<typeof suggestOutfits> = [];
  for (const [i, top] of tops.entries()) {
    const bottom = bottoms[i % Math.max(bottoms.length, 1)];
    if (!bottom) break;
    const matching = [top, bottom, ...(shoes[i % Math.max(shoes.length, 1)] ? [shoes[i % shoes.length]] : []), ...(outer && i === 0 ? [outer] : [])];
    results.push({ garmentIds: matching.map(g => g.id), name: `${occasion} · ${top.color}与${bottom.color}`,
      reason: `用${top.color}${top.category}搭配${bottom.color}${bottom.category}，${occasion === '通勤' ? '利落廓形让工作日更从容' : occasion === '约会' ? '用自然的配色留一点轻松感' : '基础单品组合出轻松的日常层次'}。优先考虑标记为${occasion}的衣物。` });
    if (results.length === 3) break;
  }
  for (const dress of sorted.filter(g => g.category === '连衣裙')) {
    if (results.length >= 3 || !shoes.length) break;
    results.push({ garmentIds: [dress.id, shoes[0].id], name: `${occasion} · 一件成套`, reason: `${dress.color}连衣裙配${shoes[0].color}鞋履，减少搭配步骤，让${occasion}出门更轻松。` });
  }
  return results;
}
export function removeGarment(state: WardrobeState, id: string): WardrobeState {
  return { ...state, garments: state.garments.filter(g => g.id !== id),
    outfits: state.outfits.map(o => ({ ...o, garmentIds: o.garmentIds.filter(gid => gid !== id) })) };
}
const text = (v: unknown, max = 500): v is string => typeof v === 'string' && v.length <= max;
const number = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
const uniqueIds = (items: { id: string }[]) => items.every(i => text(i.id, 100) && i.id.length > 0) && new Set(items.map(i => i.id)).size === items.length;
export function parseBackup(raw: string): WardrobeState {
  if (raw.length > 120_000_000) throw new Error('备份超过 120MB，请分批整理后再导入');
  let s: WardrobeState;
  try { s = JSON.parse(raw); } catch { throw new Error('备份不是有效的 JSON 文件'); }
  if (!s || s.version !== 1 || !Array.isArray(s.garments) || !Array.isArray(s.outfits) || !Array.isArray(s.history) || !s.profile) throw new Error('不支持的衣序备份格式或版本');
  if (s.garments.length > 2000 || s.outfits.length > 2000 || s.history.length > 500) throw new Error('备份记录数量过多');
  if (![s.garments, s.outfits, s.history].every(uniqueIds)) throw new Error('备份包含重复或无效的记录编号');
  for (const g of s.garments) {
    if (!g || !validImage(g.image)) throw new Error('备份的衣物图片无效');
    validateGarment(g);
    if (!categories.includes(g.category) || !seasons.includes(g.season) || !text(g.color, 30) || !text(g.brand, 60) ||
      !Array.isArray(g.occasions) || !g.occasions.every(o => occasions.includes(o)) || !number(g.price, 1_000_000) ||
      !number(g.wornCount, 1_000_000) || typeof g.favorite !== 'boolean' || !text(g.createdAt, 50)) throw new Error('备份的衣物信息不完整');
  }
  const ids = new Set(s.garments.map(g => g.id));
  for (const o of s.outfits) {
    if (!o || !text(o.name, 60) || !o.name.trim() || !text(o.note, 1000) || !occasions.includes(o.occasion) || !Array.isArray(o.garmentIds) ||
      !o.garmentIds.every(id => ids.has(id)) || !Array.isArray(o.wornDates) || !o.wornDates.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d)) ||
      typeof o.favorite !== 'boolean' || !text(o.createdAt, 50) || (o.image && !validImage(o.image))) throw new Error('备份的穿搭记录无效');
  }
  for (const h of s.history) {
    if (!h || !validImage(h.image) || !validImage(h.person) || !validImage(h.garmentImage) || !text(h.garmentId, 100) ||
      !text(h.garmentName, 60) || !['idm', 'aliyun'].includes(h.provider) || !text(h.createdAt, 50)) throw new Error('备份的试衣图片或记录无效');
  }
  const p = s.profile;
  if (!text(p.nickname, 30) || !number(p.height, 250) || !number(p.weight, 350) || (p.photo !== '' && !validImage(p.photo)) ||
    !['idm', 'aliyun'].includes(p.provider) || !text(p.apiBase, 250)) throw new Error('备份的个人档案无效');
  // Whitelist the persisted schema so unknown fields, including credentials, are discarded.
  return { version: 1, garments: s.garments.map(({ id, name, image, category, color, season, occasions, brand, price, favorite, wornCount, createdAt, isSample }) =>
    ({ id, name: name.trim(), image, category, color, season, occasions, brand, price, favorite, wornCount, createdAt, ...(isSample ? { isSample: true } : {}) })),
    outfits: s.outfits.map(({ id, name, garmentIds, occasion, note, favorite, createdAt, wornDates, image }) =>
      ({ id, name, garmentIds, occasion, note, favorite, createdAt, wornDates, ...(image ? { image } : {}) })),
    history: s.history.map(({ id, image, person, garmentImage, garmentId, garmentName, provider, createdAt }) =>
      ({ id, image, person, garmentImage, garmentId, garmentName, provider, createdAt })),
    profile: { nickname: p.nickname, height: p.height, weight: p.weight, photo: p.photo, provider: p.provider, apiBase: p.apiBase } };
}
export function makeBackup(state: WardrobeState) { return JSON.stringify(parseBackup(JSON.stringify(state)), null, 2); }
