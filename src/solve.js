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
  };
}