/**
 * 3D 场景描述。
 *
 * 为什么要这一层：three-view.js 需要 WebGL 和 DOM，Node 里测不了。
 * 把「画哪些零件、什么颜色、多大」抽成纯数据，就能在 Node 里断言场景内容——
 * 盆在不在台面之上、面板贴不贴前沿、抽屉数对不对。
 * 这些回归肉眼盯不住，等客户发现就是返工。
 *
 * 输出的坐标仍是**工程坐标**，映射到 Three.js 是 three-view.js 的事。
 */

import { parts } from './parts.js';
import { colorOf, isVisible, NEEDS_EDGE } from './world.js';

/** 地面比柜体大多少倍，够放影子就行 */
const GROUND_SPREAD_X = 4;
const GROUND_SPREAD_Z = 6;

export function scenePlan(spec) {
  const list = [];

  for (const p of parts(spec)) {
    if (!isVisible(p.kind)) continue;
    list.push({
      kind: p.kind,
      x: p.x, y: p.y, z: p.z,
      w: p.w, h: p.h, d: p.d,
      color: colorOf(p.kind),
      edge: NEEDS_EDGE.has(p.kind),
    });
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of list) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    minZ = Math.min(minZ, p.z);
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
    maxZ = Math.max(maxZ, p.z + p.d);
  }
  if (!list.length) {
    minX = minY = minZ = 0;
    maxX = maxY = maxZ = 1;
  }

  const W = spec.cabinet.width;
  const D = spec.cabinet.depth;

  return {
    parts: list,
    ground: {
      y: 0,
      w: W * GROUND_SPREAD_X,
      d: D * GROUND_SPREAD_Z,
      centerX: W / 2,
      centerZ: D / 2,
    },
    target: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2,
    },
    bounds: { minX, minY, minZ, maxX, maxY, maxZ },
  };
}