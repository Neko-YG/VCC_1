/**
 * 필드(오버월드) 씬 — 걸어다니고, 말을 걸고, 문으로 들어간다.
 * 평가 데이터는 여기서 "대사"로 바뀐다.
 */
import { TILE, isSolid, tileAt } from '../world/tiles.js';
import { findPath, stepDirection } from '../world/path.js';
import { TARGET_ORDER } from '../engine/controls.js';
import { renderMap, drawTallGrassFront, WATER_FPS } from '../engine/tileset.js';
import { Camera } from '../world/camera.js';
import { Actor, Npc, DELTA } from '../actors/actor.js';
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
    /** 포인터·프레젠터로 지정한 목적지까지의 경로 */
    this.path = [];
    /** 도착하면 말을 걸 칸 */
    this.pendingInteract = null;
    this.targets = collectTargets(map);
  }

  /** 경로 유틸이 쓰는 {x,y} 형태의 플레이어 위치 (Actor 는 gx/gy 를 쓴다) */
  playerCell() {
    return { x: this.player.gx, y: this.player.gy };
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
    const { input, textbox, presenter } = this.game;

    if (textbox.open) {
      if (input.pressed('confirm') || input.pressed('cancel') || input.pressed('presenterNext')) {
        textbox.advance();
      }
      this.player.update(dt);
      return;
    }

    // 프레젠터(레이저 포인터) — 버튼 2개로 조작
    if (input.pressed('presenterPrev')) {
      presenter.enabled = true;
      presenter.setTargets(this.targetsNear());
      presenter.next();
    }
    if (input.pressed('presenterNext')) {
      presenter.enabled = true;
      if (!presenter.current()) presenter.setTargets(this.targetsNear());
      const target = presenter.current();
      if (target) this.goTo(target.x, target.y, { interact: true });
    }

    if (input.pressed('confirm')) {
      this.cancelPath();
      if (this.interact()) return;
    }

    if (!this.player.moving && !this.busy) {
      const dir = input.direction();
      if (dir) {
        this.cancelPath();
        const moved = this.player.tryMove(dir, (x, y) => this.isBlocked(x, y), { run: input.isDown('run') });
        if (moved) this._pendingWarpCheck = true;
      } else if (this.path.length) {
        // 경로가 있으면 한 칸씩 자동으로 걷는다
        const next = this.path[0];
        const moved = this.player.tryMove(stepDirection(this.playerCell(), next), (x, y) => this.isBlocked(x, y));
        if (moved) this.path.shift();
        else this.cancelPath(); // 누가 길을 막았다
      } else if (this.pendingInteract) {
        const t = this.pendingInteract;
        this.pendingInteract = null;
        this.player.dir = stepDirection(this.playerCell(), t);
        this.interact();
      }
    }

    const wasMoving = this.player.moving;
    this.player.update(dt);
    for (const npc of this.npcs) npc.update(dt);

    // 칸에 완전히 도착한 순간에만 워프를 판정한다
    if (wasMoving && !this.player.moving) this.checkWarp();

    this.camera.follow(this.player, this.pre.width, this.pre.height);
  }

  /** 포인터/프레젠터로 목적지 지정 */
  goTo(tx, ty, { interact = false } = {}) {
    const blockedForPath = (x, y) => this.isBlocked(x, y);
    // 워프가 걸린 문은 '옆'이 아니라 '위'로 가야 한다 (밟으면 들어간다)
    const isWarpDoor = this.map.warps.some((w) => w.x === tx && w.y === ty);
    const needsAdjacent = !isWarpDoor && (interact || this.isBlocked(tx, ty));
    const path = findPath(this.playerCell(), { x: tx, y: ty }, blockedForPath, { adjacent: needsAdjacent });
    if (!path.length && !(this.player.gx === tx && this.player.gy === ty)) {
      // 이미 옆에 서 있으면 바로 말을 건다
      if (needsAdjacent && Math.abs(this.player.gx - tx) + Math.abs(this.player.gy - ty) === 1) {
        this.player.dir = stepDirection(this.playerCell(), { x: tx, y: ty });
        this.interact();
      }
      return;
    }
    this.path = path;
    this.pendingInteract = needsAdjacent ? { x: tx, y: ty } : null;
  }

  cancelPath() {
    this.path = [];
    this.pendingInteract = null;
  }

  /** 포인터로 찍은 지점 → 칸 */
  onPointer({ x, y }) {
    const { textbox } = this.game;
    if (textbox.open) {
      textbox.advance();
      return;
    }
    const tx = Math.floor((x + this.camera.x) / TILE);
    const ty = Math.floor((y + this.camera.y) / TILE);
    const target = this.targets.find((t) => t.x === tx && t.y === ty);
    this.goTo(tx, ty, { interact: !!target });
  }

  /** 프레젠터 모드 후보 — 가까운 순 */
  targetsNear() {
    const p = this.player;
    return [...this.targets]
      .map((t) => ({ ...t, d: Math.abs(t.x - p.gx) + Math.abs(t.y - p.gy) }))
      .sort((a, b) => a.d - b.d || TARGET_ORDER.indexOf(a.kind) - TARGET_ORDER.indexOf(b.kind))
      .slice(0, 8);
  }

  checkWarp() {
    const w = this.map.warps.find((v) => v.x === this.player.gx && v.y === this.player.gy);
    if (w) this.game.changeMap(w.to, { x: w.tx, y: w.ty, dir: w.dir });
  }

  /** 바라보는 칸에 무엇이 있는지 확인하고 반응 */
  interact() {
    const { x, y } = this.player.facing();
    let npc = this.npcByCell.get(`${x},${y}`);
    // 카운터 너머의 사람에게도 말을 건다 (센터 접수처처럼)
    if (!npc && tileAt(this.map, x, y)?.tag === 'counter') {
      const [dx, dy] = DELTA[this.player.dir];
      npc = this.npcByCell.get(`${x + dx},${y + dy}`);
    }
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
    // 들어갈 수 없는 문 (아직 안 만든 건물)
    if (tile?.tag === 'door' && !this.map.warps.some((w) => w.x === x && w.y === y)) {
      this.game.say(['문이 잠겨 있다.']);
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

    // 프리렌더된 맵에서 보이는 부분만 잘라 붙인다 (물결은 프레임 교체로)
    const frames = this.pre.frames;
    const frame = frames[Math.floor(Math.max(0, time) * WATER_FPS) % frames.length];
    ctx.drawImage(frame, cam.x, cam.y, cam.w, cam.h, 0, 0, cam.w, cam.h);

    // 아래쪽(y 가 큰) 캐릭터가 나중에 그려져 앞에 서도록
    const actors = [...this.npcs, this.player].sort((a, b) => a.py - b.py);
    for (const a of actors) {
      if (a.px - cam.x < -TILE * 2 || a.px - cam.x > cam.w + TILE * 2) continue;
      a.draw(ctx, cam);
    }

    // 프레젠터 모드 커서 — 지금 고른 대상 위에 ▼
    const target = this.game.presenter.enabled ? this.game.presenter.current() : null;
    if (target) {
      const cx = target.x * TILE - cam.x + TILE / 2;
      const cy = target.y * TILE - cam.y - 8 + Math.round(Math.sin(time * 5) * 4);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 10);
      ctx.lineTo(cx + 8, cy - 10);
      ctx.lineTo(cx, cy + 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2a2028';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 풀숲 앞잎을 캐릭터 위에 덮어 '풀에 들어간' 느낌을 만든다
    const sway = Math.sin(time * 6) > 0 ? 1 : 0;
    for (const [gx, gy] of this.pre.tallGrass) {
      const sx = gx * TILE - cam.x;
      const sy = gy * TILE - cam.y;
      if (sx < -TILE || sy < -TILE || sx > cam.w || sy > cam.h) continue;
      const stepping = this.player.gx === gx && this.player.gy === gy;
      drawTallGrassFront(ctx, sx, sy, gx, gy, stepping ? sway : 0);
    }
  }

  dispose() {}
}

/**
 * 맵에서 '말 걸 수 있는 것' 목록.
 * 프레젠터 모드의 선택지이자, 포인터 클릭이 대화로 이어지는 판정 기준이다.
 */
function collectTargets(map) {
  const targets = map.npcs.map((n) => ({ kind: 'npc', x: n.x, y: n.y, label: n.id }));
  map.rows.forEach((row, y) => {
    [...row].forEach((_ch, x) => {
      const tile = tileAt(map, x, y);
      if (tile?.tag === 'door') targets.push({ kind: 'door', x, y, label: '문' });
      if (tile?.tag === 'counter') targets.push({ kind: 'npc', x, y, label: '접수처' });
      if (tile?.tag === 'sign') targets.push({ kind: 'sign', x, y, label: '표지판' });
    });
  });
  return targets;
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
