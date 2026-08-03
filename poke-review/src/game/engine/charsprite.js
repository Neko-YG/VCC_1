/**
 * 트레이너/NPC 도트 스프라이트를 코드로 생성한다.
 * 시트 한 장 = 4방향 × 3프레임 (정지 / 왼발 / 오른발).
 * 색만 바꾸면 새 캐릭터가 되므로 NPC 마다 팔레트만 지정하면 된다.
 */
import { makeCanvas, rect, px, ellipse } from './pixel.js';
import { shade } from '../../core/color.js';

export const CW = 16; // 스프라이트 폭
export const CH = 22; // 스프라이트 높이 (타일보다 6px 크다 — 머리가 위 타일을 살짝 덮게)
export const DIRS = ['down', 'left', 'right', 'up'];
/** 걷기 애니메이션 순서: 정지-왼발-정지-오른발 */
export const WALK_CYCLE = [0, 1, 0, 2];

export const PALETTES = {
  red: { skin: '#f2c49b', hair: '#3a2a20', cap: '#e04b4b', shirt: '#e8534f', pants: '#3f5fa8', shoes: '#2b2b33' },
  blue: { skin: '#f2c49b', hair: '#2f2a3a', cap: null, shirt: '#4f7fd8', pants: '#31405e', shoes: '#22222a' },
  green: { skin: '#e9b98a', hair: '#5a3a22', cap: null, shirt: '#5fbf6a', pants: '#4a4436', shoes: '#2b2b33' },
  purple: { skin: '#f4d0ae', hair: '#6b3a6b', cap: null, shirt: '#a86fd0', pants: '#4a3a5e', shoes: '#2b2b33' },
  yellow: { skin: '#f2c49b', hair: '#c8a33a', cap: null, shirt: '#f0c14b', pants: '#5a4a2a', shoes: '#3a2f22' },
  gray: { skin: '#e9b98a', hair: '#4a4a52', cap: null, shirt: '#aab4c0', pants: '#3d4450', shoes: '#26262e' },
  brown: { skin: '#e9b98a', hair: '#6b4a2a', cap: null, shirt: '#b98a55', pants: '#4a3a2a', shoes: '#2b2b33' },
  leader: { skin: '#f2c49b', hair: '#20242e', cap: null, shirt: '#2b3550', pants: '#1c2233', shoes: '#141822' },
};

function drawTrainer(ctx, ox, oy, dir, frame, pal) {
  const skin = pal.skin;
  const hair = pal.hair;
  const shirt = pal.shirt;
  const dark = (c) => shade(c, -40);

  // 그림자
  ellipse(ctx, ox + 8, oy + 20, 5, 2, 'rgba(0,0,0,0.22)');

  // 다리 (프레임별로 앞뒤로 어긋나게)
  const step = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const legY = 16;
  rect(ctx, ox + 5, oy + legY + Math.max(0, step), 3, 5 - Math.max(0, step), pal.pants);
  rect(ctx, ox + 8, oy + legY + Math.max(0, -step), 3, 5 - Math.max(0, -step), pal.pants);
  rect(ctx, ox + 5, oy + 20, 3, 1, pal.shoes);
  rect(ctx, ox + 8, oy + 20, 3, 1, pal.shoes);

  // 몸통
  rect(ctx, ox + 4, oy + 10, 8, 7, shirt);
  rect(ctx, ox + 4, oy + 16, 8, 1, dark(shirt));
  // 팔
  const armSwing = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  rect(ctx, ox + 3, oy + 11 + armSwing, 2, 5, shirt);
  rect(ctx, ox + 11, oy + 11 - armSwing, 2, 5, shirt);
  rect(ctx, ox + 3, oy + 15 + armSwing, 2, 1, skin);
  rect(ctx, ox + 11, oy + 15 - armSwing, 2, 1, skin);

  // 머리
  rect(ctx, ox + 3, oy + 2, 10, 9, skin);
  rect(ctx, ox + 3, oy + 10, 10, 1, shade(skin, -30));

  // 머리카락 / 모자
  const capColor = pal.cap;
  if (capColor) {
    rect(ctx, ox + 2, oy + 1, 12, 4, capColor);
    rect(ctx, ox + 2, oy + 4, 12, 1, shade(capColor, -50));
    rect(ctx, ox + 3, oy + 0, 10, 1, shade(capColor, 25));
    if (dir === 'down') rect(ctx, ox + 2, oy + 5, 12, 1, shade(capColor, -50)); // 챙
    if (dir === 'left') rect(ctx, ox + 1, oy + 5, 6, 1, shade(capColor, -50));
    if (dir === 'right') rect(ctx, ox + 9, oy + 5, 6, 1, shade(capColor, -50));
    rect(ctx, ox + 3, oy + 5, 2, 3, hair);
    rect(ctx, ox + 11, oy + 5, 2, 3, hair);
  } else {
    rect(ctx, ox + 2, oy + 1, 12, 5, hair);
    rect(ctx, ox + 2, oy + 6, 2, 4, hair);
    rect(ctx, ox + 12, oy + 6, 2, 4, hair);
    if (dir === 'up') rect(ctx, ox + 2, oy + 1, 12, 9, hair); // 뒤통수
  }

  // 눈
  const eye = '#241f2b';
  if (dir === 'down') {
    rect(ctx, ox + 5, oy + 7, 2, 2, eye);
    rect(ctx, ox + 9, oy + 7, 2, 2, eye);
    px(ctx, ox + 5, oy + 7, '#ffffff');
    px(ctx, ox + 9, oy + 7, '#ffffff');
  } else if (dir === 'left') {
    rect(ctx, ox + 4, oy + 7, 2, 2, eye);
  } else if (dir === 'right') {
    rect(ctx, ox + 10, oy + 7, 2, 2, eye);
  }
}

/**
 * 팔레트 하나로 시트 생성.
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
  return { canvas, w: CW, h: CH };
}

const sheetCache = new Map();
export function charSheet(paletteId) {
  if (!sheetCache.has(paletteId)) sheetCache.set(paletteId, makeCharSheet(paletteId));
  return sheetCache.get(paletteId);
}

/** 시트에서 한 프레임을 화면에 그린다 */
export function drawChar(ctx, sheet, dir, frame, x, y) {
  const row = Math.max(0, DIRS.indexOf(dir));
  ctx.drawImage(sheet.canvas, frame * CW, row * CH, CW, CH, Math.round(x), Math.round(y), CW, CH);
}
