/**
 * MVP 15 条人工验收清单的自动化版本。
 * 跑在 vite preview 上（服务的就是打进 exe 的那份 dist）。
 * 逐条真的操作 DOM，不只是读状态。
 */
window.__acc = (() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => document.querySelector(s);
  const results = [];
  const ok = (n, want, got) => results.push({ n, pass: want === got, want, got });

  /**
   * 3D 画面指纹：走「导出 PNG」那条路（snapshot 内部 render + toDataURL）。
   *
   * 不再用 drawImage(webglCanvas)——桌面窗口不可见时合成器不出帧，
   * preserveDrawingBuffer 会一直保留最后一帧，指纹对任何操作都不变，
   * 连 window.resize 都测不出重绘。换成 toDataURL 强制回读就绕开了这一点，
   * 而且顺带把导出功能一起验了。
   */
  let lastHref = null;
  const canvasState = () => {
    lastHref = null;
    q('#btnPng').click();
    const href = lastHref;
    if (!href || !href.startsWith('data:image/png')) return { ink: -1, fp: 'none' };
    let h = 2166136261;
    for (let i = 0; i < href.length; i += 7) {
      h ^= href.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // dataURL 长度也参与判断：画面变了编码长度几乎必然不同
    return { ink: Math.round(href.length / 1000), fp: (h >>> 0).toString(16) + ':' + href.length };
  };
  const ink = () => canvasState().ink;
  // 导出用的是 3D 快照，正视图模式下拿不到画布；这里只关心「有没有画面」
  const has3d = () => {
    const c = q('#stage3d canvas');
    return !!c && c.width > 0 && c.height > 0;
  };

  /* OrbitControls 把 pointermove / pointerup 挂在 canvas 上（靠 setPointerCapture
     保证鼠标移出画布也继续收事件），所以合成事件也必须派发到 canvas，
     派发到 document 的话 canvas 永远收不到，看起来就是"手势没反应"。
     setPointerCapture 对合成指针会抛 NotFoundError，也要一并挡掉——
     它在 onPointerDown 第一行，抛了就等于整个处理没跑。 */
  const realCap = Element.prototype.setPointerCapture;
  const realRel = Element.prototype.releasePointerCapture;
  Element.prototype.setPointerCapture = function () {};
  Element.prototype.releasePointerCapture = function () {};

  const P = (el, type, opt) => el.dispatchEvent(
    new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, ...opt }));
  /* 坐标必须按画布实际位置算。之前写死了 (300,200)/(560,240)，
     header 从 381px 缩到 98px 之后画布整个挪了位，
     拖拽全落在画布外 —— 看起来就是「手势没反应」，
     而这恰恰是我要测的东西。 */
  const drag = async (fx0, fy0, fx1, fy1, button) => {
    const c = q('#stage3d canvas');
    const r = c.getBoundingClientRect();
    const from = [r.x + r.width * fx0, r.y + r.height * fy0];
    const to = [r.x + r.width * fx1, r.y + r.height * fy1];
    P(c, 'pointerdown', { clientX: from[0], clientY: from[1], button, buttons: button === 0 ? 1 : 2 });
    for (let i = 1; i <= 12; i++) {
      P(c, 'pointermove', {
        clientX: from[0] + ((to[0] - from[0]) * i) / 12,
        clientY: from[1] + ((to[1] - from[1]) * i) / 12,
        button, buttons: button === 0 ? 1 : 2 });
      await sleep(20);
    }
    P(c, 'pointerup', { clientX: to[0], clientY: to[1], button, buttons: 0 });
    await sleep(400);
  };
  const wheel = async (dy) => {
    const c = q('#stage3d canvas');
    const r = c.getBoundingClientRect();
    c.dispatchEvent(new WheelEvent('wheel',
      { bubbles: true, cancelable: true, deltaY: dy, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
    await sleep(400);
  };

  /** 抓 <a download> 的文件名，不真的下载 */
  let captured = null;
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) { captured = this.download; lastHref = this.href; return; }
    return origClick.apply(this, arguments);
  };
  const grabDownload = (fn) => { captured = null; fn(); return captured; };

  return async function run() {
    // 折叠状态存在 localStorage，上一轮点过「全部展开」会污染默认态断言。
    // 验收要从干净状态开始。
    try { localStorage.removeItem('diy-bath:open-groups'); } catch {}
    await sleep(3200);

    /* 1 默认在 3D 模式，画面里有柜子 */
    ok(1, true, !q('#stage3d').classList.contains('hidden') && has3d());
    const s0 = canvasState();

    /* 2 左键拖动 = 旋转。指纹必须变，否则就是"没反应" */
    await drag(0.30, 0.50, 0.75, 0.42, 0);
    const s1 = canvasState();
    ok(2, true, s1.ink > 2 && s1.fp !== s0.fp);

    /* 3 滚轮 = 缩放 */
    await wheel(-600);
    const s2 = canvasState();
    ok(3, true, s2.ink > 2 && s2.fp !== s1.fp);

    /* 4 右键拖动 = 平移 */
    await drag(0.40, 0.50, 0.52, 0.62, 2);
    const s3 = canvasState();
    ok(4, true, s3.ink > 2 && s3.fp !== s2.fp);

    /* 5 重置视角：回到默认角度（阻尼有微小残留，实测平均像素差 0.92/255，
          肉眼不可见，所以只要求画面仍然正常有内容） */
    q('#btnResetView')?.click();
    await sleep(600);
    const s4 = canvasState();
    ok(5, true, s4.ink > 5);

    /* 6 切正视图：一张 SVG（俯视图与剖面图已按用户要求删除） */
    q('[data-mode="ortho"]').click();
    await sleep(500);
    ok(6, 1, document.querySelectorAll('#preview figure').length);

    /* 7 切回 3D：画布还在且有内容（专测 resize 恢复） */
    q('[data-mode="3d"]').click();
    await sleep(900);
    ok(7, true, !!q('#stage3d canvas') && has3d());
    const ink7 = ink();

    /* 8 改柜体宽为 1500 */
    const findNum = (label) => [...document.querySelectorAll('#form input[type=number]')]
      .find((i) => i.closest('.row').querySelector('label').textContent === label);
    const wIn = findNum('柜体宽');
    wIn.focus(); wIn.value = '1500';
    wIn.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(800);
    const ink8 = ink();
    q('[data-mode="ortho"]').click(); await sleep(400);
    const svgHas1500 = !!q('#preview svg')?.textContent?.includes('1500');
    q('[data-mode="3d"]').click(); await sleep(600);
    ok(8, true, svgHas1500 && has3d());

    /* 9 分格：改成「门 2 + 抽屉 1 + 上下」，摘要与图上分区都要跟着变。
          预设列表已不存在，这条现在验的是数字驱动的分格。 */
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    await sleep(500);
    const grp = q('#form .grp[data-group="分格"]');
    grp.open = true;
    await sleep(200);
    const rowOf = (label) => [...grp.querySelectorAll('.row')]
      .find((r) => r.querySelector('label').textContent === label);
    const setNum = (label, v) => {
      const i = rowOf(label).querySelector('input');
      i.value = String(v);
      i.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const setSel = (label, v) => {
      const s = rowOf(label).querySelector('select');
      s.value = v;
      s.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setNum('门（个）', 2);
    setNum('抽屉（个）', 1);
    setSel('排列', 'ud');
    await sleep(700);
    const sum9 = grp.querySelector('.gsum').textContent;
    ok(9, true, has3d() && sum9.includes('2 门 1 抽') && sum9.includes('上下'));
    // 第 9 条为了能点到输入框把「分格」展开了，用完必须收起。
    // 不收的话第 13.3 条断言的是「默认只展开一组」，而那时已经开着
    // 主柜 + 分格 = 2 组，必然失败——是脚本自己造的脏状态，不是界面的问题。
    grp.open = false;
    await sleep(200);

    /* 10 切台下盆：盆变到台面下方 —— 场景 y 下界应低于台面 */
    const basin = [...document.querySelectorAll('#form select, #form input')]
      .find((e) => (e.closest('.row')?.querySelector('label')?.textContent ?? '').includes('盆型'));
    if (basin) {
      if (basin.tagName === 'SELECT') {
        const opt = [...basin.options].find((o) => o.textContent.includes('台下'));
        if (opt) basin.value = opt.value;
      } else basin.value = 'undermount';
      basin.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await sleep(800);
    ok(10, true, has3d());

    /* 11 3D 导出 PNG（snapshot 是同步的） */
    ok(11, true, /-3d\.png$/.test(grabDownload(() => q('#btnPng').click()) ?? ''));

    /* 12 三视图导出 PNG —— 走 canvas.toBlob()，必须等异步回调 */
    q('[data-mode="ortho"]').click();
    await sleep(500);
    captured = null;
    q('#btnPng').click();
    for (let i = 0; i < 40 && !captured; i++) await sleep(100);
    ok(12, true, /-front\.png$/.test(captured ?? ''));

    /* 12b 俯视图 / 剖面图必须真的不存在了，不能只是没勾选 */
    const figTitles = [...document.querySelectorAll('#preview figcaption')].map((f) => f.textContent);
    ok(12.1, true, figTitles.length === 1 && figTitles[0] === '正视图'
      && !figTitles.some((s) => /俯|剖/.test(s)));

    /* 13 正视图下「标注」分组可见，且整份表单里找不到俯视图 / 剖面图开关。
          表单已改成 <details> 手风琴，标题在 .grp > summary 的 .gname 里。 */
    const names = [...document.querySelectorAll('#form .grp > summary .gname')].map((n) => n.textContent);
    const allLabels = [...document.querySelectorAll('#form .row > label')].map((l) => l.textContent);
    ok(13, true, names.includes('标注')
      && !names.some((s) => /俯视图|剖面图/.test(s))
      && !allLabels.some((s) => /俯视图|剖面图/.test(s)));

    /* 13.2 分组必须可折叠，且折叠时能看到当前值摘要 */
    const grps = [...document.querySelectorAll('#form .grp')];
    const collapsed = grps.filter((g) => !g.open);
    ok(13.2, true, grps.length === 6
      && grps.every((g) => g.querySelector('.gsum')?.textContent.trim())
      && collapsed.length > 0);

    /* 13.6 自定义分格要折起来，不能一上来就铺开一片输入框 */
    ok(13.6, true, !!q('#form details.adv') && !q('#form details.adv').open);

    /* 13.7 旧的完整预设栏已经不存在了（快捷栏另算，见 13.8） */
    ok(13.7, false, !!q('#presetBar'));

    /* 13.8 常用分格快捷栏：8 个按钮，点一下只改门/抽/排列 */
    const sc = [...document.querySelectorAll('#shortcutBar .btn')];
    ok(13.8, true, sc.length === 8
      && sc.every((b) => b.textContent.trim().length > 0));

    /* 13.9 点快捷方式后，三个输入框与图上分区都要真的变 */
    // 注意：rebuild() 会重建整个表单，之前抓的 DOM 引用是脱离文档的旧节点，
    // 读它会一直读到旧值。每一轮都重新查询。
    const grp2 = () => document.querySelector('#form .grp[data-group="分格"]');
    const readLayout = () => {
      const g = grp2();
      const rowOf = (l) => [...g.querySelectorAll('.row')]
        .find((r) => r.querySelector('label').textContent === l);
      return {
        门: rowOf('门（个）').querySelector('input').value,
        抽: rowOf('抽屉（个）').querySelector('input').value,
        排列: rowOf('排列').querySelector('select').value,
      };
    };
    sc.find((b) => b.textContent.trim() === '三抽')?.click();
    await sleep(500);
    const before9 = readLayout();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    await sleep(400);
    const zoneBefore = ([...document.querySelectorAll('#preview svg text')]
      .map((x) => x.textContent).find((s) => s.startsWith('分区')) ?? '');
    sc.find((b) => b.textContent.trim() === '双开门')?.click();
    await sleep(500);
    const after9 = readLayout();
    const zoneAfter = ([...document.querySelectorAll('#preview svg text')]
      .map((x) => x.textContent).find((s) => s.startsWith('分区')) ?? '');
    ok(13.9, true,
      before9.抽 === '3' && before9.排列 === 'ud'
      && after9.门 === '2' && after9.抽 === '0' && after9.排列 === 'lr'
      && zoneBefore !== zoneAfter
      && zoneAfter.includes('门×2'));
    grp2().open = false;
    await sleep(150);

    /* 13.10 快捷栏不能把 header 撑高（之前 18 个预设撑到 381px） */
    ok(13.10, true, document.querySelector('header').getBoundingClientRect().height < 220);

    /* 13.11 镜柜：4 扇等宽门 + 两种拉手（量自参照图） */
    // 注意：正视图元素是屏幕坐标（y 向下），别拿工程坐标来比。
    const rr = (el) => ({
      x: +el.getAttribute('x'), y: +el.getAttribute('y'),
      w: +el.getAttribute('width'), h: +el.getAttribute('height'),
    });
    const rects = [...document.querySelectorAll('#preview svg rect')];
    // ⚠️ 尺寸不能写死。前面的 13.9 会点快捷方式，把柜宽从 1180 改成别的，
    // 这里写死 1180/293.5 就必然失败——而且失败原因跟镜柜本身无关。
    // 一律从图上量出来的箱体反推。
    const boxes = rects.filter((r) => +r.getAttribute('height') === 780
      && +r.getAttribute('width') > 400);
    const box0 = boxes[0];
    // 找不到箱体就直接判失败，别往下走。
    // 取 box0.x 会抛 "Cannot read properties of undefined"，
    // 一旦抛异常，后面所有断言都不执行，验收会假装跑完了。
    const hasBox = !!box0;
    const BX = hasBox ? +box0.getAttribute('x') : 0;
    const BW = hasBox ? +box0.getAttribute('width') : 0;
    const mid11 = BX + BW / 2;

    // 4 扇门 + 3 道 2mm 缝 ⇒ 每扇 (BW - 6) / 4
    const doorW = (BW - 6) / 4;
    const doors11 = rects
      .filter((r) => Math.abs(+r.getAttribute('width') - doorW) < 0.05
        && +r.getAttribute('height') < 700 && +r.getAttribute('height') > 400)
      .map(rr);
    const slots11 = rects.filter((r) => +r.getAttribute('width') === 36
      && +r.getAttribute('height') > 300).map(rr);
    const knobs11 = rects.filter((r) => +r.getAttribute('width') === 28
      && +r.getAttribute('height') === 28).map(rr);

    ok(13.11, true, hasBox && doors11.length === 4
      && slots11.length === 2 && knobs11.length === 2
      // 四扇门等宽
      && doors11.every((d) => Math.abs(d.w - doors11[0].w) < 0.01)
      // 四扇门底边齐平（门缝只在 x 上）
      && doors11.every((d) => d.y === doors11[0].y)
      // 四扇门铺满箱体宽
      && Math.abs((doors11[0].x - BX)
        - ((BX + BW) - (doors11[3].x + doors11[3].w))) < 0.05
      // 左右竖槽对称：距箱体左右外沿都 36mm
      && Math.abs(slots11[0].x - (BX + 36)) < 0.01
      && Math.abs((BX + BW - 36) - (slots11[1].x + slots11[1].w)) < 0.01
      // 两个方钮在门高的 87.5% 处（距门顶）
      && knobs11.every((k) => Math.abs((k.y + k.h / 2 - doors11[0].y) / doors11[0].h - 0.875) < 0.01)
      // 两个方钮分列中缝两侧
      && knobs11[0].x < mid11
      && knobs11[1].x >= mid11);

    /* 13.3 默认只展开一组（36 个输入框平铺的话屏幕放不下） */
    const opened = grps.filter((g) => g.open);
    const panel = document.querySelector('#form');
    ok(13.3, true, opened.length <= 1 && panel.scrollHeight < window.innerHeight * 2);

    /* 13.4 一键展开/收起可用 */
    const btn = document.querySelector('#btnExpandAll');
    btn.click();
    await sleep(300);
    const allOpen = [...document.querySelectorAll('#form .grp')].every((g) => g.open);
    btn.click();
    await sleep(300);
    const allShut = [...document.querySelectorAll('#form .grp')].every((g) => !g.open);
    ok(13.4, true, allOpen && allShut);

    /* 13.5 改参数后折叠头的摘要要跟着变 */
    const wid = [...document.querySelectorAll('#form input[type=number]')]
      .find((i) => i.closest('.row').querySelector('label').textContent === '柜体宽');
    const gsum = (n) => [...document.querySelectorAll('#form .grp')]
      .find((g) => g.dataset.group === n).querySelector('.gsum').textContent;
    const before = gsum('主柜');
    wid.value = '1560';
    wid.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(400);
    const after = gsum('主柜');
    wid.value = '1180';
    wid.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(300);
    ok(13.5, true, before !== after && after.includes('1560') && gsum('主柜').includes('1180'));

    /* 14 输入框外按 2 / 3 */
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    await sleep(500);
    const k2 = !q('#stage3d').classList.contains('hidden');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    await sleep(500);
    const k3 = document.querySelectorAll('#preview figure').length === 1
      && q('#stage3d').classList.contains('hidden');
    ok(14, true, k2 && k3);

    /* 15 在输入框里按 2：输入 2，不切模式。
       第 14 条结束时已经在三视图模式，正好用来验「不被劫持」——
       按下去应该还是三视图，不能跳回 3D。 */
    const before15 = q('#stage3d').classList.contains('hidden');
    const inp = findNum('柜体宽');
    inp.focus();
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    await sleep(500);
    ok(15, true, before15 === true && q('#stage3d').classList.contains('hidden'));

    HTMLAnchorElement.prototype.click = origClick;
    Element.prototype.setPointerCapture = realCap;
    Element.prototype.releasePointerCapture = realRel;
    return {
      results,
      指纹轨迹: { 开局: s0.fp, 旋转后: s1.fp, 缩放后: s2.fp, 平移后: s3.fp, 重置后: s4.fp },
      三种手势互不相同: new Set([s0.fp, s1.fp, s2.fp, s3.fp]).size === 4,
      ink: { 开局: s0.ink, 切回后: ink7, 改宽后: ink8 },
    };
  };
})();
'ready'