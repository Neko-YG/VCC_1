/** 배틀 화면용 몬스터 렌더러 — 형상은 core/monster.js, 여기선 캔버스에 찍기만 한다. */
import { monsterShape, tonePalette } from '../../core/monster.js';
import { shade } from '../../core/color.js';
import { TYPES } from '../../data/kpi.js';
import { makeCanvas, ellipse } from './pixel.js';

const monsterCache = new Map();

/** 몬스터 한 마리를 size×size 픽셀 캔버스로 굽는다 */
export function monsterCanvas({ speciesId, type, stage, back = false, expression = 'normal' }) {
  const key = `${speciesId}:${type}:${stage}:${back ? 'b' : 'f'}:${expression}`;
  if (monsterCache.has(key)) return monsterCache.get(key);

  const shape = monsterShape({ speciesId, stage, back, expression });
  const G = shape.size;
  const { canvas, ctx } = makeCanvas(G, G);
  const palette = tonePalette(TYPES[type]?.color || '#8ab4f8', shade);

  for (const { x, y, tone } of shape.cells) {
    ctx.fillStyle = palette[tone];
    ctx.fillRect(x, y, 1, 1);
  }
  monsterCache.set(key, canvas);
  return canvas;
}

/**
 * 배틀 화면에 그리기. 발밑 그림자까지.
 * @param {object} opts { x, y, size, flash, alpha }
 */
export function drawMonster(ctx, mon, { x, y, size = 48, flash = 0, alpha = 1 }) {
  if (alpha <= 0.02) return;
  const img = monsterCanvas(mon);
  ctx.save();
  ctx.globalAlpha = alpha;
  ellipse(ctx, x + size / 2, y + size - 1, size * 0.34, size * 0.1, 'rgba(0,0,0,0.22)');
  if (flash > 0) ctx.globalAlpha = alpha * (flash > 0.5 ? 0.35 : 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(x), Math.round(y), size, size);
  ctx.restore();
}
