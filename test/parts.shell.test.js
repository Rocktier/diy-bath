import { test, eq } from './helpers.js';
import { parts } from '../src/parts.js';
import { solve } from '../src/solve.js';
import { makeSpec } from '../src/spec.js';
import { layoutMatrix } from './layouts.js';

test('外壳：台面左右外挑 overhang，前方也外挑 overhang', () => {
  const spec = makeSpec({ cabinet: { width: 1180, depth: 500 }, top: { thickness: 20, overhang: 10 } });
  const t = parts(spec).find((p) => p.kind === 'top');
  eq(t.x, -10);
  eq(t.w, 1200, '台面总宽 = 柜宽 + 2×overhang');
  eq(t.z, 0);
  eq(t.d, 510, '台面总深 = 柜深 + overhang');
});

test('外壳：台面底面贴柜顶，顶面再高一个台面厚', () => {
  const spec = makeSpec({ cabinet: { width: 1180, height: 680 }, top: { thickness: 20 } });
  const L = solve(spec);
  const t = parts(spec).find((p) => p.kind === 'top');
  eq(t.y, L.carcassTopY);
  eq(t.y + t.h, L.ctTopY);
});

test('外壳：挡水坐在台面顶面，沿墙面', () => {
  const spec = makeSpec({ top: { thickness: 20, backsplash: { height: 90, thickness: 18 } } });
  const L = solve(spec);
  const b = parts(spec).find((p) => p.kind === 'backsplash');
  eq(b.y, L.ctTopY);
  eq(b.h, 90);
  eq(b.z, 0);
  eq(b.d, 18);
  eq(b.w, 1200, '挡水与台面同宽');
});

test('外壳：落地有踢脚，悬空没有', () => {
  eq(parts(makeSpec({ cabinet: { mount: 'floor' } })).some((p) => p.kind === 'toe'), true);
  eq(parts(makeSpec({ cabinet: { mount: 'wall' } })).some((p) => p.kind === 'toe'), false);
});

test('外壳：踢脚左右各内缩 inset，前面也内缩 inset', () => {
  const t = parts(makeSpec({
    cabinet: { width: 1180, depth: 500, mount: 'floor', toe: { height: 90, inset: 60 } },
  })).find((p) => p.kind === 'toe');
  eq(t.x, 60);
  eq(t.w, 1060);
  eq(t.h, 90);
  eq(t.y, 0);
  eq(t.d, 440, '踢脚前面内缩 60');
});

test('外壳：柜体只占 cabinet.height，踢脚不计入', () => {
  const c = parts(makeSpec({ cabinet: { width: 1180, height: 680, toe: { height: 90, inset: 60 } } }))
    .find((p) => p.kind === 'carcass');
  eq(c.h, 680);
  eq(c.y, 90, '柜体底面在踢脚之上');
});

test('外壳：底板位于柜体底部，厚 bottomPanel', () => {
  const spec = makeSpec({ cabinet: { width: 1180, height: 680, bottomPanel: 18 } });
  const b = parts(spec).find((p) => p.kind === 'bottomPanel');
  eq(b.y + b.h, 90 + 680);
  eq(b.h, 18);
  eq(b.w, 1180);
});

test('外壳：背板厚 backPanel，沿墙面', () => {
  const b = parts(makeSpec({ cabinet: { width: 1180, height: 680, backPanel: 9 } }))
    .find((p) => p.kind === 'backPanel');
  eq(b.z, 0);
  eq(b.d, 9);
  eq(b.w, 1180);
});

test('外壳：侧板厚 sidePanel，沿左边缘', () => {
  const s = parts(makeSpec({ cabinet: { width: 1180, sidePanel: 18 } }))
    .find((p) => p.kind === 'sidePanel');
  eq(s.x, 0);
  eq(s.w, 18);
});

test('外壳：镜柜在挡水之上一个 mirror.gap，宽度默认取柜宽', () => {
  const spec = makeSpec({ cabinet: { width: 1180 }, mirror: { height: 780, depth: 150, gap: 30 } });
  const L = solve(spec);
  const m = parts(spec).find((p) => p.kind === 'mirror');
  eq(m.y, L.ctTopY + 90 + 30);
  eq(m.w, 1180);
  eq(m.d, 150);
});

test('外壳：mirror 为 null 时不产生镜柜零件', () => {
  const spec = makeSpec({ mirror: null });
  eq(parts(spec).some((p) => p.kind === 'mirror'), false);
});

test('外壳：mirror.width 指定时居中', () => {
  const spec = makeSpec({ cabinet: { width: 1180 }, mirror: { width: 800, height: 700 } });
  const m = parts(spec).find((p) => p.kind === 'mirror');
  eq(m.w, 800);
  eq(m.x, 190);
});

test('外壳：悬空时柜体直接落在 wallGap 上', () => {
  const spec = makeSpec({ cabinet: { width: 1180, height: 600, mount: 'wall', wallGap: 200 } });
  const c = parts(spec).find((p) => p.kind === 'carcass');
  eq(c.y, 200);
  eq(c.h, 600);
});

test('外壳：台面宽度小于 0 外挑时（overhang=0）台面与柜体同宽', () => {
  const spec = makeSpec({ cabinet: { width: 1180, depth: 500 }, top: { overhang: 0 } });
  const t = parts(spec).find((p) => p.kind === 'top');
  eq(t.x, 0);
  eq(t.w, 1180);
  eq(t.d, 500);
});

test('外壳：全部预设都能产出外壳零件且坐标有限', () => {
  for (const lay of layoutMatrix()) {
    for (const ps of parts(makeSpec(lay.patch))) {
      for (const k of ['x', 'y', 'z', 'w', 'h', 'd']) {
        eq(Number.isFinite(ps[k]), true, `${lay.label} 的 ${ps.kind}.${k} = ${ps[k]} 不是有限数`);
      }
    }
  }
});