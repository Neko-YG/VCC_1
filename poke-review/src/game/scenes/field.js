/**
 * 필드(오버월드) 씬 — 걸어다니고, 말을 걸고, 문으로 들어간다.
 * 평가 데이터는 여기서 "대사"로 바뀐다.
 */
import { TILE, isSolid, tileAt } from '../world/tiles.js';
import { renderMap, drawWaterSparkle } from '../engine/tileset.js';
import { Camera } from '../world/camera.js';
import { Actor, Npc } from '../actors/actor.js';
import { fmt } from '../../ui/dom.js';

export class FieldScene {
  /**
   * @param {import('../game.js').Game} game
   * @param {object} map  world/maps.js 엔트리
   * @param {{x:number,y:number,dir:string}} spawn
   */
  constructor(game, map, spawn) {
    this.game = game;
    this.map = map;
    this.pre = renderMap(map);
    this.camera = new Camera(game.width, game.height);
    this.player = new Actor({ ...spawn, palette: 'red', id: 'player' });
    this.npcs = map.npcs.map((def) => new Npc(def));
    this.npcByCell = new Map(this.npcs.map((n) => [`${n.gx},${n.gy}`, n]));
    this.busy = false; // 대화 중에는 움직이지 않는다
  }

  enter() {
    this.game.banner.show(`여기는 ${this.map.name}`, this.map.subtitle || '');
    this.camera.follow(this.player, this.pre.width, this.pre.height);
  }

  isBlocked(x, y) {
    if (isSolid(this.map, x, y)) return true;
    if (this.npcByCell.has(`${x},${y}`)) return true;
    return false;
  }

  update(dt) {
    const { input, textbox } = this.game;

    if (textbox.open) {
      if (input.pressed('confirm') || input.pressed('cancel')) textbox.advance();
      this.player.update(dt);
      return;
    }

    if (input.pressed('confirm')) {
      if (this.interact()) return;
    }

    if (!this.player.moving && !this.busy) {
      const dir = input.direction();
      if (dir) {
        const moved = this.player.tryMove(dir, (x, y) => this.isBlocked(x, y), { run: input.isDown('run') });
        if (moved) this._pendingWarpCheck = true;
      }
    }

    const wasMoving = this.player.moving;
    this.player.update(dt);
    for (const npc of this.npcs) npc.update(dt);

    // 칸에 완전히 도착한 순간에만 워프를 판정한다
    if (wasMoving && !this.player.moving) this.checkWarp();

    this.camera.follow(this.player, this.pre.width, this.pre.height);
  }

  checkWarp() {
    const w = this.map.warps.find((v) => v.x === this.player.gx && v.y === this.player.gy);
    if (w) this.game.changeMap(w.to, { x: w.tx, y: w.ty, dir: w.dir });
  }

  /** 바라보는 칸에 무엇이 있는지 확인하고 반응 */
  interact() {
    const { x, y } = this.player.facing();
    const npc = this.npcByCell.get(`${x},${y}`);
    if (npc) {
      npc.lookAt(this.player);
      this.talkTo(npc);
      return true;
    }
    const tile = tileAt(this.map, x, y);
    if (tile?.tag === 'sign') {
      const lines = this.map.signs[`${x},${y}`] || ['글씨가 지워져 읽을 수 없다.'];
      this.game.say(lines);
      return true;
    }
    return false;
  }

  talkTo(npc) {
    const def = npc.def;
    if (def.kind === 'guide') {
      this.game.say(def.lines, { speaker: '주민' });
      return;
    }
    if (def.kind === 'member') {
      const entry = this.game.memberEntry(def.memberIndex);
      if (!entry) {
        this.game.say(['...아직 이번 달 기록이 없어.']);
        return;
      }
      this.game.say(memberLines(entry), { speaker: entry.member.name });
      return;
    }
    if (def.kind === 'leader') {
      const boss = this.game.boss();
      const entry = this.game.playerEntry();
      if (!entry) {
        this.game.say(['이번 달 기록이 없으면 승부도 없다. 돌아가라.'], { speaker: '관장' });
        return;
      }
      this.game.say(
        [
          `나는 ${boss.title} ${boss.name}. 이번 달 목표 그 자체다.`,
          boss.quote,
          `${entry.member.name}... 지난 한 달로 나를 넘어보시지.`,
        ],
        {
          speaker: boss.name,
          onDone: () => this.game.startBattle(entry, boss),
        },
      );
      return;
    }
  }

  draw(ctx, time) {
    const cam = this.camera;
    ctx.imageSmoothingEnabled = false;
    // 프리렌더된 맵에서 보이는 부분만 잘라 붙인다
    ctx.drawImage(this.pre.canvas, cam.x, cam.y, cam.w, cam.h, 0, 0, cam.w, cam.h);
    if (this.map.outdoor) drawWaterSparkle(ctx, this.pre.waterTiles, cam, time);

    // 아래쪽(y 가 큰) 캐릭터가 나중에 그려져 앞에 서도록
    const actors = [...this.npcs, this.player].sort((a, b) => a.py - b.py);
    for (const a of actors) {
      if (a.px - cam.x < -TILE * 2 || a.px - cam.x > cam.w + TILE * 2) continue;
      a.draw(ctx, cam);
    }
  }

  dispose() {}
}

/** 팀원 NPC 대사 — 이번 시즌 평가 결과를 말로 옮긴다 */
function memberLines(e) {
  const lines = [
    `이번 달 종합은 ${fmt.score(e.overall)}, 등급 ${e.grade.label}이야.`,
    `파트너 ${e.form.name}은(는) Lv.${e.progress.level}. ${e.form.isFinal ? '더 진화할 곳은 없어.' : `${e.form.nextName}까지 Lv.${e.form.nextAt}!`}`,
  ];
  const best = [...e.kpiScores].sort((a, b) => b.score - a.score)[0];
  const worst = [...e.kpiScores].sort((a, b) => a.score - b.score)[0];
  if (best) lines.push(`이번엔 특히 잘 풀린 게 있었어. 자신 있는 쪽은 확실히 밀어붙였지.`);
  if (worst && worst.score < 0.9) lines.push('...아쉬운 항목도 하나 있어. 다음 달엔 거기부터.');
  lines.push(e.battle.win ? '체육관? 이번 달은 돌파했어.' : '관장한테는 아직 안 되더라고.');
  if (e.newBadges.length) lines.push(`이번 달에 배지를 ${e.newBadges.length}개 새로 받았어!`);
  return lines;
}
