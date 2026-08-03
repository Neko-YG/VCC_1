/**
 * 결정론적 난수 — 같은 시드면 항상 같은 결과.
 * 배틀 결과가 새로고침마다 바뀌면 평가 도구로 못 쓰기 때문에 필수다.
 */

/** 문자열 → 32bit 정수 시드 */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 */
export function createRng(seed) {
  let a = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** [min, max] 실수 */
    range: (min, max) => min + next() * (max - min),
    /** [min, max] 정수 */
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

/** 시드에서 0~31 개체값(IV) 6개 뽑기 — 사람마다 고정된 타고난 특성 */
export function rollIvs(seedStr, statIds) {
  const rng = createRng(`${seedStr}:iv`);
  const out = {};
  for (const id of statIds) out[id] = rng.int(0, 31);
  return out;
}
