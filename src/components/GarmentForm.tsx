import { useState, type FormEvent } from 'react';
import { Camera, ImagePlus, Check, LoaderCircle } from 'lucide-react';
import { useApp } from '../context';
import { categories, seasons, occasions, uid, validateGarment, type Garment } from '../domain';
import { readImage } from '../media';
const colors = ['白色', '米色', '黑色', '深灰', '蓝色', '绿色', '棕色', '粉色', '红色', '其他'];
export default function GarmentForm({
  initial,
  onClose,
}: {
  initial?: Garment;
  onClose: () => void;
}) {
  const { change, notify } = useApp();
  const [draft, setDraft] = useState<Garment>(
    initial || {
      id: uid(),
      name: '',
      image: '',
      category: '上装',
      color: '白色',
      season: '四季',
      occasions: ['日常'],
      brand: '',
      price: 0,
      favorite: false,
      wornCount: 0,
      createdAt: new Date().toISOString(),
    },
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const update = (patch: Partial<Garment>) => setDraft((d) => ({ ...d, ...patch }));
  const choose = async (file?: File) => {
    if (!file) return;
    setReading(true);
    setError('');
    try {
      update({ image: await readImage(file), isSample: false });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
    }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      validateGarment(draft);
      setBusy(true);
      await change((s) => ({
        ...s,
        garments: initial
          ? s.garments.map((g) => (g.id === initial.id ? { ...draft, name: draft.name.trim() } : g))
          : [{ ...draft, name: draft.name.trim() }, ...s.garments],
      }));
      notify(initial ? '衣物信息已更新' : '新衣物已放进衣橱');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="form-stack" onSubmit={save}>
      <div className="image-upload">
        <label className={`upload-zone ${draft.image ? 'has-image' : ''}`}>
          {draft.image ? (
            <img src={draft.image} alt="衣物照片预览" />
          ) : (
            <>
              <ImagePlus size={30} />
              <b>选择衣物照片</b>
              <span>平铺或悬挂，背景干净效果更好</span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="衣物照片"
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {reading && (
            <span className="image-loading">
              <LoaderCircle className="spin" /> 正在处理照片
            </span>
          )}
        </label>
        <label className="camera-link">
          <Camera size={17} /> 拍照添加
          <input
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="拍照添加衣物"
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <label>
        衣物名称
        <input
          required
          maxLength={60}
          value={draft.name}
          placeholder="例如：喜欢的白衬衫"
          onChange={(e) => update({ name: e.target.value })}
        />
      </label>
      <div className="form-columns">
        <label>
          分类
          <select
            value={draft.category}
            onChange={(e) => update({ category: e.target.value as Garment['category'] })}
          >
            {categories.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          季节
          <select
            value={draft.season}
            onChange={(e) => update({ season: e.target.value as Garment['season'] })}
          >
            {seasons.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        颜色
        <select value={draft.color} onChange={(e) => update({ color: e.target.value })}>
          {colors.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>适合的场景</legend>
        <div className="chips">
          {occasions.map((v) => (
            <button
              type="button"
              key={v}
              aria-pressed={draft.occasions.includes(v)}
              className={`chip ${draft.occasions.includes(v) ? 'selected' : ''}`}
              onClick={() =>
                update({
                  occasions: draft.occasions.includes(v)
                    ? draft.occasions.filter((o) => o !== v)
                    : [...draft.occasions, v],
                })
              }
            >
              {draft.occasions.includes(v) && <Check size={13} />}
              {v}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="form-columns">
        <label>
          品牌（选填）
          <input
            maxLength={60}
            value={draft.brand}
            placeholder="记录品牌"
            onChange={(e) => update({ brand: e.target.value })}
          />
        </label>
        <label>
          价格（元，选填）
          <input
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            value={draft.price || ''}
            placeholder="0.00"
            onChange={(e) => update({ price: Number(e.target.value) })}
          />
        </label>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <p className="small muted">照片仅保存在此设备；试衣时另行确认上传。</p>
        <button
          disabled={busy || reading}
          className="button button-primary full-width"
          type="submit"
        >
          {busy ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />} 保存衣物
        </button>
      </div>
    </form>
  );
}
