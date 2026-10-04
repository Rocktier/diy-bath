import { solve } from './solve.js';

export function parts(spec) {
  const L = solve(spec);
  const { cabinet, top, basin, faucet, mirror } = spec;
  const { width: W, depth: D, backPanel: BP, bottomPanel: BoP, sidePanel: SP, toe } = cabinet;
  const out = [];

  // ---- 柜体外壳 ----
  if (cabinet.mount === 'floor') {
    out.push({
      kind: 'toe',
      x: toe.inset, y: 0, z: 0,
      w: W - 2 * toe.inset, h: toe.height, d: D - toe.inset,
    });
  }

  out.push({ kind: 'carcass', x: 0, y: L.baseY, z: 0, w: W, h: cabinet.height, d: D });
  out.push({ kind: 'backPanel', x: 0, y: L.baseY, z: 0, w: W, h: cabinet.height, d: BP });
  out.push({
    kind: 'bottomPanel',
    x: 0, y: L.baseY + cabinet.height - BoP, z: 0, w: W, h: BoP, d: D,
  });
  out.push({ kind: 'sidePanel', x: 0, y: L.baseY, z: 0, w: SP, h: cabinet.height, d: D });

  const ctW = W + 2 * top.overhang;
  // overhang=0 时 `-top.overhang` 会算出 -0。数值上等价，但会一路渗到
  // SVG 里变成 x="-0"，也会让严格相等的断言误判，所以在源头归一。
  const ctX = top.overhang > 0 ? -top.overhang : 0;
  out.push({
    kind: 'top',
    x: ctX, y: L.carcassTopY, z: 0,
    w: ctW, h: top.thickness, d: D + top.overhang,
  });
  out.push({
    kind: 'backsplash',
    x: ctX, y: L.ctTopY, z: 0,
    w: ctW, h: top.backsplash.height, d: top.backsplash.thickness,
  });

  if (mirror) {
    const mw = mirror.width ?? W;
    out.push({
      kind: 'mirror',
      x: (W - mw) / 2,
      y: L.ctTopY + top.backsplash.height + mirror.gap,
      z: 0, w: mw, h: mirror.height, d: mirror.depth,
    });
  }

  // ---- 面板 / 层板 / 抽屉箱 / 滑轨 ----
  const panelZ = D - SP;
  const innerD = D - BP - SP;
  for (const c of L.cells) {
    if (c.kind === 'open' || c.kind === 'basin') {
      if (c.h >= 400) {
        out.push({
          kind: 'shelf',
          x: c.x, y: c.y + (c.h - SP) / 2, z: BP,
          w: c.w, h: SP, d: innerD,
        });
      }
      continue;
    }
    out.push({
      kind: 'cell',
      x: c.x, y: c.y, z: panelZ, w: c.w, h: c.h, d: SP,
      meta: { cellKind: c.kind, handle: c.handle, col: c.col, band: c.band },
    });
    if (c.kind === 'drawer') {
      out.push({
        kind: 'drawerBox',
        x: c.x + 20, y: c.y + c.h - 46, z: BP, w: c.w - 40, h: 18, d: innerD,
      });
      out.push({
        kind: 'rail',
        x: c.x + 26, y: c.y + 16, z: BP, w: 90, h: 14, d: innerD,
      });
    }
  }

  // ---- 盆 ----
  const topOrder = D + top.overhang;
  for (const b of L.basins) {
    const y = b.type === 'undermount' ? L.ctTopY - b.h : L.ctTopY;
    const p = {
      kind: 'basin',
      x: b.x, y, z: b.z, w: b.w, h: b.h, d: b.d,
      meta: {
        type: b.type, shape: basin.shape, radius: basin.radius,
        wall: basin.wall, wallBottom: basin.wallBottom,
      },
    };
    if (b.type === 'integral') p.order = topOrder + 1;
    out.push(p);
  }

  // ---- 龙头 ----
  if (faucet.enabled) {
    for (const b of L.basins) {
      out.push({
        kind: 'faucet',
        x: b.x + b.w / 2 - 20,
        y: L.ctTopY,
        z: Math.max(0, b.z - 55),
        w: 40, h: faucet.height, d: 40,
        meta: { reach: faucet.reach },
      });
    }
  }

  return out;
}