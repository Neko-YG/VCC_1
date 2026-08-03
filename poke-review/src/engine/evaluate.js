/**
 * 파이프라인 오케스트레이션.
 * 시즌을 오래된 순서대로 재생(replay)하면서 누적 EXP·노력치·배지·연속기록을 쌓는다.
 * 화면(ui/)은 이 함수의 결과만 읽는다 — 계산 로직이 UI로 새어나가지 않게.
 */
import { CONFIG, STAT_IDS } from '../core/config.js';
import { rollIvs } from '../core/rng.js';
import { KPI_BY_ID } from '../data/kpi.js';
import { BOSS_BY_ID, BOSSES } from '../data/bosses.js';
import { scoreSeason, dominantType, movesFrom } from './scoring.js';
import { calcStats, emptyEvs, addEvs } from './stats.js';
import { levelProgress, levelFromExp, resolveSpecies, formAt } from './leveling.js';
import { runBattle } from './battle.js';
import { evaluateBadges } from './badges.js';

const sortSeasons = (seasons) => [...seasons].sort((a, b) => String(a.id).localeCompare(String(b.id)));

/**
 * 전체 리그 계산.
 * @param {{members:any[], seasons:any[]}} state
 */
export function evaluateAll(state) {
  const members = state.members || [];
  const seasons = sortSeasons(state.seasons || []);

  /** 멤버별 누적 상태 */
  const carry = new Map(
    members.map((m) => [
      m.id,
      {
        totalExp: 0,
        evs: emptyEvs(),
        streaks: {},
        badges: new Set(),
        history: [],
        results: [],
      },
    ]),
  );

  const seasonReports = [];

  for (const season of seasons) {
    const bossDef = BOSS_BY_ID[season.bossId] || BOSSES[0];
    const entries = [];

    // 1차: 점수 → EXP/노력치 → 레벨/스탯
    for (const member of members) {
      const c = carry.get(member.id);
      const record = season.records?.[member.id] || {};
      const scored = scoreSeason(season, record, c.streaks);

      const ivs = rollIvs(member.id, STAT_IDS);
      const species = resolveSpecies(member, dominantType(scored.kpiScores));

      const levelBefore = levelFromExp(c.totalExp);

      // 업적 EXP·노력치 반영
      const expFromWork = scored.expFromKpi + scored.expBonus;
      const evResult = addEvs(c.evs, scored.evGains, CONFIG.ev);
      const expAfterWork = c.totalExp + expFromWork;
      const levelAfterWork = levelFromExp(expAfterWork);

      entries.push({
        memberId: member.id,
        member,
        seasonId: season.id,
        species,
        ivs,
        ...scored,
        expFromWork,
        levelBefore,
        levelAfterWork,
        evs: evResult.evs,
        evApplied: evResult.applied,
        statsForBattle: calcStats({
          base: species.base,
          ivs,
          evs: evResult.evs,
          level: levelAfterWork,
          natureId: member.natureId,
        }),
      });
    }

    // 2차: 체육관 배틀 (관장 레벨은 팀 평균에 맞춰 스케일링)
    const boss = { ...bossDef, level: resolveBossLevel(bossDef, season, entries) };

    for (const e of entries) {
      const battle = runBattle(
        {
          name: formAt(e.species, e.levelAfterWork).name,
          level: e.levelAfterWork,
          type: e.species.type,
          stats: e.statsForBattle,
          moves: movesFrom(e.kpiScores),
        },
        boss,
        `${season.id}:${e.memberId}`,
      );

      const totalExp = c0(carry, e.memberId).totalExp + e.expFromWork + battle.expReward;
      const progress = levelProgress(totalExp);
      const form = formAt(e.species, progress.level);

      Object.assign(e, {
        battle,
        expFromBattle: battle.expReward,
        expGained: e.expFromWork + battle.expReward,
        totalExp,
        progress,
        form,
        stats: calcStats({
          base: e.species.base,
          ivs: e.ivs,
          evs: e.evs,
          level: progress.level,
          natureId: e.member.natureId,
        }),
        evolved: form.stage > formAt(e.species, e.levelBefore).stage,
      });
      delete e.statsForBattle;
    }

    // 3차: 랭킹이 필요한 판정(배지) — 종합점수 내림차순
    const ranking = [...entries].sort((a, b) => b.overall - a.overall || b.totalExp - a.totalExp);
    ranking.forEach((e, i) => {
      e.rank = i + 1;
    });

    for (const e of entries) {
      const c = carry.get(e.memberId);
      const gained = evaluateBadges({
        result: e,
        prev: c.history[c.history.length - 1] || null,
        history: c.history,
        evolved: e.evolved,
        rankInSeason: e.rank,
      });
      if (e.battle.win && e.battle.foe.badgeId) gained.push(e.battle.foe.badgeId);

      e.newBadges = gained.filter((id) => !c.badges.has(id));
      e.newBadges.forEach((id) => c.badges.add(id));
      e.badges = [...c.badges];

      // 누적 상태 갱신
      c.totalExp = e.totalExp;
      c.evs = e.evs;
      c.streaks = nextStreaks(c.streaks, e.kpiScores);
      c.history.push(e);
      c.results.push(e);
    }

    seasonReports.push({
      season,
      boss,
      entries,
      ranking,
      teamAverage: entries.length
        ? entries.reduce((s, e) => s + e.overall, 0) / entries.length
        : 0,
      clearRate: entries.length ? entries.filter((e) => e.battle.win).length / entries.length : 0,
    });
  }

  const bySeasonId = Object.fromEntries(seasonReports.map((r) => [r.season.id, r]));
  const timelines = Object.fromEntries([...carry].map(([id, c]) => [id, c.results]));
  const latest = Object.fromEntries(
    [...carry].map(([id, c]) => [id, c.results[c.results.length - 1] || null]),
  );

  return {
    members,
    seasons,
    seasonReports,
    bySeasonId,
    timelines,
    latest,
    /** 명예의 전당: 누적 EXP 순 */
    hallOfFame: members
      .map((m) => ({ member: m, result: latest[m.id] }))
      .filter((x) => x.result)
      .sort((a, b) => b.result.totalExp - a.result.totalExp),
  };
}

