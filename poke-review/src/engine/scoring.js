/**
 * 업적 기록 → 점수 / EXP / 노력치.
 * "이번 달 실적을 어떻게 게임 수치로 바꿀 것인가"의 전부가 여기 있다.
 */
import { CONFIG } from '../core/config.js';
import { KPIS, KPI_BY_ID, TOTAL_WEIGHT, TYPES } from '../data/kpi.js';
import { gradeOf } from '../core/config.js';

/** 이번 시즌에 적용될 KPI 목표치 (시즌별 override 지원) */
export function targetFor(kpi, season) {
  const t = season?.targets?.[kpi.id];
  return typeof t === 'number' && t > 0 ? t : kpi.target;
}

/**
 * 실적 1건 → 점수. 목표 대비 비율에 상한을 씌우고,
 * 초과분은 overAchieveWeight 만큼만 인정한다(무한 인플레 방지).
 */
export function scoreOf(value, target) {
  const raw = target > 0 ? value / target : 0;
  if (raw <= 1) return { raw, score: Math.max(0, raw) };
  const over = Math.min(raw, CONFIG.exp.scoreCap) - 1;
  return { raw, score: 1 + over * CONFIG.exp.overAchieveWeight };
}

/**
 * 한 멤버의 한 시즌 채점.
 * @param {object} season
 * @param {Record<string, number>} record  { kpiId: 실적 }
 * @param {Record<string, number>} streaks { kpiId: 직전까지 연속 달성 개월 }
 */
export function scoreSeason(season, record, streaks = {}) {
  /** @type {import('../core/types.js').KpiScore[]} */
  const kpiScores = KPIS.map((kpi) => {
    const value = Number(record?.[kpi.id] ?? 0);
    const target = targetFor(kpi, season);
    const { raw, score } = scoreOf(value, target);
    const cleared = raw >= CONFIG.badge.threshold;

    const streak = cleared ? streaks[kpi.id] || 0 : 0;
    const streakBonus = Math.min(
      CONFIG.exp.streakBonusCap,
      streak * CONFIG.exp.streakBonusPerMonth,
    );

    const exp = Math.round(score * kpi.weight * CONFIG.exp.basePerKpi + streakBonus);
    const ev = Math.min(
      CONFIG.ev.perSeasonStatCap,
      Math.round(score * CONFIG.ev.scoreToEv * kpi.weight),
    );

    return { kpiId: kpi.id, value, target, raw, score, exp, ev, cleared, streak, streakBonus };
  });

  const overall =
    kpiScores.reduce((s, k) => s + k.score * KPI_BY_ID[k.kpiId].weight, 0) / TOTAL_WEIGHT;

  const perfect = kpiScores.every((k) => k.cleared);
  const baseExp = kpiScores.reduce((s, k) => s + k.exp, 0);
  const bonusExp = perfect ? CONFIG.exp.perfectSeasonBonus : 0;

  return {
    kpiScores,
    overall,
    grade: gradeOf(overall),
    perfect,
    expFromKpi: baseExp,
    expBonus: bonusExp,
    evGains: evGainsFrom(kpiScores),
  };
}

/** KPI 점수 → 스탯별 노력치 */
export function evGainsFrom(kpiScores) {
  const gains = {};
  for (const ks of kpiScores) {
    const kpi = KPI_BY_ID[ks.kpiId];
    gains[kpi.stat] = (gains[kpi.stat] || 0) + ks.ev;
  }
  return gains;
}

/** 가장 잘한 영역 = 파트너 타입 자동 배정 근거 */
export function dominantType(kpiScores) {
  let best = null;
  for (const ks of kpiScores) {
    const kpi = KPI_BY_ID[ks.kpiId];
    const w = ks.score * kpi.weight;
    if (!best || w > best.w) best = { w, type: kpi.type };
  }
  return best ? best.type : Object.keys(TYPES)[0];
}

/** 배틀에 들고 갈 기술 = 점수 높은 KPI 상위 N개 */
export function movesFrom(kpiScores) {
  return [...kpiScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, CONFIG.battle.moveSlots)
    .map((ks) => {
      const kpi = KPI_BY_ID[ks.kpiId];
      return {
        kpiId: kpi.id,
        name: kpi.name,
        type: kpi.type,
        category: kpi.category,
        stat: kpi.stat,
        power: Math.round(CONFIG.battle.powerBase + ks.score * CONFIG.battle.powerScale),
        accuracy: Math.min(1, CONFIG.battle.accBase + ks.score * CONFIG.battle.accScale),
        score: ks.score,
      };
    });
}
