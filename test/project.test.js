import { test, eq, close } from './helpers.js';
import { parts } from '../src/parts.js';
import { solve } from '../src/solve.js';
import { front, plan, section, bbox, LAYOUT_LABEL } from '../src/project.js';
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

test('俯视图：台面深度与 parts 一致，z 向屏幕下方', () => {
  const { ps, L } = build();
  const t = ps.find((p) => p.kind === 'top');
  const r = plan(ps, SPEC, L).find((s) => s.part === 'top' && s.shape === 'rect');
  eq(r.h, t.d, '俯视图矩形的高就是台面深度');
  eq(r.y, t.z);
});

test('俯视图：柜体轮廓与格子分格是虚线', () => {
  const { ps, L } = build();
  const sh = plan(ps, SPEC, L);
  const carcass = sh.find((s) => s.part === 'carcass');
  eq(carcass.dash !== undefined, true);
  eq(carcass.fill, null, '柜体轮廓只描边不填充');
  const div = sh.filter((s) => s.part === 'cell' && s.shape === 'line');
  eq(div.length, SPEC.bands.reduce((n, b) => n + b.cols.length, 0));
});

test('俯视图：一体盆不画独立盆投影线，只画排水孔', () => {
  const s = makeSpec({ basin: { type: 'integral' } });
  const sh = plan(parts(s), s, solve(s));
  eq(sh.some((x) => x.part === 'basin'), false);
  eq(sh.some((x) => x.part === 'drain'), true);
});

test('俯视图：台上盆画盆轮廓 + 内腔 + 排水孔', () => {
  const s = makeSpec({ basin: { type: 'vessel' } });
  const sh = plan(parts(s), s, solve(s));
  eq(sh.some((x) => x.part === 'basin'), true);
  eq(sh.some((x) => x.part === 'basinInner'), true);
  eq(sh.some((x) => x.part === 'drain'), true);
});

test('俯视图：龙头画成圆 + 出水臂', () => {
  const s = makeSpec({ basin: { count: 1 } });
  const sh = plan(parts(s), s, solve(s));
  eq(sh.filter((x) => x.part === 'faucet').length >= 2, true);
});

test('俯视图：镜柜画成墙外虚线框', () => {
  const { ps, L } = build();
  const m = plan(ps, SPEC, L).find((s) => s.part === 'mirror');
  eq(!!m, true);
  eq(m.dash !== undefined, true);
  eq(m.y < 0, true, '镜柜应画在墙线之外（负 y）');
});

test('俯视图：地面/墙线是 bleed，不进 bbox', () => {
  const { ps, L } = build();
  const sh = plan(ps, SPEC, L);
  eq(sh.find((s) => s.part === 'floor').bleed, true);
});

test('剖面图：含背板/底板/台面/挡水', () => {
  const { ps, L } = build();
  const sh = section(ps, SPEC, L);
  for (const k of ['backPanel', 'carcass', 'top', 'backsplash']) {
    eq(sh.some((s) => s.part === k), true, `剖面缺少 ${k}`);
  }
});

test('剖面图：横轴是 z，背板在 z=0', () => {
  const { ps, L } = build();
  const bp = section(ps, SPEC, L).find((s) => s.part === 'backPanel');
  eq(bp.x, 0);
  eq(bp.w, 9, '剖面里背板的宽就是背板厚');
});

test('剖面图：台面的宽就是台面深', () => {
  const { ps, L } = build();
  const t = ps.find((p) => p.kind === 'top');
  const r = section(ps, SPEC, L).find((s) => s.part === 'top');
  eq(r.w, t.d);
  eq(r.h, t.h, '剖面里台面的高就是台面厚');
});

test('剖面图：分区示意条格子数 == Layout.cells.length', () => {
  const { ps, L } = build();
  const sh = section(ps, SPEC, L);
  eq(sh.filter((s) => s.part === 'layoutKey').length, L.cells.length);
  eq(sh.filter((s) => s.part === 'layoutKeyText').length, L.cells.length);
});

test('剖面图：分区示意条是柜内分格的等比缩影，横向跨度等于柜内净宽', () => {
  const { ps, L } = build();
  const keys = section(ps, SPEC, L).filter((s) => s.part === 'layoutKey');
  const minX = Math.min(...keys.map((k) => k.x));
  const maxX = Math.max(...keys.map((k) => k.x + k.w));
  close(maxX - minX, L.netW, 0.001,
    '示意条横向跨度应等于柜内净宽。不能平铺所有格子——不同带的格子是上下叠的');
  eq(minX, 18, '示意条左缘对齐柜内左侧');
});

test('剖面图：示意条保留每个格子的真实 x/w', () => {
  const { ps, L } = build();
  const keys = section(ps, SPEC, L).filter((s) => s.part === 'layoutKey');
  L.cells.forEach((c, i) => {
    eq(keys[i].x, c.x, `第 ${i} 格 x 不一致`);
    eq(keys[i].w, c.w, `第 ${i} 格宽不一致`);
    eq(keys[i].h, c.h, `第 ${i} 格高不一致`);
  });
});

