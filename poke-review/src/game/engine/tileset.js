/**
 * 타일 렌더러 — 4세대(DPPt/HGSS) 필드의 "문법"을 코드로 재현한다.
 * (닌텐도 리소스는 쓰지 않는다. 아래 도트는 전부 여기서 생성한다.)
 *
 * 그 시절 필드가 그렇게 보이는 이유는 크게 셋이다.
 *  1) 오토타일: 흙길·모래·물은 이웃을 보고 가장자리와 모서리를 다르게 그린다.
 *     그래서 영역이 '네모'가 아니라 둥근 덩어리로 보인다.
 *  2) 겹치는 캐노피: 나무는 타일 경계를 넘어 그려져 숲이 하나의 덩어리가 된다.
 *  3) 세 톤 셰이딩: 바탕 / 밝은 면 / 어두운 면 + 어두운 외곽선.
 *
 * 맵은 통째로 미리 그려 두고(프리렌더) 보이는 부분만 잘라 쓴다.
 * 물결은 3프레임을 각각 프리렌더해 번갈아 보여준다.
 */
import { TILE, TILES, tileCharAt, sameKind } from '../world/tiles.js';
import { makeCanvas, rect, px, ellipse } from './pixel.js';
import { mix, shade } from '../../core/color.js';
import { createRng, hashSeed } from '../../core/rng.js';

export const WATER_FRAMES = 3;
export const WATER_FPS = 3.5;

/** 4세대 필드 팔레트 */
export const PAL = {
  grass: '#7ec850',
  grassAlt: '#6fbb46',
  grassLight: '#9ada63',
  grassDark: '#57a038',
  grassLine: '#4c9130',

  tall: '#4f9e3a',
  tallDark: '#357326',
  tallLight: '#6cbb4c',

  soil: '#d8b878',
  soilLight: '#e8d0a0',
  soilDark: '#b08850',
  soilEdge: '#9a7040',

  sand: '#f0e0b0',
  sandLight: '#fff0d0',
  sandDark: '#d0b880',

  water: '#58a8f0',
  waterDeep: '#3878d0',
  waterLight: '#88c8f8',
  waterFoam: '#e8f8ff',

  tree: '#3c9a3c',
  treeLight: '#68c85a',
  treeHi: '#98e078',
  treeDark: '#237a2c',
  treeLine: '#14501c',
  trunk: '#8b5e34',
  trunkDark: '#5e3d20',

  roof: '#d05048',
  roofLight: '#f07068',
  roofDark: '#983030',
  roofLine: '#6a1f1f',
  centerRoof: '#f08830',
  centerRoofLight: '#ffb060',
  centerRoofDark: '#b85818',
  martRoof: '#3888d8',
  martRoofLight: '#68b0f0',
  martRoofDark: '#205898',
  gymRoof: '#8090a8',
  gymRoofLight: '#b0c0d0',
  gymRoofDark: '#586880',
  wall: '#f8ecd0',
  wallDark: '#d8c0a0',
  wallLine: '#a08868',
  window: '#78c8f0',
  windowDark: '#3888c0',
  door: '#8b5e34',
  doorDark: '#5e3d20',

  fence: '#f0f0f0',
  fenceDark: '#a0a8b0',
  fenceLine: '#606870',

  floor: '#e8d0a8',
  floorLine: '#d0b088',
  floorEdge: '#b89060',
  indoorWall: '#8878a0',
  indoorWallLight: '#a898c0',
  indoorWallDark: '#584868',
  mat: '#e05858',
  matLight: '#f08080',
  matDark: '#a03030',

  rock: '#a89888',
  rockLight: '#c8b8a8',
  rockDark: '#786858',

  petal: '#ffffff',
  petalWarm: '#ffe870',
  petalPink: '#ff9ab0',
  outline: '#2a2820',
};

/** 좌표마다 고정된 난수 (같은 자리는 늘 같은 무늬) */
const at = (x, y, salt = '') => createRng(hashSeed(`${x},${y},${salt}`));

/* ── 지형 바탕 ──────────────────────────────────────── */

