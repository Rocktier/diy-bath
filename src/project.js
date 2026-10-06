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
