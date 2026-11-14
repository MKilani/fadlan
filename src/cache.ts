import AsyncStorage from '@react-native-async-storage/async-storage';

// ttlMs = null means "never expires". If the network fails, a stale copy is returned (offline use).
export async function cached<T>(key: string, ttlMs: number | null, load: () => Promise<T>): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const { t, v } = JSON.parse(raw);
      if (ttlMs === null || Date.now() - t < ttlMs) return v as T;
    }
  } catch {}
  try {
    const v = await load();
    AsyncStorage.setItem(key, JSON.stringify({ t: Date.now(), v })).catch(() => {});
    return v;
  } catch (e) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) return JSON.parse(raw).v as T;
    } catch {}
    throw e;
  }
}
