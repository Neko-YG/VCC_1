/**
 * 격자 경로 탐색 (BFS).
 * 포인터로 찍은 칸까지 걸어가거나, 프레젠터 모드에서 대상까지 자동으로 갈 때 쓴다.
 * 맵이 작아(수천 칸) BFS 로 충분하고, 결과가 항상 같아 디버깅이 쉽다.
 */
import { DELTA } from '../actors/actor.js';

/**
 * @param {{x:number,y:number}} from
 * @param {{x:number,y:number}} to
 * @param {(x:number,y:number)=>boolean} isBlocked
 * @param {{maxNodes?:number, adjacent?:boolean}} opts
 *        adjacent=true 면 목표 칸이 막혀 있어도 '옆칸까지' 간다 (NPC·문 앞)
 * @returns {{x:number,y:number}[]} from 다음 칸부터의 경로. 못 가면 빈 배열
 */
export function findPath(from, to, isBlocked, { maxNodes = 4000, adjacent = false } = {}) {
  const key = (x, y) => `${x},${y}`;
  const goals = new Set();
  if (adjacent) {
    for (const [dx, dy] of Object.values(DELTA)) {
      const gx = to.x + dx;
      const gy = to.y + dy;
      if (!isBlocked(gx, gy)) goals.add(key(gx, gy));
    }
  } else {
    if (isBlocked(to.x, to.y)) return [];
    goals.add(key(to.x, to.y));
  }
  if (goals.has(key(from.x, from.y))) return [];
  if (!goals.size) return [];

  const prev = new Map([[key(from.x, from.y), null]]);
  const queue = [{ x: from.x, y: from.y }];
  let head = 0;
  let found = null;

  while (head < queue.length && head < maxNodes) {
    const cur = queue[head++];
    for (const [dx, dy] of Object.values(DELTA)) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = key(nx, ny);
      if (prev.has(k) || isBlocked(nx, ny)) continue;
      prev.set(k, cur);
      if (goals.has(k)) {
        found = { x: nx, y: ny };
        head = queue.length;
        break;
      }
      queue.push({ x: nx, y: ny });
    }
  }
  if (!found) return [];

  const path = [];
  let cur = found;
  while (cur) {
    path.push(cur);
    cur = prev.get(key(cur.x, cur.y));
  }
  path.pop(); // 출발 칸 제거
  return path.reverse();
}

/** 경로의 첫 칸으로 가는 방향 */
export function stepDirection(from, next) {
  if (next.x > from.x) return 'right';
  if (next.x < from.x) return 'left';
  if (next.y > from.y) return 'down';
  return 'up';
}
