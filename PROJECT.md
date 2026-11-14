# Fadlan: project draft

Working name: Fadlan. Last updated: 2026-11-05 (version 13). Status labels: **Decided** = confirmed by the owner;
**Proposed** = suggested by Claude, not yet decided; **Open** = needs an answer.

How to use this file: attach it at the start of a new working session (with the code archive if code changes are
planned) and ask Claude to update it at the end. Keep it in the project repository.

---

## 1. Vision
A phone guide for travellers who care about history. The main screen is a map of places drawn from Wikipedia around the
user's position. Over time it becomes a platform where approved creators add their own sourced historical content, some
of it paid, and revenue is shared between the owner and the creators.

## 2. Name
- **Decided (working name):** Fadlan.
- **Open:** final name. Not yet checked: Swiss trademark register (Swissreg), EUIPO, US trademark database if the US is a
  target, both app stores, domains, social handles. Earlier rounds of ideas are in the appendix.
- The bundle ID cannot be changed after publishing; the name shown in the stores can.
- Avoid "Wiki" in the final name (looks affiliated with Wikipedia).

## 3. Product
### Core (Decided)
- Map around the user's position showing Wikipedia pages that have coordinates, with clustering and re-querying as the
  map moves.
- Three Wikipedia editions only: English, the user's language, the language of the place. The same place in several
  editions is merged into one marker through its Wikidata ID.
- Tapping a marker opens a bottom sheet with three heights: collapsed (title only), half (summary, map still visible),
  full screen (article).
