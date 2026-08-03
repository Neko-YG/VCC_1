/** 체육관 배틀 — 시즌 전적 목록 + 로그 재생 */
import { h, fmt } from '../dom.js';
import { panel, hpBar, emptyState, typeChip } from '../components.js';
import { spriteFor, bossSprite } from '../sprite.js';
import { movesFrom } from '../../engine/scoring.js';
import { navigate } from '../router.js';

export function BattleScreen({ league, params, seasonId }) {
  const sid = params.seasonId || seasonId;
  const report = league.bySeasonId[sid] || league.seasonReports.at(-1);
  if (!report) return emptyState('배틀 기록이 없습니다.');

  if (params.memberId) {
    const entry = report.entries.find((e) => e.memberId === params.memberId);
    if (!entry) return emptyState('해당 트레이너의 배틀 기록이 없습니다.');
    return BattleTheater(report, entry);
  }

  return h(
    'div',
    { class: 'screen' },
    panel(
      `${fmt.season(report.season.id)} 체육관 — ${report.boss.title} ${report.boss.name}`,
      h(
        'div',
        { class: 'bossheader' },
        bossSprite(report.boss, 120),
        h(
          'div',
          {},
          h('p', { class: 'bossheader__quote' }, `"${report.boss.quote}"`),
          h(
            'div',
            { class: 'bossheader__meta' },
            typeChip(report.boss.type),
            h('span', { class: 'chip' }, `Lv.${report.boss.level}`),
            h('span', { class: 'chip' }, `돌파율 ${fmt.pct(report.clearRate)}`),
          ),
        ),
      ),
    ),
    panel(
      '전적',
      h(
        'table',
        { class: 'table' },
        h(
          'thead',
          {},
          h('tr', {}, h('th', {}, '트레이너'), h('th', {}, '파트너'), h('th', {}, 'Lv'), h('th', {}, '결과'), h('th', {}, '턴'), h('th', {}, '남은 HP'), h('th', {}, '')),
        ),
        h(
          'tbody',
          {},
          report.entries.map((e) =>
            h(
              'tr',
              {},
              h('td', {}, e.member.name),
              h('td', {}, e.form.name),
              h('td', {}, e.progress.level),
              h('td', {}, h('span', { class: e.battle.win ? 'win' : 'lose' }, e.battle.win ? '승리' : e.battle.draw ? '무승부' : '패배')),
              h('td', {}, e.battle.turns),
              h('td', {}, fmt.pct(e.battle.playerHpLeft)),
              h(
                'td',
                {},
                h('button', { class: 'btn btn--sm', onClick: () => navigate(`/battle/${sid}/${e.memberId}`) }, '재생'),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/** 로그를 한 줄씩 재생하는 배틀 화면 */
function BattleTheater(report, entry) {
  const { battle, member, species, form, progress } = entry;
  const log = battle.log;
  let idx = 0;

  const playerHp = hpBar(1, `${form.name}  Lv.${progress.level}`);
  const foeHp = hpBar(1, `${battle.foe.name}  Lv.${battle.foe.level}`);
  const textBox = h('div', { class: 'dialog__text' }, log[0].text);
  const playerSprite = h(
    'div',
    { class: 'stage__player' },
    spriteFor({ speciesId: species.id, type: species.type, stage: form.stage, size: 128 }),
  );
  const foeSprite = h('div', { class: 'stage__foe' }, bossSprite(report.boss, 120));

  const setHp = (bar, ratio) => {
    const fill = bar.querySelector('.hpbar__fill');
    const track = bar.querySelector('.hpbar__track');
    fill.style.width = `${Math.max(0, ratio) * 100}%`;
    track.classList.remove('hpbar--ok', 'hpbar--warn', 'hpbar--danger');
    track.classList.add(ratio > 0.5 ? 'hpbar--ok' : ratio > 0.2 ? 'hpbar--warn' : 'hpbar--danger');
  };

  const step = () => {
    if (idx >= log.length - 1) return false;
    idx++;
    const line = log[idx];
    textBox.textContent = line.text;
    if (typeof line.playerHp === 'number') setHp(playerHp, line.playerHp);
    if (typeof line.foeHp === 'number') setHp(foeHp, line.foeHp);
    const hitSide = line.kind === 'player' ? foeSprite : line.kind === 'foe' ? playerSprite : null;
    if (hitSide && line.dmg > 0) {
      hitSide.classList.remove('is-hit');
      void hitSide.offsetWidth;
      hitSide.classList.add('is-hit');
    }
    return true;
  };

  let timer = null;
  const autoplay = () => {
    stop();
    timer = setInterval(() => {
      if (!root.isConnected || !step()) stop();
    }, 900);
  };
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  const skipAll = () => {
    stop();
    while (step());
  };

  const root = h(
    'div',
    { class: 'screen screen--battle' },
    h(
      'button',
      { class: 'btn btn--ghost btn--sm', onClick: () => (stop(), navigate(`/battle/${report.season.id}`)) },
      '← 전적으로',
    ),
    h(
      'div',
      { class: 'stage' },
      h('div', { class: 'stage__row stage__row--foe' }, h('div', { class: 'stage__hp' }, foeHp), foeSprite),
      h('div', { class: 'stage__row stage__row--player' }, playerSprite, h('div', { class: 'stage__hp' }, playerHp)),
    ),
    h(
      'div',
      { class: 'dialog' },
      textBox,
      h(
        'div',
        { class: 'dialog__actions' },
        h('button', { class: 'btn btn--sm', onClick: step }, '▶ 다음'),
        h('button', { class: 'btn btn--sm', onClick: autoplay }, '자동 재생'),
        h('button', { class: 'btn btn--sm btn--ghost', onClick: skipAll }, '끝까지'),
      ),
    ),
    panel(
      '사용 기술 (점수 상위 KPI)',
      h(
        'div',
        { class: 'movelist' },
        movesFrom(entry.kpiScores).map((mv) =>
          h(
            'div',
            { class: 'move' },
            h('div', { class: 'move__head' }, typeChip(mv.type, { small: true }), h('strong', {}, mv.name)),
            h(
              'div',
              { class: 'move__meta' },
              h('span', {}, `위력 ${mv.power}`),
              h('span', {}, `명중 ${fmt.pct(mv.accuracy)}`),
              h('span', {}, mv.category === 'physical' ? '물리' : '특수'),
            ),
          ),
        ),
      ),
      h('p', { class: 'hint' }, `${member.name}의 이번 달 실적이 곧 기술의 위력과 명중률이 된다.`),
    ),
  );

  // 화면을 떠나면 타이머 정리
  const observer = new MutationObserver(() => {
    if (!root.isConnected) {
      stop();
      observer.disconnect();
    }
  });
  queueMicrotask(() => {
    if (root.parentNode) observer.observe(root.parentNode, { childList: true });
  });

  return root;
}
