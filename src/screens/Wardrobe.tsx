import { useState } from 'react';
import { Search, Plus, SlidersHorizontal, PackageOpen, Heart } from 'lucide-react';
import { useApp } from '../context';
import { categories, seasons, filterGarments } from '../domain';
import GarmentCard from '../components/GarmentCard';
export default function Wardrobe() {
  const { state, addGarment } = useApp();
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [season, setSeason] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('new');
  const items = filterGarments(state.garments, { category, query, favorite, season }).sort(
    (a, b) =>
      sort === 'worn'
        ? b.wornCount - a.wornCount
        : sort === 'name'
          ? a.name.localeCompare(b.name, 'zh')
          : b.createdAt.localeCompare(a.createdAt),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A LITTLE ORDER, A LOT OF POSSIBILITIES</p>
          <h1>
            我的衣橱<span className="count-label">{state.garments.length}</span>
          </h1>
          <p className="muted">把喜欢的衣服，放在看得见的地方。</p>
        </div>
        <button className="button button-primary desktop-add" onClick={addGarment}>
          <Plus size={18} /> 添加衣物
        </button>
      </div>
      <div className="search-row">
        <label className="search-field">
          <Search size={20} />
          <input
            aria-label="搜索衣橱"
            placeholder="搜索名称、颜色、品牌或场景"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="clear-search" aria-label="清空搜索" onClick={() => setQuery('')}>
              ×
            </button>
          )}
        </label>
        <button
          aria-label="筛选与排序"
          aria-expanded={showFilters}
          className={`icon-button filter-toggle ${showFilters ? 'selected' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={21} />
        </button>
      </div>
      {showFilters && (
        <div className="filter-panel">
          <label>
            季节
            <select value={season} onChange={(e) => setSeason(e.target.value)}>
              <option value="">全部季节</option>
              {seasons.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            排序
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="new">最近入橱</option>
              <option value="worn">穿着次数</option>
              <option value="name">名称顺序</option>
            </select>
          </label>
          <button
            className="text-button"
            onClick={() => {
              setSeason('');
              setSort('new');
              setFavorite(false);
              setCategory('');
              setQuery('');
            }}
          >
            重置
          </button>
        </div>
      )}
      <div className="category-tabs" role="group" aria-label="衣物分类">
        {['', ...categories].map((c) => (
          <button
            className={category === c ? 'active' : ''}
            key={c}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c || '全部'}
          </button>
        ))}
      </div>
      <div className="list-summary">
        <span>共 {items.length} 件单品</span>
        <button
          className={`text-button ${favorite ? 'green' : ''}`}
          aria-pressed={favorite}
          onClick={() => setFavorite(!favorite)}
        >
          <Heart size={16} fill={favorite ? 'currentColor' : 'none'} /> 只看收藏
        </button>
      </div>
      {items.length ? (
        <div className="garment-grid">
          {items.map((g) => (
            <GarmentCard garment={g} key={g.id} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <PackageOpen size={42} strokeWidth={1.25} />
          <h2>没有找到衣物</h2>
          <p>
            {state.garments.length
              ? '换个关键词，或调整一下筛选条件。'
              : '拍下第一件衣物，慢慢建立你的专属衣橱。'}
          </p>
          <button
            className="button button-primary"
            onClick={
              state.garments.length
                ? () => {
                    setCategory('');
                    setQuery('');
                    setSeason('');
                    setFavorite(false);
                  }
                : addGarment
            }
          >
            {state.garments.length ? '查看全部衣物' : '添加第一件衣物'}
          </button>
        </div>
      )}
      <button className="floating-add" aria-label="添加衣物" onClick={addGarment}>
        <Plus size={24} />
        <span>添加衣物</span>
      </button>
      <p className="page-end">YOUR WARDROBE, YOUR STORY</p>
    </>
  );
}
