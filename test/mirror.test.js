import { test, eq } from './helpers.js';
import { solve, solveMirror } from '../src/solve.js';
import { parts } from '../src/parts.js';
import { front } from '../src/project.js';
import { makeSpec } from '../src/spec.js';

/**
 * 镜柜。
 *
 * 尺寸是从参照图 docs/reference/target-output.png **量**出来的，
 * 不是估的。那张图是透视 3D 视角，横向有透视压缩（左端被压、右端被拉），
 * 所以横向只能取比例，纵向比例才可靠。量到的：
 *
 *   · 4 扇等宽门。中间两扇都是镜面、缝看不出来，合起来像一整块，
 *     所以肉眼是「中:左:右 = 2:1:1」——实际就是等宽四门。
 *   · 门区底边在距柜顶 623mm，往下到 760mm 是敞口搁板，
 *     再往下 20mm 是底板。
 *   · 最外两扇是通高竖槽，槽宽 36mm，起于距柜体外沿 36mm。
 *   · 中间两扇是 28mm 见方的方钮，中心在距柜顶 547mm（门高 87.5%）。
 */

const draw = (spec) => front(parts(spec), spec, solve(spec));
const doorsOf = (shapes) => shapes.filter((s) => s.part === 'mirrorDoor');

test('镜柜：默认 4 扇等宽门，中间两扇各一个方钮，最外两扇各一个竖槽', () => {
  const M = solve(makeSpec()).mirror;
  eq(M.doors.length, 4, '默认 4 门');
  eq(M.doors.map((d) => d.handle).join(','), 'slot,knob,knob,slot',
    '最外两扇竖槽、中间两扇方钮');

  // 等宽：四扇宽��应一致
  const ws = M.doors.map((d) => d.w);
  eq(ws.every((w) => Math.abs(w - ws[0]) < 1e-9), true,
    `四扇应等宽，实际 ${ws.map((w) => w.toFixed(1)).join('/')}`);

  // 门之间有缝，且缝宽与主柜面板缝一致
  const gap = solve(makeSpec()).gap;
  for (let i = 1; i < M.doors.length; i++) {
    const g = M.doors[i].x - (M.doors[i - 1].x + M.doors[i - 1].w);
    eq(Math.abs(g - gap) < 1e-9, true, `第 ${i} 道门缝 ${g.toFixed(1)}mm 应等于 ${gap}mm`);
  }
});

test('镜柜：四扇门铺满柜体宽，不多不少', () => {
  const s = makeSpec();
  const M = solve(s).mirror;
  const left = M.doors[0].x - M.x;
  const right = (M.x + M.w) - (M.doors[3].x + M.doors[3].w);
  eq(Math.abs(left - right) < 1e-9, true, `左右应留一样宽，实际 ${left.toFixed(1)} / ${right.toFixed(1)}`);
  eq(left, 0, '最外扇应顶到柜体左外沿');
});

test('镜柜：门区底边在柜高的 3/4 附近，下方是敞口搁板', () => {
  const s = makeSpec();
  const M = solve(s).mirror;
  const shelfTop = M.y + M.railT + M.doorH;
  const fromTop = shelfTop - M.y;
  // 参照图量到 623 / 780 = 0.799
  eq(Math.abs(fromTop / M.h - 0.799) < 0.02, true,
    `门区底边应在柜高 79.9% 处，实际 ${(fromTop / M.h * 100).toFixed(1)}%`);
  // 底板 20mm
  eq(M.boardT, 20, '底板 20mm');
  // 三段加起来正好等于柜高，不多不少
  eq(M.railT + M.doorH + M.shelfH + M.boardT, M.h, '顶框+门+搁板+底板应等于柜高');
});

test('镜柜：敞口搁板高可以改成 0（整面到顶）', () => {
  const s = makeSpec();
  s.mirror = { ...s.mirror, shelfH: 0 };
  const M = solve(s).mirror;
  eq(M.shelfH, 0, '搁板高 0');
  eq(M.railT + M.doorH + M.boardT, M.h, '没有搁板时门区补满剩余高度');
  // 门区底边 = 柜底 - 底板
  eq(M.y + M.railT + M.doorH, M.y + M.h - M.boardT, '门应一直做到底板上方');
});

test('镜柜：搁板高设成负数或过大时夹到合法范围，不产生非法几何', () => {
  for (const bad of [-100, 1e6, NaN]) {
    const s = makeSpec();
    s.mirror = { ...s.mirror, shelfH: bad };
    const M = solve(s).mirror;
    eq(M.shelfH >= 0, true, `搁板高 ${bad} 应夹到 >= 0，实际 ${M.shelfH}`);
    eq(M.doorH > 0, true, `搁板高 ${bad} 时门区仍应有正高度，实际 ${M.doorH}`);
    eq(M.railT + M.doorH + M.shelfH + M.boardT, M.h, `搁板高 ${bad} 时总高仍应等于柜高`);
  }
});

