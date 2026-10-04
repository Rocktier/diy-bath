export const BASIN_LABEL = {
  vessel: '台上盆',
  undermount: '台下盆',
  integral: '一体盆',
};

export const CELL_LABEL = {
  drawer: '抽屉',
  door: '门',
  open: '开放格',
  basin: '盆胆',
};

const SHORT = { drawer: '抽', door: '门', open: '开放格', basin: '盆胆' };

function fmt(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return String(n);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

function bandSummary(L) {
  const parts = [];
  L.bands.forEach((bl, i) => {
    const counts = new Map();
    for (const c of bl.cells) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1);
    const desc = [...counts].map(([k, n]) => `${SHORT[k] ?? k}×${n}`).join('+');
    const pos = i === 0 ? '下带' : i === L.bands.length - 1 ? '上带' : `中带${i}`;
    parts.push(`${pos} ${desc}`);
  });
  return parts.join('  /  ');
}

/**
 * 图上文字标注的文案。
 *
 * 全部由 spec + Layout 反推，**不做任何手工维护的文案表**，
 * 所以改了参数，文案必然跟着变，不会出现"图改了字没改"。
 */
export function annotationLines(spec, L) {
  if (!spec.annotations || !spec.annotations.enabled) return [];
  const { cabinet, top, basin } = spec;
  const out = [spec.name];

  out.push(`台面：${top.material} ${fmt(top.thickness)}厚 · 挡水高 ${fmt(top.backsplash.height)}`);

  const basinSize = basin.type === 'undermount'
    ? `${fmt(basin.width)}×${fmt(basin.depth)}`
    : `${fmt(basin.width)}×${fmt(basin.depth)}×${fmt(basin.height)}`;
  out.push(`盆：  ${BASIN_LABEL[basin.type] ?? basin.type} ${basinSize} ×${basin.count} 个`);

  const mount = cabinet.mount === 'wall'
    ? `悬空 ${fmt(cabinet.wallGap)}`
    : '落地';
  out.push(
    `主柜：${fmt(cabinet.width)}×${fmt(cabinet.height)}×${fmt(cabinet.depth)} · ${mount}`
    + ` · ${cabinet.boardMaterial} 板厚 ${fmt(cabinet.sidePanel)}`,
  );

  out.push(`分区：${bandSummary(L)}`);
  out.push(`缝宽：${fmt(cabinet.gap)}`);

  return out;
}