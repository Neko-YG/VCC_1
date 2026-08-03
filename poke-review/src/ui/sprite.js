/**
 * 도감/카드용 SVG 스프라이트. 형상은 core/monster.js 가 계산하고 여기선 그리기만 한다.
 * 실제 도트 일러스트로 바꾸고 싶으면 spriteFor() 를 <img> 반환으로 교체하면 된다.
 */
import { monsterShape, tonePalette } from '../core/monster.js';
import { shade } from '../core/color.js';
import { TYPES } from '../data/kpi.js';
import { svg } from './dom.js';

/**
 * @param {object} opts { speciesId, type, stage=1, size=96, animate=true }
 * @returns {SVGElement}
 */
export function spriteFor({ speciesId = 'ember', type = 'fire', stage = 1, size = 96, animate = true } = {}) {
  const shape = monsterShape({ speciesId, stage });
  const color = TYPES[type]?.color || '#8ab4f8';
  const palette = tonePalette(color, shade);
  const G = shape.size;

  const root = svg('svg', {
    viewBox: `0 0 ${G} ${G}`,
    width: size,
    height: size,
    class: `sprite ${animate ? 'sprite--bob' : ''}`,
    'shape-rendering': 'crispEdges',
    role: 'img',
    'aria-label': `${TYPES[type]?.name || type} 타입 파트너`,
  });

  const g = svg('g');
  for (const { x, y, tone } of shape.cells) {
    g.appendChild(svg('rect', { x, y, width: 1.02, height: 1.02, fill: palette[tone] }));
  }
  root.appendChild(g);
  return root;
}

/** 보스는 최종 진화 실루엣으로 */
export function bossSprite(boss, size = 112) {
  return spriteFor({ speciesId: `boss:${boss.id}`, type: boss.type, stage: 3, size });
}
