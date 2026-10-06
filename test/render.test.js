import { test, eq } from './helpers.js';
import { renderSVG, drawAll, WHITEMODEL } from '../src/render.js';
import { parts } from '../src/parts.js';
import { solve } from '../src/solve.js';
import { front } from '../src/project.js';
import { makeSpec } from '../src/spec.js';
import { layoutMatrix } from './layouts.js';

test('renderSVG 产出带 mm 尺寸和 viewBox 的 svg', () => {
  const s = makeSpec();
  const L = solve(s);
  const sh = front(parts(s), s, L);
  const svg = renderSVG(sh, [0, 0, 100, 200]);
  eq(svg.startsWith('<svg'), true);
  eq(svg.includes('viewBox="0 0 100 200"'), true);
  eq(svg.includes('width="100mm"'), true);
  eq(svg.includes('height="200mm"'), true);
  eq(svg.includes('xmlns="http://www.w3.org/2000/svg"'), true);
});

test('白模风格：SVG 里不出现渐变、滤镜、图案、投影', () => {
  const s = makeSpec();
  const out = drawAll(s);
  for (const k of ['front']) {
    for (const banned of ['linearGradient', 'radialGradient', '<filter', 'filter=', 'pattern', 'feGaussian', 'drop-shadow']) {
      eq(out[k].svg.includes(banned), false, `${k} 不应包含 ${banned}`);
    }
  }
});

test('非有限坐标直接抛错（最关键的回归防线）', () => {
  let threw = false;
  try {
    renderSVG([{ shape: 'rect', part: 'top', x: 0, y: NaN, w: 10, h: 10, fill: 'top' }], [0, 0, 10, 10]);
  } catch { threw = true; }
  eq(threw, true, 'NaN 坐标必须抛错，而不是静默画不出东西');
});

test('undefined 坐标也抛错', () => {
  let threw = false;
  try {
    renderSVG([{ shape: 'rect', part: 'top', x: 0, y: 0, w: undefined, h: 10, fill: 'top' }], [0, 0, 10, 10]);
  } catch { threw = true; }
  eq(threw, true);
});

test('Infinity 抛错', () => {
  let threw = false;
  try {
    renderSVG([{ shape: 'line', part: 'x', x1: 0, y1: 0, x2: Infinity, y2: 0, stroke: 'stroke' }], [0, 0, 10, 10]);
  } catch { threw = true; }
  eq(threw, true);
});

test('viewBox 里出现 NaN 也抛错', () => {
  let threw = false;
  try {
    renderSVG([{ shape: 'rect', part: 'top', x: 0, y: 0, w: 10, h: 10, fill: 'top' }], [0, 0, NaN, 10]);
  } catch { threw = true; }
  eq(threw, true);
});

test('负零被归一成 0，SVG 里不会出现 x="-0"', () => {
  const svg = renderSVG([{ shape: 'rect', part: 'top', x: -0, y: 0, w: 10, h: 10, fill: 'top' }], [0, 0, 10, 10]);
  eq(svg.includes('"-0"'), false, `SVG 不该含 -0：${svg.slice(0, 200)}`);
  eq(svg.includes('x="0"'), true);
});

test('overhang=0 时台面左边界是 0 而不是 -0', () => {
  const out = drawAll(makeSpec({ cabinet: { width: 1180, depth: 500 }, top: { overhang: 0 } }));
  eq(out.front.svg.includes('"-0"'), false);

});

test('fill:null 不填色，stroke 不为 null 时描边', () => {
  const svg = renderSVG([{ shape: 'rect', part: 'carcass', x: 0, y: 0, w: 10, h: 10, fill: null, stroke: 'stroke' }], [0, 0, 10, 10]);
  eq(svg.includes('fill="none"'), true);
  eq(svg.includes('stroke="#000000"'), true);
});

test('stroke:null 不描边', () => {
  const svg = renderSVG([{ shape: 'rect', part: 'wall', x: 0, y: 0, w: 10, h: 10, fill: 'wall', stroke: null }], [0, 0, 10, 10]);
  eq(svg.includes('stroke="none"'), true);
});

test('未指定 stroke 时默认描边', () => {
  const svg = renderSVG([{ shape: 'rect', part: 'top', x: 0, y: 0, w: 10, h: 10, fill: 'top' }], [0, 0, 10, 10]);
  eq(svg.includes('stroke="#000000"'), true);
});

test('调色板键被解析成色值', () => {
  const svg = renderSVG([{ shape: 'rect', part: 'top', x: 0, y: 0, w: 10, h: 10, fill: 'top' }], [0, 0, 10, 10]);
  eq(svg.includes(WHITEMODEL.top), true);
});

