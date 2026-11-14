import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { distanceM } from './geo';
import { USER_AGENT } from './config';
import { getFullText, getSummary, getThumb, photosFor } from './providers';
import { parseSections } from './text';
import { orderedArticles } from './places';
import { attributionFor, languageName } from './attribution';
import { canRead } from './entitlements';
import PhotoViewer, { type Shot } from './PhotoViewer';
import { useTheme } from './theme/ThemeProvider';
import type { LatLon, Place } from './types';

const IMG_HEADERS = { 'User-Agent': USER_AGENT };
const fmtDistance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
// Sections that are reference lists rather than content (English, German, Italian headings).
const SKIP_SECTION = /^(see also|references|external links|further reading|notes|sources|bibliography|literature|weblinks|einzelnachweise|literatur|siehe auch|voci correlate|collegamenti esterni|bibliografia|note)$/i;
const paragraphs = (t: string) => t.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
// Ask Wikimedia for a larger version of a thumbnail URL.
const bigger = (url: string, w = 1000) => url.replace(/\/(\d+)px-/, `/${w}px-`);

type Props = { place: Place; langs: string[]; here: LatLon; onClose: () => void };

export default function PlaceSheet({ place, langs, here, onClose }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(theme), [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const sheet = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => [110, '48%', '92%'], []); // collapsed / half / full

  // Only the languages the user has switched on; fall back to all if none match.
  const articles = useMemo(() => {
    const all = orderedArticles(place, langs);
    const shown = all.filter((a) => langs.includes(a.lang));
    return shown.length ? shown : all;
  }, [place, langs]);
  const [articleId, setArticleId] = useState(articles[0]?.id);
  const article = articles.find((a) => a.id === articleId) ?? articles[0];

  const [summary, setSummary] = useState<string | null>(null);
  const [full, setFull] = useState<string | null>(null);
  const [wantFull, setWantFull] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | undefined>(place.thumb);
  const [gallery, setGallery] = useState<Shot[] | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [viewShots, setViewShots] = useState<Shot[]>([]);
  const [viewer, setViewer] = useState({ open: false, start: 0 });

  const readable = article ? canRead(article) : false;

  // New place: half height, first article, nothing requested yet.
  useEffect(() => {
    setArticleId(articles[0]?.id);
    setWantFull(false);
    sheet.current?.snapToIndex(1);
  }, [place.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Photo: the selected article's own image first, then the search image.
  useEffect(() => {
    setPhoto(place.thumb);
    setGallery(null);
    if (!article) return;
    let live = true;
    getThumb(article).then((u) => { if (live && u) setPhoto(u); });
    return () => { live = false; };
  }, [article?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Summary: fetched as soon as the article changes.
  useEffect(() => {
    if (!article || !readable) return;
    let live = true;
    setSummary(null); setFull(null); setError(null);
    getSummary(article).then((t) => live && setSummary(t)).catch(() => live && setError('Not available right now (offline and not opened before).'));
    return () => { live = false; };
  }, [article?.id, readable]); // eslint-disable-line react-hooks/exhaustive-deps

  // Full text: only after the reader scrolls or opens the full article.
  useEffect(() => {
    if (!wantFull || !article || !readable) return;
    let live = true;
    getFullText(article).then((t) => live && setFull(t)).catch(() => live && setError('Full article not available offline yet.'));
    return () => { live = false; };
  }, [wantFull, article?.id, readable]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = useCallback((i: number) => { if (i === 2) setWantFull(true); }, []);

  const openHero = () => {
    if (!photo) return;
    setViewShots([{ uri: bigger(photo), caption: article?.title }]);
    setViewer({ open: true, start: 0 });
  };

  const openGallery = async () => {
    if (!article) return;
    let list = gallery;
    if (!list) {
      setGalleryLoading(true);
      list = await photosFor(article).then((ps) => ps.map((p) => ({ uri: p.uri, caption: p.caption })));
      setGallery(list);
      setGalleryLoading(false);
    }
    if (list.length) {
      setViewShots(list);
      setViewer({ open: true, start: 0 });
    }
  };

  const sections = useMemo(
    () => (full ? parseSections(full).filter((s) => !(s.heading && SKIP_SECTION.test(s.heading.trim()))) : []),
    [full],
  );
  const dist = fmtDistance(distanceM(here, place));

  if (!article) return null;
  const credit = attributionFor(article);
  const summaryParts = summary ? paragraphs(summary) : [];

  return (
    <>
      <BottomSheet
        ref={sheet}
        index={1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        onChange={onChange}
        backgroundStyle={{ backgroundColor: c.background, borderTopLeftRadius: theme.shape.sheetRadius, borderTopRightRadius: theme.shape.sheetRadius }}
        handleIndicatorStyle={{ backgroundColor: c.muted }}
      >
        {!!theme.band && <View style={{ height: theme.band.height, backgroundColor: theme.band.color }} />}
        <BottomSheetScrollView contentContainerStyle={styles.content} onScrollBeginDrag={() => setWantFull(true)}>

          {/* Header */}
          <Text style={styles.kicker}>
            {languageName(article.lang)}{article.source === 'creator' ? ' · creator' : ''} · {dist} away
          </Text>
          <Text style={styles.title}>{article.title}</Text>
          {!!place.description && <Text style={styles.desc}>{place.description}</Text>}

          {articles.length > 1 && (
            <View style={styles.chips}>
              {articles.map((a) => {
                const on = a.id === article.id;
                return (
                  <Pressable key={a.id} onPress={() => setArticleId(a.id)} style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {languageName(a.lang)}{a.source === 'creator' ? ` \u00B7 ${a.author ?? 'creator'}` : ''}{a.access === 'premium' ? ' \u2605' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!readable && (
            <View style={styles.locked}>
              <Text style={styles.lockedTitle}>Premium content</Text>
              <Text style={styles.body}>This article is part of the premium collection. Subscriptions are not available yet.</Text>
            </View>
          )}

          {/* Photo: whole image, tap to enlarge */}
          {readable && !!photo && (
            <Pressable onPress={openHero} style={styles.heroWrap}>
              <Image
                source={{ uri: photo, headers: IMG_HEADERS }}
                style={styles.hero}
                resizeMode="contain"
                onError={() => setPhoto(undefined)}
              />
              <Text style={styles.hint}>Tap to enlarge</Text>
            </Pressable>
          )}

          {readable && (
            <Pressable style={styles.galleryBtn} onPress={openGallery} disabled={galleryLoading}>
              <Text style={styles.galleryText}>
                {galleryLoading ? 'Loading photos\u2026' : gallery ? (gallery.length ? `All photos (${gallery.length})` : 'No other photos on this page') : 'All photos'}
              </Text>
            </Pressable>
          )}

          {/* Summary: lead paragraph first, then the rest */}
          {readable && summary === null && !error && <ActivityIndicator style={{ marginVertical: 16 }} color={c.accent} />}
          {readable && summaryParts.map((p, i) => (
            <Text key={i} style={i === 0 ? styles.lead : styles.body}>{p}</Text>
          ))}
          {!!error && <Text style={styles.error}>{error}</Text>}

          {readable && !wantFull && !!summary && (
            <Pressable style={styles.more} onPress={() => { setWantFull(true); sheet.current?.snapToIndex(2); }}>
              <Text style={styles.moreText}>{theme.strings.readFull}</Text>
            </Pressable>
          )}

          {/* Full article: one block per section */}
          {readable && wantFull && full === null && !error && <ActivityIndicator style={{ marginVertical: 16 }} color={c.accent} />}
          {sections.map((s, i) => (
            <View key={i} style={styles.section}>
              {i > 0 && (theme.ornament ? <Text style={styles.ornament}>{theme.ornament}</Text> : <View style={styles.divider} />)}
              {!!s.heading && (
                <View style={styles.sectionHead}>
                  <View style={[styles.bar, { backgroundColor: c.accent }]} />
                  <Text style={styles.h2}>{s.heading}</Text>
                </View>
              )}
              {paragraphs(s.body).map((p, j) => (
                <Text key={j} style={styles.body}>{p}</Text>
              ))}
            </View>
          ))}

          {/* Footer */}
          {!!credit.url && (
            <Pressable style={styles.footerBtn} onPress={() => Linking.openURL(credit.url!)}>
              <Text style={styles.footerBtnText}>{credit.linkLabel ?? 'Open link'}</Text>
            </Pressable>
          )}
          <Text style={styles.credit}>{credit.text}</Text>
        </BottomSheetScrollView>
      </BottomSheet>

      <PhotoViewer
        shots={viewShots}
        start={viewer.start}
        visible={viewer.open}
        onClose={() => setViewer((v) => ({ ...v, open: false }))}
      />
    </>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  const c = theme.colors, f = theme.fonts, sh = theme.shape;
  const italic = theme.text.titleItalic ? 'italic' : 'normal';
  return StyleSheet.create({
    content: { paddingHorizontal: 20, paddingBottom: 48 },
    kicker: { fontSize: 11, color: c.muted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6, fontFamily: f.body },
    title: {
      fontSize: 24, fontWeight: '600', color: c.ink, marginTop: 4, lineHeight: 30,
      fontFamily: f.heading, fontStyle: italic,
      textTransform: theme.text.titleUppercase ? 'uppercase' : 'none', letterSpacing: theme.text.titleSpacing,
    },
    desc: { fontSize: 14, color: c.muted, marginTop: 4, fontFamily: f.body, fontStyle: 'italic' },
    chips: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: sh.chipRadius, backgroundColor: c.chip, borderWidth: 1, borderColor: c.chipOn },
    chipOn: { backgroundColor: c.chipOn },
    chipText: { fontSize: 12, color: c.chipText, fontFamily: f.body },
    chipTextOn: { color: c.chipOnText },
    heroWrap: { marginTop: 16, borderRadius: sh.photoRadius, borderWidth: sh.photoBorder, borderColor: c.frame, overflow: 'hidden', backgroundColor: c.chip },
    hero: { width: '100%', height: 230 },
    hint: { fontSize: 11, color: c.muted, textAlign: 'center', paddingVertical: 6, fontFamily: f.body },
    galleryBtn: { marginTop: 10, paddingVertical: 10, borderRadius: sh.buttonRadius, borderWidth: 1, borderColor: c.line, alignItems: 'center' },
    galleryText: { color: c.accent, fontWeight: '600', fontFamily: f.body },
    lead: { fontSize: 16, lineHeight: 25, color: c.ink, marginTop: 16, fontFamily: f.body },
    body: { fontSize: 15, lineHeight: 23, color: c.ink, marginTop: 10, fontFamily: f.body },
    section: { marginTop: 22 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    bar: { width: 4, height: 18, borderRadius: 2 },
    h2: { fontSize: 18, fontWeight: '600', color: c.accent, fontFamily: f.heading, fontStyle: italic, flexShrink: 1 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginBottom: 16 },
    ornament: { textAlign: 'center', color: c.accent, fontSize: 16, marginBottom: 10 },
    more: { marginTop: 18, paddingVertical: 12, borderRadius: sh.buttonRadius, borderWidth: 1, borderColor: c.line, alignItems: 'center' },
    moreText: { color: c.accent, fontWeight: '600', fontFamily: f.body },
    locked: { marginTop: 16, padding: 14, borderRadius: sh.buttonRadius, backgroundColor: c.chip },
    lockedTitle: { fontWeight: '600', color: c.ink, fontFamily: f.heading },
    error: { color: c.muted, marginTop: 14, fontFamily: f.body },
    footerBtn: { marginTop: 28, paddingVertical: 12, borderRadius: sh.buttonRadius, backgroundColor: c.chipOn, alignItems: 'center' },
    footerBtnText: { color: c.chipOnText, fontWeight: '600', fontFamily: f.body },
    credit: { fontSize: 11, color: c.muted, marginTop: 12, lineHeight: 16, textAlign: 'center', fontFamily: f.body },
  });
}
