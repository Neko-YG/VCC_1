/**
 * 조작 계층 — "무엇으로 조종하는가"를 게임 로직에서 떼어낸다.
 *
 * 게임(씬)은 항상 같은 6개 액션만 본다:
 *   up / down / left / right / confirm / cancel
 * 그 액션을 무엇이 만들어내는지는 여기서 정한다.
 *
 * ┌ 장치 ─────────────┬ 방식 ───────────────────────────────────────┐
 * │ 키보드            │ 방향키·WASD·Z/Space/Enter                    │
 * │ 화면 D패드(모바일)│ 버튼 pointerdown/up                          │
 * │ 레이저 포인터     │ ① 프레젠터 리모컨: 키보드 이벤트로 들어온다  │
 * │ (프레젠테이션용)  │    PageDown/PageUp/F5/Esc/'.' 등 2~4개 버튼  │
 * │                   │ ② 자이로 포인터(에어마우스): 화면 좌표 클릭  │
 * └───────────────────┴──────────────────────────────────────────────┘
 *
 * 레이저 포인터 리모컨은 버튼이 2~4개뿐이라 방향키로 걷게 만들 수 없다.
 * 그래서 '대상 선택' 모델을 쓴다:
 *   [다음] = 지금 선택된 대상으로 이동해서 말 걸기 / 대화 진행
 *   [이전] = 다음 대상으로 선택 이동 (NPC → 문 → 표지판 순환)
 * 화면에는 선택된 대상에 커서(▼)가 떠서, 발표 중 관객도 무엇을 고른 상태인지 안다.
 *
 * 포인터(에어마우스·터치·마우스)는 찍은 칸까지 BFS 경로로 걸어간다.
 */

/** 키 → 액션 (키보드 + 프레젠터 리모컨이 흔히 보내는 키를 함께 받는다) */
export const KEY_BINDINGS = {
  // 방향
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  // 확인 / 취소
  KeyZ: 'confirm',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  Space: 'confirm',
  KeyX: 'cancel',
  Escape: 'cancel',
  Backspace: 'cancel',
  // 달리기
  ShiftLeft: 'run',
  ShiftRight: 'run',
  // 프레젠터 리모컨 (슬라이드 넘김 버튼)
  PageDown: 'presenterNext',
  PageUp: 'presenterPrev',
  Period: 'presenterNext', // '검은 화면' 버튼을 쓰는 모델
  F5: 'presenterNext',
  Home: 'presenterPrev',
  End: 'presenterNext',
};

/** 프레젠터 모드에서 고를 수 있는 대상의 우선순위 */
export const TARGET_ORDER = ['npc', 'door', 'sign'];

export const CONTROL_SCHEMES = [
  { id: 'keyboard', name: '키보드 / 터치', desc: '방향키로 걷고 Z·Space 로 말을 건다' },
  {
    id: 'presenter',
    name: '레이저 포인터 (프레젠터)',
    desc: '버튼 2개로 조작 — [다음] 실행 / [이전] 대상 바꾸기',
  },
];

/**
 * 프레젠터 모드 상태.
 * 필드 씬이 후보 목록을 채워 주면, 여기서 선택 인덱스만 관리한다.
 */
export class PresenterMode {
  constructor() {
    this.enabled = false;
    this.index = 0;
    this.targets = [];
  }

  /**
   * @param {{kind:string, x:number, y:number, label:string}[]} targets
   */
  setTargets(targets) {
    // 목록이 바뀌어도 가리키던 대상을 유지한다
    const cur = this.current();
    this.targets = targets;
    if (!cur) {
      this.index = 0;
      return;
    }
    const same = targets.findIndex((t) => t.x === cur.x && t.y === cur.y && t.kind === cur.kind);
    this.index = same >= 0 ? same : 0;
  }

  current() {
    return this.targets[this.index] || null;
  }

  next() {
    if (!this.targets.length) return null;
    this.index = (this.index + 1) % this.targets.length;
    return this.current();
  }
}
