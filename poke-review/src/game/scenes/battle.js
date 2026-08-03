/**
 * 배틀 씬 — engine/battle.js 가 만든 로그를 화면으로 재생한다.
 * 새로 계산하지 않는다: 도감에서 본 결과와 게임 안 결과가 항상 같아야 하므로.
 */
import { drawMonster } from '../engine/monsterdraw.js';
import { TYPES } from '../../data/kpi.js';
import { BADGE_BY_ID } from '../../data/badges.js';
import { mix } from '../../core/color.js';

export class BattleScene {
  /**
   * @param {import('../game.js').Game} game
   * @param {object} entry  evaluate.js 의 멤버 시즌 결과
   * @param {object} boss
   * @param {()=>void} onEnd
   */
  constructor(game, entry, boss, onEnd) {
    this.game = game;
    this.entry = entry;
    this.boss = boss;
    this.onEnd = onEnd;
    this.log = entry.battle.log;
    this.i = -1;
    this.playerHp = 1;
    this.foeHp = 1;
    this.targetPlayerHp = 1;
    this.targetFoeHp = 1;
    this.flash = { player: 0, foe: 0 };
    this.shake = 0;
    this.finished = false;
  }

  enter() {
    // 배너는 적 체력 상자를 가려서 배틀에서는 쓰지 않는다 (첫 로그 줄이 상대를 소개한다)
    this.next();
  }

  /** 로그 한 줄 진행 */
  next() {
    this.i++;
    if (this.i >= this.log.length) {
      this.end();
      return;
    }
    const line = this.log[this.i];
    if (typeof line.playerHp === 'number') this.targetPlayerHp = line.playerHp;
    if (typeof line.foeHp === 'number') this.targetFoeHp = line.foeHp;
    if (line.dmg > 0) {
      const side = line.kind === 'player' ? 'foe' : 'player';
      this.flash[side] = 0.5;
      this.shake = 0.18;
    }
    this.game.textbox.show([line.text], {
      speaker: line.kind === 'foe' ? this.boss.name : '',
      onDone: () => this.next(),
    });
  }

  end() {
    if (this.finished) return;
    this.finished = true;
    const e = this.entry;
    const lines = [];
    lines.push(e.battle.win ? '체육관을 돌파했다!' : '이번 달은 여기까지...');
    lines.push(`${e.member.name}은(는) ${e.expFromBattle.toLocaleString()} EXP 를 얻었다!`);
    if (e.battle.win && e.battle.foe.badgeId) {
      const badge = BADGE_BY_ID[e.battle.foe.badgeId];
      if (badge) lines.push(`${badge.icon} ${badge.name}를 손에 넣었다!`);
    }
    if (e.evolved) lines.push(`...어라? 파트너의 모습이 ${e.form.name}(으)로 변했다!`);
    this.game.textbox.show(lines, { onDone: () => this.onEnd?.() });
  }

  update(dt) {
    const { input, textbox } = this.game;
    if (input.pressed('confirm') || input.pressed('cancel')) textbox.advance();

    const ease = (cur, target) => cur + (target - cur) * Math.min(1, dt * 6);
    this.playerHp = ease(this.playerHp, this.targetPlayerHp);
    this.foeHp = ease(this.foeHp, this.targetFoeHp);
    this.flash.player = Math.max(0, this.flash.player - dt * 3);
    this.flash.foe = Math.max(0, this.flash.foe - dt * 3);
    this.shake = Math.max(0, this.shake - dt);
  }

  draw(ctx, time) {
    const W = this.game.width;
    const H = this.game.height;
    const typeColor = TYPES[this.entry.species.type]?.color || '#6ee7ff';

    // 배경: 하늘 → 필드
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#2a3550');
    sky.addColorStop(0.55, mix('#2a3550', typeColor, 0.25));
    sky.addColorStop(1, '#16202c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const shakeX = this.shake > 0 ? Math.round(Math.sin(time * 90) * 2) : 0;
    ctx.save();
    ctx.translate(shakeX, 0);

    // 발판
    this.platform(ctx, W - 78, 62, 64, '#3f5a44');
    this.platform(ctx, 16, H - 72, 76, '#3f5a44');

    drawMonster(
      ctx,
      { speciesId: `boss:${this.boss.id}`, type: this.boss.type, stage: 3 },
      { x: W - 74, y: 24, size: 52, flash: this.flash.foe },
    );
    drawMonster(
      ctx,
      { speciesId: this.entry.species.id, type: this.entry.species.type, stage: this.entry.form.stage },
      { x: 22, y: H - 116, size: 56, flash: this.flash.player },
    );

    ctx.restore();

    this.hpBox(ctx, 8, 10, `${this.boss.name}`, this.boss.level, this.foeHp);
    this.hpBox(ctx, W - 118, H - 96, this.entry.form.name, this.entry.progress.level, this.playerHp);
  }

  platform(ctx, x, y, w, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 8, w / 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mix(color, '#000000', 0.25);
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 10, w / 2 - 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /** DS 풍 체력 상자 */
  hpBox(ctx, x, y, name, level, ratio) {
    const w = 110;
    const h = 30;
    ctx.fillStyle = 'rgba(16,22,30,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#e8edf5';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    ctx.fillStyle = '#e8edf5';
    ctx.font = '9px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(name, x + 5, y + 4);
    ctx.textAlign = 'right';
    ctx.fillText(`Lv.${level}`, x + w - 5, y + 4);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#0c1017';
    ctx.fillRect(x + 5, y + 18, w - 10, 6);
    const color = ratio > 0.5 ? '#4ade80' : ratio > 0.2 ? '#ffd166' : '#f87171';
    ctx.fillStyle = color;
    ctx.fillRect(x + 6, y + 19, Math.max(0, (w - 12) * ratio), 4);
  }

  dispose() {}
}
