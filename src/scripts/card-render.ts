/**
 * Quote-card rendering — a browser port of the BahAI Workforce's
 * card_compositor.py, so a card made on the website prints like one made by
 * the workforce.
 *
 *   FRONT — the passage, always. Dark ink inside a cream panel that the
 *           artwork melts into, inside a thin double gold border, with the
 *           citation beneath a short rule.
 *   BACK  — never the passage. A reflection question, a call to action, ruled
 *           lines to write on, and a fixed share line, in the same cream
 *           panel so pen ink still reads.
 *
 * Both faces share one treatment: the artwork shows at the edges and fades
 * into a cream panel where the words live. How big that panel is, and how
 * gradually the picture fades into it, are the two controls the creator
 * exposes (`whiteSpace` and `feather`).
 *
 * Everything is expressed as a fraction of the card height, so the same code
 * draws the on-screen preview and the 300 DPI print face.
 */

import type { LanguageDef } from './languages';

export const CARD_W_IN = 3.5;
export const CARD_H_IN = 2;
export const PRINT_DPI = 300;
export const CARD_RATIO = CARD_W_IN / CARD_H_IN;

export const INK = '#2c2c34';
export const INK_SOFT = '#68604f';
export const RULE_GOLD = '#ac9054';
export const CREAM = '#faf8f1';
export const CREAM_RGB = '252, 250, 244';
export const WRITE_LINE = '#bcb4a4';
export const TINY_TEXT = '#807a6e';

/** The readable floor: 26px at 300 DPI on a 600px-tall card. */
const MIN_TEXT_FRAC = 26 / 600;
const CITATION_FRAC = 32 / 600;

export interface Reflection {
  question: string;
  action: string;
  share: string;
}

export const DEFAULT_REFLECTION: Reflection = {
  question: 'What is one way I can practice this today?',
  action: 'One small action I will try:',
  share: 'If this card speaks to you, pass it on to someone.',
};

export const PRAYER_REFLECTION: Reflection = {
  question: 'Who would I like to hold in my prayers today?',
  action: 'A name, or an intention:',
  share: 'If this prayer speaks to you, pass it on to someone.',
};

export interface CardSpec {
  text: string;
  citation: string;
  art: HTMLImageElement | null;
  reflection: Reflection;
  font: 'sans' | 'serif';
  /** Language of the card's own words, and of the passage when translated. */
  lang: LanguageDef;
  /** Set when the passage shown is a translation rather than the verified
   *  English. The renderer then prints the language's fixed disclaimer —
   *  appended in code, with no way to switch it off from the UI. */
  translated: boolean;
  /** Whether that translation came from the AI translator (a different,
   *  more specific disclaimer) or was supplied by the card maker. */
  aiTranslated: boolean;
  /** 0.3–1.6; how opaque the cream panel is over the artwork. */
  wash: number;
  /** 0–1; how much of the card the cream panel covers. 0 leaves a wide band
   *  of picture around the edges, 1 leaves only a sliver. */
  whiteSpace: number;
  /** 0–1; how gradually the picture fades into the cream. */
  feather: number;
}

function bodyFamily(spec: CardSpec): string {
  return spec.font === 'serif' ? spec.lang.fontSerif : spec.lang.fontSans;
}

function face(spec: CardSpec, px: number, weight = 500): string {
  return `${weight} ${px}px ${bodyFamily(spec)}`;
}

/** Small print (citation, share line) always uses the language's sans stack. */
function smallFace(spec: CardSpec, px: number): string {
  return `500 ${px}px ${spec.lang.fontSans}`;
}

