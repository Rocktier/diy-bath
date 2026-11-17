# VanityLab — 参数化浴室柜画图工具

轻量、跨端、参数驱动的浴室柜 3D 设计器。Web 先行，内部统一 mm（可切 inch），**支持中英双语切换**。

## 运行

### 网页版
```bash
node _serve.js
# 打开 http://127.0.0.1:8765
```
`index.html` 也可直接双击打开（需联网加载 Three.js CDN；部分浏览器会限制 file:// 的 ES Module，推荐用上面的本地服务器）。

### 桌面版（Electron）
```bash
npm install
npm start
# 打包：npm run build:win / build:mac / build:linux
```

### PWA
通过本地服务器访问后，浏览器地址栏可“安装应用”；`sw.js` 提供离线回退，导航优先走网络以便及时看到更新。

## 功能
- 风格参考库：Kohler / TOTO / Roca / Hansgrohe / GROHE / Dornbracht / Villeroy & Boch 通用风格预设（整套柜 + 镜柜），可保存自定义模板。品牌名仅作风格参考——见 [LEGAL.md](LEGAL.md)
- 组件库：单盆/双盆/窄柜、抽屉柜、门柜、镜柜、开放格
- 参数化：宽/深/高、抽屉数、门数、拉手、盆型、挂墙/落地、安装高度
- 3D：旋转/缩放/平移、前三视图、自动取景（Fit）、尺寸标注开关
- 造型工艺：抽屉拉出 / 柜门开合动画（按钮或双击组件）
- 材质：10 种程序化纹理（木纹、石材、烤漆等）色块选择
- 编辑：3D 直接拖动、X/Z 数值定位、0/90/180/270 旋转
- 开孔：台面按盆位/龙头孔真实切割（Shape + holes 挤出），支持单盆/双盆
- 校验：组件重叠红框 + 约束求解（抽屉/门最小尺寸、盆宽、孔位、挂装高度、层板间距）与一键自动修复
- 材质：程序化 PBR（base color / normal / roughness / clearcoat），13 种预设 + 逐组件 PBR 微调
- 渲染级贴图资产：`assets/textures/` 内 52 张 512px PBR 贴图（albedo/normal/roughness/AO），桌面端自动加载、移动端回退程序化；`node tools/gen-textures.js` 可重新生成（SIZE=1024 可调）
- 语言：顶栏 EN / 中文 切换，界面、属性、约束提示、BOM 均本地化
- 方案：多方案管理（新建/另存/重命名/删除/切换）、JSON 导入导出、localStorage 自动保存、撤销重做
- 导出：PNG 截图、BOM CSV（含开孔）、GLB 模型

## 文件
| 文件 | 作用 |
|------|------|
| `index.html` | 应用主体（单文件） |
| `_serve.js` | 零依赖本地静态服务器 |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | PWA |
| `main.js`, `package.json` | Electron 桌面打包 |
| `tools/gen-textures.js`, `assets/textures/` | PBR 贴图生成脚本与资产 |
| `BRANDS` 预设（index.html 内） | 品牌模型库 |
| `task_plan.md`, `findings.md`, `progress.md` | 规划台账 |

## 已知边界
- 无高级约束求解（如台面与墙的真实开孔）
- 无渲染级材质（仅程序化纹理，无 PBR 贴图库）
- 移动端为响应式适配，尚未真机逐机型验证
