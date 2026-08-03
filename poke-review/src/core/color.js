/** 색 계산 유틸 — SVG·캔버스 어디서나 같은 규칙을 쓰도록 한곳에 모은다. */

/** #rrggbb 밝기 조절 (+밝게 / -어둡게) */
export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, v + amount));
  return `#${((1 << 24) | (ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1)}`;
}

/** 두 색 사이 보간 (t=0 → a, t=1 → b) */
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const lerp = (s, e) => Math.round(s + (e - s) * t);
  const r = lerp((pa >> 16) & 255, (pb >> 16) & 255);
  const g = lerp((pa >> 8) & 255, (pb >> 8) & 255);
  const bl = lerp(pa & 255, pb & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}
