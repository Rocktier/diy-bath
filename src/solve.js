import { resolveBands } from './spec.js';

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

function basinXs(basin, cabinet) {
  if (basin.count === 2) {
    const groupW = basin.width * 2 + basin.gap;
    const left = (cabinet.width - groupW) / 2;
    return [left, left + basin.width + basin.gap];
  }
  if (typeof basin.position === 'number') return [basin.position];
  return [(cabinet.width - basin.width) / 2];
}

function basinZ(basin, top, topDepth) {
  const bias = basin.depthBias ?? 0.5;
  return (
    top.backsplash.thickness +
    (topDepth - top.backsplash.thickness - basin.depth) * (1 - bias)
  );
}

/**
 * 镜柜分格。返回 null 表示不画镜柜。
 *
 * 尺寸是从参照图 docs/reference/target-output.png **量**出来的，不是估的。
 * 那张图是透视 3D 视角，横向有透视压缩（左端被压、右端被拉），
 * 所以横向只能取比例，纵向比例才可靠。量到的是：
 *
 *   · 4 扇**等宽**门。中间两扇都是镜面、缝看不出来，合起来像一整块，
 *     所以肉眼看是「中:左:右 = 2:1:1」——实际就是等宽四门。
 *   · 门区底边在距柜顶 **623mm**；往下到 **760mm** 是敞口搁板，
 *     再往下 20mm 是底板。也就是门区约占柜高的 3/4。
 *   · 最外两扇是**通高竖槽**拉手：槽宽 36mm，起于距柜体外沿 36mm。
 *   · 中间两扇是 28mm 见方的**小方钮**，中心在距柜顶 547mm——
 *     落在门高的 87.5% 处，明显偏低，照抄。
 *
 * 竖槽拉手靠**该门自己的外沿**（远离中线那一侧），这样门数不是 4 时也说得通。
 * 奇数门时正中间那扇没有可靠的中缝可依，全给竖槽。
 */
export function solveMirror(spec, L) {
  const m = spec.mirror;
  if (!m) return null;

  const w = m.width ?? spec.cabinet.width;
  const h = m.height ?? 780;
  const d = m.depth ?? 150;
  const x = (spec.cabinet.width - w) / 2;
  const y = L.ctTopY + spec.top.backsplash.height + (m.gap ?? 350);

  const gap = spec.cabinet.gap;
  const n = Math.max(1, Math.min(6, Math.round(m.doors ?? 4)));

  const railT = 15;    // 顶框
  const boardT = 20;   // 底板
  // shelfH 可能来自用户输入：负数、空、NaN、或者大到把门区吃光。
// 一律夹到「至少给门区留 1mm」——留 0 门会画出一堆零高度的零件，
// 而 render.js 的 num() 见到非有限数会直接抛错。
const wantShelf = Number.isFinite(m.shelfH) ? m.shelfH : 140;
  const shelfH = Math.max(0, Math.min(h - railT - boardT - 1, wantShelf));
  const doorH = h - railT - boardT - shelfH;

  const dw = (w - gap * (n - 1)) / n;
  const midX = w / 2;
  const doors = [];
  for (let i = 0; i < n; i++) {
    const dx = i * (dw + gap);
    doors.push({
      index: i,
      x: x + dx,
      y: y + railT,
      w: dw,
      h: doorH,
      z: d,
      /** 正对中缝的那两扇（偶数门时）才给方钮，其余给竖槽 */
      handle: n % 2 === 0 && Math.abs(dx + dw / 2 - midX) < dw ? 'knob' : 'slot',
      /** 竖槽靠这条边：最外那扇靠柜体外沿，中间的靠自己的外侧边 */
      slotOutward: dx + dw / 2 < midX ? 'left' : 'right',
    });
  }

  return { x, y, w, h, d, railT, boardT, shelfH, doorH, doors };
}

export function solve(spec) {
  const { cabinet, top, basin } = spec;
// 分格从 doors / drawers / layout 生成，或取特例 / 自定义。
// 不直接读 spec.bands，是为了让「两个门一个抽屉」这种改动只改数字就够。
const bands = resolveBands(spec);
  const gap = cabinet.gap;
  const baseY = cabinet.mount === 'wall' ? cabinet.wallGap : cabinet.toe.height;
  const carcassTopY = baseY + cabinet.height;
  const ctTopY = carcassTopY + top.thickness;
  const netW = cabinet.width - 2 * cabinet.sidePanel;

  // ---- 竖向：带 ----
  const bandGaps = gap * Math.max(0, bands.length - 1);
  const availH = cabinet.height - bandGaps;
  const totalRows = sum(bands.map((b) => sum(b.rows)));

  let cursor = baseY;
  const bandLayouts = bands.map((band, bandIndex) => {
    const s = sum(band.rows);
    const h = availH * (s / totalRows);
    const bl = { band, bandIndex, y: cursor, h, cols: [], rows: [], cells: [] };
    cursor += h + gap;

    const rowGaps = gap * Math.max(0, band.rows.length - 1);
    const rowUsable = h - rowGaps;
    let ry = bl.y;
    for (const r of band.rows) {
      const rh = rowUsable * (r / s);
      bl.rows.push({ y: ry, h: rh });
      ry += rh + gap;
    }

    return bl;
  });

  // ---- 横向：列 ----
  for (const bl of bandLayouts) {
    const colGaps = gap * Math.max(0, bl.band.cols.length - 1);
    const colUsable = netW - colGaps;
    const cs = sum(bl.band.cols);
    let cx = cabinet.sidePanel;
    for (const c of bl.band.cols) {
      const cw = colUsable * (c / cs);
      bl.cols.push({ x: cx, w: cw });
      cx += cw + gap;
    }
  }

  // ---- 格子：行优先，从下往上、同行从左往右 ----
  const cells = [];
  for (const bl of bandLayouts) {
    const { band } = bl;
    const n = band.cols.length * band.rows.length;
    if (band.cells && band.cells.length !== n) {
      throw new Error(
        `分区 #${bl.bandIndex + 1} 的 cells 长度 ${band.cells.length} != 列×行 ${n}`,
      );
    }
    let i = 0;
    for (let r = 0; r < bl.rows.length; r++) {
      for (let c = 0; c < bl.cols.length; c++) {
        const cell = {
          x: bl.cols[c].x,
          y: bl.rows[r].y,
          w: bl.cols[c].w,
          h: bl.rows[r].h,
          kind: band.cells ? band.cells[i] : band.kind,
          handle: Array.isArray(band.handle) ? band.handle[i] : band.handle,
          band: bl.bandIndex,
          col: c,
          row: r,
        };
        bl.cells.push(cell);
        cells.push(cell);
        i++;
      }
    }
  }

  // ---- 盆位 ----
  const topDepth = cabinet.depth;
  const basins = basinXs(basin, cabinet).map((x) => ({
    x,
    z: basinZ(basin, top, topDepth),
    w: basin.width,
    d: basin.depth,
    h: basin.height,
    type: basin.type,
  }));

  return {
    gap, baseY, carcassTopY, ctTopY, netW,
    bands: bandLayouts,
    cells,
    basins,
    // solveMirror 用的是 carcassTopY / ctTopY，直接传算好的，不用依赖整个 L
    mirror: solveMirror(spec, { ctTopY }),
  };
}