/**
 * 잔디 색조용 부드러운 노이즈.
 * 타일마다 색을 뽑으면 체커보드가, 블록으로 뽑으면 네모 얼룩이 보인다.
 * 격자점 난수를 이중선형 보간해 경계 없는 색조 변화를 만든다.
 */
function grassTone(gx, gy) {
  const S = 5;
  const fx = gx / S;
  const fy = gy / S;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const smooth = (t) => t * t * (3 - 2 * t);
  const n = (X, Y) => at(X, Y, 'tone').next();
  const u = smooth(fx - x0);
  const v = smooth(fy - y0);
  const top = n(x0, y0) * (1 - u) + n(x0 + 1, y0) * u;
  const bottom = n(x0, y0 + 1) * (1 - u) + n(x0 + 1, y0 + 1) * u;
  return top * (1 - v) + bottom * v;
}

function drawGrass(ctx, x, y, gx, gy) {
  const rng = at(gx, gy, 'g');
  rect(ctx, x, y, TILE, TILE, mix(PAL.grass, PAL.grassAlt, grassTone(gx, gy)));
  // 잔디 결: 짧은 밝은 선 + 어두운 선 (4세대 잔디의 자잘한 텍스처)
  for (let i = 0; i < 2; i++) {
    px(ctx, x + rng.int(1, TILE - 2), y + rng.int(1, TILE - 2), PAL.grassLight);
  }
  for (let i = 0; i < 3; i++) {
    const sx = x + rng.int(1, TILE - 4);
    const sy = y + rng.int(1, TILE - 2);
    rect(ctx, sx, sy, 2, 1, PAL.grassLine);
    px(ctx, sx + 2, sy + 1, PAL.grassDark);
  }
}

/* ── 오토타일 ───────────────────────────────────────── */

/** 8방향 이웃이 같은 종류인지 */
function mask(map, gx, gy, kind) {
  const s = (dx, dy) => sameKind(map, gx + dx, gy + dy, kind);
  return {
    n: s(0, -1), s: s(0, 1), w: s(-1, 0), e: s(1, 0),
    nw: s(-1, -1), ne: s(1, -1), sw: s(-1, 1), se: s(1, 1),
  };
}

/**
 * 영역 타일(흙길·모래·물)의 가장자리.
 * 바깥 모서리는 깎아내고, 안쪽 모서리는 채워서 둥근 덩어리처럼 보이게 한다.
 * @param cut  가장자리 바깥을 무엇으로 덮을지 (보통 잔디)
 */
function autoEdge(ctx, x, y, m, { rim, cut, t = 2, corner = 3 }) {
  // 바깥 모서리 깎기 — 두 변이 모두 열려 있으면 그 귀퉁이를 잘라낸다
  const carve = (cx, cy) => rect(ctx, cx, cy, corner, corner, cut);
  if (!m.n && !m.w) carve(x, y);
  if (!m.n && !m.e) carve(x + TILE - corner, y);
  if (!m.s && !m.w) carve(x, y + TILE - corner);
  if (!m.s && !m.e) carve(x + TILE - corner, y + TILE - corner);

  // 변 테두리
  if (!m.n) rect(ctx, x + (m.w ? 0 : corner), y, TILE - (m.w ? 0 : corner) - (m.e ? 0 : corner), t, rim);
  if (!m.s) rect(ctx, x + (m.w ? 0 : corner), y + TILE - t, TILE - (m.w ? 0 : corner) - (m.e ? 0 : corner), t, rim);
  if (!m.w) rect(ctx, x, y + (m.n ? 0 : corner), t, TILE - (m.n ? 0 : corner) - (m.s ? 0 : corner), rim);
  if (!m.e) rect(ctx, x + TILE - t, y + (m.n ? 0 : corner), t, TILE - (m.n ? 0 : corner) - (m.s ? 0 : corner), rim);

  // 바깥 모서리의 대각선 테두리
  const diag = (cx, cy, sx, sy) => {
    for (let i = 0; i < corner; i++) {
      rect(ctx, cx + sx * i, cy + sy * (corner - 1 - i), 1, t, rim);
    }
  };
  if (!m.n && !m.w) diag(x, y, 1, 1);
  if (!m.n && !m.e) diag(x + TILE - 1, y, -1, 1);
  if (!m.s && !m.w) diag(x, y + TILE - t, 1, -1);
  if (!m.s && !m.e) diag(x + TILE - 1, y + TILE - t, -1, -1);

  // 안쪽 모서리 — 두 변은 같은데 대각선만 다르면 그 귀퉁이에 테두리 점
  if (m.n && m.w && !m.nw) rect(ctx, x, y, t, t, rim);
  if (m.n && m.e && !m.ne) rect(ctx, x + TILE - t, y, t, t, rim);
  if (m.s && m.w && !m.sw) rect(ctx, x, y + TILE - t, t, t, rim);
  if (m.s && m.e && !m.se) rect(ctx, x + TILE - t, y + TILE - t, t, t, rim);
}

