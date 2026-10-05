import { makeSpec, clone, PRESETS } from './spec.js';
import { drawAll } from './render.js';
import Panzoom from 'panzoom';
import { get as idbGet, set as idbSet, clear as idbClear } from 'idb-keyval';

const $ = (s) => document.querySelector(s);

let spec = makeSpec();
let lastDraw = null;
let currentPreset = null;

// '3d' = 客户看的效果图（可旋转）；'ortho' = 给工厂看的三视图
let mode = '3d';
let threeView = null;
let threePending = false;

function threeContainer() {
  return document.querySelector('#stage3d');
}

function ensureThree() {
  if (threeView) return threeView;
  if (threePending) return null;
  const c = threeContainer();
  if (!c) return null;

  // Three.js 有 500KB，静态 import 会让首屏就背上这个体积。
  // 动态加载：只有真正进 3D 模式时才下载，三视图模式不受影响。
  threePending = true;
  hint3d(c);
  import('./three-view.js')
    .then(({ ThreeView }) => {
      threePending = false;
      threeView = new ThreeView(c);
      threeView.setSpec(spec);
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (w && h) threeView.resize(w, h);
      const hint = c.querySelector('.hint3d');
      if (hint) hint.textContent = '左键拖动旋转 · 滚轮缩放 · 右键平移';
    })
    .catch((e) => {
      threePending = false;
      console.error('3D 模块加载失败，回退到三视图：', e);
      setMode('ortho');
    });

  return null;
}

function hint3d(c) {
  if (c.querySelector('.hint3d')) return;
  const hint = document.createElement('div');
  hint.className = 'hint3d';
  hint.textContent = '正在加载 3D…';
  c.append(hint);
}

function setMode(next) {
  mode = next;
  for (const b of document.querySelectorAll('.tabs .btn')) {
    b.classList.toggle('on', b.dataset.mode === next);
  }
  const stage = threeContainer();
  const pv = document.querySelector('#preview');
  if (next === '3d') {
    pv.classList.add('hidden');
    stage?.classList.remove('hidden');
    ensureThree()?.setSpec(spec);
  } else {
    stage?.classList.add('hidden');
    pv.classList.remove('hidden');
  }
}

/* ---------------------------------------------------------------- 缩放 / 平移 */
/* 之前 SVG 按宽度自适应，1500 宽的柜子加上文字标注后，缝宽、把手这些
   细节在屏幕上只剩几个像素，导购员没法指给客户看。
   panzoom 负责滚轮缩放 + 拖拽平移；导出走的是原始 SVG 字符串，
   ��缩放完全无关，导出结果始终是 1:1。 */

const ZOOM_STEP = 1.25;
const zoomers = new Map();

function attachZoom(svg, key) {
  const pz = Panzoom(svg, {
    maxScale: 12,
    minScale: 0.2,
    step: 0.3,
    contain: 'outside',
    animate: false,
  });
  svg.addEventListener('panzoomstart', () => svg.classList.add('panning'));
  svg.addEventListener('panzoomend', () => svg.classList.remove('panning'));
  pz.addEventListener('zoom', () => syncZoomLabel());
  zoomers.set(key, pz);
  syncZoomLabel();
}

function currentScale() {
  for (const pz of zoomers.values()) return pz.getScale();
  return 1;
}

function syncZoomLabel() {
  const el = $('#zoomLabel');
  if (el) el.textContent = `${Math.round(currentScale() * 100)}%`;
}

function zoomBy(factor) {
  for (const pz of zoomers.values()) pz.zoomBy(factor, { animate: true });
  syncZoomLabel();
}

function zoomReset() {
  for (const pz of zoomers.values()) pz.reset({ animate: true });
  syncZoomLabel();
}

/* ---------------------------------------------------------------- 表单 schema */
/* get/set 用路径读写 spec。kind: num | text | enum | bool
   全部尺寸都是自由数字输入框：没有 min / max，没有档位，没有任何校验提示。
   之所以敢这样，是因为本项目做的是定制业务，深度要按客户墙体定。           */

