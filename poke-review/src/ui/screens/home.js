/** 홈 — 이번 시즌 요약 대시보드 */
import { h, fmt } from '../dom.js';
import { panel, memberCard, statLine, emptyState, badgeChip, typeChip } from '../components.js';
import { bossSprite } from '../sprite.js';
import { navigate } from '../router.js';

export function HomeScreen({ league, state, seasonId }) {
  const report = league.bySeasonId[seasonId] || league.seasonReports.at(-1);
  if (!report) {
    return emptyState(
      '아직 시즌이 없습니다. 관리자 화면에서 이번 달을 만들어 주세요.',
      h('button', { class: 'btn btn--primary', onClick: () => navigate('/admin') }, '관리자로 이동'),
    );
  }

  const { season, boss, entries, ranking } = report;
  const mvp = ranking[0];
  const evolvedList = entries.filter((e) => e.evolved);
  const newBadges = entries.flatMap((e) => e.newBadges.map((b) => ({ e, b })));

  return h(
    'div',
    { class: 'screen screen--home' },
    h(
      'header',
      { class: 'hero' },
      h(
        'div',
        { class: 'hero__text' },
        h('p', { class: 'hero__eyebrow' }, state.settings.orgName || '트레이너 리그'),
        h('h1', { class: 'hero__title' }, season.title || fmt.season(season.id)),
        h('p', { class: 'hero__desc' }, `이번 달 체육관: ${boss.title} ${boss.name} (Lv.${boss.level})`),
        h(
          'div',
          { class: 'hero__actions' },
          h('button', { class: 'btn btn--primary', onClick: () => navigate(`/battle/${season.id}`) }, '체육관 전적 보기'),
          h('button', { class: 'btn', onClick: () => navigate('/dex') }, '트레이너 도감'),
        ),
      ),
      h('div', { class: 'hero__boss' }, bossSprite(boss, 128), h('p', { class: 'hero__quote' }, `"${boss.quote}"`)),
    ),

    h(
      'div',
      { class: 'grid grid--summary' },
      panel(
        '시즌 요약',
        statLine('팀 평균 종합', fmt.score(report.teamAverage)),
        statLine('체육관 돌파율', fmt.pct(report.clearRate)),
        statLine('참가 트레이너', `${entries.length}명`),
        statLine('이번 달 타입', typeChip(boss.type)),
      ),
      panel(
        '이달의 MVP',
        mvp
          ? h(
              'div',
              { class: 'mvp' },
              h('strong', { class: 'mvp__name' }, `${mvp.member.name} · ${mvp.form.name}`),
              h('p', { class: 'mvp__desc' }, `종합 ${fmt.score(mvp.overall)} · Lv.${mvp.progress.level} · +${fmt.num(mvp.expGained)} EXP`),
              h('button', { class: 'btn btn--sm', onClick: () => navigate(`/dex/${mvp.memberId}`) }, '상세 보기'),
            )
          : h('p', {}, '기록 없음'),
      ),
      panel(
        '이번 달 하이라이트',
        h(
          'ul',
          { class: 'highlights' },
          evolvedList.map((e) => h('li', {}, `✨ ${e.member.name}의 파트너가 ${e.form.name}(으)로 진화!`)),
          newBadges
            .slice(0, 6)
            .map(({ e, b }) => h('li', {}, h('span', {}, `${e.member.name} `), badgeChip(b))),
          !evolvedList.length && !newBadges.length ? h('li', {}, '조용한 달이었다.') : null,
        ),
      ),
    ),

    panel(
      '파티 현황',
      h(
        'div',
        { class: 'grid grid--cards' },
        entries.map((e) => memberCard(e, { onClick: (r) => navigate(`/dex/${r.memberId}`) })),
      ),
    ),
  );
}
