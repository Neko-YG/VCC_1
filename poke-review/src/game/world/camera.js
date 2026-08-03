/** 카메라 — 플레이어를 화면 가운데 두되 맵 밖은 비추지 않는다. */
import { TILE } from './tiles.js';

export class Camera {
  constructor(viewW, viewH) {
    this.x = 0;
    this.y = 0;
    this.w = viewW;
    this.h = viewH;
  }

  follow(target, mapW, mapH) {
    const cx = target.px + TILE / 2 - this.w / 2;
    const cy = target.py + TILE / 2 - this.h / 2;
    // 맵이 화면보다 작으면 가운데 정렬
    this.x = mapW <= this.w ? (mapW - this.w) / 2 : Math.max(0, Math.min(mapW - this.w, cx));
    this.y = mapH <= this.h ? (mapH - this.h) / 2 : Math.max(0, Math.min(mapH - this.h, cy));
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
  }
}
