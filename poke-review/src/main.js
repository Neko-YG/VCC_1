/**
 * 앱 진입점 — 라우팅 + 재계산 + 렌더.
 *
 * 데이터 흐름 한 방향:
 *   store(state)  →  evaluateAll()  →  화면
 * 화면은 store 의 액션만 호출하고, 계산은 절대 하지 않는다.
 */
import { store } from './core/store.js';
import { evaluateAll } from './engine/evaluate.js';
import { h, clear, fmt } from './ui/dom.js';
import { route, setNotFound, startRouter, render, navigate, currentPath, onNavigate } from './ui/router.js';
import { HomeScreen } from './ui/screens/home.js';
import { PokedexScreen } from './ui/screens/pokedex.js';
import { DetailScreen } from './ui/screens/detail.js';
import { BattleScreen } from './ui/screens/battle.js';
import { LeagueScreen } from './ui/screens/league.js';
import { AdminScreen } from './ui/screens/admin.js';
import { FieldScreen, disposeField } from './ui/screens/field.js';
import { emptyState } from './ui/components.js';

const root = document.getElementById('app');

const NAV = [
  { path: '/home', label: '홈' },
  { path: '/field', label: '필드' },
  { path: '/dex', label: '도감' },
  { path: '/battle', label: '체육관' },
  { path: '/league', label: '리그' },
  { path: '/admin', label: '관리' },
];

function ctx(params = {}) {
  const state = store.get();
  const league = evaluateAll(state);
  const seasonId =
    params.seasonId ||
    state.settings.currentSeasonId ||
    league.seasonReports.at(-1)?.season.id;
  return { state, league, params, seasonId };
}

function shell(view, { state, league, seasonId }) {
  const path = currentPath();
  const header = h(
    'header',
    { class: 'topbar' },
    h(
      'a',
      { class: 'topbar__brand', href: '#/home' },
      h('span', { class: 'topbar__logo' }, '◓'),
      h('span', {}, '월간 업적 리그'),
    ),
    h(
      'nav',
      { class: 'topbar__nav' },
      NAV.map((n) =>
        h('a', { class: `topbar__link ${path.startsWith(n.path) ? 'is-on' : ''}`, href: `#${n.path}` }, n.label),
      ),
    ),
    h(
      'label',
      { class: 'topbar__season' },
      h(
        'select',
        {
          onChange: (e) => {
            store.setSetting('currentSeasonId', e.target.value);
            navigate(basePath(path));
          },
        },
        league.seasons.map((s) => h('option', { value: s.id, selected: s.id === seasonId }, fmt.season(s.id))),
      ),
    ),
  );

  return h(
    'div',
    { class: 'app' },
    header,
    h('main', { class: 'main' }, view),
    h(
      'footer',
      { class: 'footer' },
      `${state.settings.orgName || '트레이너 리그'} · 데이터는 브라우저에만 저장됩니다 · `,
      h('a', { href: '#/admin' }, 'JSON 백업'),
    ),
  );
}

/** /battle/2026-07/m1 → /battle 처럼 시즌 전환 시 돌아갈 기본 경로 */
function basePath(path) {
  const seg = path.split('/')[1] || 'home';
  return `/${seg}`;
}

/** 경로가 바뀐 렌더에서만 맨 위로 올린다 (입력 중 재렌더 시 스크롤 유지) */
let lastPath = null;
let jumpToTop = true;

function mount(screenFn, params) {
  disposeField(); // 다른 화면으로 넘어가면 게임 루프를 반드시 멈춘다
  const c = ctx(params);
  const scrollY = jumpToTop ? 0 : window.scrollY;
  let view;
  try {
    view = screenFn(c);
  } catch (err) {
    console.error(err);
    view = emptyState(`화면을 그리는 중 오류가 발생했습니다: ${err.message}`);
  }
  clear(root);
  root.appendChild(shell(view, c));
  window.scrollTo(0, scrollY);
}

route('/home', () => mount(HomeScreen, {}));
route('/field', () => mount(FieldScreen, {}));
route('/dex', () => mount(PokedexScreen, {}));
route('/dex/:id', (params) => mount(DetailScreen, params));
route('/battle', () => mount(BattleScreen, {}));
route('/battle/:seasonId', (params) => mount(BattleScreen, params));
route('/battle/:seasonId/:memberId', (params) => mount(BattleScreen, params));
route('/league', () => mount(LeagueScreen, {}));
route('/admin', () => mount(AdminScreen, {}));

setNotFound(() => mount(() => emptyState('없는 페이지입니다.', h('a', { class: 'btn', href: '#/home' }, '홈으로')), {}));

onNavigate((path) => {
  jumpToTop = path !== lastPath;
  lastPath = path;
});

// 데이터가 바뀌면 현재 화면을 다시 그린다
store.subscribe(() => render());

startRouter();

// 콘솔에서 밸런스 확인할 때 쓰라고 열어둔다
window.PokeReview = { store, evaluateAll };
