import { test, eq } from './helpers.js';
import { parts } from '../src/parts.js';
import { solve } from '../src/solve.js';
import { makeSpec } from '../src/spec.js';
import { layoutMatrix } from './layouts.js';

test('盆：台上盆底面坐在台面顶面', () => {
  const spec = makeSpec({ basin: { type: 'vessel', height: 120 } });
  const L = solve(spec);
  const b = parts(spec).find((p) => p.kind === 'basin');
  eq(b.y, L.ctTopY);
  eq(b.y + b.h, L.ctTopY + 120);
});

test('盆：台下盆顶面与台面顶面齐平，向下垂', () => {
  const spec = makeSpec({ basin: { type: 'undermount', height: 150 } });
  const L = solve(spec);
  const b = parts(spec).find((p) => p.kind === 'basin');
  eq(b.y + b.h, L.ctTopY, '台下盆顶与台面顶齐平');
  eq(b.y, L.ctTopY - 150);
});

test('盆：一体盆底面坐在台面顶面，绘制顺序在台面之后', () => {
  const spec = makeSpec({ basin: { type: 'integral', height: 130 } });
  const ps = parts(spec);
  const b = ps.find((p) => p.kind === 'basin');
  const t = ps.find((p) => p.kind === 'top');
  const orderOf = (p) => p.order ?? p.z + p.d;
  eq(orderOf(b) > orderOf(t), true, '一体盆必须画在台面之后，否则会被盖住');
  eq(b.meta.type, 'integral');
});

test('盆：台上盆与台下盆不强制改绘制顺序', () => {
  for (const type of ['vessel', 'undermount']) {
    const ps = parts(makeSpec({ basin: { type } }));
    eq(ps.find((p) => p.kind === 'basin').order, undefined, `${type} 不应设置 order`);
  }
});

test('盆：meta 带上画内腔所需的参数', () => {
  // type 显式指定：这条测的是「meta 把参数带下去」，
  // 不该跟着默认值变（默认值改成台下盆时它不该红）
  const b = parts(makeSpec({ basin: { type: 'vessel', shape: 'ellipse', wall: 22, wallBottom: 30, radius: 40 } }))
    .find((p) => p.kind === 'basin');
  eq(b.meta.shape, 'ellipse');
  eq(b.meta.wall, 22);
  eq(b.meta.wallBottom, 30);
  eq(b.meta.radius, 40);
  eq(b.meta.type, 'vessel');
});

test('盆：盆的 x/z/w/d 与 solve 一致', () => {
  const spec = makeSpec({ basin: { count: 2, width: 460, depth: 360 } });
  const L = solve(spec);
  const bs = parts(spec).filter((p) => p.kind === 'basin');
  eq(bs.length, 2);
  L.basins.forEach((b, i) => {
    eq(bs[i].x, b.x);
    eq(bs[i].z, b.z);
    eq(bs[i].w, b.w);
    eq(bs[i].d, b.d);
  });
});

test('龙头：双盆生成两个盆和两个龙头', () => {
  const ps = parts(makeSpec({ basin: { count: 2 } }));
  eq(ps.filter((p) => p.kind === 'basin').length, 2);
  eq(ps.filter((p) => p.kind === 'faucet').length, 2);
});

test('龙头：站在每个盆中心，z 不为负', () => {
  const ps = parts(makeSpec({ basin: { count: 1, depthBias: 1 } }));
  const f = ps.find((p) => p.kind === 'faucet');
  const b = ps.find((p) => p.kind === 'basin');
  eq(f.x + f.w / 2, b.x + b.w / 2, '龙头应在盆中心');
  eq(f.z >= 0, true, `龙头 z=${f.z} 不应为负`);
  eq(f.y, 790, '龙头从台面顶面起算');
});

test('龙头：enabled=false 时不生成', () => {
  eq(parts(makeSpec({ faucet: { enabled: false } })).some((p) => p.kind === 'faucet'), false);
});

test('盆：全部预设三种盆型都能产出盆与龙头', () => {
  for (const lay of layoutMatrix()) {
    for (const type of ['vessel', 'undermount', 'integral']) {
      const spec = makeSpec({ ...lay.patch, basin: { ...(lay.patch.basin ?? {}), type } });
      const ps = parts(spec);
      const basins = ps.filter((x) => x.kind === 'basin');
      eq(basins.length > 0, true, `${lay.label} / ${type} 没有产出盆`);
      for (const b of basins) {
        for (const k of ['x', 'y', 'z', 'w', 'h', 'd']) {
          eq(Number.isFinite(b[k]), true, `${lay.label} / ${type} 盆.${k} = ${b[k]} 不是有限数`);
        }
      }
    }
  }
});

test('盆：台面深改小时盆仍能产出（不做校验）', () => {
  const spec = makeSpec({ cabinet: { depth: 320 }, basin: { depth: 380 } });
  const b = parts(spec).find((p) => p.kind === 'basin');
  eq(Number.isFinite(b.z), true, '盆可能伸出台面，但坐标必须是有限数');
});