import { createContext, useContext } from 'react';
import type { WardrobeState } from './domain';
export type Tab = 'today' | 'wardrobe' | 'tryon' | 'outfits';
export interface AppContextType {
  state: WardrobeState;
  change: (mutate: (state: WardrobeState) => WardrobeState) => Promise<void>;
  notify: (message: string) => void;
  navigate: (tab: Tab) => void;
  showGarment: (id: string) => void;
  addGarment: () => void;
  createOutfit: (ids?: string[], image?: string) => void;
  tryGarment: (id: string) => void;
  showProfile: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}
export const AppContext = createContext<AppContextType | null>(null);
export function useApp() {
  const app = useContext(AppContext);
  if (!app) throw new Error('衣橱尚未初始化');
  return app;
}