function drawSoil(ctx, x, y, gx, gy, map) {
  drawGrass(ctx, x, y, gx, gy);
  const m = mask(map, gx, gy, 'path');
  rect(ctx, x, y, TILE, TILE, PAL.soil);
  const rng = at(gx, gy, 'soil');
  // 흙 알갱이
  for (let i = 0; i < 5; i++) px(ctx, x + rng.int(2, TILE - 3), y + rng.int(2, TILE - 3), rng.chance(0.5) ? PAL.soilLight : PAL.soilDark);
  autoEdge(ctx, x, y, m, { rim: PAL.soilEdge, cut: mix(PAL.grass, PAL.grassAlt, grassTone(gx, gy)) });
}

function drawSand(ctx, x, y, gx, gy, map) {
  drawGrass(ctx, x, y, gx, gy);
  const m = mask(map, gx, gy, 'sand');
  rect(ctx, x, y, TILE, TILE, PAL.sand);
  const rng = at(gx, gy, 'sand');
  for (let i = 0; i < 4; i++) px(ctx, x + rng.int(2, TILE - 3), y + rng.int(2, TILE - 3), rng.chance(0.5) ? PAL.sandLight : PAL.sandDark);
  autoEdge(ctx, x, y, m, { rim: PAL.sandDark, cut: mix(PAL.grass, PAL.grassAlt, grassTone(gx, gy)) });
}

/** 물 — 프레임마다 물결 위치가 달라진다 */
function drawWater(ctx, x, y, gx, gy, map, frame = 0) {
  const m = mask(map, gx, gy, 'water');
  rect(ctx, x, y, TILE, TILE, PAL.water);
  const rng = at(gx, gy, 'w');
  // 깊은 물 얼룩
  for (let i = 0; i < 2; i++) {
    rect(ctx, x + rng.int(1, TILE - 6), y + rng.int(1, TILE - 2), rng.int(3, 5), 1, PAL.waterDeep);
  }
  // 물결 — 프레임마다 한 칸씩 흐른다
  const wx = (rng.int(0, TILE - 1) + frame * 3) % TILE;
  const wy = (rng.int(0, TILE - 1) + frame * 2) % TILE;
  rect(ctx, x + wx, y + wy, 3, 1, PAL.waterLight);
  px(ctx, x + ((wx + 3) % TILE), y + wy - 1, PAL.waterLight);
  if (rng.chance(0.5)) rect(ctx, x + ((wx + 6) % TILE), y + ((wy + 5) % TILE), 2, 1, PAL.waterFoam);

  // 물가: 얕은 물 띠 + 거품선
  const shallow = mix(PAL.water, PAL.waterFoam, 0.45);
  autoEdge(ctx, x, y, m, { rim: shallow, cut: shallow, t: 3, corner: 3 });
  const foamShift = frame % 2;
  if (!m.n) rect(ctx, x + 2 + foamShift, y, TILE - 4, 1, PAL.waterFoam);
  if (!m.s) rect(ctx, x + 2 - foamShift, y + TILE - 1, TILE - 4, 1, PAL.waterFoam);
  if (!m.w) rect(ctx, x, y + 2 + foamShift, 1, TILE - 4, PAL.waterFoam);
  if (!m.e) rect(ctx, x + TILE - 1, y + 2 - foamShift, 1, TILE - 4, PAL.waterFoam);
}