const SCHEMA = [
  ['主柜', [
    ['name', '方案名', 'text', (s, v) => { s.name = v; }],
    ['cabinet.width', '柜体宽', 'num', (s, v) => { s.cabinet.width = v; }],
    ['cabinet.height', '柜体高', 'num', (s, v) => { s.cabinet.height = v; }],
    ['cabinet.depth', '柜体深', 'num', (s, v) => { s.cabinet.depth = v; }],
    ['cabinet.gap', '面板缝宽', 'num', (s, v) => { s.cabinet.gap = v; }],
    ['cabinet.mount', '安装方式', 'enum', (s, v) => { s.cabinet.mount = v; },
      [['floor', '落地'], ['wall', '悬空']]],
    ['cabinet.toe.height', '踢脚高', 'num', (s, v) => { s.cabinet.toe.height = v; }],
    ['cabinet.toe.inset', '踢脚内缩', 'num', (s, v) => { s.cabinet.toe.inset = v; }],
    ['cabinet.wallGap', '悬空离地', 'num', (s, v) => { s.cabinet.wallGap = v; }],
    ['cabinet.sidePanel', '侧板厚', 'num', (s, v) => { s.cabinet.sidePanel = v; }],
    ['cabinet.backPanel', '背板厚', 'num', (s, v) => { s.cabinet.backPanel = v; }],
    ['cabinet.bottomPanel', '底板厚', 'num', (s, v) => { s.cabinet.bottomPanel = v; }],
    ['cabinet.boardMaterial', '板材', 'text', (s, v) => { s.cabinet.boardMaterial = v; }],
  ]],
  ['台面', [
    ['top.material', '台面材质', 'text', (s, v) => { s.top.material = v; }],
    ['top.thickness', '台面厚', 'num', (s, v) => { s.top.thickness = v; }],
    ['top.overhang', '外挑', 'num', (s, v) => { s.top.overhang = v; }],
    ['top.backsplash.height', '挡水高', 'num', (s, v) => { s.top.backsplash.height = v; }],
    ['top.backsplash.thickness', '挡水厚', 'num', (s, v) => { s.top.backsplash.thickness = v; }],
  ]],
  ['盆', [
    ['basin.type', '盆型', 'enum', (s, v) => { s.basin.type = v; },
      [['vessel', '台上盆'], ['undermount', '台下盆'], ['integral', '一体盆']]],
    ['basin.count', '盆数', 'enum', (s, v) => { s.basin.count = Number(v); }, [[1, '1 个'], [2, '2 个']]],
    ['basin.width', '盆宽', 'num', (s, v) => { s.basin.width = v; }],
    ['basin.depth', '盆深', 'num', (s, v) => { s.basin.depth = v; }],
    ['basin.height', '盆高', 'num', (s, v) => { s.basin.height = v; }],
    ['basin.gap', '双盆间距', 'num', (s, v) => { s.basin.gap = v; }],
    ['basin.depthBias', '盆深位置 0=贴前沿 1=贴挡水', 'num', (s, v) => { s.basin.depthBias = v; }],
    ['basin.position', '盆左边界（空=自动）', 'text', (s, v) => { s.basin.position = v === '' ? null : Number(v); }],
    ['basin.shape', '盆形状', 'enum', (s, v) => { s.basin.shape = v; }, [['rect', '矩形'], ['ellipse', '椭圆']]],
    ['basin.radius', '盆圆角', 'num', (s, v) => { s.basin.radius = v; }],
    ['basin.wall', '盆壁厚', 'num', (s, v) => { s.basin.wall = v; }],
    ['basin.wallBottom', '盆底厚', 'num', (s, v) => { s.basin.wallBottom = v; }],
  ]],
  ['龙头 / 镜柜', [
    ['faucet.enabled', '画龙头', 'bool', (s, v) => { s.faucet.enabled = v; }],
    ['faucet.height', '龙头高', 'num', (s, v) => { s.faucet.height = v; }],
    ['__mirror', '画镜柜', 'bool', (s, v) => {
      s.mirror = v
        ? (s.mirror ?? { width: null, height: 780, depth: 150, gap: 30, led: false })
        : null;
    }],
    ['mirror.height', '镜柜高', 'num', (s, v) => { s.mirror = { ...(s.mirror ?? {}), height: v }; }],
    ['mirror.depth', '镜柜深', 'num', (s, v) => { s.mirror = { ...(s.mirror ?? {}), depth: v }; }],
    ['mirror.gap', '镜柜离台面', 'num', (s, v) => { s.mirror = { ...(s.mirror ?? {}), gap: v }; }],
  ]],
  ['显示', [
    ['view.front', '正视图', 'bool', (s, v) => { s.view.front = v; }],
    ['view.plan', '俯视图', 'bool', (s, v) => { s.view.plan = v; }],
    ['view.section', '剖面图', 'bool', (s, v) => { s.view.section = v; }],
    ['annotations.enabled', '文字标注', 'bool', (s, v) => { s.annotations.enabled = v; }],
    ['annotations.position', '标注位置', 'enum', (s, v) => { s.annotations.position = v; },
      [['right', '右侧'], ['below', '下方']]],
  ]],
];

