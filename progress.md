# 进度日志（Progress Log）

## 会话：2026-11-17

### 阶段 1：需求与调研 — complete
- 理解 Grok 方案 + 用户补充；面向海外 → 英文 UI + mm/inch 双制。
- GitHub 调研：HomeStudio / CabKit3D / ArcaneSK / shelf-builder / morti。

### 阶段 2：规划与结构 — complete
- 方案：单文件 HTML + Three.js CDN importmap + 程序化几何，零构建。
- 决策写入 findings.md / task_plan.md。

### 阶段 3：实施 — complete
- 创建 `task_plan.md`、`findings.md`、`progress.md`。
- 创建 `index.html`：三栏布局、组件库、属性面板、3D 视口、BOM 表。
- 创建 `_serve.js`：本地静态服务器（node _serve.js → http://127.0.0.1:8765）。

### 阶段 4：测试与验证 — complete
- 用 ego lite 浏览器 + node 静态服务器验证。

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 首屏渲染 | 首次打开（清空 localStorage） | 显示默认单盆柜 | 通过，无控制台错误 | PASS |
| 添加组件 | 点击 “Double Basin Vanity” | 模块数 2 | 模块数 2 | PASS |
| 数值编辑 | width 输入 1600 | 模型与状态更新 | 1600 | PASS |
| 单位切换 | 点击 inch | 显示 55.12 in（1400mm） | 通过 | PASS |
| 视角切换 | Front / 3D | 按钮高亮、相机重取景 | 通过 | PASS |
| 撤销 | Ctrl/Undo | 宽度回到 1400 | 通过 | PASS |
| 五金应用 | 选中后点 “Bar Handle” | handle=bar | 通过 | PASS |
| 镜像柜添加 | 点击 “Mirror Cabinet” | 模块含 mirror，BOM 12 行 | 通过 | PASS |
| 控制台 | 全部交互 | 无 error/warning | 0 条 | PASS |

### 阶段 5：交付 — complete
- 产物：`index.html`（MVP）、`_serve.js`、三份台账。
- 运行：`node _serve.js` 后访问 `http://127.0.0.1:8765`。

## 错误日志
| 时间 | 错误 | 尝试 | 解决方法 |
|------|------|------|----------|
| 初稿 | `py+?` 语法错误（未使用的 addHandle） | 1 | 删除死代码 |
| 初稿 | commit() 未重建场景 → 3D 空白 | 1 | commit() 中调用 rebuildAll() |
| 初稿 | 读取 localStorage 后未重建场景 | 1 | boot 中 init() 后调用 rebuildAll() |
| 初稿 | 相机硬编码导致模型被裁切 | 1 | 按场景包围盒自动取景 |
| 环境 | `python` 不可用 | 1 | 改用 node 静态服务器 |
| 环境 | unpkg raw README 抓取失败 | 1 | 抓 GitHub 仓库页 |
| 环境 | 未找到 caveman skill（含 agent/skill 目录） | 1 | 按“精简输出”风格指令执行 |

## 会话：2026-11-17（第二轮 · 严苛自拷问 / 对标 SketchUp）

### 阶段 6：优化 — complete
严苛自拷问发现并修复的问题：

| # | 问题点 | 严重度 | 解决 |
|---|--------|--------|------|
| 1 | 滑杆每次 input 触发 renderProps 重建 DOM，拖动中断 | P0 | 拆分 live 更新与历史提交；oninput 只增量重建模型并同步标签，onchange 才提交历史 |
| 2 | 重建时几何/LED 材质不 dispose，内存泄漏 | P0 | disposeGroup + 材质缓存判定；LED 材质入缓存 |
| 3 | 撤销按像素粒度，一次拖动几十条历史 | P0 | 手势边界提交（change / 离散操作） |
| 4 | 抽屉与门同平面重叠，造型错误 | P0 | 互斥：设其一 >0 时另一个归零并同步 UI |
| 5 | 实时编辑不持久化，中途刷新丢工作 | P0 | setParam 中即时 save() |
| 6 | 无尺寸标注（SketchUp 核心能力） | P1 | 3D 宽/高/深标注线 + 标签 + Dims 开关 |
| 7 | 镜柜/台柜高度固定，不能自由挂装 | P1 | topHeight / bottomHeight 参数 |
| 8 | 多个组件自动排列会重叠、拖放随意 | P1 | autoX 递增排布；50mm 网格 + 边缘/墙吸附 |
| 9 | BOM 门宽未减缝隙、盆尺寸缺失、脚高错误 | P1 | 与几何公式对齐 |
| 10 | 视角硬编码导致模型裁切 | P1 | 按包围盒自动取景（含标注）+ Fit 按钮 |
| 11 | 无 Delete / Ctrl+D | P2 | 快捷键 |
| 12 | 无方案文件交换 | P2 | Save JSON / Open JSON / New |

