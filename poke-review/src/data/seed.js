/**
 * 초기 예시 데이터. 처음 실행할 때 한 번만 localStorage 로 복사된다.
 * 실제 팀 데이터는 관리자 화면에서 넣거나, 이 파일을 통째로 갈아끼우면 된다.
 */
import { KPIS } from './kpi.js';

/** @type {import('../core/types.js').Member[]} */
export const SEED_MEMBERS = [
  { id: 'm1', name: '김하늘', role: '기획', team: '전략팀', speciesId: 'idea', natureId: 'modest', joinedAt: '2024-03' },
  { id: 'm2', name: '박도현', role: '영업', team: '세일즈팀', speciesId: 'ember', natureId: 'adamant', joinedAt: '2023-01' },
  { id: 'm3', name: '이수민', role: '개발', team: '프로덕트팀', speciesId: 'bolt', natureId: 'bold', joinedAt: '2022-09' },
  { id: 'm4', name: '정우재', role: '운영', team: '프로덕트팀', speciesId: 'spark', natureId: 'timid', joinedAt: '2025-02' },
  { id: 'm5', name: '한서윤', role: '디자인', team: '브랜드팀', speciesId: 'drop', natureId: 'calm', joinedAt: '2024-11' },
];

/** 시드 기록을 손으로 다 적지 않으려고 쓰는 헬퍼 */
function rec(values) {
  const out = {};
  KPIS.forEach((k, i) => {
    out[k.id] = values[i];
  });
  return out;
}

// 입력 순서: 목표달성(%) / 품질(점) / 제안(건) / 협업(건) / 납기(%) / 학습(h)
/** @type {import('../core/types.js').Season[]} */
export const SEED_SEASONS = [
  {
    id: '2026-05',
    title: '5월 — 시즌 개막',
    bossId: 'gym-fire',
    records: {
      m1: rec([92, 95, 3, 6, 88, 6]),
      m2: rec([124, 82, 1, 4, 95, 2]),
      m3: rec([101, 99, 2, 8, 92, 5]),
      m4: rec([88, 90, 1, 5, 100, 3]),
      m5: rec([95, 93, 4, 7, 85, 4]),
    },
    notes: { m2: '신규 계정 2건 클로징. 품질 리뷰는 다음 달 보완 필요.' },
  },
  {
    id: '2026-06',
    title: '6월 — 품질 점검의 달',
    bossId: 'gym-steel',
    records: {
      m1: rec([98, 97, 4, 5, 91, 5]),
      m2: rec([131, 88, 2, 3, 97, 3]),
      m3: rec([105, 100, 3, 9, 96, 6]),
      m4: rec([94, 95, 2, 6, 100, 4]),
      m5: rec([89, 96, 5, 8, 82, 5]),
    },
    notes: {},
  },
  {
    id: '2026-07',
    title: '7월 — 신규 과제 착수',
    bossId: 'gym-psychic',
    records: {
      m1: rec([110, 94, 6, 7, 93, 7]),
      m2: rec([118, 91, 3, 5, 99, 3]),
      m3: rec([99, 98, 4, 10, 94, 6]),
      m4: rec([102, 92, 3, 6, 100, 5]),
      m5: rec([96, 97, 6, 9, 88, 6]),
    },
    notes: {},
  },
];

export function makeSeedState() {
  return {
    version: 1,
    members: structuredClone(SEED_MEMBERS),
    seasons: structuredClone(SEED_SEASONS),
    settings: {
      orgName: 'VCC 트레이너 리그',
      currentSeasonId: '2026-07',
    },
  };
}
