/**
 * 파트너 몬스터의 "형상"을 만든다 (그리는 건 렌더러 몫).
 * 도감(SVG)과 배틀(캔버스)이 같은 모양을 쓰도록 여기서 한 번만 계산한다.
 *
 * 설계 방향: 무섭지 않고 친근한 '작은 동물'.
 *  - 머리가 몸보다 크다 (2등신). 이 비율이 귀여움의 8할이다
 *  - 눈이 크고 하이라이트가 두 개, 볼에 홍조, 입은 작게
 *  - 귀·꼬리·발로 종족을 구분한다 (고양이/토끼/강아지/곰...)
 *  - 표정을 바꿀 수 있다: 평소 / 기쁨 / 아픔 — 배틀에서 체력에 따라 달라진다
 */
import { createRng } from './rng.js';

export const MONSTER_GRID = 48; // 몬스터 도트 해상도 (24 → 48)

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
  CHEEK: 9,
  EYE_WHITE: 10,
};

export const EXPRESSIONS = ['normal', 'happy', 'hurt'];

/**
 * @param {{speciesId:string, stage:number, back?:boolean, expression?:'normal'|'happy'|'hurt'}} opts
 * @returns {{size:number, matrix:Uint8Array, cells:{x:number,y:number,tone:number}[]}}
 */
