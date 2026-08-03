/**
 * 밸런스 점검 / 회귀 확인용 스크립트 (브라우저 없이 엔진만 돌린다).
 *   node poke-review/tools/smoke.js
 *
 * 수치를 바꾼 뒤 이 출력이 납득되는지 보는 용도. 실패하면 0이 아닌 코드로 종료한다.
 */
import { makeSeedState } from '../src/data/seed.js';
import { evaluateAll } from '../src/engine/evaluate.js';
import { totalExpForLevel, levelFromExp } from '../src/engine/leveling.js';
import { CONFIG } from '../src/core/config.js';
import { MAPS, validateMaps } from '../src/game/world/maps.js';
import { TILES, isSolid } from '../src/game/world/tiles.js';

let failed = 0;
const check = (label, cond, extra = '') => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) failed++;
};

const state = makeSeedState();
const league = evaluateAll(state);

console.log('\n= 레벨 곡선 =');
for (const lv of [5, 16, 36, 50, 100]) {
  console.log(`  Lv.${String(lv).padStart(3)}  누적 ${totalExpForLevel(lv).toLocaleString()} EXP`);
}

console.log('\n= 시즌별 결과 =');
for (const r of league.seasonReports) {
  console.log(`\n[${r.season.id}] ${r.season.title}  vs ${r.boss.title} ${r.boss.name}(Lv.${r.boss.level})`);
  console.log(`  팀 평균 ${r.teamAverage.toFixed(2)} · 돌파율 ${(r.clearRate * 100).toFixed(0)}%`);
  for (const e of r.ranking) {
    console.log(
      `   ${String(e.rank).padStart(2)}. ${e.member.name.padEnd(4)} ` +
        `${e.form.name.padEnd(5)} Lv.${String(e.progress.level).padStart(2)} ` +
        `종합 ${e.overall.toFixed(2)}(${e.grade.label}) ` +
        `+${String(e.expGained).padStart(5)}EXP ` +
        `${e.battle.win ? '승' : e.battle.draw ? '무' : '패'} ` +
        `${e.newBadges.length ? '배지:' + e.newBadges.join(',') : ''}`,
    );
  }
}

console.log('\n= 명예의 전당 =');
league.hallOfFame.forEach((x, i) =>
  console.log(`  #${i + 1} ${x.member.name} Lv.${x.result.progress.level} ${x.result.totalExp.toLocaleString()} EXP`),
);

console.log('\n= 검증 =');
const last = league.seasonReports.at(-1);
check('시즌이 계산되었다', league.seasonReports.length === state.seasons.length);
check('모든 멤버에게 결과가 있다', last.entries.length === state.members.length);
check('EXP 는 시즌이 지나며 증가한다', league.seasonReports[0].entries[0].totalExp < last.entries[0].totalExp);
check(
  '레벨 계산이 곡선과 일치한다',
  last.entries.every((e) => e.progress.level === levelFromExp(e.totalExp)),
);
check(
  '노력치 총합이 상한을 넘지 않는다',
  last.entries.every((e) => Object.values(e.evs).reduce((a, b) => a + b, 0) <= CONFIG.ev.totalCap),
  `최대 ${Math.max(...last.entries.map((e) => Object.values(e.evs).reduce((a, b) => a + b, 0)))}`,
);
check(
  '배틀은 결정론적이다 (두 번 계산해도 동일)',
  JSON.stringify(evaluateAll(state).bySeasonId[last.season.id].ranking.map((e) => [e.memberId, e.battle.win, e.battle.turns])) ===
    JSON.stringify(last.ranking.map((e) => [e.memberId, e.battle.win, e.battle.turns])),
);
check('랭킹 1위는 MVP 배지를 받는다', last.ranking[0].badges.includes('mvp'));
check('한 명 이상 체육관을 돌파했다', last.entries.some((e) => e.battle.win));

console.log('\n= 맵 =');
const mapProblems = validateMaps();
for (const [id, map] of Object.entries(MAPS)) {
  console.log(`  ${id.padEnd(5)} ${map.rows[0].length}×${map.rows.length}  NPC ${map.npcs.length}명  워프 ${map.warps.length}개`);
}
check('맵 줄 길이/워프 대상이 모두 정상', mapProblems.length === 0, mapProblems.join(' / '));
check(
  '맵의 모든 글자가 정의된 타일',
  Object.values(MAPS).every((m) => m.rows.every((r) => [...r].every((c) => TILES[c]))),
);
check(
  '시작 위치와 NPC 자리가 막혀 있지 않다',
  Object.values(MAPS).every(
    (m) => !isSolid(m, m.spawn.x, m.spawn.y) && m.npcs.every((n) => !isSolid(m, n.x, n.y)),
  ),
);
check(
  '워프 도착지도 서 있을 수 있는 칸',
  Object.values(MAPS).every((m) => m.warps.every((w) => !isSolid(MAPS[w.to], w.tx, w.ty))),
);

console.log(failed ? `\n${failed}개 실패\n` : '\n전부 통과\n');
process.exit(failed ? 1 : 0);
