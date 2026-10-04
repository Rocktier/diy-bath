import { test, eq } from './helpers.js';
import { makeSpec, DEFAULTS, PRESETS, clone } from '../src/spec.js';

test('makeSpec 返回完整 Spec，含所有顶层字段', () => {
  const s = makeSpec();
  for (const k of Object.keys(DEFAULTS)) eq(k in s, true, `缺少字段 ${k}`);
});

test('makeSpec 深合并，局部覆盖不影响其他字段', () => {
  const s = makeSpec({ cabinet: { width: 900 } });
  eq(s.cabinet.width, 900);
  eq(s.cabinet.height, DEFAULTS.cabinet.height, '未指定的字段应保留默认值');
  eq(s.cabinet.gap, 2);
});

test('makeSpec 对数组整体替换，不逐元素合并', () => {
  const s = makeSpec({ bands: [{ kind: 'open', cols: [1], rows: [1] }] });
  eq(s.bands.length, 1, 'bands 应被整体替换');
  eq(s.bands[0].kind, 'open');
});

test('makeSpec 不修改 DEFAULTS', () => {
  const before = JSON.stringify(DEFAULTS);
  makeSpec({ cabinet: { width: 1 }, bands: [] });
  eq(JSON.stringify(DEFAULTS), before, 'DEFAULTS 被污染了');
});

test('makeSpec 深拷贝，外部改动不污染 DEFAULTS', () => {
  const a = makeSpec();
  a.cabinet.width = 1;
  a.bands.push({ kind: 'door', cols: [1], rows: [1] });
  const b = makeSpec();
  eq(b.cabinet.width, DEFAULTS.cabinet.width);
  eq(b.bands.length, DEFAULTS.bands.length);
});

test('makeSpec 接受 null 覆盖（关掉镜柜）', () => {
  const s = makeSpec({ mirror: null });
  eq(s.mirror, null);
});

test('预设库每个预设都能构造出 Spec，且 cells 长度自洽', () => {
  eq(PRESETS.length >= 10, true, '预设应至少 10 个');
  for (const p of PRESETS) {
    const s = makeSpec(p.spec);
    eq(typeof s.cabinet.width, 'number', `${p.name} 缺 cabinet.width`);
    eq(s.bands.length >= 1, true, `${p.name} 没有分区`);
    for (const b of s.bands) {
      eq(b.cols.length >= 1, true, `${p.name} cols 为空`);
      eq(b.rows.length >= 1, true, `${p.name} rows 为空`);
      if (b.cells) {
        eq(
          b.cells.length,
          b.cols.length * b.rows.length,
          `${p.name} 的 cells 长度 ${b.cells.length} != ${b.cols.length}×${b.rows.length}`,
        );
      }
    }
  }
});

test('预设库 id 与 name 都不重复', () => {
  eq(new Set(PRESETS.map((p) => p.id)).size, PRESETS.length, '存在重复 id');
  eq(new Set(PRESETS.map((p) => p.name)).size, PRESETS.length, '存在重复 name');
});

test('预设库每个预设都带盆与镜柜起点值', () => {
  for (const p of PRESETS) {
    const s = makeSpec(p.spec);
    eq(typeof s.basin.width, 'number', `${p.name} 缺盆宽`);
    eq(s.basin.type, s.basin.type, `${p.name} 盆型缺失`);
    if (p.id !== 'basin-unit') {
      eq(s.mirror !== null, true, `${p.name} 缺镜柜`);
    }
  }
});

test('clone 是深拷贝', () => {
  const a = makeSpec();
  const b = clone(a);
  b.cabinet.toe.height = 1;
  eq(a.cabinet.toe.height, 90);
});