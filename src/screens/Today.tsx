import { ArrowUpRight, ArrowRight, Sparkles, Plus, Leaf, Shirt } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context';
import { suggestOutfits, occasions, type Occasion } from '../domain';
import GarmentCard from '../components/GarmentCard';
export default function Today() {
  const { state, navigate, addGarment, createOutfit } = useApp();
  const [occasion, setOccasion] = useState<Occasion>('通勤');
  const suggestions = suggestOutfits(state.garments, occasion);
  const favorite = state.garments.filter(g => g.favorite);
  const items = favorite.length ? favorite : state.garments;
  const date = new Date();
  const dateLabel = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
  return <>
    <div className="page-heading home-heading"><div><p className="eyebrow">YOUR DAILY WARDROBE</p><h1>穿喜欢的，<span className="serif">做自己。</span></h1><p className="muted">{dateLabel} <span className="date-dot">/</span> 今天也有新的穿搭可能</p></div><span className="edition">VOL. 01<br />AUTUMN EDIT</span></div>
    <div className="home-layout">
      <section className="editorial-card" aria-label="今日穿搭灵感">
        <img src="/images/editorial.png" alt="身穿深灰西装和米色阔腿裤的原创 AI 模特" />
        <span className="editorial-top">THE EVERYDAY EDIT <span>01 — 08</span></span>
        <div className="editorial-copy"><span className="tag-light">今日灵感 · AI 创作</span><h2>松弛一点，<br />刚刚好。</h2><p>用熟悉的单品，穿出不一样的自己。</p><button className="button button-light" onClick={() => navigate('tryon')}>去试试新搭配 <ArrowUpRight size={18} /></button></div>
      </section>
      <div className="home-side">
        <section className="wardrobe-summary"><div className="section-kicker"><span>MY WARDROBE</span><Shirt size={19} /></div><h2>每一件，<br />都有新可能。</h2><div className="stats"><div><b>{String(state.garments.length).padStart(2, '0')}</b><span>衣橱单品</span></div><div><b>{String(state.outfits.length).padStart(2, '0')}</b><span>我的穿搭</span></div><div><b>{String(favorite.length).padStart(2, '0')}</b><span>心爱收藏</span></div></div><button className="text-button" onClick={() => navigate('wardrobe')}>打开我的衣橱 <ArrowRight size={17} /></button></section>
        <button className="add-entry" onClick={addGarment}><span className="add-circle"><Plus /></span><span><b>让新衣物入橱</b><small>拍张照片，从整理开始</small></span><ArrowUpRight size={22} /></button>
        <div className="quiet-note"><Leaf size={22} /><p>少买一件，多搭一次。<br /><span>好好穿衣，也好好生活。</span></p></div>
      </div>
    </div>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">FAMILIAR PIECES, FRESH IDEAS</p><h2>衣橱里的老朋友</h2></div><button className="text-button" onClick={() => navigate('wardrobe')}>全部单品 <ArrowRight size={17} /></button></div><div className="favorites-row">{items.slice(0, 4).map(g => <GarmentCard key={g.id} garment={g} compact />)}{!items.length && <button className="empty-inline" onClick={addGarment}><Plus /> 添加第一件衣物</button>}</div></section>
    <section className="section-block recommendation-section"><div className="section-heading"><div><p className="eyebrow">DRESS FOR THE MOMENT</p><h2>为今天，搭一套</h2></div><span className="small muted">本地规则推荐</span></div><div className="chips" aria-label="穿搭场景">{occasions.map(o => <button key={o} aria-pressed={o === occasion} className={`chip ${o === occasion ? 'selected' : ''}`} onClick={() => setOccasion(o)}>{o}</button>)}</div><div className="suggestion-grid">{suggestions.map((o, i) => <article className="suggestion-card" key={o.garmentIds.join(',')}><div className="suggestion-art"><span className="suggestion-index">0{i + 1}</span>{o.garmentIds.slice(0, 3).map(id => { const g = state.garments.find(g => g.id === id)!; return <img key={id} src={g.image} alt={g.name} />; })}</div><h3>{o.name}</h3><p>{o.reason}</p><button className="text-button" onClick={() => createOutfit(o.garmentIds)}>保存这套搭配 <Plus size={16} /></button></article>)}{!suggestions.length && <div className="empty-inline"><Sparkles /><p>加入上装、下装或连衣裙和鞋履后，<br />就能发现衣橱里的新组合。</p><button className="text-button" onClick={addGarment}>添加衣物 <Plus size={16} /></button></div>}</div></section>
    <p className="page-end">YIXU · MAKE ROOM FOR YOURSELF</p>
  </>;
}
