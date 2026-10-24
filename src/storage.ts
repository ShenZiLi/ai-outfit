import { openDB, type IDBPDatabase } from 'idb';
import { initialState } from './seed';
import { parseBackup, type WardrobeState } from './domain';
let db: Promise<IDBPDatabase> | undefined;
function database() {
  return (db ??= openDB('yixu-wardrobe', 1, {
    upgrade(database) {
      database.createObjectStore('state');
    },
  }));
}
export async function loadState(): Promise<WardrobeState> {
  const databaseInstance = await database();
  const state = await databaseInstance.get('state', 'current');
  if (state) return parseBackup(JSON.stringify(state));
  const seed = initialState();
  await databaseInstance.put('state', seed, 'current');
  return seed;
}
export async function saveState(state: WardrobeState) {
  const clean = parseBackup(JSON.stringify(state));
  await (await database()).put('state', clean, 'current');
}
