import { annotationLines } from './annotate.js';

const PAD = 40;

const orderOf = (p) => p.order ?? p.z + p.d;
const fy = (y) => -y;

export const LAYOUT_LABEL = {
  drawer: '抽',
  door: '门',
  open: '开放格',
  basin: '盆胆',
};

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
  const h = p.meta.handle;
  const leftSide = p.x + p.w / 2 < mid;

  if (h === 'gola') {
    out.push({
      shape: 'rect', part: 'gola',
      x: p.x + 2, y: fy(p.y + p.h),
      w: p.w - 4, h: 20, fill: 'basinInner',
    });
  } else if (h === 'bar-h') {
    const len = Math.min(240, p.w * 0.6);
    out.push({
      shape: 'rect', part: 'handle',
      x: p.x + (p.w - len) / 2, y: fy(p.y + 34 + 14),
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
      cx: leftSide ? p.x + p.w - 60 : p.x + 60,
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
        sh.push({ shape: 'rect', part: 'mirror', x: p.x, y: fy(p.y + p.h), w: p.w, h: p.h, rx: 4, fill: 'mirror' });
        sh.push({ shape: 'rect', part: 'mirrorInner', x: p.x + 22, y: fy(p.y + p.h - 22), w: p.w - 44, h: p.h - 44, rx: 3, fill: 'mirrorInner' });
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

export function plan(ps, spec, L) {
  const { cabinet, top } = spec;
  const D = cabinet.depth;
  const sh = [];
  const t = ps.find((p) => p.kind === 'top');
  const bs = ps.find((p) => p.kind === 'backsplash');
  const bsT = bs ? bs.d : top.backsplash.thickness;

  sh.push({ shape: 'line', part: 'floor', x1: -80, y1: 0, x2: (t ? t.w : cabinet.width) + 80, y2: 0, stroke: 'floor', sw: 1.4, bleed: true });

  if (t) sh.push({ shape: 'rect', part: 'top', x: t.x, y: t.z, w: t.w, h: t.d, fill: 'top' });
  if (bs) sh.push({ shape: 'rect', part: 'backsplash', x: bs.x, y: bs.z, w: bs.w, h: bs.d, fill: 'backsplash' });

  sh.push({
    shape: 'rect', part: 'carcass',
    x: 0, y: bsT, w: cabinet.width, h: D - bsT - 20,
    fill: null, stroke: 'stroke', sw: 0.9, dash: '16 11',
  });

  for (const c of L.cells) {
    sh.push({
      shape: 'line', part: 'cell',
      x1: c.x + c.w / 2, y1: bsT + 6, x2: c.x + c.w / 2, y2: D - 26,
      stroke: 'stroke', sw: 0.8, dash: '12 9', op: 0.5,
    });
  }

  for (const p of ps.filter((x) => x.kind === 'basin')) {
    if (p.meta.type !== 'integral') {
      sh.push({ shape: 'rect', part: 'basin', x: p.x, y: p.z, w: p.w, h: p.d, rx: p.meta.radius, fill: 'basin' });
      sh.push({
        shape: 'rect', part: 'basinInner',
        x: p.x + p.meta.wall, y: p.z + p.meta.wall,
        w: p.w - 2 * p.meta.wall, h: p.d - 2 * p.meta.wall,
        rx: Math.max(0, p.meta.radius - p.meta.wall), fill: 'basinInner',
      });
    }
    sh.push({
      shape: 'ellipse', part: 'drain',
      cx: p.x + p.w / 2, cy: p.z + p.d / 2, rx: 20, ry: 20,
      fill: null, stroke: 'stroke', sw: 0.8,
    });
  }

  for (const p of ps.filter((x) => x.kind === 'faucet')) {
    sh.push({ shape: 'ellipse', part: 'faucet', cx: p.x + p.w / 2, cy: p.z + 20, rx: 26, ry: 26, fill: 'faucet' });
    sh.push({
      shape: 'rect', part: 'faucet', x: p.x + p.w / 2 - 9, y: p.z + 20, w: 18,
      h: Math.max(0, p.d - 50), fill: 'faucet',
    });
  }

  const m = ps.find((x) => x.kind === 'mirror');
  if (m) {
    sh.push({
      shape: 'rect', part: 'mirror',
      x: m.x, y: -m.d - 20, w: m.w, h: m.d,
      fill: null, stroke: 'stroke', sw: 1, dash: '14 10',
    });
  }
  return sh;
}

const WALL_T = 40;

export function section(ps, spec, L) {
  const { cabinet } = spec;
  const D = cabinet.depth;
  const sh = [];
  const get = (k) => ps.find((p) => p.kind === k);

  sh.push({
    shape: 'rect', part: 'wall',
    x: -WALL_T, y: fy(L.ctTopY + 900), w: WALL_T, h: 3000,
    fill: 'wallT', stroke: 'stroke', sw: 1, bleed: true,
  });
  sh.push({ shape: 'line', part: 'floor', x1: -120, y1: 0, x2: D + 160, y2: 0, stroke: 'floor', sw: 1.4, bleed: true });

  const bp = get('backPanel');
  if (bp) sh.push({ shape: 'rect', part: 'backPanel', x: bp.z, y: fy(bp.y + bp.h), w: bp.d, h: bp.h, fill: 'carcass' });
  const bo = get('bottomPanel');
  if (bo) sh.push({ shape: 'rect', part: 'carcass', x: bo.z, y: fy(bo.y + bo.h), w: bo.d, h: bo.h, fill: 'carcass' });

  for (const p of ps.filter((x) => x.kind === 'shelf')) {
    sh.push({ shape: 'rect', part: 'shelf', x: p.z, y: fy(p.y + p.h), w: p.d, h: p.h, fill: 'shelf' });
  }
  for (const p of ps.filter((x) => x.kind === 'drawerBox')) {
    sh.push({ shape: 'rect', part: 'drawerBox', x: p.z, y: fy(p.y + p.h), w: p.d, h: p.h, fill: 'drawerBox' });
  }
  for (const p of ps.filter((x) => x.kind === 'rail')) {
    sh.push({ shape: 'rect', part: 'rail', x: p.z, y: fy(p.y + p.h), w: p.d, h: p.h, fill: 'rail' });
  }
  for (const p of ps.filter((x) => x.kind === 'cell')) {
    sh.push({ shape: 'rect', part: 'cell', x: p.z, y: fy(p.y + p.h), w: p.d, h: p.h, fill: 'cell' });
  }

  const t = get('top');
  if (t) sh.push({ shape: 'rect', part: 'top', x: t.z, y: fy(t.y + t.h), w: t.d, h: t.h, fill: 'top' });
  const bs = get('backsplash');
  if (bs) sh.push({ shape: 'rect', part: 'backsplash', x: bs.z, y: fy(bs.y + bs.h), w: bs.d, h: bs.h, fill: 'backsplash' });

  const TH = 18;
  for (const p of ps.filter((x) => x.kind === 'basin')) {
    if (p.meta.type === 'undermount') {
      sh.push({ shape: 'path', part: 'basin', d: wallHungPath(p, TH), fill: 'basin' });
      sh.push({ shape: 'path', part: 'basinCavity', d: wallHungCavityPath(p, TH), fill: 'basinInner' });
    } else {
      sh.push({ shape: 'path', part: 'basin', d: vesselPath(p, TH), fill: 'basin' });
      sh.push({ shape: 'path', part: 'basinCavity', d: vesselCavityPath(p, TH), fill: 'basinInner' });
    }
  }

  for (const p of ps.filter((x) => x.kind === 'faucet')) {
    sh.push({ shape: 'rect', part: 'faucet', x: p.z, y: fy(p.y + p.h), w: p.d, h: p.h, fill: 'faucet' });
  }

  sh.push(...layoutKey(L));
  return sh;
}

/**
 * 剖面图底部的"分区示意"。
 *
 * 关键 1：它必须是柜内分格的**等比缩影**，保持每个格子的真实 x/y/w/h，
 *   只是整体下移。不能把格子平铺成一条——不同带的格子是上下叠的，
 *   平铺会让总宽变成净宽的两倍，完全不代表柜子。
 * 关键 2：屏幕 y 为正才是"地面线以下"。整条示意必须落在 y>0 一侧，
 *   否则会盖住剖面本体。
 */
function layoutKey(L) {
  const out = [];
  const KEY_TOP = 80;
  const offset = KEY_TOP + L.carcassTopY;

  let minX = Infinity;
  let maxX = -Infinity;
  for (const c of L.cells) {
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x + c.w);
  }
  if (!Number.isFinite(minX)) return out;

  for (const c of L.cells) {
    out.push({
      shape: 'rect', part: 'layoutKey',
      x: c.x, y: -(c.y + c.h) + offset, w: c.w, h: c.h,
      fill: c.kind === 'door' ? 'cell' : c.kind === 'drawer' ? 'carcass' : 'basinInner',
    });
    out.push({
      shape: 'text', part: 'layoutKeyText',
      x: c.x + c.w / 2,
      y: -(c.y + c.h / 2) + offset + 8,
      text: LAYOUT_LABEL[c.kind] ?? c.kind,
      size: Math.max(16, Math.min(32, c.h * 0.32)),
      anchor: 'middle', fill: 'dimText',
    });
  }

  out.push({
    shape: 'rect', part: 'layoutKeyFrame',
    x: minX, y: -L.carcassTopY + offset, w: maxX - minX,
    h: L.carcassTopY - L.baseY,
    fill: null, stroke: 'stroke', sw: 1.2, dash: '8 6',
  });
  out.push({
    shape: 'text', part: 'layoutKeyTitle',
    x: minX, y: -L.carcassTopY + offset - 24,
    text: '分区示意', size: 24, anchor: 'start', fill: 'dimText',
  });
  return out;
}

function vesselPath(p, th) {
  const { z, d, y, h } = p;
  return `M ${z + th} ${fy(y)} L ${z + th * 2} ${fy(y + h)} L ${z + d - th * 2} ${fy(y + h)} L ${z + d - th} ${fy(y)} Z`;
}
function vesselCavityPath(p, th) {
  const { z, d, y, h } = p;
  return `M ${z + th * 2} ${fy(y)} L ${z + th * 2 + th} ${fy(y + h - th)} L ${z + d - th * 2 - th} ${fy(y + h - th)} L ${z + d - th * 2} ${fy(y)} Z`;
}
function wallHungPath(p, th) {
  const { z, d, y, h } = p;
  return `M ${z} ${fy(y)} L ${z + th * 2} ${fy(y + h)} L ${z + d - th * 2} ${fy(y + h)} L ${z + d} ${fy(y)} Z`;
}
function wallHungCavityPath(p, th) {
  const { z, d, y, h } = p;
  return `M ${z + th * 2} ${fy(y)} L ${z + th * 2 + th} ${fy(y + h - th)} L ${z + d - th * 2 - th} ${fy(y + h - th)} L ${z + d - th * 2} ${fy(y)} Z`;
}