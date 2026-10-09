import { test, eq } from './helpers.js';
import { front } from '../src/project.js';
import { parts } from '../src/parts.js';
import { solve } from '../src/solve.js';
import { makeSpec } from '../src/spec.js';

/**
 * 拉手定位。
 *
 * 这几条是为了锁死「拉手画在哪儿」。之前出过两个错，都是量出来的：
 *
 *  1. 抽屉横条写的是 fy(p.y + 34 + 14)，那是从格子**底边**往上算 48，
 *     结果贴在抽屉最下面。实测三抽：面板顶 -428、高 338，拉手落在 -138，
 *     距顶 290mm、距底 48mm——正好装反。
 *
 *  2. 圆形小拉手不分门和抽，一律距左 60mm。整宽的抽屉上就偏到一边去了，
 *     而抽屉的圆拉手应当**水平居中**（参照图上三个抽屉的圆点都在正中）。
 *
 * 参照图 docs/reference/target-output.png 上：
 *   · 三个抽屉 → 居中的圆形小拉手
 *   · 两扇玻璃门 → 靠中缝、位置偏上的小圆拉手
 *   · 镜柜外侧两扇 → 竖向长条槽；内侧双开门 → 两个小方块
 */

const draw = (spec) => front(parts(spec), spec, solve(spec));
const cellsOf = (shapes) => shapes.filter((s) => s.part === 'cell');
const handlesOf = (shapes) => shapes.filter((s) => s.part === 'handle');

test('拉手：抽屉横条距面板上沿 48mm，在上半部分', () => {
  const s = makeSpec({ bands: [{ kind: 'drawer', cols: [1], rows: [2, 1], handle: 'bar-h' }] });
  const shapes = draw(s);
  const cells = cellsOf(shapes);
  const bars = handlesOf(shapes);
  eq(bars.length, cells.length, '每个面板一条拉手');

  for (const b of bars) {
    // 屏幕 y 向下为正：面板顶 = cell.y，底 = cell.y + cell.h
    // 必须按 y 范围找所属面板——两抽同宽同 x，只比 x 会永远匹配到第一个，
    // 拿下面的面板去量上面的拉手就得到负值。
    const cell = cells.find((c) => b.y >= c.y - 0.01 && b.y <= c.y + c.h);
    eq(cell !== undefined, true, '找不到拉手所属的面板');
    const fromTop = b.y - cell.y;
    eq(fromTop, 48, `拉手应距面板上沿 48mm，实际 ${fromTop}`);
    eq(fromTop < cell.h / 2, true, `拉手应在面板上半部分，实际距顶 ${fromTop} / 高 ${cell.h}`);
  }
});

test('拉手：抽屉的圆形小拉手水平居中、垂直居中', () => {
  const s = makeSpec({ bands: [{ kind: 'drawer', cols: [1], rows: [2], handle: 'knob' }] });
  const shapes = draw(s);
  const cell = shapes.find((x) => x.part === 'cell');
  const knob = shapes.find((x) => x.part === 'handle' && x.shape === 'ellipse');
  eq(knob.cx, cell.x + cell.w / 2, '抽屉圆拉手应水平居中');
  eq(knob.cy, cell.y + cell.h / 2, '圆拉手应垂直居中');
});

test('拉手：门的圆拉手靠中缝，不是靠外沿', () => {
  const s = makeSpec({ bands: [{ kind: 'door', cols: [1, 1], rows: [1], handle: 'knob' }] });
  const shapes = draw(s);
  const cells = cellsOf(shapes);
  const knobs = shapes.filter((x) => x.part === 'handle' && x.shape === 'ellipse');
  eq(cells.length, 2, '两扇门');
  eq(knobs.length, 2, '两个拉手');

  const left = cells[0];
  const right = cells[1];
  const gapMid = (left.x + left.w + right.x) / 2;

  eq(Math.abs(knobs[0].cx - gapMid) < Math.abs(knobs[0].cx - left.x), true,
    '左扇拉手应靠中缝');
  eq(Math.abs(knobs[1].cx - gapMid) < Math.abs(knobs[1].cx - (right.x + right.w)), true,
    '右扇拉手应靠中缝');
});

test('拉手：竖条不会装到抽屉上（左右并排时一条带只有一个样式）', () => {
  const s = makeSpec({
    bands: [{ kind: 'drawer', cols: [1, 1], rows: [1], cells: ['drawer', 'drawer'], handle: 'bar-v' }],
  });
  const shapes = draw(s);
  const hs = handlesOf(shapes);
  eq(hs.length, 2, '两个面板各一个拉手');
  eq(hs.every((x) => x.shape === 'ellipse'), true, '抽屉不该拿到竖条，应兜底成圆形');
});

test('拉手：竖条在门上是竖直且居中', () => {
  const s = makeSpec({ bands: [{ kind: 'door', cols: [1, 1], rows: [1], handle: 'bar-v' }] });
  const shapes = draw(s);
  const cells = cellsOf(shapes);
  const bars = handlesOf(shapes);
  for (const b of bars) {
    eq(b.w < b.h, true, `竖条应窄于高，实际 ${b.w}x${b.h}`);
    const cell = cells.find((c) => b.x >= c.x - 70 && b.x <= c.x + c.w);
    if (!cell) continue;
    const barMid = b.y + b.h / 2;
    eq(Math.abs(barMid - (cell.y + cell.h / 2)) < 0.01, true, '竖条应垂直居中');
  }
});

test('拉手：暗拉手是面板上沿一道横槽', () => {
  const s = makeSpec({ bands: [{ kind: 'drawer', cols: [1], rows: [1], handle: 'gola' }] });
  const shapes = draw(s);
  const gola = shapes.find((x) => x.part === 'gola');
  const cell = shapes.find((x) => x.part === 'cell');
  eq(gola !== undefined, true, '应有暗拉手');
  eq(gola.y, cell.y, '暗拉手应贴在面板上沿');
  eq(gola.w, cell.w - 4, '暗拉手横贯面板（左右各留 2mm）');
});

test('拉手：门与抽混排时，抽屉是圆的、门是竖条', () => {
  const s = makeSpec({
    bands: [{ kind: 'drawer', cols: [1, 1], rows: [1], cells: ['door', 'drawer'], handle: 'bar-v' }],
  });
  const shapes = draw(s);
  const cells = cellsOf(shapes);
  const hs = handlesOf(shapes);

  const near = (el) => hs.find((h) => {
    const hx = h.shape === 'ellipse' ? h.cx : h.x + h.w / 2;
    return Math.abs(hx - (el.x + el.w / 2)) < el.w / 2;
  });
  const [doorCell, drawerCell] = cells;
  eq(near(doorCell).shape, 'rect', '门应保持竖条');
  eq(near(doorCell).w < near(doorCell).h, true, '门的应是竖条');
  eq(near(drawerCell).shape, 'ellipse', '抽屉应兜底成圆形');
});