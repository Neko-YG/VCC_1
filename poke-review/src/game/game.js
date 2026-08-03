/**
 * 게임 본체 — 화면(캔버스+오버레이) 생성, 입력/루프, 씬 전환.
 *
 * 평가 데이터는 절대 여기서 계산하지 않는다. evaluate.js 의 결과(league)를 받아
 * 대사와 배틀 재생에 쓰기만 한다. 그래야 도감 화면과 게임이 늘 같은 얘기를 한다.
 */
import { h } from '../ui/dom.js';
import { Input } from './engine/input.js';
import { Loop } from './engine/loop.js';
import { TextBox } from './ui/textbox.js';
import { Banner } from './ui/banner.js';
import { MAPS } from './world/maps.js';
import { FieldScene } from './scenes/field.js';
import { BattleScene } from './scenes/battle.js';

export const VIEW_W = 256; // DS 상단 화면과 같은 논리 해상도
export const VIEW_H = 192;

export class Game {
  /**
   * @param {HTMLElement} root
   * @param {{league:object, seasonId:string, playerMemberId?:string, onNavigate?:(path:string)=>void}} opts
   */
  constructor(root, { league, seasonId, playerMemberId, onNavigate }) {
    this.root = root;
    this.league = league;
    this.seasonId = seasonId;
    this.playerMemberId = playerMemberId;
    this.onNavigate = onNavigate;
    this.width = VIEW_W;
    this.height = VIEW_H;

    this.canvas = h('canvas', { class: 'gb__canvas', width: VIEW_W, height: VIEW_H });
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.overlay = h('div', { class: 'gb__overlay' });
    this.screen = h('div', { class: 'gb__screen' }, this.canvas, this.overlay);
    this.pad = this.buildPad();
    this.el = h('div', { class: 'gb' }, this.screen, this.pad);
    root.appendChild(this.el);

    this.textbox = new TextBox(this.overlay);
    this.banner = new Banner(this.overlay);
    this.input = new Input(window);
    this.bindPad();

    this.loop = new Loop((dt, time) => this.step(dt, time));
    this.scene = null;
    this.fieldScene = null;
  }

  start() {
    const report = this.report();
    const startMap = MAPS.town;
    this.changeMap(startMap.id, startMap.spawn);
    this.loop.start();
    if (!report) {
      this.say(['이번 시즌 데이터가 없다. 관리 화면에서 시즌을 만들어 보자.']);
    }
  }

  step(dt, time) {
    this.textbox.update(dt);
    this.banner.update(dt);
    this.scene?.update(dt);
    this.scene?.draw(this.ctx, time);
    this.input.endFrame();
  }

  /* ── 씬 ─────────────────────────────────────────── */

  changeMap(mapId, spawn) {
    const map = MAPS[mapId];
    if (!map) return;
    this.scene?.dispose?.();
    this.scene = new FieldScene(this, map, spawn || map.spawn);
    this.fieldScene = this.scene;
    this.scene.enter();
  }

  startBattle(entry, boss) {
    const field = this.fieldScene;
    this.scene = new BattleScene(this, entry, boss, () => {
      this.scene = field;
      field.enter();
    });
    this.scene.enter();
  }

  say(lines, opts) {
    this.textbox.show(lines, opts);
  }

  /* ── 평가 데이터 조회 ───────────────────────────── */

  report() {
    return this.league.bySeasonId[this.seasonId] || this.league.seasonReports.at(-1) || null;
  }

  boss() {
    return this.report()?.boss || null;
  }

  /** 맵에 배치된 순서(memberIndex)로 팀원 결과 찾기 */
  memberEntry(index) {
    const report = this.report();
    if (!report) return null;
    return report.entries[index] || null;
  }

  /** 플레이어가 조작 중인 트레이너 */
  playerEntry() {
    const report = this.report();
    if (!report) return null;
    return (
      report.entries.find((e) => e.memberId === this.playerMemberId) || report.entries[0] || null
    );
  }

  /* ── 화면 버튼 ──────────────────────────────────── */

  buildPad() {
    const btn = (label, action, cls = '') =>
      h('button', { class: `gb__btn ${cls}`, dataset: { action }, type: 'button', 'aria-label': label }, label);

    this.dpad = h(
      'div',
      { class: 'gb__dpad' },
      btn('▲', 'up', 'gb__btn--up'),
      btn('◀', 'left', 'gb__btn--left'),
      btn('▶', 'right', 'gb__btn--right'),
      btn('▼', 'down', 'gb__btn--down'),
    );
    this.actions = h(
      'div',
      { class: 'gb__actions' },
      btn('B', 'cancel', 'gb__btn--b'),
      btn('A', 'confirm', 'gb__btn--a'),
    );

    const links = h(
      'div',
      { class: 'gb__links' },
      h('button', { class: 'btn btn--sm', type: 'button', onClick: () => this.onNavigate?.('/dex') }, '도감'),
      h('button', { class: 'btn btn--sm', type: 'button', onClick: () => this.onNavigate?.('/league') }, '리그'),
      h('button', { class: 'btn btn--sm', type: 'button', onClick: () => this.onNavigate?.('/admin') }, '실적 입력'),
    );

    return h(
      'div',
      { class: 'gb__pad' },
      this.dpad,
      h('p', { class: 'gb__hint' }, '이동 방향키 · 대화/확인 Z 또는 Space · 취소 X · 달리기 Shift'),
      this.actions,
      links,
    );
  }

  bindPad() {
    for (const el of this.el.querySelectorAll('.gb__btn')) {
      this.input.bindButton(el, el.dataset.action);
    }
  }

  dispose() {
    this.loop.stop();
    this.input.dispose();
    this.textbox.dispose();
    this.banner.dispose();
    this.el.remove();
  }
}
