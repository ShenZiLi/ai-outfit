import { useState, useRef, type FormEvent } from 'react';
import { UserRound, Upload, Download, ShieldCheck, Check, Database, ChevronDown } from 'lucide-react';
import { useApp } from '../context';
import { makeBackup, parseBackup, type WardrobeState } from '../domain';
import { readImage, downloadFile } from '../media';
export default function Profile() {
  const { state, change, notify, apiKey, setApiKey } = useApp();
  const [draft, setDraft] = useState(state.profile);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<WardrobeState | null>(null);
  const [showService, setShowService] = useState(false);
  const backupInput = useRef<HTMLInputElement>(null);
  async function save(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!draft.nickname.trim()) { setError('请填写昵称'); return; }
    if (draft.height < 80 || draft.height > 250 || draft.weight < 20 || draft.weight > 350) { setError('请检查身高和体重的范围'); return; }
    if (draft.provider === 'aliyun' && !/^https:\/\/(dashscope\.aliyuncs\.com|[a-zA-Z0-9-]+\.cn-beijing\.maas\.aliyuncs\.com)\/api\/v1\/?$/.test(draft.apiBase)) { setError('请填写北京地域的阿里云 HTTPS API 地址，以 /api/v1 结尾'); return; }
    setBusy(true);
    try { await change(s => ({ ...s, profile: { ...draft, nickname: draft.nickname.trim(), apiBase: draft.apiBase.replace(/\/$/, '') } })); notify('档案已保存'); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function photo(file?: File) { if (!file) return; try { setDraft(d => ({ ...d, photo: '' })); const value = await readImage(file); setDraft(d => ({ ...d, photo: value })); } catch (e) { setError((e as Error).message); } }
  async function exportBackup() { setBusy(true); try { await downloadFile(`衣序备份-${new Date().toISOString().slice(0, 10)}.json`, 'application/json', makeBackup(state)); notify('备份已导出，请妥善保管'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function readBackup(file?: File) { if (!file) return; setError(''); try { if (file.size > 120_000_000) throw new Error('备份超过 120MB'); setPendingBackup(parseBackup(await file.text())); } catch (e) { setError((e as Error).message); } }
  async function restore() { if (!pendingBackup) return; setBusy(true); try { await change(() => pendingBackup); setDraft(pendingBackup.profile); setPendingBackup(null); notify('衣橱备份已恢复'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <div className="profile-content"><form className="form-stack" onSubmit={save}>
    <div className="profile-portrait"><label className="portrait-upload">{draft.photo ? <img src={draft.photo} alt="我的个人照片" /> : <UserRound size={32} />}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="个人全身照" onChange={e => { void photo(e.target.files?.[0]); e.target.value = ''; }} /><span><Upload size={14} /></span></label><div><h3>建立你的专属形象</h3><p>正面全身照，单人、光线均匀</p>{draft.photo && <button className="text-button small" type="button" onClick={() => setDraft(d => ({ ...d, photo: '' }))}>移除照片</button>}</div></div>
    <label>昵称<input maxLength={30} required value={draft.nickname} onChange={e => setDraft(d => ({ ...d, nickname: e.target.value }))} /></label><div className="form-columns"><label>身高（cm）<input type="number" required min="80" max="250" value={draft.height} onChange={e => setDraft(d => ({ ...d, height: Number(e.target.value) }))} /></label><label>体重（kg）<input type="number" required min="20" max="350" step="0.1" value={draft.weight} onChange={e => setDraft(d => ({ ...d, weight: Number(e.target.value) }))} /></label></div><p className="field-hint">身高体重仅作个人记录，不用于生成精确尺码或合身度结论。</p>
    <button type="button" className="settings-disclosure" aria-expanded={showService} onClick={() => setShowService(!showService)}><span>AI 试衣服务<span className="small muted">{draft.provider === 'fashn' ? 'FASHN 公共体验' : draft.provider === 'idm' ? 'IDM-VTON 研究演示' : '阿里云 AI 试衣'}</span></span><ChevronDown size={19} className={showService ? 'rotated' : ''} /></button>
    {showService && <div className="service-settings form-stack"><label>服务提供方<select value={draft.provider} onChange={e => setDraft(d => ({ ...d, provider: e.target.value as typeof d.provider }))}><option value="fashn">FASHN · 公共体验（无需密钥）</option><option value="idm">IDM-VTON · 研究演示（仅上装）</option><option value="aliyun">阿里云 · AI 试衣 Plus</option></select></label>{draft.provider === 'aliyun' ? <><label>API 地址<input type="url" value={draft.apiBase} onChange={e => setDraft(d => ({ ...d, apiBase: e.target.value }))} placeholder="https://dashscope.aliyuncs.com/api/v1" /></label><label>阿里云 API Key<input autoComplete="off" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="输入北京地域密钥" /></label><p className="field-hint">密钥仅用于本次会话，不写入备份。调用可能产生账户费用。请使用已开通试衣模型的北京地域密钥。</p></> : <p className="field-hint">照片会上传至 {draft.provider === 'fashn' ? 'FASHN' : 'IDM-VTON'} 作者的 Hugging Face 演示服务。公共服务可能排队、限额或暂时不可用。{draft.provider === 'idm' && '此模型仅限非商业研究。'}</p>}</div>}
    {error && <p className="error-message" role="alert">{error}</p>}<button className="button button-primary full-width" disabled={busy} type="submit"><Check size={18} /> 保存档案</button></form>
    <section className="profile-section"><h3><Database size={18} /> 衣橱数据</h3><p className="muted small">{state.garments.length} 件单品 · {state.outfits.length} 套穿搭 · {state.history.length} 次试衣</p><div className="button-row"><button className="button button-outline" disabled={busy} onClick={exportBackup}><Download size={16} /> 导出备份</button><button className="button button-outline" disabled={busy} onClick={() => backupInput.current?.click()}><Upload size={16} /> 导入备份</button><input ref={backupInput} className="visually-hidden" aria-label="导入衣橱备份" type="file" accept="application/json,.json" onChange={e => { void readBackup(e.target.files?.[0]); e.target.value = ''; }} /></div>{pendingBackup && <div className="restore-confirm"><b>准备恢复 {pendingBackup.garments.length} 件衣物与 {pendingBackup.outfits.length} 套穿搭</b><p>这将替换当前设备上的全部衣橱数据。建议先导出当前备份。</p><div className="button-row"><button className="button button-outline" onClick={() => setPendingBackup(null)}>取消恢复</button><button className="button button-primary" disabled={busy} onClick={restore}>确认替换并恢复</button></div></div>}</section>
    <section className="privacy-note"><ShieldCheck size={23} /><div><h3>属于你的，也由你掌握</h3><p>衣橱和个人照片保存在此设备。只有主动确认 AI 试衣后，所选照片才会发往对应服务。没有广告、没有账号追踪。卸载应用会删除本地数据，请先备份。</p><p>AI 试衣展示视觉效果，可能改变细节，不代表实际尺码、材质或合身程度。首页封面为 AI 创作，示例衣物带有标识。</p></div></section><p className="version-note">衣序 YIXU 1.0.0 · 给日常一点新可能</p></div>;
}
