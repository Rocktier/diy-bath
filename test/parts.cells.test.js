import { test, eq } from './helpers.js';
import { parts } from '../src/parts.js';
import { solve } from '../src/solve.js';
import { makeSpec } from '../src/spec.js';
import { layoutMatrix } from './layouts.js';

test('面板：抽屉与门生成面板，贴柜体前沿，厚 sidePanel', () => {
  const ps = parts(makeSpec({
    cabinet: { width: 1180, depth: 500, sidePanel: 18 },
    bands: [
      { kind: 'door', cols: [1, 1], rows: [1], handle: 'bar-v' },
      { kind: 'drawer', cols: [1], rows: [1], handle: 'bar-h' },
    ],
  }));
  const cells = ps.filter((p) => p.kind === 'cell');
  eq(cells.length, 3);
  for (const c of cells) {
    eq(c.z, 500 - 18, '面板应贴柜体前沿');
    eq(c.d, 18);
  }
  eq(cells[0].meta.cellKind, 'door');
  eq(cells[0].meta.handle, 'bar-v');
  eq(cells[2].meta.cellKind, 'drawer');
});

test('面板：抽屉额外生成抽屉箱与滑轨，门不生成', () => {
  const withDrawer = parts(makeSpec({ bands: [{ kind: 'drawer', cols: [1], rows: [1] }] }));
  eq(withDrawer.filter((p) => p.kind === 'drawerBox').length, 1);
  eq(withDrawer.filter((p) => p.kind === 'rail').length, 1);

  const withDoor = parts(makeSpec({ bands: [{ kind: 'door', cols: [1], rows: [1] }] }));
  eq(withDoor.filter((p) => p.kind === 'drawerBox').length, 0);
  eq(withDoor.filter((p) => p.kind === 'rail').length, 0);
});

test('面板：open 与 basin 格不生成面板', () => {
  const ps = parts(makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'door', cols: [1, 1, 1], rows: [1], cells: ['basin', 'door', 'basin'] }],
  }));
  const cells = ps.filter((p) => p.kind === 'cell');
  eq(cells.length, 1, '只有中间那扇门是面板');
  eq(cells[0].meta.cellKind, 'door');
});

test('面板：盆胆格即使格高很大也不生成面板', () => {
  const ps = parts(makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'basin', cols: [1], rows: [1] }],
  }));
  eq(ps.filter((p) => p.kind === 'cell').length, 0);
});

test('层板：open 格且格高>=400 画一块，格高<400 不画', () => {
  const tall = parts(makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'open', cols: [1], rows: [1] }],
  }));
  eq(tall.filter((p) => p.kind === 'shelf').length, 1);

  const short = parts(makeSpec({
    cabinet: { width: 1180, height: 300 },
    bands: [{ kind: 'open', cols: [1], rows: [1] }],
  }));
  eq(short.filter((p) => p.kind === 'shelf').length, 0);
});

test('层板：door / drawer 格不画层板（关着的门后面看不见）', () => {
  const ps = parts(makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'door', cols: [1], rows: [1] }],
  }));
  eq(ps.filter((p) => p.kind === 'shelf').length, 0);
});

test('层板：层板落在格高中部，厚 sidePanel', () => {
  const ps = parts(makeSpec({
    cabinet: { width: 1180, height: 680, sidePanel: 18 },
    bands: [{ kind: 'open', cols: [1], rows: [1] }],
  }));
  const s = ps.find((p) => p.kind === 'shelf');
  eq(s.h, 18);
  eq(s.y + s.h / 2, 90 + 680 / 2, '层板中心应与格子中心对齐');
});

test('层板：层板在柜深方向从背板到门板内侧', () => {
  const ps = parts(makeSpec({
    cabinet: { width: 1180, height: 680, depth: 500, backPanel: 9, sidePanel: 18 },
    bands: [{ kind: 'open', cols: [1], rows: [1] }],
  }));
  const s = ps.find((p) => p.kind === 'shelf');
  eq(s.z, 9);
  eq(s.z + s.d, 500 - 18);
});

test('面板：面板的 x/y/w/h 严格等于 solve 算出的格子', () => {
  const spec = makeSpec({
    cabinet: { width: 1180, height: 680, depth: 500 },
    bands: [
      { kind: 'door', cols: [1, 1], rows: [1] },
      { kind: 'drawer', cols: [1], rows: [1] },
    ],
  });
  const cells = parts(spec).filter((p) => p.kind === 'cell');
  const L = solve(spec);
  eq(cells.length, L.cells.length);
  L.cells.forEach((c, i) => {
    eq(cells[i].x, c.x, `第 ${i} 格 x 不一致`);
    eq(cells[i].y, c.y, `第 ${i} 格 y 不一致`);
    eq(cells[i].w, c.w, `第 ${i} 格宽不一致`);
    eq(cells[i].h, c.h, `第 ${i} 格高不一致`);
    eq(cells[i].meta.cellKind, c.kind);
  });
});

test('面板：全部预设的面板都不越出柜体', () => {
  for (const lay of layoutMatrix()) {
    const spec = makeSpec(lay.patch);
    for (const c of parts(spec).filter((x) => x.kind === 'cell')) {
      eq(c.x >= 0, true, `${lay.label} 面板左越界 x=${c.x}`);
      eq(c.x + c.w <= spec.cabinet.width + 0.01, true, `${lay.label} 面板右越界`);
      eq(c.w > 0, true, `${lay.label} 面板宽非正 ${c.w}`);
      eq(c.h > 0, true, `${lay.label} 面板高非正 ${c.h}`);
    }
  }
});