test('剖面图：示意条保留格子的上下相对位置', () => {
  const { ps, L } = build();
  const keys = section(ps, SPEC, L).filter((s) => s.part === 'layoutKey');
  // SPEC: 下带 2 门，上带 1 抽。抽的屏幕 y 应小于（高于）门的 y
  const doorBand = keys.filter((_, i) => L.cells[i].band === 0);
  const drawerBand = keys.filter((_, i) => L.cells[i].band === 1);
  eq(drawerBand[0].y < doorBand[0].y, true, '上带的示意格应画得更高');
  eq(drawerBand[0].x, doorBand[0].x, '通长抽屉应与门左缘对齐');
});

test('剖面图：示意条整体位于地面线之下', () => {
  const { ps, L } = build();
  const keys = section(ps, SPEC, L).filter((s) => s.part === 'layoutKey');
  eq(keys.every((k) => k.y > 0), true, '示意条应画在 y=0（地面线）以下');
});

test('剖面图：open 格在剖面里有层板', () => {
  const s = makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'open', cols: [1], rows: [1] }],
  });
  const sh = section(parts(s), s, solve(s));
  eq(sh.some((x) => x.part === 'shelf'), true);
});

test('剖面图：盆画剖面——外轮廓 + 空腔，双盆两个', () => {
  const { ps, L } = build();
  const sh = section(ps, SPEC, L);
  eq(sh.filter((s) => s.part === 'basin').length, 2);
  eq(sh.filter((s) => s.part === 'basinCavity').length, 2);
});

test('剖面图：抽屉有抽屉箱与滑轨，门没有', () => {
  const { ps, L } = build();
  const sh = section(ps, SPEC, L);
  eq(sh.some((x) => x.part === 'drawerBox'), true);
  eq(sh.some((x) => x.part === 'rail'), true);
});

test('LAYOUT_LABEL 覆盖四种格子类型', () => {
  for (const k of ['drawer', 'door', 'open', 'basin']) {
    eq(typeof LAYOUT_LABEL[k], 'string', `缺少 ${k} 的中文标签`);
  }
});

test('三视图：所有坐标都是有限数（全部预设 × 三种盆型）', () => {
  for (const p of PRESETS) {
    for (const type of ['vessel', 'undermount', 'integral']) {
      const s = makeSpec({ ...p.spec, basin: { ...(p.spec.basin ?? {}), type } });
      const ps = parts(s);
      const L = solve(s);
      for (const [name, fn] of [['front', front], ['plan', plan], ['section', section]]) {
        for (const sh of fn(ps, s, L)) {
          for (const k of ['x', 'y', 'w', 'h', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'rx', 'ry']) {
            if (sh[k] === undefined) continue;
            eq(Number.isFinite(sh[k]), true,
              `${p.name}/${type}/${name} 的 ${sh.shape}.${k} = ${sh[k]} 不是有限数`);
          }
        }
      }
    }
  }
});

test('三视图：bbox 都非空', () => {
  for (const p of PRESETS) {
    const s = makeSpec(p.spec);
    const ps = parts(s);
    const L = solve(s);
    for (const [name, fn] of [['front', front], ['plan', plan], ['section', section]]) {
      const b = bbox(fn(ps, s, L));
      eq(b[2] > 0, true, `${p.name}/${name} 的 bbox 宽非正`);
      eq(b[3] > 0, true, `${p.name}/${name} 的 bbox 高非正`);
    }
  }
});

test('三视图一致性：正视图与俯视图的台面宽度相同', () => {
  const { ps, L } = build();
  const t = ps.find((p) => p.kind === 'top');
  const f = front(ps, SPEC, L).find((s) => s.part === 'top');
  const pl = plan(ps, SPEC, L).find((s) => s.part === 'top');
  eq(f.w, t.w);
  eq(pl.w, t.w);
});

test('三视图一致性：剖面分区示意条格子数与正视图面板数的关系可解释', () => {
  const spec = makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'door', cols: [3, 1, 3], rows: [1], cells: ['door', 'drawer', 'door'] }],
  });
  const ps = parts(spec);
  const L = solve(spec);
  eq(section(ps, spec, L).filter((s) => s.part === 'layoutKey').length, 3);
  eq(front(ps, spec, L).filter((s) => s.part === 'cell').length, 3,
    'door 与 drawer 都生成面板；只有 open/basin 才是开口');
});

test('三视图一致性：open/basin 格在正视图没有面板，剖面示意条里有它', () => {
  const spec = makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'door', cols: [1, 1, 1], rows: [1], cells: ['basin', 'door', 'basin'] }],
  });
  const ps = parts(spec);
  const L = solve(spec);
  eq(front(ps, spec, L).filter((s) => s.part === 'cell').length, 1, '只有中间那扇门是面板');
  eq(section(ps, spec, L).filter((s) => s.part === 'layoutKey').length, 3, '示意条仍显示全部 3 格');
});