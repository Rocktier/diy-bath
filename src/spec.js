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
    type: 'vessel',
    count: 1,
    width: 500,
    depth: 380,
    height: 120,
    position: null,
    depthBias: 0.5,
    gap: 150,
    shape: 'rect',
    radius: 40,
    wall: 20,
    wallBottom: 25,
  },

  faucet: { height: 150, reach: 110, enabled: true },

  mirror: { width: null, height: 780, depth: 150, gap: 30, led: false },

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
  {
    id: 'double-door',
    name: '双开门柜',
    hint: '标称 800',
    spec: {
      cabinet: { width: 780, height: 480, depth: 480 },
      basin: { count: 1, width: 500, depth: 340, height: 150 },
      mirror: { height: 650, depth: 140 },
      bands: [{ kind: 'door', cols: [1, 1], rows: [1], handle: 'bar-v' }],
    },
  },
  {
    id: 'triple-door',
    name: '三开门柜',
    hint: '标称 1000',
    spec: {
      cabinet: { width: 980, height: 480, depth: 480 },
      basin: { count: 1, width: 560, depth: 340, height: 150 },
      mirror: { height: 650, depth: 140 },
      bands: [{ kind: 'door', cols: [1, 1, 1], rows: [1], handle: 'bar-v' }],
    },
  },
  {
    id: 'two-drawer',
    name: '双抽柜',
    hint: '标称 900',
    spec: {
      cabinet: { width: 880, height: 480, depth: 480 },
      basin: { count: 1, width: 540, depth: 340, height: 150 },
      mirror: { height: 650, depth: 140 },
      bands: [{ kind: 'drawer', cols: [1], rows: [2, 1], handle: 'bar-h' }],
    },
  },
  {
    id: 'three-drawer',
    name: '三抽柜',
    hint: '标称 900',
    spec: {
      cabinet: { width: 880, height: 480, depth: 480 },
      basin: { count: 1, width: 540, depth: 340, height: 150 },
      mirror: { height: 650, depth: 140 },
      bands: [{ kind: 'drawer', cols: [1], rows: [2, 1.5, 1], handle: 'bar-h' }],
    },
  },
  {
    id: 'six-drawer',
    name: '六抽柜（双列）',
    hint: '标称 1200',
    spec: {
      cabinet: { width: 1180, height: 680, depth: 500 },
      basin: { count: 1, width: 500, depth: 380, height: 120 },
      bands: [{ kind: 'drawer', cols: [1, 1], rows: [2, 1, 1], handle: 'bar-h' }],
    },
  },
  {
    id: 'drawer-plus-door',
    name: '双抽+单门',
    hint: '标称 1000',
    spec: {
      cabinet: { width: 980, height: 680, depth: 500 },
      basin: { count: 1, width: 540, depth: 380, height: 120 },
      bands: [
        { kind: 'drawer', cols: [1, 1], rows: [1], handle: 'bar-h' },
        { kind: 'door', cols: [1], rows: [1], handle: 'bar-v' },
      ],
    },
  },
  {
    id: 'drawer-over-doors',
    name: '上通长抽 + 对开门',
    hint: '标称 1200，品牌最常见',
    spec: {
      cabinet: { width: 1180, height: 680, depth: 500 },
      basin: { count: 2, width: 460, depth: 360, height: 120, gap: 200 },
      bands: [
        { kind: 'door', cols: [1, 1], rows: [1], handle: 'bar-v' },
        { kind: 'drawer', cols: [1], rows: [1], handle: 'bar-h' },
      ],
    },
  },
  {
    id: 'basin-unit',
    name: '盆胆 + 双开门',
    hint: '标称 1200，悬空岩板一体盆',
    spec: {
      cabinet: { width: 1180, height: 620, depth: 530, mount: 'wall', wallGap: 200 },
      basin: { type: 'integral', count: 2, width: 470, depth: 400, height: 130, gap: 200 },
      bands: [
        { kind: 'door', cols: [1, 1, 1], rows: [1], cells: ['basin', 'door', 'basin'], handle: 'bar-v' },
      ],
    },
  },
  {
    id: 'middle-drawer',
    name: '中抽大柜',
    hint: '标称 1500',
    spec: {
      cabinet: { width: 1480, height: 680, depth: 500 },
      basin: { count: 2, width: 460, depth: 360, height: 120, gap: 240 },
      bands: [
        { kind: 'door', cols: [3, 1, 3], rows: [1], cells: ['door', 'drawer', 'door'], handle: 'bar-v' },
        { kind: 'drawer', cols: [1, 1, 1], rows: [2, 1], handle: 'bar-h' },
      ],
    },
  },
  {
    id: 'open-shelf-side',
    name: '侧柜组合',
    hint: '标称 1200，左开放格 + 右三抽',
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

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) || null;
}