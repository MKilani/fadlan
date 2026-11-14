# Fadlan (starter, working name)

Map of nearby Wikipedia places (English + your language + the local language), with a three-height bottom sheet:
collapsed (title), half (summary, map visible), full (article). Full text is fetched only on scroll/expand and cached for offline use.

## Run it
MapLibre is a native module, so Expo Go will NOT work. You need a development build.

```bash
npx create-expo-app@latest fadlan --template blank-typescript
cd fadlan
npx expo install @maplibre/maplibre-react-native expo-location expo-localization \
  @react-native-async-storage/async-storage react-native-reanimated \
  react-native-gesture-handler react-native-worklets @gorhom/bottom-sheet expo-status-bar
```
Copy `App.tsx` and the `src/` folder from this archive into the project, and merge the `plugins`
section and the package names of `app.json` into yours. Then:

```bash
npx expo run:android      # needs Android Studio + a phone/emulator
npx expo run:ios          # needs a Mac with Xcode
```

## Architecture (built to grow)
- `src/providers/`: every content source implements `ContentProvider` (`fetchPlaces`, `getSummary`, `getFullText`).
  `wikipedia.ts` is live. `creator.ts` is a documented placeholder for the future creator marketplace;
  switch it on with `ENABLE_CREATOR_CONTENT` in `config.ts` once a backend exists.
- IDs are namespaced: `wd:Q…` (Wikidata place), `wp:<lang>:<title>` (Wikipedia article), `gw:<uuid>` (creator content).
  A creator article attached to a `wd:` place merges with the Wikipedia article automatically.
- Each article carries `source`, `access` (free/premium), `author`, `license`. Credits come from `attribution.ts`,
  and `entitlements.ts` is the one place that will decide who may read premium content.
- Keep Wikipedia text free and visibly separate (CC BY-SA); only original creator content should be paid.
  Premium text must be protected on the server, not just hidden in the app.

## Themes (built to grow; only Plain and Fantasy exist now)
- Two independent settings, chosen in the gear menu on the map: **app style** (`src/theme/themes/*`: colours, fonts, shapes,
  chips, sheet band, button wording, pin colours) and **map style** (`src/theme/mapStyles.ts`: base map only).
- **Auto**: the app style comes from the user's region (`regions.ts` + `REGION_DEFAULT_APP` in `theme/index.ts`, empty for
  now, so Auto = Plain); the map style follows the app style's `defaultMap`.
- Add a style: add its id in `theme/types.ts`, create `themes/<name>.ts`, register it in `theme/index.ts`
  (and add a map style entry if it has its own map), then map regions to it in `REGION_DEFAULT_APP`.
- Placeholders: the Fantasy map is the Plain map with a warm tint (replace with a designed style); pins are plain circles
  coloured by the theme (custom pin icons would be added with MapLibre image sources); fonts are the phone's system serif.

## Before publishing
1. `src/config.ts`: put a real contact in `USER_AGENT`; replace `MAP_STYLE` with a tile provider you may use.
2. Privacy policy, store listings, attribution on the map (OpenStreetMap / tile provider) and for Wikipedia text (already shown in the sheet).
3. Not yet built: importance filtering, offline region download, settings (radius, languages), tests.

## Status
Written without access to a device or to Wikipedia from the authoring environment: it has not been run.
Expect small fixes on first launch.
