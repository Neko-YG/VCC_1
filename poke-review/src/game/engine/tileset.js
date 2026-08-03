/**
 * 맵을 통째로 한 장의 캔버스에 미리 그린다(프리렌더).
 * 매 프레임 타일을 다시 그리지 않고, 보이는 구간만 잘라 쓰기 위해서.
 * 물결 반짝임처럼 움직이는 것만 그 위에 따로 얹는다.
 */
import { TILE, TILES, tileCharAt, sameKind } from '../world/tiles.js';
import { makeCanvas, rect, px, ellipse } from './pixel.js';
import { mix } from '../../core/color.js';
import { createRng, hashSeed } from '../../core/rng.js';

/** 4세대 필드 느낌의 팔레트 */
export const PAL = {
  grass: '#8fd07a',
  grassAlt: '#7ec468',
  grassDark: '#5fa64f',
  tall: '#4f9a44',
  tallDark: '#3d7d36',
  sand: '#e8d9a8',
  sandDark: '#cfbd85',
  path: '#dcc48f',
  pathDark: '#c2a973',
  water: '#4fa8f0',
  waterDeep: '#2f78d0',
  waterFoam: '#bfe6ff',
  tree: '#3f9a45',
  treeLight: '#5cbf5c',
  treeDark: '#256b2c',
  trunk: '#8b5a2b',
  wall: '#f2e6cf',
  wallLine: '#c9b48f',
  roof: '#d3564b',
  roofDark: '#a63f38',
  door: '#7a4a2a',
  fence: '#e9edf2',
  fenceDark: '#9aa7b4',
  floor: '#e6d3b3',
  floorLine: '#d0b892',
  indoorWall: '#7e6a55',
  mat: '#e05a5a',
  matDark: '#b33f3f',
  petal: '#ffffff',
  petalAlt: '#ffe66d',
  shadow: 'rgba(0,0,0,0.18)',
};

/** 좌표마다 고정된 난수 (같은 자리는 늘 같은 무늬) */
const at = (x, y, salt = '') => createRng(hashSeed(`${x},${y},${salt}`));

/* ── 타일별 그리기 ───────────────────────────────────── */

/**
 * 잔디 색조용 부드러운 노이즈.
 * 타일마다 색을 뽑으면 체커보드가, 3×3 블록으로 뽑으면 네모 얼룩이 보인다.
 * 격자점 난수를 이중선형 보간해 경계 없는 색조 변화를 만든다.
 */
function grassTone(gx, gy) {
  const S = 4; // 얼룩 크기(타일 수)
  const fx = gx / S;
  const fy = gy / S;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const smooth = (t) => t * t * (3 - 2 * t);
  const n = (X, Y) => at(X, Y, 'tone').next();
  const u = smooth(tx);
  const v = smooth(ty);
  const top = n(x0, y0) * (1 - u) + n(x0 + 1, y0) * u;
  const bottom = n(x0, y0 + 1) * (1 - u) + n(x0 + 1, y0 + 1) * u;
  return top * (1 - v) + bottom * v;
}

function drawGrass(ctx, x, y, gx, gy) {
  const rng = at(gx, gy, 'g');
  rect(ctx, x, y, TILE, TILE, mix(PAL.grass, PAL.grassAlt, grassTone(gx, gy)));
  // 잔디 결 — 짧은 선 두세 개
  for (let i = 0; i < 3; i++) {
    const sx = x + rng.int(1, TILE - 3);
    const sy = y + rng.int(1, TILE - 2);
    rect(ctx, sx, sy, 2, 1, PAL.grassDark);
  }
}

function drawTallGrass(ctx, x, y, gx, gy) {
  drawGrass(ctx, x, y, gx, gy);
  const rng = at(gx, gy, 't');
  rect(ctx, x, y + 6, TILE, TILE - 6, PAL.tall);
  for (let i = 0; i < 6; i++) {
    const sx = x + rng.int(0, TILE - 2);
    const h = rng.int(3, 6);
    rect(ctx, sx, y + 6 - h, 2, h, i % 2 ? PAL.tall : PAL.tallDark);
  }
  rect(ctx, x, y + TILE - 2, TILE, 2, PAL.tallDark);
}

