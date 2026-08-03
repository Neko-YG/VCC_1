/** 게임 루프 — requestAnimationFrame, dt 는 초 단위로 넘긴다. */

export class Loop {
  /** @param {(dt:number, time:number)=>void} step */
  constructor(step) {
    this.step = step;
    this.running = false;
    this.time = 0;
    this._last = 0;
    this._frame = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    this._frame = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._frame);
  }

  _tick(now) {
    if (!this.running) return;
    // 탭이 백그라운드로 갔다 오면 dt 가 튀므로 상한을 둔다
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    this.time += dt;
    this.step(dt, this.time);
    this._frame = requestAnimationFrame(this._tick);
  }
}
