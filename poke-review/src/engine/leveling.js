/**
 * EXP → 레벨 → 진화 단계.
 * 누적EXP(L) = round(L^3 * k)  (CONFIG.level.k)
 */
import { CONFIG } from '../core/config.js';
import { SPECIES_BY_ID, SPECIES_BY_TYPE } from '../data/species.js';

/** 레벨 L 에 도달하는 데 필요한 누적 EXP */
export function totalExpForLevel(level) {
  const l = Math.max(1, Math.min(CONFIG.level.max, level));
  return Math.round(Math.pow(l, 3) * CONFIG.level.k);
}

export function levelFromExp(exp) {
  let level = 1;
  while (level < CONFIG.level.max && exp >= totalExpForLevel(level + 1)) level++;
  return level;
}

/** 레벨 + 다음 레벨까지의 진행도 */
export function levelProgress(exp) {
  const level = levelFromExp(exp);
  const cur = totalExpForLevel(level);
  const next = level >= CONFIG.level.max ? cur : totalExpForLevel(level + 1);
  const gained = exp - cur;
  const need = Math.max(1, next - cur);
  return {
    exp,
    level,
    into: gained,
    need,
    ratio: level >= CONFIG.level.max ? 1 : Math.max(0, Math.min(1, gained / need)),
    toNext: Math.max(0, next - exp),
    isMax: level >= CONFIG.level.max,
  };
}

/** 멤버의 파트너 종족 결정 (지정 없으면 주력 타입으로 자동 배정) */
export function resolveSpecies(member, dominantType) {
  return (
    SPECIES_BY_ID[member.speciesId] ||
    SPECIES_BY_TYPE[dominantType] ||
    SPECIES_BY_ID[Object.keys(SPECIES_BY_ID)[0]]
  );
}

/** 레벨에 맞는 진화 형태 */
export function formAt(species, level) {
  const line = species.line;
  let idx = 0;
  for (let i = 0; i < line.length; i++) {
    const min = line[i].minLevel ?? CONFIG.level.evolveAt[i - 1] ?? 1;
    if (level >= min) idx = i;
  }
  const entry = line[idx];
  const nextEntry = line[idx + 1] || null;
  return {
    speciesId: species.id,
    type: species.type,
    stage: idx + 1,
    stageCount: line.length,
    name: entry.name,
    tagline: entry.tagline,
    nextName: nextEntry ? nextEntry.name : null,
    nextAt: nextEntry ? nextEntry.minLevel : null,
    isFinal: !nextEntry,
  };
}

/** 두 레벨 사이에 진화가 일어났는지 */
export function didEvolve(species, fromLevel, toLevel) {
  return formAt(species, toLevel).stage > formAt(species, fromLevel).stage;
}