export function monsterShape({ speciesId = 'ember', stage = 1, back = false, expression = 'normal' } = {}) {
  const G = MONSTER_GRID;
  const rng = createRng(`${speciesId}:animal`);
  const m = new Uint8Array(G * G);
  const idx = (x, y) => y * G + x;

  /**
   * 도형은 24칸 기준으로 적고, 실제 격자(G)에 맞춰 확대해 찍는다.
   * 곡선은 확대된 해상도에서 다시 계산되므로 격자를 키우면 실제로 매끄러워진다.
   * (숫자를 전부 고쳐 쓰지 않아도 해상도를 바꿀 수 있다)
   */
  const U = G / 24;
  const setPx = (x, y, tone) => {
    if (x < 0 || y < 0 || x >= G || y >= G) return;
    m[idx(x, y)] = tone;
  };
  /** 24칸 기준 한 칸 = U×U 픽셀 */
  const put = (x, y, tone) => {
    const px0 = Math.round(x * U);
    const py0 = Math.round(y * U);
    for (let dy = 0; dy < U; dy++) for (let dx = 0; dx < U; dx++) setPx(px0 + dx, py0 + dy, tone);
  };
  const mirror = (x, y, tone) => {
    put(x, y, tone);
    put(23 - x, y, tone);
  };
  const disc = (cx, cy, rx, ry, tone, { mirrorX = false } = {}) => {
    const CXp = cx * U;
    const CYp = cy * U;
    const RXp = rx * U;
    const RYp = ry * U;
    for (let y = Math.floor(CYp - RYp); y <= Math.ceil(CYp + RYp); y++) {
      for (let x = Math.floor(CXp - RXp); x <= Math.ceil(CXp + RXp); x++) {
        const dx = (x - CXp) / RXp;
        const dy = (y - CYp) / RYp;
        if (dx * dx + dy * dy <= 1) {
          setPx(x, y, tone);
          if (mirrorX) setPx(G - 1 - x, y, tone);
        }
      }
    }
  };

  // 종족 개성 — 귀 모양이 캐릭터를 가장 크게 좌우한다
  const earType = rng.int(0, 3); // 0 고양이 / 1 토끼 / 2 강아지(처진 귀) / 3 곰(동그란 귀)
  const tailType = rng.int(0, 2); // 0 짧은 / 1 뭉툭 / 2 긴
  const CX = 12;

  // 2등신 비율: 진화해도 머리를 크게 유지한다
  const grow = (stage - 1) * 0.7;
  const headR = 6.4 + grow * 0.5;
  const headCy = 9.2;
  const bodyRx = 5.0 + grow;
  const bodyRy = 4.2 + grow * 0.6;
  const bodyCy = headCy + headR + bodyRy - 2.6;

  /* 꼬리 — 몸 오른쪽 뒤 */
  {
    const len = tailType === 2 ? 5 + stage : 3 + stage;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const x = CX + bodyRx - 1 + i * 1.05;
      const y = bodyCy + 0.5 - Math.sin(t * 2.0) * (2 + stage * 0.8);
      disc(x, y, 1.7 - t * 0.5, 1.7 - t * 0.5, TONE.BASE);
    }
    // 꼬리 끝 뭉치
    if (tailType >= 1) {
      const t = 1;
      disc(CX + bodyRx - 1 + len * 1.05, bodyCy + 0.5 - Math.sin(t * 2.0) * (2 + stage * 0.8), 2.2, 2.2, TONE.LIGHT);
    }
  }

  /* 발 */
  for (const s of [-1, 1]) {
    disc(CX + s * 3.0, bodyCy + bodyRy - 0.2, 2.4, 1.9, TONE.BASE);
    disc(CX + s * 3.0, bodyCy + bodyRy + 0.4, 2.0, 1.2, TONE.LIGHT);
  }

  /* 몸통 */
  disc(CX, bodyCy, bodyRx, bodyRy, TONE.BASE);
  if (back) {
    disc(CX, bodyCy + 0.4, bodyRx * 0.5, bodyRy * 0.55, TONE.DARK);
  } else {
    disc(CX, bodyCy + 0.8, bodyRx * 0.6, bodyRy * 0.65, TONE.BELLY);
  }

  /* 앞발(팔) */
  for (const s of [-1, 1]) {
    disc(CX + s * (bodyRx + 0.2), bodyCy - 0.3, 1.7, 2.2, TONE.BASE);
  }

  /* 머리 */
  disc(CX, headCy, headR, headR - 0.4, TONE.BASE);
  disc(CX, headCy - headR * 0.5, headR * 0.62, headR * 0.34, back ? TONE.DARK : TONE.LIGHT);

  /* 귀 */
  const earOff = headR * 0.62;
  if (earType === 0) {
    // 고양이 — 삼각 귀
    for (let i = 0; i < 4 + stage; i++) {
      const w = Math.max(0, 2.6 - i * 0.6);
      for (let k = 0; k <= w; k++) {
        mirror(Math.round(CX - earOff - k + 1), Math.round(headCy - headR - i + 2), TONE.BASE);
      }
    }
    for (let i = 0; i < 2 + stage; i++) mirror(Math.round(CX - earOff + 1), Math.round(headCy - headR - i + 2.5), TONE.BELLY);
  } else if (earType === 1) {
    // 토끼 — 길고 둥근 귀
    disc(CX - earOff, headCy - headR - 2.5 - stage * 0.6, 1.9, 4 + stage * 0.8, TONE.BASE, { mirrorX: true });
    disc(CX - earOff, headCy - headR - 2.5 - stage * 0.6, 0.9, 2.6 + stage * 0.5, TONE.BELLY, { mirrorX: true });
  } else if (earType === 2) {
    // 강아지 — 옆으로 처진 귀
    disc(CX - headR + 0.5, headCy - 1.5, 2.2, 3.4 + stage * 0.4, TONE.BASE, { mirrorX: true });
    disc(CX - headR + 0.5, headCy - 1.5, 1.2, 2.2 + stage * 0.3, TONE.DARK, { mirrorX: true });
  } else {
    // 곰 — 동그란 귀
    disc(CX - earOff - 0.4, headCy - headR + 0.6, 2.4 + stage * 0.2, 2.4 + stage * 0.2, TONE.BASE, { mirrorX: true });
    disc(CX - earOff - 0.4, headCy - headR + 0.9, 1.2, 1.2, TONE.BELLY, { mirrorX: true });
  }

  /* 최종 진화 표시 — 이마의 작은 보석 */
  if (stage >= 3 && !back) disc(CX, headCy - headR * 0.62, 1.2, 1.2, TONE.LIGHT);

  /* 얼굴 — 뒷모습에는 없다 */
  if (!back) {
    const eyeY = headCy + 0.6;
    const eyeX = CX - headR * 0.48;

    if (expression === 'happy') {
      // ^ ^ 감은 눈
      for (const s of [-1, 1]) {
        const ex = CX + s * headR * 0.48;
        put(ex - 1, eyeY, TONE.EYE);
        put(ex, eyeY - 1, TONE.EYE);
        put(ex + 1, eyeY, TONE.EYE);
      }
    } else if (expression === 'hurt') {
      // > < 찡그린 눈
      for (const s of [-1, 1]) {
        const ex = CX + s * headR * 0.48;
        put(ex - 1, eyeY - 1, TONE.EYE);
        put(ex, eyeY, TONE.EYE);
        put(ex - 1, eyeY + 1, TONE.EYE);
        put(ex + 1, eyeY - 1, TONE.EYE);
        put(ex + 1, eyeY + 1, TONE.EYE);
      }
    } else {
      // 큰 눈 + 하이라이트 두 개
      for (const s of [-1, 1]) {
        const ex = CX + s * headR * 0.48;
        disc(ex, eyeY, 2.1, 2.6, TONE.EYE);
        disc(ex - 0.6, eyeY - 0.9, 0.9, 0.9, TONE.EYE_HI);
        put(ex + 1, eyeY + 1, TONE.EYE_WHITE);
      }
    }

    // 볼 홍조
    for (const s of [-1, 1]) {
      disc(CX + s * (headR * 0.85), eyeY + 2.2, 1.6, 1.1, TONE.CHEEK);
    }

    // 입
    const mouthY = eyeY + 3.4;
    if (expression === 'hurt') {
      put(CX - 1, mouthY, TONE.MOUTH);
      put(CX, mouthY + 1, TONE.MOUTH);
      put(CX + 1, mouthY, TONE.MOUTH);
    } else if (expression === 'happy') {
      // 활짝 웃는 입
      put(CX - 2, mouthY, TONE.MOUTH);
      put(CX - 1, mouthY + 1, TONE.MOUTH);
      put(CX, mouthY + 1, TONE.MOUTH);
      put(CX + 1, mouthY + 1, TONE.MOUTH);
      put(CX + 2, mouthY, TONE.MOUTH);
    } else {
      // 살짝 웃는 입 (w 모양)
      put(CX - 1, mouthY, TONE.MOUTH);
      put(CX, mouthY + 1, TONE.MOUTH);
      put(CX + 1, mouthY, TONE.MOUTH);
    }
  }

  /* 외곽선 — 해상도가 커지면 선도 같이 두꺼워져야 한다 */
  const filled = (x, y) => x >= 0 && y >= 0 && x < G && y < G && m[idx(x, y)] !== TONE.EMPTY;
  for (let pass = 0; pass < Math.max(1, Math.round(U)); pass++) {
    const outline = [];
    for (let y = 0; y < G; y++) {
      for (let x = 0; x < G; x++) {
        if (filled(x, y)) continue;
        if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) outline.push([x, y]);
      }
    }
    for (const [x, y] of outline) m[idx(x, y)] = TONE.OUTLINE;
  }

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
    [TONE.LIGHT]: shade(color, 50),
    [TONE.DARK]: shade(color, -50),
    [TONE.BELLY]: shade(color, 88),
    [TONE.EYE]: '#2b2430',
    [TONE.EYE_HI]: '#ffffff',
    [TONE.EYE_WHITE]: '#e8e0f0',
    [TONE.MOUTH]: shade(color, -70),
    [TONE.OUTLINE]: '#241d28',
    [TONE.CHEEK]: '#ff8fa8',
  };
}
