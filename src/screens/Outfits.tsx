import { useState } from 'react';
import { Plus, Heart, Layers3, CalendarDays, Check, Trash2, Download } from 'lucide-react';
import { useApp } from '../context';
import { today, type Outfit } from '../domain';
import Modal from '../components/Modal';
import { downloadFile } from '../media';
export default function Outfits() {
  const { state, createOutfit, change, notify } = useApp();
  const [filter, setFilter] = useState('all');
  const [id, setId] = useState('');
  const [confirm, setConfirm] = useState(false);
  const selected = state.outfits.find((o) => o.id === id);
  const items = state.outfits.filter((o) =>
    filter === 'favorites' ? o.favorite : filter === 'worn' ? o.wornDates.length : true,
  );
  async function favorite(o: Outfit) {
    try {
      await change((s) => ({
        ...s,
        outfits: s.outfits.map((item) =>
          item.id === o.id ? { ...item, favorite: !item.favorite } : item,
        ),
      }));
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function wear(o: Outfit) {
    try {
      await change((s) => {
        const target = s.outfits.find((item) => item.id === o.id);
        if (!target || target.wornDates.includes(today())) return s;
        return {
          ...s,
          outfits: s.outfits.map((item) =>
            item.id === o.id ? { ...item, wornDates: [...item.wornDates, today()] } : item,
          ),
          garments: s.garments.map((g) =>
            target.garmentIds.includes(g.id) ? { ...g, wornCount: g.wornCount + 1 } : g,
          ),
        };
      });
      notify('已记录今天的穿搭');
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function remove() {
    try {
      await change((s) => ({ ...s, outfits: s.outfits.filter((o) => o.id !== id) }));
      setId('');
      setConfirm(false);
      notify('穿搭已删除');
    } catch (e) {
      notify((e as Error).message);
    }
  }
  const art = (o: Outfit) =>
    o.image ? (
      <img className="outfit-result-art" src={o.image} alt={`${o.name}的试衣效果`} />
    ) : (
      <div className="outfit-collage">
        {o.garmentIds.slice(0, 4).map((gid) => {
          const g = state.garments.find((g) => g.id === gid);
          return g && <img key={gid} src={g.image} alt={g.name} />;
        })}
        {!o.garmentIds.length && <span className="muted small">原单品已移除</span>}
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">GOOD OUTFITS DESERVE A SECOND DAY</p>
          <h1>
            我的穿搭集<span className="count-label">{state.outfits.length}</span>
          </h1>
          <p className="muted">把喜欢的搭配留下，下次出门更从容。</p>
        </div>
        <button className="button button-primary desktop-add" onClick={() => createOutfit()}>
          <Plus size={17} /> 新建穿搭
        </button>
      </div>
      <div className="chips outfit-filters">
        {[
          ['all', '全部穿搭'],
          ['favorites', '我的收藏'],
          ['worn', '穿着记录'],
        ].map(([value, label]) => (
          <button
            key={value}
            className={`chip ${filter === value ? 'selected' : ''}`}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {items.length ? (
        <div className="outfit-grid">
          {items.map((o) => (
            <article className="outfit-card" key={o.id}>
              <button
                className="outfit-open"
                aria-label={`查看穿搭 ${o.name}`}
                onClick={() => {
                  setId(o.id);
                  setConfirm(false);
                }}
              >
                {art(o)}
                <div className="outfit-caption">
                  <span className="mini-label">
                    {o.image ? 'AI 试衣' : '衣橱组合'} · {o.occasion}
                  </span>
                  <h2>{o.name}</h2>
                  <p>
                    <CalendarDays size={14} />
                    {o.wornDates.length ? `已穿 ${o.wornDates.length} 次` : '等一个出门的好日子'}
                  </p>
                </div>
              </button>
              <button
                className={`favorite-button ${o.favorite ? 'active' : ''}`}
                aria-label={`${o.favorite ? '取消收藏' : '收藏'}穿搭 ${o.name}`}
                aria-pressed={o.favorite}
                onClick={() => favorite(o)}
              >
                <Heart size={18} fill={o.favorite ? 'currentColor' : 'none'} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state outfit-empty">
          <div className="empty-illustration">
            <Layers3 size={48} strokeWidth={1} />
            <span>YOUR NEXT FAVORITE LOOK</span>
          </div>
          <h2>
            {filter === 'all'
              ? '好搭配，值得被记住'
              : filter === 'favorites'
                ? '把喜欢的穿搭，收进这里'
                : '为喜欢的穿搭，留下足迹'}
          </h2>
          <p>
            {filter === 'all'
              ? '用衣橱里的单品组一套，或保存一次 AI 试衣。'
              : filter === 'favorites'
                ? '点击穿搭卡片上的爱心，即可收藏。'
                : '打开已保存的穿搭，点击「今天穿了」。'}
          </p>
          <button className="button button-primary" onClick={() => createOutfit()}>
            <Plus size={18} /> 创建一套穿搭
          </button>
        </div>
      )}
      <button className="floating-add" aria-label="新建穿搭" onClick={() => createOutfit()}>
        <Plus size={24} />
        <span>新建穿搭</span>
      </button>
      {selected && (
        <Modal title="这一天的穿搭" onClose={() => setId('')}>
          <div className="outfit-detail">
            {art(selected)}
            <span className="mini-label">
              {selected.occasion} · {selected.garmentIds.length} 件单品
            </span>
            <h2>{selected.name}</h2>
            {selected.note && <p className="outfit-note">{selected.note}</p>}
            <div className="button-row">
              <button
                className="button button-primary"
                disabled={selected.wornDates.includes(today())}
                onClick={() => wear(selected)}
              >
                <Check size={17} />
                {selected.wornDates.includes(today()) ? '今日已记录' : '今天穿了'}
              </button>
              <button className="button button-outline" onClick={() => favorite(selected)}>
                <Heart size={17} fill={selected.favorite ? 'currentColor' : 'none'} />
                {selected.favorite ? '已收藏' : '收藏穿搭'}
              </button>
            </div>
            {selected.image && (
              <button
                className="button button-outline full-width"
                onClick={async () => {
                  try {
                    await downloadFile(
                      `衣序-${selected.name}.jpg`,
                      'image/jpeg',
                      selected.image!,
                      true,
                    );
                    notify('试衣图片已导出');
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                <Download size={16} />
                导出试衣图片
              </button>
            )}
            {selected.wornDates.length > 0 && (
              <div className="wear-history">
                <h3>穿着足迹</h3>
                {[...selected.wornDates].reverse().map((d) => (
                  <span key={d}>
                    <CalendarDays size={14} />
                    {d}
                  </span>
                ))}
              </div>
            )}
            {confirm ? (
              <div className="delete-confirm">
                <p>确认删除这套穿搭？衣橱里的单品会保留。</p>
                <button className="button button-danger" onClick={remove}>
                  确认删除
                </button>
                <button className="text-button" onClick={() => setConfirm(false)}>
                  保留穿搭
                </button>
              </div>
            ) : (
              <button className="text-button danger-text" onClick={() => setConfirm(true)}>
                <Trash2 size={16} />
                删除穿搭
              </button>
            )}
          </div>
        </Modal>
      )}
      <p className="page-end">GET DRESSED. FEEL GOOD. REPEAT.</p>
    </>
  );
}
