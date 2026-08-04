# 도트 그림 꽂는 곳

이 폴더에 이미지와 `manifest.json` 을 넣으면 게임이 **코드로 그린 그림 대신 그
이미지를 쓴다.** 비워 두면 지금처럼 코드 그림으로 돈다. 코드는 한 줄도 고치지
않아도 된다.

> ⚠️ 다른 게임에서 추출한 스프라이트는 넣지 말 것. 직접 그렸거나, CC0·구매·
> 의뢰한 그림만 사용한다.

## 1. 파일 배치

```
assets/sprites/
├─ manifest.json
├─ tiles.png      # 맵 타일 모음 (한 칸 16×16 기준)
├─ people.png     # 캐릭터 — 가로 3프레임 × 세로 4방향(아래/왼쪽/오른쪽/위)
└─ mons.png       # 몬스터
```

## 2. manifest.json

```json
{
  "tileSize": 16,
  "sheets": { "world": "tiles.png", "people": "people.png", "mons": "mons.png" },

  "tiles": {
    ".": { "sheet": "world", "x": 0,  "y": 0 },
    "=": { "sheet": "world", "x": 16, "y": 0 },
    "~": { "sheet": "world", "x": 32, "y": 0 },
    "#": { "sheet": "world", "x": 48, "y": 0, "h": 32, "oy": -16 }
  },

  "characters": {
    "red":  { "sheet": "people", "x": 0,  "y": 0,  "w": 16, "h": 24 },
    "blue": { "sheet": "people", "x": 48, "y": 0,  "w": 16, "h": 24 }
  },

  "monsters": {
    "ember:1":      { "sheet": "mons", "x": 0,  "y": 0, "w": 32, "h": 32 },
    "ember:2":      { "sheet": "mons", "x": 32, "y": 0, "w": 32, "h": 32 },
    "ember:2:back": { "sheet": "mons", "x": 64, "y": 0, "w": 32, "h": 32 }
  }
}
```

| 키 | 뜻 |
| --- | --- |
| `tiles` | **맵 문자**(`world/maps.js` 에서 쓰는 그 글자) → 시트 위 좌표 |
| `characters` | **팔레트 이름**(`charsprite.js` 의 `PALETTES` 키) → 캐릭터 시트 |
| `monsters` | `"종족:단계"` 또는 `"종족:단계:back"` → 몬스터 그림 |
| `w` / `h` | 생략하면 `tileSize`. 타일보다 큰 그림(나무 등)에 쓴다 |
| `ox` / `oy` | 그리는 위치 보정. 위로 삐져나오는 오브젝트는 `"oy": -16` |

맵 문자 표는 `src/game/world/tiles.js` 에 있다 (`.` 잔디 · `=` 흙길 · `~` 물 ·
`#` 나무 · `,` 풀숲 · `R/C/M/G` 지붕 · `W` 벽 · `V` 창문 · `D` 문 …).

## 3. 일부만 넣어도 된다

매니페스트에 적힌 것만 이미지로 그리고, 나머지는 코드 그림이 그대로 나온다.
잔디·길·나무만 먼저 바꿔 보고 마음에 들면 늘려 가면 된다.

## 4. 쓸 수 있는 그림 구하기

- 직접 그리기 — Aseprite, Piskel(무료·웹), Libresprite
- CC0/오픈 라이선스 팩 — Kenney(kenney.nl, CC0), OpenGameArt 의 CC0 탑다운 타일셋,
  itch.io 의 CC0 표기 팩
- 의뢰 — 픽셀 아티스트에게 이 폴더 규격(16×16 타일, 16×24 캐릭터 3×4 시트)으로 요청

## 5. 단일 파일 빌드에서 쓰려면

`dist/index.html` 은 보통 `file://` 로 여는데, 브라우저가 그때는 JSON 요청을
막는다(CORS). 그래서 단일 파일에서는 매니페스트를 **페이지에 직접 심는다**:

```html
<script>
  window.POKE_ASSETS = {
    tileSize: 16,
    sheets: { world: 'assets/sprites/tiles.png' },
    tiles: { '.': { sheet: 'world', x: 0, y: 0 } }
  };
</script>
```

이미지 파일 자체는 `file://` 에서도 잘 불러온다. 로컬 서버(`python3 -m http.server`)로
열면 `manifest.json` 이 그대로 쓰이므로 이 과정은 필요 없다.