/** 풀숲 — 뒤쪽 절반(캐릭터 뒤에 그려지는 부분) */
function drawTallGrassBack(ctx, x, y, gx, gy) {
  drawGrass(ctx, x, y, gx, gy);
  const rng = at(gx, gy, 't');
  rect(ctx, x, y + 5, TILE, TILE - 5, PAL.tall);
  rect(ctx, x, y + TILE - 2, TILE, 2, PAL.tallDark);
  for (let i = 0; i < 5; i++) {
    const sx = x + rng.int(0, TILE - 3);
    const h = rng.int(3, 6);
    rect(ctx, sx, y + 5 - h, 2, h, PAL.tall);
    px(ctx, sx, y + 5 - h, PAL.tallLight);
  }
}

/** 풀숲 — 앞쪽 잎(캐릭터 위에 덮여 '풀에 들어간' 느낌을 만든다) */
export function drawTallGrassFront(ctx, x, y, gx, gy, sway = 0) {
  const rng = at(gx, gy, 'tf');
  for (let i = 0; i < 6; i++) {
    const sx = x + rng.int(0, TILE - 3) + (i % 2 ? sway : -sway);
    const h = rng.int(4, 7);
    rect(ctx, sx, y + TILE - h, 2, h, i % 2 ? PAL.tall : PAL.tallDark);
    px(ctx, sx, y + TILE - h, PAL.tallLight);
  }
}

function drawFlower(ctx, x, y, gx, gy) {
  drawGrass(ctx, x, y, gx, gy);
  const rng = at(gx, gy, 'f');
  const colors = [PAL.petal, PAL.petalWarm, PAL.petalPink];
  for (let i = 0; i < 3; i++) {
    const cx = x + rng.int(2, TILE - 3);
    const cy = y + rng.int(2, TILE - 3);
    const c = rng.pick(colors);
    px(ctx, cx, cy - 1, c);
    px(ctx, cx - 1, cy, c);
    px(ctx, cx + 1, cy, c);
    px(ctx, cx, cy + 1, c);
    px(ctx, cx, cy, '#f5b942');
    px(ctx, cx, cy + 2, PAL.grassDark);
  }
}

/* ── 실내 ───────────────────────────────────────────── */

function drawFloor(ctx, x, y, gx, gy) {
  rect(ctx, x, y, TILE, TILE, PAL.floor);
  rect(ctx, x, y + TILE - 1, TILE, 1, PAL.floorLine);
  rect(ctx, x + TILE - 1, y, 1, TILE, PAL.floorLine);
  const rng = at(gx, gy, 'fl');
  for (let i = 0; i < 2; i++) px(ctx, x + rng.int(2, TILE - 3), y + rng.int(2, TILE - 3), PAL.floorEdge);
}

function drawIndoorWall(ctx, x, y, gx, gy, map) {
  rect(ctx, x, y, TILE, TILE, PAL.indoorWall);
  // 벽면 타일 무늬
  rect(ctx, x, y, TILE, 1, PAL.indoorWallLight);
  rect(ctx, x, y + 7, TILE, 1, PAL.indoorWallDark);
  rect(ctx, x + 7, y, 1, 7, PAL.indoorWallDark);
  rect(ctx, x, y + 8, 1, 8, PAL.indoorWallDark);
  // 바닥과 만나는 면에 굽도리
  if (!sameKind(map, gx, gy + 1, 'indoorwall')) {
    rect(ctx, x, y + TILE - 4, TILE, 3, PAL.indoorWallDark);
    rect(ctx, x, y + TILE - 4, TILE, 1, PAL.outline);
  }
}

