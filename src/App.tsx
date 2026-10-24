import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sun,
  Shirt,
  Sparkles,
  Layers3,
  UserRound,
  ArrowUpRight,
  Check,
  CircleAlert,
  LoaderCircle,
} from 'lucide-react';
import { AppContext, type Tab } from './context';
import { loadState, saveState } from './storage';
import type { WardrobeState } from './domain';
import Today from './screens/Today';
import Wardrobe from './screens/Wardrobe';
import Tryon from './screens/Tryon';
import Outfits from './screens/Outfits';
import Modal from './components/Modal';
import GarmentForm from './components/GarmentForm';
import GarmentDetail from './components/GarmentDetail';
import OutfitForm from './components/OutfitForm';
import Profile from './components/Profile';
type Dialog =
  | { type: 'new' | 'profile' }
  | { type: 'detail' | 'edit'; id: string }
  | { type: 'outfit'; ids?: string[]; image?: string }
  | null;
const tabs = [
  { id: 'today', label: '今日', icon: Sun },
  { id: 'wardrobe', label: '衣橱', icon: Shirt },
  { id: 'tryon', label: '试衣间', icon: Sparkles },
  { id: 'outfits', label: '穿搭集', icon: Layers3 },
] as const;
export default function App() {
  const [state, setState] = useState<WardrobeState | null>(null);
  const current = useRef<WardrobeState | null>(null);
  const mutations = useRef(Promise.resolve());
  const [fatalError, setFatalError] = useState('');
  const [tab, setTab] = useState<Tab>('today');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const closeDialog = useCallback(() => setDialog(null), []);
  const showProfile = useCallback(() => setDialog({ type: 'profile' }), []);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  }, []);
  const navigate = useCallback((next: Tab) => {
    setTab(next);
    setDialog(null);
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    void loadState()
      .then((s) => {
        current.current = s;
        setState(s);
      })
      .catch((e) => setFatalError(`无法读取本地衣橱：${(e as Error).message}`));
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    window.yixuHandleBack = () => {
      if (dialog) {
        setDialog(null);
        return true;
      }
      if (tab !== 'today') {
        navigate('today');
        return true;
      }
      return false;
    };
    return () => {
      delete window.yixuHandleBack;
    };
  }, [dialog, tab, navigate]);
  const change = useCallback((mutate: (s: WardrobeState) => WardrobeState): Promise<void> => {
    const task = mutations.current.then(async () => {
      if (!current.current) throw new Error('衣橱尚未准备好');
      const next = mutate(structuredClone(current.current));
      try {
        await saveState(next);
      } catch (e) {
        throw new Error(
          (e as Error).name === 'QuotaExceededError'
            ? '设备存储空间不足，请先导出备份或清理试衣历史'
            : `保存失败，原数据已保留：${(e as Error).message}`,
        );
      }
      current.current = next;
      setState(next);
    });
    mutations.current = task.catch(() => {});
    return task;
  }, []);
  if (fatalError)
    return (
      <div className="app-loading">
        <CircleAlert size={32} />
        <h1>衣橱暂时没有打开</h1>
        <p role="alert">{fatalError}</p>
        <button className="button button-primary" onClick={() => location.reload()}>
          重新打开
        </button>
      </div>
    );
  if (!state)
    return (
      <div className="app-loading">
        <span className="brand-large">
          衣序<span>YIXU</span>
        </span>
        <LoaderCircle className="spin" size={23} />
        <p>正在整理你的衣橱</p>
      </div>
    );
  const garment =
    dialog && 'id' in dialog ? state.garments.find((g) => g.id === dialog.id) : undefined;
  const tryGarment = (id: string) => {
    setSelectedId(id);
    navigate('tryon');
  };
  const context = {
    state,
    change,
    notify,
    navigate,
    showGarment: (id: string) => setDialog({ type: 'detail' as const, id }),
    addGarment: () => setDialog({ type: 'new' as const }),
    createOutfit: (ids?: string[], image?: string) =>
      setDialog({ type: 'outfit' as const, ids, image }),
    tryGarment,
    showProfile,
    apiKey,
    setApiKey,
  };
  return (
    <AppContext.Provider value={context}>
      <div className="app-shell">
        <aside className="sidebar">
          <button className="brand" aria-label="衣序首页" onClick={() => navigate('today')}>
            <span>
              衣序
              <i />
            </span>
            <small>Y I X U</small>
          </button>
          <p className="sidebar-tagline">每一件，都有新可能。</p>
          <nav aria-label="主导航">
            {tabs.map((item) => (
              <button
                key={item.id}
                aria-label={item.label}
                className={tab === item.id ? 'active' : ''}
                aria-current={tab === item.id ? 'page' : undefined}
                onClick={() => navigate(item.id)}
              >
                <item.icon size={21} strokeWidth={1.65} />
                <span>{item.label}</span>
                {item.id === 'tryon' && <small>AI</small>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-note">
              LESS, BUT
              <br />
              <em>better dressed.</em>
            </div>
            <button className="sidebar-profile" onClick={showProfile}>
              <UserRound size={21} />
              <span>我的档案</span>
              <ArrowUpRight size={16} />
            </button>
            <p>BUILT FOR YOUR EVERYDAY</p>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <button className="mobile-brand" onClick={() => navigate('today')}>
              衣序<span>YIXU</span>
            </button>
            <span className="topbar-label">
              个人衣橱 / {tabs.find((item) => item.id === tab)?.label}
            </span>
            <button className="avatar-button" aria-label="我的档案" onClick={showProfile}>
              <span className="desktop-greeting">
                {state.profile.nickname === '我的'
                  ? '你好，今天也要自在穿衣'
                  : `你好，${state.profile.nickname}`}
              </span>
              <span className="avatar">
                {state.profile.photo ? (
                  <img src={state.profile.photo} alt="" />
                ) : (
                  <UserRound size={21} strokeWidth={1.5} />
                )}
              </span>
            </button>
          </header>
          <main id="main-content">
            {tab === 'today' ? (
              <Today />
            ) : tab === 'wardrobe' ? (
              <Wardrobe />
            ) : tab === 'tryon' ? (
              <Tryon selectedId={selectedId} onSelect={setSelectedId} />
            ) : (
              <Outfits />
            )}
          </main>
        </div>
        <nav className="bottom-nav" aria-label="底部导航">
          {tabs.map((item) => (
            <button
              key={item.id}
              aria-label={item.label}
              className={tab === item.id ? 'active' : ''}
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={23} strokeWidth={tab === item.id ? 2 : 1.5} />
              <span>{item.label}</span>
              {tab === item.id && <i />}
            </button>
          ))}
        </nav>
      </div>
      {dialog?.type === 'new' && (
        <Modal title="让新衣物入橱" onClose={closeDialog}>
          <GarmentForm onClose={closeDialog} />
        </Modal>
      )}
      {dialog?.type === 'edit' && garment && (
        <Modal title="编辑衣物" onClose={closeDialog}>
          <GarmentForm initial={garment} onClose={closeDialog} />
        </Modal>
      )}
      {dialog?.type === 'detail' && garment && (
        <Modal title="衣物详情" onClose={closeDialog}>
          <GarmentDetail
            garment={garment}
            onClose={closeDialog}
            onEdit={() => setDialog({ type: 'edit', id: garment.id })}
          />
        </Modal>
      )}
      {dialog?.type === 'outfit' && (
        <Modal title="保存你的好搭配" onClose={closeDialog}>
          <OutfitForm ids={dialog.ids} image={dialog.image} onClose={closeDialog} />
        </Modal>
      )}
      {dialog?.type === 'profile' && (
        <Modal title="我的档案" onClose={closeDialog}>
          <Profile />
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
        </div>
      )}
    </AppContext.Provider>
  );
}
