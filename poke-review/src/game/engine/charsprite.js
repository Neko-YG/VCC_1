/**
 * 트레이너/NPC 도트 스프라이트 생성기 (4세대 오버월드 문법, 원본 도트).
 *
 * 그 시절 캐릭터가 그렇게 보이는 이유:
 *  1) 실루엣 전체를 감싸는 어두운 외곽선 — 어떤 배경 위에서도 캐릭터가 뜬다
 *  2) 재질마다 3톤(밝은 면/바탕/그늘) — 머리·옷·바지가 각각 입체로 보인다
 *  3) 걸을 때 몸이 1px 뜨고 팔다리가 번갈아 나간다
 *
 * 시트 한 장 = 4방향 × 3프레임. 색만 바꾸면 새 캐릭터가 된다.
 */
import { makeCanvas, rect, px, ellipse } from './pixel.js';
import { shade } from '../../core/color.js';
import { characterAsset } from './assets.js';

export const CW = 32; // 스프라이트 폭 (타일 32 와 같은 폭)
export const CH = 48; // 높이 — 타일보다 커서 머리가 윗 타일을 덮는다
export const DIRS = ['down', 'left', 'right', 'up'];
/** 걷기 순서: 정지 - 왼발 - 정지 - 오른발 */
export const WALK_CYCLE = [0, 1, 0, 2];

const OUTLINE = '#2a2028';

export const PALETTES = {
  red: { skin: '#f8d0a8', hair: '#3a2a20', cap: '#e04030', shirt: '#e8504a', pants: '#3858a8', shoes: '#2b2b33' },
  blue: { skin: '#f8d0a8', hair: '#2f2a3a', cap: null, shirt: '#4878d8', pants: '#31405e', shoes: '#22222a' },
  green: { skin: '#f0c098', hair: '#5a3a22', cap: null, shirt: '#58b858', pants: '#4a4436', shoes: '#2b2b33' },
  purple: { skin: '#f8d8b8', hair: '#6b3a6b', cap: null, shirt: '#a868d0', pants: '#4a3a5e', shoes: '#2b2b33' },
  yellow: { skin: '#f8d0a8', hair: '#c8a33a', cap: null, shirt: '#f0c040', pants: '#5a4a2a', shoes: '#3a2f22' },
  gray: { skin: '#f0c098', hair: '#4a4a52', cap: null, shirt: '#b0b8c0', pants: '#3d4450', shoes: '#26262e' },
  brown: { skin: '#f0c098', hair: '#6b4a2a', cap: null, shirt: '#b08050', pants: '#4a3a2a', shoes: '#2b2b33' },
  leader: { skin: '#f8d0a8', hair: '#20242e', cap: null, shirt: '#2b3550', pants: '#1c2233', shoes: '#141822' },
};

/* ── 부위별 그리기 ─────────────────────────────────── */

function drawHair(ctx, ox, oy, dir, pal, bob) {
  const hair = pal.hair;
  const hairLit = shade(hair, 34);
  const hairDark = shade(hair, -24);
  const y = oy + bob;

  if (pal.cap) {
    const cap = pal.cap;
    const capLit = shade(cap, 42);
    const capDark = shade(cap, -48);
    // 크라운
    rect(ctx, ox + 6, y + 2, 20, 8, cap);
    rect(ctx, ox + 8, y + 2, 14, 3, capLit);
    rect(ctx, ox + 6, y + 8, 20, 2, capDark);
    rect(ctx, ox + 15, y + 3, 2, 6, capLit); // 봉제선
    // 챙 — 보는 방향으로
    if (dir === 'down') {
      rect(ctx, ox + 5, y + 10, 22, 3, capDark);
      rect(ctx, ox + 7, y + 13, 18, 1, shade(cap, -60));
    }
    if (dir === 'right') rect(ctx, ox + 18, y + 10, 12, 3, capDark);
    if (dir === 'left') rect(ctx, ox + 2, y + 10, 12, 3, capDark);
    if (dir === 'up') {
      rect(ctx, ox + 6, y + 10, 20, 8, hair);
      rect(ctx, ox + 8, y + 10, 14, 2, hairLit);
      return;
    }
    // 모자 밑으로 나온 머리
    rect(ctx, ox + 6, y + 12, 4, 7, hair);
    rect(ctx, ox + 22, y + 12, 4, 7, hair);
    return;
  }

  if (dir === 'up') {
    rect(ctx, ox + 6, y + 2, 20, 18, hair);
    rect(ctx, ox + 9, y + 2, 12, 4, hairLit);
    rect(ctx, ox + 6, y + 16, 20, 4, hairDark);
    return;
  }
  // 앞머리 + 옆머리
  rect(ctx, ox + 6, y + 2, 20, 8, hair);
  rect(ctx, ox + 9, y + 2, 10, 2, hairLit);
  rect(ctx, ox + 6, y + 10, 4, 8, hair);
  rect(ctx, ox + 22, y + 10, 4, 8, hair);
  if (dir === 'down') {
    // 앞머리 갈래
    rect(ctx, ox + 8, y + 9, 6, 2, hairDark);
    rect(ctx, ox + 18, y + 9, 6, 2, hairDark);
    rect(ctx, ox + 14, y + 9, 4, 1, hairDark);
  }
  if (dir === 'right') rect(ctx, ox + 16, y + 8, 10, 3, hair);
  if (dir === 'left') rect(ctx, ox + 6, y + 8, 10, 3, hair);
}

