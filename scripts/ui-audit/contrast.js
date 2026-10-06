/**
 * 对比度审计：遍历页面上所有可见文本，算实际前景/背景对比度。
 *
 * 为什么必须实测而不是看 CSS 猜：
 * - 好几处文字落在继承来的背景上（fieldset / band / figure），猜不出来
 * - 半透明和嵌套叠加会让"看起来是深色"的东西实际不是
 * WCAG AA：正文 4.5:1，大号文字（≥18.66px 粗体或 ≥24px）3:1。
 */
window.__contrast = (() => {
  const lum = (rgb) => {
    const f = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const parse = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
  };
  const ratio = (f, b) => {
    const L1 = lum(f), L2 = lum(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  };

  /** 往上找到第一个不透明背景 */
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.95) return c.rgb;
      n = n.parentElement;
    }
    return [0, 0, 0];
  };

  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.3) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    // 祖先里有 hidden 的也不算
    for (let p = el; p; p = p.parentElement) {
      if (getComputedStyle(p).display === 'none') return false;
    }
    return true;
  };

  return function run() {
    const bad = [];
    const all = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();

    let n;
    while ((n = walker.nextNode())) {
      const t = n.nodeValue.trim();
      if (!t) continue;
      const el = n.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      if (!visible(el)) continue;

      const s = getComputedStyle(el);
      const fg = parse(s.color);
      if (!fg) continue;
      const bg = bgOf(el);
      const r = ratio(fg.rgb, bg);
      const size = parseFloat(s.fontSize);
      const weight = Number(s.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const need = large ? 3 : 4.5;

      const item = {
        文本: t.slice(0, 24),
        字号: size,
        字重: weight,
        前景: `rgb(${fg.rgb.join(',')})`,
        背景: `rgb(${bg.join(',')})`,
        对比度: +r.toFixed(2),
        需要: need,
        通过: r >= need,
        位置: el.className || el.tagName,
      };
      all.push(item);
      if (!item.通过) bad.push(item);
    }

    // 去重：同一位置+对比度只报一次
    const uniqBad = [];
    const sig = new Set();
    for (const b of bad) {
      const k = `${b.位置}|${b.对比度}`;
      if (sig.has(k)) continue;
      sig.add(k);
      uniqBad.push(b);
    }

    return {
      扫描文本节点: all.length,
      不合格: uniqBad.length,
      明细: uniqBad.sort((a, b) => a.对比度 - b.对比度),
      最低几个: all.sort((a, b) => a.对比度 - b.对比度).slice(0, 8)
        .map((x) => `${x.对比度} 需${x.需要}  ${x.字号}px  "${x.文本}"`),
    };
  };
})();
'ready'