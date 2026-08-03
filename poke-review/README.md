# 월간 업적 리그 (poke-review)

월간 업적평가를 **포켓몬 게임**으로 다시 쓴 정적 웹앱.
타일맵 마을을 걸어다니고, 팀원에게 말을 걸고, 체육관에 들어가 이번 달 목표와 싸운다.
빌드 도구·서버·의존성 없이 `index.html` 하나로 돌아간다. 외부 이미지도 0개 — 모든 도트는 코드로 그린다.

화면은 두 겹이다.

| | 무엇 | 경로 |
| --- | --- | --- |
| **필드** | 4세대 오버월드. 걷기·대화·체육관 배틀 | `#/field` |
| **대시보드** | 같은 데이터를 표로 보는 도감·리그·실적 입력 | `#/dex` `#/league` `#/admin` |

둘은 **같은 계산 결과**를 본다. 관리 화면에서 실적 숫자를 고치면 마을 NPC 의 대사도, 체육관 배틀의 승패도 같이 바뀐다.

```
poke-review/index.html  ←  브라우저에서 열면 끝 (ES 모듈이라 file:// 은 안 되고 로컬 서버 필요)
```

---

## 1. 개념 매핑

| 평가 세계          | 게임 세계                  | 구현 위치                      |
| ------------------ | -------------------------- | ------------------------------ |
| 팀원               | 트레이너 + 파트너 포켓몬   | `data/seed.js`, `data/species.js` |
| 평가 영역 6개      | 타입 (불꽃/강철/에스퍼/물/전기/풀) | `data/kpi.js` — `TYPES`        |
| 평가 항목(KPI)     | 기술(Move)                 | `data/kpi.js` — `KPIS`         |
| 달성률             | 기술의 위력·명중률         | `engine/scoring.js`            |
| 업적 누적          | EXP → 레벨 → **진화**      | `engine/leveling.js`           |
| 영역별 강점        | **노력치(EV)** 로 스탯 상승 | `engine/stats.js`              |
| 타고난 성향        | 개체값(IV) + 성격(Nature)  | `core/rng.js`, `core/config.js` |
| 이번 달 목표       | **체육관 관장** 과의 배틀  | `data/bosses.js`, `engine/battle.js` |
| 목표 달성/특이 성과 | 배지                       | `data/badges.js`, `engine/badges.js` |
| 팀 랭킹            | 리그 / 명예의 전당         | `ui/screens/league.js`         |
| 팀원 근황          | 마을 NPC 대사              | `game/scenes/field.js`         |
| 이번 달 평가       | 체육관 배틀 (로그 재생)    | `game/scenes/battle.js`        |

### 그래픽 — 리소스 0개, 전부 코드로 생성

닌텐도 리소스는 쓰지 않는다. 4세대(DPPt/HGSS) 필드가 그렇게 **보이는 이유**를 규칙으로
옮겨서 원본 도트를 생성한다.

| 그 시절 화면의 규칙 | 구현 |
| --- | --- |
| 오토타일 — 흙길·모래·물이 이웃을 보고 가장자리/모서리를 바꿔 둥근 덩어리로 보임 | `tileset.js` `autoEdge()` (8방향 마스크, 바깥 모서리는 깎고 안쪽 모서리는 채움) |
| 겹치는 캐노피 — 나무가 타일 경계를 넘어 그려져 숲이 하나의 덩어리 | 나무만 3패스(외곽선→몸통→잎)로 그려 격자를 지움 |
| 잔디가 체커보드로 안 보이는 이유 | 격자점 난수를 이중선형 보간한 색조 노이즈 |
| 캐릭터가 배경 위에 뜨는 이유 | 실루엣 둘레 1px 외곽선(픽셀 스캔으로 자동) + 재질별 3톤 |
| 걸을 때의 무게감 | 몸 1px 바운스 + 팔다리 교대 + 4프레임 사이클 |
| 풀숲에 들어간 느낌 | 풀 앞잎을 캐릭터 **위에** 한 번 더 그림 |
| 물결 | 물 프레임 3장을 각각 프리렌더해 교체 |
| 몬스터가 생물로 보이는 이유 | 몸통+머리+귀/뿔+팔다리+꼬리+배 무늬, 뒷모습은 얼굴 없이 등 무늬 |
| 장면 전환 | 맵 이동은 검은 페이드, 배틀 진입은 섬광 |

핵심 규칙 세 가지:

