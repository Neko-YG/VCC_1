/** 리그 — 시즌 랭킹 + 명예의 전당 + 배지 현황 */
import { h, fmt } from '../dom.js';
import { panel, emptyState, badgeChip, gradeChip, typeChip } from '../components.js';
import { spriteFor } from '../sprite.js';
import { BADGES } from '../../data/badges.js';
import { KPIS } from '../../data/kpi.js';
import { navigate } from '../router.js';

export function LeagueScreen({ league, seasonId }) {
  const report = league.bySeasonId[seasonId] || league.seasonReports.at(-1);
  if (!report) return emptyState('집계할 시즌이 없습니다.');

  return h(
    'div',
    { class: 'screen' },
    panel(
      `${fmt.season(report.season.id)} 랭킹`,
      h(
        'table',
        { class: 'table table--rank' },
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            h('th', {}, '#'),
            h('th', {}, '트레이너'),
            h('th', {}, '종합'),
            h('th', {}, '등급'),
            h('th', {}, 'Lv'),
            h('th', {}, '획득 EXP'),
            h('th', {}, '체육관'),
            h('th', {}, '신규 배지'),
          ),
        ),
        h(
          'tbody',
          {},
          report.ranking.map((e) =>
            h(
              'tr',
              { class: 'is-clickable', onClick: () => navigate(`/dex/${e.memberId}`) },
              h('td', { class: 'rank' }, medal(e.rank)),
              h('td', {}, h('strong', {}, e.member.name), h('span', { class: 'hint' }, ` ${e.form.name}`)),
              h('td', {}, fmt.score(e.overall)),
              h('td', {}, gradeChip(e.grade)),
              h('td', {}, e.progress.level),
              h('td', {}, `+${fmt.num(e.expGained)}`),
              h('td', {}, h('span', { class: e.battle.win ? 'win' : 'lose' }, e.battle.win ? '돌파' : '실패')),
              h('td', {}, e.newBadges.map((b) => badgeChip(b, { showName: false }))),
            ),
          ),
        ),
      ),
    ),

    panel(
      '명예의 전당 (누적 EXP)',
      h(
        'div',
        { class: 'hof' },
        league.hallOfFame.slice(0, 8).map((x, i) =>
          h(
            'div',
            { class: `hof__item ${i === 0 ? 'is-top' : ''}`, onClick: () => navigate(`/dex/${x.member.id}`) },
            h('span', { class: 'hof__rank' }, `#${i + 1}`),
            spriteFor({
              speciesId: x.result.species.id,
              type: x.result.species.type,
              stage: x.result.form.stage,
              size: 72,
              animate: false,
            }),
            h('strong', {}, x.member.name),
            h('span', { class: 'hint' }, `Lv.${x.result.progress.level} · ${fmt.num(x.result.totalExp)} EXP`),
            typeChip(x.result.species.type, { small: true }),
          ),
        ),
      ),
    ),

    panel('KPI별 팀 평균', teamKpiTable(report)),

    panel(
      '배지 도감',
      h(
        'div',
        { class: 'badgegrid' },
        BADGES.map((b) => {
          const owners = league.members.filter((m) => league.latest[m.id]?.badges.includes(b.id));
          return h(
            'div',
            { class: `badgecard ${owners.length ? 'is-owned' : ''}` },
            h('div', { class: 'badgecard__icon' }, b.icon),
            h('strong', {}, b.name),
            h('span', { class: 'hint' }, b.desc),
            h('span', { class: 'badgecard__owners' }, owners.length ? owners.map((o) => o.name).join(', ') : '미획득'),
          );
        }),
      ),
    ),
  );
}

function medal(rank) {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
}

function teamKpiTable(report) {
  const rows = KPIS.map((kpi) => {
    const scores = report.entries.map((e) => e.kpiScores.find((k) => k.kpiId === kpi.id));
    const avg = scores.reduce((s, k) => s + (k?.score || 0), 0) / Math.max(1, scores.length);
    const clear = scores.filter((k) => k?.cleared).length;
    return { kpi, avg, clear, total: scores.length };
  });
  return h(
    'table',
    { class: 'table' },
    h('thead', {}, h('tr', {}, h('th', {}, '항목'), h('th', {}, '영역'), h('th', {}, '팀 평균 점수'), h('th', {}, '달성 인원'))),
    h(
      'tbody',
      {},
      rows.map((r) =>
        h(
          'tr',
          {},
          h('td', {}, r.kpi.name),
          h('td', {}, typeChip(r.kpi.type, { small: true })),
          h('td', {}, fmt.score(r.avg)),
          h('td', {}, `${r.clear} / ${r.total}`),
        ),
      ),
    ),
  );
}
