/** 필드 화면 — 대시보드 라우터에 게임을 얹는 얇은 래퍼. */
import { h } from '../dom.js';
import { emptyState } from '../components.js';
import { Game } from '../../game/game.js';
import { navigate } from '../router.js';

/** 라우트를 떠날 때 정리해야 하므로 인스턴스를 붙들어 둔다 */
let running = null;

export function disposeField() {
  running?.dispose();
  running = null;
}

export function FieldScreen({ league, state, seasonId }) {
  disposeField();

  if (!league.seasonReports.length) {
    return emptyState(
      '시즌 데이터가 없어 마을을 열 수 없습니다.',
      h('button', { class: 'btn btn--primary', onClick: () => navigate('/admin') }, '관리 화면으로'),
    );
  }

  const mount = h('div', { class: 'gamewrap' });
  // 캔버스는 DOM 에 붙은 뒤에 크기가 잡히므로 다음 프레임에 시작한다
  queueMicrotask(() => {
    if (!mount.isConnected) return;
    running = new Game(mount, {
      league,
      seasonId,
      playerMemberId: state.settings.playerMemberId || state.members[0]?.id,
      onNavigate: (path) => navigate(path),
    });
    running.start();
    // 콘솔에서 좌표·씬을 들여다볼 수 있게 열어둔다 (window.PokeReview.game)
    if (window.PokeReview) window.PokeReview.game = running;
  });

  return h(
    'div',
    { class: 'screen screen--field' },
    mount,
    h(
      'p',
      { class: 'hint' },
      '체육관 문으로 들어가 관장에게 말을 걸면 이번 달 평가 배틀이 시작된다. 결과는 도감·리그와 같은 계산을 쓴다.',
    ),
  );
}