验证结果：滑杆连续 input 后 DOM 仍连接（true）；一次手势一次撤销回到 900；抽屉/门互斥生效；标注显示 900/600/520 mm；Ctrl+D +1、Delete -1；inch 显示 35.43 in；控制台 0 错误。

## 会话：2026-11-17（第三轮 · 继续做）

### 阶段 7 — complete
| 功能 | 验证 |
|------|------|
| 重叠检测 | 两柜重叠 → banner “2 components overlap” + 红框，PASS |
| 旋转 90° | params.rot=90，按钮高亮，footprint 交换，PASS |
| X/Z 位置输入 | X=200 写回并重建，PASS |
| 3D 拖动 | pointerdown 命中→禁用 OrbitControls→move 更新 10mm 吸附→up 提交历史（代码路径） |
| GLB 导出 | 点击无控制台错误，PASS |
| 移动端抽屉 | Panels 三态循环 [左,右,无]，PASS |
| 移动端点选 | 命中组件自动开属性抽屉（代码路径） |
| 顶栏 | 小屏横向滚动 + 品牌 sticky |

验证：控制台 0 error；正常视角无黑边（强制改写 CSS 时的黑楔是瞬时 resize 假象）。

## 会话：2026-11-17（第四轮 · 全部建议项）

### 阶段 8 — complete
| 功能 | 验证 |
|------|------|
| 开合动画 | 按钮点击 → open=1、按钮变 "Close fronts"；截图中抽屉正在拉出，PASS |
| 双击开合 | dblclick → 选中 + toggle（代码路径） |
| 程序化贴图 | 15 个色块 swatch，台面显示石纹，控制台 0 错误，PASS |
| 多方案 | Save as → ["My Design","Test Design"]，下拉 2 项，切换成功，PASS |
| PWA | manifest content-type=application/manifest+json，SW 已注册，PASS |
| Electron | node --check main.js/_serve.js 通过，npm scripts 存在 |
| GLB（带贴图） | 点击无错误，PASS |

新增文件：README.md、manifest.webmanifest、sw.js、icon.svg、main.js、package.json。
台账更新至阶段 8。

## 会话：2026-11-17（第五轮 · 开孔 / 约束 / PBR）

### 阶段 9 — complete
| 功能 | 验证 |
|------|------|
| 台面真实开孔 | 截图确认盆嵌入台面孔中、龙头孔可见，PASS |
| 双盆 | basinCount=2 写入状态，BOM 增加开孔行，PASS |
| 约束求解 | width=450 + 4 抽屉 → “Drawer face 94 mm < 120 mm” + 双盆重叠共 2 条；点 Fix → 抽屉降到 2，剩 1 条，PASS |
| PBR 材质 | MeshPhysicalMaterial + normal/roughness map，13 种材质 swatch，PASS |
| PBR 微调 | tune.r=0.2 持久化，PASS |
| GLB（PBR） | 点击无错误，PASS |

修复错误：`fz` 重复声明（龙头孔变量改名 fzF）。
台账更新至阶段 9。

## 会话：2026-11-17（第六轮 · 品牌库 / PBR 资产 / 中文）

### 阶段 10 — complete
| 功能 | 验证 |
|------|------|
| 品牌库 | Kohler/TOTO/Roca/Hansgrohe 标签 + 12 套预设；点击预设载入 vanity+mirror 整套，PASS |
| My Templates | 保存当前设计为模板，PASS |
| PBR 资产 | 52 张 512px PNG（共 4.8MB），生成器零依赖；8 个纹理请求成功，材质切换后自动替换贴图，PASS |
| 中文支持 | EN/中文 切换，界面/属性/标签/约束/BOM/toast 全量翻译；zh→en 往返正常，localStorage 持久化，控制台 0 错误，PASS |