function getPath(obj, path) {
  if (path === 'name') return obj.name;
  if (path === '__mirror') return obj.mirror !== null;
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

/* ---------------------------------------------------------------- 表单 */

function buildForm() {
  const form = $('#form');
  form.innerHTML = '';
  for (const [legend, fields] of SCHEMA) {
    const fs = document.createElement('fieldset');
    const lg = document.createElement('legend');
    lg.textContent = legend;
    fs.append(lg);
    for (const f of fields) fs.append(makeRow(f));
    form.append(fs);
  }

  const bs = document.createElement('fieldset');
  const bl = document.createElement('legend');
  bl.textContent = '分区';
  bs.append(bl);
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.innerHTML = '列宽比 / 行高比 用逗号分隔。<br>'
    + '列 [1,1] 均分，[3,1,3] 两侧宽中间窄（中抽）。<br>'
    + '行 [2,1] 下大上小，[2,1.5,1] 三抽递减。';
  bs.append(hint);
  bs.append(buildBands());
  form.append(bs);
}

function makeRow([path, label, kind, set, options]) {
  const row = document.createElement('div');
  row.className = 'row';
  const lb = document.createElement('label');
  lb.textContent = label;
  lb.title = label;

  if (kind === 'bool') {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!getPath(spec, path);
    cb.addEventListener('change', () => { set(spec, cb.checked); touched(); redraw(); });
    row.append(lb, cb);
    return row;
  }

  if (kind === 'enum') {
    const sel = document.createElement('select');
    for (const [v, t] of options) {
      const o = document.createElement('option');
      o.value = String(v);
      o.textContent = t;
      sel.append(o);
    }
    sel.value = String(getPath(spec, path));
    sel.addEventListener('change', () => { set(spec, sel.value); touched(); redraw(); });
    row.append(lb, sel);
    return row;
  }

  const inp = document.createElement('input');
  inp.type = kind === 'num' ? 'number' : 'text';
  if (kind === 'num') inp.step = 'any';           // 只有 step，没有 min / max
  const cur = getPath(spec, path);
  inp.value = cur === null || cur === undefined ? '' : cur;
  inp.addEventListener('input', () => {
    if (kind === 'num') {
      if (inp.value === '') return;               // 清空时保持上一个有效值，不把 NaN 塞进 spec
      const n = Number(inp.value);
      if (!Number.isFinite(n)) return;
      set(spec, n);
    } else {
      set(spec, inp.value);
    }
    touched();
    redraw();
  });
  row.append(lb, inp);
  return row;
}

const KIND_LABEL = { drawer: '抽屉', door: '门', open: '开放格' };
const HANDLE_LABEL = { 'bar-h': '横长条', 'bar-v': '竖长条', gola: '暗拉手', knob: '小拉手', none: '无' };

function buildBands() {
  const wrap = document.createElement('div');

  spec.bands.forEach((band, bi) => {
    const box = document.createElement('div');
    box.className = 'band';

    const hd = document.createElement('div');
    hd.className = 'hd';
    const b = document.createElement('b');
    const where = bi === 0 ? '最下' : bi === spec.bands.length - 1 ? '最上' : '中间';
    b.textContent = `分区 ${bi + 1} · ${where}`;
    const del = document.createElement('button');
    del.className = 'x';
    del.textContent = '删除';
    del.disabled = spec.bands.length <= 1;
    del.addEventListener('click', () => {
      spec.bands.splice(bi, 1);
      touched();
      rebuild();
    });
    hd.append(b, del);
    box.append(hd);

    box.append(selRow('类型', KIND_LABEL, band.kind, (v) => {
      band.kind = v;
      band.cells = null;
      band.handle = v === 'door' ? 'bar-v' : 'bar-h';
    }, true));
    box.append(textRow('列宽比', band.cols.join(','), (v) => {
      const nums = parseRatios(v);
      if (nums) band.cols = nums;
    }, '例：1,1 或 3,1,3'));
    box.append(textRow('行高比', band.rows.join(','), (v) => {
      const nums = parseRatios(v);
      if (nums) band.rows = nums;
    }, '例：2,1 表示下大上小'));
    box.append(selRow('把手', HANDLE_LABEL, Array.isArray(band.handle) ? band.handle[0] : band.handle,
      (v) => { band.handle = v; }, true));
    box.append(textRow('格子类型（留空=按类型）', band.cells ? band.cells.join(',') : '', (v) => {
      const t = v.trim();
      band.cells = t ? t.split(',').map((x) => x.trim()).filter(Boolean) : null;
    }, '可用：drawer / door / open / basin'));

    wrap.append(box);
  });

  const add = document.createElement('button');
  add.className = 'btn';
  add.textContent = '+ 添加分区';
  add.addEventListener('click', () => {
    spec.bands.push({ kind: 'drawer', cols: [1], rows: [1], cells: null, handle: 'bar-h' });
    touched();
    rebuild();
  });
  wrap.append(add);
  return wrap;
}

function parseRatios(v) {
  const nums = v.split(',').map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? nums : null;
}

/** 只重画预览，不动表单——否则输入框会失焦、光标跳位，没法连续输入。 */
function selRow(label, labels, value, onChange, rebuildAfter = false) {
  const row = document.createElement('div');
  row.className = 'row';
  const lb = document.createElement('label');
  lb.textContent = label;
  const sel = document.createElement('select');
  for (const [v, t] of Object.entries(labels)) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = t;
    sel.append(o);
  }
  sel.value = value;
  sel.addEventListener('change', () => {
    onChange(sel.value);
    touched();
    if (rebuildAfter) rebuild(); else redraw();
  });
  row.append(lb, sel);
  return row;
}

