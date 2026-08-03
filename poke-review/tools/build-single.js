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
  'src/core/rng.js',
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

const modules = ORDER.map((rel) => {
  const code = strip(readFileSync(join(ROOT, rel), 'utf8')).trim();
  return `/* ── ${rel} ───────────────────────────────── */\n${code}`;
}).join('\n\n');

const css = readFileSync(join(ROOT, 'assets/css/main.css'), 'utf8');
const shellHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
const title = shellHtml.match(/<title>([^<]*)<\/title>/)?.[1] ?? '월간 업적 리그';
// href 안의 SVG 에 '>' 가 들어 있어 태그 정규식으로는 못 자른다 — 줄 단위로 가져온다
const favicon = shellHtml.split('\n').find((l) => l.includes('rel="icon"'))?.trim() ?? '';

const inner = `<style>
${css}
</style>

<div id="app"><noscript>이 페이지는 자바스크립트가 필요합니다.</noscript></div>

<script>
(function () {
'use strict';
${modules}
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
