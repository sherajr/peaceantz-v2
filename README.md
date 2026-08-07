# Peace Antz — peaceantz.com v2

The new Peace Antz website: a God-first creative community inspired by Bahá’í
principles and open to all. Replaces the legacy Google Sites site (which stays
live and untouched until this one is approved for launch).

**Centerpiece:** the Quote Card Creator (`/create`) — a fully client-side tool
that makes two-sided, print-ready cards from a verbatim library of the Bahá’í
writings and prayers, and lays them out on a cut-out print sheet. Derived from
the [BahAI Workforce](../bahAI-workforce) project (which remains local-only and
is **not** deployed with this site).

## The Quote Card Creator

A browser port of the workforce's card pipeline, so a card made on the website
prints like one made by the workforce.

- **Two faces.** `src/scripts/card-render.ts` ports `card_compositor.py`:
  the FRONT carries the passage over artwork blurred into a pale wash inside a
  double gold border, with the citation in a fixed zone at the foot; the BACK
  never carries the passage — it holds a reflection question, a writing
  prompt, three ruled lines, and a fixed share line, with the artwork showing
  through around a feathered cream panel. Both render at 300 DPI (1050×600 =
  3.5″×2″).
- **Print sheet.** `src/scripts/print-sheet.ts` ports `print_sheet.py`: a 2×4
  US Letter grid with the seams and outer margin filled by one continuous
  nine-pointed-star texture, so a cut that wanders still looks deliberate.
  Double keylines, crop ticks, front page then back page per sheet, optional
  duplex column-mirroring for long-edge flip. `src/scripts/pdf.ts` is a ~90
  line PDF writer (one JPEG XObject per page) — no PDF library needed.
- **Library.** 678 passages in `public/data/library.json`, filterable by
  collection (All / Writings / Prayers / **Ruhi Book 1** / Featured), by theme,
  and by free-text search:
  - 574 quotes across 22 themes from the 7-text corpus
  - 63 passages from **Ruhi Institute Book 1**, carried over from the
    workforce's hand-verified transcription with the book's own citations —
    these bypass the automatic scorer and win any overlap with the corpus
  - 40 complete prayers across 18 topics from the Bahá’í Prayers compilation
  - 21 hand-curated passages marked *featured*

  Fetched on demand (147 KB raw / 39 KB gzipped), not inlined.
- **Languages.** English, Spanish, Tagalog, Chinese, Arabic, Persian
  (`src/scripts/languages.ts`). Arabic and Persian render right-to-left and
  Chinese wraps per character, since it has no spaces. What each language
  changes is deliberately split, following the workforce's honesty contract in
  `translator.py`:
  - the card's **own words** — reflection question, writing prompt, share line
    — are Peace Antz's text and are provided in every language
  - the **passage** can be translated two ways: by the AI translator
    (`POST /api/translate`, Cloudflare Workers AI) or by pasting an authorised
    rendering. Either way the card prints a fixed disclaimer beneath the
    citation — `aiDisclaimer` for a machine translation
    (“人工智能辅助翻译 · 非官方译本”, “ترجمة بمساعدة الذكاء الاصطناعي · غير رسمية”…),
    the plainer `unofficial` line for a hand-supplied one. Both are appended
    by the renderer in code; there is no switch to remove them, and editing an
    AI translation downgrades it to `unofficial` automatically.

  Translation quality is guarded the way the workforce guards it — never by
  trusting the model to comply. The Worker checks the reply actually contains
  the target script (and isn’t just the English echoed back) and fails loudly
  rather than returning something plausible-looking; the client re-checks
  before it will use the result.

  Spanish wordings and the es/zh/ar AI disclaimers came from the workforce
  (human-written, render-verified); the rest are drafted and flagged
  `reviewed: false`, which surfaces a “not yet checked by a native speaker”
  note in the UI.
- **Artwork.** 16 backgrounds in `public/images/art/` (thumbnails load up
  front at 61 KB; full images only when picked), selected from artwork the
  workforce generated. Visitors can also **upload their own photo** — it is
  read locally, downscaled to 1600px, and never leaves the browser.
