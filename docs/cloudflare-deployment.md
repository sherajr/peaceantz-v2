# Deploying peaceantz.com to Cloudflare

## What we already know about your setup

Checked 2026-08-06, all read-only:

| Fact | Value |
|---|---|
| Zone | **peaceantz.com is already a Cloudflare zone** — no registrar or nameserver change needed |
| `www.peaceantz.com` | HTTP 200, `Server: cloudflare` — the legacy site behind the Cloudflare proxy |
| `peaceantz.com` (apex) | HTTP 301 → `www` (an existing redirect rule, served by the previous host) |
| Build | `wrangler deploy --dry-run` passes: 89 assets, bindings `ASSETS` + `AI` |

> **This repo is public, so the live DNS records are not kept here.** They were
> captured before launch and live in `docs/local/infrastructure.md`, which is
> gitignored. That file also holds the exact **rollback record** — the `www`
> entry this cutover replaces — so read it before step 5.

Because the zone is already on Cloudflare, the cutover is not a DNS migration.
It is a single change: pointing one hostname at the Worker instead of at
Google Sites.

## The safe order

Steps 1–3 **cannot affect the live site**. The live site only changes at
step 6, and only when you choose.

### 1 · Log in

```bash
cd C:\Users\Sheraj\Documents\peaceantz-v2
npx wrangler login
```

Opens a browser to authorise Wrangler against your Cloudflare account. If you
have more than one account it will ask which.

On first deploy Cloudflare asks you to pick a **workers.dev subdomain** for the
account (e.g. `sheraj.workers.dev`). Take it — it is free, one-time, and it is
what gives you a preview URL that cannot touch peaceantz.com. After launch you
can turn the workers.dev route off (Worker → Settings → Domains & Routes →
`workers.dev` → Disable) so the site is not reachable at two addresses.

### 2 · Deploy to a private URL (no impact on peaceantz.com)

```bash
npm run deploy
```

This builds and deploys, then prints a URL like
`https://peaceantz.<your-subdomain>.workers.dev`. The live site is untouched —
nothing points at this Worker yet.

### 3 · Review it properly

Open that URL and check the real thing: the scrollytelling homepage, the Quote
Card Creator (make a card, download the PNGs, download a print sheet PDF and
actually print one page), and every content page. Try it on your phone too.

**Also confirm the two server-side pieces**, which only exist once deployed:

- **Translator** — pick a non-English language on `/create`, press *Translate
  with AI*. Confirm the Workers AI binding is live and the text comes back in
  the right script. (Settings → Bindings should list `AI`.)
- **Contact form** — until you add the mail settings below it honestly reports
  "not connected yet". To switch it on:
  ```bash
  npx wrangler secret put RESEND_API_KEY     # from resend.com, free tier is fine
  ```
  and set `CONTACT_EMAIL_TO` in the `vars` block of `wrangler.jsonc`, then
  redeploy. Send yourself a test.

### 4 · Optional but recommended: a real-domain staging address

Review on the actual domain, with real TLS, without touching the live site:

- Cloudflare dashboard → **Workers & Pages** → `peaceantz` → **Settings** →
  **Domains & Routes** → **Add** → **Custom domain**
- Enter `new.peaceantz.com`

This creates a brand-new DNS record and disturbs nothing existing. Delete it
after launch.

### 5 · Before cutover — back out the old site safely

Do these while the old site is still live:

- [ ] **Record the current DNS record for `www`.** Dashboard → DNS → Records.
      Screenshot it, or note the type/name/target/proxy status. This is your
      rollback: if anything goes wrong you recreate exactly that record.
- [ ] **Export the Google Site.** In Google Sites, keep the site but unpublish
      it later rather than deleting it — and take a copy of any images you
      still want (I only recovered 9 of 15 at low resolution; the rest were
      access-protected).
- [ ] Note the existing **apex → www redirect rule** (Rules → Redirect Rules,
      or Page Rules) so you know what is producing the 301.

### 6 · Cut over

- Dashboard → **Workers & Pages** → `peaceantz` → **Settings** → **Domains &
  Routes** → **Add** → **Custom domain** → `www.peaceantz.com`

> ⚠️ **This is the moment the public site changes.** Adding a custom domain
> *replaces* the existing `www` DNS record, so Google Sites stops serving
> immediately. It takes effect in seconds, not hours.

Then decide the apex. Right now `peaceantz.com` resolves to an `A` record at a
**third-party host** left over from an earlier setup, and that host issues the
redirect to www — so today your apex depends on someone else still answering.
(The exact record is in `docs/local/infrastructure.md`.) Two options:

- **Simplest:** leave it. It works, and www is where every existing link goes.
- **Cleaner (recommended once you are happy):** delete that legacy `A` record
  and replace the redirect with a Cloudflare **Redirect Rule**
  (Rules → Redirect Rules: `peaceantz.com/*` → `https://www.peaceantz.com/$1`,
  301). That removes the third-party dependency entirely. Do this *after*
  cutover, not during, so you are only changing one thing at a time.

Do **not** simply attach both `www` and the apex as custom domains without a
redirect — the site would then answer on two addresses with identical content,
which splits search ranking.

### 7 · After cutover

- [ ] Check `https://www.peaceantz.com` and `https://peaceantz.com`
- [ ] Check the legacy paths still land somewhere sensible — `/home`,
      `/what-are-peace-antz`, `/dao`, `/dao/services`, `/free-consultation`
      (handled by `public/_redirects`)
- [ ] Unpublish (don't delete) the Google Site
- [ ] Update the link in your Discord, Linktree and social bios

**Rollback:** delete the custom domain from the Worker, then recreate the DNS
record you recorded in step 5. Back on Google Sites in about a minute.

## Redeploying later

```bash
npm run deploy
```

Same command every time. It rebuilds and pushes; the custom domain stays
attached.

## Costs

- Workers free plan covers 100k requests/day — far beyond what this site needs.
- **Workers AI** (the card translator) has a daily free allocation and then
  bills per neuron. It is the only piece with variable cost. To disable it
  entirely, delete the `ai` block from `wrangler.jsonc` and redeploy — the
  creator then falls back to letting people paste their own translations.
- Resend's free tier covers contact-form volume.

## What still needs a human before launch

- A native speaker reading a printed card in each non-English language
  (the workforce's rule 9 — machine-translated scripture is exactly where it
  matters).
- Your canonical Discord invite, so the Community page can link it.
- Higher-resolution versions of the 3D-printing portfolio photos, if you want
  them sharper than the recovered low-res copies.