function textRow(label, value, onChange, title) {
  const row = document.createElement('div');
  row.className = 'row';
  const lb = document.createElement('label');
  lb.textContent = label;
  if (title) lb.title = title;
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = value;
  inp.addEventListener('input', () => { onChange(inp.value); touched(); redraw(); });
  row.append(lb, inp);
  return row;
}

/* ---------------------------------------------------------------- 预设 */

function buildPresets() {
  const bar = $('#presetBar');
  bar.innerHTML = '';
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = p.name;
    b.title = `${p.hint} —— 点一下填一整套起点值，之后每个数字都能单独改`;
    b.dataset.id = p.id;
    b.addEventListener('click', () => {
      spec = makeSpec({ ...clone(p.spec), name: p.name });
      currentPreset = p.id;
      markPresets();
      rebuild();
      scheduleHistory();
    });
    bar.append(b);
  }
}

function touched() {
  currentPreset = null;
  markPresets();
  scheduleHistory();
}

function markPresets() {
  for (const b of document.querySelectorAll('#presetBar .btn')) {
    b.classList.toggle('on', b.dataset.id === currentPreset);
  }
}

/* ---------------------------------------------------------------- 预览 */

const VIEW_LABEL = { front: '正视图', plan: '俯视图', section: '剖面图 1-1' };

function redraw() {
  const pv = $('#preview');
  pv.innerHTML = '';
  zoomers.clear();

  let out;
  try {
    out = drawAll(spec);
  } catch (e) {
    pv.append(errBox(`画图出错：${e.message}`));
    lastDraw = null;
    return;
  }
  lastDraw = out;

  let n = 0;
  for (const key of ['front', 'plan', 'section']) {
    if (!spec.view[key]) continue;
    const fig = document.createElement('figure');
    const cap = document.createElement('figcaption');
    cap.textContent = VIEW_LABEL[key];
    const wrap = document.createElement('div');
    wrap.className = 'zoomwrap';
    fig.append(cap, wrap);
    wrap.insertAdjacentHTML('beforeend', out[key].svg);
    pv.append(fig);
    const svg = wrap.querySelector('svg');
    if (svg) attachZoom(svg, key);
    n++;
  }
  if (!n) pv.append(errBox('三个视图都被隐藏了，请在「显示」里至少打开一个。'));
  syncZoomLabel();

  // 3D 与三视图共用同一份 spec，几何必然一致
  if (mode === '3d') {
    const v = ensureThree();
    if (v) {
      v.setSpec(spec);
      const stage = threeContainer();
      if (stage) {
        const w = stage.clientWidth;
        const h = stage.clientHeight;
        if (w && h) v.resize(w, h);
      }
    }
  }
}