const c0 = (carry, memberId) => carry.get(memberId);

/**
 * 이번 달 관장 레벨.
 * 우선순위: season.bossLevel(수동) > 팀 평균 + offset(자동) > bosses.js 의 기본값
 */
export function resolveBossLevel(bossDef, season, entries) {
  if (typeof season.bossLevel === 'number' && season.bossLevel > 0) return season.bossLevel;
  const cfg = CONFIG.battle.bossScaling;
  if (!cfg.enabled || !entries.length) return bossDef.level;
  const avg = entries.reduce((s, e) => s + e.levelAfterWork, 0) / entries.length;
  return Math.max(cfg.min, Math.min(cfg.max, Math.round(avg + (season.bossLevelOffset ?? cfg.offset))));
}

/** KPI별 연속 달성 개월 수 갱신 */
function nextStreaks(prev, kpiScores) {
  const out = {};
  for (const ks of kpiScores) {
    out[ks.kpiId] = ks.cleared ? (prev[ks.kpiId] || 0) + 1 : 0;
  }
  return out;
}

/** 한 멤버의 KPI별 시즌 추이 (그래프용) */
export function trendOf(timeline, kpiId) {
  return timeline.map((r) => {
    const ks = r.kpiScores.find((k) => k.kpiId === kpiId);
    return { seasonId: r.seasonId, score: ks ? ks.score : 0, value: ks ? ks.value : 0 };
  });
}

export function kpiLabel(kpiId) {
  return KPI_BY_ID[kpiId]?.name || kpiId;
}
