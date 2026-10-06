import { test, eq } from './helpers.js';
import { annotationLines, BASIN_LABEL, CELL_LABEL } from '../src/annotate.js';
import { solve } from '../src/solve.js';
import { drawAll } from '../src/render.js';
import { makeSpec, PRESETS } from '../src/spec.js';

const ann = (over) => {
  const s = makeSpec(over);
  return annotationLines(s, solve(s));
};

test('标注：第一行是方案名', () => {
  const s = makeSpec({ name: '张三家 1200 双盆' });
  eq(annotationLines(s, solve(s))[0], '张三家 1200 双盆');
});

test('标注：包含台面材质与厚度、挡水高', () => {
  const txt = ann({ top: { material: '岩板', thickness: 20, backsplash: { height: 90 } } }).join('\n');
  eq(txt.includes('岩板'), true);
  eq(txt.includes('20厚'), true);
  eq(txt.includes('挡水高 90'), true);
});

test('标注：台面材质可自由填写', () => {
  const txt = ann({ top: { material: '定制多层板' } }).join('\n');
  eq(txt.includes('定制多层板'), true);
});

test('标注：包含盆型中文与三维尺寸', () => {
  const txt = ann({ basin: { type: 'vessel', width: 500, depth: 380, height: 120, count: 1 } }).join('\n');
  eq(txt.includes('台上盆'), true);
  eq(txt.includes('500×380×120'), true);
});

test('标注：三种盆型各有说法', () => {
  for (const [type, word] of [['vessel', '台上盆'], ['undermount', '台下盆'], ['integral', '一体盆']]) {
    eq(ann({ basin: { type } }).join('\n').includes(word), true, `${type} 应显示为 ${word}`);
  }
});

test('标注：台下盆只标两维，不出现 ×0', () => {
  const txt = ann({ basin: { type: 'undermount', width: 500, depth: 380, height: 0 } }).join('\n');
  eq(txt.includes('台下盆 500×380 ×1 个'), true);
  eq(txt.includes('×0'), false);
});

test('标注：双盆标注数量', () => {
  eq(ann({ basin: { count: 2 } }).join('\n').includes('×2 个'), true);
});

test('标注：主柜尺寸、安装方式、板材、板厚', () => {
  const txt = ann({
    cabinet: { width: 1180, height: 680, depth: 500, mount: 'floor', sidePanel: 18, boardMaterial: '多层实木' },
  }).join('\n');
  eq(txt.includes('1180×680×500'), true);
  eq(txt.includes('落地'), true);
  eq(txt.includes('多层实木'), true);
  eq(txt.includes('板厚 18'), true);
});

test('标注：悬空时显示悬空离地，落地不显示', () => {
  const wall = ann({ cabinet: { mount: 'wall', wallGap: 150 } }).join('\n');
  eq(wall.includes('悬空 150'), true);
  const floor = ann({ cabinet: { mount: 'floor' } }).join('\n');
  eq(floor.includes('悬空'), false);
});

test('标注：分区行由 bands 反推，与实际格子数一致', () => {
  const txt = ann({
    cabinet: { width: 1180, height: 680 },
    bands: [
      { kind: 'door', cols: [1, 1], rows: [1], handle: 'bar-v' },
      { kind: 'drawer', cols: [1], rows: [1], handle: 'bar-h' },
    ],
  }).join('\n');
  eq(txt.includes('下带 门×2'), true);
  eq(txt.includes('上带 抽×1'), true);
});

test('标注：混合带列出实际构成', () => {
  const txt = ann({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'door', cols: [3, 1, 3], rows: [1], cells: ['door', 'drawer', 'door'] }],
  }).join('\n');
  eq(txt.includes('门×2'), true);
  eq(txt.includes('抽×1'), true);
});

test('标注：两条带以上时中间带带序号', () => {
  const txt = ann({
    cabinet: { width: 1180, height: 900 },
    bands: [
      { kind: 'door', cols: [1], rows: [1] },
      { kind: 'drawer', cols: [1], rows: [1] },
      { kind: 'drawer', cols: [1], rows: [1] },
    ],
  }).join('\n');
  eq(txt.includes('下带'), true);
  eq(txt.includes('中带1'), true);
  eq(txt.includes('上带'), true);
});

