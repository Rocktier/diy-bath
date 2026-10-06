export const DEFAULTS = {
  name: '双盆对开柜',

  cabinet: {
    width: 1180,
    height: 680,
    depth: 500,
    mount: 'floor',
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
  return deepMerge(DEFAULTS, over);
}

export const PRESETS = [
  /* ================================================================
     预设 = 柜子的「种类」，不是某个具体产品。

     导购员的流程是：先看客户要哪种柜子 → 点一个预设定下框架 →
     再用下面的输入框把宽高深、盆、分格细调成客户要的尺寸。
     所以这里的宽高深只是**常见起手值**，不是标准答案，
     每一项都能单独改。

     种类清单是调研这几个品牌的在售产品归纳出来的（2026-10）：
       · 恒洁官网产品筛选器的「开门方式」分类：
         单开门 / 单抽 / 双开门 / 双抽 / 三开门 / 左单开门
       · 恒洁觅光 BC6551J：双抽结构——上层浅抽不用弯腰，
         下层取消 U 型槽，内部容积大 30%
       · 箭牌官网主柜描述：双开门（大小门）、单抽单门
       · 九牧小牧优品产品命名：双开门 / 大抽收纳 / 大单抽 / 大抽镜灯
       · 九牧 JAG420 白羽：拱形玻璃柜门
     宽度默认取各品牌主力档：600-700 / 800 / 900 / 1000-1200。
     ================================================================ */

  /* ---------------- 门类（单盆） ---------------- */
  {
    id: 'single-door',
    name: '单开门柜',
    hint: '恒洁「单开门」。一整扇门，标称 700。小户型、窄墙最常配这种',
    spec: {
      cabinet: { width: 680, height: 480, depth: 470 },
      basin: { type: 'undermount', count: 1, width: 420, depth: 330, height: 160, depthBias: 0.8 },
      mirror: { height: 650, depth: 130 },
      bands: [{ kind: 'door', cols: [1], rows: [1], handle: 'bar-v' }],
    },
  },
  {
    id: 'double-door',
    name: '双开门柜',
    hint: '最常见的款式。标称 800，对开门两扇等宽',
    spec: {
      cabinet: { width: 780, height: 480, depth: 480 },
      basin: { type: 'undermount', count: 1, width: 500, depth: 340, height: 160, depthBias: 0.8 },
      mirror: { height: 650, depth: 140 },
      bands: [{ kind: 'door', cols: [1, 1], rows: [1], handle: 'bar-v' }],
    },
  },
  {
    id: 'uneven-door',
    name: '大小门柜',
    hint: '箭牌「双开门（大小门）」。两扇门宽度不等——一边窄门、一边宽门，'
      + '窄的通常放 cleans 用品、宽的放主收纳。标称 800',
    spec: {
      cabinet: { width: 780, height: 480, depth: 480 },
      basin: { type: 'undermount', count: 1, width: 500, depth: 340, height: 160, depthBias: 0.8 },
      mirror: { height: 650, depth: 140 },
      bands: [{ kind: 'door', cols: [1, 1.7], rows: [1], handle: 'bar-v' }],
    },
  },
  {
    id: 'triple-door',
    name: '三开门柜',
    hint: '恒洁「三开门」。三扇等宽门，标称 1000',
    spec: {
      cabinet: { width: 980, height: 480, depth: 480 },
      basin: { type: 'undermount', count: 1, width: 560, depth: 340, height: 160, depthBias: 0.8 },
      mirror: { height: 650, depth: 140 },
      bands: [{ kind: 'door', cols: [1, 1, 1], rows: [1], handle: 'bar-v' }],
    },
  },
  {
    id: 'left-single-door',
    name: '左单开门柜',
    hint: '恒洁「左单开门」。左侧一扇窄门 + 右侧两扇门共三扇，'
      + '左边那扇窄的常放清洁用品。标称 900',
    spec: {
      cabinet: { width: 880, height: 480, depth: 490 },
      basin: { type: 'undermount', count: 1, width: 540, depth: 350, height: 160, depthBias: 0.8 },
      mirror: { height: 650, depth: 140 },
      bands: [{ kind: 'door', cols: [1, 1.4, 1.4], rows: [1], handle: 'bar-v' }],
    },
  },

  /* ---------------- 抽类（单盆） ---------------- */
  {
    id: 'one-drawer',
    name: '单抽柜',
    hint: '恒洁「单抽」。一整只大抽，标称 800。东西少、想看着干净就选它',
    spec: {
      cabinet: { width: 780, height: 420, depth: 480 },
      basin: { type: 'undermount', count: 1, width: 500, depth: 340, height: 160, depthBias: 0.8 },
      mirror: { height: 650, depth: 140 },
      bands: [{ kind: 'drawer', cols: [1], rows: [1], handle: 'bar-h' }],
    },
  },
  {
    id: 'two-drawer',
    name: '双抽柜',
    hint: '恒洁觅光的做法：上层浅抽（天天用的不弯腰就够到）、'
      + '下层深抽（放换洗的囤货）。标称 900',
    spec: {
      cabinet: { width: 880, height: 480, depth: 480 },
      basin: { type: 'undermount', count: 1, width: 540, depth: 340, height: 160, depthBias: 0.8 },
      mirror: { height: 650, depth: 140 },
      bands: [{ kind: 'drawer', cols: [1], rows: [2, 1], handle: 'bar-h' }],
    },
  },
  {
    id: 'three-drawer',
    name: '三抽柜',
    hint: '三抽递减，上小下大。标称 900',
    spec: {
      cabinet: { width: 880, height: 480, depth: 480 },
      basin: { type: 'undermount', count: 1, width: 540, depth: 340, height: 160, depthBias: 0.8 },
      mirror: { height: 650, depth: 140 },
      bands: [{ kind: 'drawer', cols: [1], rows: [2, 1.5, 1], handle: 'bar-h' }],
    },
  },
  {
    id: 'four-drawer',
    name: '四抽柜',
    hint: '四抽等高。标称 800，柜体不高所以适合矮台面',
    spec: {
      cabinet: { width: 780, height: 480, depth: 470 },
      basin: { type: 'undermount', count: 1, width: 500, depth: 330, height: 160, depthBias: 0.8 },
      mirror: { height: 650, depth: 130 },
      bands: [{ kind: 'drawer', cols: [1], rows: [1, 1, 1, 1], handle: 'bar-h' }],
    },
  },
  {
    id: 'six-drawer',
    name: '六抽柜（双列）',
    hint: '左右两列各三抽。标称 1200，收纳量最大的一种',
    spec: {
      cabinet: { width: 1180, height: 480, depth: 500 },
      basin: { type: 'undermount', count: 1, width: 600, depth: 360, height: 160, depthBias: 0.8 },
      mirror: { height: 700, depth: 140 },
      bands: [{ kind: 'drawer', cols: [1, 1], rows: [1, 1, 1], handle: 'bar-h' }],
    },
  },

  /* ---------------- 门抽混合 ---------------- */
  {
    id: 'one-drawer-one-door',
    name: '单抽 + 单门',
    hint: '箭牌「单抽单门」。上面一抽、下面一门。标称 800',
    spec: {
      cabinet: { width: 780, height: 480, depth: 480 },
      basin: { type: 'undermount', count: 1, width: 500, depth: 340, height: 160, depthBias: 0.8 },
      mirror: { height: 650, depth: 140 },
      bands: [
        { kind: 'door', cols: [1], rows: [1], handle: 'bar-v' },
        { kind: 'drawer', cols: [1], rows: [1], handle: 'bar-h' },
      ],
    },
  },
  {
    id: 'two-drawers-one-door',
    name: '双抽 + 单门',
    hint: '一门两抽。标称 1000，门在下、两个抽屉在上',
    spec: {
      cabinet: { width: 980, height: 480, depth: 490 },
      basin: { type: 'undermount', count: 1, width: 560, depth: 350, height: 160, depthBias: 0.8 },
      mirror: { height: 700, depth: 140 },
      bands: [
        { kind: 'door', cols: [1], rows: [1], handle: 'bar-v' },
        { kind: 'drawer', cols: [1], rows: [2, 1], handle: 'bar-h' },
      ],
    },
  },
  {
    id: 'two-big-drawers-one-door',
    name: '两个大抽 + 一个小门',
    hint: '上面两个大抽并排、下面一个小门通长。'
      + '大抽放换洗囤货，小门放清洁用品。标称 1000',
    spec: {
      cabinet: { width: 980, height: 500, depth: 490 },
      basin: { type: 'undermount', count: 1, width: 560, depth: 350, height: 160, depthBias: 0.8 },
      mirror: { height: 700, depth: 140 },
      bands: [
        { kind: 'door', cols: [1], rows: [1], handle: 'bar-v' },
        { kind: 'drawer', cols: [1, 1], rows: [1], handle: 'bar-h' },
      ],
    },
  },
  {
    id: 'long-drawer-doors',
    name: '上通长抽 + 对开门',
    hint: '一整条通长抽屉在最上面，下面两扇门。标称 900',
    spec: {
      cabinet: { width: 880, height: 480, depth: 490 },
      basin: { type: 'undermount', count: 1, width: 540, depth: 350, height: 160, depthBias: 0.8 },
      mirror: { height: 700, depth: 140 },
      bands: [
        { kind: 'door', cols: [1, 1], rows: [1], handle: 'bar-v' },
        { kind: 'drawer', cols: [1], rows: [1], handle: 'bar-h' },
      ],
    },
  },
  {
    id: 'middle-drawer',
    name: '中抽大柜',
    hint: '上带三格「宽门 + 窄中抽 + 宽门」，下带三格双抽。标称 1500，双盆。'
      + '列宽比 [3,1,3] 就是「两侧宽中间窄」',
    spec: {
      cabinet: { width: 1480, height: 680, depth: 500 },
      basin: { count: 2, width: 460, depth: 360, height: 120, gap: 240 },
      bands: [
        { kind: 'door', cols: [3, 1, 3], rows: [1], cells: ['door', 'drawer', 'door'], handle: 'bar-v' },
        { kind: 'drawer', cols: [1, 1, 1], rows: [2, 1], handle: 'bar-h' },
      ],
    },
  },

  /* ---------------- 双盆 / 组合 ---------------- */
  {
    id: 'twin-basin-4door',
    name: '双盆对开柜',
    hint: '两个盆、四扇门对开。标称 1400，家里两个人同时洗漱。'
      + '上带两个盆胆（不画面板）、下带两扇门',
    spec: {
      cabinet: { width: 1380, height: 500, depth: 500 },
      basin: { count: 2, width: 480, depth: 360, height: 150, gap: 260 },
      mirror: { height: 700, depth: 140 },
      bands: [
        { kind: 'door', cols: [1, 1], rows: [1], cells: ['basin', 'basin'], handle: 'bar-v' },
        { kind: 'door', cols: [1, 1], rows: [1], handle: 'bar-v' },
      ],
    },
  },
  {
    id: 'basin-unit',
    name: '盆胆 + 双开门',
    hint: '行业写法「主柜：左盆胆 + 右盆胆 + 中间门」。'
      + '盆胆那格不画面板（那里是盆）。标称 1200，悬空岩板一体盆',
    spec: {
      cabinet: { width: 1180, height: 620, depth: 530, mount: 'wall', wallGap: 200 },
      basin: { type: 'integral', count: 2, width: 470, depth: 400, height: 130, gap: 200 },
      bands: [
        { kind: 'door', cols: [1, 1, 1], rows: [1], cells: ['basin', 'door', 'basin'], handle: 'bar-v' },
      ],
    },
  },
  {
    id: 'open-shelf-side',
    name: '侧柜组合',
    hint: '标称 1200，左开放格 + 右三抽。列宽比 [2,4]：左边开放格占 2 份、'
      + '右边三抽占 4 份',
    spec: {
      cabinet: { width: 1180, height: 680, depth: 500 },
      basin: { count: 1, width: 500, depth: 380, height: 120 },
      bands: [
        {
          kind: 'drawer', cols: [2, 4], rows: [1, 1, 1], handle: 'bar-h',
          cells: ['open', 'drawer', 'drawer', 'drawer', 'drawer', 'drawer'],
        },
      ],
    },
  },
];