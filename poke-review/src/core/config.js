/**
 * 게임 밸런스 상수 — 수치 튜닝은 전부 이 파일에서 한다.
 * 규칙(로직)은 engine/, 데이터(사람·항목)는 data/ 에 있다.
 */
export const CONFIG = {
  /** 레벨 곡선: 누적EXP(L) = round(L^3 * k)  (포켓몬 medium-fast 계열) */
  level: {
    max: 100,
    k: 1.0,
    /** 진화 레벨 (species.line 에서 개별 지정 가능, 없으면 이 값 사용) */
    evolveAt: [16, 36],
  },

  /** 업적 → EXP 환산 */
  exp: {
    /** KPI 1개를 목표 100% 달성했을 때 주는 기본 EXP */
    basePerKpi: 400,
    /** 점수 상한(초과달성 인정 배율). 1.5 = 목표의 150%까지 인정 */
    scoreCap: 1.5,
    /** 목표 초과분에 곱하는 가중치 (1.0 초과 구간) */
    overAchieveWeight: 0.6,
    /** 전 항목 목표 달성 시 보너스 */
    perfectSeasonBonus: 800,
    /** 동일 KPI 연속 달성 1개월당 보너스 (최대 streakBonusCap) */
    streakBonusPerMonth: 60,
    streakBonusCap: 600,
    /** 배틀 결과 보상 */
    battleWin: 1200,
    battleLose: 400,
  },

  /** 업적 → 노력치(EV) 환산 */
  ev: {
    /** 점수 1.0 당 얻는 EV */
    scoreToEv: 40,
    /** 한 시즌에 한 스탯이 얻을 수 있는 상한 */
    perSeasonStatCap: 60,
    /** 스탯별 누적 상한 / 전체 누적 상한 (포켓몬 규칙) */
    statCap: 252,
    totalCap: 510,
  },

  /** 배틀 규칙 */
  battle: {
    turnLimit: 24,
    critChance: 0.0625,
    critMultiplier: 1.5,
    /** 데미지 난수 구간 */
    randMin: 0.85,
    randMax: 1.0,
    /** 자속 보정(Same Type Attack Bonus) */
    stab: 1.2,
    /** 기술 위력 = powerBase + 점수 * powerScale */
    powerBase: 40,
    powerScale: 60,
    /** 명중률 = min(1, accBase + 점수 * accScale) */
    accBase: 0.65,
    accScale: 0.35,
    /** 플레이어가 배틀에 들고 가는 기술 수 (점수 높은 KPI 순) */
    moveSlots: 4,
    /**
     * 보스 레벨 자동 스케일링.
     * 고정 레벨로 두면 초반엔 전패, 후반엔 전승이 된다.
     * 팀 평균 레벨 + offset 으로 맞춰 "이번 달 얼마나 했나"가 승패를 가르게 한다.
     * 시즌별로 season.bossLevel 을 지정하면 그 값이 우선한다.
     */
    bossScaling: { enabled: true, offset: 1, min: 5, max: 100 },
  },

  /** 배지 획득 기준 (달성률) */
  badge: {
    threshold: 1.0,
    /** 명예 배지(초과달성) 기준 */
    goldThreshold: 1.2,
  },

  /** 등급 컷 (시즌 종합 점수 → 등급) */
  grades: [
    { id: 'S', label: 'S', min: 1.2, color: '#ffd166' },
    { id: 'A', label: 'A', min: 1.0, color: '#06d6a0' },
    { id: 'B', label: 'B', min: 0.85, color: '#4cc9f0' },
    { id: 'C', label: 'C', min: 0.7, color: '#a0a8b8' },
    { id: 'D', label: 'D', min: 0, color: '#ef476f' },
  ],
};

/** 6스탯 정의 — KPI 영역과 1:1로 대응된다. */
export const STATS = [
  { id: 'hp', name: 'HP', full: '체력', desc: '학습·성장 누적' },
  { id: 'atk', name: '공격', full: '공격', desc: '성과 창출' },
  { id: 'def', name: '방어', full: '방어', desc: '품질·안정성' },
  { id: 'spa', name: '특공', full: '특수공격', desc: '창의·기획' },
  { id: 'spd', name: '특방', full: '특수방어', desc: '협업·신뢰' },
  { id: 'spe', name: '스피드', full: '스피드', desc: '실행 속도' },
];

export const STAT_IDS = STATS.map((s) => s.id);

/** 성격(Nature) — 한 스탯 +10%, 다른 한 스탯 -10% */
export const NATURES = [
  { id: 'hardy', name: '노력', up: null, down: null },
  { id: 'adamant', name: '고집', up: 'atk', down: 'spa' },
  { id: 'modest', name: '조심', up: 'spa', down: 'atk' },
  { id: 'bold', name: '대담', up: 'def', down: 'atk' },
  { id: 'calm', name: '차분', up: 'spd', down: 'atk' },
  { id: 'timid', name: '겁쟁이', up: 'spe', down: 'atk' },
  { id: 'brave', name: '용감', up: 'atk', down: 'spe' },
  { id: 'quiet', name: '냉정', up: 'spa', down: 'spe' },
  { id: 'relaxed', name: '무사태평', up: 'def', down: 'spe' },
];

export const NATURE_BY_ID = Object.fromEntries(NATURES.map((n) => [n.id, n]));

/** 시즌 종합 점수 → 등급 */
export function gradeOf(score) {
  return CONFIG.grades.find((g) => score >= g.min) || CONFIG.grades[CONFIG.grades.length - 1];
}