test('标注：六抽标成 抽×6', () => {
  const txt = ann({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'drawer', cols: [1, 1], rows: [2, 1, 1] }],
  }).join('\n');
  eq(txt.includes('抽×6'), true);
});

test('标注：盆胆与开放格有各自的说法', () => {
  const txt = ann({
    cabinet: { width: 1180, height: 680 },
    bands: [{ kind: 'door', cols: [1, 1, 1], rows: [1], cells: ['basin', 'door', 'basin'] }],
  }).join('\n');
  eq(txt.includes('盆胆×2'), true);
  eq(txt.includes('门×1'), true);
});

test('标注：包含缝宽', () => {
  eq(ann({ cabinet: { gap: 3 } }).join('\n').includes('缝宽：3'), true);
});

test('标注：enabled=false 时返回空数组', () => {
  eq(ann({ annotations: { enabled: false } }).length, 0);
});

test('标注：行数 == 6 行内容（方案名/台面/盆/主柜/分区/缝宽）', () => {
  eq(ann().length, 6);
});

test('标注：非整数尺寸按一位小数显示，不带 .0', () => {
  const txt = ann({ cabinet: { width: 1180.5 } }).join('\n');
  eq(txt.includes('1180.5'), true);
  eq(txt.includes('1180.5厚'), false);
  eq(txt.includes('.0'), false, '整数不应显示成 x.0');
});

test('标注：BASIN_LABEL 与 CELL_LABEL 齐全', () => {
  eq(BASIN_LABEL.vessel, '台上盆');
  eq(BASIN_LABEL.undermount, '台下盆');
  eq(BASIN_LABEL.integral, '一体盆');
  for (const k of ['drawer', 'door', 'open', 'basin']) {
    eq(typeof CELL_LABEL[k], 'string', `CELL_LABEL 缺 ${k}`);
  }
});

test('标注：全部预设都能生成文案且无 NaN/undefined', () => {
  for (const p of PRESETS) {
    const s = makeSpec(p.spec);
    const lines = annotationLines(s, solve(s));
    eq(lines.length, 6, `${p.name} 行数不对`);
    for (const l of lines) {
      eq(l.includes('NaN'), false, `${p.name} 文案含 NaN：${l}`);
      eq(l.includes('undefined'), false, `${p.name} 文案含 undefined：${l}`);
      eq(l.includes('null'), false, `${p.name} 文案含 null：${l}`);
    }
  }
});

test('标注：镜柜为 null 时不崩', () => {
  eq(ann({ mirror: null }).length, 6);
});

test('标注：画进正视图后可被渲染，不破坏 SVG', () => {
  const s = makeSpec();
  const out = drawAll(s);
  eq(out.front.svg.includes(s.name), true, '正视图应包含方案名');
  eq(out.front.svg.includes('台下盆'), true, '默认盆型已按参照图改为台下盆');
  eq(out.front.svg.includes('分区：'), true);
});

test('标注：position=below 时排在图形下方，高度增加、宽度不变', () => {
  const off = drawAll(makeSpec({ annotations: { enabled: false } }));
  const below = drawAll(makeSpec({ annotations: { position: 'below' } }));
  const right = drawAll(makeSpec({ annotations: { position: 'right' } }));

  eq(below.front.box[3] > off.front.box[3], true, '下方标注应让视图变高');
  eq(below.front.box[2], off.front.box[2], '下方标注不应增加视图宽度');

  eq(right.front.box[2] > off.front.box[2], true, '右侧标注应让视图变宽');
});

test('标注：关掉标注后正视图不包含方案名', () => {
  const out = drawAll(makeSpec({ name: 'ZZZ测试名', annotations: { enabled: false } }));
  eq(out.front.svg.includes('ZZZ测试名'), false);
});

test('标注：位置在右侧时宽度大于关闭标注时', () => {
  const on = drawAll(makeSpec({ annotations: { enabled: true, position: 'right' } }));
  const off = drawAll(makeSpec({ annotations: { enabled: false } }));
  eq(on.front.box[2] > off.front.box[2], true, '右侧标注应增加视图宽度');
});