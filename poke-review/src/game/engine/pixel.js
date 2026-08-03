/** 도트 그리기 유틸 — 모든 그래픽은 코드로 생성한다(외부 이미지 0개). */

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas: c, ctx };
}

/** 점 하나 */
export function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, 1, 1);
}

/** 사각형 */
export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

/** 타원(도트 느낌 유지) */
export function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y + 0.5 - cy) / ry;
    const span = Math.sqrt(Math.max(0, 1 - dy * dy)) * rx;
    const x0 = Math.round(cx - span);
    const x1 = Math.round(cx + span);
    if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, 1);
  }
}