function drawMat(ctx, x, y, gx, gy, map) {
  drawFloor(ctx, x, y, gx, gy);
  const m = mask(map, gx, gy, 'mat');
  rect(ctx, x, y, TILE, TILE, PAL.mat);
  const rng = at(gx, gy, 'mt');
  for (let i = 0; i < 3; i++) px(ctx, x + rng.int(2, TILE - 3), y + rng.int(2, TILE - 3), PAL.matLight);
  autoEdge(ctx, x, y, m, { rim: PAL.matDark, cut: PAL.floor, t: 2, corner: 2 });
}

/* ── 오브젝트 (타일 경계를 넘어 그려도 되는 것들) ───── */

function drawTreeCanopy(ctx, x, y, gx, gy, pass) {
  const rng = at(gx, gy, 'tr');
  const cx = x + 8;
  const cy = y + 6 + rng.int(-1, 1);
  if (pass === 'outline') {
    ellipse(ctx, cx, cy, 9.5, 8.5, PAL.treeLine);
  } else if (pass === 'body') {
    ellipse(ctx, cx, cy, 8.5, 7.5, PAL.treeDark);
    ellipse(ctx, cx, cy - 1, 7.5, 6.5, PAL.tree);
  } else {
    // 잎 덩어리 하이라이트 — 뭉친 느낌을 주는 핵심
    for (let i = 0; i < 4; i++) {
      ellipse(ctx, cx + rng.int(-5, 4), cy - rng.int(0, 5), rng.int(2, 4), rng.int(2, 3), PAL.treeLight);
    }
    for (let i = 0; i < 2; i++) {
      ellipse(ctx, cx + rng.int(-4, 2), cy - rng.int(2, 6), 2, 1.5, PAL.treeHi);
    }
  }
}

function drawTrunk(ctx, x, y) {
  rect(ctx, x + 6, y + 11, 4, 5, PAL.trunk);
  rect(ctx, x + 6, y + 11, 1, 5, PAL.trunkDark);
  rect(ctx, x + 6, y + 15, 4, 1, PAL.outline);
}

function drawBush(ctx, x, y, gx, gy) {
  const rng = at(gx, gy, 'bs');
  ellipse(ctx, x + 8, y + 10, 7, 5.5, PAL.treeLine);
  ellipse(ctx, x + 8, y + 9.5, 6, 4.5, PAL.treeDark);
  ellipse(ctx, x + 8, y + 9, 5, 3.5, PAL.tree);
  for (let i = 0; i < 3; i++) ellipse(ctx, x + rng.int(4, 11), y + rng.int(6, 10), 2, 1.5, PAL.treeLight);
}

function drawRock(ctx, x, y) {
  ellipse(ctx, x + 8, y + 11, 6.5, 4.5, PAL.outline);
  ellipse(ctx, x + 8, y + 10, 5.5, 4, PAL.rock);
  ellipse(ctx, x + 6, y + 9, 3, 2, PAL.rockLight);
  ellipse(ctx, x + 10, y + 12, 3, 1.5, PAL.rockDark);
}

function drawFence(ctx, x, y, gx, gy, map) {
  const railY = y + 6;
  rect(ctx, x, railY, TILE, 2, PAL.fence);
  rect(ctx, x, railY + 2, TILE, 1, PAL.fenceDark);
  rect(ctx, x, railY + 3, TILE, 1, PAL.fenceLine);
  // 기둥은 두 칸마다 (연속 울타리가 촘촘해 보이지 않게)
  if ((gx + gy) % 2 === 0 || !sameKind(map, gx + 1, gy, 'fence')) {
    rect(ctx, x + 6, y + 2, 4, 13, PAL.fence);
    rect(ctx, x + 9, y + 2, 1, 13, PAL.fenceDark);
    rect(ctx, x + 6, y + 14, 4, 1, PAL.fenceLine);
  }
}

function drawSign(ctx, x, y) {
  rect(ctx, x + 7, y + 10, 2, 5, PAL.trunkDark);
  rect(ctx, x + 2, y + 2, 12, 9, PAL.outline);
  rect(ctx, x + 3, y + 3, 10, 7, PAL.trunk);
  rect(ctx, x + 3, y + 3, 10, 1, mix(PAL.trunk, '#ffffff', 0.35));
  for (let i = 0; i < 3; i++) rect(ctx, x + 4, y + 5 + i * 2, 8, 1, PAL.trunkDark);
}