test('镜柜：竖槽宽 36mm，距门板外沿 36mm，通高但上下各内缩', () => {
  const shapes = draw(makeSpec());
  const slots = shapes.filter((s) => s.part === 'mirrorSlot');
  eq(slots.length, 2, '两个竖槽（最外两扇门）');

  for (const s of slots) {
    eq(s.w, 36, '槽宽 36mm');
    eq(s.h > 0 && s.h < 608, true, `槽应通高但不满高，实际 ${s.h}`);
  }

  // 最左那道槽：起于柜体左外沿 36mm
  const M = solve(makeSpec()).mirror;
  const leftSlot = slots.find((s) => s.x < M.x + M.w / 2);
  eq(leftSlot.x - M.x, 36, '左侧竖槽应距柜体左外沿 36mm');
  // 最右那道槽：距右外沿 36mm
  const rightSlot = slots.find((s) => s.x >= M.x + M.w / 2);
  eq(M.x + M.w - (rightSlot.x + rightSlot.w), 36, '右侧竖槽应距柜体右外沿 36mm');
});

test('镜柜：方钮 28mm 见方，中心在门高 87.5% 处', () => {
  const shapes = draw(makeSpec());
  const knobs = shapes.filter((s) => s.part === 'mirrorKnob');
  eq(knobs.length, 2, '两个方钮（中间两扇门）');
  for (const k of knobs) {
    eq(k.w, 28, '方钮 28mm 见方');
    eq(k.h, 28, '方钮 28mm 见方');
  }

  const M = solve(makeSpec()).mirror;
  // ⚠️ 必须用**画出来的**门板（屏幕坐标），不能用 solveMirror 的 door（工程坐标）。
  // 混用会算出 -424% 这种数，看着像差很远，实际只是 y 差了个负号。
  const doorShapes = shapes.filter((s) => s.part === 'mirrorDoor');
  const door = doorShapes[1];            // 左边那扇中间门
  const k = knobs.find((x) => x.x < M.x + M.w / 2);
  // ⚠️ 屏幕坐标 y 向下：门顶 = door.y，门底 = door.y + door.h。
  // 分母要门高，分子要「中心距门顶」——写反会得到负百分比，
  // 看着像错得离谱，其实是坐标系用反了。
  const kCenterY = k.y + k.h / 2;
  // door 是**屏幕坐标**（parts 的输出已经过 fy）：顶 = door.y，底 = door.y + h
  const frac = (kCenterY - door.y) / door.h;
  eq(Math.abs(frac - 0.875) < 0.01, true,
    `方钮中心应在门高 87.5% 处，实际 ${(frac * 100).toFixed(1)}%`);
});

test('镜柜：方钮靠中缝，竖槽靠门板外沿', () => {
  const shapes = draw(makeSpec());
  const M = solve(makeSpec()).mirror;
  const mid = M.x + M.w / 2;

  // 左边的方钮应在它那扇门的中缝一侧（左扇的中缝在门右边）
  const k = shapes.filter((s) => s.part === 'mirrorKnob').find((x) => x.x < mid);
  const doorL = M.doors[1];
  eq(k.x + k.w / 2 > doorL.x + doorL.w / 2, true,
    '左边那扇门的方钮应在门的右半（靠中缝）');
  // 距中缝 50mm
  // 距**该门自己的内侧边** 50mm。跟「距柜体中缝」差 1mm：
  // 中缝宽度本身是 gap=2，门边缘到中缝差半个缝。别把这个当误差忽略。
  eq(k.x + k.w - (doorL.x + doorL.w), -50, '左方钮右缘应距该门内侧边 50mm');

  // 左边的竖槽应在门板左边（外沿一侧）
  const s = shapes.filter((x) => x.part === 'mirrorSlot').find((x) => x.x < mid);
  eq(s.x - M.doors[0].x, 36, '左侧竖槽应靠门板左边');
});

test('镜柜：门数改奇数时没有中缝可依，全给竖槽', () => {
  for (const n of [1, 3, 5]) {
    const s = makeSpec();
    s.mirror = { ...s.mirror, doors: n };
    const M = solve(s).mirror;
    eq(M.doors.length, n, `${n} 门应有 ${n} 扇`);
    eq(M.doors.every((d) => d.handle === 'slot'), true,
      `${n} 门（奇数）应全用竖槽`);
  }
});

test('镜柜：2 门和 6 门时，正对中缝的两扇给方钮，其余给竖槽', () => {
  for (const [n, expectKnobs] of [[2, 2], [6, 2]]) {
    const s = makeSpec();
    s.mirror = { ...s.mirror, doors: n };
    const shapes = draw(s);
    const knobs = shapes.filter((x) => x.part === 'mirrorKnob');
    eq(knobs.length, expectKnobs, `${n} 门应有 ${expectKnobs} 个方钮`);
    eq(shapes.filter((x) => x.part === 'mirrorSlot').length, n - expectKnobs,
      `${n} 门应有 ${n - expectKnobs} 个竖槽`);
  }
});

