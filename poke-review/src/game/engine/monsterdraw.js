/** 배틀 화면용 몬스터 렌더러 — 형상은 core/monster.js, 여기선 캔버스에 찍기만 한다. */
import { monsterShape, shadeAt } from '../../core/monster.js';
import { shade } from '../../core/color.js';
import { TYPES } from '../../data/kpi.js';
import { makeCanvas, ellipse } from './pixel.js';

const monsterCache = new Map();

/** 몬스터 한 마리를 grid×grid 픽셀 캔버스로 굽는다 */
export function monsterCanvas({ speciesId, type, stage }) {
  const key = `${speciesId}:${type}:${stage}`;
  if (monsterCache.has(key)) return monsterCache.get(key);

  const shape = monsterShape({ speciesId, stage });
  const G = shape.grid;
  const { canvas, ctx } = makeCanvas(G, G);
  const color = TYPES[type]?.color || '#8ab4f8';
  const light = shade(color, 45);
  const dark = shade(color, -60);

  for (const [x, y] of shape.cells) {
    const tone = shadeAt(y, G);
    ctx.fillStyle = tone === 'light' ? light : tone === 'dark' ? dark : color;
    ctx.fillRect(x, y, 1, 1);
  }
  for (const ex of [shape.eyeX, G - 1 - shape.eyeX]) {
    ctx.fillStyle = '#12151c';
    ctx.fillRect(ex, shape.eyeY, 1, 1.4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ex, shape.eyeY, 0.5, 0.5);
  }
  ctx.fillStyle = shade(dark, -20);
  ctx.fillRect(G / 2 - 1, shape.mouthY, 2, 0.6);

  monsterCache.set(key, canvas);
  return canvas;
}

/**
 * 배틀 화면에 그리기. 발밑 그림자까지.
 * @param {object} opts { x, y, size, flash }
 */
export function drawMonster(ctx, mon, { x, y, size = 48, flash = 0 }) {
  const img = monsterCanvas(mon);
  ellipse(ctx, x + size / 2, y + size + 3, size * 0.38, size * 0.12, 'rgba(0,0,0,0.22)');
  ctx.save();
  if (flash > 0) ctx.globalAlpha = flash > 0.5 ? 0.35 : 1;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(x), Math.round(y), size, size);
  ctx.restore();
}