function errBox(msg) {
  const d = document.createElement('div');
  d.id = 'err';
  d.textContent = msg;
  return d;
}

function rebuild() {
  buildForm();
  redraw();
}

/* ---------------------------------------------------------------- 导出 */

const safeName = () => (spec.name || '方案').replace(/[\\/:*?"<>|]/g, '_');
const firstVisible = () => ['front', 'plan', 'section'].find((k) => spec.view[k]);

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

$('#btnSvg').addEventListener('click', () => {
  const key = firstVisible();
  if (!key || !lastDraw) return;
  download(
    new Blob([lastDraw[key].svg], { type: 'image/svg+xml;charset=utf-8' }),
    `${safeName()}-${key}.svg`,
  );
});

$('#btnPng').addEventListener('click', () => {
  const key = firstVisible();
  if (!key || !lastDraw) return;
  const { svg, box } = lastDraw[key];
  const SCALE = 2;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round((box[2] * SCALE) / 5));
    cv.height = Math.max(1, Math.round((box[3] * SCALE) / 5));
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    URL.revokeObjectURL(url);
    cv.toBlob((b) => download(b, `${safeName()}-${key}.png`), 'image/png');
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
});

/* ---------------------------------------------------------------- 历史 */
/* 用 IndexedDB（idb-keyval）而不是 localStorage：
   localStorage 上限约 5MB，而且整个是同步的。
   一旦历史里存缩略图，localStorage 立刻就不够用了。 */

const HIST_KEY = 'diy-bath:history';
const HIST_MAX = 100;

async function loadHistory() {
  try {
    const raw = await idbGet(HIST_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/** 真正落库。同一份参数不重复记。 */
async function pushHistory() {
  const list = await loadHistory();
  const sig = JSON.stringify(spec);
  if (list.length && list[0].sig === sig) return;
  list.unshift({ at: Date.now(), name: spec.name, sig, spec: clone(spec) });
  try {
    await idbSet(HIST_KEY, list.slice(0, HIST_MAX));
  } catch {
    /* 存不下就算了，不影响画图 */
  }
  renderHistory();
}

let histTimer = null;
/** 参数改动很频繁（拖数字就是连着几十次），防抖后再落库。 */
function scheduleHistory() {
  clearTimeout(histTimer);
  histTimer = setTimeout(() => { void pushHistory(); }, 800);
}

function fmtTime(t) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
}

async function renderHistory() {
  const sel = $('#hist');
  if (!sel) return;
  const list = await loadHistory();
  sel.innerHTML = '<option value="">— 历史方案 —</option>';
  list.forEach((h, i) => {
    const o = document.createElement('option');
    const nm = String(h.name || '').padEnd(16, '　').slice(0, 16);
    o.value = String(i);
    o.textContent = `${nm} ${fmtTime(new Date(h.at))}`;
    sel.append(o);
  });
}

$('#hist').addEventListener('change', async (e) => {
  const h = (await loadHistory())[Number(e.target.value)];
  if (!h) return;
  spec = makeSpec(h.spec);
  currentPreset = null;
  markPresets();
  rebuild();
});

/* ---------------------------------------------------------------- 启动 */

buildPresets();
markPresets();
renderHistory();
rebuild();

// 页签
for (const b of document.querySelectorAll('.tabs .btn')) {
  b.addEventListener('click', () => setMode(b.dataset.mode));
}

// 3D 视图在标签页隐藏时尺寸会是 0，切回来要重新算一次
window.addEventListener('resize', () => {
  if (mode !== '3d' || !threeView) return;
  const stage = threeContainer();
  if (stage) threeView.resize(stage.clientWidth, stage.clientHeight);
});

$('#btnResetView')?.addEventListener('click', () => threeView?.reset());

// 缩放控件
$('#zoomIn').addEventListener('click', () => zoomBy(ZOOM_STEP));
$('#zoomOut').addEventListener('click', () => zoomBy(1 / ZOOM_STEP));
$('#zoomFit').addEventListener('click', () => zoomReset());
$('#zoom100').addEventListener('click', () => {
  for (const pz of zoomers.values()) pz.zoomTo(1, { animate: true });
  syncZoomLabel();
});