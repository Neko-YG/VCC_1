/**
 * 평가 영역(타입)과 평가 항목(KPI) 정의.
 * ─ 항목을 추가/수정할 땐 KPIS 배열만 손대면 나머지 화면이 전부 따라온다.
 */

/** 타입 = 평가 영역. 스탯과 1:1 대응. */
export const TYPES = {
  fire: { id: 'fire', name: '불꽃', domain: '성과', stat: 'atk', color: '#ff7043', desc: '매출·목표 달성 등 직접 성과' },
  steel: { id: 'steel', name: '강철', domain: '품질', stat: 'def', color: '#90a4ae', desc: '완성도·장애·리스크 관리' },
  psychic: { id: 'psychic', name: '에스퍼', domain: '창의', stat: 'spa', color: '#ba68c8', desc: '기획·개선 제안·신규 시도' },
  water: { id: 'water', name: '물', domain: '협업', stat: 'spd', color: '#4fc3f7', desc: '동료 평가·지원·공유' },
  electric: { id: 'electric', name: '전기', domain: '실행', stat: 'spe', color: '#ffd54f', desc: '납기·응답 속도·처리량' },
  grass: { id: 'grass', name: '풀', domain: '성장', stat: 'hp', color: '#81c784', desc: '학습·자격·역량 강화' },
};

export const TYPE_LIST = Object.values(TYPES);

/**
 * 상성표: TYPE_CHART[공격][방어] = 배율.
 * 없으면 1.0. "성과는 품질 이슈를 밀어붙이지만 창의 앞에선 약하다" 같은
 * 조직의 관점을 그대로 숫자로 박아 넣는 자리다.
 */
export const TYPE_CHART = {
  fire: { steel: 2, grass: 2, water: 0.5, fire: 0.5 },
  steel: { psychic: 2, electric: 2, fire: 0.5, steel: 0.5, water: 0.5 },
  psychic: { fire: 2, water: 2, steel: 0.5, psychic: 0.5 },
  water: { fire: 2, electric: 2, grass: 0.5, water: 0.5 },
  electric: { water: 2, steel: 2, grass: 0.5, electric: 0.5 },
  grass: { water: 2, electric: 2, fire: 0.5, steel: 0.5, grass: 0.5 },
};

export function typeEffectiveness(attackType, defenseType) {
  return TYPE_CHART[attackType]?.[defenseType] ?? 1;
}

export function effectivenessLabel(mul) {
  if (mul >= 2) return '효과가 굉장했다!';
  if (mul <= 0.5) return '효과가 별로인 듯하다...';
  return '';
}

/** @type {import('../core/types.js').Kpi[]} */
export const KPIS = [
  {
    id: 'revenue',
    name: '목표 달성',
    type: 'fire',
    stat: 'atk',
    category: 'physical',
    weight: 1.4,
    target: 100,
    unit: '%',
    desc: '이번 달 개인 정량 목표 달성률',
  },
  {
    id: 'quality',
    name: '품질 방어',
    type: 'steel',
    stat: 'def',
    category: 'physical',
    weight: 1.1,
    target: 100,
    unit: '점',
    desc: '결함·재작업·장애 없이 넘긴 산출물 비율',
  },
  {
    id: 'idea',
    name: '개선 제안',
    type: 'psychic',
    stat: 'spa',
    category: 'special',
    weight: 1.0,
    target: 2,
    unit: '건',
    desc: '채택 여부와 무관하게 문서로 남긴 제안',
  },
  {
    id: 'collab',
    name: '협업 지원',
    type: 'water',
    stat: 'spd',
    category: 'special',
    weight: 1.0,
    target: 5,
    unit: '건',
    desc: '동료 요청 대응·리뷰·지식 공유',
  },
  {
    id: 'speed',
    name: '납기 준수',
    type: 'electric',
    stat: 'spe',
    category: 'physical',
    weight: 1.2,
    target: 100,
    unit: '%',
    desc: '약속한 일정 안에 끝낸 업무 비율',
  },
  {
    id: 'growth',
    name: '학습 성장',
    type: 'grass',
    stat: 'hp',
    category: 'special',
    weight: 0.8,
    target: 4,
    unit: 'h',
    desc: '교육·스터디·자격 준비 시간',
  },
];

export const KPI_BY_ID = Object.fromEntries(KPIS.map((k) => [k.id, k]));

/** 총 가중치 — 종합 점수 계산에 쓴다. */
export const TOTAL_WEIGHT = KPIS.reduce((s, k) => s + k.weight, 0);
