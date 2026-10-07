# 界面审计脚本

依据 [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) 的
「Developer Tool / IDE」规则与 Pre-Delivery Checklist 写的自查脚本。

这些检查**看 CSS 是看不出来**的：对比度要实际渲染才知道、
label 关联要看无障碍树才知道、`prefers-reduced-motion` 有没有写只有数一遍才知道。
本项目没有浏览器测试框架，所以做成「在页面里跑一次」的形式，零依赖。

## 怎么跑

```powershell
npm run build
npm run preview            # 另开一个终端
```

打开 <http://localhost:4173/>，然后把对应脚本整个拖进 DevTools 控制台回车。

或者用 Node 把脚本内容读出来贴进去。跑完删掉注入的脚本再关窗口即可
（它们不会进安装包，但别忘了 `npm run build` 会清空 `dist/`）。

| 脚本 | 粘什么 | 看什么 |
|---|---|---|
| `contrast.js` | 粘贴后执行 `__contrast()` | 全页可见文本的实际对比度。AA 要求正文 4.5:1、大字 3:1 |
| `a11y.js` | 粘贴后执行 `__a11y()` | 焦点可见性、`reduced-motion`、`color-scheme`、等宽数字、点击目标尺寸、`aria-label`、死 id |
| `acceptance.js` | 粘贴后执行 `await __acc()` | 15 条功能验收清单（含三种手势的像素指纹比对） |

## 两个已知的误报

写脚本时踩到的，记下来免得下次又被带偏：

1. **`contrast.js` 会把 SVG 里的文字算成不合格。**
   它沿 DOM 父链找 `background-color`，但图纸的白底是 SVG 内部的
   `<rect fill="#f4f4f2">` 画的，脚本认不出来，
   于是拿「白底 + 深灰字」去算……实际上它算的是 `figure` 的白底配上
   `<text>` 的 `fill`，而 `fill` 是 `#333333` 不是 `rgb(233,231,228)`。
   结果报出一个根本不存在的 1.23:1。
   **判断方法**：看 `位置` 字段，空的或 `{}` 就是 SVG 元素，手动核对 `fill` 属性。

2. **`a11y.js` 的「可能无焦点样式」不可信。**
   它读的是非聚焦态的计算样式，`:focus-visible` 只在键盘交互时匹配，
   而脚本用程序化 `.focus()` 触发——那根本不匹配，于是全员报「无焦点样式」。
   **判断方法**：用真实 Tab 键走一遍再看。本项目最后一次实测是
   真实点击 + Tab，30 个可聚焦元素全部拿到金色焦点环。

3. **有 `transition` 时会读到动画中间帧。**
   本项目 `.btn` 有 `transition: background 150ms`，切换视图页签后立刻读
   `getComputedStyle`，拿到的是正在过渡的值——
   实测出现过「选中的页签是透明的、没选中的反而是金色」这种
   高亮完全颠倒的读数，稳定后一切正常。
   **判断方法**：改完界面等 400ms 再读。差点照着这个假象去改 CSS。

4. **⚠️ 桌面窗口不可见时，`getComputedStyle` 和 canvas 取像素都不可信。**
   这是最容易把人带进沟里的一条，务必先看：

   | 观察到的 | 实际情况 |
   |---|---|
   | `getComputedStyle` 返回过期值 | 给元素加内联 `!important` 背景，读回来还是旧值——合规浏览器不可能这样 |
   | `drawImage(webglCanvas)` 指纹不变 | 改参数、换预设、`window.resize` 全都纹丝不动，而 resize 必然触发重绘 |

   但同一时刻 `classList.contains('on')` 读到的是**更新后的正确值**，
   说明 DOM 是活的，只有样式解析与合成出帧是停的。

   **判断方法**：先跑一次 `window.dispatchEvent(new Event('resize'))` 再取画布指纹。
   指纹若仍不变，说明这个环境测不出画面，别再往下查了。

   **替代方案**：`scripts/ui-audit/acceptance.js` 的手势检查已改用
   「导出 PNG」那条路做指纹（`snapshot()` 内部 `render()` + `toDataURL()`），
   强制回读、不依赖合成器。同一段手势代码在旧测法下测不出任何东西，
   换掉之后五种状态（开局/旋转/缩放/平移/重置）指纹互不相同。

   对比度也别信 `getComputedStyle`：直接按 CSS 里的色值手算。
   本项目页签选中态 `#1a1a1a` 压 `#c9a227` 是 7.1:1、未选中
   `#e9e7e4` 压 `#111419` 是 14.8:1，都远高于 AA。

5. **跑 `acceptance.js` 前要先刷新页面。**
   折叠状态在**加载时**就从 `localStorage` 读进 DOM 了，
   脚本里那句 `localStorage.removeItem('diy-bath:open-groups')`
   只能清掉存储、清不掉已经渲染出来的展开态。
   上一轮点过「全部展开」的话，第 13.3 条「默认只展开一组」就会假失败。
   **判断方法**：`刷新 → 直接跑脚本` 应该是 22/22。

   顺带修掉一个同源的脚本 bug：第 9 条为了点得到「分格」里的输入框
   把该组展开了却没收起，导致后面的 13.3 条必然失败——
   看着像界面回归，其实是脚本自己造的脏状态。已在第 9 条末尾补 `grp.open = false`。

## 焦点环的优先级陷阱

`.row input:focus` 和 `.row input:focus-visible` 优先级**相同**（都是 `(0,2,1)`），
后写的赢，于是 `:focus` 里的 `outline:none` 把 `:focus-visible` 的焦点环抹掉了。
CSS 读起来完全正常，只有实测才能发现。
`index.html` 里用 `:focus:focus-visible`（`(0,3,1)`）压住了，别改回去。