/* ── 건물 ───────────────────────────────────────────── */

const ROOF_STYLE = {
  roof: { base: PAL.roof, light: PAL.roofLight, dark: PAL.roofDark, trim: null, symbol: null },
  roofCenter: { base: PAL.centerRoof, light: PAL.centerRoofLight, dark: PAL.centerRoofDark, trim: '#f8f8f8', symbol: 'ball' },
  roofMart: { base: PAL.martRoof, light: PAL.martRoofLight, dark: PAL.martRoofDark, trim: '#f8f8f8', symbol: null },
  roofGym: { base: PAL.gymRoof, light: PAL.gymRoofLight, dark: PAL.gymRoofDark, trim: null, symbol: 'badge' },
};

/**
 * 지붕. 종류마다 색과 장식이 다르다.
 * 용마루(위)·처마(아래)·박공(좌우)을 이웃 여부로 그려야 건물처럼 보인다.
 */
function drawRoofKind(ctx, x, y, gx, gy, map, kind) {
  const st = ROOF_STYLE[kind] || ROOF_STYLE.roof;
  const m = mask(map, gx, gy, kind);
  rect(ctx, x, y, TILE, TILE, st.base);
  for (let i = 0; i < TILE; i += 4) {
    rect(ctx, x, y + i, TILE, 1, st.dark);
    rect(ctx, x, y + i + 1, TILE, 1, mix(st.base, st.light, 0.5));
  }
  if (!m.n) {
    rect(ctx, x, y, TILE, 2, st.light);
    rect(ctx, x, y + 2, TILE, 1, st.dark);
    rect(ctx, x, y, TILE, 1, PAL.outline);
  }
  if (!m.s) {
    rect(ctx, x, y + TILE - 4, TILE, 3, st.dark);
    rect(ctx, x, y + TILE - 1, TILE, 1, PAL.outline);
  }
  if (!m.w) {
    rect(ctx, x, y, 1, TILE, PAL.outline);
    rect(ctx, x + 1, y, 1, TILE, st.trim || st.dark);
    if (st.trim) rect(ctx, x + 2, y, 1, TILE, st.trim);
  }
  if (!m.e) {
    rect(ctx, x + TILE - 1, y, 1, TILE, PAL.outline);
    rect(ctx, x + TILE - 2, y, 1, TILE, st.trim || st.dark);
    if (st.trim) rect(ctx, x + TILE - 3, y, 1, TILE, st.trim);
  }
  // 건물 심볼 — 지붕 가운데 한 칸에만
  if (st.symbol && !m.n && m.s) {
    const cx = x + TILE / 2;
    const cy = y + TILE / 2 + 2;
    if (st.symbol === 'ball' && gx % 6 === 2) {
      ellipse(ctx, cx, cy, 5, 5, PAL.outline);
      ellipse(ctx, cx, cy, 4, 4, '#f8f8f8');
      rect(ctx, x + 3, y + Math.round(TILE / 2), 11, 1, PAL.outline);
      ellipse(ctx, cx, cy - 2.5, 3.6, 2.4, '#e04030');
      ellipse(ctx, cx, cy, 1.6, 1.6, PAL.outline);
      ellipse(ctx, cx, cy, 0.9, 0.9, '#f8f8f8');
    }
    if (st.symbol === 'badge' && gx % 9 === 4) {
      ellipse(ctx, cx, cy, 5, 5, PAL.outline);
      ellipse(ctx, cx, cy, 4, 4, '#ffd166');
      ellipse(ctx, cx, cy, 2, 2, '#f0f4f8');
    }
  }
}

function drawRoof(ctx, x, y, gx, gy, map) {
  drawRoofKind(ctx, x, y, gx, gy, map, 'roof');
}

