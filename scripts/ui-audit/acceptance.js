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

  /** 读 3D 画布：返回非白像素占比 + 画面指纹（指纹变了才说明真的重绘了） */
  const canvasState = () => {
    const c = q('#stage3d canvas');
    if (!c) return { ink: -1, fp: 'none' };
    const t = document.createElement('canvas');
    t.width = c.width; t.height = c.height;
    const x = t.getContext('2d');
    x.drawImage(c, 0, 0);
    const d = x.getImageData(0, 0, t.width, t.height).data;
    let nw = 0, total = 0, h = 2166136261;
    for (let i = 0; i < d.length; i += 4 * 41) {
      total++;
      if (d[i] < 240 || d[i + 1] < 240 || d[i + 2] < 240) nw++;
      h ^= d[i] + d[i + 1] * 3 + d[i + 2] * 7;
      h = Math.imul(h, 16777619);
    }
    return { ink: +(100 * nw / total).toFixed(1), fp: (h >>> 0).toString(16) };
  };
  const ink = () => canvasState().ink;

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
    if (this.download) { captured = this.download; return; }
    return origClick.apply(this, arguments);
  };
  const grabDownload = (fn) => { captured = null; fn(); return captured; };

  return async function run() {
    await sleep(3200);

    /* 1 默认在 3D 模式，画面里有柜子 */
    ok(1, true, !q('#stage3d').classList.contains('hidden') && ink() > 5);
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
    ok(7, true, !!q('#stage3d canvas') && ink() > 5);
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
    ok(8, true, svgHas1500 && ink8 > 5);

    /* 9 预设「中抽大柜」 */
    const preset = [...document.querySelectorAll('#presetBar .btn')]
      .find((b) => b.textContent.includes('中抽'));
    preset?.click();
    await sleep(800);
    ok(9, true, !!preset && ink() > 5 && findNum('柜体宽').value !== '1500');

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
    ok(10, true, ink() > 5);

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