1. **스탯은 거짓말을 못 한다.** 스탯 = 종족값(파트너 재능) + 개체값(타고난 편차) + **노력치(실제 업적)**.
   이 중 스스로 바꿀 수 있는 건 노력치뿐이고, 노력치는 KPI 점수에서만 나온다.
2. **배틀은 결정론적이다.** 시드 = `시즌ID:멤버ID`. 같은 실적이면 몇 번을 다시 계산해도 같은 결과·같은 로그.
   평가 도구가 새로고침마다 결과를 바꾸면 안 되기 때문.
3. **관장 레벨은 팀 평균을 따라온다.** 고정 레벨이면 초반엔 전패, 후반엔 전승이 된다.
   기본값은 `팀 평균 레벨 + 1` (`CONFIG.battle.bossScaling`), 시즌별로 고정값 지정 가능.
4. **게임은 계산하지 않는다.** 필드/배틀 씬은 `evaluateAll()` 이 만든 결과를 재생만 한다.
   그래서 도감에서 본 전적과 체육관에서 본 배틀이 절대 어긋나지 않는다.

---

## 2. 실행

```bash
# 저장소 루트에서
python3 -m http.server 8123
# → http://localhost:8123/poke-review/

# 엔진만 검증 (브라우저 없이 밸런스 확인)
node poke-review/tools/smoke.js
```

데이터는 **브라우저 localStorage** 에만 저장된다(`pokereview.state.v1`).
백업·공유는 `관리` 화면의 JSON 내보내기/가져오기.

---

## 3. 구조

### 조작

| | |
| --- | --- |
| 이동 | 방향키 / WASD (화면 D패드도 가능) |
| 대화·확인 | `Z` 또는 `Space` (A 버튼) |
| 취소 | `X` / `Esc` (B 버튼) |
| 달리기 | `Shift` |

```
poke-review/
├─ index.html
├─ assets/css/main.css        # 토큰 → 레이아웃 → 조각 → 화면 순
├─ tools/smoke.js             # 밸런스/회귀 점검 스크립트
└─ src/
   ├─ main.js                 # 라우팅 + 재계산 + 렌더 (진입점)
   ├─ core/
   │  ├─ config.js            # ★ 밸런스 상수 전부 (가장 먼저 볼 파일)
   │  ├─ types.js             # 데이터 스키마 (JSDoc)
   │  ├─ rng.js               # 결정론적 난수, 개체값 생성
   │  └─ store.js             # 상태 + localStorage + 액션
   ├─ data/                   # ★ "무엇을 평가하는가" — 사람이 고치는 값
   │  ├─ kpi.js               # 타입/상성표/평가항목
   │  ├─ species.js           # 진화 라인
   │  ├─ bosses.js            # 체육관 관장
   │  ├─ badges.js            # 배지 목록
   │  └─ seed.js              # 초기 예시 데이터
   ├─ engine/                 # ★ "어떻게 점수가 되는가" — 규칙
   │  ├─ scoring.js           # 실적 → 점수/EXP/노력치/기술
   │  ├─ leveling.js          # EXP → 레벨 → 진화 형태
   │  ├─ stats.js             # 종족값+개체값+노력치 → 실제 스탯
   │  ├─ battle.js            # 턴제 배틀 시뮬레이션
   │  ├─ badges.js            # 배지 판정 규칙
   │  └─ evaluate.js          # 전 시즌 재생(replay) 오케스트레이션
   ├─ ui/
   │  ├─ dom.js, router.js, sprite.js, components.js
   │  └─ screens/             # field / home / pokedex / detail / battle / league / admin
   └─ game/                   # ★ 게임 부분
      ├─ game.js              # 화면·입력·루프·씬 전환
      ├─ engine/
      │  ├─ pixel.js          # 도트 그리기 유틸
      │  ├─ tileset.js        # 타일 그림(맵 전체를 한 장에 프리렌더)
      │  ├─ charsprite.js     # 트레이너 스프라이트 4방향×3프레임 생성
      │  ├─ monsterdraw.js    # 배틀용 몬스터 렌더러
      │  ├─ input.js, loop.js
      ├─ world/
      │  ├─ tiles.js          # 문자 → 타일 정의
      │  ├─ maps.js           # ★ 지도 데이터 (여기만 고치면 마을이 바뀐다)
      │  └─ camera.js
      ├─ actors/actor.js      # 격자 이동·애니메이션
      ├─ scenes/field.js      # 오버월드
      ├─ scenes/battle.js     # 체육관 배틀 재생
      └─ ui/textbox.js, banner.js
```

