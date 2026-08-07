/**
 * Print sheet — a browser port of the workforce's print_sheet.py.
 *
 * Arranges card front/back pairs into a cut-tolerant, multi-up US Letter
 * layout. The gaps between cards AND the outer margin are filled with one
 * continuous, non-directional texture rather than white space: because the
 * pattern looks the same everywhere, a cut that wanders a little still leaves
 * every card looking intentionally framed. A double keyline sits just inside
 * each card's true edge as a second fallback, and tick marks outside the
 * block show where the cuts run.
 *
 * Output is a PDF of front/back page pairs: [fronts_1, backs_1, fronts_2, …],
 * so each physical sheet is self-contained. In duplex mode the back page
 * mirrors columns within each row, which aligns backs to fronts on a home
 * printer using long-edge flip.
 */

import { canvasToJpeg, jpegPagesToPdf, type JpegPage } from './pdf';

export const DPI = 300;
export const PAGE_W_IN = 8.5;
export const PAGE_H_IN = 11;
export const PAGE_W = Math.round(PAGE_W_IN * DPI);
export const PAGE_H = Math.round(PAGE_H_IN * DPI);
/** Gap between cards and around the outside — the "cut anywhere here" zone. */
export const SEAM_IN = 0.25;

const GOLD = {
  base: '#cdb58a',
  noiseLo: [196, 170, 124] as const,
  noiseHi: [216, 194, 154] as const,
  starDeep: '#9e8052',
  starPale: '#ecdec0',
  keylineDark: '#80643c',
  keylineLight: '#f5ebd6',
};

/** Deterministic RNG so a given sheet always looks the same. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function ninePointedStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  rot: number
): void {
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 18; i++) {
    const ang = rot + (Math.PI * i) / 9 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    const x = cx + rad * Math.cos(ang);
    const y = cy + rad * Math.sin(ang);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Uniform, non-directional texture — identical wherever it is cut. */
function makePattern(w: number, h: number, seed = 7): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const rand = rng(seed);

  ctx.fillStyle = GOLD.base;
  ctx.fillRect(0, 0, w, h);

  // Speckle via ImageData — far quicker than ~100k fill calls.
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  const speckles = Math.floor((w * h) / 55);
  for (let i = 0; i < speckles; i++) {
    const x = Math.floor(rand() * w);
    const y = Math.floor(rand() * h);
    const o = (y * w + x) * 4;
    const col = rand() < 0.5 ? GOLD.noiseLo : GOLD.noiseHi;
    px[o] = col[0];
    px[o + 1] = col[1];
    px[o + 2] = col[2];
  }
  ctx.putImageData(img, 0, 0);

  const stars = Math.floor((w * h) / 5200);
  for (let i = 0; i < stars; i++) {
    ninePointedStar(
      ctx,
      rand() * w,
      rand() * h,
      7 + rand() * 6,
      rand() < 0.55 ? GOLD.starDeep : GOLD.starPale,
      rand() * Math.PI
    );
  }
  return c;
}

/** Largest cols×rows of this card size that fit a Letter page with seams. */
export function autoGrid(
  cardWIn: number,
  cardHIn: number,
  seamIn = SEAM_IN
): { cols: number; rows: number } {
  const maxCount = (card: number, page: number) => {
    let n = 1;
    while ((n + 1) * card + n * seamIn + 2 * seamIn <= page) n++;
    return n;
  };
  return {
    cols: maxCount(cardWIn, PAGE_W_IN),
    rows: maxCount(cardHIn, PAGE_H_IN),
  };
}

function sheetPage(
  cards: HTMLCanvasElement[],
  cardW: number,
  cardH: number,
  cols: number,
  rows: number,
  seam: number,
  mirrorCols: boolean
): HTMLCanvasElement {
  const page = document.createElement('canvas');
  page.width = PAGE_W;
  page.height = PAGE_H;
  const ctx = page.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  const blockW = cols * cardW + (cols - 1) * seam + 2 * seam;
  const blockH = rows * cardH + (rows - 1) * seam + 2 * seam;
  const bx = Math.round((PAGE_W - blockW) / 2);
  const by = Math.round((PAGE_H - blockH) / 2);

  ctx.drawImage(makePattern(Math.round(blockW), Math.round(blockH)), bx, by);

  const n = cards.length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const srcC = mirrorCols ? cols - 1 - c : c;
      const card = cards[(r * cols + srcC) % n];
      const x = bx + seam + c * (cardW + seam);
      const y = by + seam + r * (cardH + seam);
      ctx.drawImage(card, x, y, cardW, cardH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = GOLD.keylineLight;
      ctx.strokeRect(x - 1, y - 1, cardW + 2, cardH + 2);
      ctx.strokeStyle = GOLD.keylineDark;
      ctx.strokeRect(x - 4, y - 4, cardW + 8, cardH + 8);
    }
  }

  // Cut ticks outside the block.
  ctx.strokeStyle = '#969696';
  ctx.lineWidth = 3;
  const vTick = (x: number) => {
    ctx.beginPath();
    ctx.moveTo(x, by - 40);
    ctx.lineTo(x, by - 10);
    ctx.moveTo(x, by + blockH + 10);
    ctx.lineTo(x, by + blockH + 40);
    ctx.stroke();
  };
  const hTick = (y: number) => {
    ctx.beginPath();
    ctx.moveTo(bx - 40, y);
    ctx.lineTo(bx - 10, y);
    ctx.moveTo(bx + blockW + 10, y);
    ctx.lineTo(bx + blockW + 40, y);
    ctx.stroke();
  };
  for (let c = 1; c < cols; c++) vTick(bx + seam + c * cardW + (c - 1) * seam + seam / 2);
  for (let r = 1; r < rows; r++) hTick(by + seam + r * cardH + (r - 1) * seam + seam / 2);
  vTick(bx);
  vTick(bx + blockW);
  hTick(by);
  hTick(by + blockH);

  return page;
}

export interface CardPair {
  front: HTMLCanvasElement;
  back: HTMLCanvasElement;
}

export interface SheetOptions {
  duplex?: boolean;
  /** Progress callback: 0..1 */
  onProgress?: (fraction: number) => void;
}

export async function buildPrintSheet(
  pairs: CardPair[],
  opts: SheetOptions = {}
): Promise<Blob> {
  if (!pairs.length) throw new Error('print sheet: no cards');

  const cardW = pairs[0].front.width;
  const cardH = pairs[0].front.height;
  const { cols, rows } = autoGrid(cardW / DPI, cardH / DPI);
  const seam = Math.round(SEAM_IN * DPI);
  const perPage = cols * rows;

  const jpegs: JpegPage[] = [];
  const chunks = Math.ceil(pairs.length / perPage);
  const totalPages = chunks * 2;
  let done = 0;

  for (let start = 0; start < pairs.length; start += perPage) {
    const slice = pairs.slice(start, start + perPage);
    for (const [side, mirror] of [
      ['front', false],
      ['back', !!opts.duplex],
    ] as const) {
      const faces = slice.map((p) => (side === 'front' ? p.front : p.back));
      const page = sheetPage(faces, cardW, cardH, cols, rows, seam, mirror);
      jpegs.push(await canvasToJpeg(page, 0.9));
      // free the page bitmap before building the next one
      page.width = 0;
      page.height = 0;
      done++;
      opts.onProgress?.(done / totalPages);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return jpegPagesToPdf(jpegs, DPI);
}
