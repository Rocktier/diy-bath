/**
 * 把版本号同步到四处：package.json / tauri.conf.json / Cargo.toml / Cargo.lock。
 *
 * 用法：node scripts/sync-version.mjs 0.3.0
 *
 * 为什么不用 PowerShell 的正则一行搞定：
 * 原来的写法是 `$lock -replace '(?m)^version = ".*"$', "version = \`"$tag\`""`，
 * 那个正则匹配 Cargo.lock 里**每一行** version，会把全部几十个 crate 的版本
 * 一起改成应用版本号——tauri 也从 2.12.1 变成了 0.3.0，
 * 于是 Tauri CLI 报「tauri (v0.3.0) : @tauri-apps/api (v2.12.1) 版本不匹配」，
 * Release 工作流从上线起就没成功发布过。
 *
 * 现在只按包名精确定位，改完再核对一遍。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const NEXT = process.argv[2];
if (!NEXT) {
  console.error('用法：node scripts/sync-version.mjs <版本号>');
  process.exit(1);
}
if (!/^\d+\.\d+\.\d+$/.test(NEXT)) {
  console.error(`版本号格式不对：${NEXT}（要 x.y.z）`);
  process.exit(1);
}

const PKG = 'diy-bath';
let touched = 0;

/** 只替换 `name = "<pkg>"` 那一段里的 version */
function bumpCrate(file, pkg) {
  const src = readFileSync(file, 'utf8');
  // Cargo.lock / Cargo.toml 的段落格式：
  //   [[package]]
  //   name = "diy-bath"
  //   version = "0.3.0"
  const re = new RegExp(
    `(\\[\\[?package\\]\\]?\\s*\\nname\\s*=\\s*"${pkg}"\\s*\\nversion\\s*=\\s*")([^"]+)(")`,
  );
  const m = src.match(re);
  if (!m) {
    console.error(`${file} 里找不到 ${pkg} 的 [package] 段`);
    process.exit(1);
  }
  if (m[2] === NEXT) {
    console.log(`${file}: 已是 ${NEXT}，跳过`);
    return;
  }
  writeFileSync(file, src.replace(re, `$1${NEXT}$3`));
  console.log(`${file}: ${m[2]} → ${NEXT}`);
  touched++;
}

// package.json
const pkgPath = 'package.json';
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
if (pkg.version !== NEXT) {
  pkg.version = NEXT;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`${pkgPath}: → ${NEXT}`);
  touched++;
}

// Cargo.toml / Cargo.lock —— 只动本包
bumpCrate('src-tauri/Cargo.toml', PKG);
bumpCrate('src-tauri/Cargo.lock', PKG);

// 核对：依赖里的 tauri 版本必须没被动过
const lock = readFileSync('src-tauri/Cargo.lock', 'utf8');
const tauriV = lock.match(/name = "tauri"\nversion = "([^"]+)"/)?.[1];
if (tauriV && /^0\./.test(tauriV)) {
  console.error(`Cargo.lock 里的 tauri crate 被改成了 ${tauriV} —— 依赖版本不能动`);
  process.exit(1);
}
if (tauriV) console.log(`Cargo.lock 里 tauri crate 仍是 ${tauriV}（没被动）`);

console.log(touched ? `\n改了 ${touched} 处` : '\n无需改动');