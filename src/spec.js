export const DEFAULTS = {
  name: '双盆对开柜',

  cabinet: {
    width: 1180,
    height: 680,
    depth: 500,
    mount: 'floor',
    /* 分格：门 N 个 + 抽屉 M 个，按 layout 排列。
       special 不是 'none' 时这三个字段不起作用，见 SPECIAL_CASES。 */
    doors: 2,
    drawers: 0,
    layout: 'lr',
    special: 'none',
    toe: { height: 90, inset: 60 },
    wallGap: 150,
    sidePanel: 18,
    backPanel: 9,
    bottomPanel: 18,
    boardMaterial: '多层实木',
    gap: 2,
  },

  top: {
    thickness: 20,
    overhang: 10,
    backsplash: { height: 90, thickness: 18 },
    material: '岩板',
  },

  basin: {
    type: 'undermount',
    count: 1,
    width: 500,
    depth: 380,
    height: 160,
    position: null,
    depthBias: 0.8,
    gap: 150,
    shape: 'rect',
    radius: 40,
    wall: 20,
    wallBottom: 25,
  },

  faucet: { height: 150, reach: 110, enabled: true },

  mirror: { width: null, height: 780, depth: 150, gap: 350, led: false },

  bands: [
    { kind: 'door', cols: [1, 1], rows: [1], cells: null, handle: 'bar-v', plinth: false },
    { kind: 'drawer', cols: [1], rows: [1], cells: null, handle: 'bar-h', plinth: false },
  ],

  annotations: { enabled: true, position: 'right', fontSize: 22, lineHeight: 34 },

  view: { front: true, dims: false },
};

export function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function deepMerge(base, over) {
  if (over === undefined) return clone(base);
  if (Array.isArray(base) || !isPlainObject(base)) return over;
  if (!isPlainObject(over)) return over;
  const out = {};
  for (const k of Object.keys(base)) out[k] = deepMerge(base[k], over[k]);
  for (const k of Object.keys(over)) if (!(k in out)) out[k] = clone(over[k]);
  return out;
}

export function makeSpec(over = {}) {
  const s = deepMerge(DEFAULTS, over);
  // 显式传了 bands 就当成「自定义分格」——否则 doors/drawers/layout
  // 会把它覆盖掉，调用方明明给了分格却静默失效，这种错最难查。
  if (Array.isArray(over?.bands)) s.cabinet.special = 'custom';
  return s;
}

/* ---------------------------------------------------------------- 分格
 * 主柜无非是「门」和「抽屉」的组合，所以不列几十个预设，
 * 而是让用户填两个数字 + 选一种排列方式。
 * 18 个预设列不完（门数 × 抽屉数 × 排列），而且用户真正要说的
 * 就是「两个抽屉一个门，左右排」这句话本身。
 */

/**
 * 常用分格快捷方式。
 *
 * 不是「预设」——预设会把宽高深、盆、镜柜一起改掉，那样用户改完尺寸
 * 就不知道哪些是自己调的。这些**只写门数、抽屉数、排列**（个别还要改宽度，
 * 因为双盆柜塞进 780 是不合理的），其余一律不动。
 *
 * 点一下等于手动填那三个框，然后想调哪儿调哪儿。
 */
export const LAYOUT_SHORTCUTS = [
  { id: 's-door1', name: '单开门', patch: { cabinet: { doors: 1, drawers: 0, layout: 'lr', width: 680 } } },
  { id: 's-door2', name: '双开门', patch: { cabinet: { doors: 2, drawers: 0, layout: 'lr', width: 780 } } },
  { id: 's-door3', name: '三开门', patch: { cabinet: { doors: 3, drawers: 0, layout: 'lr', width: 980 } } },
  { id: 's-dr1', name: '单抽', patch: { cabinet: { doors: 0, drawers: 1, layout: 'ud', width: 780 } } },
  { id: 's-dr2', name: '双抽', patch: { cabinet: { doors: 0, drawers: 2, layout: 'ud', width: 880 } } },
  { id: 's-dr3', name: '三抽', patch: { cabinet: { doors: 0, drawers: 3, layout: 'ud', width: 880 } } },
  { id: 's-1d2r', name: '一门两抽', patch: { cabinet: { doors: 1, drawers: 2, layout: 'ud', width: 880 } } },
  { id: 's-2d1r', name: '双门一抽', patch: { cabinet: { doors: 2, drawers: 1, layout: 'ud', width: 980 } } },
];