/** Right-to-left scripts need the context flipped so bidi ordering is right. */
function applyDirection(ctx: CanvasRenderingContext2D, spec: CardSpec): void {
  ctx.direction = spec.lang.rtl ? 'rtl' : 'ltr';
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export interface Panel {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the cream panel sits for a given whiteSpace setting. */
export function panelRect(spec: CardSpec, w: number, h: number): Panel {
  const t = clamp01(spec.whiteSpace);
  const ix = w * (0.16 - 0.145 * t);
  const iy = h * (0.22 - 0.2 * t);
  return { x: ix, y: iy, w: w - 2 * ix, h: h - 2 * iy };
}

/** Cover-fit an image into w×h without distorting it. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number
): void {
  const sr = img.naturalWidth / img.naturalHeight;
  const tr = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (sr > tr) {
    sw = img.naturalHeight * tr;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / tr;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

/** Characters that must not be left stranded at the start of a line — CJK
 *  closing punctuation, per the usual kinsoku rules. */
const NO_LINE_START = /[。、，．！？；：）】》」』〉”’%·・…]/;

/** Break a run that is itself wider than the line — Chinese has no spaces, so
 *  the whole passage arrives as one "word" and must wrap per character. */
function breakLongRun(
  ctx: CanvasRenderingContext2D,
  run: string,
  maxWidth: number
): string[] {
  const out: string[] = [];
  let piece = '';
  for (const ch of run) {
    const cand = piece + ch;
    if (piece && ctx.measureText(cand).width > maxWidth) {
      // never start the next line with punctuation that cannot open one —
      // let it hang past the measured width instead
      if (NO_LINE_START.test(ch)) {
        out.push(cand);
        piece = '';
        continue;
      }
      out.push(piece);
      piece = ch;
    } else {
      piece = cand;
    }
  }
  if (piece) out.push(piece);
  return out;
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (ctx.measureText(word).width > maxWidth) {
      if (line) {
        lines.push(line);
        line = '';
      }
      const parts = breakLongRun(ctx, word, maxWidth);
      lines.push(...parts.slice(0, -1));
      line = parts[parts.length - 1] ?? '';
      continue;
    }
    const cand = line ? `${line} ${word}` : word;
    if (ctx.measureText(cand).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = cand;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawBorder(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const inset = h * 0.04;
  ctx.strokeStyle = RULE_GOLD;
  ctx.lineWidth = Math.max(1, h / 300);
  ctx.strokeRect(inset, inset, w - 2 * inset, h - 2 * inset);
  const inner = inset + h * 0.0165;
  ctx.globalAlpha = 0.47;
  ctx.lineWidth = Math.max(0.75, h / 600);
  ctx.strokeRect(inner, inner, w - 2 * inner, h - 2 * inner);
  ctx.globalAlpha = 1;
}

/**
 * Lay the cream over the artwork: barely veiled at the edges so the picture
 * still breathes, opaque over the panel where the words go, with a feathered
 * transition between the two. The blur runs in its own pass — combining a
 * canvas filter with `destination-in` is not reliable across browsers.
 */
function creamOverlay(
  ctx: CanvasRenderingContext2D,
  spec: CardSpec,
  w: number,
  h: number,
  panelAlpha: number,
  edgeAlpha: number
): void {
  const mw = Math.max(1, Math.round(w));
  const mh = Math.max(1, Math.round(h));
  const p = panelRect(spec, w, h);

  const mask = document.createElement('canvas');
  mask.width = mw;
  mask.height = mh;
  const mctx = mask.getContext('2d')!;
  mctx.fillStyle = `rgba(255,255,255,${edgeAlpha})`;
  mctx.fillRect(0, 0, mw, mh);
  mctx.fillStyle = `rgba(255,255,255,${panelAlpha})`;
  mctx.beginPath();
  mctx.roundRect(p.x, p.y, p.w, p.h, Math.min(p.h, p.w) * 0.12);
  mctx.fill();

  const blur = h * (0.012 + 0.1 * clamp01(spec.feather));
  const soft = document.createElement('canvas');
  soft.width = mw;
  soft.height = mh;
  const sctx = soft.getContext('2d')!;
  sctx.filter = `blur(${blur}px)`;
  sctx.drawImage(mask, 0, 0);

  const veil = document.createElement('canvas');
  veil.width = mw;
  veil.height = mh;
  const vctx = veil.getContext('2d')!;
  vctx.fillStyle = CREAM;
  vctx.fillRect(0, 0, mw, mh);
  vctx.globalCompositeOperation = 'destination-in';
  vctx.drawImage(soft, 0, 0);

  ctx.drawImage(veil, 0, 0);
}

function drawArtwork(
  ctx: CanvasRenderingContext2D,
  spec: CardSpec,
  w: number,
  h: number,
  blurPx: number
): boolean {
  if (!spec.art || !spec.art.complete || !spec.art.naturalWidth) {
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, w, h);
    return false;
  }
  ctx.save();
  ctx.filter = `blur(${blurPx}px)`;
  // draw oversized so the blur doesn't pull the card's edges inward
  const pad = Math.max(blurPx * 2, w / 60);
  ctx.translate(-pad, -pad);
  drawCover(ctx, spec.art, w + 2 * pad, h + 2 * pad);
  ctx.restore();
  return true;
}

interface FitResult {
  size: number;
  lines: string[];
  lineHeight: number;
  tooSmall: boolean;
}

function fitText(
  ctx: CanvasRenderingContext2D,
  spec: CardSpec,
  h: number,
  availHeight: number,
  maxWidth: number
): FitResult {
  const minPx = h * MIN_TEXT_FRAC;
  const start = h * 0.115;
  const step = Math.max(0.5, h / 300);
  for (let size = start; size >= minPx; size -= step) {
    ctx.font = face(spec, size);
    const lines = wrap(ctx, spec.text, maxWidth);
    const lineHeight = size * 1.34;
    if (lines.length * lineHeight <= availHeight) {
      return { size, lines, lineHeight, tooSmall: false };
    }
  }
  ctx.font = face(spec, minPx);
  const lines = wrap(ctx, spec.text, maxWidth);
  return { size: minPx, lines, lineHeight: minPx * 1.34, tooSmall: true };
}

/** Geometry of the front's text block, shared by rendering and fit-checking. */
function frontLayout(spec: CardSpec, w: number, h: number) {
  const p = panelRect(spec, w, h);
  const citePx = Math.max(9, h * CITATION_FRAC);
  const discPx = spec.translated ? Math.max(6, h * (17 / 600)) : 0;
  const discBaseline = p.y + p.h - p.h * 0.06;
  const citeBaseline = spec.translated
    ? discBaseline - discPx * 1.55
    : p.y + p.h - p.h * 0.1;
  const ruleY = citeBaseline - citePx * 1.5;
  const marginTop = p.y + p.h * 0.1;
  return {
    panel: p,
    citePx,
    discPx,
    discBaseline,
    citeBaseline,
    ruleY,
    marginTop,
    maxWidth: Math.min(w * 0.8, p.w * 0.86),
    availHeight: Math.max(h * 0.1, ruleY - citePx * 0.6 - marginTop),
  };
}

/** True when the passage cannot reach the readable floor on a printed card. */
export function textOverflows(spec: CardSpec, w = 1050, h = 600): boolean {
  const c = document.createElement('canvas');
  c.width = 1;
  c.height = 1;
  const ctx = c.getContext('2d')!;
  const L = frontLayout(spec, w, h);
  return fitText(ctx, spec, h, L.availHeight, L.maxWidth).tooSmall;
}

export function renderFront(
  ctx: CanvasRenderingContext2D,
  spec: CardSpec,
  w: number,
  h: number
): void {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  const hasArt = drawArtwork(ctx, spec, w, h, Math.max(3, w / 40));
  if (hasArt) {
    // `wash` sets how opaque the panel is; the edges stay lightly veiled so
    // the artwork reads as part of the card rather than a separate frame.
    const panelAlpha = Math.max(
      0.4,
      Math.min(0.96, (Math.round(140 + 58 * spec.wash) - 20) / 255)
    );
    creamOverlay(ctx, spec, w, h, panelAlpha, 0.1);
  }

  applyDirection(ctx, spec);
  const L = frontLayout(spec, w, h);
  const fit = fitText(ctx, spec, h, L.availHeight, L.maxWidth);
  const textBlock = fit.lines.length * fit.lineHeight;
  let y =
    L.marginTop +
    Math.max(0, (L.availHeight - textBlock) / 2) +
    fit.lineHeight * 0.78;

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = face(spec, fit.size);
  for (const line of fit.lines) {
    ctx.fillText(line, w / 2, y);
    y += fit.lineHeight;
  }

  ctx.strokeStyle = RULE_GOLD;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = Math.max(0.75, h / 600);
  ctx.beginPath();
  ctx.moveTo(w / 2 - w * 0.06, L.ruleY);
  ctx.lineTo(w / 2 + w * 0.06, L.ruleY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = INK_SOFT;
  let citeSize = Math.min(L.citePx, fit.size);
  ctx.font = smallFace(spec, citeSize);
  while (
    ctx.measureText(spec.citation).width > L.maxWidth &&
    citeSize > h * 0.028
  ) {
    citeSize -= Math.max(0.5, h / 600);
    ctx.font = smallFace(spec, citeSize);
  }
  ctx.fillText(spec.citation, w / 2, L.citeBaseline);

  // Code-owned and never optional: a translation the card maker supplied is
  // not an authorised rendering, and the card says so in its own language.
  if (spec.translated) {
    const line = spec.aiTranslated ? spec.lang.aiDisclaimer : spec.lang.unofficial;
    ctx.fillStyle = TINY_TEXT;
    let discSize = L.discPx;
    ctx.font = smallFace(spec, discSize);
    while (ctx.measureText(line).width > L.maxWidth && discSize > h * 0.019) {
      discSize -= Math.max(0.5, h / 600);
      ctx.font = smallFace(spec, discSize);
    }
    ctx.fillText(line, w / 2, L.discBaseline);
  }

  drawBorder(ctx, w, h);
  ctx.restore();
}

export function renderBack(
  ctx: CanvasRenderingContext2D,
  spec: CardSpec,
  w: number,
  h: number
): void {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  const hasArt = drawArtwork(ctx, spec, w, h, Math.max(1, w / 400));
  // The writing panel is always near-opaque, whatever the front's wash: pen
  // ink has to read on it.
  if (hasArt) creamOverlay(ctx, spec, w, h, 0.97, 0.12);

  applyDirection(ctx, spec);
  const p = panelRect(spec, w, h);
  const leftX = p.x + p.w * 0.06;
  const rightX = p.x + p.w - p.w * 0.06;
  const maxWidth = p.w * 0.88;
  const sharePx = Math.max(6, h * (15 / 600));
  // the writing prompt hangs off the side the script reads from
  const promptX = spec.lang.rtl ? rightX : leftX;

  // Question — shrink modestly if it wraps beyond two lines.
  let qPx = h * (26 / 600);
  let qLines: string[] = [];
  for (; qPx > h * (19 / 600); qPx -= h * (2 / 600)) {
    ctx.font = face(spec, qPx, 700);
    qLines = wrap(ctx, spec.reflection.question, maxWidth);
    if (qLines.length <= 2) break;
  }
  ctx.font = face(spec, qPx, 700);
  const qLh = qPx * 1.4;
  let y = p.y + p.h * 0.11 + qPx * 0.85;
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  for (const line of qLines) {
    ctx.fillText(line, w / 2, y);
    y += qLh;
  }

  const aPx = h * (19 / 600);
  y += p.h * 0.05;
  ctx.textAlign = spec.lang.rtl ? 'right' : 'left';
  ctx.font = face(spec, aPx);
  ctx.fillStyle = INK_SOFT;
  ctx.fillText(spec.reflection.action, promptX, y);
  y += aPx * 1.2;

  // Ruled lines, evenly spread down to the share line — both inside the panel.
  const shareY = p.y + p.h - p.h * 0.16 - sharePx;
  const writeTop = y + p.h * 0.02;
  const writeBottom = shareY - p.h * 0.08;
  const nLines = 3;
  const stepY = Math.max(1, (writeBottom - writeTop) / nLines);
  ctx.strokeStyle = WRITE_LINE;
  ctx.lineWidth = Math.max(0.75, h / 600);
  for (let i = 1; i <= nLines; i++) {
    const ly = writeTop + i * stepY;
    ctx.beginPath();
    ctx.moveTo(leftX, ly);
    ctx.lineTo(rightX, ly);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = TINY_TEXT;
  ctx.font = smallFace(spec, sharePx);
  ctx.fillText(spec.reflection.share, w / 2, shareY + sharePx);

  drawBorder(ctx, w, h);
  ctx.restore();
}

/** Render one face to its own canvas at an explicit pixel size. */
export function renderFace(
  spec: CardSpec,
  side: 'front' | 'back',
  w: number,
  h: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  const ctx = canvas.getContext('2d')!;
  if (side === 'front') renderFront(ctx, spec, canvas.width, canvas.height);
  else renderBack(ctx, spec, canvas.width, canvas.height);
  return canvas;
}
