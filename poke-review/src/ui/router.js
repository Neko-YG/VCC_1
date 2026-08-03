/** 해시 기반 라우터. #/dex/m1 처럼 파라미터를 쓴다. */

const routes = [];
let notFound = null;
let onRender = null;

export function route(pattern, handler) {
  const keys = [];
  const regex = new RegExp(
    '^' +
      pattern
        .split('/')
        .map((seg) => {
          if (seg.startsWith(':')) {
            keys.push(seg.slice(1));
            return '([^/]+)';
          }
          return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('/') +
      '$',
  );
  routes.push({ regex, keys, handler, pattern });
}

export function setNotFound(handler) {
  notFound = handler;
}

export function onNavigate(fn) {
  onRender = fn;
}

export function currentPath() {
  const hash = location.hash.replace(/^#/, '');
  return hash || '/home';
}

export function navigate(path) {
  if (currentPath() === path) render();
  else location.hash = path;
}

export function render() {
  const path = currentPath();
  for (const r of routes) {
    const m = path.match(r.regex);
    if (m) {
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      onRender?.(path, r.pattern);
      r.handler(params);
      return;
    }
  }
  onRender?.(path, null);
  notFound?.();
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}
