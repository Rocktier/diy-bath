import { execFileSync } from 'node:child_process';

// 看 CI 各 job 的状态。PowerShell 里 gh 的 --jq 会被自己的引号规则拆坏，
// 所以走 node，参数原样传给 gh。
const runId = process.argv[2];
if (!runId) {
  console.error('用法: node scripts/ci-status.mjs <run-id>');
  process.exit(1);
}

const out = execFileSync(
  'gh',
  ['api', `repos/Rocktier/diy-bath/actions/runs/${runId}/jobs`, '--jq',
   '.jobs[] | "\\(.name) => \\(.status)/\\(.conclusion)"'],
  { encoding: 'utf8' },
);
process.stdout.write(out);

const failing = out.split('\n')
  .map((l) => l.trim())
  .filter((l) => l.includes('/failure') || l.includes('/cancelled'));

if (failing.length) {
  console.log('\n失败步骤:');
  for (const f of failing) console.log('  ' + f);
  process.exit(1);
}