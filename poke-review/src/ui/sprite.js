/**
 * 도감/카드용 SVG 스프라이트. 형상은 core/monster.js 가 계산하고 여기선 그리기만 한다.
 * 실제 도트 일러스트로 바꾸고 싶으면 spriteFor() 를 <img> 반환으로 교체하면 된다.
 */
import { monsterShape, shadeAt } from '../core/monster.js';
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
  const light = shade(color, 45);
  const dark = shade(color, -60);
  const G = shape.grid;

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
  for (const [x, y] of shape.cells) {
    const tone = shadeAt(y, G);
    const fill = tone === 'light' ? light : tone === 'dark' ? dark : color;
    g.appendChild(svg('rect', { x, y, width: 1.02, height: 1.02, fill }));
  }
  root.appendChild(g);

  for (const ex of [shape.eyeX, G - 1 - shape.eyeX]) {
    root.appendChild(svg('rect', { x: ex, y: shape.eyeY, width: 1, height: 1.4, fill: '#12151c' }));
    root.appendChild(svg('rect', { x: ex, y: shape.eyeY, width: 0.5, height: 0.5, fill: '#ffffff' }));
  }
  root.appendChild(svg('rect', { x: G / 2 - 1, y: shape.mouthY, width: 2, height: 0.6, fill: shade(dark, -20) }));

  if (stage >= 3) {
    root.appendChild(
      svg('circle', {
        cx: G / 2,
        cy: G / 2,
        r: G / 2 - 0.5,
        fill: 'none',
        stroke: light,
        'stroke-width': 0.25,
        opacity: 0.55,
        class: 'sprite__aura',
      }),
    );
  }
  return root;
}

/** 보스는 최종 진화 실루엣으로 */
export function bossSprite(boss, size = 112) {
  return spriteFor({ speciesId: `boss:${boss.id}`, type: boss.type, stage: 3, size });
}
