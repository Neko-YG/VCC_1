/** 트레이너 상세 — 스탯 / 이번 달 업적 / 배지 / 성장 추이 */
import { h, svg, fmt } from '../dom.js';
import {
  panel,
  radar,
  statBars,
  expBar,
  kpiRow,
  badgeChip,
  typeChip,
  gradeChip,
  statLine,
  emptyState,
  natureLabel,
} from '../components.js';
import { spriteFor } from '../sprite.js';
import { STATS } from '../../core/config.js';
import { TYPES } from '../../data/kpi.js';
import { navigate } from '../router.js';
import { store } from '../../core/store.js';

export function DetailScreen({ league, params, seasonId }) {
  const memberId = params.id;
  const timeline = league.timelines[memberId] || [];
  const result = timeline.find((r) => r.seasonId === seasonId) || timeline.at(-1);
  if (!result) return emptyState('해당 트레이너의 기록이 없습니다.');

  const { member, species, form, progress, stats, evs, ivs, grade } = result;
  const season = league.bySeasonId[result.seasonId].season;
  const color = TYPES[species.type].color;

  return h(
    'div',
    { class: 'screen screen--detail', style: { '--type': color } },
    h(
      'button',
      { class: 'btn btn--ghost btn--sm', onClick: () => navigate('/dex') },
      '← 도감으로',
    ),

    h(
      'div',
      { class: 'profile' },
      h(
        'div',
        { class: 'profile__sprite' },
        spriteFor({ speciesId: species.id, type: species.type, stage: form.stage, size: 168 }),
        h('div', { class: 'profile__stage' }, `${form.stage} / ${form.stageCount} 단계`),
      ),
      h(
        'div',
        { class: 'profile__info' },
        h('h1', {}, member.name, h('span', { class: 'profile__form' }, ` · ${form.name}`)),
        h('p', { class: 'profile__tagline' }, `"${form.tagline}"`),
        h(
          'div',
          { class: 'profile__chips' },
          typeChip(species.type),
          gradeChip(grade),
          h('span', { class: 'chip' }, member.role || '직무 미지정'),
          h('span', { class: 'chip' }, member.team || '소속 미지정'),
          h('span', { class: 'chip' }, natureLabel(member.natureId)),
        ),
        expBar(progress),
        h(
          'div',
          { class: 'profile__stats' },
          statLine('누적 EXP', fmt.num(result.totalExp)),
          statLine('이번 달 획득', `+${fmt.num(result.expGained)}`),
          statLine('종합 점수', fmt.score(result.overall)),
          statLine(
            '다음 진화',
            form.isFinal ? '최종 단계' : `${form.nextName} (Lv.${form.nextAt})`,
          ),
        ),
      ),
    ),

    h(
      'div',
      { class: 'grid grid--two' },
      panel(
        '능력치',
        h('div', { class: 'radarwrap' }, radar(stats, { color })),
        statBars(stats),
        h(
          'details',
          { class: 'details' },
          h('summary', {}, '개체값 / 노력치 자세히'),
          h(
            'table',
            { class: 'table table--sm' },
            h(
              'thead',
              {},
              h('tr', {}, h('th', {}, '스탯'), h('th', {}, '종족값'), h('th', {}, '개체값'), h('th', {}, '노력치'), h('th', {}, '실제')),
            ),
            h(
              'tbody',
              {},
              STATS.map((s) =>
                h(
                  'tr',
                  {},
                  h('td', {}, s.name),
                  h('td', {}, species.base[s.id]),
                  h('td', {}, ivs[s.id]),
                  h('td', {}, evs[s.id] || 0),
                  h('td', {}, h('strong', {}, stats[s.id])),
                ),
              ),
            ),
          ),
          h('p', { class: 'hint' }, '종족값=파트너 재능(고정) · 개체값=타고난 편차(고정) · 노력치=업적으로 쌓은 값(변동)'),
        ),
      ),
      panel(
        `${fmt.season(result.seasonId)} 업적`,
        h('div', { class: 'kpilist' }, result.kpiScores.map(kpiRow)),
        h(
          'div',
          { class: 'summaryrow' },
          h('span', {}, `업적 EXP +${fmt.num(result.expFromWork)}`),
          h('span', {}, `배틀 EXP +${fmt.num(result.expFromBattle)}`),
          result.perfect ? h('span', { class: 'tag tag--gold' }, '퍼펙트 보너스') : null,
        ),
        h(
          'div',
          { class: 'battlecard' },
          h('strong', {}, `${result.battle.foe.name} 전`),
          h('span', { class: result.battle.win ? 'win' : 'lose' }, result.battle.win ? '승리' : result.battle.draw ? '무승부' : '패배'),
          h('button', { class: 'btn btn--sm', onClick: () => navigate(`/battle/${result.seasonId}/${memberId}`) }, '배틀 재생'),
        ),
        h(
          'label',
          { class: 'field' },
          h('span', {}, '평가 코멘트'),
          h('textarea', {
            rows: 3,
            placeholder: '리더 코멘트를 남겨주세요.',
            value: season.notes?.[memberId] || '',
            onChange: (e) => store.setNote(result.seasonId, memberId, e.target.value),
          }),
        ),
      ),
    ),

    panel(
      '배지',
      result.badges.length
        ? h('div', { class: 'badgelist' }, result.badges.map((b) => badgeChip(b)))
        : h('p', { class: 'hint' }, '아직 배지가 없습니다.'),
      result.newBadges.length
        ? h('p', { class: 'hint' }, `이번 달 신규: ${result.newBadges.length}개`)
        : null,
    ),

    panel('성장 추이', trendChart(timeline, color), evolutionLine(species, progress.level)),
  );
}

