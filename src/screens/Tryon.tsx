import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Upload,
  UserRound,
  ArrowRight,
  Check,
  LoaderCircle,
  ShieldCheck,
  Download,
  Plus,
  RotateCcw,
  Clock3,
  Trash2,
  Images,
} from 'lucide-react';
import { useApp } from '../context';
import { uid, type TryonResult } from '../domain';
import { generateTryon, normalizeProviderError } from '../tryon';
import { readImage, rasterImage, downloadFile } from '../media';
import Modal from '../components/Modal';
export default function Tryon({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { state, change, notify, apiKey, createOutfit, showProfile, addGarment } = useApp();
  const [person, setPerson] = useState(state.profile.photo);
  const [sample, setSample] = useState(false);
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<TryonResult | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [deleteId, setDeleteId] = useState('');
  const controller = useRef<AbortController | null>(null);
  const chosen = state.garments.find((g) => g.id === selectedId);
  const provider = state.profile.provider;
  const providerName =
    provider === 'fashn' ? 'FASHN' : provider === 'idm' ? 'IDM-VTON' : '阿里云 AI 试衣';
  const items = state.garments.filter(
    (g) => !['鞋履', '配饰'].includes(g.category) && (!category || g.category === category),
  );
  useEffect(() => {
    if (result) {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    }
  }, [result]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!person && state.profile.photo) {
      setPerson(state.profile.photo);
      setSample(false);
    }
  }, [state.profile.photo, person]);
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [busy]);
  async function choosePerson(file?: File) {
    if (!file) return;
    setError('');
    try {
      setPerson(await readImage(file));
      setSample(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function requestGeneration() {
    setError('');
    if (!person) {
      setError('请先添加一张全身照，或使用示例模特');
      return;
    }
    if (!chosen) {
      setError('请从衣橱中选择一件服装');
      return;
    }
    if (provider === 'idm' && chosen.category !== '上装') {
      setError('IDM-VTON 仅支持上装，请在档案中切换至 FASHN');
      return;
    }
    if (provider === 'aliyun' && !apiKey.trim()) {
      setError('请先在我的档案中配置阿里云密钥');
      return;
    }
    setConfirm(true);
  }
  async function generate() {
    if (!chosen || busy) return;
    setConfirm(false);
    setBusy(true);
    setResult(null);
    setShowOriginal(false);
    setError('');
    setStatus('正在准备照片');
    setElapsed(0);
    const abort = new AbortController();
    controller.current = abort;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      abort.abort();
    }, 240_000);
    try {
      const [personImage, garmentImage] = await Promise.all([
        rasterImage(person),
        rasterImage(chosen.image),
      ]);
      abort.signal.throwIfAborted();
      const image = await generateTryon(
        {
          person: personImage,
          garment: garmentImage,
          category: chosen.category,
          description: chosen.name,
          provider,
          apiKey,
          apiBase: state.profile.apiBase,
        },
        abort.signal,
        setStatus,
      );
      abort.signal.throwIfAborted();
      const next: TryonResult = {
        id: uid(),
        image,
        person: personImage,
        garmentImage,
        garmentId: chosen.id,
        garmentName: chosen.name,
        provider,
        createdAt: new Date().toISOString(),
      };
      await change((s) => ({ ...s, history: [next, ...s.history] }));
      setResult(next);
      notify('试衣效果已生成，并保存在此设备');
    } catch (e) {
      setError(
        timedOut
          ? '等待超过 4 分钟，已停止本地等待。服务端任务可能仍在执行，请稍后再试。'
          : normalizeProviderError(e),
      );
    } finally {
      clearTimeout(timeout);
      controller.current = null;
      setBusy(false);
    }
  }
  async function exportResult() {
    if (!result) return;
    try {
      await downloadFile(
        `衣序试衣-${result.createdAt.slice(0, 10)}.jpg`,
        'image/jpeg',
        result.image,
        true,
      );
      notify('试衣图片已导出');
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function removeHistory(id: string) {
    try {
      await change((s) => ({ ...s, history: s.history.filter((h) => h.id !== id) }));
      if (result?.id === id) setResult(null);
      setDeleteId('');
      notify('试衣记录已删除');
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A NEW LOOK, STILL YOU</p>
          <h1>
            你的专属试衣间
            <span className="ai-mark">
              <Sparkles size={15} /> AI
            </span>
          </h1>
          <p className="muted">不必换下睡衣，也能遇见下一套喜欢。</p>
        </div>
        <button className="service-badge" onClick={showProfile}>
          <span className="status-dot" />
          {providerName}
          <span>更换</span>
        </button>
      </div>
      <div className="tryon-layout">
        <div className="tryon-main">
          <div className="section-heading step-heading">
            <h2>
              <span className="step-no">01</span>选择你的形象
            </h2>
            <span className="small muted">正面 · 全身 · 单人</span>
          </div>
          {result ? (
            <div className="result-area">
              <div className="result-tabs">
                <button
                  className={!showOriginal ? 'active' : ''}
                  onClick={() => setShowOriginal(false)}
                >
                  试衣效果
                </button>
                <button
                  className={showOriginal ? 'active' : ''}
                  onClick={() => setShowOriginal(true)}
                >
                  查看原图
                </button>
                <span>
                  <Check size={14} />
                  已保存在本地
                </span>
              </div>
              <div className="result-photo">
                <img
                  src={showOriginal ? result.person : result.image}
                  alt={
                    showOriginal ? '试衣前的人像原图' : `${result.garmentName}的真实 AI 试衣结果`
                  }
                />
                <span className="result-tag">
                  {showOriginal ? 'BEFORE · 原图' : 'AFTER · AI 生成'}
                </span>
              </div>
              <p className="field-hint">
                AI 结果可能改变细节，仅供搭配参考，不代表真实尺码与合身度。
              </p>
              <div className="button-row">
                <button
                  className="button button-primary"
                  onClick={() =>
                    createOutfit(
                      state.garments.some((g) => g.id === result.garmentId)
                        ? [result.garmentId]
                        : [],
                      result.image,
                    )
                  }
                >
                  <Plus size={17} />
                  保存到穿搭集
                </button>
                <button className="button button-outline" onClick={exportResult}>
                  <Download size={17} />
                  导出图片
                </button>
              </div>
              <button className="text-button" onClick={() => setResult(null)}>
                <RotateCcw size={16} />
                继续试下一件
              </button>
            </div>
          ) : (
            <div className={`person-stage ${person ? 'has-person' : ''}`}>
              {person ? (
                <img src={person} alt={sample ? 'AI 创作的示例模特' : '我的全身照片'} />
              ) : (
                <div className="person-placeholder">
                  <div className="person-silhouette">
                    <UserRound size={84} strokeWidth={0.8} />
                  </div>
                  <h3>这里，主角是你。</h3>
                  <p>
                    上传一张全身照，
                    <br />
                    让每一件喜欢的衣服自然上身。
                  </p>
                  <label className="button button-primary">
                    <Upload size={17} />
                    添加全身照
                    <input
                      aria-label="上传全身照"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        void choosePerson(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    className="text-button"
                    onClick={() => {
                      setPerson('/images/editorial.png');
                      setSample(true);
                    }}
                  >
                    使用示例模特 <ArrowRight size={16} />
                  </button>
                </div>
              )}
              {person && !busy && (
                <>
                  <span className="person-label">
                    {sample ? 'AI 创作 · 示例模特' : '我的专属形象'}
                  </span>
                  <label className="change-person">
                    <Upload size={16} />
                    更换照片
                    <input
                      aria-label="更换全身照"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        void choosePerson(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </>
              )}
              {busy && (
                <div className="generation-overlay">
                  <div className="scan-frame">
                    <Sparkles size={38} strokeWidth={1.2} />
                  </div>
                  <h3>{status}</h3>
                  <p>已经等待 {elapsed} 秒 · 请保持应用在前台</p>
                  <p className="small">公共服务可能需要排队，我们不会自动重复提交。</p>
                  <button
                    className="button button-light"
                    onClick={() => controller.current?.abort()}
                  >
                    取消本次试衣
                  </button>
                </div>
              )}
            </div>
          )}
          {!result && (
            <p className="field-hint portrait-hint">
              <ShieldCheck size={15} /> 照片先保留在本地，确认试衣后才上传。
            </p>
          )}
        </div>
        <div className="tryon-controls">
          <div className="section-heading step-heading">
            <h2>
              <span className="step-no">02</span>挑一件，试试看
            </h2>
            <button className="text-button small" onClick={addGarment}>
              <Plus size={15} />
              入橱
            </button>
          </div>
          <div className="chips tryon-chips">
            {['', '上装', '下装', '外套', '连衣裙'].map((c) => (
              <button
                key={c}
                disabled={busy}
                className={`chip ${category === c ? 'selected' : ''}`}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c || '全部'}
              </button>
            ))}
          </div>
          <div className="tryon-wardrobe">
            {items.map((g) => (
              <button
                key={g.id}
                aria-label={`选择 ${g.name}`}
                aria-pressed={selectedId === g.id}
                disabled={busy}
                className={`tryon-piece ${selectedId === g.id ? 'chosen' : ''}`}
                onClick={() => {
                  onSelect(g.id);
                  setError('');
                }}
              >
                <img src={g.image} alt="" />
                <span>{g.name}</span>
                {g.id === selectedId && (
                  <span className="selected-check">
                    <Check size={13} />
                  </span>
                )}
              </button>
            ))}
            {!items.length && (
              <div className="empty-inline">
                <Images size={28} />
                <p>这里还没有可试穿的衣物</p>
                <button className="text-button" onClick={addGarment}>
                  去添加一件 <Plus size={15} />
                </button>
              </div>
            )}
          </div>
          <div className="generation-action">
            {chosen && (
              <p className="selected-summary">
                <Check size={14} />
                已选择：{chosen.name}
              </p>
            )}
            {error && (
              <div className="error-message" role="alert">
                {error}
                <button className="text-button" onClick={showProfile}>
                  检查服务设置 <ArrowRight size={14} />
                </button>
              </div>
            )}
            <button
              className="button button-primary full-width generate-button"
              disabled={busy || !chosen || !person}
              onClick={requestGeneration}
            >
              {busy ? <LoaderCircle size={19} className="spin" /> : <Sparkles size={19} />}
              {busy ? '试衣生成中…' : '生成试衣效果'}
              {!busy && <ArrowRight size={18} />}
            </button>
            {(!chosen || !person) && (
              <p className="field-hint center">
                {!person ? '先添加全身照或使用示例模特' : '从衣橱中选一件服装，开始试衣'}
              </p>
            )}
            <p className="field-hint center">
              由 {providerName} 生成 ·{' '}
              {provider === 'aliyun' ? '按账户用量计费' : '公共服务可能排队或限额'}
            </p>
            {busy && (
              <button
                className="text-button cancel-generation"
                onClick={() => controller.current?.abort()}
              >
                取消本次试衣
              </button>
            )}
          </div>
        </div>
      </div>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LOOKS YOU TRIED</p>
            <h2>试衣足迹</h2>
          </div>
          <span className="small muted">{state.history.length} 次尝试</span>
        </div>
        {state.history.length ? (
          <div className="history-grid">
            {state.history.map((h) => (
              <article className="history-card" key={h.id}>
                <button
                  disabled={busy}
                  onClick={() => {
                    setResult(h);
                    setShowOriginal(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  aria-label={`查看试衣 ${h.garmentName}`}
                >
                  <img src={h.image} alt={h.garmentName} loading="lazy" />
                  <b>{h.garmentName}</b>
                  <span>{new Date(h.createdAt).toLocaleDateString('zh-CN')}</span>
                </button>
                <button
                  disabled={busy}
                  className="history-delete"
                  aria-label={`删除试衣记录 ${h.garmentName}`}
                  onClick={() => setDeleteId(h.id)}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="history-empty">
            <Clock3 size={23} strokeWidth={1.3} />
            <p>每一次新尝试，都值得留下。</p>
            <span>生成的试衣图片会自动保存在这里</span>
          </div>
        )}
      </section>
      {confirm && (
        <Modal title="确认上传照片" onClose={() => setConfirm(false)}>
          <div className="upload-consent">
            <ShieldCheck size={36} strokeWidth={1.25} />
            <h3>让这一次尝试，由你决定。</h3>
            <p>
              本次会将所选的<strong>{sample ? '示例人像' : '个人全身照'}</strong>和
              <strong>{chosen?.name}</strong>图片上传至 {providerName}
              {provider !== 'aliyun' && ' 作者的 Hugging Face 公共演示服务'}，用于生成试衣效果。
            </p>
            <p>
              请仅上传你拥有使用权且获得本人同意的照片。公共服务的处理与留存遵循其自身规则；结果下载后保存在此设备。
              {provider === 'aliyun' && '调用将产生阿里云账户费用。'}
              {provider === 'idm' && 'IDM-VTON 仅限非商业研究用途。'}
            </p>
            <div className="button-row">
              <button className="button button-outline" onClick={() => setConfirm(false)}>
                暂不上传
              </button>
              <button className="button button-primary" onClick={generate}>
                同意并开始试衣 <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </Modal>
      )}
      {deleteId && (
        <Modal title="删除试衣记录" onClose={() => setDeleteId('')}>
          <p>只删除这条本地试衣记录，已经保存到穿搭集的图片仍会保留。</p>
          <div className="button-row">
            <button className="button button-outline" onClick={() => setDeleteId('')}>
              保留记录
            </button>
            <button className="button button-danger" onClick={() => removeHistory(deleteId)}>
              确认删除
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
