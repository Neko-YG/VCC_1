/**
 * 배틀 씬 — engine/battle.js 가 만든 로그를 4세대 배틀 화면으로 재생한다.
 * 여기서 새로 계산하는 것은 없다: 도감에서 본 결과와 늘 같아야 하므로.
 *
 * 화면 구성도 그 시절 규칙을 따른다.
 *  - 상대는 오른쪽 위, 내 쪽은 왼쪽 아래. 각자 타원 발판 위에 선다
 *  - 체력 상자는 이름/레벨/HP 막대, 내 쪽에는 EXP 막대가 하나 더 붙는다
 *  - 등장할 때 양쪽에서 미끄러져 들어오고, 맞으면 깜빡이며 화면이 흔들린다
 */
import { drawMonster } from '../engine/monsterdraw.js';
import { TYPES } from '../../data/kpi.js';
import { BADGE_BY_ID } from '../../data/badges.js';
import { mix, shade } from '../../core/color.js';

const INTRO = 0.55; // 등장 연출 시간(초)

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
    this.faint = { player: 0, foe: 0 };
    this.shake = 0;
    this.intro = INTRO;
    this.finished = false;
  }

  enter() {
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
      this.shake = 0.2;
    }
    if (this.targetFoeHp <= 0) this.faint.foe = Math.max(this.faint.foe, 0.001);
    if (this.targetPlayerHp <= 0) this.faint.player = Math.max(this.faint.player, 0.001);

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

    this.intro = Math.max(0, this.intro - dt);
    const ease = (cur, target) => cur + (target - cur) * Math.min(1, dt * 6);
    this.playerHp = ease(this.playerHp, this.targetPlayerHp);
    this.foeHp = ease(this.foeHp, this.targetFoeHp);
    this.flash.player = Math.max(0, this.flash.player - dt * 3);
    this.flash.foe = Math.max(0, this.flash.foe - dt * 3);
    this.shake = Math.max(0, this.shake - dt);
    if (this.faint.foe > 0) this.faint.foe = Math.min(1, this.faint.foe + dt * 2);
    if (this.faint.player > 0) this.faint.player = Math.min(1, this.faint.player + dt * 2);
  }

  draw(ctx, time) {
    const W = this.game.width;
    const H = this.game.height;
    const typeColor = TYPES[this.entry.species.type]?.color || '#6ee7ff';

    this.background(ctx, W, H, typeColor);

    // 등장: 양쪽에서 미끄러져 들어온다
    const k = this.intro / INTRO;
    const slideFoe = Math.round(k * k * 90);
    const slidePlayer = Math.round(-k * k * 90);

    const shakeX = this.shake > 0 ? Math.round(Math.sin(time * 90) * 2) : 0;
    ctx.save();
    ctx.translate(shakeX, 0);

    this.platform(ctx, W - 84 + slideFoe, 74, 70, 12);
    this.platform(ctx, 8 + slidePlayer, H - 62, 86, 14);

    drawMonster(
      ctx,
      { speciesId: `boss:${this.boss.id}`, type: this.boss.type, stage: 3 },
      { x: W - 76 + slideFoe, y: 30 + this.faint.foe * 26, size: 52, flash: this.flash.foe, alpha: 1 - this.faint.foe },
    );
    drawMonster(
      ctx,
      { speciesId: this.entry.species.id, type: this.entry.species.type, stage: this.entry.form.stage, back: true },
      { x: 20 + slidePlayer, y: H - 118 + this.faint.player * 26, size: 58, flash: this.flash.player, alpha: 1 - this.faint.player },
    );

    ctx.restore();

    // 체력 상자는 반대편에서 들어온다
    this.hpBox(ctx, 6 - slideFoe, 8, this.boss.name, this.boss.level, this.foeHp, null);
    this.hpBox(
      ctx,
      W - 122 - slidePlayer,
      H - 98,
      this.entry.form.name,
      this.entry.progress.level,
      this.playerHp,
      this.entry.progress.ratio,
    );
  }

  /** 하늘 → 지평선 → 배틀 필드 */
  background(ctx, W, H, typeColor) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, mix('#8fd8ff', typeColor, 0.25));
    sky.addColorStop(0.44, '#cfeeff');
    sky.addColorStop(0.45, mix('#9ad86a', typeColor, 0.12));
    sky.addColorStop(1, '#6fbb4a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, Math.round(H * 0.44) - 2, W, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = Math.round(H * 0.5); y < H; y += 6) ctx.fillRect(0, y, W, 1);
  }

  /** 타원 발판 */
  platform(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2 + 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8ecf62';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6aa845';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2 + 2, w / 2 - 3, h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * 4세대 체력 상자.
   * @param {number|null} expRatio 내 쪽만 EXP 막대를 그린다
   */
  hpBox(ctx, x, y, name, level, ratio, expRatio) {
    const w = 116;
    const h = expRatio === null ? 30 : 36;
    roundRect(ctx, x, y, w, h, 5, '#f8f4e8', '#3a3430');

    ctx.fillStyle = '#3a3430';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(name, x + 7, y + 5);
    ctx.textAlign = 'right';
    ctx.fillText(`Lv${level}`, x + w - 7, y + 5);
    ctx.textAlign = 'left';

    const barX = x + 24;
    const barY = y + 18;
    const barW = w - 32;
    ctx.fillStyle = '#c8a03a';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.fillText('HP', x + 8, barY - 1);

    roundRect(ctx, barX, barY, barW, 6, 3, '#4a4038', null);
    const hpColor = ratio > 0.5 ? '#58d858' : ratio > 0.2 ? '#f8c838' : '#f05038';
    const fill = Math.max(0, Math.round((barW - 2) * ratio));
    if (fill > 0) {
      roundRect(ctx, barX + 1, barY + 1, fill, 4, 2, hpColor, null);
      ctx.fillStyle = shade(hpColor, 45);
      ctx.fillRect(barX + 1, barY + 1, fill, 1);
    }

    if (expRatio !== null && expRatio !== undefined) {
      const ex = x + 8;
      const ew = w - 16;
      ctx.fillStyle = '#3a6ea8';
      ctx.font = 'bold 7px system-ui, sans-serif';
      ctx.fillText('EXP', ex, y + h - 11);
      roundRect(ctx, ex + 20, y + h - 9, ew - 20, 4, 2, '#4a4038', null);
      const efill = Math.max(0, Math.round((ew - 22) * expRatio));
      if (efill > 0) roundRect(ctx, ex + 21, y + h - 8, efill, 2, 1, '#58c8f8', null);
    }
  }

  dispose() {}
}

/** 모서리가 둥근 사각형 (테두리 선택) */
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
