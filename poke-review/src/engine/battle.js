/**
 * 월간 보스전 시뮬레이션.
 * 같은 데이터 → 항상 같은 로그. (rng 시드 = seasonId + memberId)
 */
import { CONFIG } from '../core/config.js';
import { createRng } from '../core/rng.js';
import { typeEffectiveness, effectivenessLabel } from '../data/kpi.js';
import { calcStats } from './stats.js';

const IV31 = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

/** 보스도 같은 공식으로 스탯을 만든다 (노력치 없음, 개체값 만렙) */
export function bossStats(boss) {
  return calcStats({ base: boss.base, ivs: IV31, evs: {}, level: boss.level, natureId: null });
}

function damage({ level, power, atk, def, stab, eff, crit, rand }) {
  const core = Math.floor((Math.floor((2 * level) / 5 + 2) * power * atk) / def / 50) + 2;
  return Math.max(1, Math.floor(core * stab * eff * crit * rand));
}

/**
 * @param {object} attacker { name, level, type, stats }
 * @param {object} defender
 * @param {object} move { name, type, power, category, stat? }
 */
function attack(attacker, defender, move, rng) {
  const acc = move.accuracy ?? 1;
  if (!rng.chance(acc)) {
    return { miss: true, dmg: 0, text: `${attacker.name}의 ${move.name}! 하지만 빗나갔다...` };
  }
  const atkStat = move.stat || (move.category === 'physical' ? 'atk' : 'spa');
  const defStat = move.category === 'physical' ? 'def' : 'spd';
  const eff = typeEffectiveness(move.type, defender.type);
  const stab = move.type === attacker.type ? CONFIG.battle.stab : 1;
  const isCrit = rng.chance(CONFIG.battle.critChance);
  const dmg = damage({
    level: attacker.level,
    power: move.power,
    atk: attacker.stats[atkStat],
    def: defender.stats[defStat],
    stab,
    eff,
    crit: isCrit ? CONFIG.battle.critMultiplier : 1,
    rand: rng.range(CONFIG.battle.randMin, CONFIG.battle.randMax),
  });
  const extras = [isCrit ? '급소에 맞았다!' : '', effectivenessLabel(eff)].filter(Boolean);
  return {
    miss: false,
    dmg,
    crit: isCrit,
    eff,
    text: `${attacker.name}의 ${move.name}!${extras.length ? ' ' + extras.join(' ') : ''}`,
  };
}

/**
 * 배틀 실행.
 * @param {object} player { name, level, type, stats, moves }
 * @param {object} boss   data/bosses.js 엔트리
 * @param {string} seed
 */
export function runBattle(player, boss, seed) {
  const rng = createRng(seed);
  const bStats = bossStats(boss);
  const foe = { name: `${boss.title} ${boss.name}`, level: boss.level, type: boss.type, stats: bStats };

  let pHp = player.stats.hp;
  let fHp = bStats.hp;
  const pMaxHp = pHp;
  const fMaxHp = fHp;

  const log = [
    { kind: 'intro', text: `${foe.name}이(가) 승부를 걸어왔다!` },
    { kind: 'quote', text: `"${boss.quote}"` },
    { kind: 'intro', text: `가랏, ${player.name}!` },
  ];

  const playerFirst = player.stats.spe >= bStats.spe;
  let turn = 0;

  while (pHp > 0 && fHp > 0 && turn < CONFIG.battle.turnLimit) {
    turn++;
    const order = playerFirst ? ['player', 'foe'] : ['foe', 'player'];
    for (const side of order) {
      if (pHp <= 0 || fHp <= 0) break;
      if (side === 'player') {
        const move = pickPlayerMove(player, foe, rng, turn);
        const r = attack(player, foe, move, rng);
        fHp = Math.max(0, fHp - r.dmg);
        log.push({ kind: 'player', turn, text: r.text, dmg: r.dmg, foeHp: fHp / fMaxHp, playerHp: pHp / pMaxHp });
      } else {
        const move = boss.moves[(turn - 1) % boss.moves.length];
        const r = attack(foe, player, { ...move, accuracy: 0.95 }, rng);
        pHp = Math.max(0, pHp - r.dmg);
        log.push({ kind: 'foe', turn, text: r.text, dmg: r.dmg, foeHp: fHp / fMaxHp, playerHp: pHp / pMaxHp });
      }
    }
  }

  const win = fHp <= 0 && pHp > 0;
  const draw = fHp > 0 && pHp > 0;
  log.push({
    kind: 'result',
    text: win
      ? `${foe.name}을(를) 쓰러뜨렸다! ${boss.badgeId ? '배지를 획득했다!' : ''}`
      : draw
        ? '시간 초과. 승부가 나지 않았다...'
        : `${player.name}은(는) 쓰러졌다...`,
  });

  return {
    win,
    draw,
    turns: turn,
    playerHpLeft: pHp / pMaxHp,
    foeHpLeft: fHp / fMaxHp,
    log,
    foe: { name: foe.name, level: foe.level, type: foe.type, stats: bStats, badgeId: boss.badgeId },
    expReward: win ? CONFIG.exp.battleWin : CONFIG.exp.battleLose,
  };
}

/**
 * 기대 데미지(위력 × 자속 × 상성 × 명중 × 공격스탯)가 가장 높은 기술을 고른다.
 * 실제 트레이너처럼 상성을 보고 고르되, 25% 확률로 다른 기술도 섞어 변수를 준다.
 */
function pickPlayerMove(player, foe, rng, turn) {
  const moves = player.moves;
  if (!moves.length) {
    return { name: '몸통박치기', type: 'grass', power: 40, category: 'physical', accuracy: 1 };
  }
  const ranked = [...moves].sort((a, b) => expected(b) - expected(a));
  return rng.chance(0.25) ? ranked[(turn - 1) % ranked.length] : ranked[0];

  function expected(mv) {
    const atkStat = player.stats[mv.stat || (mv.category === 'physical' ? 'atk' : 'spa')] || 1;
    const defStat = foe.stats[mv.category === 'physical' ? 'def' : 'spd'] || 1;
    const stab = mv.type === player.type ? CONFIG.battle.stab : 1;
    return mv.power * stab * typeEffectiveness(mv.type, foe.type) * (mv.accuracy ?? 1) * (atkStat / defStat);
  }
}
