/**
 * 대화창 — 한 글자씩 찍히고, 확인키로 넘긴다.
 * 캔버스가 아니라 DOM 으로 그린다: 한글이 또렷하고 화면 크기에 맞춰 늘어난다.
 */
import { h, clear } from '../../ui/dom.js';

const CHARS_PER_SEC = 45;

export class TextBox {
  constructor(root) {
    this.nameEl = h('div', { class: 'gb-box__name' });
    this.textEl = h('div', { class: 'gb-box__text' });
    this.arrowEl = h('div', { class: 'gb-box__arrow' }, '▼');
    this.el = h('div', { class: 'gb-box', hidden: true }, this.nameEl, this.textEl, this.arrowEl);
    root.appendChild(this.el);

    this.lines = [];
    this.index = 0;
    this.shown = 0;
    this.open = false;
    this.onDone = null;
  }

  /**
   * @param {string[]} lines
   * @param {{speaker?:string, onDone?:()=>void}} opts
   */
  show(lines, { speaker = '', onDone = null } = {}) {
    this.lines = lines.filter(Boolean);
    this.index = 0;
    this.shown = 0;
    this.open = true;
    this.onDone = onDone;
    this.nameEl.textContent = speaker;
    this.nameEl.hidden = !speaker;
    this.el.hidden = false;
    this._render();
  }

  /** 확인키. 타이핑 중이면 즉시 완성, 끝났으면 다음 줄 / 닫기 */
  advance() {
    if (!this.open) return;
    const full = this.lines[this.index] || '';
    if (this.shown < full.length) {
      this.shown = full.length;
      this._render();
      return;
    }
    if (this.index < this.lines.length - 1) {
      this.index++;
      this.shown = 0;
      this._render();
      return;
    }
    this.hide();
    const done = this.onDone;
    this.onDone = null;
    done?.();
  }

  update(dt) {
    if (!this.open) return;
    const full = this.lines[this.index] || '';
    if (this.shown < full.length) {
      this.shown = Math.min(full.length, this.shown + CHARS_PER_SEC * dt);
      this._render();
    }
  }

  get typing() {
    return this.open && this.shown < (this.lines[this.index] || '').length;
  }

  hide() {
    this.open = false;
    this.el.hidden = true;
  }

  _render() {
    const full = this.lines[this.index] || '';
    this.textEl.textContent = full.slice(0, Math.floor(this.shown));
    this.arrowEl.hidden = this.typing;
  }

  dispose() {
    clear(this.el);
    this.el.remove();
  }
}
