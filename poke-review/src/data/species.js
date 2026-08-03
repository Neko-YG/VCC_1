/**
 * 파트너 종족(진화 라인). 타입별로 1라인씩.
 * 이름/설명은 마음대로 바꿔도 되고, base(종족값)만 밸런스에 영향을 준다.
 */

/** @type {import('../core/types.js').Species[]} */
export const SPECIES = [
  {
    id: 'ember',
    type: 'fire',
    base: { hp: 60, atk: 95, def: 60, spa: 70, spd: 60, spe: 85 },
    line: [
      { name: '불씨몽', minLevel: 1, tagline: '작지만 꺼지지 않는 불씨' },
      { name: '화염몽', minLevel: 16, tagline: '목표 앞에서 더 뜨거워진다' },
      { name: '작열몽', minLevel: 36, tagline: '숫자를 태워 결과로 바꾼다' },
    ],
  },
  {
    id: 'bolt',
    type: 'steel',
    base: { hp: 75, atk: 70, def: 100, spa: 55, spd: 80, spe: 50 },
    line: [
      { name: '볼트링', minLevel: 1, tagline: '나사 하나도 그냥 지나치지 않는다' },
      { name: '강판링', minLevel: 16, tagline: '한 번 막으면 뚫리지 않는다' },
      { name: '요새링', minLevel: 36, tagline: '장애 없는 달이 훈장이다' },
    ],
  },
  {
    id: 'idea',
    type: 'psychic',
    base: { hp: 60, atk: 50, def: 60, spa: 105, spd: 85, spe: 70 },
    line: [
      { name: '뿅상', minLevel: 1, tagline: '엉뚱한 질문을 자주 한다' },
      { name: '몽상가', minLevel: 16, tagline: '남들이 못 본 각도를 본다' },
      { name: '창안자', minLevel: 36, tagline: '아이디어를 실행까지 끌고 간다' },
    ],
  },
  {
    id: 'drop',
    type: 'water',
    base: { hp: 80, atk: 60, def: 75, spa: 70, spd: 100, spe: 65 },
    line: [
      { name: '물방울', minLevel: 1, tagline: '누가 부르면 일단 간다' },
      { name: '파도돌', minLevel: 16, tagline: '팀의 흐름을 만든다' },
      { name: '해류신', minLevel: 36, tagline: '있으면 팀이 굴러간다' },
    ],
  },
  {
    id: 'spark',
    type: 'electric',
    base: { hp: 60, atk: 80, def: 55, spa: 75, spd: 60, spe: 110 },
    line: [
      { name: '찌릿', minLevel: 1, tagline: '메시지 읽자마자 답한다' },
      { name: '번쩍', minLevel: 16, tagline: '마감이 빨라진다' },
      { name: '뇌섬', minLevel: 36, tagline: '일정이 밀리는 걸 못 본다' },
    ],
  },
  {
    id: 'sprout',
    type: 'grass',
    base: { hp: 100, atk: 65, def: 80, spa: 75, spd: 75, spe: 55 },
    line: [
      { name: '새싹', minLevel: 1, tagline: '오늘도 뭔가 배웠다' },
      { name: '푸른잎', minLevel: 16, tagline: '배운 걸 써먹기 시작했다' },
      { name: '거목', minLevel: 36, tagline: '이제 남을 키운다' },
    ],
  },
];

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const SPECIES_BY_TYPE = Object.fromEntries(SPECIES.map((s) => [s.type, s]));
