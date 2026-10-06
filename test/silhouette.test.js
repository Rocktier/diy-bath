import { test, eq, close } from './helpers.js';
import { scenePlan } from '../src/silhouette.js';
import { solve } from '../src/solve.js';
import { makeSpec } from '../src/spec.js';
import { layoutMatrix } from './layouts.js';

test('ScenePlan：台面在列表里，且宽于柜体（外挑）', () => {
  const s = makeSpec({ cabinet: { width: 1180, height: 680, depth: 500 }, top: { overhang: 10 } });
  const plan = scenePlan(s);
  const top = plan.parts.find((p) => p.kind === 'top');
  eq(top.w, 1200);
  eq(top.z, 0, '台面从墙面起算');
});

test('ScenePlan：面板贴柜体前沿', () => {
  const s = makeSpec({ cabinet: { width: 1180, depth: 500, sidePanel: 18 } });
  const plan = scenePlan(s);
  for (const c of plan.parts.filter((p) => p.kind === 'cell')) {
    close(c.z + c.d, 500, 0.001, '面板前沿应贴柜体前沿 500');
  }
});

test('ScenePlan：台上盆在台面之上（底面坐在台面顶面）', () => {
  const s = makeSpec({ basin: { type: 'vessel', height: 120 } });
  const L = solve(s);
  const plan = scenePlan(s);
  const top = plan.parts.find((p) => p.kind === 'top');
  const basin = plan.parts.find((p) => p.kind === 'basin');
  close(basin.y, L.ctTopY, 0.001, '台上盆底面坐在台面顶面');
  close(basin.y, top.y + top.h, 0.001, '盆底 = 台面顶');
});

test('ScenePlan：台下盆在台面之下（向下垂）', () => {
  const s = makeSpec({ basin: { type: 'undermount', height: 150 } });
  const L = solve(s);
  const plan = scenePlan(s);
  const top = plan.parts.find((p) => p.kind === 'top');
  const basin = plan.parts.find((p) => p.kind === 'basin');
  close(basin.y + basin.h, L.ctTopY, 0.001, '台下盆顶与台面顶齐平');
  eq(basin.y < top.y, true, '台下盆应在台面下方');
});

test('ScenePlan：一体盆同样坐在台面顶面', () => {
  const s = makeSpec({ basin: { type: 'integral', height: 130 } });
  const L = solve(s);
  const plan = scenePlan(s);
  const basin = plan.parts.find((p) => p.kind === 'basin');
  close(basin.y, L.ctTopY, 0.001);
});

test('ScenePlan：地面在 y=0，柜体在地面之上', () => {
  const s = makeSpec({ cabinet: { height: 680, toe: { height: 90, inset: 60 } } });
  const plan = scenePlan(s);
  close(plan.ground.y, 0, 0.001);
  const carcass = plan.parts.find((p) => p.kind === 'carcass');
  close(carcass.y, 90, 0.001, '柜体底在踢脚之上');
});

test('ScenePlan：wall 不进 3D（会挡住整个场景）', () => {
  const plan = scenePlan(makeSpec());
  eq(plan.parts.some((p) => p.kind === 'wall'), false);
});

test('ScenePlan：柜体和面板要描边，否则纯色块糊成一坨', () => {
  const plan = scenePlan(makeSpec());
  eq(plan.parts.find((p) => p.kind === 'carcass').edge, true);
  eq(plan.parts.find((p) => p.kind === 'cell').edge, true);
  eq(plan.parts.find((p) => p.kind === 'faucet').edge, false);
});

test('ScenePlan：每个零件都有合法色值', () => {
  const plan = scenePlan(makeSpec());
  for (const p of plan.parts) {
    eq(/^#[0-9a-fA-F]{6}$/.test(p.color), true, `${p.kind} 的颜色 ${p.color} 非法`);
  }
});

test('ScenePlan：台面深色、柜体浅色（与参照图一致）', () => {
  const plan = scenePlan(makeSpec());
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  };
  const top = plan.parts.find((p) => p.kind === 'top');
  const carc = plan.parts.find((p) => p.kind === 'carcass');
  eq(lum(top.color) < 100, true, `台面应为深色，实际 ${top.color}`);
  eq(lum(carc.color) > 190, true, `柜体应为浅色，实际 ${carc.color}`);
});

test('ScenePlan：target 在几何包围盒中心', () => {
  const s = makeSpec({ cabinet: { width: 1180, height: 680, depth: 500 } });
  const plan = scenePlan(s);
  const b = plan.bounds;
  close(plan.target.x, (b.minX + b.maxX) / 2, 0.001);
  close(plan.target.y, (b.minY + b.maxY) / 2, 0.001);
  close(plan.target.z, (b.minZ + b.maxZ) / 2, 0.001);
});

test('ScenePlan：全部预设都能生成，坐标有限且尺寸为正', () => {
  for (const lay of layoutMatrix()) {
    const plan = scenePlan(makeSpec(lay.patch));
    eq(plan.parts.length > 0, true, `${lay.label} 没有零件`);
    for (const part of plan.parts) {
      for (const k of ['x', 'y', 'z', 'w', 'h', 'd']) {
        eq(Number.isFinite(part[k]), true, `${lay.label} 的 ${part.kind}.${k} = ${part[k]} 非有限数`);
      }
      eq(part.w > 0, true, `${lay.label} 的 ${part.kind} 宽非正 ${part.w}`);
      eq(part.h > 0, true, `${lay.label} 的 ${part.kind} 高非正 ${part.h}`);
    }
  }
});

test('ScenePlan：面板块数与 Layout.cells 一致（3D 与 2D 不会打架）', () => {
  const s = makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'drawer', cols: [1, 1], rows: [2, 1] }],
  });
  const L = solve(s);
  const plan = scenePlan(s);
  eq(plan.parts.filter((p) => p.kind === 'cell').length, L.cells.length);
});

test('ScenePlan：盆与龙头数量随 count 变化', () => {
  const one = scenePlan(makeSpec({ basin: { count: 1 } }));
  const two = scenePlan(makeSpec({ basin: { count: 2 } }));
  eq(one.parts.filter((p) => p.kind === 'basin').length, 1);
  eq(two.parts.filter((p) => p.kind === 'basin').length, 2);
  eq(two.parts.filter((p) => p.kind === 'faucet').length, 2);
});

test('ScenePlan：龙头关掉时不存在', () => {
  const plan = scenePlan(makeSpec({ faucet: { enabled: false } }));
  eq(plan.parts.some((p) => p.kind === 'faucet'), false);
});

test('ScenePlan：地面尺寸随柜体放大（影子有地方放）', () => {
  const small = scenePlan(makeSpec({ cabinet: { width: 600 } }));
  const big = scenePlan(makeSpec({ cabinet: { width: 1480 } }));
  eq(big.ground.w > small.ground.w, true);
  close(small.ground.centerX, 300, 0.001);
});

test('ScenePlan：空分区不崩，且 target 仍有限', () => {
  const plan = scenePlan(makeSpec({ bands: [] }));
  for (const k of ['x', 'y', 'z']) {
    eq(Number.isFinite(plan.target[k]), true, `target.${k} 非有限数`);
  }
});