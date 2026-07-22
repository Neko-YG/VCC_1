/*
  VCC 2026 Video Control Panel  (dependency-free, Node built-ins only)
  - Panel UI  : http://localhost:8080/         (control-panel.html + APIs)
  - Site view : http://localhost:8081/         (the actual VCC site, for preview)
  Run: node control-server.js   (usually double-click 제어판.bat)
*/
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT       = __dirname;
const SRC        = path.join(ROOT, 'video_src');
const PANEL_PORT = Number(process.env.PORT) || 8080;
const SITE_PORT  = PANEL_PORT + 1;
const VID_RE     = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;

if (!fs.existsSync(SRC)) fs.mkdirSync(SRC, { recursive: true });

const SLOTS = [
  { name:'hero_pc', label:'히어로 · PC (가로)',      desc:'스크롤에 맞춰 재생되는 메인 영상', out:'hero_pc.mp4',   scale:1920, crf:26, type:'hero' },
  { name:'hero_mo', label:'히어로 · 모바일 (세로)',  desc:'모바일에서 스크롤 재생',           out:'hero_mo.mp4',   scale:720,  crf:27, type:'hero' },
  { name:'after',   label:'After 배경',              desc:'섹션 배경 루프',                   out:'after_web.mp4', scale:1280, crf:27, type:'loop' },
  { name:'venue',   label:'장소 배경',               desc:'섹션 배경 루프',                   out:'venue_web.mp4', scale:1280, crf:27, type:'loop' },
  { name:'cta',     label:'참가신청 배경',           desc:'섹션 배경 루프',                   out:'cta_web.mp4',   scale:1280, crf:31, type:'loop' }
];
const SLOT_MAP = Object.fromEntries(SLOTS.map(s => [s.name, s]));

// ---- locate ffmpeg / ffprobe ----
function findExe(name) {
  try {
    const out = execFileSync('where', [name], { stdio:['ignore','pipe','ignore'] }).toString();
    const p = out.split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0];
    if (p && fs.existsSync(p)) return p;
  } catch (e) {}
  const base = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  return findFile(base, name.toLowerCase() + '.exe', 6);
}
function findFile(dir, target, depth) {
  if (depth < 0) return null;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return null; }
  for (const e of entries) if (e.isFile() && e.name.toLowerCase() === target) return path.join(dir, e.name);
  for (const e of entries) if (e.isDirectory()) {
    const r = findFile(path.join(dir, e.name), target, depth - 1);
    if (r) return r;
  }
  return null;
}
let FFMPEG  = findExe('ffmpeg');
let FFPROBE = findExe('ffprobe');

// ---- helpers ----
function slotSrc(slot) {
  let files;
  try { files = fs.readdirSync(SRC).filter(f => VID_RE.test(f)); } catch (e) { return null; }
  const exact = files.find(f => path.parse(f).name.toLowerCase() === slot);
  const pick  = exact || files.find(f => path.parse(f).name.toLowerCase().startsWith(slot));
  return pick ? path.join(SRC, pick) : null;
}
function probe(file) {
  const info = { size: fs.statSync(file).size };
  try { info.duration = parseFloat(execFileSync(FFPROBE, ['-v','error','-show_entries','format=duration','-of','csv=p=0', file]).toString().trim()); } catch (e) {}
  try {
    const kf = execFileSync(FFPROBE, ['-v','error','-select_streams','v:0','-skip_frame','nokey','-show_entries','frame=pts_time','-of','csv=p=0', file]).toString().trim();
    info.keyframes = kf ? kf.split(/\r?\n/).filter(Boolean).length : 0;
  } catch (e) {}
  return info;
}
function statusJSON() {
  const slots = SLOTS.map(s => {
    const src = slotSrc(s.name);
    const outPath = path.join(ROOT, s.out);
    const o = { name:s.name, label:s.label, desc:s.desc, out:s.out, type:s.type };
    if (src) { try { o.srcName = path.basename(src); o.srcSize = fs.statSync(src).size; } catch (e) {} }
    if (fs.existsSync(outPath)) {
      const info = probe(outPath);
      o.outSize = info.size; o.outDuration = info.duration; o.outKeyframes = info.keyframes;
      o.warn = [];
      if (s.type === 'hero') {
        if (info.keyframes < 40) o.warn.push('키프레임 ' + info.keyframes + '개');
        if (Math.abs((info.duration || 0) - 13.6) > 0.5) o.warn.push('길이 ' + (info.duration || 0).toFixed(2) + 's');
      }
    }
    return o;
  });
  return { ffmpeg: !!(FFMPEG && FFPROBE), ffmpegPath: FFMPEG || '', sitePort: SITE_PORT, slots };
}

