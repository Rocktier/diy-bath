/**
 * 测试用的「全部分格配置」矩阵。
 *
 * 原来这里遍历 18 个预设。现在预设改成了「门 N + 抽 M + 排列」，
 * 预设列表本身已经不存在了——但这几条回归测试的价值没变：
 * 它们是唯一能挡住「某种分格组合算出 NaN 或越界」的东西。
 *
 * 所以把遍历源换成生成的矩阵，覆盖面反而大得多：
 * 门 0-4 × 抽 0-6 × 左右/上下 = 70 种，再加全部特例柜型。
 * 之前只有 18 个点，现在是 70+ 个点。
 */
import { SPECIAL_CASES } from '../src/spec.js';

export function layoutMatrix() {
  const out = [];
  for (let doors = 0; doors <= 4; doors++) {
    for (let drawers = 0; drawers <= 6; drawers++) {
      if (!doors && !drawers) continue;
      for (const layout of ['lr', 'ud']) {
        out.push({
          label: `${doors}门${drawers}抽-${layout}`,
          patch: { cabinet: { doors, drawers, layout } },
        });
      }
    }
  }
  for (const sp of SPECIAL_CASES) {
    if (!sp.bands) continue;
    out.push({
      label: '特例:' + sp.name,
      patch: { cabinet: { special: sp.id }, bands: sp.bands },
    });
  }
  return out;
}