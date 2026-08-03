/**
 * 업적 배지 판정 규칙.
 * 규칙 추가 = RULES 에 한 줄 추가 (id 는 data/badges.js 와 맞출 것).
 *
 * ctx = {
 *   result,        // 이번 시즌 결과 (kpiScores, overall, perfect, ...)
 *   prev,          // 직전 시즌 결과 or null
 *   history,       // 이전 시즌 결과 배열 (오래된 → 최근)
 *   evolved,       // 이번 시즌에 진화했는지
 *   rankInSeason,  // 1부터
 * }
 */
import { CONFIG } from '../core/config.js';

export const RULES = [
  {
    id: 'perfect',
    test: (ctx) => ctx.result.perfect,
  },
  {
    id: 'overdrive',
    test: (ctx) => ctx.result.kpiScores.some((k) => k.raw >= CONFIG.badge.goldThreshold + 0.3),
  },
  {
    id: 'evolved',
    test: (ctx) => ctx.evolved,
  },
  {
    id: 'mvp',
    test: (ctx) => ctx.rankInSeason === 1,
  },
  {
    id: 'streak3',
    test: (ctx) => {
      const last = [...ctx.history.slice(-2), ctx.result];
      return last.length === 3 && last.every((r) => r.overall >= 1.0);
    },
  },
  {
    id: 'allrounder',
    test: (ctx) => {
      const scores = ctx.result.kpiScores.map((k) => k.score);
      if (!scores.length || Math.min(...scores) < 0.9) return false;
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const sd = Math.sqrt(scores.reduce((s, v) => s + (v - avg) ** 2, 0) / scores.length);
      return sd <= 0.15;
    },
  },
  {
    id: 'comeback',
    test: (ctx) => !!ctx.prev && ctx.result.overall - ctx.prev.overall >= 0.25,
  },
];

/** 이번 시즌에 새로 얻은 배지 id 목록 (체육관 배지는 배틀 승리로 별도 부여) */
export function evaluateBadges(ctx) {
  return RULES.filter((r) => {
    try {
      return r.test(ctx);
    } catch {
      return false;
    }
  }).map((r) => r.id);
}
