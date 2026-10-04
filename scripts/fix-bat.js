// 把 run.bat 规范成：纯 ASCII + 无 BOM + CRLF
// cmd.exe 读 .bat 用系统 ANSI 码页：BOM 会让第一行就失败，
// 非 ASCII 注释会乱码。这个脚本是唯一的规范化入口，不要手工绕过。
//
// 用法: node scripts/fix-bat.js
import { readFileSync, writeFileSync } from 'node:fs';

const problems = [];
let failed = false;

for (const f of ['run.bat']) {
  let text = readFileSync(f, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
    problems.push(`${f}: 去掉了 UTF-8 BOM`);
  }
  text = text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  if (/[^\x09\x0a\x0d\x20-\x7e]/.test(text)) {
    problems.push(`${f}: 含非 ASCII 字符`);
    failed = true;
  }
  if (/^\s*pause\s*$/im.test(text)) {
    problems.push(`${f}: 含 pause，误入分支会永久挂起窗口`);
    failed = true;
  }
  writeFileSync(f, Buffer.from(text, 'latin1'));

  const after = readFileSync(f);
  const noBom = !after.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]));
  const pureAscii = after.every((b) => (b >= 9 && b <= 126) || b === 13 || b === 10);
  const crlf = after.includes(Buffer.from('\r\n'));
  const ok = noBom && pureAscii && crlf && !failed;
  if (!ok) failed = true;
  console.log(`${f}: ${ok ? 'OK' : 'FAIL'}  CRLF=${crlf}  BOM=${!noBom}  纯ASCII=${pureAscii}  bytes=${after.length}`);
}

if (problems.length) {
  console.log('\n问题:');
  for (const p of problems) console.log('  - ' + p);
}
if (failed) {
  console.error('\nrun.bat 不符合要求，请修好后再提交。');
  process.exit(1);
}