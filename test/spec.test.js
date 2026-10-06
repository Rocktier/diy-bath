import { test, eq } from './helpers.js';
import { makeSpec, DEFAULTS, SPECIAL_CASES, bandsFrom, resolveBands, clone } from '../src/spec.js';
import { layoutMatrix } from './layouts.js';

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

test('每种分格组合都能构造出 Spec，且 cols / rows / cells 自洽', () => {
  const all = layoutMatrix();
  eq(all.length >= 70, true, `分格矩阵应至少 70 种，实际 ` + all.length);
  for (const lay of all) {
    const s = makeSpec(lay.patch);
    const bands = resolveBands(s);
    eq(typeof s.cabinet.width, `number`, lay.label + ` 缺 cabinet.width`);
    eq(bands.length >= 1, true, lay.label + ` 没有分区`);
    for (const b of bands) {
      eq(b.cols.length >= 1, true, lay.label + ` cols 为空`);
      eq(b.rows.length >= 1, true, lay.label + ` rows 为空`);
      if (b.cells) {
        eq(
          b.cells.length,
          b.cols.length * b.rows.length,
          lay.label + ` 的 cells 长度 ` + b.cells.length
            + ` != ` + b.cols.length + `×` + b.rows.length,
        );
      }
    }
  }
});

test('特例柜型 id 与 name 都不重复', () => {
  eq(new Set(SPECIAL_CASES.map((s) => s.id)).size, SPECIAL_CASES.length, `存在重复 id`);
  eq(new Set(SPECIAL_CASES.map((s) => s.name)).size, SPECIAL_CASES.length, `存在重复 name`);
});

test(`bandsFrom：门数与抽屉数决定格子数`, () => {
  // 左右：门和抽屉并排成一排
  const lr = bandsFrom(2, 1, `lr`);
  eq(lr.length, 1, `左右分布应该只有一层`);
  eq(lr[0].cells.length, 3, `2 门 1 抽 = 3 格`);
  eq(lr[0].cells.filter((c) => c === `door`).length, 2, `应有 2 个门`);
  eq(lr[0].cells.filter((c) => c === `drawer`).length, 1, `应有 1 个抽屉`);

  // 上下：门在下，抽屉在上各一层
  const ud = bandsFrom(2, 1, `ud`);
  eq(ud.length, 2, `上下分布应该是两层`);
  eq(ud[0].kind, `door`, `门在下`);
  eq(ud[0].cols.length, 2, `2 扇门并排`);
  eq(ud[1].kind, `drawer`, `抽屉在上`);
  eq(ud[1].rows.length, 1, `1 个抽屉`);

  // 只有抽屉时，上下分布才是常规（三抽是叠的）
  const three = bandsFrom(0, 3, `ud`);
  eq(three.length, 1, `只有抽屉时上下分布只有一层`);
  eq(three[0].rows.length, 3, `三抽 = 3 行`);
  eq(three[0].rows[0] > three[0].rows[2], true, `抽屉应下大上小`);

  // 全 0 不该生成任何分区，也不该报错
  eq(bandsFrom(0, 0, `lr`).length, 0, `没有门也没有抽屉时应为空`);

  // 负数与小数要被夹住，不能生成负数个格子
  eq(bandsFrom(-3, 2, `lr`)[0].cells.length, 2, `负门数应按 0 处理`);
  eq(bandsFrom(2, 1.9, `lr`)[0].cells.length, 3, `小数抽屉数应向下取整`);
});

test(`makeSpec 显式传 bands 时自动切到自定义`, () => {
  const s = makeSpec({ bands: [{ kind: `door`, cols: [1], rows: [1] }] });
  eq(s.cabinet.special, `custom`, `显式 bands 应被当成自定义，否则会被 doors/drawers 覆盖掉`);
  eq(resolveBands(s).length, 1, `应原样使用传入的 bands`);
});
test('clone 是深拷贝', () => {
  const a = makeSpec();
  const b = clone(a);
  b.cabinet.toe.height = 1;
  eq(a.cabinet.toe.height, 90);
});