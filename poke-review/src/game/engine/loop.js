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
    // rAF 타임스탬프는 '그 프레임이 시작된 시각'이라 start() 직후 첫 호출에서
    // now 가 _last 보다 앞설 수 있다(= dt 음수). 시간이 거꾸로 흐르면 애니메이션
    // 프레임 인덱스가 음수가 되므로 0 으로 막는다.
    // 상한은 탭이 백그라운드에 다녀왔을 때 dt 가 튀는 걸 막는 용도.
    const dt = Math.max(0, Math.min(0.05, (now - this._last) / 1000));
    this._last = now;
    this.time += dt;
    this.step(dt, this.time);
    this._frame = requestAnimationFrame(this._tick);
  }
}
