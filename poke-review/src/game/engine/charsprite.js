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

export const CW = 16; // 스프라이트 폭
export const CH = 24; // 높이 (타일 16보다 커서 머리가 윗 타일을 덮는다)
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
  const hairDark = shade(hair, -22);
  const y = oy + bob;

  if (pal.cap) {
    const cap = pal.cap;
    rect(ctx, ox + 3, y + 1, 10, 4, cap);
    rect(ctx, ox + 4, y + 1, 8, 1, shade(cap, 40));
    rect(ctx, ox + 3, y + 4, 10, 1, shade(cap, -45));
    // 챙 — 보는 방향으로 나온다
    if (dir === 'down') rect(ctx, ox + 3, y + 5, 10, 1, shade(cap, -45));
    if (dir === 'left') rect(ctx, ox + 1, y + 5, 6, 1, shade(cap, -45));
    if (dir === 'right') rect(ctx, ox + 9, y + 5, 6, 1, shade(cap, -45));
    if (dir === 'up') {
      rect(ctx, ox + 3, y + 5, 10, 4, hair);
      rect(ctx, ox + 4, y + 5, 8, 1, hairLit);
    } else {
      rect(ctx, ox + 3, y + 6, 2, 3, hair);
      rect(ctx, ox + 11, y + 6, 2, 3, hair);
    }
    return;
  }

  if (dir === 'up') {
    rect(ctx, ox + 3, y + 1, 10, 9, hair);
    rect(ctx, ox + 4, y + 1, 7, 2, hairLit);
    rect(ctx, ox + 3, y + 8, 10, 2, hairDark);
    return;
  }
  rect(ctx, ox + 3, y + 1, 10, 4, hair);
  rect(ctx, ox + 4, y + 1, 6, 1, hairLit);
  rect(ctx, ox + 3, y + 5, 2, 4, hair);
  rect(ctx, ox + 11, y + 5, 2, 4, hair);
  if (dir === 'left') rect(ctx, ox + 3, y + 4, 5, 2, hair);
  if (dir === 'right') rect(ctx, ox + 8, y + 4, 5, 2, hair);
  if (dir === 'down') {
    rect(ctx, ox + 4, y + 4, 3, 1, hairDark);
    rect(ctx, ox + 9, y + 4, 3, 1, hairDark);
  }
}

function drawFace(ctx, ox, oy, dir, pal, bob) {
  const y = oy + bob;
  const skin = pal.skin;
  rect(ctx, ox + 3, y + 4, 10, 6, skin);
  rect(ctx, ox + 4, y + 10, 8, 1, skin);
  rect(ctx, ox + 11, y + 5, 2, 5, shade(skin, -28)); // 오른쪽 그늘

  const eye = '#241f2b';
  if (dir === 'down') {
    rect(ctx, ox + 5, y + 6, 2, 2, eye);
    rect(ctx, ox + 9, y + 6, 2, 2, eye);
    px(ctx, ox + 5, y + 6, '#ffffff');
    px(ctx, ox + 9, y + 6, '#ffffff');
    rect(ctx, ox + 7, y + 9, 2, 1, shade(skin, -45));
  } else if (dir === 'left') {
    rect(ctx, ox + 4, y + 6, 2, 2, eye);
    px(ctx, ox + 4, y + 6, '#ffffff');
    rect(ctx, ox + 3, y + 9, 2, 1, shade(skin, -45));
  } else if (dir === 'right') {
    rect(ctx, ox + 10, y + 6, 2, 2, eye);
    px(ctx, ox + 10, y + 6, '#ffffff');
    rect(ctx, ox + 11, y + 9, 2, 1, shade(skin, -45));
  }
}

function drawBody(ctx, ox, oy, dir, frame, pal, bob) {
  const shirt = pal.shirt;
  const lit = shade(shirt, 34);
  const dark = shade(shirt, -40);
  const y = oy + bob;

  rect(ctx, ox + 4, y + 11, 8, 6, shirt);
  rect(ctx, ox + 4, y + 11, 8, 1, lit);
  rect(ctx, ox + 10, y + 12, 2, 5, dark);
  rect(ctx, ox + 4, y + 16, 8, 1, dark);

  // 팔 — 걸을 때 앞뒤로
  const swing = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const armL = y + 12 + swing;
  const armR = y + 12 - swing;
  rect(ctx, ox + 3, armL, 2, 4, dir === 'left' ? shirt : shirt);
  rect(ctx, ox + 12, armR, 2, 4, dir === 'right' ? shirt : dark);
  rect(ctx, ox + 3, armL + 4, 2, 1, pal.skin);
  rect(ctx, ox + 12, armR + 4, 2, 1, shade(pal.skin, -25));
}

function drawLegs(ctx, ox, oy, frame, pal) {
  const pants = pal.pants;
  const lit = shade(pants, 28);
  const dark = shade(pants, -35);
  // 프레임마다 한쪽 다리가 앞으로 나가 길이가 달라진다
  const l = frame === 1 ? 4 : frame === 2 ? 6 : 5;
  const r = frame === 1 ? 6 : frame === 2 ? 4 : 5;
  rect(ctx, ox + 5, oy + 17, 3, l, pants);
  rect(ctx, ox + 5, oy + 17, 1, l, lit);
  rect(ctx, ox + 8, oy + 17, 3, r, pants);
  rect(ctx, ox + 10, oy + 17, 1, r, dark);
  rect(ctx, ox + 5, oy + 17 + l, 3, 1, pal.shoes);
  rect(ctx, ox + 8, oy + 17 + r, 3, 1, pal.shoes);
}

function drawTrainer(ctx, ox, oy, dir, frame, pal) {
  const bob = frame === 0 ? 0 : -1; // 걸을 때 몸이 1px 뜬다
  drawLegs(ctx, ox, oy, frame, pal);
  drawBody(ctx, ox, oy, dir, frame, pal, bob);
  if (dir === 'up') rect(ctx, ox + 3, oy + bob + 4, 10, 6, pal.hair);
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
  addOutline(ctx, canvas.width, canvas.height);

  // 그림자는 외곽선 뒤에 깐다 (윤곽선이 그림자까지 두르면 안 되므로)
  ctx.globalCompositeOperation = 'destination-over';
  DIRS.forEach((_, row) => {
    for (let frame = 0; frame < 3; frame++) {
      ellipse(ctx, frame * CW + 8, row * CH + 22, 5, 2, 'rgba(0,0,0,0.25)');
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