데이터 흐름은 한 방향이다.

```
store(state) → evaluateAll() → 화면
     ↑                            │
     └────── 액션(store.setRecord 등) ←┘
```

화면은 계산하지 않는다. 새 지표를 화면에 띄우고 싶으면 `engine/` 에서 만들어 결과 객체에 실어 보낸다.

---

## 4. 튜닝 가이드 — 어디를 고치면 무엇이 바뀌나

| 하고 싶은 것                     | 고칠 곳                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| 평가 항목 추가/삭제/가중치 변경  | `data/kpi.js` 의 `KPIS` (화면·입력폼·기술이 전부 따라온다)      |
| 영역(타입) 재정의, 상성 조정     | `data/kpi.js` 의 `TYPES`, `TYPE_CHART`                          |
| 레벨업 속도                      | `core/config.js` → `exp.basePerKpi`, `level.k`                  |
| 진화 시점·파트너 이름            | `data/species.js` 의 `line[].minLevel`, `name`                  |
| 이번 달 난이도                   | 관리 화면의 관장 레벨 / `CONFIG.battle.bossScaling.offset`      |
| 초과달성 인정 폭                 | `exp.scoreCap`(상한), `exp.overAchieveWeight`(초과분 가중)      |
| 등급 컷(S/A/B/C/D)               | `CONFIG.grades`                                                 |
| 배지 규칙                        | `engine/badges.js` 의 `RULES` + `data/badges.js` 에 정의 추가    |
| 스프라이트를 실제 일러스트로     | `ui/sprite.js` 의 `spriteFor()` 를 `<img>` 반환으로 교체        |
| 지도·건물·NPC 배치               | `game/world/maps.js` 의 `rows` 문자열과 `npcs` 배열              |
| 새 타일 종류(다리·바위 등)       | `game/world/tiles.js` 에 한 줄 + `game/engine/tileset.js` 에 그리는 함수 |
| 타일 색감                        | `game/engine/tileset.js` 의 `PAL`                               |
| 캐릭터 옷/머리 색                | `game/engine/charsprite.js` 의 `PALETTES`                        |
| 몬스터 실루엣(귀·꼬리·체형)      | `core/monster.js` 의 `monsterShape()`                            |
| 배틀 화면 배치·체력 상자         | `game/scenes/battle.js`                                          |
| 이동 속도                        | `game/actors/actor.js` 의 `WALK_SPEED` / `RUN_SPEED`            |

수치를 바꾼 뒤에는 `node poke-review/tools/smoke.js` 로 결과를 훑어보면 된다
(레벨 곡선, 시즌별 순위, 돌파율, 배지 획득이 한눈에 나온다).

---

## 5. 계산식

```
점수      score = min(달성률, scoreCap) 에서 1.0 초과분은 overAchieveWeight 만큼만 인정
EXP       Σ(score × 항목가중치 × basePerKpi) + 연속달성보너스 + 퍼펙트보너스 + 배틀보상
레벨      누적EXP(L) = L³ × k            (포켓몬 medium-fast 계열)
노력치    EV += score × scoreToEv × 가중치   (스탯당 252 / 총 510 상한)
스탯      HP  = ⌊(2×종족값+개체값+⌊EV/4⌋)×L/100⌋ + L + 10
          기타 = (⌊(2×종족값+개체값+⌊EV/4⌋)×L/100⌋ + 5) × 성격보정
데미지    ⌊⌊⌊(2L/5+2)×위력×공격/방어⌋/50⌋+2⌋ × 자속 × 상성 × 급소 × 난수(0.85~1.0)
```

---

## 6. 남은 디테일 (여기부터는 취향의 영역)

- 지도 확장: 지금은 마을 1개 + 체육관 1개. `maps.js` 에 맵을 추가하고 워프로 잇기
- 풀숲 랜덤 인카운트(지난달 미제 업무와의 조우), 회복 센터, 상점 같은 필드 이벤트
- 실제 KPI 항목·목표치·가중치를 조직 기준으로 교체 (`data/kpi.js`)
- 파트너 종족 이름/설명, 관장 대사 톤 (`data/species.js`, `data/bosses.js`)
- 배지 규칙 추가 (예: 무결점 3개월, 신규 영역 개척, 팀 기여 1위)
- 스프라이트를 실제 도트 이미지로 교체
- 여러 사람이 같이 쓰려면 저장소를 localStorage → 백엔드/스프레드시트로 교체
  (`core/store.js` 의 인터페이스만 유지하면 나머지는 그대로 동작)
