/**
 * 파트너 몬스터의 "형상"만 만든다 (그리는 건 렌더러 몫).
 * SVG(도감)와 캔버스(게임 배틀)가 같은 모양을 쓰도록 여기서 한 번만 계산한다.
 */
import { createRng } from './rng.js';
import { shade } from './color.js';

export const MONSTER_GRID = 16;

/**
 * @param {{speciesId:string, stage:number}} opts
 * @returns {{grid:number, cells:[number,number][], eyeX:number, eyeY:number, mouthY:number}}
 */
export function monsterShape({ speciesId = 'ember', stage = 1 } = {}) {
  const rng = createRng(`${speciesId}:${stage}`);
  const G = MONSTER_GRID;
  const half = G / 2;
  const cells = [];
  const seen = new Set();
  const put = (x, y) => {
    const k = `${x},${y}`;
    if (x < 0 || y < 0 || x >= G || y >= G || seen.has(k)) return;
    seen.add(k);
    cells.push([x, y]);
  };

  // 몸통: 진화할수록 커지고 실루엣이 복잡해진다
  const bodyW = 3.4 + stage * 0.5;
  const bodyH = 3.6 + stage * 0.6;
  const noise = 0.22 + stage * 0.08;

  for (let y = 0; y < G; y++) {
    for (let x = 0; x < half; x++) {
      const dx = (x - (half - 0.5)) / bodyW;
      const dy = (y - (G / 2 + 0.5)) / bodyH;
      const d = Math.sqrt(dx * dx + dy * dy);
      const filled = d < 1 ? true : d < 1 + noise ? rng.chance(1 - (d - 1) / noise) : false;
      if (filled) {
        put(x, y);
        put(G - 1 - x, y); // 좌우 대칭
      }
    }
  }

  // 머리 위 장식(뿔/불꽃) — 2단계부터
  if (stage >= 2) {
    for (let i = 0; i < stage; i++) {
      const y = 2 - i;
      if (y < 0) continue;
      const x = half - 2 - rng.int(0, 1);
      put(x, y);
      put(G - 1 - x, y);
    }
  }

  const eyeY = 5 + (stage >= 3 ? 0 : 1);
  return { grid: G, cells, eyeX: half - 2, eyeY, mouthY: eyeY + 2.2 };
}

/** 위/아래로 밝기를 나누는 간단한 셰이딩 기준 */
export function shadeAt(y, grid = MONSTER_GRID) {
  const t = y / grid;
  return t < 0.35 ? 'light' : t > 0.75 ? 'dark' : 'base';
}

