/** 아주 작은 DOM 헬퍼 — 프레임워크 없이 화면을 만든다. */

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') applyStyle(el, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

/** CSS 변수(--x)는 setProperty 로만 설정된다 — 대입은 무시된다 */
function applyStyle(el, styles) {
  for (const [prop, value] of Object.entries(styles)) {
    if (prop.startsWith('--')) el.style.setProperty(prop, value);
    else el.style[prop] = value;
  }
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function svg(tag, props = {}, ...children) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    el.setAttribute(k, String(v));
  }
  for (const c of children.flat(Infinity)) if (c) el.appendChild(c);
  return el;
}

export const fmt = {
  pct: (v, digits = 0) => `${(v * 100).toFixed(digits)}%`,
  num: (v) => new Intl.NumberFormat('ko-KR').format(Math.round(v)),
  score: (v) => v.toFixed(2),
  season: (id) => {
    const [y, m] = String(id).split('-');
    return m ? `${y}년 ${Number(m)}월` : id;
  },
};