function drawFace(ctx, ox, oy, dir, pal, bob) {
  const y = oy + bob;
  const skin = pal.skin;
  const skinDark = shade(skin, -26);
  // 얼굴
  rect(ctx, ox + 7, y + 9, 18, 12, skin);
  rect(ctx, ox + 9, y + 21, 14, 2, skin);
  rect(ctx, ox + 21, y + 10, 4, 11, skinDark); // 오른쪽 그늘

  const eye = '#241f2b';
  if (dir === 'down') {
    rect(ctx, ox + 10, y + 13, 4, 5, eye);
    rect(ctx, ox + 18, y + 13, 4, 5, eye);
    rect(ctx, ox + 10, y + 13, 2, 2, '#ffffff');
    rect(ctx, ox + 18, y + 13, 2, 2, '#ffffff');
    rect(ctx, ox + 15, y + 19, 3, 1, skinDark); // 입
  } else if (dir === 'right') {
    rect(ctx, ox + 19, y + 13, 4, 5, eye);
    rect(ctx, ox + 19, y + 13, 2, 2, '#ffffff');
    rect(ctx, ox + 23, y + 18, 2, 1, skinDark);
  } else if (dir === 'left') {
    rect(ctx, ox + 9, y + 13, 4, 5, eye);
    rect(ctx, ox + 9, y + 13, 2, 2, '#ffffff');
    rect(ctx, ox + 7, y + 18, 2, 1, skinDark);
  }
}

function drawBody(ctx, ox, oy, dir, frame, pal, bob) {
  const shirt = pal.shirt;
  const lit = shade(shirt, 34);
  const dark = shade(shirt, -42);
  const y = oy + bob;

  // 몸통
  rect(ctx, ox + 8, y + 23, 16, 12, shirt);
  rect(ctx, ox + 8, y + 23, 16, 2, lit);
  rect(ctx, ox + 20, y + 25, 4, 10, dark);
  rect(ctx, ox + 8, y + 33, 16, 2, dark);
  // 옷깃
  if (dir === 'down') {
    rect(ctx, ox + 13, y + 23, 6, 2, dark);
    rect(ctx, ox + 15, y + 25, 2, 4, dark);
  }

  // 팔 — 걸을 때 앞뒤로
  const swing = frame === 1 ? 2 : frame === 2 ? -2 : 0;
  rect(ctx, ox + 5, y + 25 + swing, 4, 8, shirt);
  rect(ctx, ox + 23, y + 25 - swing, 4, 8, dark);
  rect(ctx, ox + 5, y + 33 + swing, 4, 3, pal.skin); // 손
  rect(ctx, ox + 23, y + 33 - swing, 4, 3, shade(pal.skin, -25));
}

function drawLegs(ctx, ox, oy, frame, pal) {
  const pants = pal.pants;
  const lit = shade(pants, 28);
  const dark = shade(pants, -38);
  // 프레임마다 다리 길이가 달라져 걷는 느낌이 난다
  const l = frame === 1 ? 7 : frame === 2 ? 11 : 9;
  const r = frame === 1 ? 11 : frame === 2 ? 7 : 9;
  rect(ctx, ox + 10, oy + 35, 6, l, pants);
  rect(ctx, ox + 10, oy + 35, 2, l, lit);
  rect(ctx, ox + 16, oy + 35, 6, r, pants);
  rect(ctx, ox + 20, oy + 35, 2, r, dark);
  // 신발
  rect(ctx, ox + 9, oy + 35 + l, 7, 3, pal.shoes);
  rect(ctx, ox + 16, oy + 35 + r, 7, 3, pal.shoes);
  rect(ctx, ox + 9, oy + 37 + l, 7, 1, shade(pal.shoes, -30));
  rect(ctx, ox + 16, oy + 37 + r, 7, 1, shade(pal.shoes, -30));
}

