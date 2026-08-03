/**
 * 실제 스탯 계산 — 포켓몬 3세대 이후 공식을 그대로 쓴다.
 *   HP   = floor((2*종족값 + 개체값 + floor(노력치/4)) * L/100) + L + 10
 *   그 외 = (floor((2*종족값 + 개체값 + floor(노력치/4)) * L/100) + 5) * 성격보정
 *
 * 종족값 = 파트너 고유 재능, 개체값 = 사람마다 타고난 편차(고정),
 * 노력치 = 실제 업적으로 쌓은 부분(= 이 도구에서 유일하게 스스로 바꿀 수 있는 값).
 */
import { STAT_IDS, NATURE_BY_ID } from '../core/config.js';

export function calcStat(statId, base, iv, ev, level, nature) {
  const core = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
  if (statId === 'hp') return core + level + 10;
  let value = core + 5;
  if (nature) {
    if (nature.up === statId) value = Math.floor(value * 1.1);
    if (nature.down === statId) value = Math.floor(value * 0.9);
  }
  return value;
}

/** 6스탯 전부 */
export function calcStats({ base, ivs, evs, level, natureId }) {
  const nature = NATURE_BY_ID[natureId] || null;
  const out = {};
  for (const id of STAT_IDS) {
    out[id] = calcStat(id, base[id] ?? 50, ivs?.[id] ?? 0, evs?.[id] ?? 0, level, nature);
  }
  out.total = STAT_IDS.reduce((s, id) => s + out[id], 0);
  return out;
}

/** 빈 노력치 */
export function emptyEvs() {
  return Object.fromEntries(STAT_IDS.map((id) => [id, 0]));
}

/**
 * 노력치 누적. 스탯별 상한(252)·총합 상한(510)을 지킨다.
 * @returns {{evs: object, applied: object}} applied = 실제로 들어간 양
 */
export function addEvs(evs, gains, caps) {
  const next = { ...evs };
  const applied = {};
  let total = STAT_IDS.reduce((s, id) => s + (next[id] || 0), 0);
  for (const id of STAT_IDS) {
    const want = Math.max(0, Math.round(gains[id] || 0));
    if (!want) {
      applied[id] = 0;
      continue;
    }
    const roomStat = Math.max(0, caps.statCap - (next[id] || 0));
    const roomTotal = Math.max(0, caps.totalCap - total);
    const give = Math.min(want, roomStat, roomTotal);
    next[id] = (next[id] || 0) + give;
    total += give;
    applied[id] = give;
  }
  return { evs: next, applied };
}

/** 레이더 차트용 정규화 (0~1) */
export function normalizeStats(stats, max = 400) {
  return STAT_IDS.map((id) => Math.max(0.04, Math.min(1, (stats[id] || 0) / max)));
}