function drawWallBase(ctx, x, y, gx, gy, map) {
  rect(ctx, x, y, TILE, TILE, PAL.wall);
  // 벽돌 줄눈
  rect(ctx, x, y + 7, TILE, 1, PAL.wallDark);
  rect(ctx, x, y + 15, TILE, 1, PAL.wallDark);
  rect(ctx, x + 7, y, 1, 7, PAL.wallDark);
  rect(ctx, x, y + 8, 1, 7, PAL.wallDark);
  if (!sameKind(map, gx - 1, gy, 'wall') && !sameKind(map, gx - 1, gy, 'window') && !sameKind(map, gx - 1, gy, 'door')) {
    rect(ctx, x, y, 1, TILE, PAL.wallLine);
  }
  if (!sameKind(map, gx + 1, gy, 'wall') && !sameKind(map, gx + 1, gy, 'window') && !sameKind(map, gx + 1, gy, 'door')) {
    rect(ctx, x + TILE - 1, y, 1, TILE, PAL.wallLine);
  }
  if (!sameKind(map, gx, gy + 1, 'wall')) rect(ctx, x, y + TILE - 1, TILE, 1, PAL.outline);
}

function drawWindow(ctx, x, y, gx, gy, map) {
  drawWallBase(ctx, x, y, gx, gy, map);
  rect(ctx, x + 2, y + 3, 12, 9, PAL.outline);
  rect(ctx, x + 3, y + 4, 10, 7, PAL.window);
  rect(ctx, x + 3, y + 4, 10, 2, mix(PAL.window, '#ffffff', 0.55));
  rect(ctx, x + 3, y + 9, 10, 2, PAL.windowDark);
  rect(ctx, x + 7, y + 4, 1, 7, PAL.outline);
}

function drawDoor(ctx, x, y, gx, gy, map) {
  drawWallBase(ctx, x, y, gx, gy, map);
  rect(ctx, x + 2, y + 1, 12, 15, PAL.outline);
  rect(ctx, x + 3, y + 2, 10, 14, PAL.door);
  rect(ctx, x + 4, y + 3, 8, 12, mix(PAL.door, '#ffffff', 0.22));
  rect(ctx, x + 4, y + 3, 8, 1, mix(PAL.door, '#ffffff', 0.5));
  rect(ctx, x + 8, y + 2, 1, 14, PAL.doorDark);
  px(ctx, x + 6, y + 9, '#ffd166');
  px(ctx, x + 10, y + 9, '#ffd166');
}

/** 센터 카운터 */
function drawCounter(ctx, x, y, gx, gy, map) {
  drawFloor(ctx, x, y, gx, gy);
  rect(ctx, x, y + 2, TILE, 12, '#e8c890');
  rect(ctx, x, y + 2, TILE, 2, '#f8e0b0');
  rect(ctx, x, y + 12, TILE, 2, '#b08850');
  rect(ctx, x, y + 14, TILE, 1, PAL.outline);
  rect(ctx, x, y + 1, TILE, 1, PAL.outline);
  if (!sameKind(map, gx - 1, gy, 'counter')) rect(ctx, x, y + 2, 1, 12, PAL.outline);
  if (!sameKind(map, gx + 1, gy, 'counter')) rect(ctx, x + TILE - 1, y + 2, 1, 12, PAL.outline);
}

function drawPlant(ctx, x, y, gx, gy) {
  drawFloor(ctx, x, y, gx, gy);
  rect(ctx, x + 4, y + 10, 8, 6, PAL.outline);
  rect(ctx, x + 5, y + 10, 6, 5, '#b5651d');
  rect(ctx, x + 5, y + 10, 6, 1, '#d98d4a');
  ellipse(ctx, x + 8, y + 7, 5.5, 5, PAL.treeLine);
  ellipse(ctx, x + 8, y + 7, 4.5, 4, PAL.tree);
  ellipse(ctx, x + 6, y + 5, 2, 1.5, PAL.treeLight);
}

/* ── 프리렌더 ───────────────────────────────────────── */

