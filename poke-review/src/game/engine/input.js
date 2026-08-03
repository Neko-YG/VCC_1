/**
 * 입력 — 키보드 · 화면 D패드 · 포인터(마우스/터치/레이저 포인터).
 * 게임 로직은 "지금 눌려 있는가(held)" 와 "이번 프레임에 눌렸는가(pressed)" 만 본다.
 * 어떤 키가 어떤 액션인지는 controls.js 가 정한다.
 */
import { KEY_BINDINGS } from './controls.js';

export class Input {
  constructor(target = window) {
    this.held = new Set();
    this.justPressed = new Set();
    this._onKeyDown = (e) => {
      const action = KEY_BINDINGS[e.code];
      if (!action) return;
      e.preventDefault();
      if (!this.held.has(action)) this.justPressed.add(action);
      this.held.add(action);
    };
    this._onKeyUp = (e) => {
      const action = KEY_BINDINGS[e.code];
      if (!action) return;
      e.preventDefault();
      this.held.delete(action);
    };
    this._blur = () => this.held.clear();
    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._blur);
    this._target = target;
  }

  /**
   * 포인터(마우스·터치·자이로 레이저 포인터) 입력.
   * 화면 좌표를 논리 해상도 좌표로 바꿔 넘긴다 — 씬은 카메라를 더해 칸을 구한다.
   * @param {HTMLCanvasElement} canvas
   * @param {(p:{x:number,y:number})=>void} handler
   */
  bindPointer(canvas, handler) {
    const onDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      handler({
        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas.height,
      });
    };
    canvas.addEventListener('pointerdown', onDown);
    this._pointerCleanup = () => canvas.removeEventListener('pointerdown', onDown);
  }

  /** 화면 버튼용 — D패드/버튼 요소에 연결 */
  bindButton(el, action) {
    const down = (e) => {
      e.preventDefault();
      if (!this.held.has(action)) this.justPressed.add(action);
      this.held.add(action);
    };
    const up = (e) => {
      e.preventDefault();
      this.held.delete(action);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }

  isDown(action) {
    return this.held.has(action);
  }

  pressed(action) {
    return this.justPressed.has(action);
  }

  /**
   * 방향키 중 지금 눌린 것.
   * 톡 눌렀다 뗀 경우(키다운·키업이 한 프레임 안에 다 일어난 경우)도 살려야
   * "제자리에서 방향만 돌리기"가 된다.
   */
  direction() {
    for (const dir of ['up', 'down', 'left', 'right']) {
      if (this.held.has(dir) || this.justPressed.has(dir)) return dir;
    }
    return null;
  }

  /** 매 프레임 끝에서 호출 */
  endFrame() {
    this.justPressed.clear();
  }

  dispose() {
    this._pointerCleanup?.();
    this._target.removeEventListener('keydown', this._onKeyDown);
    this._target.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._blur);
  }
}
