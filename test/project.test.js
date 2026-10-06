import { test, eq, close } from './helpers.js';
import { parts } from '../src/parts.js';
import { solve } from '../src/solve.js';
import { front, bbox } from '../src/project.js';
import { makeSpec, PRESETS } from '../src/spec.js';

const SPEC = makeSpec({
  cabinet: { width: 1180, height: 680, depth: 500 },
  basin: { count: 2, width: 460, depth: 360, height: 120, gap: 200 },
  bands: [
    { kind: 'door', cols: [1, 1], rows: [1], handle: 'bar-v' },
    { kind: 'drawer', cols: [1], rows: [1], handle: 'bar-h' },
  ],
});

const build = (s = SPEC) => {
  const ps = parts(s);
  return { ps, L: solve(s) };
};

test('bbox 忽略 bleed 图形', () => {
  const b = bbox([
    { shape: 'rect', part: 'wall', x: -600, y: -3000, w: 2600, h: 3200, bleed: true },
    { shape: 'rect', part: 'top', x: 0, y: 0, w: 100, h: 50 },
  ], 0);
  eq(b[0], 0);
  eq(b[1], 0);
  eq(b[2], 100);
  eq(b[3], 50);
});

test('bbox 支持 line / ellipse / text', () => {
  const b = bbox([
    { shape: 'line', part: 'x', x1: 10, y1: 20, x2: 40, y2: 60 },
    { shape: 'ellipse', part: 'x', cx: 100, cy: 100, rx: 30, ry: 20 },
    { shape: 'text', part: 'x', x: 0, y: 0, text: 'abcdef', size: 20 },
  ], 0);
  // 文字 x=0、anchor=middle、6 字 × 20px × 0.45 = 半宽 54，向左伸到 -54
  eq(b[0], -54, '最左应是文字左缘');
  eq(b[2], 184, '宽度 = 最右 130 - 最左 (-54)');
});

test('bbox 空数组不崩', () => {
  const b = bbox([], 10);
  eq(b.length, 4);
});

test('正视图：台面宽度与 parts 一致', () => {
  const { ps, L } = build();
  const t = ps.find((p) => p.kind === 'top');
  const r = front(ps, SPEC, L).find((s) => s.part === 'top' && s.shape === 'rect');
  eq(r.w, t.w);
  eq(r.x, t.x);
});

test('正视图：y 翻转，地面线在 y=0，柜顶映射到负 y', () => {
  const { ps, L } = build();
  const sh = front(ps, SPEC, L);
  const floor = sh.find((s) => s.part === 'floor');
  eq(floor.y1, 0);
  const carcass = sh.find((s) => s.part === 'carcass');
  eq(carcass.y, -L.carcassTopY, '柜顶应映射到负 y');
  eq(carcass.h, L.carcassH ?? carcass.h);
});

test('正视图：不画柜内零件（背板/底板/层板/抽屉箱/滑轨）', () => {
  const { ps, L } = build();
  const parts = new Set(front(ps, SPEC, L).map((s) => s.part));
  for (const hidden of ['backPanel', 'bottomPanel', 'sidePanel', 'shelf', 'drawerBox', 'rail']) {
    eq(parts.has(hidden), false, `正视图不应出现 ${hidden}`);
  }
});

test('正视图：双开门把手都靠中缝', () => {
  const { ps, L } = build();
  const hs = front(ps, SPEC, L).filter((s) => s.part === 'handle');
  const vertical = hs.filter((h) => h.h > h.w);
  eq(vertical.length, 2, '两扇门各一个竖把手');
  eq(hs.length, 3, '加上抽屉的横把手共 3 个');
  const leftDoor = L.cells[0];
  const rightDoor = L.cells[1];
  eq(vertical[0].x > leftDoor.x + leftDoor.w / 2, true, '左门把手应在该门右半（靠中缝）');
  eq(vertical[1].x < rightDoor.x + rightDoor.w / 2, true, '右门把手应在该门左半（靠中缝）');
  eq(Math.abs(vertical[0].x - vertical[1].x) < 120, true, '两个把手应彼此靠近，都在��缝附近');
});

test('正视图：抽屉横把手宽大于高，门竖把手高大于宽', () => {
  const spec = makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [
      { kind: 'door', cols: [1, 1], rows: [1], handle: 'bar-v' },
      { kind: 'drawer', cols: [1], rows: [1], handle: 'bar-h' },
    ],
  });
  const { ps, L } = build(spec);
  const hs = front(ps, spec, L).filter((s) => s.part === 'handle');
  const hBar = hs.find((h) => h.w > h.h);
  const vBar = hs.find((h) => h.h > h.w);
  eq(!!hBar, true, '应有横把手');
  eq(!!vBar, true, '应有竖把手');
});

test('正视图：gola 暗拉手画在格子上沿', () => {
  const spec = makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'drawer', cols: [1], rows: [1], handle: 'gola' }],
  });
  const { ps, L } = build(spec);
  const cell = parts(spec).find((p) => p.kind === 'cell');
  const g = front(ps, spec, L).find((s) => s.part === 'gola');
  eq(!!g, true, '应画出暗拉手凹槽');
  eq(g.y, -cell.y - cell.h, '凹槽应贴在格子上沿');
});

test('正视图：knob 小拉手是圆', () => {
  const spec = makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'door', cols: [1], rows: [1], handle: 'knob' }],
  });
  const { ps, L } = build(spec);
  const k = front(ps, spec, L).find((s) => s.part === 'handle');
  eq(k.shape, 'ellipse');
});

test('正视图：一体盆画两个轮廓（外 + 内腔）', () => {
  const s = makeSpec({ basin: { type: 'integral', count: 1, width: 500, depth: 380, height: 130 } });
  const sh = front(parts(s), s, solve(s));
  eq(sh.filter((x) => x.part === 'basin').length, 1);
  eq(sh.filter((x) => x.part === 'basinInner').length, 1);
});

test('正视图：内腔比外轮廓每边内缩 wall，底部内缩 wallBottom', () => {
  const s = makeSpec({ basin: { width: 500, height: 120, wall: 20, wallBottom: 25 } });
  const sh = front(parts(s), s, solve(s));
  const o = sh.find((x) => x.part === 'basin');
  const i = sh.find((x) => x.part === 'basinInner');
  eq(i.w, o.w - 2 * 20);
  eq(i.h, o.h - 20 - 25);
  eq(i.x, o.x + 20);
  eq(i.y, o.y + 20);
});

test('正视图：椭圆盆用 ellipse，台下盆同样有内腔', () => {
  const s = makeSpec({ basin: { type: 'undermount', shape: 'ellipse' } });
  const sh = front(parts(s), s, solve(s));
  eq(sh.some((x) => x.part === 'basin' && x.shape === 'ellipse'), true);
  eq(sh.some((x) => x.part === 'basinInner' && x.shape === 'ellipse'), true);
});