const GROUND = {
  grass: drawGrass,
  tallgrass: drawTallGrassBack,
  flower: drawFlower,
  path: drawSoil,
  sand: drawSand,
  water: drawWater,
  floor: drawFloor,
  mat: drawMat,
  // 오브젝트 아래에도 바탕은 필요하다
  tree: drawGrass,
  bush: drawGrass,
  rock: drawGrass,
  fence: drawGrass,
  sign: drawGrass,
  wall: () => {},
  window: () => {},
  door: () => {},
  roof: () => {},
  roofCenter: () => {},
  roofMart: () => {},
  roofGym: () => {},
  indoorwall: () => {},
  plant: () => {},
  counter: () => {},
};

const OBJECT = {
  fence: drawFence,
  sign: drawSign,
  wall: drawWallBase,
  window: drawWindow,
  door: drawDoor,
  roof: drawRoof,
  roofCenter: (c, x, y, gx, gy, map) => drawRoofKind(c, x, y, gx, gy, map, 'roofCenter'),
  roofMart: (c, x, y, gx, gy, map) => drawRoofKind(c, x, y, gx, gy, map, 'roofMart'),
  roofGym: (c, x, y, gx, gy, map) => drawRoofKind(c, x, y, gx, gy, map, 'roofGym'),
  counter: drawCounter,
  indoorwall: drawIndoorWall,
  plant: drawPlant,
  bush: (ctx, x, y, gx, gy) => drawBush(ctx, x, y, gx, gy),
  rock: (ctx, x, y) => drawRock(ctx, x, y),
};

/**
 * 맵 한 프레임을 그린다.
 * 나무는 3패스(외곽선 → 몸통 → 하이라이트)로 나눠 그려야 캐노피가 서로
 * 이어져 하나의 숲처럼 보인다. 타일마다 완성해 버리면 격자가 드러난다.
 */
function renderFrame(map, frame) {
  const W = map.rows[0].length * TILE;
  const H = map.rows.length * TILE;
  const { canvas, ctx } = makeCanvas(W, H);
  const trees = [];
  const each = (fn) => {
    for (let gy = 0; gy < map.rows.length; gy++) {
      for (let gx = 0; gx < map.rows[gy].length; gx++) {
        const tile = TILES[tileCharAt(map, gx, gy)] || TILES['.'];
        fn(tile, gx, gy, gx * TILE, gy * TILE);
      }
    }
  };

  each((tile, gx, gy, x, y) => {
    const draw = GROUND[tile.kind] || drawGrass;
    draw(ctx, x, y, gx, gy, map, frame);
    if (tile.kind === 'tree') trees.push([x, y, gx, gy]);
  });

  // 나무 줄기 먼저 (캐노피가 덮는다)
  for (const [x, y, gx, gy] of trees) {
    if (!sameKind(map, gx, gy + 1, 'tree')) drawTrunk(ctx, x, y);
  }
  for (const pass of ['outline', 'body', 'leaf']) {
    for (const [x, y, gx, gy] of trees) drawTreeCanopy(ctx, x, y, gx, gy, pass);
  }

  each((tile, gx, gy, x, y) => {
    const draw = OBJECT[tile.kind];
    if (draw) draw(ctx, x, y, gx, gy, map);
  });

  return canvas;
}

/**
 * @returns {{frames:HTMLCanvasElement[], width:number, height:number, tallGrass:[number,number][]}}
 */
export function renderMap(map) {
  const hasWater = map.rows.some((r) => [...r].some((c) => TILES[c]?.kind === 'water'));
  const frameCount = hasWater ? WATER_FRAMES : 1;
  const frames = [];
  for (let f = 0; f < frameCount; f++) frames.push(renderFrame(map, f));

  const tallGrass = [];
  map.rows.forEach((row, gy) => {
    [...row].forEach((ch, gx) => {
      if (TILES[ch]?.kind === 'tallgrass') tallGrass.push([gx, gy]);
    });
  });

  return {
    frames,
    width: map.rows[0].length * TILE,
    height: map.rows.length * TILE,
    tallGrass,
  };
}
