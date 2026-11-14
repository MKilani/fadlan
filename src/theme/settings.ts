import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppStyleId, MapStyleId } from './types';

// "auto": app style comes from the user's region; map style follows the app style's default map.
export type Settings = { app: AppStyleId | 'auto'; map: MapStyleId | 'auto' };
export const DEFAULT_SETTINGS: Settings = { app: 'auto', map: 'auto' };
const KEY = 'settings:v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const saveSettings = (s: Settings) => AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