function drawTrainer(ctx, ox, oy, dir, frame, pal) {
  const bob = frame === 0 ? 0 : -1; // 걸을 때 상체가 1px 뜬다
  drawLegs(ctx, ox, oy, frame, pal);
  drawBody(ctx, ox, oy, dir, frame, pal, bob);
  if (dir === 'up') rect(ctx, ox + 7, oy + bob + 9, 18, 12, pal.hair);
  else drawFace(ctx, ox, oy, dir, pal, bob);
  drawHair(ctx, ox, oy, dir, pal, bob);
}

/* ── 외곽선 ─────────────────────────────────────────── */

/**
 * 그려진 실루엣 둘레에 1px 외곽선을 두른다.
 * 부위마다 선을 긋는 것보다 정확하고, 팔레트를 바꿔도 그대로 동작한다.
 */
function addOutline(ctx, w, h, color = OUTLINE) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const alphaAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[((y * w + x) << 2) + 3]);
  const solid = (x, y) => alphaAt(x, y) > 200;
  const targets = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) targets.push([x, y]);
    }
  }
  ctx.fillStyle = color;
  for (const [x, y] of targets) ctx.fillRect(x, y, 1, 1);
}

/** 해상도가 2배가 되면 외곽선도 두 번 둘러야 같은 굵기로 보인다 */
function addOutlineThick(ctx, w, h, passes = 2) {
  for (let i = 0; i < passes; i++) addOutline(ctx, w, h);
}

/**
 * 팔레트 하나로 시트 생성 (4방향 × 3프레임 + 발밑 그림자).
 * @returns {{canvas:HTMLCanvasElement, w:number, h:number}}
 */
export function makeCharSheet(paletteId = 'red') {
  const pal = PALETTES[paletteId] || PALETTES.red;
  const { canvas, ctx } = makeCanvas(CW * 3, CH * DIRS.length);

  DIRS.forEach((dir, row) => {
    for (let frame = 0; frame < 3; frame++) {
      drawTrainer(ctx, frame * CW, row * CH, dir, frame, pal);
    }
  });
  addOutlineThick(ctx, canvas.width, canvas.height, 2);

  // 그림자는 외곽선 뒤에 깐다 (윤곽선이 그림자까지 두르면 안 되므로)
  ctx.globalCompositeOperation = 'destination-over';
  DIRS.forEach((_, row) => {
    for (let frame = 0; frame < 3; frame++) {
      ellipse(ctx, frame * CW + 16, row * CH + 45, 10, 4, 'rgba(0,0,0,0.25)');
    }
  });
  ctx.globalCompositeOperation = 'source-over';

  return { canvas, w: CW, h: CH };
}

const sheetCache = new Map();
export function charSheet(paletteId) {
  if (!sheetCache.has(paletteId)) sheetCache.set(paletteId, makeCharSheet(paletteId));
  return sheetCache.get(paletteId);
}

/**
 * 시트에서 한 프레임을 화면에 그린다.
 * 에셋 매니페스트에 같은 이름의 캐릭터 시트가 있으면 그쪽을 우선한다.
 */
export function drawChar(ctx, sheet, dir, frame, x, y, paletteId) {
  const row = Math.max(0, DIRS.indexOf(dir));
  const asset = paletteId ? characterAsset(paletteId) : null;
  if (asset) {
    ctx.drawImage(
      asset.img,
      asset.x + frame * asset.w,
      asset.y + row * asset.h,
      asset.w,
      asset.h,
      Math.round(x) + asset.ox,
      Math.round(y) + asset.oy - (asset.h - CH),
      asset.w,
      asset.h,
    );
    return;
  }
  ctx.drawImage(sheet.canvas, frame * CW, row * CH, CW, CH, Math.round(x), Math.round(y), CW, CH);
}

/** 배틀 화면처럼 크게 그릴 때 */
export function drawCharScaled(ctx, sheet, dir, frame, x, y, scale) {
  const row = Math.max(0, DIRS.indexOf(dir));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet.canvas, frame * CW, row * CH, CW, CH, Math.round(x), Math.round(y), CW * scale, CH * scale);
}
