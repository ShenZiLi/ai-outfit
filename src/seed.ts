import type { Garment, WardrobeState } from './domain';
const examples: Array<Pick<Garment, 'id' | 'name' | 'category' | 'color' | 'season' | 'occasions' | 'price' | 'favorite'>> = [
  { id: 'shirt-white', name: '云朵白 · 宽松衬衫', category: '上装', color: '白色', season: '四季', occasions: ['日常', '通勤', '约会'], price: 259, favorite: true },
  { id: 'blazer-dark', name: '深灰羊毛西装', category: '外套', color: '深灰', season: '春秋', occasions: ['通勤', '约会'], price: 699, favorite: true },
  { id: 'pants-sand', name: '沙色垂感阔腿裤', category: '下装', color: '米色', season: '四季', occasions: ['日常', '通勤', '旅行'], price: 329, favorite: false },
  { id: 'knit-sage', name: '鼠尾草绿针织衫', category: '上装', color: '绿色', season: '春秋', occasions: ['日常', '约会', '旅行'], price: 299, favorite: true },
  { id: 'jeans-blue', name: '复古直筒牛仔裤', category: '下装', color: '蓝色', season: '四季', occasions: ['日常', '旅行'], price: 359, favorite: false },
  { id: 'loafers-black', name: '黑色乐福鞋', category: '鞋履', color: '黑色', season: '四季', occasions: ['日常', '通勤', '约会'], price: 499, favorite: false },
  { id: 'dress-black', name: '简约黑色连衣裙', category: '连衣裙', color: '黑色', season: '夏季', occasions: ['约会', '日常'], price: 399, favorite: false },
  { id: 'bag-brown', name: '焦糖色单肩包', category: '配饰', color: '棕色', season: '四季', occasions: ['日常', '通勤', '旅行'], price: 599, favorite: true },
];
export function initialState(): WardrobeState {
  return { version: 1, garments: examples.map((g, i) => ({ ...g, image: `/images/${g.id}.svg`, brand: '示例衣物', wornCount: 0, createdAt: `2026-10-${String(24 - i).padStart(2, '0')}`, isSample: true })),
    outfits: [], history: [], profile: { nickname: '我的', height: 165, weight: 52, photo: '', provider: 'fashn', apiBase: 'https://dashscope.aliyuncs.com/api/v1' } };
}
