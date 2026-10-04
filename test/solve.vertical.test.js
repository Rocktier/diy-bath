import { test, eq, close, throws } from './helpers.js';
import { solve } from '../src/solve.js';
import { makeSpec } from '../src/spec.js';

test('竖向：2 带 rows[2,1]，柜体 680 缝 2 → 下带 452 / 上带 226', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180, height: 680 },
    bands: [
      { kind: 'door', cols: [1], rows: [2] },
      { kind: 'drawer', cols: [1], rows: [1] },
    ],
  }));
  close(L.bands[0].h, 452);
  close(L.bands[1].h, 226);
  eq(L.bands[0].y + L.bands[0].h + L.gap, L.bands[1].y, '带间应正好留一个 gap');
});

test('竖向：分配填满柜体，不多不少', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180, height: 777 },
    bands: [
      { kind: 'door', cols: [1], rows: [2, 1] },
      { kind: 'drawer', cols: [1], rows: [1, 1] },
      { kind: 'open', cols: [1], rows: [3] },
    ],
  }));
  const bottom = L.bands[0].y;
  const top = L.bands[2].y + L.bands[2].h;
  close(top - bottom, 777, 0.001, '所有带+缝应正好填满柜体高');
});

test('竖向：落地 柜体680 踢脚90 → 柜底 90 / 柜顶 770 / 台面顶 790', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180, height: 680, mount: 'floor', toe: { height: 90, inset: 60 } },
    top: { thickness: 20 },
  }));
  eq(L.baseY, 90);
  eq(L.carcassTopY, 770);
  eq(L.ctTopY, 790);
});

test('竖向：悬空 柜体680 wallGap150 → 柜底 150 / 柜顶 830', () => {
  const L = solve(makeSpec({
    cabinet: { width: 1180, height: 680, mount: 'wall', wallGap: 150 },
  }));
  eq(L.baseY, 150);
  eq(L.carcassTopY, 830);
});

test('竖向：柜体高只算本体，踢脚不重复计入', () => {
  const L = solve(makeSpec({ cabinet: { height: 680, toe: { height: 90, inset: 60 } }, top: { thickness: 20 } }));
  eq(L.ctTopY, 90 + 680 + 20);
});

test('竖向：3 抽柜 880，rows[2,1.5,1] → 行高 389.33 / 292 / 194.67', () => {
  const L = solve(makeSpec({
    cabinet: { width: 880, height: 880 },
    bands: [{ kind: 'drawer', cols: [1], rows: [2, 1.5, 1] }],
  }));
  const rows = L.bands[0].rows;
  close(rows[0].h, (876 * 2) / 4.5);
  close(rows[1].h, (876 * 1.5) / 4.5);
  close(rows[2].h, 876 / 4.5);
  eq(rows[0].y < rows[1].y, true, 'rows[0] 应在最下面');
});

test('竖向：行之间也要留 gap', () => {
  const L = solve(makeSpec({
    cabinet: { width: 880, height: 880 },
    bands: [{ kind: 'drawer', cols: [1], rows: [2, 1.5, 1] }],
  }));
  const r = L.bands[0].rows;
  close(r[0].y + r[0].h + 2, r[1].y, '行间应有一个 gap');
});

test('竖向：带内行高+行缝正好等于带高', () => {
  const L = solve(makeSpec({
    cabinet: { width: 880, height: 880 },
    bands: [{ kind: 'drawer', cols: [1], rows: [2, 1.5, 1] }],
  }));
  const bl = L.bands[0];
  close(bl.rows.reduce((s, r) => s + r.h, 0) + 2 * 2, bl.h, 0.001);
});

test('竖向：cells 长度不匹配时抛错', () => {
  throws(
    () => solve(makeSpec({ bands: [{ kind: 'door', cols: [1, 1, 1], rows: [1], cells: ['door', 'drawer'] }] })),
    'cells 长度 2 != 列×行 3，应当抛错',
  );
});

test('竖向：bands 为空时不崩', () => {
  const L = solve(makeSpec({ bands: [] }));
  eq(L.bands.length, 0);
});