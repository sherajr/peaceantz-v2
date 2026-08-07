/**
 * Minimal PDF writer: wraps one JPEG per page into a print-ready PDF.
 *
 * Full PDF libraries are ~350 KB; all this page needs is an image XObject per
 * sheet, so it is written by hand (~90 lines) and stays dependency-free.
 */

export interface JpegPage {
  data: Uint8Array;
  /** Pixel dimensions of the JPEG. */
  w: number;
  h: number;
}

const enc = new TextEncoder();

export function jpegPagesToPdf(pages: JpegPage[], dpi = 300): Blob {
  if (!pages.length) throw new Error('pdf: no pages');

  const chunks: Uint8Array[] = [];
  let length = 0;
  const offsets: number[] = [];

  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? enc.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  // Objects are numbered from 1; index 0 of `offsets` is the free entry.
  const beginObj = (n: number) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
  };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  const pageIds = pages.map((_, i) => 3 + i * 3);

  beginObj(1);
  push('<</Type/Catalog/Pages 2 0 R>>\nendobj\n');

  beginObj(2);
  push(
    `<</Type/Pages/Kids[${pageIds.map((id) => `${id} 0 R`).join(' ')}]` +
      `/Count ${pages.length}>>\nendobj\n`
  );

  pages.forEach((page, i) => {
    const pageId = pageIds[i];
    const imgId = pageId + 1;
    const contentId = pageId + 2;
    const wPt = (page.w / dpi) * 72;
    const hPt = (page.h / dpi) * 72;

    beginObj(pageId);
    push(
      `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${wPt.toFixed(2)} ${hPt.toFixed(2)}]` +
        `/Resources<</XObject<</Im0 ${imgId} 0 R>>/ProcSet[/PDF/ImageC]>>` +
        `/Contents ${contentId} 0 R>>\nendobj\n`
    );

    beginObj(imgId);
    push(
      `<</Type/XObject/Subtype/Image/Width ${page.w}/Height ${page.h}` +
        `/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode` +
        `/Length ${page.data.length}>>\nstream\n`
    );
    push(page.data);
    push('\nendstream\nendobj\n');

    const content = `q ${wPt.toFixed(2)} 0 0 ${hPt.toFixed(2)} 0 0 cm /Im0 Do Q\n`;
    beginObj(contentId);
    push(`<</Length ${content.length}>>\nstream\n${content}endstream\nendobj\n`);
  });

  const objCount = 2 + pages.length * 3;
  const xrefAt = length;
  push(`xref\n0 ${objCount + 1}\n`);
  push('0000000000 65535 f \n');
  for (let n = 1; n <= objCount; n++) {
    push(`${String(offsets[n] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<</Size ${objCount + 1}/Root 1 0 R>>\nstartxref\n${xrefAt}\n%%EOF\n`);

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

/** Canvas → JPEG bytes, off the main thread where possible. */
export async function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality = 0.88
): Promise<JpegPage> {
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas encode failed'))),
      'image/jpeg',
      quality
    );
  });
  return {
    data: new Uint8Array(await blob.arrayBuffer()),
    w: canvas.width,
    h: canvas.height,
  };
}
