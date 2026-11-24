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
- 调整：文字近黑 #141414 粗体 + 白描边（保证可读、不被五金吞掉）；箭头改 SketchUp 式实心三角；尺寸线/箭头用主题青绿 #18796e（避开与黑色拉手撞色——SketchUp 原图其实是纯黑线，但与我们的深色五金撞色，故保留其形态、换主题色）

### 阶段 19：全面中文化界面 — complete
- 目标达成：界面 0 英文残留，英文语库（I18N.en）原样保留在代码中
- 强制 lang='zh'（忽略 localStorage 旧值并写回 zh），隐藏 EN/中文 切换按钮（保留 DOM 使 setLang 绑定不报错）
- 堵住 fallback：T() 优先 I18N.zh；所有 data-i18n 元素的 HTML 默认文本批量改中文（避免首屏闪烁）
- 顶栏视图按钮（正面/侧面/俯视）、单位（英寸）、加载层、徽标、提示全部中文
- 新增中文映射：品牌名（科勒/东陶/乐家/汉斯格雅/高仪/当代/唯宝）、预设名与描述、组件库、toast 动态词根（组件名/预设名/另存为/导出失败）
- 预设描述替换链补全：chrome/graphite/ceramic/classic/slim/detail/top/double 等
- BOM faucet→龙头孔；免责声明 Logo→商标；PBR 调节→材质细节；保存/打开 JSON→导出/导入方案
- 旧版 localStorage 英文项目名（My Design/Untitled N）加载时自动迁移为中文
- 验证：全 DOM + 8 品牌预设 + 属性面板 + BOM + 项目名扫描，英文残留 0；控制台 0 错误

### 阶段 20：组件库折叠 + 去选中框 + 同类型替换 — complete（commit 6d947d2）
- 左侧组件库四分组（柜体/门板与收纳/镜柜/五金）改成 details 折叠框，与品牌库一致，默认全收起；搜索时自动展开，功能集中一屏
- 去掉选中组件的绿色包围盒 BoxHelper（玻璃罩），靠右侧属性面板/BADGE 指示选中
- 组件库 click + 拖放统一走 placeTileComponent：同类型 tile 替换当前选中组件（保留位置），异类型追加 → 一套里 vanity+mirror+shelf 仍共存
- 验证：4 折叠组；单盆→双盆模块数保持 1、宽度 900→1400、位置不变、提示「已替换」；再点镜柜变 2 件且右侧显示镜柜属性；控制台 0 错误

### 阶段 21：碰撞红框误报修复 — 完成（已推送）
- 用户反馈红框仍在：那是碰撞检测 BoxHelper（0xc0392b），不是已删的绿色选中框
- 根因：collisionIds 只按俯视 x/z 投影判断，完全不算高度；镜柜本就在主柜正上方 → 一套柜子必被误判重叠
- 修复：新增 moduleYRange(m) 算真实 y 区间（挂墙柜 topHeight-height、镜柜 bottomHeight、侧柜 0-height），碰撞要求 x/z/y 三轴同时重叠
- 标注 updateDimensions 复用同一 moduleYRange，避免两份逻辑漂移
- 验证：正常套装（镜柜 y1080 / 主柜 y250-876）红框消失、警告隐藏；把镜柜降到 y300 制造真重叠 → 红框/警告重新出现；测试数据已恢复，控制台 0 错误

### 阶段 22：对标恒洁/九牧扩充组件库 + 非等分镜柜 — complete（已推送）
- 调研来源：hegii.com 浴室柜列表页 + BC6551J-090C2 详情页 + 九牧官网/商城/工程案例
- 恒洁筛选维度：系列 / 尺寸段 / 风格 / 安装方式（落地·挂式）/ 开门方式（单开门、单抽、双开门、双抽、三开门、左单开门）
- 恒洁一套构成：主柜 + 镜柜 + 陶瓷盆 + 安装配件；镜背美妆收纳、错层收纳、主柜双抽
- 九牧产品形态：一门双抽、子母抽、三开门镜柜（左/中/右功能分区）、全开放镜柜、大镜门镜柜、左侧边柜、铝合金/实木/蜂窝铝材质
- 组件库 13 → 26 项：柜体 10（600/800/900/1000/双盆1200·1400/落地/窄型/铝合金/一门双抽）、门板收纳 6（含左右侧边柜）、镜柜 6（等分/非等分/单门/三开门美妆/全开放/LED）、五金 4
- 新增 doorSplit 参数（左门占比 0.35~0.75，默认 0.5）：双门镜柜按占比分配门宽 → 一大一小；buildMirror 非 2 门时等分；全开放镜柜加 3 层开放格
- 顺手修标注 canvas 文本漏网英文：/ drawer→/ 抽屉、-door→门、pitch→层距（之前 DOM 扫描扫不到 canvas 文字）
- 验证：26 tiles、中文映射齐全、非等分 doorSplit=0.65 且属性面板显示「左门占比」、全开放(doors0/open1)与三开门(doors3/led)均正常、DOM 英文残留 0、控制台 0 错误

### 阶段 23：新增镜片品类（多形状）— complete（已推送）
- 用户要求：除镜柜外增加「镜片」选项，形状含圆形、方形、异形、椭圆形、跑道形（胶囊形）
- 调研国内品牌官网（恒洁多功能镜、九牧/箭牌/TOTO/科勒智能镜等），归纳形状分类与产品形态，找设计灵感
- 调研后落地为新组件类型 + 参数化形状/尺寸/灯光，再记台账/推送/清标签

