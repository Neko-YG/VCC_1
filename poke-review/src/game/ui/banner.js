/** 지역명 배너 — 맵에 들어설 때 "여기는 ○○" 하고 잠깐 떴다 사라진다. */
import { h } from '../../ui/dom.js';

export class Banner {
  constructor(root) {
    this.titleEl = h('div', { class: 'gb-banner__title' });
    this.subEl = h('div', { class: 'gb-banner__sub' });
    this.el = h('div', { class: 'gb-banner', hidden: true }, h('span', { class: 'gb-banner__arrow' }, '↓'), h('div', {}, this.titleEl, this.subEl));
    root.appendChild(this.el);
    this.timer = 0;
  }

  show(title, subtitle = '', seconds = 2.4) {
    this.titleEl.textContent = title;
    this.subEl.textContent = subtitle;
    this.subEl.hidden = !subtitle;
    this.el.hidden = false;
    this.el.classList.remove('is-in');
    void this.el.offsetWidth; // 애니메이션 재시작
    this.el.classList.add('is-in');
    this.timer = seconds;
  }

  update(dt) {
    if (this.timer <= 0) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.el.hidden = true;
      this.el.classList.remove('is-in');
    }
  }

  dispose() {
    this.el.remove();
  }
}
