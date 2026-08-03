/**
 * 타일 정의 — 맵의 문자 1개 = 타일 1칸.
 * 새 타일을 만들려면 여기에 한 줄 추가하고 engine/tileset.js 에 그리는 법을 적으면 된다.
 */

export const TILE = 16; // 타일 한 칸의 픽셀 크기

/**
 * kind : 그리는 방식 (tileset.js 가 참조)
 * solid: 통과 불가
 * tag  : 상호작용/이벤트 훅 ('sign', 'door', 'grass' 등)
 */
export const TILES = {
  '.': { name: '잔디', kind: 'grass', solid: false },
  ',': { name: '풀숲', kind: 'tallgrass', solid: false, tag: 'tallgrass' },
  '*': { name: '꽃밭', kind: 'flower', solid: false },
  '=': { name: '흙길', kind: 'path', solid: false },
  ':': { name: '모래', kind: 'sand', solid: false },
  '~': { name: '물', kind: 'water', solid: true },
  '#': { name: '나무', kind: 'tree', solid: true },
  F: { name: '울타리', kind: 'fence', solid: true },
  W: { name: '벽', kind: 'wall', solid: true },
  R: { name: '지붕', kind: 'roof', solid: true },
  D: { name: '문', kind: 'door', solid: false, tag: 'door' },
  S: { name: '표지판', kind: 'sign', solid: true, tag: 'sign' },
  _: { name: '실내 바닥', kind: 'floor', solid: false },
  '-': { name: '실내 벽', kind: 'indoorwall', solid: true },
  '+': { name: '매트', kind: 'mat', solid: false },
  o: { name: '화분', kind: 'plant', solid: true },
};

export const DEFAULT_TILE = TILES['.'];

export function tileAt(map, x, y) {
  if (y < 0 || y >= map.rows.length) return null;
  const row = map.rows[y];
  if (x < 0 || x >= row.length) return null;
  return TILES[row[x]] || DEFAULT_TILE;
}

export function tileCharAt(map, x, y) {
  if (y < 0 || y >= map.rows.length) return null;
  return map.rows[y][x] ?? null;
}

/** 같은 종류의 타일인지 (가장자리 처리에 쓴다) */
export function sameKind(map, x, y, kind) {
  const t = tileAt(map, x, y);
  return !!t && t.kind === kind;
}

export function isSolid(map, x, y) {
  const t = tileAt(map, x, y);
  return !t || t.solid;
}
