import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { getLocales } from 'expo-localization';
import { MAX_EDITIONS } from './config';

// Country (ISO 3166-1 alpha-2) -> Wikipedia language codes of the place. Extend as needed.
const LOCAL: Record<string, string[]> = {
  CH: ['de', 'fr', 'it', 'rm'], DE: ['de'], AT: ['de'], FR: ['fr'], IT: ['it'], ES: ['es'], PT: ['pt'],
  GR: ['el'], TR: ['tr'], EG: ['ar'], JO: ['ar'], LB: ['ar'], MA: ['ar'], TN: ['ar'], IL: ['he'],
  NL: ['nl'], BE: ['nl', 'fr'], PL: ['pl'], CZ: ['cs'], HU: ['hu'], RO: ['ro'], BG: ['bg'],
  HR: ['hr'], RS: ['sr'], AL: ['sq'], SE: ['sv'], NO: ['no'], DK: ['da'], FI: ['fi'],
  RU: ['ru'], UA: ['uk'], JP: ['ja'], CN: ['zh'], KR: ['ko'], IN: ['hi'], IR: ['fa'],
  MX: ['es'], AR: ['es'], PE: ['es'], BR: ['pt'], GB: ['en'], IE: ['en'], US: ['en'],
};

export function userLanguage(): string {
  return getLocales()[0]?.languageCode ?? 'en';
}

const memo = new Map<string, string>();

// Reverse geocoding. On phones it uses the system service; in the browser it uses OpenStreetMap's Nominatim
// (light use only, about one request per second at most).
export async function countryCode(lat: number, lon: number): Promise<string | null> {
  const key = `${lat.toFixed(1)},${lon.toFixed(1)}`;
  const hit = memo.get(key);
  if (hit) return hit;
  let cc: string | null = null;
  try {
    if (Platform.OS === 'web') {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=3&lat=${lat}&lon=${lon}`);
      const j = await res.json();
      cc = j?.address?.country_code ? String(j.address.country_code).toUpperCase() : null;
    } else {
      const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      cc = r?.isoCountryCode ?? null;
    }
  } catch {
    cc = null;
  }
  if (cc) memo.set(key, cc);
  return cc;
}

export const languagesForCountry = (cc: string | null): string[] => (cc && LOCAL[cc]) || [];

// Order = priority for titles and descriptions: user's language, local language(s), English.
export function pickEditions(user: string, local: string[]): string[] {
  const out = [user, ...local.slice(0, MAX_EDITIONS - 2), 'en'];
  return out.filter((l, i) => out.indexOf(l) === i);
}