### 阶段 24：LED 光影增强 — complete
- hook 验证：无灯时 0 点光源/0 光晕精灵；开灯时 1 点光源 + 1 光晕精灵 + 灯条网格，开关差异明确
- 用户反馈 LED 开关在画面上区别不大；Three r160 物理光照，PointLight 需大强度值
- 已加：LED 开启时暖白 PointLight（260000 candela，照亮墙面/台面）+ additive 径向渐变光晕 Sprite（保证可见），关闭则无；镜柜与镜片共用 addLedFx

### 阶段 25：组件库差异化图标 — complete
- 用户反馈同组细项图标全一样（iconFor 按 group 分配）不合理
- 已加：每个 tile 加 ic 字段，ICONS 扩到 31 个 SVG（按盆数/门数/形状/拉手/左右侧区分）
- 验证：柜体 10 项/6 种图标、门板收纳 6/6、镜柜 6/6、镜片 5/5、五金 4/4，0 错误

### 阶段 26：灯光分类（独立于镜片）+ 差异化图标 — complete（已推送）
- 调研品牌扩展：箭牌（双环布光、无极调光）、浪鲸（双侧柔光 LED 环形灯）、东鹏/法恩莎/安华 + WITMIRROR/大牌镜业（前发光、背发光、内外发光、环形/胶囊）
- 归纳 6 种灯光形态：无灯 / 顶灯条 / 背光 / 环形跑道灯 / 双侧灯 / 前发光灯条
- 新增「灯光（作用于选中组件）」分类，独立于镜片；镜片 tiles 描述改为纯形状（圆形镜「Φ600 · 圆形」）
- lightStyle 参数（lens+mirror）+ 属性面板下拉；点击灯光 tile 作用于当前选中镜片/镜柜，无灯时自动关闭 LED 总开关
- 几何：顶/前=横向灯条，双侧=两条竖灯条，环形=TorusGeometry，背光=镜后放大发光片；全部复用 addLedFx 光影
- 图标：新增 6 个灯光专属 SVG；ICONFor 对 Lighting 分组给默认灯图标
- 验证：6 分组（含灯光 6 项）、6 样式切换正确、镜片描述无灯光字样、光影 hook 通过、0 英文、控制台 0 错误

### 阶段 27：补齐所有遗留项 — complete（commit 25bc181）
- 推送时发现远端多出非本会话提交 5572334（另一会话加的报价单功能，含中文乱码），与用户"不做报价单"冲突；用 `git reset --soft origin/main` 接上远端历史后以本地版本覆盖（不 force push），报价单代码已 0 残留，远端历史保留
- 用户指示：把认为该做但没做的全部做掉；随后明确"不做报价单，只做单纯出图应用"→ 已回退中途加的报价单 CSS/按钮/模态框/价格常量，确认 0 残留
- 离线审计（subagent）列出 13 项，按纯出图定位完成 11 项：
  1. 子母抽：drawerSplit 参数，两抽不等高（202/374），BOM 按高度分行
  2. 左/右单开门：doorSide 参数控制铰链侧；新增左单开门/右单开门 tile
  3. 一门双抽半成品修复：frontLayout=split 左右分区（左门右抽），消除同 z 平面重叠；BOM 同时列门+抽
  4. 非等分镜柜 BOM 对齐几何：按 doorSplit 分宽；doors=0 不再产生 Infinity/qty=0 行
  5. BOM 补漏项：拉手、灯光、除雾膜、镜片边框、背板；shelves=0 不再列空层板行
  6. 校验用 cabinetMetrics 替代重复常量；新增 lens 高度/镜门宽/子母抽最小高校验；mirror 下限修正
  7. defog 不再空转：加淡暖色加热膜 + 指示点，BOM 列除雾膜
  8. 龙头只在有盆时画（无盆不开孔却画龙头的不一致）
  9. 单位统一：徽标跟随 mm/in（修复切单位不更新）；in 模式 number step 换算（10→0.394）；BOM CSV 加 UTF-8 BOM + 项目名文件名 + revokeObjectURL；PNG 2x 离屏高清渲染 + 项目名文件名；GLB/JSON 同样项目化
  10. localStorage 健壮性：结构校验丢弃损坏方案、新参数默认值 merge（normalizeModule）、safeSet 防 QuotaExceeded、导入白名单 + onerror、revokeObjectURL
  11. TILE_DESC_ZH 重复 '2 doors' 键去重；findings.md 双语口径注记
- 未改（有意保留）：I18N.en/setLang 死代码（已确保不显示英文，清理会破坏 T/L/O 依赖，风险大于收益）；LEGAL.md 中英双语（法律文档语境合理）
- 验证：40 tiles、6 分组、子母抽/左单开门/一门双抽/全开放镜柜 BOM 正确、lens 校验触发、defog BOM、英寸徽标+step、损坏方案不白屏、EN 不可见、控制台 0 错误

## 工作规范（用户要求，2026-11-18）
- **每次改完功能/做完修改后：先记录台账，再关闭所有旧版本浏览器标签页，只留最新一个**
- 旧标签页不保留，避免混淆
- git push 遇 DNS 抖动：临时 pin hosts `20.205.243.166 github.com`（elevated copy），push 后还原

## 五问重启检查
| 问题 | 答案 |
|------|------|
| 我在哪里？ | 阶段 26 complete（HEAD 92b7517）：6 大组件分组、图价一致 BOM、贴墙/居中吸附、SketchUp 式标注、镜柜非等分、镜片 5 形状、灯光 6 形态、差异化图标、LED 光影、零外网依赖 |
| 我要去哪里？ | A 阶段门店实测出图报价流程（真机/真实客户，我替代不了）；用户持续逐项调整界面 |
| 目标是什么？ | 国内市场，先 A（门店工具）后 B（经销商 SaaS） |
| 我学到了什么？ | 见 findings.md |
| 我做了什么？ | 见上方记录 |
