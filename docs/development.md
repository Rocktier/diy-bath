# 开发环境

本项目的构建只需要两个东西，**都在 Windows 自带或一行命令能装**：

| 工具 | 版本 | 用途 | 本机路径 |
|---|---|---|---|
| Node.js | ≥ 20（实测 26.7） | 前端构建、跑测试 | 系统 |
| Rust | ≥ 1.90（实测 1.98） | 编译 exe | `C:\Users\Dang\.cargo` |

Tauri 在 Windows 上还需要这两项**已经被自动处理**，一般不用管：

- **WebView2 Runtime**。Win10/11 自带。若目标机器没有，
  安装包会自动附带引导（`bundle.windows.webviewInstallMode`）。
- **MSVC Build Tools**。编 Rust 需要 link.exe。装了
  Visual Studio 的 Build Tools 即可，只要选「使用 C++ 的桌面开发」。
  本机在 `F:\deps\vsbuildtools`。

## 换机器时

```bash
git clone https://github.com/Rocktier/diy-bath.git
cd diy-bath
npm ci
```

`npm ci` 会按 `package-lock.json` 精确还原依赖版本。

如果 `npm ci` 卡在 esbuild 的 postinstall 被拦（npm 11 的新安全门）：

```bash
npm install-scripts approve esbuild
npm rebuild esbuild
```

## 日常命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 前端开发服务器（浏览器里看，改完刷新即可） |
| `npm run tauri:dev` | **桌面应用**开发模式，改完 Rust 部分会热重载 |
| `npm test` | 跑全部单元测试 |
| `npm run test:watch` | 测试监听模式，改代码自动重跑 |
| `npm run test:coverage` | 带覆盖率报告 |
| `npm run tauri:build` | 出安装包 → `src-tauri/target/release/bundle/nsis/` |

## 架构分层

依赖方向单向，下层不得 import 上层：

```
app.js  →  render.js  →  project.js  →  parts.js  →  solve.js  →  spec.js
                                ↑
                            annotate.js
```

`app.js` 是**唯一**操作 DOM 的文件。下层全部是无 DOM 依赖的纯函数，
所以测试能在 Node 里直接跑，不需要浏览器。

## 两个必须守住的约定

### 1. `render.js` 里的 `num()` 遇到非有限数必须抛错

坐标算错时 SVG **不会报错**，只会画不出来——浏览器静默忽略非法坐标。
`num()` 抛错把「静默失败」变成「测试失败」。别把它改成静默跳过。

### 2. 表单里不许出现 `min` / `max`

这是定制业务，不是卖成品。深度要按客户家的墙体定，高度也不该被
「盆上沿离地 850mm」这种人体工学 guideline 反推——那会打乱工厂的开料习惯。

所以：全部尺寸是自由数字输入框，没有档位、没有下限上限、
不会弹「这个尺寸不标准」的警告。**不要加校验库。**

## 代码签名

本地 exe 默认**未签名**，双击会有 SmartScreen 蓝色窗口（Windows  Defender 提示）。
这只影响观感，不影响使用。

开发期想消掉这个提示，可以生成一张自签名证书：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/make-dev-cert.ps1
```

脚本会打印证书指纹和签名命令。**私钥口令写在脚本里，只适合开发机。**
`.gitignore` 已排除 `*.pfx` / `*.p12` / `*.cer`，证书不会进仓库。

面向公众分发需要买 OV 代码签名证书（约 2000-5000 元/年），
在 `release.yml` 里加一步 `tauri-action` 的 `signing` 配置。
注意 CI 里不要放私钥，用 GitHub Secrets。