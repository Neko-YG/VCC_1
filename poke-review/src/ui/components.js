/** 화면 여러 곳에서 재사용하는 조각들. */
import { h, svg, fmt } from './dom.js';
import { STATS, STAT_IDS, NATURE_BY_ID } from '../core/config.js';
import { TYPES, KPI_BY_ID } from '../data/kpi.js';
import { BADGE_BY_ID } from '../data/badges.js';
import { spriteFor } from './sprite.js';

export function typeChip(typeId, { small = false } = {}) {
  const t = TYPES[typeId];
  if (!t) return h('span', { class: 'chip' }, typeId);
  return h(
    'span',
    { class: `chip chip--type ${small ? 'chip--sm' : ''}`, style: { '--chip': t.color } },
    `${t.name}`,
  );
}

export function gradeChip(grade) {
  return h('span', { class: 'chip chip--grade', style: { '--chip': grade.color } }, grade.label);
}

export function badgeChip(id, { showName = true } = {}) {
  const b = BADGE_BY_ID[id];
  if (!b) return h('span', { class: 'chip' }, id);
  return h(
    'span',
    { class: `chip chip--badge chip--${b.kind}`, title: `${b.name} — ${b.desc}` },
    h('span', { class: 'chip__icon' }, b.icon),
    showName ? b.name : null,
  );
}

export function expBar(progress) {
  return h(
    'div',
    { class: 'expbar' },
    h('div', { class: 'expbar__track' }, h('div', { class: 'expbar__fill', style: { width: `${progress.ratio * 100}%` } })),
    h(
      'div',
      { class: 'expbar__meta' },
      h('span', {}, `Lv.${progress.level}`),
      h('span', {}, progress.isMax ? 'MAX' : `다음 레벨까지 ${fmt.num(progress.toNext)} EXP`),
    ),
  );
}

export function hpBar(ratio, label) {
  const cls = ratio > 0.5 ? 'ok' : ratio > 0.2 ? 'warn' : 'danger';
  return h(
    'div',
    { class: 'hpbar' },
    label ? h('div', { class: 'hpbar__label' }, label) : null,
    h('div', { class: `hpbar__track hpbar--${cls}` }, h('div', { class: 'hpbar__fill', style: { width: `${Math.max(0, ratio) * 100}%` } })),
  );
}

/**
 * 스탯 눈금 자동 결정 — 레벨이 낮을 땐 그래프가 점처럼 보이지 않도록,
 * 높을 땐 잘리지 않도록 실제 값에 맞춰 올림한다.
 */
export function statScale(stats) {
  const peak = Math.max(...STAT_IDS.map((id) => stats[id] || 0), 1);
  return Math.max(50, Math.ceil((peak * 1.25) / 25) * 25);
}

/** 6스탯 막대 */
export function statBars(stats, { max = statScale(stats) } = {}) {
  return h(
    'div',
    { class: 'statbars' },
    STATS.map((s) =>
      h(
        'div',
        { class: 'statbars__row' },
        h('span', { class: 'statbars__name' }, s.name),
        h('span', { class: 'statbars__value' }, fmt.num(stats[s.id] || 0)),
        h(
          'div',
          { class: 'statbars__track' },
          h('div', {
            class: 'statbars__fill',
            style: { width: `${Math.min(100, ((stats[s.id] || 0) / max) * 100)}%` },
          }),
        ),
      ),
    ),
  );
}

/** 육각형 레이더 차트 */
export function radar(stats, { size = 220, max = statScale(stats), color = '#6ee7ff' } = {}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28;
  const n = STAT_IDS.length;
  const pt = (i, ratio) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r * ratio, cy + Math.sin(a) * r * ratio];
  };

  const root = svg('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: 'radar' });

  for (const ring of [0.25, 0.5, 0.75, 1]) {
    root.appendChild(
      svg('polygon', {
        points: STAT_IDS.map((_, i) => pt(i, ring).join(',')).join(' '),
        class: 'radar__ring',
      }),
    );
  }
  root.appendChild(
    svg('polygon', {
      points: STAT_IDS.map((id, i) => pt(i, Math.max(0.05, Math.min(1, (stats[id] || 0) / max))).join(',')).join(' '),
      class: 'radar__area',
      style: `--radar:${color}`,
    }),
  );
  STATS.forEach((s, i) => {
    const [x, y] = pt(i, 1.22);
    const label = svg('text', { x, y, class: 'radar__label', 'text-anchor': 'middle' });
    label.textContent = `${s.name} ${stats[s.id] || 0}`;
    root.appendChild(label);
  });
  return root;
}

