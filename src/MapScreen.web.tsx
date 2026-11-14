// Browser version of the map screen. Metro picks this file automatically on the web; phones use MapScreen.tsx.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RADIUS_M, REFETCH_FRACTION } from './config';
import { countryCode, languagesForCountry, pickEditions, userLanguage } from './languages';
import { distanceM } from './geo';
import { loadPlaces } from './providers';
import { displayTitle } from './places';
import { languageName } from './attribution';
import { regionOf } from './theme/regions';
import { useTheme } from './theme/ThemeProvider';
import { loadPatchedStyle } from './theme/styleFix';
import SettingsModal from './SettingsModal';
import PlaceSheet from './PlaceSheet';
import type { LatLon, Place } from './types';

const SOURCE = 'places';
const FONT = ['Noto Sans Regular'];
const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] as any[] };
const pointFC = (ll: LatLon | null) => (ll
  ? { type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [ll.lon, ll.lat] } }] }
  : EMPTY_FC);

// Works with both the callback and the promise forms of the library's cluster API.
function getLeaves(src: any, clusterId: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const ret = src.getClusterLeaves(clusterId, 500, 0, (err: any, leaves: any[]) => (err ? reject(err) : resolve(leaves)));
    if (ret && typeof ret.then === 'function') ret.then(resolve, reject);
  });
}

