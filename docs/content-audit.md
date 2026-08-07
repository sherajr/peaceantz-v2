# Peace Antz — Legacy Site Content Audit

Audited: 2026-08-05 · Source: https://www.peaceantz.com (Google Sites)
Every page of the live site was inventoried. This document records what exists,
its condition, and its disposition for the new site.

## Site map (as-is)

| Page | Path | Condition |
|---|---|---|
| Home | `/home` | Complete; DAO-first identity copy |
| DAO | `/dao` | Near-empty hub page (heading + Discord button) |
| Constitution | `/dao/constitution` | Complete, substantial document |
| Academy | `/dao/academy` | Near-empty; one sentence + external link |
| Validator | `/dao/validator` | Complete but stale (stats dated 7/11/23) |
| Media | `/dao/media` | Empty placeholder headings only |
| Design | `/dao/design` | Complete; 3D printing portfolio (13 items) |
| Services | `/dao/services` | Complete; 6 priced services, email-only ordering |
| What are Peace Antz? | `/what-are-peace-antz` | Complete identity/story page |
| Free Consultation | `/free-consultation` | Minimal; embedded Google Form |

External properties linked from the site:

- peaceantzacademy.com — renders as an empty shell (title only); effectively abandoned
- linktr.ee/peaceantz · github.com/Peace-Antz · medium.com/@peaceantz
- Socials: Twitter/X, YouTube, Discord, Instagram, Facebook
- OpenSea: "Peace Antz Validator DROPZ" NFT collection
- Twitter: @RecoveryValidat (Harmony Recovery Validator)

## Detailed inventory and disposition

### Identity & copy

| Item | Where | Disposition |
|---|---|---|
| Name "Peace Antz", ant-colony metaphor | Site-wide | **Preserve.** Core brand; the colony/collective-intelligence metaphor survives the pivot and pairs naturally with unity themes. |
| Slogan "Be Kind. Be Relentless." | Home, Constitution Art. I §3 | **Preserve** (recommend keeping; compatible with the new direction — kindness + perseverance). Final call is the owner's. |
| "peace, love, and grit" values line | Home, Constitution preamble | **Rewrite.** Fold into the new principles framing rather than as a standalone motto. |
| DAO-first self-description ("more than just a DAO…") | Home, What are Peace Antz? | **Rewrite.** New identity leads with mission and principles; DAO becomes background/vision (interview: Web3 = background infrastructure, DAO being redesigned). |
| Story copy ("vibrant community… Art and Technology") | What are Peace Antz? | **Rewrite** into the new About/Story page; keep the spirit, update the framing. |

### DAO Constitution (`/dao/constitution`)

Full governance document: ANTZ token on Polygon
(`0xc5A2237B0f4bB6A2E15FF0299eE49ac5c9acc1c0`), three treasuries, Gnosis
multisig, Snapshot/Colony/DAOHaus voting, ant-colony roles (Worker, Nurse,
Forager, Scout, Artisan, Soldier, Queen), elections every Bitcoin halving,
6–13-day votes, reputation-token reward scale (1 ANTZ = "a warm virtual hug"
… 1,000,000 ANTZ = leading a major initiative), justice system via moderated
debate.

**Disposition: Archive verbatim + summarize.** The DAO is being redesigned, so
this is the primary source material for the redesign and genuine organizational
history. Keep the full text accessible as an archived document (v1,
date-stamped, clearly marked superseded); write a short honest summary in the
new Vision section. Do **not** present token/roles/voting as live membership
mechanics.

### Services (`/dao/services`)

| Service | Old pricing | Interview status | Disposition |
|---|---|---|---|
| DApp Development | $500–$2,000 | Retired | **Remove.** No service framing anywhere. |
| Web3 Consulting | $100–$500 | Retired | **Remove.** |
| On-Demand 3D Printing | $10–$60 by size | Paused (equipment idle) | **Roadmap.** No storefront; portfolio → Past Work. |
| Video/Drone Services | $100–$500 | Paused | **Roadmap.** |
| Podcasts (guesting/launch help) | — | Aspirational | **Roadmap** under future media. |
| Performances (jams, mixing/mastering) | — | Aspirational | **Roadmap.** |

