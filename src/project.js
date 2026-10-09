import { annotationLines } from './annotate.js';

const PAD = 40;

const orderOf = (p) => p.order ?? p.z + p.d;
const fy = (y) => -y;

export function bbox(shapes, pad = PAD) {
  const xs = [];
  const ys = [];
  for (const s of shapes) {
    if (s.bleed) continue;
    if (s.shape === 'rect') { xs.push(s.x, s.x + s.w); ys.push(s.y, s.y + s.h); }
    else if (s.shape === 'line') { xs.push(s.x1, s.x2); ys.push(s.y1, s.y2); }
    else if (s.shape === 'ellipse') { xs.push(s.cx - s.rx, s.cx + s.rx); ys.push(s.cy - s.ry, s.cy + s.ry); }
    else if (s.shape === 'text') {
      const size = s.size ?? 20;
      const half = s.text.length * size * 0.45;
      const anchor = s.anchor ?? 'middle';
      const x0 = anchor === 'start' ? s.x : anchor === 'end' ? s.x - 2 * half : s.x - half;
      xs.push(x0, x0 + 2 * half);
      ys.push(s.y, s.y + size);
    }
  }
  if (!xs.length) return [0, 0, 0, 0];
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return [minX, minY, Math.max(...xs) - minX + pad, Math.max(...ys) - minY + pad];
}

function cabMid(ps) {
  const c = ps.find((p) => p.kind === 'carcass');
  return c ? c.x + c.w / 2 : 0;
}

function cellFront(p, mid) {
  const out = [{ shape: 'rect', part: 'cell', x: p.x, y: fy(p.y + p.h), w: p.w, h: p.h, fill: 'cell' }];
  const isDrawer = p.meta.cellKind === 'drawer';
  let h = p.meta.handle;
  const leftSide = p.x + p.w / 2 < mid;

  // 竖条拉手是**门**的做法。左右并排时一条带只能给一种样式，
  // 抽屉会跟着拿到 bar-v，看着就别扭——按格子类型兜底成圆形小拉手。
  if (isDrawer && h === 'bar-v') h = 'knob';

  if (h === 'gola') {
    // 暗拉手：嵌在面板上沿一道横槽
    out.push({
      shape: 'rect', part: 'gola',
      x: p.x + 2, y: fy(p.y + p.h),
      w: p.w - 4, h: 20, fill: 'basinInner',
    });
  } else if (h === 'bar-h') {
    const len = Math.min(240, p.w * 0.6);
    out.push({
      shape: 'rect', part: 'handle',
      // 距面板**上沿** 48mm。原来写的是 fy(p.y + 34 + 14)，
      // 那是从格子底边往上算 48——结果贴在抽屉最下面。
      // 实测三抽：面板顶 -428 高 338，拉手落在 -138，
      // 等于距顶 290mm、距底 48mm，正好装反了。
      x: p.x + (p.w - len) / 2, y: fy(p.y + p.h - 48),
      w: len, h: 14, rx: 7, fill: 'handle',
    });
  } else if (h === 'bar-v') {
    const len = Math.min(260, p.h * 0.5);
    const hx = leftSide ? p.x + p.w - 64 : p.x + 49;
    out.push({
      shape: 'rect', part: 'handle',
      x: hx, y: fy(p.y + p.h / 2 + len / 2),
      w: 15, h: len, rx: 7.5, fill: 'handle',
    });
  } else if (h === 'knob') {
    out.push({
      shape: 'ellipse', part: 'handle',
      // 抽屉的圆形拉手要**水平居中**；门才靠开启边。
      // 原来不分门和抽，一律距左 60mm——整宽的抽屉上就偏到一边去了。
      cx: isDrawer ? p.x + p.w / 2 : (leftSide ? p.x + p.w - 60 : p.x + 60),
      cy: fy(p.y + p.h / 2),
      rx: 10, ry: 10, fill: 'handle',
    });
  }
  return out;
}