function drawFlower(ctx, x, y, gx, gy) {
  drawGrass(ctx, x, y, gx, gy);
  const rng = at(gx, gy, 'f');
  for (let i = 0; i < 3; i++) {
    const cx = x + rng.int(2, TILE - 3);
    const cy = y + rng.int(2, TILE - 3);
    const c = rng.chance(0.5) ? PAL.petal : PAL.petalAlt;
    px(ctx, cx, cy - 1, c);
    px(ctx, cx - 1, cy, c);
    px(ctx, cx + 1, cy, c);
    px(ctx, cx, cy + 1, c);
    px(ctx, cx, cy, '#f5b942');
  }
}

/**
 * 흙길·모래처럼 "영역"으로 깔리는 타일.
 * 이웃이 같은 종류가 아니면 그쪽 가장자리를 톱니처럼 흩뜨려 잔디와 섞는다.
 */
function drawArea(ctx, x, y, gx, gy, map, kind, base, dark) {
  drawGrass(ctx, x, y, gx, gy);
  rect(ctx, x, y, TILE, TILE, base);
  const rng = at(gx, gy, kind);
  const edges = [
    ['up', 0, -1],
    ['down', 0, 1],
    ['left', -1, 0],
    ['right', 1, 0],
  ];
  for (const [dir, dx, dy] of edges) {
    if (sameKind(map, gx + dx, gy + dy, kind)) continue;
    for (let i = 0; i < TILE; i++) {
      const depth = rng.int(1, 3);
      for (let d = 0; d < depth; d++) {
        if (dir === 'up') px(ctx, x + i, y + d, PAL.grass);
        if (dir === 'down') px(ctx, x + i, y + TILE - 1 - d, PAL.grass);
        if (dir === 'left') px(ctx, x + d, y + i, PAL.grass);
        if (dir === 'right') px(ctx, x + TILE - 1 - d, y + i, PAL.grass);
      }
    }
  }
  // 자갈 알갱이
  for (let i = 0; i < 4; i++) px(ctx, x + rng.int(2, TILE - 3), y + rng.int(2, TILE - 3), dark);
}

function drawWater(ctx, x, y, gx, gy, map) {
  rect(ctx, x, y, TILE, TILE, PAL.water);
  const rng = at(gx, gy, 'w');
  // 깊은 물 얼룩
  for (let i = 0; i < 3; i++) {
    rect(ctx, x + rng.int(1, TILE - 5), y + rng.int(1, TILE - 3), rng.int(2, 4), 1, PAL.waterDeep);
  }
  // 물가: 이웃이 물이 아니면 그쪽에 거품선
  const edges = [
    [0, -1, 'up'],
    [0, 1, 'down'],
    [-1, 0, 'left'],
    [1, 0, 'right'],
  ];
  for (const [dx, dy, dir] of edges) {
    if (sameKind(map, gx + dx, gy + dy, 'water')) continue;
    if (dir === 'up') rect(ctx, x, y, TILE, 2, PAL.waterFoam);
    if (dir === 'down') rect(ctx, x, y + TILE - 2, TILE, 2, PAL.waterFoam);
    if (dir === 'left') rect(ctx, x, y, 2, TILE, PAL.waterFoam);
    if (dir === 'right') rect(ctx, x + TILE - 2, y, 2, TILE, PAL.waterFoam);
  }
}