test('调色板键找不到时按字面色值处理', () => {
  const svg = renderSVG([{ shape: 'rect', part: 'x', x: 0, y: 0, w: 10, h: 10, fill: '#abcdef' }], [0, 0, 10, 10]);
  eq(svg.includes('#abcdef'), true);
});

test('调色板里每个键都是合法色值或明确的 none', () => {
  for (const [k, v] of Object.entries(WHITEMODEL)) {
    eq(typeof v, 'string', `${k} 应为字符串`);
    eq(/^#[0-9a-fA-F]{3,8}$/.test(v) || v === 'none', true, `${k} = ${v} 不是合法色值`);
  }
});

test('虚线、圆角、透明度都被输出', () => {
  const svg = renderSVG([
    { shape: 'rect', part: 'x', x: 0, y: 0, w: 10, h: 10, fill: null, dash: '8 6', rx: 4, op: 0.5 },
  ], [0, 0, 10, 10]);
  eq(svg.includes('stroke-dasharray="8 6"'), true);
  eq(svg.includes('rx="4"'), true);
  eq(svg.includes('opacity="0.5"'), true);
});

test('path 与 ellipse 与 line 都能输出', () => {
  const svg = renderSVG([
    { shape: 'path', part: 'basin', d: 'M 0 0 L 10 10 Z', fill: 'basin' },
    { shape: 'ellipse', part: 'drain', cx: 5, cy: 5, rx: 2, ry: 2, fill: null, stroke: 'stroke' },
    { shape: 'line', part: 'floor', x1: 0, y1: 0, x2: 10, y2: 0, stroke: 'floor' },
  ], [0, 0, 10, 10]);
  eq(svg.includes('<path'), true);
  eq(svg.includes('<ellipse'), true);
  eq(svg.includes('<line'), true);
});

test('未知图形类型抛错', () => {
  let threw = false;
  try {
    renderSVG([{ shape: 'polygon', part: 'x' }], [0, 0, 10, 10]);
  } catch { threw = true; }
  eq(threw, true);
});

test('文字被转义，不破坏 XML', () => {
  const svg = renderSVG([{ shape: 'text', part: 'dimText', x: 0, y: 0, text: 'a<b&c"d', size: 20, fill: 'dimText' }], [0, 0, 100, 40]);
  eq(svg.includes('a&lt;b&amp;c&quot;d'), true);
  eq(svg.includes('a<b&c'), false);
});

test('文字带中文字体栈', () => {
  const svg = renderSVG([{ shape: 'text', part: 'dimText', x: 0, y: 0, text: '盆', size: 20, fill: 'dimText' }], [0, 0, 100, 40]);
  eq(svg.includes('Microsoft YaHei'), true);
});

test('回归：全部预设 × 三种盆型 × 正视图，SVG 里不得出现 NaN/undefined/Infinity', () => {
  for (const lay of layoutMatrix()) {
    for (const type of ['vessel', 'undermount', 'integral']) {
      const s = makeSpec({ ...lay.patch, basin: { ...(lay.patch.basin ?? {}), type } });
      const out = drawAll(s);
      for (const k of ['front']) {
        for (const bad of ['NaN', 'undefined', 'Infinity', 'null"']) {
          eq(out[k].svg.includes(bad), false, `${lay.label} / ${type} / ${k} 的 SVG 含 ${bad}`);
        }
      }
    }
  }
});

test('回归：极端尺寸不崩（超窄柜、超矮柜、盆超宽）', () => {
  for (const over of [
    { cabinet: { width: 300, height: 680 } },
    { cabinet: { height: 120 } },
    { cabinet: { width: 300 }, basin: { count: 1, width: 900 } },
    { cabinet: { width: 1180 }, basin: { count: 2, width: 560, gap: 400 } },
    { cabinet: { width: 1180 }, top: { overhang: 60 } },
    { cabinet: { width: 1180 }, top: { thickness: 60, backsplash: { height: 200 } } },
  ]) {
    const out = drawAll(makeSpec(over));
    for (const k of ['front']) {
      eq(out[k].svg.length > 0, true, `${JSON.stringify(over)} / ${k} 产出为空`);
      eq(out[k].box[2] > 0, true, `${JSON.stringify(over)} / ${k} bbox 宽非正`);
    }
  }
});

test('回归：镜柜关掉时不崩', () => {
  const out = drawAll(makeSpec({ mirror: null }));
  eq(out.front.svg.includes('part='), false, '镜柜关了就不该有 mirror 图形');
});

test('回归：龙头关掉时不崩', () => {
  const out = drawAll(makeSpec({ faucet: { enabled: false } }));
  eq(out.front.svg.length > 0, true);
});

test('回归：文字标注关掉时不崩', () => {
  const out = drawAll(makeSpec({ annotations: { enabled: false } }));
  eq(out.front.svg.length > 0, true);
});