function basinFront(p) {
  const m = p.meta;
  const top = fy(p.y + p.h);
  if (m.shape === 'ellipse') {
    const cavH = p.h - m.wall - m.wallBottom;
    return [
      { shape: 'ellipse', part: 'basin', cx: p.x + p.w / 2, cy: top + p.h / 2, rx: p.w / 2, ry: p.h / 2, fill: 'basin' },
      { shape: 'ellipse', part: 'basinInner', cx: p.x + p.w / 2, cy: top + m.wall + cavH / 2,
        rx: p.w / 2 - m.wall, ry: cavH / 2, fill: 'basinInner' },
    ];
  }
  const cavH = p.h - m.wall - m.wallBottom;
  return [
    { shape: 'rect', part: 'basin', x: p.x, y: top, w: p.w, h: p.h, rx: m.radius, fill: 'basin' },
    { shape: 'rect', part: 'basinInner', x: p.x + m.wall, y: top + m.wall,
      w: p.w - 2 * m.wall, h: cavH, rx: Math.max(0, m.radius - m.wall), fill: 'basinInner' },
  ];
}

/**
 * 镜柜箱体。
 *
 * 画一个外框 + 一圈内壁。门板由 mirrorDoorFront 单独画（z 更靠前，压在上面），
 * 所以内壁只会在下方那段敞口搁板里露出来——这正是参照图的效果。
 */
function mirrorFront(p) {
  const frame = 22;
  // p.y / p.h 是**工程坐标**（y 向上），输出是屏幕坐标（y 向下）。
  // 下面的加法都在工程坐标里做，最后交给 fy() 取负。
  const boardT = p.meta.boardT ?? 20;
  // 敞口搁板上表面 = 门区底边 = p.railT + doorH 处。
  // 不能用 p.h - boardT 反推——那样算出来是「柜底往上留板厚」，
  // 跟门实际画到哪儿（镜箱顶端往下 railT + doorH）对不上，
  // 层板会整体低一截，正视图里和门板底边错开。
  const doorBottom = p.y + (p.meta.railT ?? 15) + p.meta.doorH;

  return [
    { shape: 'rect', part: 'mirror', x: p.x, y: fy(p.y + p.h), w: p.w, h: p.h, rx: 4, fill: 'mirror' },
    // 整块内壁。门板盖在它前面（z 更大、后画），所以上面那段自然被遮住。
    {
      shape: 'rect', part: 'mirrorInner',
      x: p.x + frame, y: fy(p.y + p.h - frame),
      w: p.w - 2 * frame, h: p.h - 2 * frame, rx: 3, fill: 'mirrorInner',
    },
    // 敞口搁板的层板：正视图里就是那条上下分界
    {
      shape: 'rect', part: 'mirrorShelf',
      x: p.x + frame, y: fy(doorBottom),
      w: p.w - 2 * frame, h: boardT, fill: 'mirrorInner',
    },
  ];
}

/**
 * 单扇镜柜门板 + 它的拉手。
 *
 * 两种拉手（量自参照图）：
 *   · 竖槽（slot）——通高，槽宽 36mm，上下各内缩 35mm，
 *     水平方向靠该门的**外沿**一侧，起于距柜体外沿 36mm。
 *   · 方钮（knob）——28mm 见方的小方块，中心在门高的 87.5% 处
 *     （参照图上是距柜顶 547mm，明显偏低），水平方向靠中缝 50mm。
 *
 * `slotOutward` 是 solveMirror 算好的：靠哪一侧开门就朝哪一侧伸手，
 * 中间的门不会去够柜体外沿。
 */
