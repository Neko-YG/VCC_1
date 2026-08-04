/**
 * 단일 파일 빌드 — 모든 모듈과 CSS 를 index.html 하나로 합친다.
 *
 *   node poke-review/tools/build-single.js          → dist/index.html (더블클릭으로 열림)
 *   node poke-review/tools/build-single.js --inner  → dist/inner.html (<body> 안쪽만; 임베드용)
 *
 * ES 모듈은 로컬 서버가 있어야 돌지만, 합쳐진 파일은 file:// 에서도 열린다.
 * 번들러 대신 쓰는 40줄짜리 대체품이라 규칙이 단순하다:
 *   - import 문은 제거하고, 아래 ORDER 순서(의존성 순)로 이어 붙인다
 *   - export 키워드만 떼어낸다 (모듈 전체가 하나의 스코프가 된다)
 * 새 모듈을 추가하면 ORDER 에도 넣어야 한다.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 의존성 순서 (위에서 아래로) */
const ORDER = [
  'src/core/config.js',
  'src/core/color.js',
  'src/core/rng.js',
  'src/core/monster.js',
  'src/data/kpi.js',
  'src/data/species.js',
  'src/data/bosses.js',
  'src/data/badges.js',
  'src/data/seed.js',
  'src/engine/leveling.js',
  'src/engine/stats.js',
  'src/engine/scoring.js',
  'src/engine/battle.js',
  'src/engine/badges.js',
  'src/engine/evaluate.js',
  'src/core/store.js',
  'src/ui/dom.js',
  'src/ui/sprite.js',
  'src/ui/components.js',
  'src/ui/router.js',
  // 게임(필드) — 화면 모듈보다 먼저 정의되어야 한다
  'src/game/engine/pixel.js',
  'src/game/engine/controls.js',
  'src/game/engine/assets.js',
  'src/game/world/tiles.js',
  'src/game/engine/tileset.js',
  'src/game/engine/charsprite.js',
  'src/game/engine/monsterdraw.js',
  'src/game/engine/input.js',
  'src/game/engine/loop.js',
  'src/game/world/maps.js',
  'src/game/world/camera.js',
  'src/game/actors/actor.js',
  'src/game/world/path.js',
  'src/game/ui/textbox.js',
  'src/game/ui/banner.js',
  'src/game/scenes/field.js',
  'src/game/scenes/battle.js',
  'src/game/game.js',
  'src/ui/screens/field.js',
  'src/ui/screens/home.js',
  'src/ui/screens/pokedex.js',
  'src/ui/screens/detail.js',
  'src/ui/screens/battle.js',
  'src/ui/screens/league.js',
  'src/ui/screens/admin.js',
  'src/main.js',
];

const strip = (code) =>
  code
    // import { a, b } from './x.js';  (여러 줄 포함)
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '')
    .replace(/^export\s+\{\s*\};?[ \t]*$/gm, '')
    .replace(/^export\s+(const|let|function|class|async)\b/gm, '$1');

/**
 * ORDER 에 빠진 모듈이 있으면 런타임에 "X is not defined" 로 터진다.
 * 각 파일의 상대 import 를 훑어 ORDER 에 다 들어 있는지 빌드 때 확인한다.
 */
function checkCoverage() {
  const listed = new Set(ORDER.map((r) => r.replace(/^src\//, '')));
  const missing = [];
  const aliased = [];
  for (const rel of ORDER) {
    const code = readFileSync(join(ROOT, rel), 'utf8');
    const dir = dirname(rel);
    for (const m of code.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      const target = join(dir, m[1]).replace(/\\/g, '/').replace(/^src\//, '');
      if (!listed.has(target)) missing.push(`${rel} → ${m[1]}`);
    }
    // import { A as B } 는 스코프 합치기로 표현할 수 없다 (B 라는 이름이 생기지 않는다)
    for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
      if (/\bas\b/.test(m[1])) aliased.push(`${rel} → {${m[1].trim()}}`);
    }
  }
  if (missing.length) {
    throw new Error(`ORDER 에 빠진 모듈이 있다:\n  ${missing.join('\n  ')}`);
  }
  if (aliased.length) {
    throw new Error(`별칭 import 는 번들할 수 없다 (원래 이름을 그대로 써라):\n  ${aliased.join('\n  ')}`);
  }
}

/** 모듈들이 한 스코프로 합쳐지므로, 모듈 안에서만 쓰던 이름도 서로 부딪힌다 */
const declared = new Map();
function checkCollisions(rel, code) {
  const re = /^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  for (const m of code.matchAll(re)) {
    const name = m[1];
    if (declared.has(name)) {
      throw new Error(`이름 충돌: '${name}' 이(가) ${declared.get(name)} 와 ${rel} 양쪽에 있다. 한쪽 이름을 바꿔라.`);
    }
    declared.set(name, rel);
  }
}

checkCoverage();

const modules = ORDER.map((rel) => {
  const code = strip(readFileSync(join(ROOT, rel), 'utf8')).trim();
  checkCollisions(rel, code);
  // 재수출(export { a } / export * from ...)은 스코프 합치기로 표현할 수 없다 — 조용히 깨지느니 여기서 멈춘다
  const leftover = code.match(/^export\b.*$/m);
  if (leftover) throw new Error(`${rel}: 번들러가 처리하지 못하는 구문 — ${leftover[0].trim()}`);
  return `/* ── ${rel} ───────────────────────────────── */\n${code}`;
}).join('\n\n');

const css = readFileSync(join(ROOT, 'assets/css/main.css'), 'utf8');
const shellHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
const title = shellHtml.match(/<title>([^<]*)<\/title>/)?.[1] ?? '월간 업적 리그';
// href 안의 SVG 에 '>' 가 들어 있어 태그 정규식으로는 못 자른다 — 줄 단위로 가져온다
const favicon = shellHtml.split('\n').find((l) => l.includes('rel="icon"'))?.trim() ?? '';

// 코드나 주석 안의 '</script>' 는 인라인 스크립트를 조기 종료시킨다 — 반드시 깨 놓는다
const safeModules = modules.replace(/<\/script/gi, '<\\/script');

const inner = `<style>
${css}
</style>

<div id="app"><noscript>이 페이지는 자바스크립트가 필요합니다.</noscript></div>

<script>
(function () {
'use strict';
${safeModules}
})();
</script>
`;

const standalone = `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${favicon}
  </head>
  <body>
${inner}  </body>
</html>
`;

const innerOnly = process.argv.includes('--inner');
const outDir = join(ROOT, 'dist');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, innerOnly ? 'inner.html' : 'index.html');
writeFileSync(outPath, innerOnly ? inner : standalone);

const kb = (Buffer.byteLength(innerOnly ? inner : standalone) / 1024).toFixed(1);
console.log(`${outPath}  (${ORDER.length}개 모듈, ${kb}KB)`);