export default function MapScreen() {
  const { theme, mapStyle, setRegion } = useTheme();
  const c = theme.colors;

  const [pos, setPos] = useState<LatLon | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [langs, setLangs] = useState<string[]>(['en']);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Place | null>(null);
  const [status, setStatus] = useState<'locating' | 'denied' | 'ready'>('locating');
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [style, setStyle] = useState<any>(null);
  const [spider, setSpider] = useState<{ leaves: Place[]; center: LatLon } | null>(null);
  const [virtual, setVirtual] = useState<LatLon | null>(null);   // null = real position
  const [picking, setPicking] = useState(false);
  const virtualRef = useRef<LatLon | null>(null);
  const pickingRef = useRef(false);
  virtualRef.current = virtual;
  pickingRef.current = picking;
  const here = virtual ?? pos;   // where the user is "standing": drives distances and place search

  const containerRef = useRef<any>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const lastQuery = useRef<LatLon | null>(null);
  const visibleRef = useRef<Place[]>([]);
  const collectionRef = useRef<any>(null);

  const activeLangs = useMemo(() => {
    const p = (picked ?? langs).filter((l) => langs.includes(l));
    return p.length ? p : langs;
  }, [picked, langs]);

  const toggleLang = (l: string) => {
    const next = activeLangs.includes(l) ? activeLangs.filter((x) => x !== l) : [...activeLangs, l];
    if (next.length) setPicked(next);
  };

  const visiblePlaces = useMemo(
    () => places.filter((p) => p.articles.some((a) => activeLangs.includes(a.lang))),
    [places, activeLangs],
  );
  const collection = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: visiblePlaces.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
      properties: { id: p.id, name: displayTitle(p, activeLangs) },
    })),
  }), [visiblePlaces, activeLangs]);

  visibleRef.current = visiblePlaces;
  collectionRef.current = collection;

  const load = useCallback(async (center: LatLon) => {
    lastQuery.current = center;
    setLoading(true);
    try {
      const cc = await countryCode(center.lat, center.lon);
      setRegion(regionOf(cc));
      const editions = pickEditions(userLanguage(), languagesForCountry(cc));
      setLangs(editions);
      const found = await loadPlaces({ center, radiusM: RADIUS_M, langs: editions });
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

  // Set the virtual position: the app behaves as if the user were there.
  const setVirtualAt = (ll: LatLon) => {
    setVirtual(ll);
    setPicking(false);
    setSpider(null);
    load(ll);
  };

  // Back to the real position.
  const backToReal = () => {
    if (!pos) return;
    setVirtual(null);
    setPicking(false);
    setSpider(null);
    mapRef.current?.easeTo({ center: [pos.lon, pos.lat], zoom: 14, duration: 500 });
    load(pos);
  };

  // Map style (base map), with its label font fixed.
  useEffect(() => {
    let live = true;
    setStyle(null);
    loadPatchedStyle(mapStyle.url)
      .then((st) => { if (live) setStyle(st); })
      .catch((e) => console.warn('Map style failed to load:', e));
    return () => { live = false; };
  }, [mapStyle.url]);

  // Create the map once the style and position are known; recreate when the map style changes.
  useEffect(() => {
    if (!style || !pos || !containerRef.current) return;
    // The worker file sits next to the page (copied from public/ at build time).
    setWorkerUrl(new URL('maplibre-gl-worker.mjs', window.location.href).href);
    const map = new MapLibreMap({
      container: containerRef.current,
      style,
      center: [pos.lon, pos.lat],
      zoom: 14,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      map.addSource(SOURCE, {
        type: 'geojson', data: collectionRef.current, cluster: true, clusterRadius: 45, clusterMaxZoom: 15,
      });
      map.addLayer({ id: 'clusters', type: 'circle', source: SOURCE, filter: ['has', 'point_count'],
        paint: { 'circle-color': c.cluster, 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26], 'circle-stroke-width': 2, 'circle-stroke-color': c.markerStroke } });
      map.addLayer({ id: 'cluster-count', type: 'symbol', source: SOURCE, filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-allow-overlap': true, 'text-font': FONT },
        paint: { 'text-color': c.clusterText } });
      map.addLayer({ id: 'point', type: 'circle', source: SOURCE, filter: ['!', ['has', 'point_count']],
        paint: { 'circle-radius': 8, 'circle-color': c.marker, 'circle-stroke-width': 2, 'circle-stroke-color': c.markerStroke } });
      map.addLayer({ id: 'point-label', type: 'symbol', source: SOURCE, minzoom: 15, filter: ['!', ['has', 'point_count']],
        layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-optional': true, 'text-font': FONT },
        paint: { 'text-color': c.ink, 'text-halo-color': c.halo, 'text-halo-width': 1.5 } });

      // Virtual position: orange dot (the real position stays blue).
      map.addSource('virtual', { type: 'geojson', data: pointFC(virtualRef.current) as any });
      map.addLayer({ id: 'virtual-ring', type: 'circle', source: 'virtual',
        paint: { 'circle-radius': 12, 'circle-color': '#D9733A', 'circle-opacity': 0.25 } });
      map.addLayer({ id: 'virtual-dot', type: 'circle', source: 'virtual',
        paint: { 'circle-radius': 6, 'circle-color': '#D9733A', 'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF' } });

      // Spread-out cluster: lines from the cluster centre to each place, and the places themselves.
      map.addSource('spider-lines', { type: 'geojson', data: EMPTY_FC as any });
      map.addSource('spider-points', { type: 'geojson', data: EMPTY_FC as any });
      map.addLayer({ id: 'spider-lines', type: 'line', source: 'spider-lines',
        paint: { 'line-color': c.ink, 'line-width': 1.5, 'line-opacity': 0.7 } });
      map.addLayer({ id: 'spider-points', type: 'circle', source: 'spider-points',
        paint: { 'circle-radius': 7, 'circle-color': c.markerSelected, 'circle-stroke-width': 2, 'circle-stroke-color': c.markerStroke } });
      map.addLayer({ id: 'spider-labels', type: 'symbol', source: 'spider-points',
        layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-optional': true, 'text-font': FONT },
        paint: { 'text-color': c.ink, 'text-halo-color': c.halo, 'text-halo-width': 1.5 } });

      // Own position: blue dot with a soft halo.
      map.addSource('me', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [pos.lon, pos.lat] } },
      });
      map.addLayer({ id: 'me-halo', type: 'circle', source: 'me',
        paint: { 'circle-radius': 16, 'circle-color': '#2F6FE0', 'circle-opacity': 0.2 } });
      map.addLayer({ id: 'me-dot', type: 'circle', source: 'me',
        paint: { 'circle-radius': 6, 'circle-color': '#2F6FE0', 'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF' } });

      map.on('click', 'clusters', async (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const src: any = map.getSource(SOURCE);
        try {
          const leaves = await getLeaves(src, (f.properties as any).cluster_id);
          const ids = new Set(leaves.map((l: any) => l.properties.id));
          setSpider({
            leaves: visibleRef.current.filter((p) => ids.has(p.id)),
            center: { lat: (f.geometry as any).coordinates[1], lon: (f.geometry as any).coordinates[0] },
          });
        } catch (err) {
          console.warn('Fadlan: cluster lookup failed', String(err));
        }
      });
      map.on('click', 'spider-points', (e) => {
        const id = e.features?.[0]?.properties?.id;
        const p = visibleRef.current.find((x) => x.id === id);
        if (p) { setSpider(null); setSelected(p); }
      });
      map.on('click', (e) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ['clusters', 'point', 'spider-points'] });
        if (!hits.length && pickingRef.current) {
          setVirtualAt({ lat: e.lngLat.lat, lon: e.lngLat.lng });
          return;
        }
        if (!hits.length) setSpider(null);
      });
      map.on('movestart', () => setSpider(null));
      map.on('click', 'point', (e) => {
        const id = e.features?.[0]?.properties?.id;
        const p = visibleRef.current.find((x) => x.id === id);
        if (p) setSelected(p);
      });
      for (const layer of ['clusters', 'point']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      }
      // Re-query when the user has panned far enough from the last search point.
      map.on('moveend', (e: any) => {
        if (!e.originalEvent || !lastQuery.current) return;
        const ctr = map.getCenter();
        const cc = { lat: ctr.lat, lon: ctr.lng };
        if (distanceM(cc, lastQuery.current) > RADIUS_M * REFETCH_FRACTION) load(cc);
      });
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [style, pos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update the markers when the places or languages change.
  useEffect(() => {
    const src: any = mapRef.current?.getSource(SOURCE);
    src?.setData(collection);
  }, [collection]);

  useEffect(() => {
    const v: any = mapRef.current?.getSource('virtual');
    v?.setData(pointFC(virtual));
  }, [virtual]);

  useEffect(() => {
    const m = mapRef.current;
    if (m) m.getCanvas().style.cursor = picking ? 'crosshair' : '';
  }, [picking]);

  // Spread-out cluster: place the members on a spiral around the cluster centre (screen-space spacing).
  useEffect(() => {
    const m = mapRef.current;
    const lines: any = m?.getSource('spider-lines');
    const pts: any = m?.getSource('spider-points');
    if (!m || !lines || !pts) return;
    if (!spider) {
      lines.setData(EMPTY_FC);
      pts.setData(EMPTY_FC);
      return;
    }
    const origin = m.project([spider.center.lon, spider.center.lat]);
    const placed = spider.leaves.map((p, i) => {
      const r = 22 * Math.sqrt(i + 1);
      const th = i * 2.399963; // golden angle
      const ll = m.unproject([origin.x + r * Math.cos(th), origin.y + r * Math.sin(th)]);
      return { p, lng: ll.lng, lat: ll.lat };
    });
    lines.setData({
      type: 'FeatureCollection',
      features: placed.map((f) => ({
        type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: [[spider.center.lon, spider.center.lat], [f.lng, f.lat]] },
      })),
    });
    pts.setData({
      type: 'FeatureCollection',
      features: placed.map((f) => ({
        type: 'Feature',
        properties: { id: f.p.id, name: displayTitle(f.p, activeLangs) },
        geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
      })),
    });
  }, [spider, activeLangs]);

  // Colours follow the app style; the selected marker is highlighted.
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !m.getLayer('point')) return;
    m.setPaintProperty('point', 'circle-color', ['case', ['==', ['get', 'id'], selected?.id ?? ''], c.markerSelected, c.marker]);
    m.setPaintProperty('point', 'circle-stroke-color', c.markerStroke);
    m.setPaintProperty('clusters', 'circle-color', c.cluster);
    m.setPaintProperty('clusters', 'circle-stroke-color', c.markerStroke);
    m.setPaintProperty('cluster-count', 'text-color', c.clusterText);
    m.setPaintProperty('point-label', 'text-color', c.ink);
    m.setPaintProperty('point-label', 'text-halo-color', c.halo);
  }, [selected?.id, c]);

  const styles = useMemo(() => StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: c.background },
    msg: { color: c.ink, fontSize: 16, textAlign: 'center', marginBottom: 16, fontFamily: theme.fonts.body },
    btn: { backgroundColor: c.chipOn, paddingHorizontal: 20, paddingVertical: 12, borderRadius: theme.shape.buttonRadius },
    btnText: { color: c.chipOnText, fontWeight: '600' },
    loading: { position: 'absolute', top: 104, alignSelf: 'center', backgroundColor: c.background, padding: 8, borderRadius: 20 },
    langBar: { position: 'absolute', top: 52, left: 12, right: 84 },
    lchip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.shape.chipRadius, backgroundColor: c.background, borderWidth: 1, borderColor: c.chipOn },
    lchipText: { fontSize: 12, fontFamily: theme.fonts.body, fontWeight: '600' },
    count: { position: 'absolute', top: 100, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.shape.chipRadius, backgroundColor: c.background },
    countText: { fontSize: 11, color: c.muted, fontFamily: theme.fonts.body },
    styleBtn: { position: 'absolute', top: 52, right: 12, height: 36, paddingHorizontal: 14, justifyContent: 'center', borderRadius: theme.shape.buttonRadius, backgroundColor: c.background },
    styleBtnText: { color: c.ink, fontWeight: '600', fontFamily: theme.fonts.body },
    posBtn: { position: 'absolute', top: 96, right: 12, height: 36, paddingHorizontal: 14, justifyContent: 'center', borderRadius: theme.shape.buttonRadius, backgroundColor: c.background },
    pickWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12 },
    pickCard: { backgroundColor: c.background, borderRadius: theme.shape.sheetRadius, padding: 14, maxHeight: '55%', elevation: 4 },
    pickHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    pickTitle: { fontSize: 16, fontWeight: '600', color: c.ink, fontFamily: theme.fonts.heading },
    pickClose: { color: c.accent, fontWeight: '600', fontFamily: theme.fonts.body },
    pickRow: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.line },
    pickName: { fontSize: 15, color: c.ink, fontFamily: theme.fonts.body },
    pickDesc: { fontSize: 12, color: c.muted, marginTop: 2, fontFamily: theme.fonts.body },
  }), [theme, c]);

  if (status !== 'ready' || !pos) {
    return (
      <View style={styles.center}>
        {status === 'denied' ? (
          <>
            <Text style={styles.msg}>This app needs your position to show places around you. Allow location in your browser and reload.</Text>
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
      <View ref={containerRef} style={{ flex: 1 }} />

      {mapStyle.tint && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: mapStyle.tint.color, opacity: mapStyle.tint.opacity }]} />
      )}

      {langs.length > 1 && (
        <View style={styles.langBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {langs.map((l) => {
              const on = activeLangs.includes(l);
              return (
                <Pressable key={l} onPress={() => toggleLang(l)} style={[styles.lchip, on && { backgroundColor: c.chipOn }]}>
                  <Text style={[styles.lchipText, { color: on ? c.chipOnText : c.chipText }]}>{languageName(l)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.count} pointerEvents="none">
        <Text style={styles.countText}>{picking ? 'Tap the map to set your position' : loading ? 'Searching...' : virtual ? `${visiblePlaces.length} places \u00B7 virtual position` : `${visiblePlaces.length} places`}</Text>
      </View>

      {loading && <View style={styles.loading}><ActivityIndicator size="small" color={c.accent} /></View>}

      <Pressable style={styles.styleBtn} onPress={() => setSettingsOpen(true)} accessibilityLabel="Appearance settings">
        <Text style={styles.styleBtnText}>Style</Text>
      </Pressable>

      <Pressable style={styles.posBtn} onPress={virtual ? backToReal : () => setPicking((x) => !x)}>
        <Text style={styles.styleBtnText}>{virtual ? 'My position' : picking ? 'Cancel' : 'Set position'}</Text>
      </Pressable>

      {selected && <PlaceSheet place={selected} langs={activeLangs} here={here as LatLon} onClose={() => setSelected(null)} />}
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}
