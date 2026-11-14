import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { THEMES, REGION_DEFAULT_APP } from './index';
import { MAP_STYLES, type MapStyleDef } from './mapStyles';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './settings';
import type { Region } from './regions';
import type { Theme } from './types';

type Ctx = {
  theme: Theme;
  mapStyle: MapStyleDef;
  settings: Settings;
  setSettings: (s: Settings) => void;
  region: Region;
  setRegion: (r: Region) => void;
};

const ThemeContext = createContext<Ctx>(null as unknown as Ctx);
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [region, setRegion] = useState<Region>('other');

  useEffect(() => { loadSettings().then(setSettingsState); }, []);

  const setSettings = useCallback((s: Settings) => { setSettingsState(s); saveSettings(s); }, []);

  const value = useMemo<Ctx>(() => {
    const appId = settings.app === 'auto' ? REGION_DEFAULT_APP[region] ?? 'plain' : settings.app;
    const theme = THEMES[appId];
    const mapId = settings.map === 'auto' ? theme.defaultMap : settings.map;
    return { theme, mapStyle: MAP_STYLES[mapId], settings, setSettings, region, setRegion };
  }, [settings, region, setSettings]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
