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
import { PresenterMode, CONTROL_SCHEMES } from './engine/controls.js';
import { loadAssets } from './engine/assets.js';
import { FieldScene } from './scenes/field.js';
import { BattleScene } from './scenes/battle.js';

export const VIEW_W = 256; // DS 상단 화면과 같은 논리 해상도
export const VIEW_H = 192;

const HINTS = {
  keyboard: '이동 방향키 · 대화/확인 Z·Space · 취소 X · 달리기 Shift · 화면을 클릭하면 그 자리로 걸어간다',
  presenter: '레이저 포인터 리모컨: [다음/PageDown] 실행·대화 진행 · [이전/PageUp] 대상 바꾸기',
};

export class Game {
  /**
   * @param {HTMLElement} root
   * @param {{league:object, seasonId:string, playerMemberId?:string, onNavigate?:(path:string)=>void}} opts
   */
  constructor(root, { league, seasonId, playerMemberId, onNavigate, assetBase = 'assets/sprites/' }) {
    this.root = root;
    this.league = league;
    this.seasonId = seasonId;
    this.playerMemberId = playerMemberId;
    this.onNavigate = onNavigate;
    this.assetBase = assetBase;
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
    /** 레이저 포인터(프레젠터 리모컨) 조작 상태 */
    this.presenter = new PresenterMode();
    this.bindPad();
    // 포인터(마우스·터치·자이로 레이저 포인터) — 찍은 칸까지 걸어간다
    this.input.bindPointer(this.canvas, (p) => this.scene?.onPointer?.(p));

    this.loop = new Loop((dt, time) => this.step(dt, time));
    this.scene = null;
    this.fieldScene = null;
    /** 화면 전환 연출: 검은 페이드(맵 이동) / 흰 플래시(배틀 진입) */
    this.fx = { fade: 0, flash: 0, phase: null, t: 0, dur: 0.22, onSwap: null };
  }

  start() {
    // 실제 도트 에셋이 있으면 그것으로 그린다 (없으면 코드 그림 그대로)
    loadAssets(this.assetBase).then((ok) => {
      if (ok && this.fieldScene) this.changeMap(this.fieldScene.map.id, {
        x: this.fieldScene.player.gx,
        y: this.fieldScene.player.gy,
        dir: this.fieldScene.player.dir,
      }, { instant: true });
    });
    const report = this.report();
    const startMap = MAPS.town;
    this.changeMap(startMap.id, startMap.spawn, { instant: true });
    this.loop.start();
    if (!report) {
      this.say(['이번 시즌 데이터가 없다. 관리 화면에서 시즌을 만들어 보자.']);
    }
  }

  step(dt, time) {
    this.textbox.update(dt);
    this.banner.update(dt);
    this.updateFx(dt);
    // 전환 중에는 조작을 막는다 (문을 넘는 도중 입력이 먹히면 어긋난다)
    if (!this.fx.phase) this.scene?.update(dt);
    this.scene?.draw(this.ctx, time);
    this.drawFx();
    this.input.endFrame();
  }

  /* ── 전환 연출 ──────────────────────────────────── */

  updateFx(dt) {
    const fx = this.fx;
    fx.flash = Math.max(0, fx.flash - dt * 3.5);
    if (!fx.phase) return;
    fx.t += dt;
    const k = Math.min(1, fx.t / fx.dur);
    if (fx.phase === 'out') {
      fx.fade = k;
      if (k >= 1) {
        fx.onSwap?.();
        fx.onSwap = null;
        fx.phase = 'in';
        fx.t = 0;
      }
    } else {
      fx.fade = 1 - k;
      if (k >= 1) {
        fx.phase = null;
        fx.fade = 0;
      }
    }
  }

  drawFx() {
    const { fade, flash } = this.fx;
    if (fade > 0) {
      this.ctx.fillStyle = `rgba(0,0,0,${fade})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    if (flash > 0) {
      this.ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash)})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /** 화면을 어둡게 했다가 onSwap 을 실행하고 다시 밝힌다 */
  fadeThrough(onSwap, dur = 0.22) {
    this.fx.phase = 'out';
    this.fx.t = 0;
    this.fx.dur = dur;
    this.fx.onSwap = onSwap;
  }

  /* ── 씬 ─────────────────────────────────────────── */

  changeMap(mapId, spawn, { instant = false } = {}) {
    const map = MAPS[mapId];
    if (!map) return;
    const swap = () => {
      this.scene?.dispose?.();
      this.scene = new FieldScene(this, map, spawn || map.spawn);
      this.fieldScene = this.scene;
      this.scene.enter();
    };
    if (instant) swap();
    else this.fadeThrough(swap);
  }

  startBattle(entry, boss) {
    const field = this.fieldScene;
    this.banner.hide(); // 지역 배너가 체력 상자를 가리지 않게
    this.fx.flash = 1.6; // 배틀 진입 섬광
    this.fadeThrough(() => {
      this.scene = new BattleScene(this, entry, boss, () => {
        this.fadeThrough(() => {
          this.scene = field;
          field.enter();
        });
      });
      this.scene.enter();
    }, 0.3);
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

    this.schemeLabel = h('span', { class: 'gb__scheme' }, '조작: 키보드 / 터치');
    const links = h(
      'div',
      { class: 'gb__links' },
      h(
        'button',
        {
          class: 'btn btn--sm',
          type: 'button',
          onClick: () => this.toggleScheme(),
        },
        '조작 방식 전환',
      ),
      h('button', { class: 'btn btn--sm', type: 'button', onClick: () => this.onNavigate?.('/dex') }, '도감'),
      h('button', { class: 'btn btn--sm', type: 'button', onClick: () => this.onNavigate?.('/league') }, '리그'),
      h('button', { class: 'btn btn--sm', type: 'button', onClick: () => this.onNavigate?.('/admin') }, '실적 입력'),
    );

    this.hintEl = h('p', { class: 'gb__hint' }, HINTS.keyboard);
    return h(
      'div',
      { class: 'gb__pad' },
      this.dpad,
      h('div', { class: 'gb__hintwrap' }, this.hintEl, this.schemeLabel),
      this.actions,
      links,
    );
  }

  /** 키보드 ↔ 레이저 포인터(프레젠터) 조작 전환 */
  toggleScheme() {
    this.presenter.enabled = !this.presenter.enabled;
    if (this.presenter.enabled && this.scene?.targetsNear) {
      this.presenter.setTargets(this.scene.targetsNear());
    }
    const scheme = CONTROL_SCHEMES[this.presenter.enabled ? 1 : 0];
    this.schemeLabel.textContent = `조작: ${scheme.name}`;
    this.hintEl.textContent = this.presenter.enabled ? HINTS.presenter : HINTS.keyboard;
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