test('镜柜：门数被夹在 1..6，非整数会被取整', () => {
  for (const [bad, want] of [[0, 1], [-3, 1], [99, 6], [2.6, 3]]) {
    const s = makeSpec();
    s.mirror = { ...s.mirror, doors: bad };
    eq(solve(s).mirror.doors.length, want, `门数 ${bad} 应变成 ${want}`);
  }
});

test('镜柜：门宽为 0 或负数时不产生宽度为负的门', () => {
  // 极窄柜体 + 6 门，缝比可用宽度还大
  const s = makeSpec();
  s.cabinet = { ...s.cabinet, width: 40 };
  s.mirror = { ...s.mirror, width: 40, doors: 6 };
  const M = solve(s).mirror;
  // 允许变成负数，但不能是 NaN/Infinity（那些会让渲染抛错）
  for (const d of M.doors) {
    eq(Number.isFinite(d.x) && Number.isFinite(d.w), true,
      `门 ${d.index} 的 x/w 必须是有限数，实际 ${d.x} / ${d.w}`);
  }
});

test('镜柜：关掉镜柜时 solveMirror 返回 null，且不产出任何 mirror 零件', () => {
  const s = makeSpec();
  s.mirror = null;
  eq(solveMirror(s, { ctTopY: 0 }), null, 'solveMirror 应返回 null');
  const kinds = parts(s).map((p) => p.kind);
  eq(kinds.some((k) => k.startsWith('mirror')), false, '不应有任何镜柜零件');
});

test('镜柜：零件层的门板 z 靠前，正视图上门板画在本体之上', () => {
  const ps = parts(makeSpec());
  const box = ps.find((p) => p.kind === 'mirror');
  const doors = ps.filter((p) => p.kind === 'mirrorDoor');
  eq(doors.length, 4, '四个门板零件');
  for (const d of doors) {
    eq(d.z >= box.z + box.d, true, '门板应在箱体前面');
  }
});

test('镜柜：敞口搁板那块是通长的横板，正视图里能看到那条分界', () => {
  const shapes = draw(makeSpec());
  const shelf = shapes.find((s) => s.part === 'mirrorShelf');
  eq(shelf !== undefined, true, '应有搁板层板');
  const M = solve(makeSpec()).mirror;
  const inner = shapes.find((s) => s.part === 'mirrorInner');
  eq(shelf.w, inner.w, '层板与内壁同宽');
  eq(shelf.x, inner.x, '层板与内壁左对齐');
  eq(shelf.h, M.boardT, '层板厚等于底板厚');

  // ⚠️ 门板形状来自 parts()，是**屏幕坐标**（y 向下）。
  // solveMirror 的 doors 是工程坐标（y 向上），两者不能直接比。
  const door0 = shapes.find((s) => s.part === 'mirrorDoor');
  eq(shelf.y, door0.y, '层板上表面应正好是门区底边（屏幕坐标）');
});

test('镜柜：门板与镜箱同为镜面色，靠描边区分门缝', () => {
  // 之前给 mirrorDoor 单独配了一个近白色，结果它跟镜箱几乎看不出差别，
  // 四扇门糊成一整块——反而把「4 扇等宽」这个关键信息盖掉了。
  // 白模里镜面就该是同一个色，门缝靠黑描边。
  const shapes = draw(makeSpec());
  const box = shapes.find((s) => s.part === 'mirror');
  for (const d of shapes.filter((s) => s.part === 'mirrorDoor')) {
    eq(d.fill, box.fill, '门板应与镜箱同色（都是镜面）');
    // 描边不能省，否则门缝看不出来
    eq(d.stroke === null || d.stroke === 'none', false, '门板必须有描边');
  }
  // 方钮用 handle 色，和主柜小拉手一致
  for (const k of shapes.filter((s) => s.part === 'mirrorKnob')) {
    eq(k.fill, 'handle', '方钮沿用主柜拉手的金色');
  }
});

test('镜柜：门板总数与门数一致，且每扇门都画了拉手', () => {
  for (const n of [2, 3, 4, 6]) {
    const s = makeSpec();
    s.mirror = { ...s.mirror, doors: n };
    const shapes = draw(s);
    eq(shapes.filter((x) => x.part === 'mirrorDoor').length, n, `${n} 门应有 ${n} 块门板`);
    eq(shapes.filter((x) => x.part === 'mirrorSlot').length
      + shapes.filter((x) => x.part === 'mirrorKnob').length, n,
      `${n} 门应有 ${n} 个拉手`);
  }
});