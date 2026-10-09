/**
 * 坐标系映射：工程坐标 → Three.js 世界坐标
 *
 * 这是整个 3D 层的地基，错了整张图就是歪的，所以规则写在这里、测试锁死。
 *
 * ## 两套坐标系
 *
 * 工程坐标（spec / parts.js 用这套）：
 *   x 向右，y **向上**，z 向房间内侧（由墙向内为正）
 *   原点在地面与墙面交线、柜体外侧边缘
 *
 * Three.js 世界坐标（右手系）：
 *   x 向右，y **向上**，z 指向观察者（朝屏幕外为正）
 *
 * ## 关键问题：z 轴朝向相反
 *
 * 柜体前沿在工程坐标里是 z 大的一侧（离墙远 = 面板所在处）。
 * 如果直接把工程 z 塞进 Three 的 z，柜体会**前后颠倒**——
 * 正面朝里，背面朝外，整个柜子会在墙里侧翻出来。
 *
 * 所以 z 取反：
 *   three.x =  eng.x
 *   three.y =  eng.y      （两套都是 y 向上，不用动）
 *   three.z = -eng.z
 *
 * 取反后柜体前沿落在 Three 的 z 负方向，即 z 越小越靠前，
 * 与 Three 默认相机（从 +z 往 -z 看）的直觉一致：柜正面朝向相机。
 *
 * ## 取反的副作用
 *
 * 取反 z 是镜像变换，会把绕 y 轴的旋转方向也翻转。
 * 相机绕 y 逆时针转 90°，场景看起来会顺时针转 90°。
 * 这不影响「能不能转」，但如果要让场景转向和鼠标手势同向，
 * 需要在相机上再补一次翻转（见 three-view.js 的 CAMERA_Y_SIGN）。
 */

export const CAMERA_Y_SIGN = -1;

/** 工程坐标 → Three.js 世界坐标（只做 z 取反） */
export function toWorld(eng) {
  return { x: eng.x, y: eng.y, z: neg(eng.z) };
}

/**
 * 取负并把 -0 归一成 0。
 *
 * 贴墙的零件（镜柜、挡水）z=0，直接取负会得到 -0。
 * 数值上等价，但会渗进 Three.js 的坐标里，也让严格相等的断言误判。
 * 和 parts.js 里对 overhang 的处理是同一个原因。
 */
function neg(v) {
  const r = -v;
  return r === 0 ? 0 : r;
}

/**
 * Part（长方体）→ Three.js 的位置与尺寸。
 *
 * Part 的 x/y/z 是**左下后角**，w/h/d 是宽/高/深。
 * Three 的 BoxGeometry 以**中心**定位，所以要加上半宽半高半深。
 *
 * z 取反会让「深度」这一维的朝向反转：
 *   工程 z 从 z0 延伸到 z0+d（向房间内）
 *   Three 里变成从 -z0 延伸到 -(z0+d)
 *   中心 z = -(z0 + d/2)
 */
export function partToWorld(p) {
  return {
    kind: p.kind,
    position: {
      x: p.x + p.w / 2,
      y: p.y + p.h / 2,
      z: neg(p.z + p.d / 2),
    },
    size: { x: p.w, y: p.h, z: p.d },
    meta: p.meta,
  };
}

/**
 * 白模调色板（3D 用）。
 *
 * 与 render.js 的 2D 调色板保持同一套灰阶，客户看惯了不突兀。
 * 值是 sRGB hex，MeshLambertMaterial 会自己转线性。
 */
export const PALETTE_3D = {
  carcass: '#d8d4cc',
  cell: '#efece6',
  door: '#efece6',
  drawer: '#efece6',
  top: '#4a4a4c',
  backsplash: '#e8e4dc',
  mirror: '#dfe3e6',
  mirrorInner: '#cfd6da',
  mirrorDoor: '#e8ecef',
  mirrorSlot: '#b8c0c5',
  mirrorKnob: '#c4a24a',
  basin: '#fbfbfa',
  basinInner: '#eae8e4',
  toe: '#b9b2a6',
  shelf: '#e0dcd4',
  drawerBox: '#cfcbc3',
  rail: '#9a9a9a',
  faucet: '#b8b8b8',
  handle: '#c4a24a',
  gola: '#cfcbc3',
  wallT: '#e6e2da',
  floor: '#f2f0ec',
  wall: '#f7f6f3',
  edge: '#6b6862',
};

/** 某个 Part 用什么颜色。取不到就退回一个中性灰，绝不返回 undefined。 */
export function colorOf(kind) {
  return PALETTE_3D[kind] ?? '#d0ccc4';
}

/**
 * 哪些 Part 该画进 3D。
 *
 * `wall` 是 2D 里当作背景铺满整块的，在 3D 里画出来会挡住整个场景。
 */
export function isVisible(kind) {
  return kind !== 'wall';
}

/**
 * 场景里需要重点表现轮廓线的 Part。
 *
 * 参照图里柜体、台面、抽屉面都有清晰的黑色细边，
 * 这是白模能看清结构的关键——纯色块堆在一起会糊成一坨。
 */
export const NEEDS_EDGE = new Set([
  'carcass', 'top', 'backsplash', 'cell', 'toe', 'mirror', 'mirrorDoor', 'basin',
]);