/**
 * 特例柜型：不是「门 + 抽屉」能描述的。
 * 涉及盆胆格、开放格、非等宽分格、双列——单靠两个数字表达不出来。
 */
export const SPECIAL_CASES = [
  { id: 'none', name: '按门 / 抽屉生成', bands: null },
  {
    id: 'basin-unit',
    name: '盆胆 + 双开门',
    bands: [
      { kind: 'door', cols: [1, 1, 1], rows: [1], cells: ['basin', 'door', 'basin'], handle: 'bar-v' },
    ],
  },
  {
    id: 'twin-basin',
    name: '双盆对开柜',
    bands: [
      { kind: 'door', cols: [1, 1], rows: [1], cells: ['basin', 'basin'], handle: 'bar-v' },
      { kind: 'door', cols: [1, 1], rows: [1], handle: 'bar-v' },
    ],
  },
  {
    id: 'middle-drawer',
    name: '中抽大柜',
    bands: [
      { kind: 'door', cols: [3, 1, 3], rows: [1], cells: ['door', 'drawer', 'door'], handle: 'bar-v' },
      { kind: 'drawer', cols: [1, 1, 1], rows: [2, 1], handle: 'bar-h' },
    ],
  },
  {
    id: 'open-shelf-side',
    name: '侧柜组合',
    bands: [
      {
        kind: 'drawer', cols: [2, 4], rows: [1, 1, 1], handle: 'bar-h',
        cells: ['open', 'drawer', 'drawer', 'drawer', 'drawer', 'drawer'],
      },
    ],
  },
  { id: 'custom', name: '自定义（在下方逐条编辑）', bands: null },
];

/**
 * 门 N 个、抽屉 M 个，按排列方式生成分格。
 *
 * 左右：门和抽屉并排成一排，N 扇门在左、M 个抽屉在右。
 * 上下：门在下（并排一层），抽屉在上（上下叠）。
 *
 * 只有门时两种排列等价（就是 N 扇对开）；
 * 只有抽屉时，「上下」才是常规做法（三抽、四抽都是叠的），
 * 「左右」会给出一排并排抽屉——不是常见做法，但用户明确选了。
 *
 * 抽屉高度从下到上递减：R, R-1, …, 1。
 * 4 个以上用缓和斜率，否则最下面那个会厚得离谱。
 * 想要别的比例，改完在下方「自定义分格」里调行高比。
 */
export function bandsFrom(doors, drawers, layout) {
  const D = Math.max(0, Math.floor(Number(doors) || 0));
  const R = Math.max(0, Math.floor(Number(drawers) || 0));
  if (!D && !R) return [];

  if (layout === 'lr') {
    const cells = [
      ...Array.from({ length: D }, () => 'door'),
      ...Array.from({ length: R }, () => 'drawer'),
    ];
    return [{
      kind: 'door',
      cols: cells.map(() => 1),
      rows: [1],
      cells,
      // 混合排布时一条带只有一个拉手样式，用门的竖拉手
      handle: 'bar-v',
    }];
  }

  const bands = [];
  if (D) {
    bands.push({
      kind: 'door',
      cols: Array.from({ length: D }, () => 1),
      rows: [1],
      handle: 'bar-v',
    });
  }
  if (R) {
    const step = R <= 3 ? 1 : 0.4;
    const rows = Array.from({ length: R }, (_, i) => +(1 + (R - 1 - i) * step).toFixed(2));
    bands.push({ kind: 'drawer', cols: [1], rows, handle: 'bar-h' });
  }
  return bands;
}

/** 按当前分格设置取实际生效的 bands */
export function resolveBands(spec) {
  if (spec.cabinet.special === 'custom') return spec.bands ?? [];
  const sp = SPECIAL_CASES.find((s) => s.id === spec.cabinet.special);
  if (sp && sp.bands) return sp.bands;
  return bandsFrom(spec.cabinet.doors, spec.cabinet.drawers, spec.cabinet.layout);
}
