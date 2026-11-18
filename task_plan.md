# 任务计划：VanityLab 参数化浴室柜画图工具

## 目标（Goal）
做一个轻量参数化浴室柜 3D 画图工具。** 战略修正（grill-me 后）**：国内市场优先，先跑通 A（自己门店出图报价），再叠 B（经销商 SaaS）。Web 先行。

## 下一步（Next Step）
A 阶段门店实测出图报价流程（真机/真实客户验证）。B 阶段暂缓，触发条件：A 跑通 + 出现导购共享方案需求。

工作规范：每次改完功能先记台账，再关旧标签页只留最新一个。

## 当前阶段（Current Phase）
阶段 21：碰撞红框误报修复（已完成）

碰撞检测改为三轴重叠；套装（镜柜在主柜上方）不再误报。

仓库：https://github.com/Rocktier/diy-bath 。A 阶段网页功能基本齐备：参数化柜体、真实开孔、PBR 贴图、无极选色、图价一致 BOM、贴墙/居中吸附、本地化依赖（零外网）。
结构：根目录放三本台账 + README；`web/` 放网页应用；`android/`、`ios/`、`macos/`、`windows/` 各留 `.gitkeep` 占位。

## 阶段（Phases）

### 阶段 1：需求与调研 — complete
- [x] 理解用户意图（Grok 方案 + 用户补充）
- [x] 确定面向海外用户 → UI 英文、单位双制
- [x] GitHub 参考项目调研
- [x] 发现写入 findings.md

### 阶段 2：规划与结构 — complete
- [x] 技术方案：单文件 HTML + Three.js CDN + 程序化几何
- [x] 确定 MVP 范围与组件库
- [x] 决策写入 findings.md / task_plan.md

### 阶段 3：实施 — complete
- [x] 写 task_plan / findings / progress 三个台账
- [x] 写 `index.html`（UI 骨架 + Three.js 场景 + 参数化柜体）
- [x] `_serve.js` 本地静态服务器

### 阶段 4：测试与验证 — complete
- [x] 浏览器验证：渲染、添加、数值、单位、视角、撤销、五金、BOM
- [x] 测试结果记录到 progress.md

### 阶段 5：交付 — complete
- [x] 检查产物、说明运行方式

### 阶段 14–17：A 阶段网页攻坚 — complete
- 14：GitHub 调研 + 无极选色 + compilePanels（图价一致）
- 15：Three.js 依赖本地化（零外网，解决国内白屏）
- 16：安装语义约束（镜柜贴墙锁 z、落地不穿墙）
- 17：居中吸附 + 垂直参考线

### 阶段 13：grill-me 战略拷问 — complete
- [x] 五分支定案：市场=国内；模式=先A后B；终端=H5+PWA（留四文件夹占位）；架构=单文件+依赖本地化；数据=localStorage；合规=B 阶段再做
- [x] 决策写入 findings.md / task_plan.md

### 阶段 12：多端仓库结构 + 远端推送 — complete
- [x] 三本台账留在仓库根目录
- [x] 网页应用移入 `web/`；保留 `README.md` 说明多端结构
- [x] 新建 `android/` `ios/` `macos/` `windows/` 占位目录（.gitkeep）
- [x] 清空远端旧内容并 force-push 新结构（DNS 刷新后成功）

### 阶段 11：品牌扩展 + 法律风险规避 — complete
- [x] 新增 GROHE / Dornbracht / Villeroy & Boch，品牌标签共 8 个
- [x] 产品线型号名（Neorest/Xilesa/Composed 等）全部改为通用风格描述名
- [x] UI 双语免责声明 + LEGAL.md 风险清单与发布前 checklist

### 阶段 10：品牌库 / PBR 贴图资产 / 中文支持 — complete
- [x] Kohler / TOTO / Roca / Hansgrohe 共 12 套参数化造型预设，整套载入
- [x] My Templates：当前设计保存为可复用模板
- [x] 52 张 512px PBR 贴图资产（albedo/normal/roughness/AO）+ 零依赖生成脚本
- [x] 桌面端自动加载贴图，移动端回退程序化；uv2 支持 AO
- [x] EN / 中文 双语切换：界面、属性、选项、约束、BOM、提示、toast 全部本地化

