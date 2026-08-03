/**
 * 체육관 관장 = 그 달의 목표를 의인화한 상대.
 * level 을 올리면 그 달 평가가 그만큼 빡세진다 (난이도 다이얼).
 */

/** @type {import('../core/types.js').Boss[]} */
export const BOSSES = [
  {
    id: 'gym-fire',
    name: '홍염',
    title: '숫자의 관장',
    type: 'fire',
    level: 20,
    base: { hp: 80, atk: 100, def: 70, spa: 65, spd: 70, spe: 85 },
    badgeId: 'flame',
    quote: '숫자는 변명을 듣지 않아. 가져왔나?',
    moves: [
      { name: '실적 압박', type: 'fire', power: 85, category: 'physical' },
      { name: '목표 상향', type: 'fire', power: 70, category: 'special' },
      { name: '마감 돌진', type: 'electric', power: 65, category: 'physical' },
    ],
  },
  {
    id: 'gym-steel',
    name: '강진',
    title: '품질의 관장',
    type: 'steel',
    level: 20,
    base: { hp: 90, atk: 75, def: 110, spa: 60, spd: 85, spe: 45 },
    badgeId: 'iron',
    quote: '빠른 건 됐고. 안 터지는 걸 가져와.',
    moves: [
      { name: '결함 지적', type: 'steel', power: 80, category: 'physical' },
      { name: '재작업 요구', type: 'steel', power: 60, category: 'physical' },
      { name: '리스크 경고', type: 'psychic', power: 70, category: 'special' },
    ],
  },
  {
    id: 'gym-psychic',
    name: '지운',
    title: '발상의 관장',
    type: 'psychic',
    level: 20,
    base: { hp: 70, atk: 55, def: 65, spa: 115, spd: 90, spe: 75 },
    badgeId: 'mind',
    quote: '작년이랑 똑같은 걸 가져오면 지는 거야.',
    moves: [
      { name: '근본 질문', type: 'psychic', power: 90, category: 'special' },
      { name: '전제 붕괴', type: 'psychic', power: 70, category: 'special' },
      { name: '차가운 검토', type: 'water', power: 65, category: 'special' },
    ],
  },
  {
    id: 'gym-water',
    name: '유하',
    title: '신뢰의 관장',
    type: 'water',
    level: 20,
    base: { hp: 95, atk: 65, def: 85, spa: 75, spd: 105, spe: 60 },
    badgeId: 'tide',
    quote: '혼자 잘하는 건 여기서 안 통해.',
    moves: [
      { name: '협업 요청', type: 'water', power: 75, category: 'special' },
      { name: '동료 평가', type: 'water', power: 85, category: 'special' },
      { name: '지식 공유', type: 'grass', power: 60, category: 'special' },
    ],
  },
  {
    id: 'gym-electric',
    name: '섬광',
    title: '속도의 관장',
    type: 'electric',
    level: 20,
    base: { hp: 65, atk: 90, def: 55, spa: 80, spd: 60, spe: 120 },
    badgeId: 'volt',
    quote: '내일 준다고? 그럼 진 거야.',
    moves: [
      { name: '즉시 처리', type: 'electric', power: 80, category: 'physical' },
      { name: '일정 단축', type: 'electric', power: 65, category: 'special' },
      { name: '병목 돌파', type: 'fire', power: 70, category: 'physical' },
    ],
  },
  {
    id: 'gym-grass',
    name: '초록',
    title: '성장의 관장',
    type: 'grass',
    level: 20,
    base: { hp: 110, atk: 70, def: 90, spa: 80, spd: 80, spe: 55 },
    badgeId: 'leaf',
    quote: '작년의 너를 이겨야 통과다.',
    moves: [
      { name: '기본기 점검', type: 'grass', power: 75, category: 'physical' },
      { name: '성장 압박', type: 'grass', power: 85, category: 'special' },
      { name: '뿌리 내리기', type: 'steel', power: 60, category: 'physical' },
    ],
  },
];

export const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b]));
