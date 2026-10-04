// 校验 .github/workflows/*.yml。
//
// 为什么要自己校验：GitHub 的失败信息是 0 秒 failure + no logs，
// 完全看不出是 YAML 语法错还是别的问题。actionlint 能在本地秒出结果。
//
// 用法:
//   node scripts/lint-workflows.mjs
//
// 依赖 actionlint（已下载到临时目录时会自动找）：
//   winget install rhysd.actionlint
// 或手动放到 PATH 上。找不到就跳过，不阻塞 CI。
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = '.github/workflows';

if (!existsSync(DIR)) {
  console.log('没有 .github/workflows，跳过');
  process.exit(0);
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
if (!files.length) {
  console.log('没有 workflow 文件');
  process.exit(0);
}

// ---- 第一道：Tab 缩进（YAML 硬性禁止，GitHub 会直接拒绝）----
let bad = 0;
for (const f of files) {
  const lines = readFileSync(join(DIR, f), 'utf8').split(/\r?\n/);
  const tabs = lines.map((l, i) => (l.includes('\t') ? i + 1 : null)).filter(Boolean);
  if (tabs.length) {
    console.error(`${f}: 第 ${tabs.join(', ')} 行含 Tab。YAML 只能用空格缩进。`);
    bad++;
  }
}

// ---- 第二道：必须能解析成 YAML，且有 name/on/jobs ----
for (const f of files) {
  const text = readFileSync(join(DIR, f), 'utf8');
  for (const key of ['name:', 'on:', 'jobs:']) {
    if (!new RegExp(`^${key}`, 'm').test(text)) {
      console.error(`${f}: 缺少顶层字段 ${key}`);
      bad++;
    }
  }
}

// ---- 第三道：交给 actionlint（有就用，没有就跳过）----
let linted = false;
for (const exe of ['actionlint', join(process.env.TEMP || '.', 'actionlint', 'actionlint.exe')]) {
  if (exe.includes('\\') || exe.includes('/') ? !existsSync(exe) : false) continue;
  try {
    execFileSync(exe, ['-oneline', ...files.map((f) => join(DIR, f))], { stdio: 'inherit' });
    linted = true;
    break;
  } catch (e) {
    if (e.status) {
      console.error(`actionlint 报告了问题（退出码 ${e.status}）`);
      process.exit(1);
    }
  }
}
if (!linted) console.log('（未找到 actionlint，跳过第三道检查）');

if (bad) {
  console.error(`\n${bad} 处问题`);
  process.exit(1);
}
console.log(`\n${files.length} 个 workflow 文件校验通过`);