function drawTree(ctx, x, y, gx, gy, map) {
  drawGrass(ctx, x, y, gx, gy);
  const rng = at(gx, gy, 'tr');
  const openBelow = !sameKind(map, gx, gy + 1, 'tree');
  // 줄기는 아래가 트인 나무에만 (숲 안쪽은 잎만 보이게)
  if (openBelow) {
    rect(ctx, x + 6, y + 10, 4, 6, PAL.trunk);
    rect(ctx, x + 6, y + 14, 4, 2, mix(PAL.trunk, '#000000', 0.25));
  }
  const cy = openBelow ? y + 7 : y + 8;
  ellipse(ctx, x + 8, cy, 8, 7.5, PAL.treeDark);
  ellipse(ctx, x + 8, cy - 1, 7, 6.5, PAL.tree);
  for (let i = 0; i < 5; i++) {
    ellipse(ctx, x + rng.int(3, 12), cy - rng.int(1, 5), rng.int(2, 3), 2, PAL.treeLight);
  }
}

function drawFence(ctx, x, y, gx, gy) {
  drawGrass(ctx, x, y, gx, gy);
  rect(ctx, x, y + 5, TILE, 2, PAL.fence);
  rect(ctx, x, y + 7, TILE, 1, PAL.fenceDark);
  rect(ctx, x + 2, y + 2, 3, 12, PAL.fence);
  rect(ctx, x + 3, y + 2, 1, 12, PAL.fenceDark);
  rect(ctx, x + 11, y + 2, 3, 12, PAL.fence);
  rect(ctx, x + 12, y + 2, 1, 12, PAL.fenceDark);
}

function drawWall(ctx, x, y) {
  rect(ctx, x, y, TILE, TILE, PAL.wall);
  rect(ctx, x, y, TILE, 1, PAL.wallLine);
  rect(ctx, x, y + 8, TILE, 1, PAL.wallLine);
  rect(ctx, x + 7, y, 1, 8, PAL.wallLine);
  rect(ctx, x, y + 8, 1, 8, PAL.wallLine);
}

function drawRoof(ctx, x, y, gx, gy, map) {
  rect(ctx, x, y, TILE, TILE, PAL.roof);
  for (let i = 0; i < TILE; i += 4) rect(ctx, x, y + i, TILE, 1, PAL.roofDark);
  if (!sameKind(map, gx, gy - 1, 'roof')) rect(ctx, x, y, TILE, 3, mix(PAL.roof, '#ffffff', 0.35));
  if (!sameKind(map, gx, gy + 1, 'roof')) rect(ctx, x, y + TILE - 3, TILE, 3, PAL.roofDark);
}

function drawDoor(ctx, x, y) {
  drawWall(ctx, x, y);
  rect(ctx, x + 3, y + 2, 10, 14, PAL.door);
  rect(ctx, x + 4, y + 3, 8, 12, mix(PAL.door, '#ffffff', 0.18));
  rect(ctx, x + 10, y + 9, 1, 2, '#ffd166');
}

function drawSign(ctx, x, y, gx, gy) {
  drawGrass(ctx, x, y, gx, gy);
  rect(ctx, x + 7, y + 9, 2, 6, PAL.trunk);
  rect(ctx, x + 2, y + 2, 12, 8, '#c99a5b');
  rect(ctx, x + 3, y + 3, 10, 6, '#e3bd85');
  for (let i = 0; i < 3; i++) rect(ctx, x + 4, y + 4 + i * 2, 8, 1, '#8b5a2b');
}

function drawFloor(ctx, x, y) {
  rect(ctx, x, y, TILE, TILE, PAL.floor);
  rect(ctx, x, y + TILE - 1, TILE, 1, PAL.floorLine);
  rect(ctx, x + TILE - 1, y, 1, TILE, PAL.floorLine);
}

function drawIndoorWall(ctx, x, y, gx, gy, map) {
  rect(ctx, x, y, TILE, TILE, PAL.indoorWall);
  rect(ctx, x, y, TILE, 2, mix(PAL.indoorWall, '#ffffff', 0.25));
  if (!sameKind(map, gx, gy + 1, 'indoorwall')) rect(ctx, x, y + TILE - 3, TILE, 3, mix(PAL.indoorWall, '#000000', 0.3));
}

