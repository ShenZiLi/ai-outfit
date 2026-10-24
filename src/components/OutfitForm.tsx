import { useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { useApp } from '../context';
import { occasions, uid, type Occasion } from '../domain';
export default function OutfitForm({
  ids = [],
  image,
  onClose,
}: {
  ids?: string[];
  image?: string;
  onClose: () => void;
}) {
  const { state, change, notify } = useApp();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(ids);
  const [occasion, setOccasion] = useState<Occasion>('日常');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('给这套穿搭起个名字吧');
      return;
    }
    if (!selected.length && !image) {
      setError('请至少选择一件衣物');
      return;
    }
    setBusy(true);
    try {
      await change((s) => ({
        ...s,
        outfits: [
          {
            id: uid(),
            name: name.trim(),
            garmentIds: selected.filter((id) => s.garments.some((g) => g.id === id)),
            occasion,
            note,
            image,
            favorite: false,
            createdAt: new Date().toISOString(),
            wornDates: [],
          },
          ...s.outfits,
        ],
      }));
      notify('穿搭已保存');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-stack" onSubmit={save}>
      {image && <img className="saved-result-preview" src={image} alt="试衣结果" />}
      <label>
        穿搭名称
        <input
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：周一的轻松通勤"
        />
      </label>
      <label>
        穿着场景
        <select value={occasion} onChange={(e) => setOccasion(e.target.value as Occasion)}>
          {occasions.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>
          选择单品 <span className="muted">已选 {selected.length} 件</span>
        </legend>
        <div className="outfit-picker">
          {state.garments.map((g) => (
            <label className={`outfit-pick ${selected.includes(g.id) ? 'checked' : ''}`} key={g.id}>
              <img src={g.image} alt="" />
              <span>{g.name}</span>
              <input
                type="checkbox"
                aria-label={g.name}
                checked={selected.includes(g.id)}
                onChange={() =>
                  setSelected((prev) =>
                    prev.includes(g.id) ? prev.filter((id) => id !== g.id) : [...prev, g.id],
                  )
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        穿搭笔记（选填）
        <textarea
          maxLength={1000}
          rows={3}
          placeholder="记录喜欢的搭配细节……"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <button className="button button-primary full-width" disabled={busy} type="submit">
        <Check size={18} /> 保存穿搭
      </button>
    </form>
  );
}
