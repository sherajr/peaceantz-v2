// @ts-check
import { defineConfig } from 'astro/config';

// Static-first build. Deploys to Cloudflare Workers static assets (or any
// static host). The only server-side piece is worker/index.ts (contact form),
// which Wrangler layers on top of the built assets.
export default defineConfig({
  site: 'https://peaceantz.com',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
});
