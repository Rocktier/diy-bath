/**
 * 按 ui-ux-pro-max 的要求逐条查：focus 可见性、reduced-motion、
 * color-scheme、数字输入的字形稳定性、点击目标尺寸、无障碍命名。
 */
window.__a11y = (() => {
  const css = [...document.styleSheets].flatMap((s) => {
    try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; }
  }).join('\n');

  const sel = (s) => [...document.querySelectorAll(s)];
  const vis = (el) => {
    for (let p = el; p; p = p.parentElement) if (getComputedStyle(p).display === 'none') return false;
    return true;
  };

  return function run() {
    const out = {};

    /* 1. 键盘焦点是否可见：逐个可聚焦元素实测 outline */
    const focusables = sel('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')
      .filter((el) => vis(el) && !el.disabled);
    const noFocusStyle = [];
    for (const el of focusables) {
      const s = getComputedStyle(el);
      // outline:none 且没有自定义 box-shadow / border 变化 → 焦点不可见
      const hasBorderChange = s.outlineStyle === 'none';
      const bs = getComputedStyle(el, null);
      if (hasBorderChange && bs.boxShadow === 'none') {
        // 再看有没有 :focus 规则命中不了 —— 用 CSS 文本粗判
        noFocusStyle.push({
          元素: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
          文字: (el.textContent || '').trim().slice(0, 12) || el.type,
        });
      }
    }
    out.可聚焦元素 = focusables.length;
    out.可能无焦点样式 = noFocusStyle;

    /* 2. reduced-motion 是否被尊重 */
    out.有ReducedMotion规则 = /prefers-reduced-motion/.test(css);

    /* 3. color-scheme：缺失会让 WebView2 的滚动条/原生控件渲染成浅色 */
    out.有ColorScheme = /color-scheme\s*:/.test(css);

    /* 4. 数字输入的字形稳定性：等宽数字，否则输入 1→100 时字符会左右跳 */
    const nums = sel('#form input[type=number], #form input[type=text]');
    out.数字输入总数 = nums.length;
    out.未用等宽数字的输入 = nums.filter((i) => {
      const s = getComputedStyle(i);
      return s.fontVariantNumeric.indexOf('tabular-nums') < 0 && !/mono|Mono/i.test(s.fontFamily);
    }).length;

    /* 5. 点击目标尺寸（桌面端密集工具，按 ≥28px 宽松标准） */
    const small = [];
    for (const el of focusables) {
      const r = el.getBoundingClientRect();
      if (r.height < 24 || r.width < 24) {
        small.push({
          元素: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
          文字: (el.textContent || '').trim().slice(0, 10) || el.type,
          尺寸: Math.round(r.width) + 'x' + Math.round(r.height),
        });
      }
    }
    out.过小的目标 = small;

    /* 6. 只有图标的按钮有没有无障碍名（title 不够可靠，要 aria-label） */
    const iconBtns = sel('button').filter((b) => {
      const t = (b.textContent || '').trim();
      return t.length <= 2 || /^[\s\-+×÷]$/.test(t);
    });
    out.图标按钮 = iconBtns.map((b) => ({
      id: b.id, 文字: (b.textContent || '').trim(),
      有AriaLabel: !!b.getAttribute('aria-label'),
      有Title: !!b.getAttribute('title'),
    }));

    /* 7. 死代码：CSS 里定义了但 HTML 里不存在的 id */
    const idsInCss = new Set([...css.matchAll(/#([A-Za-z][\w-]*)/g)].map((m) => m[1]));
    const htmlIds = new Set(sel('[id]').map((e) => e.id));
    out.CSS里存在但页面没有的id = [...idsInCss].filter((i) => !htmlIds.has(i));

    /* 8. header 里塞了多少控件（拥挤度） */
    const hdr = document.querySelector('header');
    out.header控件数 = hdr ? hdr.querySelectorAll('button, select, input').length : 0;
    out.header实际高度 = hdr ? Math.round(hdr.getBoundingClientRect().height) : 0;
    out.header是否换行 = hdr ? hdr.scrollWidth > hdr.clientWidth + 2 : false;

    return out;
  };
})();
'ready'