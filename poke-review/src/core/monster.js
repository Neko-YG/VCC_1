/**
 * 파트너 몬스터의 "형상"을 만든다 (그리는 건 렌더러 몫).
 * 도감(SVG)과 배틀(캔버스)이 같은 모양을 쓰도록 여기서 한 번만 계산한다.
 *
 * 덩어리 하나로는 생물로 보이지 않는다. 몸통 위에 머리를 얹고 귀·팔·다리·꼬리를
 * 붙인 뒤, 배에 밝은 무늬를 넣고 실루엣 둘레에 외곽선을 두른다.
 * 종족 id 를 시드로 귀 모양·꼬리·체형이 정해지고, 진화 단계가 오르면 몸이
 * 커지면서 뿔·가시 같은 장식이 늘어난다.
 */
import { createRng } from './rng.js';

export const MONSTER_GRID = 24;

/** 칸의 색 역할 */
export const TONE = {
  EMPTY: 0,
  BASE: 1,
  LIGHT: 2,
  DARK: 3,
  BELLY: 4,
  EYE: 5,
  EYE_HI: 6,
  MOUTH: 7,
  OUTLINE: 8,
};

/**
 * @param {{speciesId:string, stage:number, back?:boolean}} opts  back=true 면 뒷모습(내 쪽 몬스터)
 * @returns {{size:number, matrix:Uint8Array, cells:{x:number,y:number,tone:number}[]}}
 */