Nothing on the old Services page is currently fulfillable → the new site has
**no Services section at launch**. Pricing tables are removed (not archived
publicly — stale prices imply availability).

### Design / 3D printing portfolio (`/dao/design`)

13 portfolio items (air-pump nozzle, door latch, fridge handle mount, drawer
guides, lithophanes, hardware-wallet trick container, soap holder,
self-watering pot, throwing knife, printed logo, extrusion lever, mask WIP).

**Disposition: Preserve images → Past Work.** Strong proof of maker capability
and the best illustration of "useful local production." Images must be manually
exported from Google Sites (see migration tasks). "Order a Print!" CTA is
removed.

### Validator (`/dao/validator`)

Findora validator (active since block #2,724,775, 96.11% uptime, 1,637 blocks;
stats as of 7/11/23) and Harmony Community DAO "Recovery Validator" (8.06M ONE,
56 delegators, 99.59% uptime; originally created by Matthew Barrett).

**Disposition: Past Work.** Interview: both retired; the Findora network itself
shut down in 2024, so those links are dead. Retell as a short story of real
infrastructure the community ran (the Recovery Validator — helping a
community-recovery effort — is the values-relevant part). Remove all stats
tables, staking CTAs, and dead links. DROPZ OpenSea link may accompany the
story as an artifact.

### Media (`/dao/media`)

Headings only: "pODCASTS", "Drone Around", "Beach Jamz", "Reviews", "Music".
No episodes, embeds, or copy. **Disposition: Remove.** Interview confirms
mostly aspirational. Media relaunch is a roadmap item; do not build an empty
section. (Any real videos on the YouTube channel can be linked from Past Work
or Community if worth it — verify channel contents during build.)

### Academy (`/dao/academy` + peaceantzacademy.com)

One sentence ("Join our Discord and let us know what topics your would like
covered!" — note typo) linking to an external site that is an empty shell.
**Disposition: Roadmap.** Peace Antz Academy stays part of the vision
(capacity-building fits the new direction) but gets no page until content
exists. Decide later whether the external domain redirects to the new site's
roadmap entry.

### Free Consultation (`/free-consultation`)

Minimal page with a Google Form. **Disposition: Consolidate → Contact.** The
new site gets one contact/inquiry form (Cloudflare-native, not Google Forms).
"Free consultation" framing is dropped — it implied active consulting services.

### Links, CTAs, and hygiene issues found

- **Two different Discord invites** in the wild: `discord.gg/beFycZz6SN`
  (site-wide) and `discord.gg/aynxyzqtn5` (Academy page). Verify which is
  valid; use exactly one everywhere.
- Dead/dying links: findorascan.io, findora.smartstake.io (network defunct);
  peaceantzacademy.com (shell).
- Every page's only CTA is Discord — new site replaces this with "Try the
  Quote Card Creator" as primary CTA (interview decision).
- Social links (X, YouTube, Instagram, Facebook, Medium, GitHub, Linktree):
  verify each is alive and represents the new direction before carrying over.
- Google Sites artifacts ("Report abuse", Google branding) disappear with the
  platform move.
- Bahá'í identity appears **nowhere** on the old site — all principles-forward
  content is net-new writing, not migration.

## Disposition summary

- **Preserve:** name, slogan, colony metaphor, 3D print portfolio images,
  Discord community link (one canonical invite), verified social links.
- **Rewrite:** mission/identity copy, story ("What are Peace Antz?" → About),
  values framing (principles-forward, Bahá'í-inspired named in About).
- **Archive:** Constitution v1 (full text, marked superseded), validator story,
  service history.
- **Consolidate:** 6 DAO subpages → one Vision page + archive; Free
  Consultation → Contact.
- **Remove:** Web3 dev/consulting offerings, all pricing tables, stale staking
  stats, dead Findora links, empty Media headings, Google Form.
- **Postpone (roadmap):** 3D printing service, drone/video, podcasts/media
  section, Academy, DAO v2 mechanics, member marketplace.