// ---- encode (SSE stream) ----
function encodeStream(res) {
  res.writeHead(200, { 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', 'Connection':'keep-alive' });
  const send = o => res.write('data: ' + JSON.stringify(o) + '\n\n');
  if (!FFMPEG) { send({ type:'error', msg:'ffmpeg 없음' }); return res.end(); }
  const jobs = SLOTS.map(s => ({ s, src: slotSrc(s.name) })).filter(j => j.src);
  if (!jobs.length) { send({ type:'error', msg:'video_src 에 영상이 없습니다' }); return res.end(); }
  let i = 0, total = 0;
  (function next() {
    if (i >= jobs.length) { send({ type:'alldone', totalMB: +(total / 1048576).toFixed(1) }); return res.end(); }
    const { s, src } = jobs[i];
    send({ type:'start', slot:s.name, label:s.label, src: path.basename(src) });
    const args = ['-y','-loglevel','error','-i',src,'-vf','scale=' + s.scale + ':-2,fps=30',
                  '-c:v','libx264','-profile:v','main','-crf',String(s.crf),'-pix_fmt','yuv420p','-an',
                  '-movflags','+faststart','-f','mp4'];  // -f mp4: .tmp 확장자여도 mp4 컨테이너 강제
    if (s.type === 'hero') args.push('-g','10','-keyint_min','10','-sc_threshold','0');
    const outPath = path.join(ROOT, s.out);
    const tmp = outPath + '.tmp';   // write to tmp then rename → 중단돼도 정상본이 안 깨짐
    let err = '';
    const p = spawn(FFMPEG, args.concat([tmp]));
    p.stderr.on('data', d => err += d);
    p.on('close', code => {
      if (code !== 0) { try { fs.unlinkSync(tmp); } catch (e) {} send({ type:'fail', slot:s.name, msg: err.slice(-200) }); i++; return next(); }
      try { fs.renameSync(tmp, outPath); } catch (e) { send({ type:'fail', slot:s.name, msg:String(e) }); i++; return next(); }
      const info = probe(outPath); total += info.size;
      const warn = [];
      if (s.type === 'hero') {
        if (info.keyframes < 40) warn.push('키프레임<40');
        if (Math.abs((info.duration || 0) - 13.6) > 0.5) warn.push('길이 ' + (info.duration || 0).toFixed(2) + 's → 텍스트 타이밍 조정');
      }
      send({ type:'done', slot:s.name, out:s.out, mb:+(info.size / 1048576).toFixed(2), kf:info.keyframes, dur:+(info.duration || 0).toFixed(2), warn });
      i++; next();
    });
  })();
}

// ---- upload (stream to disk, normalize to slot name) ----
function handleUpload(req, res, slot, ext) {
  if (!SLOT_MAP[slot]) { res.writeHead(400); return res.end('bad slot'); }
  if (!/^[a-z0-9]{2,4}$/i.test(ext)) ext = 'mp4';
  try {
    fs.readdirSync(SRC)
      .filter(f => VID_RE.test(f) && path.parse(f).name.toLowerCase() === slot)
      .forEach(f => { try { fs.unlinkSync(path.join(SRC, f)); } catch (e) {} });
  } catch (e) {}
  const dest = path.join(SRC, slot + '.' + ext.toLowerCase());
  const tmp  = dest + '.uploading';
  const ws = fs.createWriteStream(tmp);
  req.pipe(ws);
  ws.on('finish', () => { try { fs.renameSync(tmp, dest); res.writeHead(200, { 'Content-Type':'application/json' }); res.end(JSON.stringify({ ok:true, saved: path.basename(dest) })); } catch (e) { res.writeHead(500); res.end(String(e)); } });
  ws.on('error', e => { res.writeHead(500); res.end(String(e)); });
}

// ---- static file serving (site preview + panel html) ----
const TYPES = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8' };
function serveFile(req, res, filePath) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' }); return res.end('404: ' + filePath); }
    const type = TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const base = { 'Content-Type':type, 'Cache-Control':'no-cache, no-store, must-revalidate', 'Accept-Ranges':'bytes' };
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1],10) : 0;
      let end   = m && m[2] ? parseInt(m[2],10) : st.size - 1;
      if (isNaN(start)) start = 0;
      if (isNaN(end) || end >= st.size) end = st.size - 1;
      if (start > end) { res.writeHead(416, { 'Content-Range':`bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, Object.assign({}, base, { 'Content-Range':`bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 }));
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, Object.assign({}, base, { 'Content-Length': st.size }));
      fs.createReadStream(filePath).pipe(res);
    }
  });
}
function safeJoin(root, urlPath) {
  const p = path.normalize(path.join(root, decodeURIComponent(urlPath.split('?')[0])));
  return p.startsWith(root) ? p : null;
}

// ---- panel server ----
http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  const q = Object.fromEntries(new URLSearchParams(req.url.split('?')[1] || ''));
  if (u === '/' || u === '/index.html') return serveFile(req, res, path.join(ROOT, 'control-panel.html'));
  if (u === '/api/status') { res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-cache' }); return res.end(JSON.stringify(statusJSON())); }
  if (u === '/api/encode') return encodeStream(res);
  if (u === '/api/upload' && req.method === 'POST') return handleUpload(req, res, (q.slot||'').toLowerCase(), (q.ext||'mp4'));
  if (u === '/favicon.ico') { res.writeHead(204); return res.end(); }
  res.writeHead(404); res.end('not found');
}).listen(PANEL_PORT, () => {
  console.log('==============================================');
  console.log('  VCC 2026 Video Control Panel');
  console.log('  Open : http://localhost:' + PANEL_PORT + '/');
  console.log('  Stop : close this window or press Ctrl+C');
  console.log('  ffmpeg: ' + (FFMPEG ? 'OK' : 'NOT FOUND (winget install Gyan.FFmpeg)'));
  console.log('==============================================');
}).on('error', e => { console.error(e.code === 'EADDRINUSE' ? ('[X] Port ' + PANEL_PORT + ' in use') : e.message); process.exit(1); });

// ---- site preview server ----
http.createServer((req, res) => {
  let p = safeJoin(ROOT, req.url === '/' ? '/index.html' : req.url);
  if (!p) { res.writeHead(403); return res.end('forbidden'); }
  serveFile(req, res, p);
}).listen(SITE_PORT, () => console.log('  Preview site: http://localhost:' + SITE_PORT + '/'))
  .on('error', e => { if (e.code === 'EADDRINUSE') console.error('[X] Port ' + SITE_PORT + ' in use'); });