function mirrorDoorFront(p) {
  // 门板和镜箱本体同为镜面（同色，靠黑描边区分门缝）。
  // part 仍标成 mirrorDoor，测试和 3D 配色靠它识别，不靠颜色。
  const out = [
    { shape: 'rect', part: 'mirrorDoor', x: p.x, y: fy(p.y + p.h), w: p.w, h: p.h, rx: 3, fill: 'mirror' },
  ];
  // 门板内嵌一圈浅边，参照图上每扇门都有这道收口线
  out.push({
    shape: 'rect', part: 'mirrorDoorInner',
    x: p.x + 8, y: fy(p.y + p.h - 8), w: p.w - 16, h: p.h - 16, rx: 2, fill: 'mirrorInner',
  });

  if (p.meta.handle === 'slot') {
    const sw = 36;          // 槽宽
    const inset = 36;       // 距门板外沿
    const vm = 35;          // 上下内缩
    const sx = p.meta.slotOutward === 'left' ? p.x + inset : p.x + p.w - inset - sw;
    out.push({
      shape: 'rect', part: 'mirrorSlot',
      x: sx, y: fy(p.y + p.h - vm), w: sw, h: p.h - 2 * vm,
      fill: 'mirrorSlot', stroke: null,
    });
  } else {
    // 方钮。中心在**门底往上 12.5%** 处（= 距门顶 87.5%，量自参照图）。
    const ks = 28;
    // p.y 是门的**底边**（工程坐标）。往上 12.5% 得到中心，再减半个钮得到底边。
    const kBottom = p.y + p.h * 0.125 - ks / 2;
    // 方钮在门的**内侧边**（靠中缝那一侧），跟竖槽正好相反——
    // slotOutward 说的是「靠外沿哪边」，这里要的是它的反面。
    const kx = p.meta.slotOutward === 'left' ? p.x + p.w - 50 - ks : p.x + 50;
    out.push({
      shape: 'rect', part: 'mirrorKnob',
      x: kx, y: fy(kBottom + ks), w: ks, h: ks,
      fill: 'handle', stroke: null,
    });
  }
  return out;
}

/** 镜柜门板用的填色（门板与镜箱同为镜面）。给测试和文档留一个入口。 */
export const MIRROR_DOOR_FILL = 'mirror';

function faucetFront(p) {
  return [
    { shape: 'rect', part: 'faucet', x: p.x, y: fy(p.y + p.h), w: p.w, h: p.h, rx: 10, fill: 'faucet' },
    { shape: 'rect', part: 'faucet', x: p.x - 4, y: fy(p.y + p.h) - 12, w: p.w + 8, h: 12, rx: 6, fill: 'faucet' },
  ];
}

export function front(ps, spec, L) {
  const sh = [
    { shape: 'rect', part: 'wall', x: -600, y: -3000, w: 2600, h: 3200, fill: 'wall', stroke: null, bleed: true },
  ];
  const mid = cabMid(ps);

  for (const p of [...ps].sort((a, b) => orderOf(a) - orderOf(b))) {
    switch (p.kind) {
      case 'backPanel': case 'bottomPanel': case 'sidePanel':
      case 'shelf': case 'drawerBox': case 'rail':
        break;
      case 'basin':
        sh.push(...basinFront(p));
        break;
      case 'faucet':
        sh.push(...faucetFront(p));
        break;
      case 'cell':
        sh.push(...cellFront(p, mid));
        break;
      case 'mirror':
        sh.push(...mirrorFront(p));
        break;
      case 'mirrorDoor':
        sh.push(...mirrorDoorFront(p));
        break;
      default:
        sh.push({ shape: 'rect', part: p.kind, x: p.x, y: fy(p.y + p.h), w: p.w, h: p.h, fill: p.kind });
    }
  }

  sh.push({ shape: 'line', part: 'floor', x1: -300, y1: 0, x2: 1300, y2: 0, stroke: 'floor', sw: 1.4, bleed: true });

  const ann = annotationBlock(spec, L, sh);
  if (ann) sh.push(...ann);

  return sh;
}

/**
 * 文字标注块。position='right' 排在图形右侧，'below' 排在下方。
 * 位置依据不含自身的 bbox（否则会自我参照），因此先量图形部分。
 */
function annotationBlock(spec, L, shapes) {
  if (!spec.annotations || !spec.annotations.enabled) return [];
  const lines = annotationLines(spec, L);
  if (!lines.length) return [];

  const graphic = shapes.filter((s) => !s.bleed && s.part !== 'wall');
  const b = bbox(graphic, 0);
  const fs = spec.annotations.fontSize ?? 22;
  const lh = spec.annotations.lineHeight ?? 34;
  const below = spec.annotations.position === 'below';

  const x = below ? b[0] : b[0] + b[2] + 30;
  const y0 = below ? b[1] + b[3] + lh * 1.6 : b[1];

  return lines.map((t, i) => ({
    shape: 'text', part: 'dimText',
    x, y: y0 + i * lh, text: t,
    size: i === 0 ? fs * 1.15 : fs,
    anchor: 'start', fill: 'dimText',
  }));
}
