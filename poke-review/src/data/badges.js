/**
 * 배지 = 그 달에 무엇을 증명했는지에 대한 기록.
 * gym  : 월간 보스(체육관 관장)를 이기면 획득
 * achievement : engine/badges.js 의 규칙으로 자동 판정
 */

/** @type {import('../core/types.js').Badge[]} */
export const BADGES = [
  // 체육관 배지 (보스 1인당 1개)
  { id: 'flame', name: '화염 배지', icon: '🔥', kind: 'gym', desc: '성과 목표를 정면으로 넘겼다' },
  { id: 'iron', name: '강철 배지', icon: '🛡️', kind: 'gym', desc: '품질 기준을 지켜냈다' },
  { id: 'mind', name: '사념 배지', icon: '🔮', kind: 'gym', desc: '새로운 방식을 증명했다' },
  { id: 'tide', name: '조수 배지', icon: '🌊', kind: 'gym', desc: '팀을 움직였다' },
  { id: 'volt', name: '전격 배지', icon: '⚡', kind: 'gym', desc: '누구보다 빨리 끝냈다' },
  { id: 'leaf', name: '초록 배지', icon: '🌱', kind: 'gym', desc: '스스로를 키웠다' },

  // 업적 배지 (규칙 자동 판정 — engine/badges.js 의 RULES 와 id 가 맞아야 한다)
  { id: 'perfect', name: '퍼펙트', icon: '💯', kind: 'achievement', desc: '전 항목 목표 달성' },
  { id: 'streak3', name: '연속 3', icon: '🔗', kind: 'achievement', desc: '3개월 연속 종합 A 이상' },
  { id: 'overdrive', name: '오버드라이브', icon: '🚀', kind: 'achievement', desc: '한 항목 150% 이상 달성' },
  { id: 'evolved', name: '진화', icon: '✨', kind: 'achievement', desc: '파트너가 진화했다' },
  { id: 'mvp', name: 'MVP', icon: '👑', kind: 'achievement', desc: '해당 시즌 종합 1위' },
  { id: 'allrounder', name: '올라운더', icon: '🎯', kind: 'achievement', desc: '전 항목 0.9 이상, 편차 작음' },
  { id: 'comeback', name: '리바운드', icon: '📈', kind: 'achievement', desc: '전월 대비 종합 +0.25 이상' },
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));
