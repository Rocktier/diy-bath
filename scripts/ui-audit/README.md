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

## 焦点环的优先级陷阱

`.row input:focus` 和 `.row input:focus-visible` 优先级**相同**（都是 `(0,2,1)`），
后写的赢，于是 `:focus` 里的 `outline:none` 把 `:focus-visible` 的焦点环抹掉了。
CSS 读起来完全正常，只有实测才能发现。
`index.html` 里用 `:focus:focus-visible`（`(0,3,1)`）压住了，别改回去。