import { Heart } from 'lucide-react';
import type { Garment } from '../domain';
import { useApp } from '../context';
export default function GarmentCard({
  garment,
  compact = false,
}: {
  garment: Garment;
  compact?: boolean;
}) {
  const { showGarment, change, notify } = useApp();
  const toggle = async () => {
    try {
      await change((s) => ({
        ...s,
        garments: s.garments.map((g) =>
          g.id === garment.id ? { ...g, favorite: !g.favorite } : g,
        ),
      }));
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <article className={`garment-card ${compact ? 'compact' : ''}`}>
      <button
        className="garment-open"
        aria-label={`查看 ${garment.name}`}
        onClick={() => showGarment(garment.id)}
      >
        <div
          className={`garment-photo tone-${garment.color === '黑色' || garment.color === '深灰' ? 'warm' : garment.color === '绿色' ? 'sage' : 'neutral'}`}
        >
          <img src={garment.image} alt={garment.name} loading="lazy" />
          {garment.isSample && !compact && <span className="sample-label">示例</span>}
        </div>
        <div className="garment-caption">
          <h3>{garment.name}</h3>
          <p>
            {garment.category}
            <span>·</span>
            {garment.season}
          </p>
        </div>
      </button>
      <button
        aria-label={`${garment.favorite ? '取消收藏' : '收藏'} ${garment.name}`}
        aria-pressed={garment.favorite}
        className={`favorite-button ${garment.favorite ? 'active' : ''}`}
        onClick={toggle}
      >
        <Heart size={18} fill={garment.favorite ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}
