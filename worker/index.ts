/**
 * Cloudflare Worker serving the static site (via the assets binding) and
 * handling POST /api/contact. Email delivery activates when CONTACT_EMAIL_TO
 * and RESEND_API_KEY are configured; until then the endpoint returns an
 * honest "not connected" response so the form can say so.
 */
export interface Env {
  ASSETS: { fetch: typeof fetch };
  CONTACT_EMAIL_TO?: string;
  RESEND_API_KEY?: string;
  /** Workers AI binding — powers /api/translate. Optional: without it the
   *  creator falls back to letting people paste a translation themselves. */
  AI?: { run: (model: string, input: unknown) => Promise<unknown> };
  TRANSLATE_MODEL?: string;
}

const TRANSLATE_LANGS: Record<string, { name: string; script?: RegExp }> = {
  es: { name: 'Spanish' },
  tl: { name: 'Tagalog' },
  zh: { name: 'Simplified Chinese', script: /[一-鿿]/ },
  ar: { name: 'Arabic', script: /[؀-ۿ]/ },
  fa: { name: 'Persian (Farsi)', script: /[؀-ۿ]/ },
};

const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // The apex is canonical. www stays attached so old links keep working, but
    // it redirects rather than serving the same site at two addresses.
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === '/api/contact' && request.method === 'POST') {
      return handleContact(request, env);
    }
    if (url.pathname === '/api/translate' && request.method === 'POST') {
      return handleTranslate(request, env);
    }
    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found' }, 404);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request: Request, env: Env): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Invalid form submission.' }, 400);
  }

  // honeypot field: bots fill it, humans never see it
  if (String(form.get('website') || '').trim() !== '') {
    return json({ ok: true }, 200);
  }

  const name = String(form.get('name') || '').trim().slice(0, 100);
  const email = String(form.get('email') || '').trim().slice(0, 200);
  const message = String(form.get('message') || '').trim().slice(0, 4000);
  if (!name || !email || !message || !email.includes('@')) {
    return json({ error: 'Please fill in every field.' }, 400);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_EMAIL_TO) {
    return json(
      { error: 'The message service isn’t connected yet. Please check back soon.' },
      503
    );
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Peace Antz Website <onboarding@resend.dev>',
      to: [env.CONTACT_EMAIL_TO],
      reply_to: email,
      subject: `Website message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    }),
  });

  if (!res.ok) {
    return json({ error: 'Sending failed on our side — please try again later.' }, 502);
  }
  return json({ ok: true }, 200);
}

/**
 * Translate a passage for the Quote Card Creator.
 *
 * The result is explicitly NOT an authorised rendering — the card prints a
 * fixed "AI-assisted · unofficial" line in the target language, appended by
 * the renderer in code. This endpoint's own job is narrower: return a faithful
 * translation or an honest failure, never a plausible-looking non-translation.
 */
async function handleTranslate(request: Request, env: Env): Promise<Response> {
  if (!env.AI) {
    return json(
      { error: 'The translator is not enabled on this deployment.' },
      503
    );
  }

  let body: { text?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const text = String(body.text ?? '').trim();
  const lang = String(body.lang ?? '');
  const target = TRANSLATE_LANGS[lang];
  if (!target) return json({ error: 'Unsupported language.' }, 400);
  if (text.length < 2 || text.length > 1200) {
    return json({ error: 'Passage is too short or too long to translate.' }, 400);
  }

  const system =
    `You are a careful translator of sacred literature into ${target.name}. ` +
    'Translate the passage faithfully and completely, preserving its meaning, ' +
    'register and dignity. Keep it reverent and plain rather than ornate. ' +
    'Do not summarise, expand, explain, transliterate, or add commentary, ' +
    'quotation marks, or notes. Reply with the translation and nothing else.';

  let out: string;
  try {
    const res = (await env.AI.run(env.TRANSLATE_MODEL || DEFAULT_MODEL, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      max_tokens: 900,
      temperature: 0.2,
    })) as { response?: string };
    out = String(res?.response ?? '').trim();
  } catch {
    return json({ error: 'The translator is unavailable right now.' }, 502);
  }

  // Strip anything the model wrapped around the translation.
  out = out.replace(/^["'“”«»\s]+|["'“”«»\s]+$/g, '').trim();
  const firstLine = out.split(/\n{2,}/)[0].trim();
  if (firstLine) out = firstLine;

  if (!out) {
    return json({ error: 'The translator returned nothing.' }, 502);
  }
  // Deterministic check that it actually translated — the same discipline the
  // workforce applies: never trust model compliance for honesty-critical work.
  if (target.script && !target.script.test(out)) {
    return json(
      { error: 'The translator did not return text in that script. Please try again.' },
      502
    );
  }
  if (!target.script && out.toLowerCase() === text.toLowerCase()) {
    return json({ error: 'The translator returned the original text.' }, 502);
  }

  return json({ translation: out, model: env.TRANSLATE_MODEL || DEFAULT_MODEL }, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
