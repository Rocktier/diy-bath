import { parts } from './parts.js';
import { solve } from './solve.js';
import { front, plan, section, bbox } from './project.js';

export const WHITEMODEL = {
  wall: '#f4f4f2',
  wallT: '#e6e6e2',
  floor: '#9a9a9a',
  stroke: '#000000',
  mirror: '#ffffff',
  mirrorInner: '#f0f0ee',
  top: '#dcdcda',
  backsplash: '#e9e9e7',
  basin: '#fbfbfa',
  basinInner: '#e6e6e4',
  carcass: '#d2d2d0',
  cell: '#f4f4f3',
  toe: '#c2c2c0',
  shelf: '#d8d8d6',
  drawerBox: '#e0e0de',
  rail: '#a9a9a7',
  faucet: '#c6c6c4',
  handle: '#c6c6c4',
  gola: '#cfcfcd',
  layoutKeyFrame: '#000000',
  drain: 'none',
  dimText: '#333333',
};

/** 默认描边宽度，单位 mm（viewBox 就是 mm，所以不同尺寸柜子观感一致） */
export const STROKE_WIDTH = 1;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);

function num(v, label) {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`${label} 不是有限数：${v}`);
  }
  const r = Math.round(v * 1000) / 1000;
  // 把 -0 归一成 0。`-top.overhang` 在 overhang=0 时会算出 -0，
  // 直接写进 SVG 会变成 x="-0"，能渲染但很难看。
  return r === 0 ? 0 : r;
}

function resolve(key) {
  if (key === null || key === undefined) return null;
  return WHITEMODEL[key] ?? key;
}

const FONT = '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif';

function shapeToSVG(s) {
  const strokeKey = s.stroke === undefined ? 'stroke' : s.stroke;
  const stroke = resolve(strokeKey);
  const sw = s.sw ?? (stroke ? STROKE_WIDTH : 0);
  const dash = s.dash ? ` stroke-dasharray="${s.dash}"` : '';
  const op = s.op != null ? ` opacity="${s.op}"` : '';
  const st = stroke ? ` stroke="${stroke}" stroke-width="${num(sw, 'sw')}"` : ' stroke="none"';

  switch (s.shape) {
    case 'rect':
      return `<rect x="${num(s.x, 'x')}" y="${num(s.y, 'y')}" width="${num(s.w, 'w')}" height="${num(s.h, 'h')}"${
        s.rx ? ` rx="${num(s.rx, 'rx')}"` : ''} fill="${resolve(s.fill) ?? 'none'}"${st}${dash}${op}/>`;
    case 'line':
      return `<line x1="${num(s.x1, 'x1')}" y1="${num(s.y1, 'y1')}" x2="${num(s.x2, 'x2')}" y2="${num(s.y2, 'y2')}"${st}${dash}${op}/>`;
    case 'ellipse':
      return `<ellipse cx="${num(s.cx, 'cx')}" cy="${num(s.cy, 'cy')}" rx="${num(s.rx, 'rx')}" ry="${num(s.ry, 'ry')}" fill="${
        resolve(s.fill) ?? 'none'}"${st}${dash}${op}/>`;
    case 'path':
      return `<path d="${s.d}" fill="${resolve(s.fill) ?? 'none'}"${st}${dash}${op}/>`;
    case 'text':
      return `<text x="${num(s.x, 'x')}" y="${num(s.y, 'y')}" fill="${resolve(s.fill) ?? WHITEMODEL.dimText}" font-size="${
        num(s.size ?? 20, 'size')}" font-family='${FONT}' text-anchor="${s.anchor ?? 'middle'}"${
        s.baseline ? ` dominant-baseline="${s.baseline}"` : ''}${op}>${esc(s.text)}</text>`;
    default:
      throw new Error(`未知图形类型：${s.shape}`);
  }
}

export function renderSVG(shapes, box) {
  const body = shapes.map(shapeToSVG).join('');
  const v = box.map((n, i) => num(n, `box[${i}]`));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${v[2]}mm" height="${v[3]}mm" viewBox="${v.join(' ')}">${body}</svg>`;
}

export function drawAll(spec) {
  const L = solve(spec);
  const ps = parts(spec);
  const out = {};
  for (const [key, project] of [['front', front], ['plan', plan], ['section', section]]) {
    const shapes = project(ps, spec, L);
    const box = bbox(shapes);
    out[key] = { shapes, box, svg: renderSVG(shapes, box) };
  }
  return out;
}