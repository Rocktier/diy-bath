import { test, eq, close } from './helpers.js';
import { toWorld, partToWorld, colorOf, isVisible, NEEDS_EDGE, CAMERA_Y_SIGN, PALETTE_3D } from '../src/world.js';

test('坐标映射：x 和 y 不变，z 取反', () => {
  const w = toWorld({ x: 100, y: 200, z: 300 });
  eq(w.x, 100);
  eq(w.y, 200);
  eq(w.z, -300);
});

test('坐标映射：墙面 z=0 映射到 0（镜子贴墙那侧不动）', () => {
  eq(toWorld({ x: 0, y: 0, z: 0 }).z, 0);
});

test('坐标映射：柜体前沿（z 大）在 Three 里落在 z 负方向', () => {
  // 柜体深 500，前沿 z=500
  eq(toWorld({ x: 0, y: 0, z: 500 }).z, -500);
});

test('坐标映射：地面 y=0 映射到 0，柜顶 y=770 映射到 770', () => {
  eq(toWorld({ x: 0, y: 0, z: 0 }).y, 0);
  eq(toWorld({ x: 0, y: 770, z: 0 }).y, 770);
});

test('坐标映射：z 取反会翻转绕 y 的旋转方向，所以相机要补一次翻转', () => {
  eq(CAMERA_Y_SIGN, -1, 'z 取反是镜像，场景转向会与鼠标手势相反');
});

test('Part 转世界坐标：位置取中心，不是左下角', () => {
  const w = partToWorld({ kind: 'top', x: -10, y: 770, z: 0, w: 1200, h: 20, d: 510 });
  close(w.position.x, -10 + 600);
  close(w.position.y, 770 + 10);
  close(w.position.z, -(0 + 255));
});

test('Part 转世界坐标：尺寸原样保留', () => {
  const w = partToWorld({ kind: 'top', x: 0, y: 0, z: 0, w: 1200, h: 20, d: 510 });
  eq(w.size.x, 1200);
  eq(w.size.y, 20);
  eq(w.size.z, 510);
});

test('Part 转世界坐标：meta 透传', () => {
  const w = partToWorld({ kind: 'cell', x: 0, y: 0, z: 0, w: 1, h: 1, d: 1, meta: { cellKind: 'door' } });
  eq(w.meta.cellKind, 'door');
});

test('调色板：台面深色、柜体浅色，与参照图一致', () => {
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  eq(lum(PALETTE_3D.top) < 100, true, `台面应为深色，实际 ${PALETTE_3D.top}`);
  eq(lum(PALETTE_3D.carcass) > 190, true, `柜体应为浅色，实际 ${PALETTE_3D.carcass}`);
});

test('调色板：每个值都是合法色值', () => {
  for (const [k, v] of Object.entries(PALETTE_3D)) {
    eq(/^#[0-9a-fA-F]{6}$/.test(v), true, `${k} = ${v} 不是合法 6 位 hex`);
  }
});

test('调色板：未知类型返回中性灰，不返回 undefined', () => {
  const c = colorOf('someUnknownThing');
  eq(typeof c, 'string');
  eq(/^#[0-9a-fA-F]{6}$/.test(c), true);
});

test('调色板：常用类型都能查到颜色', () => {
  for (const k of ['carcass', 'cell', 'top', 'backsplash', 'mirror', 'basin', 'toe', 'faucet', 'handle']) {
    eq(colorOf(k), PALETTE_3D[k], `${k} 未定义颜色`);
  }
});

test('可见性：wall 不画进 3D（会挡住整个场景）', () => {
  eq(isVisible('wall'), false);
  eq(isVisible('carcass'), true);
  eq(isVisible('top'), true);
});

test('轮廓线：柜体和面板需要描边，否则纯色块会糊成一坨', () => {
  eq(NEEDS_EDGE.has('carcass'), true);
  eq(NEEDS_EDGE.has('cell'), true);
  eq(NEEDS_EDGE.has('top'), true);
  eq(NEEDS_EDGE.has('railing'), false);
});
