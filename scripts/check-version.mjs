// 校验三处版本号一致：package.json / tauri.conf.json / Cargo.toml
// 发版前跑一遍，避免出现「exe 版本 0.1.0、页面显示 0.2.0」这种割裂。
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const conf = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const cargo = readFileSync('src-tauri/Cargo.toml', 'utf8').match(/^version = "(.+)"/m)?.[1];

const rows = [
  ['package.json', pkg.version],
  ['tauri.conf.json', conf.version],
  ['Cargo.toml', cargo],
];
for (const [k, v] of rows) console.log(k.padEnd(18), v);

const ok = pkg.version === conf.version && conf.version === cargo;
console.log(ok ? '\n版本号一致' : '\n版本号不一致，发版前必须统一');
process.exit(ok ? 0 : 1);