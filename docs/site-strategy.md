# Peace Antz v2 — Site Strategy

Based on the legacy-site audit (`content-audit.md`) and the discovery interview
of 2026-08-05.

## What the interview established

| Question | Answer |
|---|---|
| 3D printing | Paused (equipment idle) → roadmap; portfolio → Past Work |
| Drone/video | Paused → roadmap |
| Podcasts/media/performances | Mostly aspirational → roadmap; no content to migrate |
| DApp dev & Web3 consulting | Retired entirely |
| DAO infrastructure | Being redesigned → presented as vision, not live mechanics |
| Web3 visibility | Background infrastructure; mission leads |
| Validators (Findora, Harmony) | Both retired → Past Work |
| Operator | Single steward ("just me for now") — honest voice, invites others |
| Launch focus (1–3) | **Quote Card Creator** + **Community pathway** |
| Bahá'í identity | **Principles-forward**: attributed quotes lead; Bahá'í framing explained on About; welcoming to all, not presented as a religious organization |
| Quote Card Creator status | Working app exists — needs integration (location TBD from owner) |
| Primary CTA | **Try the Quote Card Creator**; community join is the follow-up ask |

Implication that shapes everything: **nothing is currently purchasable.** The
new site is not a storefront. It is an identity + one genuinely usable tool +
a doorway into community, with history and vision honestly labeled.

## Classification system (final terminology)

The brief's draft taxonomy (Active Services / Community Projects / Experiments
/ Past Work / Future Possibilities) assumed active services exist. They don't.
Recommended terminology for the new site:

1. **Create** — things a visitor can actually use now. At launch: the Quote
   Card Creator. (Category label only appears in nav as the tool itself.)
2. **Community** — how to join, participate, and eventually offer skills.
3. **Our Story** — who Peace Antz is, the Bahá'í-inspired direction, and
   **Past Work** (validator era, 3D print portfolio, DAO v1) told as history.
4. **Vision** — the honest roadmap: DAO redesign, Academy, media relaunch,
   revival of maker services (3D printing, drone/video), member marketplace.

Rules: no "Services" label anywhere until a service is genuinely fulfillable;
nothing inactive is presented as available; every Vision item is dated/framed
as "not yet operating."

## Information architecture

```
/            Home — animated; mission in one screen; principles strip;
             primary CTA → Quote Card Creator; secondary → Community
/create      Quote Card Creator (integrated app)
/about       Our Story — identity, principles-forward Bahá'í framing,
             single-steward honesty, colony metaphor
/about/past-work    History: validators, 3D print portfolio, DAO v1 summary
/principles  Curated principles & attributed quotations (feeds the
             Quote Card Creator; shareable)
/community   Participation pathway — Discord, ways to contribute,
             invitation to offer skills (marketplace = future)
/vision      Roadmap: DAO v2, Academy, media, maker services revival
/contact     Single inquiry/collaboration form
/archive/constitution-v1   Full DAO Constitution v1, marked superseded
```

Nav (6 items max): Home · Create · Principles · Community · Our Story · Vision.
Contact lives in the footer + Community page. The 14-item structure from the
brief collapses: About+Principles absorb "Principles"; Community absorbs "Get
Involved"; Vision absorbs "DAO and Governance", "Academy", "Podcasts/Media";
"Updates" is postponed until there is a cadence to sustain it.

## Minimum viable launch

**In scope:**

- Animated homepage communicating the God-first, Bahá'í-inspired identity
  (principles-forward tone; no heavy religious labeling)
- Quote Card Creator integrated at `/create` (existing app; needs repo/URL
  from owner)
- Principles & quotations page (net-new content, attributed)
- Community pathway page with one canonical Discord invite
- Our Story + Past Work (rewritten from "What are Peace Antz?" + audit
  material; portfolio images exported from Google Sites)
- Vision/roadmap page (DAO redesign summary lives here)
- Contact form (Cloudflare-compatible; no Google Forms)
- Constitution v1 archive page
- Markdown-based content system so all copy/quotes/roadmap items are editable
  without touching components

**Explicitly postponed:** media/podcast section, Academy, any service
ordering/pricing, DAO tooling (token, voting, treasury UI), member
marketplace, updates/blog.

## Technical architecture (Cloudflare-ready, lock-in-light)

- **Astro + content collections** (markdown/JSON) — static-first, fast,
  animation-friendly (View Transitions + islands), builds to plain assets
  deployable to Cloudflare Pages/Workers or any static host. No vendor
  lock-in in the frontend.
- **Three.js WebGL scrollytelling homepage** (owner request, 2026-08-05,
  referencing a Riotters "Exploring Earth" Dribbble shot): six scroll-driven
  chapters over a fixed canvas holding a procedural dot-matrix Earth,
  connection arcs, crawling ants, and orbiting quote cards. Dynamically
  imported (~130 KB gz) so it only loads for visitors who will see it;
  reduced-motion and no-WebGL visitors get a static backdrop with identical
  content. Content pages stay light and readable — the immersive treatment is
  deliberately confined to the homepage.
- **Quote Card Creator — decision made during build:** the "working app"
  (`C:\Users\Sheraj\Documents\bahAI-workforce`) turned out to be a local-first
  multi-agent Python system (FastAPI + Ollama + ChromaDB + personal Secretary
  with private credentials) that cannot and should not be publicly deployed.
  Per the original brief ("derived from the BahAI Workforce project"), the
  site instead ships a **public, fully client-side Quote Card Creator**:
  canvas rendering in the browser, a curated quote library extracted verbatim
  from the workforce's verified text corpus (21 quotes, attributed + linked
  to reference.bahai.org), three formats (card / square / bookmark), six
  styles, PNG download. The workforce system itself stays local and is
  showcased on Past Work with real card renders.
- **Static vs. server split:**
  - Static: every page including the entire Quote Card Creator.
  - Server (Cloudflare Worker): contact-form handler only (honeypot spam
    trap; Resend for delivery; Turnstile can be added later). AI features,
    auth, storage, scheduled jobs: none required for MVP.
- Deployment details and the owner's manual checklist: `cloudflare-deployment.md`.

## Migration & build task split

**Automatable (agents can do):** all copy rewriting, IA build, styling/
animation, content collections, constitution archival (text already captured),
contact form code, roadmap content, principles library structure.

**Owner must provide/do:** Quote Card Creator repo or URL; export portfolio
images from Google Sites (or grant access); confirm canonical Discord invite;
verify which social accounts are still active; select/approve the quotations;
approve slogan retention; Cloudflare account + domain steps at deploy time
(see checklist). The live Google Site remains untouched until replacement
approval.