- **Background controls.** Both faces share one treatment: the artwork shows
  at the edges and fades into a cream panel where the words live. Three
  sliders shape that picture→cream transition —
  **how much picture shows** (panel size), **edge softness** (the feather, from
  a crisp panel edge to a long dissolve), and **cream opacity** (the
  workforce's `wash` knob). The front's text auto-fits the panel, so shrinking
  the cream area shrinks the type rather than spilling it over the picture.

### Rebuilding the library

```bash
python scripts/fetch-prayers.py scripts/prayers-raw.json   # polite crawl, ~4 min
python scripts/build-library.py <workforce>/texts scripts/prayers-raw.json 560
```

`scripts/ruhi-book1.json` is exported from the workforce's
`agents/ruhi_book1_source.py` (edition 4.1.2.PE) and `scripts/prayers-raw.json`
is the archived crawl, so the library rebuilds without hitting the network
again.

`build-library.py` only emits VERBATIM contiguous runs of whole sentences —
nothing paraphrased or stitched across gaps — and scores passages for
card-worthiness, dropping fragments that open mid-argument, cross-references,
personal correspondence, and passages of rebuke (wrong instrument for a
giveaway card). Prayers are included only when they fit a card **whole**;
obligatory prayers are excluded entirely. The 21 hand-curated passages used
elsewhere on the site are marked `featured` and always present.

## Stack

- [Astro 5](https://astro.build) static build — no framework runtime, fonts
  self-hosted via Fontsource, zero external requests at runtime
- **Three.js WebGL scrollytelling homepage** (`src/scripts/globe-scene.ts`) —
  scroll position drives a procedural dot-matrix Earth, connection arcs,
  crawling ants, and orbiting quote cards
- One Cloudflare Worker (`worker/index.ts`) for `POST /api/contact`
  (Resend email + honeypot); everything else is static assets
- Deployable to Cloudflare Workers static hosting (`wrangler.jsonc`) or any
  static host (`dist/` is plain files; `public/_redirects` covers legacy URLs)

## The homepage scene

`src/pages/index.astro` is six full-height chapters layered over one fixed
`<canvas>`. Scroll progress (measured across the story element, not the whole
document) drives camera distance, globe placement, and the reveal of arcs and
cards; the HTML chapters crossfade independently based on their distance from
the viewport centre.

Everything in the scene is **procedural** — the Earth's continents come from
approximate lat/lon blobs in `LAND_BLOBS`, and the ant sprite is drawn to a
2D canvas at runtime. No external textures, so the page stays self-contained
and CSP-safe. The only loaded images are the real quote cards that orbit as
satellites.

Three.js is ~130 KB gzipped, so it is **dynamically imported** — the homepage
ships 1.2 KB of script up front and only fetches the scene chunk for visitors
who will actually see it. Visitors with `prefers-reduced-motion`, or without
working WebGL, get a static gradient backdrop and the same readable content
(`.no-gl`). All copy is real HTML, so the page is fully accessible and
indexable with the canvas removed.

To tune the choreography, edit the keyframe tracks in the `frame()` loop of
`globe-scene.ts` — each is a list of `[scrollProgress, value]` stops.

## Commands

```bash
npm install
npm run dev       # local dev on :4321
npm run build     # static build -> dist/
npm run preview   # serve the built site
npm run deploy    # build + wrangler deploy (needs `npx wrangler login` once)
```

## Content lives in

| Path | What |
|---|---|
| `src/data/quotes.json` | The 21 hand-curated passages used by the homepage and Principles page |
| `public/data/library.json` | The creator's full library (617 passages) — built by `scripts/build-library.py` |
| `src/data/artwork.json` | Background artwork manifest (id + description) |
| `src/data/constitution-v1.txt` | Archived DAO Constitution v1 (verbatim) |
| `src/pages/` | All pages; copy edits happen right in the page files |
| `src/scripts/globe-scene.ts` | The WebGL homepage scene (geometry, materials, scroll choreography) |
| `public/images/past-work/` | Low-res legacy portfolio (from old Google Site) |
| `public/images/cards/` | Real card/bookmark renders from the BahAI Workforce |

## Docs

- [docs/content-audit.md](docs/content-audit.md) — full audit of the old site
  and what was preserved/rewritten/archived/removed
- [docs/site-strategy.md](docs/site-strategy.md) — IA, classification system,
  MVP scope, interview findings
- [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md) — deploy
  architecture + the owner's manual checklist (accounts, secrets, domain
  cutover)

## Deliberately not here yet

Discord/social links (pending canonical invite confirmation), media/podcast
section, Academy, any service ordering, DAO tooling. All tracked on `/vision`
and in the strategy doc — nothing inactive is presented as available.
