/**
 * 检查构建产物是否合理。
 *
 * 重点是代码分割有没有被破坏。Three.js 有 500KB，
 * 一旦被静态 import 进主包，三视图模式也要多等几秒下载，
 * 而且**不会报任何错**——所以必须在构建后断言。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const ASSETS = join(DIST, 'assets');

/**
 * 主包上限。实测拆分后是 47.8KB，留一倍余量。
 * 超过 100KB 基本就是 Three.js 被静态 import 了。
 */
const MAIN_LIMIT_KB = 100;

let bad = 0;
const fail = (msg) => { console.error(`  x ${msg}`); bad++; };
const ok = (msg) => console.log(`  + ${msg}`);

let files;
try {
  files = readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
} catch {
  console.error('找不到 dist/assets，先跑 npm run build');
  process.exit(1);
}

if (!files.length) {
  console.error('dist/assets 里没有 js 文件');
  process.exit(1);
}

const sizes = files
  .map((f) => ({ name: f, kb: statSync(join(ASSETS, f)).size / 1024 }))
  .sort((a, b) => b.kb - a.kb);

console.log('产物:');
for (const s of sizes) console.log(`  ${s.name.padEnd(30)} ${s.kb.toFixed(1)} KB`);

const main = sizes.find((s) => s.name.startsWith('index-'));
const three = sizes.find((s) => s.name.includes('three'));

if (!main) {
  fail('找不到主包 index-*.js');
} else if (main.kb > MAIN_LIMIT_KB) {
  fail(`主包 ${main.kb.toFixed(1)}KB 超过 ${MAIN_LIMIT_KB}KB —— Three.js 可能被静态 import 了`);
} else {
  ok(`主包 ${main.kb.toFixed(1)}KB，在 ${MAIN_LIMIT_KB}KB 预算内`);
}

if (three) {
  ok(`Three.js 独立成块 ${three.kb.toFixed(1)}KB，仅在进 3D 模式时下载`);
} else {
  console.warn('  ! 没找到独立的 three 块 —— 如果是有意的可以忽略');
}

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
if (!/<script[^>]+type="module"/.test(html)) fail('index.html 里没有 type=module 的脚本');
else ok('index.html 引用了 module 脚本');

if (/\bNaN\b/.test(html)) fail('index.html 含 NaN');
else ok('index.html 无 NaN');

// 校验所有 js 块里没有残留的 TODO/占位
for (const f of files) {
  const t = readFileSync(join(ASSETS, f), 'utf8');
  if (/TODO|FIXME|XXX/.test(t)) {
    console.warn(`  ! ${f} 含 TODO/FIXME`);
  }
}

console.log(bad ? `\n${bad} 处问题` : '\n产物检查通过');
process.exit(bad ? 1 : 0);