- Language chips appear only for editions that exist for that place.
- The full article is fetched only when the reader scrolls or opens it, then stored for offline use.
- Wikipedia attribution (CC BY-SA) and a link to the original on every article.
### Planned (Proposed)
- Importance filtering or ranking so minor places do not flood the map.
- Download an area in advance for offline use; settings for radius and languages.
- Optional historical map layer for Switzerland (swisstopo's Siegfried and Dufour maps, 19th century) that users can switch on to compare how a place looked then with today; check current terms of use.
- Light collectibles such as "visited" stamps.

## 4. Visual design
- **Decided:** only two styles are built now: **Plain** and a generic **Fantasy** (original storybook English-countryside
  look: parchment, moss green, wood brown, serif type; no names, symbols or lettering from existing fantasy works).
- **Decided:** two independent settings, chosen in an Appearance screen: **app style** (pages, chips, buttons, fonts,
  pin colours) and **map style** (base map only). Each has an Auto option. Auto for the app style follows the user's
  region (currently Plain everywhere, because no regional styles exist yet); Auto for the map follows the app style.
- **Decided:** no decorative text in imitation scripts (no fake Greek or other lettering). Real local-language chips are fine.
- **Decided:** regional styles are not to be developed now; the architecture must be ready for them.
- **Proposed (later):** styles that change with the region, 3 or 4 per major region, based on historical art and map
  traditions, not national stereotypes; work with creators from the region for living cultures. Examples: Greek, Roman,
  Egyptian, Byzantine-Islamic manuscript; medieval manuscript, storybook, Grand Tour journal; ink-wash, woodblock print;
  Mughal miniature, temple stone and gold; Ethiopian manuscript, mud-cloth; pre-Columbian codex, Andean textile;
  wayfinding stick chart. Possibly sold as regional packs. Roughly 25 styles is a large design and testing job.
- **Proposed:** switch automatically only when the user enters a different region, with a "lock style" option; later the
  period of a site could tint the page.
- Map options: Stamen Watercolor via Stadia (artistic, but raster and limited zoom), a recoloured vector style (Maputnik),
  most of the character from the app's own paper, ribbon and pin styling. The Fantasy map is currently the Plain map with
  a warm tint (placeholder).

## 5. Technical architecture
- **Decided:** Expo (React Native) with MapLibre; Android first. Development on macOS with Android Studio. Expo Go does not
  work (native map module); a development build is needed.
- Data: Wikipedia geosearch per edition, merged by Wikidata ID; results and articles cached on the phone.
- **Content providers:** each source implements one interface (`src/providers/`). Wikipedia is live; a creator provider is
  a documented placeholder, switched by `ENABLE_CREATOR_CONTENT` (currently false).
- **Namespaced IDs:** `wd:Q...` (Wikidata place), `wp:<lang>:<title>` (Wikipedia article), `gw:<uuid>` (creator content).
  Each article carries source, access (free or premium), author, licence.
- **Entitlements:** one function decides who may read premium content (today: free only). Premium text must be protected
  on the server, not only hidden in the app.
- **Themes:** `src/theme/` (app styles, map styles, regions, saved settings, Appearance screen). Adding a style means
  adding one theme file and registering it.
- **Proposed model changes now:** add `wikidataId` and an `aliases` list to places, and `status` (draft or published) to
  articles, so a creator place can later become a Wikipedia-linked place without breaking old links.
- **Proposed backend (later):** PostgreSQL with PostGIS on a managed service (for example Supabase); logins; file storage;
  RevenueCat or similar for subscriptions; Stripe Connect or similar for creator payouts; a web dashboard for moderators.

## 6. Content and creators
- **Decided:** creators must be able to add places and articles in the app, for example by tapping the map for
  coordinates, including places not on Wikipedia, and link them to Wikipedia entries when these appear.
- **Proposed roles:** visitor; member (free account, favourites, corrections, reports); creator; verified creator (premium
  and payouts); moderator; admin. Start with structured feedback ("suggest a correction", "report") rather than open
  comment threads.
- **Proposed creator flow:** when a pin is dropped, search nearby places and ask whether it is an existing place or a new
  one; allow approximate locations for sensitive archaeological sites to reduce the risk of looting. Link to Wikidata
  through a suggested match that a creator or moderator confirms, with an alias so old IDs keep working.
- **Proposed access:** invite-only at the start, then applications with a sample entry; reviewed publishing at first.
- **Proposed moderation:** the owner reviews at the start; later paid subject experts for accuracy and part-time or
  outsourced moderators for abuse; reporting and blocking tools before creator features launch; sources required for
  factual claims, with labels such as verified, tradition or legend, disputed.
- **First creator (Decided intention):** Jonas Marti (author of books on Ticino and Lugano history, RSI presenter). Not yet
  contacted. Plan: short new entries per place, written or approved by him, with coordinates, sources and photos; he keeps
  his copyright and licenses the app. Before the approach he should check his publishing contracts (digital or derivative
  rights may belong to the publisher), RSI-produced material and permission for outside activities, and image rights. Agree
  early on licence scope and duration, credit, fee or revenue share, right to withdraw, who edits. Start with 10 to 15 places.

## 7. Business model
- **Decided:** start in Ticino; the owner has one content creator and intends to contact the Ticino tourist office.
- **Proposed context (from research, Nov 2026):** the tourist office (ATT) and the regional organisations run joint digital
  projects, one recently co-funded about 70% by the federal Innotour programme; ATT is digitising the Ticino Ticket; the
  sector reports worry about cuts; existing digital partners and apps exist, so Fadlan should complement them.
- **Proposed revenue options, most realistic first:**
  1. Paid pilot or commission from a tourism body for a curated cultural layer in one region, with grant co-funding.
  2. Grants (Innotour, Swisslos Fund, cantonal and foundation sources, university outreach): fund development, not recurring revenue.
  3. Hotels and tourism organisations buying access codes for guests.
  4. Paid routes or city packs for visitors; school and education licensing.
  5. Museums and sites: licensed or white-label guides, QR codes on site.
  6. Sponsorship or ticket commissions only if clearly labelled.
- **Competitors:** VoiceMap sells individual tours (roughly 5 to 20 USD each); izi.TRAVEL lets creators publish free and
  adds AI stories; STQRY offers a marketplace and access codes. Counts come from the companies' own claims. Differentiators
  to test: trusted, sourced, expert content; archaeology and history; text and map, not only audio; institutions as customers.
- **Proposed pricing shape:** tourists use an app for days, so day or week passes and city or route packs suit better
  than monthly subscriptions.
- **Proposed validation before building a marketplace:** launch free in a few cities; publish two or three expert tours on an
  existing platform to see whether people listen and pay; ask museums or university departments whether they would pay;
  set success and stop criteria in advance.
- **Revenue split:** open question how it is calculated. In-app purchases go through Apple and Google (commissions roughly
  15 to 30%; rules change), then payouts to creators make this a marketplace.

## 8. Legal and organisation (not legal advice; confirm with professionals)
- **Proposed sequence:** launch free under the owner's own name; set up a company when accepting creator content, taking
  money or paying contractors.
- A free app with accounts needs a privacy policy, in-app account deletion (Apple), Sign in with Apple if other social
  logins exist, minimal data collected, and a transfer clause in the terms so service and data can move to a company later.
- Do not host public user-written content as an individual; keep early accounts to private features.
- Check the owner's university contract for rules on outside activities, income and intellectual property.
- Map tiles: the free OpenStreetMap servers forbid app use; use a provider or self-host. Swisstopo data: check current terms.
- Keep Wikipedia text free and visibly separate (CC BY-SA); only original creator content is paid. Do not suggest an official
  Wikipedia app.
- Tax, VAT and creator payouts need a lawyer and an accountant.

## 9. Roadmap (Proposed)
0. Run the app on an Android phone or emulator and fix first-launch errors; replace the demo map style; set the contact in
   `USER_AGENT`.
1. Free, Wikipedia-only launch with Plain and Fantasy styles: ranking, offline areas, privacy policy, store listing,
   final name and bundle ID.
2. Ticino pilot: contact the tourist office and the first creator, 10 to 15 places, collect usage data.
3. Backend, accounts, closed creator beta with invited experts, moderation tools, company.
4. Premium content and payments; apply for grants in parallel.
5. Regional styles, more regions and languages.

## 10. Risks
- Time: the owner has a 40% university position, editorships and grants.
- Marketplace cold start and moderation workload.
- Established competitors and AI-generated guides.
- Rights and licensing, especially book material and images.
- Looting risk from precise coordinates of archaeological sites.
- Store rules and commissions that change.
- Scope creep in visual styles.

## 11. Open questions
- Final name; bundle ID.
- Which Ticino region and which places for the pilot; what the tourist office would co-fund or provide.
- Revenue split rule.
- Whether to apply the proposed model changes (section 5) now or after the first successful run.
- Languages beyond the current three-edition rule for places in multilingual countries (currently up to four editions).

## 12. Code status
- Archive: `fadlan.zip` (README inside has setup steps). Implemented: location, Wikipedia geosearch in up to four editions,
  merge by Wikidata ID, clustering, markers, bottom sheet, language chips, lazy full text, offline cache, attribution,
  provider architecture, theme system with Appearance screen.
- **Not yet run** on a device or against live Wikipedia. Data and theme files pass a TypeScript check; the screens do not.
- Placeholders: demo map style, Fantasy map is a tint, pins are circles, contact in `USER_AGENT`, bundle ID
  `org.example.fadlan`.

## Appendix: name ideas considered
WikiGuide (working title, dropped). Underfoot, Footnotes, Hereabouts, Strata, Waymark, Trowel, Nearby Past, Local Lore;
Cairn, Wayfarer's Folio, Waymeet, Old Roads, Wanderbook, Standing Stones, Ledger of Lore; Tell, Once Here, Lamplit,
Hollow Hill, Bramble, Wayside, Waymere, Tale Trail; Whither, Odysseying; Nostos, Peregrine, Periplus, Rihla, Itinerarium,
Fernweh, Yatra, Tabi. For a broad English-speaking audience, simple names that are easy to say and spell work best.

## Changelog
- 2026-11-14 (v21): web version: browser map (MapLibre GL JS, MapScreen.web.tsx), Wikipedia CORS, Nominatim reverse geocoding in the browser, GitHub Pages deployment workflow (.github/workflows/deploy.yml), app.config.js sets the Pages sub-path only for the online build.
- 2026-11-14 (v20): full photos (no cropping) with full-screen viewer; "All photos" gallery per article; new article layout (header, lead paragraph, section headings, reference sections hidden); style renamed Storybook (candidates: Folklore, Almanac, Gilded).
- 2026-11-14 (v19): article photos sent with the app's User-Agent; Wikimedia returned 403 for the phone's default one.
- 2026-11-14 (v18): logging added to photo loading (Fadlan: photo ... lines) to diagnose missing article images.
- 2026-11-14 (v17): markers now added only after the final map style has loaded; label layers use the same font as the style; 292 places had been found but not drawn.
- 2026-11-10 (v16): debug aids: on-screen place count and console logs ("Fadlan: places found") to find why markers do not show.
- 2026-11-10 (v15): map label font fix: style loaded and text-font set on every symbol layer (theme/styleFix.ts). MapLibre's default label font was the cause of the 404s.
- 2026-11-10 (v14): first device test. Map switched to free OpenFreeMap tiles (streets visible); photos taken from each article's own page; language switch on the map screen; "Style" button for the Appearance screen.
- 2026-11-05 (v13): removed the explanation of the name; clarified the historical map layer.
- 2026-11-04 (v12): clean consolidated draft; working name Fadlan; code renamed from WikiGuide to Fadlan.
- Earlier versions (v1 to v11) were incremental notes covering the architecture, themes, monetization, creators and names.