### 阶段 9：真实开孔 / 约束求解 / PBR 材质库 — complete
- [x] ExtrudeGeometry + holes：台面盆孔、龙头孔真实切割，单盆/双盆
- [x] 一体盆改为嵌入碗体（开口圆柱 + 底）
- [x] 约束求解：抽屉/门最小宽、盆宽、双盆间距、龙头孔位、挂装高度、层板间距；带 Fix 自动修复
- [x] PBR：Sobel 法线图 + roughness map + MeshPhysicalMaterial + clearcoat
- [x] 材质库扩至 13 种（新增黄铜/混凝土/水磨石），逐组件 Roughness/Metalness/Clearcoat 微调
- [x] BOM 增加开孔行

### 阶段 8：开合动画 / 程序化贴图 / 多方案 / 桌面打包 — complete
- [x] 抽屉拉出 + 柜门旋转开合（按钮 / 双击），参数持久化
- [x] 程序化 Canvas 纹理（木纹/石材/烤漆）+ 色块材质选择器
- [x] 多方案管理：新建/另存/重命名/删除/切换，方案存 localStorage
- [x] PWA：manifest + service worker + icon，导航 network-first
- [x] Electron：main.js + package.json + 打包脚本
- [x] README.md 运行说明

### 阶段 7：碰撞 / 移动 / 旋转 / 导出 / 移动端 — complete
- [x] 重叠检测：红框 + 顶部警告，随拖动实时更新
- [x] 位置编辑：X/Z 数值输入 + 3D 直接拖动（10mm 吸附）
- [x] 旋转：0/90/180/270，footprint 随之交换
- [x] GLB 导出（GLTFExporter）
- [x] 移动端：抽屉三态切换、点选自动开属性、顶栏横向滚动

### 阶段 6：对标 SketchUp 严苛优化 — complete
- [x] 严苛自拷问，定位 12+ 问题点
- [x] 修复滑杆拖动被 DOM 重建打断
- [x] 修复几何/材质内存泄漏
- [x] 撤销栈按手势合并（非逐像素）
- [x] 抽屉/门互斥，避免造型重叠
- [x] 增加尺寸标注（宽/高/深）+ Dims 开关
- [x] 增加安装高度、Fit 取景、50mm 网格与边缘吸附
- [x] 修正 BOM 与几何不一致
- [x] 增加 Delete / Ctrl+D、JSON 保存/打开/新建
- [x] 实时编辑即时持久化

## 关键问题（Key Questions，已按第一性原理自行决策）
1. 框架？→ 初稿用原生 Three.js 单文件，零构建；后期可迁 R3F/Vite。
2. 单位？→ mm / inch 双制切换，内部统一 mm。
3. 用户语言？→ 英文 UI（海外用户）。
4. 模型来源？→ 全部程序化生成，不依赖外部 GLB，保证轻量。
5. 组件库范围？→ MVP：主柜 / 抽屉 / 门板 / 拉手 / 台面 / 盆 / 镜柜 / 开放格 / 材质。

## 已做决策（Decisions Made）
| 决策 | 理由 |
|------|------|
| 单文件 HTML + CDN importmap | 零构建、低门槛、易分发，符合“精巧” |
| 程序化几何（Box/RoundedBox） | 轻量、移动端友好、参数驱动 |
| 数值输入优先 + 智能默认值 | 浴室柜对尺寸敏感，比拖拽更精准 |
| 借鉴 HomeStudio 的 panel IR | 同一份数据驱动 3D 与 BOM |
| localStorage 自动保存 | 无后端也能保存方案 |

## 遇到的错误（Errors Encountered）
| 错误 | 尝试次数 | 解决方法 |
|------|----------|----------|
| raw.githubusercontent.com 抓取失败 | 1 | 改用 github.com 仓库页抓取 README |
| 环境中未找到“caveman”工具/技能 | 1 | 理解为“精简输出”风格指令，直接遵照 |

## 备注（Notes）
- 阶段状态：`pending` → `in_progress` → `complete`。
- 重大决策前重读目标与下一步。
- 错误及时记录，避免重复失败路径。
