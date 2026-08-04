/**
 * 에셋 파이프라인 — 진짜 도트 그림을 꽂는 자리.
 *
 * 코드로 만든 그림에는 한계가 있다. "그 게임과 똑같이" 만들려면 결국 사람이
 * 찍은 도트가 필요하다. 그래서 이 게임은 **그림을 갈아 끼울 수 있게** 만들어져
 * 있다: 아래 매니페스트에 이미지와 좌표를 적어 두면, 렌더러가 코드 그림 대신
 * 그 이미지를 쓴다. 매니페스트가 없으면 지금처럼 코드 그림으로 돌아간다.
 *
 * ※ 남의 게임에서 추출한 스프라이트는 배포할 수 없다. 직접 그렸거나, CC0·
 *   구매·의뢰한 에셋만 넣을 것.
 *
 * 매니페스트: assets/sprites/manifest.json
 * {
 *   "tileSize": 16,
 *   "sheets": { "world": "tiles.png", "people": "people.png", "mons": "mons.png" },
 *   "tiles": {                     // 맵 문자 → 시트 위의 칸
 *     ".": { "sheet": "world", "x": 0,  "y": 0 },
 *     "#": { "sheet": "world", "x": 16, "y": 0, "h": 32, "oy": -16 }
 *   },
 *   "characters": {                // 팔레트 이름 → 4방향×3프레임 시트
 *     "red": { "sheet": "people", "x": 0, "y": 0, "w": 16, "h": 24 }
 *   },
 *   "monsters": {                  // "종족:단계" → 그림
 *     "ember:1": { "sheet": "mons", "x": 0, "y": 0, "w": 32, "h": 32 }
 *   }
 * }
 *
 * 좌표는 픽셀. w/h 를 생략하면 tileSize 를 쓴다.
 * oy 는 위로 삐져나오는 오브젝트(나무처럼)를 올려 그릴 때 쓴다.
 */

const BASE = 'assets/sprites/';

/** @type {{manifest:object|null, images:Record<string,HTMLImageElement>, ready:boolean}} */
export const assets = {
  manifest: null,
  images: {},
  ready: false,
};

/**
 * 매니페스트를 읽어 이미지를 모두 불러온다.
 * 파일이 없으면 조용히 넘어간다 — 코드 그림으로 돌아가면 되기 때문.
 * @param {string} baseUrl 게임 페이지 기준 경로
 * @returns {Promise<boolean>} 에셋을 쓸 수 있으면 true
 */
export async function loadAssets(baseUrl = BASE) {
  try {
    const manifest = await readManifest(baseUrl);
    if (!manifest) return false;
    const entries = Object.entries(manifest.sheets || {});
    const images = {};
    await Promise.all(
      entries.map(
        ([name, file]) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              images[name] = img;
              resolve();
            };
            img.onerror = () => resolve(); // 한 장이 없어도 나머지는 쓴다
            img.src = `${baseUrl}${file}`;
          }),
      ),
    );
    assets.manifest = manifest;
    assets.images = images;
    assets.ready = Object.keys(images).length > 0;
    return assets.ready;
  } catch {
    return false;
  }
}

/**
 * 매니페스트 읽기.
 * file:// 로 연 페이지는 fetch 가 CORS 로 막히므로(단일 파일 빌드가 그렇다),
 * 그럴 땐 페이지에 직접 심어 둔 window.POKE_ASSETS 를 쓴다.
 *
 *   페이지에 window.POKE_ASSETS = { tileSize: 16, sheets: {...}, tiles: {...} } 를 심으면 된다
 */
async function readManifest(baseUrl) {
  if (typeof window !== 'undefined' && window.POKE_ASSETS) return window.POKE_ASSETS;
  if (typeof location !== 'undefined' && location.protocol === 'file:') return null;
  const res = await fetch(`${baseUrl}manifest.json`, { cache: 'no-cache' });
  if (!res.ok) return null;
  return res.json();
}

/** 매니페스트에서 한 조각 찾기 (없으면 null → 코드 그림 사용) */
function lookup(group, key) {
  if (!assets.ready) return null;
  const entry = assets.manifest?.[group]?.[key];
  if (!entry) return null;
  const img = assets.images[entry.sheet];
  if (!img) return null;
  const size = assets.manifest.tileSize || 16;
  return {
    img,
    x: entry.x || 0,
    y: entry.y || 0,
    w: entry.w || size,
    h: entry.h || size,
    ox: entry.ox || 0,
    oy: entry.oy || 0,
  };
}

/**
 * 맵 문자에 대응하는 그림을 그린다.
 * @returns {boolean} 그렸으면 true (false 면 호출한 쪽이 코드 그림을 그린다)
 */
export function drawTileAsset(ctx, ch, x, y) {
  const a = lookup('tiles', ch);
  if (!a) return false;
  ctx.drawImage(a.img, a.x, a.y, a.w, a.h, x + a.ox, y + a.oy, a.w, a.h);
  return true;
}

/** 캐릭터 시트 (4방향 × 3프레임) — 있으면 그 이미지를 그대로 쓴다 */
export function characterAsset(paletteId) {
  return lookup('characters', paletteId);
}

/** 몬스터 그림 — 키는 '종족:단계' 또는 '종족:단계:back' */
export function monsterAsset(speciesId, stage, back) {
  return lookup('monsters', `${speciesId}:${stage}${back ? ':back' : ''}`);
}
