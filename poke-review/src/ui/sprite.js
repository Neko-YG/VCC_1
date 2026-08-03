/**
 * 절차적 픽셀 스프라이트 — 외부 이미지 파일 없이 SVG 로 생성한다.
 * 같은 (종족, 진화단계) 면 항상 같은 모양.  실제 일러스트로 교체하고 싶으면
 * spriteFor() 만 <img> 반환으로 바꾸면 나머지 화면은 그대로 동작한다.
 */
import { createRng } from '../core/rng.js';
import { TYPES } from '../data/kpi.js';
import { svg } from './dom.js';

const GRID = 16;

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * @param {object} opts { speciesId, type, stage=1, size=96, animate=true }
 * @returns {SVGElement}
 */
export function spriteFor({ speciesId = 'ember', type = 'fire', stage = 1, size = 96, animate = true } = {}) {
  const rng = createRng(`${speciesId}:${stage}`);
  const color = TYPES[type]?.color || '#8ab4f8';
  const light = shade(color, 45);
  const dark = shade(color, -60);

  const half = GRID / 2;
  const cells = [];
  // 몸통: 진화할수록 커지고 실루엣이 복잡해진다
  const bodyW = 3.4 + stage * 0.5;
  const bodyH = 3.6 + stage * 0.6;
  const noise = 0.22 + stage * 0.08;

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < half; x++) {
      const dx = (x - (half - 0.5)) / bodyW;
      const dy = (y - (GRID / 2 + 0.5)) / bodyH;
      const d = Math.sqrt(dx * dx + dy * dy);
      const filled = d < 1 ? true : d < 1 + noise ? rng.chance(1 - (d - 1) / noise) : false;
      if (filled) {
        cells.push([x, y]);
        cells.push([GRID - 1 - x, y]); // 좌우 대칭
      }
    }
  }

  // 머리 위 장식(뿔/불꽃) — 2단계부터
  if (stage >= 2) {
    const hornH = stage;
    for (let i = 0; i < hornH; i++) {
      const y = 2 - i;
      if (y < 0) continue;
      const x = half - 2 - rng.int(0, 1);
      cells.push([x, y], [GRID - 1 - x, y]);
    }
  }

  const unit = size / GRID;
  const root = svg('svg', {
    viewBox: `0 0 ${GRID} ${GRID}`,
    width: size,
    height: size,
    class: `sprite ${animate ? 'sprite--bob' : ''}`,
    'shape-rendering': 'crispEdges',
    role: 'img',
    'aria-label': `${TYPES[type]?.name || type} 타입 파트너`,
  });

  const g = svg('g');
  const seen = new Set();
  for (const [x, y] of cells) {
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // 위쪽은 밝게, 아래쪽은 어둡게 (간단한 셰이딩)
    const t = y / GRID;
    const fill = t < 0.35 ? light : t > 0.75 ? dark : color;
    g.appendChild(svg('rect', { x, y, width: 1.02, height: 1.02, fill }));
  }
  root.appendChild(g);

  // 눈
  const eyeY = 5 + (stage >= 3 ? 0 : 1);
  const eyeX = half - 2;
  for (const ex of [eyeX, GRID - 1 - eyeX]) {
    root.appendChild(svg('rect', { x: ex, y: eyeY, width: 1, height: 1.4, fill: '#12151c' }));
    root.appendChild(svg('rect', { x: ex, y: eyeY, width: 0.5, height: 0.5, fill: '#ffffff' }));
  }
  // 입
  root.appendChild(
    svg('rect', { x: half - 1, y: eyeY + 2.2, width: 2, height: 0.6, fill: shade(dark, -20) }),
  );

  // 최종 진화 오라
  if (stage >= 3) {
    root.appendChild(
      svg('circle', {
        cx: half,
        cy: GRID / 2,
        r: GRID / 2 - 0.5,
        fill: 'none',
        stroke: light,
        'stroke-width': 0.25,
        opacity: 0.55,
        class: 'sprite__aura',
      }),
    );
  }

  root.dataset.unit = unit;
  return root;
}

/** 보스는 실루엣을 조금 다르게 (더 크고 각지게) */
export function bossSprite(boss, size = 112) {
  return spriteFor({ speciesId: `boss:${boss.id}`, type: boss.type, stage: 3, size });
}