/** KPI 한 줄 (점수 막대 + 실적/목표) */
export function kpiRow(ks) {
  const kpi = KPI_BY_ID[ks.kpiId];
  const pct = Math.min(1.5, ks.raw) / 1.5;
  return h(
    'div',
    { class: `kpirow ${ks.cleared ? 'is-clear' : ''}` },
    h(
      'div',
      { class: 'kpirow__head' },
      typeChip(kpi.type, { small: true }),
      h('span', { class: 'kpirow__name' }, kpi.name),
      h('span', { class: 'kpirow__val' }, `${fmt.num(ks.value)}${kpi.unit} / ${fmt.num(ks.target)}${kpi.unit}`),
      h('span', { class: 'kpirow__pct' }, fmt.pct(ks.raw)),
    ),
    h(
      'div',
      { class: 'kpirow__track' },
      h('div', { class: 'kpirow__goal' }),
      h('div', {
        class: 'kpirow__fill',
        style: { width: `${pct * 100}%`, '--c': TYPES[kpi.type].color },
      }),
    ),
    h(
      'div',
      { class: 'kpirow__foot' },
      h('span', {}, `+${fmt.num(ks.exp)} EXP`),
      h('span', {}, `노력치 +${ks.ev} (${STATS.find((s) => s.id === kpi.stat).name})`),
      ks.streak > 0 ? h('span', { class: 'kpirow__streak' }, `연속 ${ks.streak}개월 🔗`) : null,
    ),
  );
}

/** 도감/대시보드용 카드 */
export function memberCard(result, { onClick } = {}) {
  const { member, form, progress, grade, overall, species } = result;
  const card = h(
    'article',
    { class: 'card card--member', style: { '--type': TYPES[species.type].color } },
    h(
      'div',
      { class: 'card__sprite' },
      spriteFor({ speciesId: species.id, type: species.type, stage: form.stage, size: 88 }),
    ),
    h(
      'div',
      { class: 'card__body' },
      h(
        'div',
        { class: 'card__top' },
        h('strong', { class: 'card__name' }, member.name),
        gradeChip(grade),
      ),
      h('div', { class: 'card__sub' }, `${member.role || ''} · ${form.name}`),
      h('div', { class: 'card__chips' }, typeChip(species.type, { small: true }), h('span', { class: 'chip chip--sm' }, `Lv.${progress.level}`)),
      expBar(progress),
      h(
        'div',
        { class: 'card__foot' },
        h('span', {}, `종합 ${fmt.score(overall)}`),
        h('span', { class: result.battle.win ? 'win' : 'lose' }, result.battle.win ? '체육관 클리어' : '재도전 필요'),
      ),
    ),
  );
  if (onClick) {
    card.classList.add('is-clickable');
    card.addEventListener('click', () => onClick(result));
  }
  return card;
}

export function statLine(label, value) {
  return h('div', { class: 'statline' }, h('span', {}, label), h('strong', {}, value));
}

export function panel(title, ...children) {
  return h('section', { class: 'panel' }, title ? h('h2', { class: 'panel__title' }, title) : null, ...children);
}

export function emptyState(text, action) {
  return h('div', { class: 'empty' }, h('p', {}, text), action || null);
}

export function natureLabel(natureId) {
  const n = NATURE_BY_ID[natureId];
  if (!n) return '노력';
  if (!n.up) return `${n.name} (보정 없음)`;
  const nameOf = (id) => STATS.find((s) => s.id === id)?.name || id;
  return `${n.name} (${nameOf(n.up)}↑ ${nameOf(n.down)}↓)`;
}
