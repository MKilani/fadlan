import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import {
  Camera, GeoJSONSource, Layer, Map as MapView, UserLocation,
  type CameraRef, type GeoJSONSourceRef,
} from '@maplibre/maplibre-react-native';
import { RADIUS_M, REFETCH_FRACTION } from './config';
import { countryCode, languagesForCountry, pickEditions, userLanguage } from './languages';
import { distanceM } from './geo';
import { loadPlaces } from './providers';
import { displayTitle } from './places';
import { languageName } from './attribution';
import { regionOf } from './theme/regions';
import { EMPTY_STYLE, loadPatchedStyle } from './theme/styleFix';
import { useTheme } from './theme/ThemeProvider';
import SettingsModal from './SettingsModal';
import PlaceSheet from './PlaceSheet';
import type { LatLon, Place } from './types';

export default function MapScreen() {
  const { theme, mapStyle, setRegion } = useTheme();
  const c = theme.colors;

  const [pos, setPos] = useState<LatLon | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [langs, setLangs] = useState<string[]>(['en']);   // editions available in this area
  const [picked, setPicked] = useState<string[] | null>(null); // what the user switched on (null = all)
  const [selected, setSelected] = useState<Place | null>(null);
  const [status, setStatus] = useState<'locating' | 'denied' | 'ready'>('locating');
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [style, setStyle] = useState<any>(null);

  // Load the map style for the chosen map style, with its label font fixed (see theme/styleFix.ts).
  useEffect(() => {
    let live = true;
    setStyle(null);
    loadPatchedStyle(mapStyle.url)
      .then((st) => { if (live) setStyle(st); })
      .catch((e) => console.warn('Map style failed to load:', e));
    return () => { live = false; };
  }, [mapStyle.url]);

  const camera = useRef<CameraRef>(null);
  const source = useRef<GeoJSONSourceRef>(null);
  const lastQuery = useRef<LatLon | null>(null);

  // Languages currently switched on, never empty, never outside the area's editions.
  const activeLangs = useMemo(() => {
    const p = (picked ?? langs).filter((l) => langs.includes(l));
    return p.length ? p : langs;
  }, [picked, langs]);

  const toggleLang = (l: string) => {
    const next = activeLangs.includes(l) ? activeLangs.filter((x) => x !== l) : [...activeLangs, l];
    if (next.length) setPicked(next);
  };

  // Places that have at least one article in an active language.
  const visiblePlaces = useMemo(
    () => places.filter((p) => p.articles.some((a) => activeLangs.includes(a.lang))),
    [places, activeLangs],
  );

  const load = useCallback(async (center: LatLon) => {
    lastQuery.current = center;
    setLoading(true);
    try {
      const cc = await countryCode(center.lat, center.lon);
      setRegion(regionOf(cc));   // drives the automatic app style
      const editions = pickEditions(userLanguage(), languagesForCountry(cc));
      setLangs(editions);
      console.log('Fadlan: searching at', center.lat.toFixed(4), center.lon.toFixed(4), 'editions', editions.join(','));
      const found = await loadPlaces({ center, radiusM: RADIUS_M, langs: editions });
      console.log('Fadlan: places found', found.length);
      setPlaces((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]));
        found.forEach((p) => byId.set(p.id, p));
        return [...byId.values()];
      });
    } finally {
      setLoading(false);
    }
  }, [setRegion]);

  const locate = useCallback(async () => {
    setStatus('locating');
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') return setStatus('denied');
    const p = await Location.getCurrentPositionAsync({});
    const here = { lat: p.coords.latitude, lon: p.coords.longitude };
    setPos(here);
    setStatus('ready');
    load(here);
  }, [load]);

  useEffect(() => { locate(); }, [locate]);

  const collection = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: visiblePlaces.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
      properties: { id: p.id, name: displayTitle(p, activeLangs) },
    })),
  }), [visiblePlaces, activeLangs]);

  const onSourcePress = async (e: any) => {
    const f = e.nativeEvent?.features?.[0];
    if (!f) return;
    const [lon, lat] = f.geometry.coordinates;
    if (f.properties?.cluster) {
      const zoom = await source.current?.getClusterExpansionZoom(f.properties.cluster_id);
      camera.current?.easeTo({ center: [lon, lat], zoom: zoom ?? undefined, duration: 400 });
    } else {
      const place = visiblePlaces.find((p) => p.id === f.properties?.id);
      if (place) setSelected(place);
    }
  };

  const onRegionDidChange = (e: any) => {
    const { center, userInteraction } = e.nativeEvent;
    if (!userInteraction || !lastQuery.current) return;
    const ctr = { lat: center[1], lon: center[0] };
    if (distanceM(ctr, lastQuery.current) > RADIUS_M * REFETCH_FRACTION) load(ctr);
  };

  const styles = useMemo(() => StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: c.background },
    msg: { color: c.ink, fontSize: 16, textAlign: 'center', marginBottom: 16, fontFamily: theme.fonts.body },
    btn: { backgroundColor: c.chipOn, paddingHorizontal: 20, paddingVertical: 12, borderRadius: theme.shape.buttonRadius },
    btnText: { color: c.chipOnText, fontWeight: '600' },
    loading: { position: 'absolute', top: 104, alignSelf: 'center', backgroundColor: c.background, padding: 8, borderRadius: 20 },
    langBar: { position: 'absolute', top: 52, left: 12, right: 84 },
    count: {
      position: 'absolute', top: 100, left: 12, paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: theme.shape.chipRadius, backgroundColor: c.background,
    },
    countText: { fontSize: 11, color: c.muted, fontFamily: theme.fonts.body },
    lchip: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.shape.chipRadius,
      backgroundColor: c.background, borderWidth: 1, borderColor: c.chipOn,
    },
    lchipText: { fontSize: 12, fontFamily: theme.fonts.body, fontWeight: '600' },
    styleBtn: {
      position: 'absolute', top: 52, right: 12, height: 36, paddingHorizontal: 14, justifyContent: 'center',
      borderRadius: theme.shape.buttonRadius, backgroundColor: c.background, elevation: 3,
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    },
    styleBtnText: { color: c.ink, fontWeight: '600', fontFamily: theme.fonts.body },
  }), [theme, c]);

  if (status !== 'ready' || !pos) {
    return (
      <View style={styles.center}>
        {status === 'denied' ? (
          <>
            <Text style={styles.msg}>This app needs your position to show places around you.</Text>
            <Pressable style={styles.btn} onPress={locate}><Text style={styles.btnText}>Allow location</Text></Pressable>
          </>
        ) : (
          <ActivityIndicator color={c.accent} />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {style ? (
      <MapView key={mapStyle.id} style={{ flex: 1 }} mapStyle={style} onRegionDidChange={onRegionDidChange}>
        <Camera ref={camera} initialViewState={{ center: [pos.lon, pos.lat], zoom: 14 }} />
        <UserLocation />
        <GeoJSONSource ref={source} id="places" data={collection} cluster clusterRadius={45} clusterMaxZoom={15} onPress={onSourcePress}>
          <Layer
            id="clusters" type="circle" filter={['has', 'point_count']}
            paint={{ 'circle-color': c.cluster, 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26], 'circle-stroke-width': 2, 'circle-stroke-color': c.markerStroke }}
          />
          <Layer
            id="cluster-count" type="symbol" filter={['has', 'point_count']}
            layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-allow-overlap': true, 'text-font': ['Noto Sans Regular'] }}
            paint={{ 'text-color': c.clusterText }}
          />
          <Layer
            id="point" type="circle" filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-radius': 8,
              'circle-color': ['case', ['==', ['get', 'id'], selected?.id ?? ''], c.markerSelected, c.marker],
              'circle-stroke-width': 2, 'circle-stroke-color': c.markerStroke,
            }}
          />
          <Layer
            id="point-label" type="symbol" minzoom={15} filter={['!', ['has', 'point_count']]}
            layout={{ 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-optional': true, 'text-font': ['Noto Sans Regular'] }}
            paint={{ 'text-color': c.ink, 'text-halo-color': c.halo, 'text-halo-width': 1.5 }}
          />
        </GeoJSONSource>
      </MapView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
          <ActivityIndicator color={c.accent} />
        </View>
      )}

      {mapStyle.tint && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: mapStyle.tint.color, opacity: mapStyle.tint.opacity }]} />
      )}

      {/* Language switch: tap to show or hide the editions. Places and names follow. */}
      {langs.length > 1 && (
        <View style={styles.langBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {langs.map((l) => {
              const on = activeLangs.includes(l);
              return (
                <Pressable
                  key={l}
                  onPress={() => toggleLang(l)}
                  style={[styles.lchip, on && { backgroundColor: c.chipOn }]}
                >
                  <Text style={[styles.lchipText, { color: on ? c.chipOnText : c.chipText }]}>{languageName(l)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.count} pointerEvents="none">
        <Text style={styles.countText}>{loading ? 'Searching...' : `${visiblePlaces.length} places`}</Text>
      </View>

      {loading && <View style={styles.loading}><ActivityIndicator size="small" color={c.accent} /></View>}

      <Pressable style={styles.styleBtn} onPress={() => setSettingsOpen(true)} accessibilityLabel="Appearance settings">
        <Text style={styles.styleBtnText}>Style</Text>
      </Pressable>

      {selected && <PlaceSheet place={selected} langs={activeLangs} here={pos} onClose={() => setSelected(null)} />}
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}