新增：tools/gen-textures.js、assets/textures/*（52 文件）、README 更新。

## 会话：2026-11-17（第七轮 · 品牌扩展 + 法律风险）

### 阶段 11 — complete
- 新增 GROHE / Dornbracht / Villeroy & Boch 三个品牌风格标签（共 8 个）
- 法律风险处置：把产品系列名（Neorest/Xilesa/Composed 等注册商标）改为通用风格名（Minimal 900/Cube 1000/Modern 900）
- UI 品牌区加中英双语免责声明；新增 LEGAL.md（风险分级表 + 发布前 checklist）
- 验证：8 个品牌标签 + 免责声明可见，控制台 0 错误
- 删除临时补丁脚本 _patch_brands.js

## 会话：2026-11-17/18（第八轮起 · 战略定案后的 A 阶段攻坚）

### 阶段 13：grill-me 战略拷问 — complete
- 五分支定案：市场=国内；模式=先 A（自己门店用）后 B（经销商 SaaS）；终端=纯 H5+PWA（留四空文件夹占位）；架构=单文件+依赖本地化；数据=localStorage；合规=B 阶段发布前再做
- 决策写入 findings.md / task_plan.md 并推送

### 阶段 14：GitHub 调研 + 无极选色 + compilePanels — complete（commit fc714c9）
- 调研结论：Furnish（MIT 中文单文件）、cabinet-studio、morti-app、CabKit3D；核心共识=一份设计文档→纯函数编译出网格/板材清单/BOM
- 无极选色：饰面/台面各加原生取色器，灰度纹理×自定义色保留木纹石纹；带重置按钮；色值随方案保存
- compilePanels()：纯函数 参数→板材清单；cabinetMetrics() 供几何与 BOM 共用，消灭图价不一致

### 阶段 15：Three.js 依赖本地化 — complete（commit dce8436）
- 4 个 CDN 依赖 + 1 个传递依赖（TextureUtils）下载到 web/vendor/，共 ~1.35MB
- importmap 改为 ./vendor/；验证 5 个本地文件 + 8 贴图、零外部请求、控制台 0 错误 → 国内白屏解决

### 阶段 16：安装语义约束 — complete（commit adca910）
- 墙是真实平面 z=-300；anchorZ 按各类型背面偏移算（镜柜 -D、柜体 -(D+20)/2、侧柜 -D/2）
- 镜柜/挂墙柜 z 锁死贴墙（只能左右拖）；落地柜 z 钳制 ≥ 贴墙值 → 不穿墙
- 统一经 clampZ：添加/预设载入/拖动/数值输入/改深度旋转安装方式全覆盖
- 顺带修复默认 pos.z=0 离墙 40mm 的缝

### 阶段 17：居中吸附 + 参考线 — complete（commit b5a9f2f）
- 拖动时中心 x 接近其他组件中心（阈值 40mm）→ 吸附到完全对齐
- 吸附时显示垂直虚线参考线，松开消失；与贴墙约束叠加
- 验证：595→600 吸附、300→不吸附、控制台 0 错误

### 阶段 18：标注系统对标 SketchUp — complete（commit 待推送）
- 参考桌面 R-C.jpg（SketchUp 标注）重做：箭头端点、文字直接贴线、透明底+白描边（去掉方块）
- 标注更详细：台面宽/柜体宽/柜体高/总深/安装高度/抽屉面宽/盆直径/门数/层板间距
- 引线标注（盆径、门数等）用折线+文字
- 验证：39 个图元（32 线 + 7 文字精灵），控制台 0 错误，无临时代码残留
- 调整：文字改近黑 #141414 粗体（700 32px）+ 细白描边，尺寸线改 #222222（对标 SketchUp 黑字黑线，提升对比度）

## 工作规范（用户要求，2026-11-18）
- **每次改完功能/做完修改后：先记录台账，再关闭所有旧版本浏览器标签页，只留最新一个**
- 旧标签页不保留，避免混淆
- git push 遇 DNS 抖动：临时 pin hosts `20.205.243.166 github.com`（elevated copy），push 后还原

## 五问重启检查
| 问题 | 答案 |
|------|------|
| 我在哪里？ | 阶段 17 complete，A 阶段网页功能基本齐备 |
| 我要去哪里？ | A 阶段下一步：门店实测出图报价流程；B 阶段暂缓 |
| 目标是什么？ | 国内市场，先 A（门店工具）后 B（经销商 SaaS） |
| 我学到了什么？ | 见 findings.md |
| 我做了什么？ | 见上方记录 |
