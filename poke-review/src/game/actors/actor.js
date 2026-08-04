/**
 * 격자 단위로 움직이는 캐릭터.
 * 칸에서 칸으로 '미끄러지듯' 이동하되 논리 좌표(gx,gy)는 항상 정수라
 * 충돌·상호작용 판정이 단순해진다. (4세대 필드와 같은 방식)
 */
import { TILE } from '../world/tiles.js';
import { charSheet, drawChar, WALK_CYCLE, CH } from '../engine/charsprite.js';

export const WALK_SPEED = 4.2; // 초당 타일
export const RUN_SPEED = 7.5;

export const DELTA = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export class Actor {
  constructor({ x, y, dir = 'down', palette = 'blue', id = null }) {
    this.id = id;
    this.gx = x;
    this.gy = y;
    this.dir = dir;
    this.px = x * TILE;
    this.py = y * TILE;
    this.palette = palette;
    this.sheet = charSheet(palette);
    this.moving = false;
    this.animTime = 0;
    this.animIndex = 0;
    this._from = { x: this.px, y: this.py };
    this._to = { x: this.px, y: this.py };
    this._t = 0;
    this._duration = 0;
  }

  /** 지금 서 있는 칸 앞의 좌표 */
  facing() {
    const [dx, dy] = DELTA[this.dir];
    return { x: this.gx + dx, y: this.gy + dy };
  }

  /**
   * 한 칸 이동 시도. 막혀 있으면 방향만 바꾸고 false.
   * @param {(x:number,y:number)=>boolean} isBlocked
   */
  tryMove(dir, isBlocked, { run = false } = {}) {
    this.dir = dir;
    if (this.moving) return false;
    const [dx, dy] = DELTA[dir];
    const nx = this.gx + dx;
    const ny = this.gy + dy;
    if (isBlocked(nx, ny)) return false;

    this.gx = nx;
    this.gy = ny;
    this._from = { x: this.px, y: this.py };
    this._to = { x: nx * TILE, y: ny * TILE };
    this._t = 0;
    this._duration = 1 / (run ? RUN_SPEED : WALK_SPEED);
    this.moving = true;
    return true;
  }

  update(dt) {
    if (this.moving) {
      this._t += dt;
      const k = Math.min(1, this._t / this._duration);
      this.px = this._from.x + (this._to.x - this._from.x) * k;
      this.py = this._from.y + (this._to.y - this._from.y) * k;
      this.animTime += dt;
      if (this.animTime >= this._duration / 2) {
        this.animTime = 0;
        this.animIndex = (this.animIndex + 1) % WALK_CYCLE.length;
      }
      if (k >= 1) {
        this.moving = false;
        this.px = this._to.x;
        this.py = this._to.y;
      }
    } else {
      this.animTime = 0;
      this.animIndex = 0;
    }
  }

  draw(ctx, camera) {
    // 스프라이트가 타일보다 크므로 발밑을 타일에 맞춘다
    const x = this.px - camera.x;
    const y = this.py - camera.y - (CH - TILE);
    drawChar(ctx, this.sheet, this.dir, WALK_CYCLE[this.animIndex], x, y, this.palette);
  }
}

/** NPC — 서 있다가 말을 걸면 플레이어 쪽을 돌아본다 */
export class Npc extends Actor {
  constructor(def) {
    super({ x: def.x, y: def.y, dir: def.dir, palette: def.palette, id: def.id });
    this.def = def;
    this.homeDir = def.dir;
  }

  lookAt(actor) {
    const dx = actor.gx - this.gx;
    const dy = actor.gy - this.gy;
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }
}