export function monsterShape({ speciesId = 'ember', stage = 1, back = false } = {}) {
  const G = MONSTER_GRID;
  const rng = createRng(`${speciesId}:shape`);
  const m = new Uint8Array(G * G);
  const idx = (x, y) => y * G + x;
  const put = (x, y, tone) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= G || yi >= G) return;
    m[idx(xi, yi)] = tone;
  };
  /** 좌우 대칭으로 찍는다 */
  const mirror = (x, y, tone) => {
    put(x, y, tone);
    put(G - 1 - x, y, tone);
  };
  const disc = (cx, cy, rx, ry, tone, { mirrorX = false } = {}) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          put(x, y, tone);
          if (mirrorX) put(G - 1 - x, y, tone);
        }
      }
    }
  };

  // 종족별 개성
  const earType = rng.int(0, 2); // 0 뾰족귀 / 1 둥근귀 / 2 뿔
  const tailType = rng.int(0, 2);
  const chunky = rng.chance(0.5);

  const grow = (stage - 1) * 0.9;
  const bodyRx = (chunky ? 6.4 : 5.6) + grow;
  const bodyRy = (chunky ? 5.4 : 5.8) + grow * 0.8;
  const bodyCy = 15.5 - grow * 0.5;
  const headR = 4.4 + grow * 0.55;
  const headCy = bodyCy - bodyRy - headR + 3.2;

  // 꼬리 (몸 뒤쪽 = 오른쪽)
  if (stage >= 2 || tailType > 0) {
    const len = 3 + stage;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const x = 12 + bodyRx - 1 + i * 1.1;
      const y = bodyCy + 1 - Math.sin(t * 2.2) * (2 + stage);
      disc(x, y, 1.6 - t * 0.6, 1.6 - t * 0.6, TONE.BASE);
    }
    if (stage >= 3) disc(12 + bodyRx + len * 1.1, bodyCy - 4 - stage, 2.2, 2.2, TONE.LIGHT);
  }

  // 다리
  const legY = bodyCy + bodyRy - 1;
  const legSpread = chunky ? 3.2 : 2.6;
  for (const s of [-1, 1]) {
    disc(12 + s * legSpread, legY + 2, 2.2, 2.4, TONE.BASE);
    disc(12 + s * legSpread, legY + 3.2, 2.4, 1.4, TONE.DARK);
  }

  // 팔
  for (const s of [-1, 1]) {
    disc(12 + s * (bodyRx + 0.4), bodyCy - 0.5, 1.9, 2.6, TONE.BASE);
  }

  // 몸통 + 배 무늬 + 등 하이라이트
  disc(12, bodyCy, bodyRx, bodyRy, TONE.BASE);
  if (back) {
    // 뒷모습: 배 무늬 대신 등 한가운데가 어둡다
    disc(12, bodyCy + 0.6, bodyRx * 0.55, bodyRy * 0.6, TONE.DARK);
    disc(12, bodyCy - bodyRy * 0.5, bodyRx * 0.55, bodyRy * 0.35, TONE.LIGHT);
  } else {
    disc(12, bodyCy + 1.2, bodyRx * 0.62, bodyRy * 0.62, TONE.BELLY);
    disc(12, bodyCy - bodyRy * 0.55, bodyRx * 0.5, bodyRy * 0.3, TONE.LIGHT);
  }

  // 머리
  disc(12, headCy, headR + 0.6, headR, TONE.BASE);
  disc(12, headCy - headR * 0.45, headR * 0.7, headR * 0.42, back ? TONE.DARK : TONE.LIGHT);

  // 귀 / 뿔
  const earX = 12 - headR * 0.75;
  const earH = 2 + stage;
  if (earType === 0) {
    for (let i = 0; i < earH; i++) {
      const w = Math.max(0, 2 - i * 0.5);
      for (let k = 0; k <= w; k++) mirror(Math.round(earX - k), Math.round(headCy - headR - i + 0.5), TONE.BASE);
    }
  } else if (earType === 1) {
    disc(earX - 0.5, headCy - headR + 0.5, 2 + stage * 0.3, 2.2 + stage * 0.3, TONE.BASE, { mirrorX: true });
    disc(earX - 0.5, headCy - headR + 0.8, 1 + stage * 0.2, 1.2 + stage * 0.2, TONE.DARK, { mirrorX: true });
  } else {
    for (let i = 0; i < earH + 1; i++) {
      mirror(Math.round(earX + 0.5), Math.round(headCy - headR - i + 1), i < 2 ? TONE.BASE : TONE.LIGHT);
    }
  }

  // 최종 진화는 등에 가시 한 쌍 더
  if (stage >= 3) {
    for (let i = 0; i < 3; i++) {
      mirror(Math.round(12 - bodyRx * 0.55), Math.round(bodyCy - bodyRy - i + 1), TONE.LIGHT);
    }
  }

  // 눈·입 (뒷모습에는 없다)
  if (!back) {
    const eyeY = Math.round(headCy - 0.2);
    const eyeX = Math.round(12 - headR * 0.55);
    for (const ex of [eyeX, G - 1 - eyeX]) {
      put(ex, eyeY, TONE.EYE_HI);
      put(ex, eyeY + 1, TONE.EYE);
    }
    const mouthY = eyeY + 2;
    put(11, mouthY, TONE.MOUTH);
    put(12, mouthY, TONE.MOUTH);
    if (stage >= 2) {
      put(10, mouthY - 1, TONE.MOUTH);
      put(13, mouthY - 1, TONE.MOUTH);
    }
  }

  // 외곽선 — 비어 있으면서 채워진 칸과 붙어 있는 자리
  const filled = (x, y) => x >= 0 && y >= 0 && x < G && y < G && m[idx(x, y)] !== TONE.EMPTY;
  const outline = [];
  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) {
      if (filled(x, y)) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) outline.push([x, y]);
    }
  }
  for (const [x, y] of outline) m[idx(x, y)] = TONE.OUTLINE;

  const cells = [];
  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) {
      const tone = m[idx(x, y)];
      if (tone !== TONE.EMPTY) cells.push({ x, y, tone });
    }
  }
  return { size: G, matrix: m, cells };
}

/**
 * 색 역할 → 실제 색.
 * @param {string} color 타입 대표색
 * @param {(hex:string, amount:number)=>string} shade core/color.js 의 shade
 */
export function tonePalette(color, shade) {
  return {
    [TONE.BASE]: color,
    [TONE.LIGHT]: shade(color, 45),
    [TONE.DARK]: shade(color, -55),
    [TONE.BELLY]: shade(color, 78),
    [TONE.EYE]: '#241f2b',
    [TONE.EYE_HI]: '#ffffff',
    [TONE.MOUTH]: shade(color, -80),
    [TONE.OUTLINE]: '#221c26',
  };
}
