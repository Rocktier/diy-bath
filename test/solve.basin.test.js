import { test, eq, close } from './helpers.js';
import { solve } from '../src/solve.js';
import { makeSpec, PRESETS } from '../src/spec.js';

test('盆位：单盆居中 柜体1180 盆500 → x=340', () => {
  const L = solve(makeSpec({ cabinet: { width: 1180 }, basin: { count: 1, width: 500 } }));
  eq(L.basins.length, 1);
  eq(L.basins[0].x, 340);
});

test('盆位：双盆 柜体1180 盆500×2 盆间150 → 组左15 第二盆665', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180 },
    basin: { count: 2, width: 500, gap: 150 },
  }));
  eq(L.basins.length, 2);
  eq(L.basins[0].x, 15);
  eq(L.basins[1].x, 665);
});

test('盆位：双盆组整体居中，左右留白相等', () => {
  const L = solve(makeSpec({ cabinet: { width: 1180 }, basin: { count: 2, width: 460, gap: 200 } }));
  const left = L.basins[0].x;
  const rightEdge = L.basins[1].x + 460;
  close(left, 1180 - rightEdge, 0.001, '双盆组应左右居中');
});

test('盆位：手动 position 直接采用，不居中', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180 },
    basin: { count: 1, width: 500, position: 100 },
  }));
  eq(L.basins[0].x, 100);
});

test('盆位：position 为 0 时也应采用（0 是有效值）', () => {
  const L = solve(makeSpec({ basin: { count: 1, position: 0 } }));
  eq(L.basins[0].x, 0);
});

test('盆位：深度 bias 0.5 → z=69，盆前缘离台面前沿 51', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180, depth: 500 },
    top: { backsplash: { thickness: 18 } },
    basin: { depth: 380, depthBias: 0.5 },
  }));
  eq(L.basins[0].z, 69);
  eq(500 - (L.basins[0].z + 380), 51);
});

test('盆位：bias=1 紧贴挡水内侧，bias=0 紧贴台面前沿', () => {
  const back = solve(makeSpec({ basin: { depth: 380, depthBias: 1 } })).basins[0].z;
  eq(back, 18);
  const front = solve(makeSpec({ basin: { depth: 380, depthBias: 0 } })).basins[0].z;
  eq(front, 500 - 380);
});

test('盆位：挡水厚度变化时 z 跟着变', () => {
  const L = solve(makeSpec({
    cabinet: { depth: 500 },
    top: { backsplash: { thickness: 40 } },
    basin: { depth: 380, depthBias: 1 },
  }));
  eq(L.basins[0].z, 40, 'bias=1 时紧贴挡水内侧面');
});

test('盆位：台面深沿用 cabinet.depth，不存在 top.depth', () => {
  const L = solve(makeSpec({ cabinet: { depth: 480 }, basin: { depth: 340, depthBias: 0 } }));
  eq(L.basins[0].z + 340, 480, 'bias=0 时盆前缘应贴柜深前沿');
});

test('盆位：携带 width/depth/height/type', () => {
  const L = solve(makeSpec({ basin: { width: 460, depth: 350, height: 130, type: 'integral' } }));
  eq(L.basins[0].w, 460);
  eq(L.basins[0].d, 350);
  eq(L.basins[0].h, 130);
  eq(L.basins[0].type, 'integral');
});

test('盆位：盆比柜宽时不崩（不做校验，定制业务允许）', () => {
  const L = solve(makeSpec({ cabinet: { width: 600 }, basin: { count: 1, width: 900 } }));
  eq(L.basins[0].x, -150, 'x 会是负数，交给绘图层处理，不在这里抛错');
});

test('盆位：全部预设的盆位都是有限数', () => {
  for (const p of PRESETS) {
    const L = solve(makeSpec(p.spec));
    for (const b of L.basins) {
      for (const k of ['x', 'z', 'w', 'd', 'h']) {
        eq(Number.isFinite(b[k]), true, `${p.name} 的 basin.${k} = ${b[k]} 不是有限数`);
      }
    }
  }
});