function drawMat(ctx, x, y, gx, gy, map) {
  drawFloor(ctx, x, y);
  rect(ctx, x, y, TILE, TILE, PAL.mat);
  const edge = (dx, dy) => !sameKind(map, gx + dx, gy + dy, 'mat');
  if (edge(0, -1)) rect(ctx, x, y, TILE, 2, PAL.matDark);
  if (edge(0, 1)) rect(ctx, x, y + TILE - 2, TILE, 2, PAL.matDark);
  if (edge(-1, 0)) rect(ctx, x, y, 2, TILE, PAL.matDark);
  if (edge(1, 0)) rect(ctx, x + TILE - 2, y, 2, TILE, PAL.matDark);
}

function drawPlant(ctx, x, y) {
  drawFloor(ctx, x, y);
  rect(ctx, x + 4, y + 10, 8, 5, '#b5651d');
  rect(ctx, x + 4, y + 10, 8, 1, '#d98d4a');
  ellipse(ctx, x + 8, y + 7, 5, 5, PAL.tree);
  ellipse(ctx, x + 7, y + 6, 3, 3, PAL.treeLight);
}

const DRAW = {
  grass: drawGrass,
  tallgrass: drawTallGrass,
  flower: drawFlower,
  path: (c, x, y, gx, gy, map) => drawArea(c, x, y, gx, gy, map, 'path', PAL.path, PAL.pathDark),
  sand: (c, x, y, gx, gy, map) => drawArea(c, x, y, gx, gy, map, 'sand', PAL.sand, PAL.sandDark),
  water: drawWater,
  tree: drawTree,
  fence: drawFence,
  wall: (c, x, y) => drawWall(c, x, y),
  roof: drawRoof,
  door: (c, x, y) => drawDoor(c, x, y),
  sign: drawSign,
  floor: (c, x, y) => drawFloor(c, x, y),
  indoorwall: drawIndoorWall,
  mat: drawMat,
  plant: (c, x, y) => drawPlant(c, x, y),
};

/**
 * 맵 전체를 한 장으로 프리렌더.
 * @returns {{canvas:HTMLCanvasElement, width:number, height:number, waterTiles:[number,number][]}}
 */
export function renderMap(map) {
  const w = map.rows[0].length * TILE;
  const h = map.rows.length * TILE;
  const { canvas, ctx } = makeCanvas(w, h);
  const waterTiles = [];

  for (let gy = 0; gy < map.rows.length; gy++) {
    for (let gx = 0; gx < map.rows[gy].length; gx++) {
      const ch = tileCharAt(map, gx, gy);
      const tile = TILES[ch] || TILES['.'];
      const draw = DRAW[tile.kind] || drawGrass;
      draw(ctx, gx * TILE, gy * TILE, gx, gy, map);
      if (tile.kind === 'water') waterTiles.push([gx, gy]);
    }
  }
  return { canvas, width: w, height: h, waterTiles };
}

/** 물 반짝임 — 프리렌더 위에 매 프레임 얹는다 */
export function drawWaterSparkle(ctx, waterTiles, camera, time) {
  ctx.fillStyle = PAL.waterFoam;
  for (const [gx, gy] of waterTiles) {
    const sx = gx * TILE - camera.x;
    const sy = gy * TILE - camera.y;
    if (sx < -TILE || sy < -TILE || sx > camera.w + TILE || sy > camera.h + TILE) continue;
    const rng = at(gx, gy, 'sp');
    const phase = rng.next();
    const t = (time * 0.6 + phase) % 1;
    if (t < 0.5) {
      const ox = 3 + Math.floor(rng.next() * 9);
      const oy = 4 + Math.floor(rng.next() * 8) + (t < 0.25 ? 0 : 1);
      ctx.fillRect(sx + ox, sy + oy, 3, 1);
      ctx.fillRect(sx + ox + 1, sy + oy - 1, 1, 1);
    }
  }
}