/** 시즌별 종합점수 꺾은선 */
function trendChart(timeline, color) {
  const W = 640;
  const H = 180;
  const pad = 32;
  if (timeline.length < 2) return h('p', { class: 'hint' }, '시즌이 2개 이상 쌓이면 추이가 표시됩니다.');

  const xs = (i) => pad + (i * (W - pad * 2)) / (timeline.length - 1);
  // 데이터 폭에 맞춰 y축을 잡는다 (0부터 그리면 선이 납작해져 추이가 안 보인다)
  const values = timeline.map((r) => r.overall);
  const lo = Math.min(0.85, ...values) - 0.08;
  const hi = Math.max(1.15, ...values) + 0.08;
  const ys = (v) => H - pad - ((v - lo) / (hi - lo)) * (H - pad * 2);

  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'trend', preserveAspectRatio: 'none' });
  // 기준선 1.0
  root.appendChild(svg('line', { x1: pad, x2: W - pad, y1: ys(1), y2: ys(1), class: 'trend__base' }));
  root.appendChild(
    svg('polyline', {
      points: timeline.map((r, i) => `${xs(i)},${ys(r.overall)}`).join(' '),
      class: 'trend__line',
      style: `--c:${color}`,
    }),
  );
  timeline.forEach((r, i) => {
    root.appendChild(svg('circle', { cx: xs(i), cy: ys(r.overall), r: 4, class: 'trend__dot', style: `--c:${color}` }));
    const t = svg('text', { x: xs(i), y: H - 8, class: 'trend__label', 'text-anchor': 'middle' });
    t.textContent = r.seasonId.slice(5) + '월';
    root.appendChild(t);
    const v = svg('text', { x: xs(i), y: ys(r.overall) - 10, class: 'trend__value', 'text-anchor': 'middle' });
    v.textContent = fmt.score(r.overall);
    root.appendChild(v);
  });
  return h('div', { class: 'trendwrap' }, root);
}

/** 진화 라인 표시 */
function evolutionLine(species, level) {
  return h(
    'div',
    { class: 'evoline' },
    species.line.map((entry, i) => {
      const unlocked = level >= entry.minLevel;
      return h(
        'div',
        { class: `evoline__item ${unlocked ? 'is-on' : ''}` },
        spriteFor({ speciesId: species.id, type: species.type, stage: i + 1, size: 64, animate: false }),
        h('strong', {}, entry.name),
        h('span', { class: 'hint' }, `Lv.${entry.minLevel}`),
      );
    }),
  );
}
