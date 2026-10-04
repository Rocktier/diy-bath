import { test, eq, close } from './helpers.js';
import { solve } from '../src/solve.js';
import { makeSpec, PRESETS } from '../src/spec.js';

test('横向：柜体 1180 侧板18 2列 缝2 → 净宽1144 每格571', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180, sidePanel: 18 },
    bands: [{ kind: 'door', cols: [1, 1], rows: [1] }],
  }));
  eq(L.netW, 1144);
  const c = L.bands[0].cols;
  eq(c[0].w, 571);
  eq(c[1].w, 571);
  close(c[0].x, 18);
  close(c[1].x, 591, 0.001, '第二列应跳过第一列 + 一个 gap');
});

test('横向：中抽 cols[3,1,3] 柜体1180 → 488.57 / 162.86 / 488.57', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180 },
    bands: [{ kind: 'door', cols: [3, 1, 3], rows: [1], cells: ['door', 'drawer', 'door'] }],
  }));
  const c = L.bands[0].cols;
  const unit = (1144 - 4) / 7;
  close(c[0].w, unit * 3);
  close(c[1].w, unit);
  close(c[2].w, unit * 3);
});

test('横向：分配填满柜内净宽', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180 },
    bands: [{ kind: 'drawer', cols: [1, 1, 1, 1], rows: [1] }],
  }));
  const c = L.bands[0].cols;
  const last = c[c.length - 1];
  close(last.x + last.w, L.netW + 18, 0.001, '最后一列右缘应贴柜内右侧');
});

test('横向：格子覆盖柜内全部宽度', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180, sidePanel: 18 },
    bands: [{ kind: 'door', cols: [1, 1], rows: [1] }],
  }));
  const c = L.cells;
  close(c[0].x, 18, 0.001, '首格左缘贴侧板内侧');
  close(c[1].x + c[1].w, 1180 - 18, 0.001, '末格右缘贴另一侧侧板内侧');
});

test('格子：cells 行优先展开，从下往上、同行从左往右', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'door', cols: [1, 1], rows: [1, 1], cells: ['door', 'door', 'open', 'open'] }],
  }));
  eq(L.cells.map((c) => c.kind).join(','), 'door,door,open,open',
    '顺序应为 下左 下右 上左 上右，即先下排后上排');
  eq(L.cells[0].y < L.cells[2].y, true, '下排应比上排低');
});

test('格子：2列2行 时展开顺序是 下左 下右 上左 上右', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'door', cols: [1, 1], rows: [1, 1], cells: ['a', 'b', 'c', 'd'] }],
  }));
  eq(L.cells.map((c) => c.kind).join(','), 'a,b,c,d');
  const [bl, br, tl, tr] = L.cells;
  eq(bl.x < br.x, true, '下排：左格在右格左边');
  eq(tl.x, bl.x, '同列两格 x 相同');
  eq(tr.x, br.x, '同列两格 x 相同');
  eq(tl.y > bl.y, true, '上排比下排高');
  eq(tr.y, tl.y, '同行两格 y 相同');
  eq(br.y, bl.y, '同行两格 y 相同');
});

test('格子：cols:[2] 是"一列宽 2 倍"而非"两列"，1×1 网格', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'door', cols: [2], rows: [2] }],
  }));
  eq(L.bands[0].cols.length, 1);
  eq(L.cells.length, 1, '1 列 × 1 行 = 1 个格子');
});

test('格子：cells 省略时全部用 band.kind', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'drawer', cols: [1, 1], rows: [2, 1] }],
  }));
  eq(L.cells.length, 4);
  eq(L.cells.every((c) => c.kind === 'drawer'), true);
});

test('格子：handle 为字符串时全部生效；为数组时逐格指定', () => {
  const a = solve(makeSpec({
    bands: [{ kind: 'door', cols: [1, 1], rows: [1], handle: 'bar-v' }],
  }));
  eq(a.cells.every((c) => c.handle === 'bar-v'), true);

  const b = solve(makeSpec({
    bands: [{ kind: 'door', cols: [1, 1], rows: [1], cells: ['door', 'drawer'], handle: ['bar-v', 'bar-h'] }],
  }));
  eq(b.cells[0].handle, 'bar-v');
  eq(b.cells[1].handle, 'bar-h');
});

test('格子：每个格子记录 band / col / row 索引', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [
      { kind: 'door', cols: [1, 1], rows: [1] },
      { kind: 'drawer', cols: [1], rows: [1] },
    ],
  }));
  eq(L.cells.length, 3);
  eq(L.cells[2].band, 1, '第三个格子应属于第 2 条带');
  eq(L.cells[0].band, 0);
  eq(L.cells[0].col, 0);
  eq(L.cells[1].col, 1);
});

test('格子：全部预设的格子坐标都是有限数', () => {
  for (const p of PRESETS) {
    const s = makeSpec(p.spec);
    const L = solve(s);
    eq(L.cells.length > 0, true, `${p.name} 应至少有一个格子`);
    for (const c of L.cells) {
      for (const k of ['x', 'y', 'w', 'h']) {
        eq(Number.isFinite(c[k]), true, `${p.name} 的 cell.${k} = ${c[k]} 不是有限数`);
      }
      eq(c.w > 0, true, `${p.name} 出现非正格宽 ${c.w}`);
      eq(c.h > 0, true, `${p.name} 出现非正格高 ${c.h}`);
    }
  }
});