/**
 * contract-signature-layout.ts
 * SSOT for the contract's client-signature field geometry.
 *
 * Coordinates are in PDF points on an A4 page, TOP-LEFT origin.
 * Verified empirically (2026-06-03): @react-pdf/renderer v4 positions
 * `position:"absolute"` elements relative to the PAGE EDGE — there is NO
 * padding offset (delta measured = 0). pdfkit's content stream is top-down,
 * so a box styled {top, left} renders at exactly that offset from the page's
 * top-left corner. PowerDoc EOT areas use the SAME convention (percent of page,
 * top-left origin), so the % conversion below is a direct ratio.
 *
 * Consumers (keep in sync):
 *  - src/lib/contract-pdf.tsx     → draws the visible "sign here" box at these points
 *  - src/lib/powerdoc.ts          → converts to % for the EOT areas array
 *  - ~/.claude/scripts/powerdoc.js (eot-send) → MIRRORS the % values for isolated tests
 */

export const A4 = { width: 595.28, height: 841.89 } as const;

export interface FieldBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Client signature target — bottom-right region of the last page. */
export const SIGNATURE_FIELD: FieldBox = { top: 700, left: 315, width: 215, height: 60 };

/** Client signing date — bottom-left, auto-stamped by PowerDoc (#today#). */
export const SIGNATURE_DATE_FIELD: FieldBox = { top: 715, left: 60, width: 150, height: 24 };

export interface PowerDocPosition {
  width: number;
  height: number;
  top: number;
  left: number;
}

/** Convert a PDF-points FieldBox (top-left origin) to PowerDoc percent position. */
export function toPowerDocPct(box: FieldBox): PowerDocPosition {
  return {
    left: +((box.left / A4.width) * 100).toFixed(4),
    top: +((box.top / A4.height) * 100).toFixed(4),
    width: +((box.width / A4.width) * 100).toFixed(4),
    height: +((box.height / A4.height) * 100).toFixed(4),
  };
}
