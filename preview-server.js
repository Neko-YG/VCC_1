/*
  VCC 2026 로컬 미리보기 서버 (의존성 없음, Node 내장 모듈만 사용)
  - 이 파일이 있는 폴더(리포 루트)를 그대로 서빙합니다.
  - mp4 Range 요청(206) 지원 → 스크롤 스크러빙/영상 seek 정상 동작
  - no-cache 헤더 → 영상 교체 후 새로고침하면 항상 최신 영상 표시
  실행:  node preview-server.js   (보통은 미리보기.bat 더블클릭)
*/
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }

    fs.stat(filePath, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 Not Found: ' + urlPath);
      }
      const type = TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      const base = {
        'Content-Type': type,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Accept-Ranges': 'bytes'
      };
      const range = req.headers.range;
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        let start = m && m[1] ? parseInt(m[1], 10) : 0;
        let end   = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
        if (isNaN(start)) start = 0;
        if (isNaN(end) || end >= st.size) end = st.size - 1;
        if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
        res.writeHead(206, Object.assign({}, base, {
          'Content-Range': `bytes ${start}-${end}/${st.size}`,
          'Content-Length': end - start + 1
        }));
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, Object.assign({}, base, { 'Content-Length': st.size }));
        fs.createReadStream(filePath).pipe(res);
      }
    });
  } catch (e) {
    res.writeHead(500); res.end('server error');
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[X] 포트 ${PORT} 가 이미 사용 중입니다. 열려 있는 미리보기 창을 닫고 다시 실행하세요.`);
  } else {
    console.error(e.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log('==============================================');
  console.log('  VCC 2026 로컬 미리보기 서버 실행 중');
  console.log('  주소 : http://localhost:' + PORT + '/');
  console.log('  종료 : 이 창을 닫거나 Ctrl+C');
  console.log('==============================================');
  console.log('  * 영상 교체 후에는 브라우저에서 Ctrl+Shift+R (하드 새로고침)');
});
