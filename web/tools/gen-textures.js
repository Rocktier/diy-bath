// Dependency-free PBR texture generator (albedo / normal / roughness / AO).
// Run: node tools/gen-textures.js        (512px default)
//      SIZE=1024 node tools/gen-textures.js
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const SIZE = +(process.env.SIZE || 512);
const OUT = path.join(__dirname, '..', 'assets', 'textures');
fs.mkdirSync(OUT, { recursive: true });

const COLORS = {
  white: 0xf1f0eb, cream: 0xe7dfd1, sage: 0x9aa892, navy: 0x2d3b55,
  graphite: 0x4b5056, oak: 0xb98d5f, walnut: 0x6b4a32, black: 0x232629,
  stone: 0xd9d6cf, marble: 0xecebe7, brass: 0xb08d4f, concrete: 0xb8b5ae,
  terrazzo: 0xd8d5cc
};
const ROUGH = {
  white: .85, cream: .85, sage: .9, navy: .8, graphite: .75, oak: .9,
  walnut: .9, black: .65, stone: .3, marble: .25, brass: .35, concrete: .95, terrazzo: .4
};

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function writePNG(file, rgba) {
  const w = SIZE, h = SIZE, raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(file, png);
}

function hash(x, y, s) { let h = x * 374761393 + y * 668265263 + s * 1442695041; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y, freq, s) {
  const fx = x * freq, fy = y * freq, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
  const m = n => ((n % freq) + freq) % freq;
  const a = hash(m(ix), m(iy), s), b = hash(m(ix + 1), m(iy), s), c = hash(m(ix), m(iy + 1), s), d = hash(m(ix + 1), m(iy + 1), s);
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  return a * (1 - sx) * (1 - sy) + b * sx * (1 - sy) + c * (1 - sx) * sy + d * sx * sy;
}
function fbm(x, y, oct, freq, seed) { let v = 0, a = .5, f = freq; for (let i = 0; i < oct; i++) { v += a * vnoise(x, y, f, seed + i * 17); a *= .5; f *= 2; } return v; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function heightFor(k, u, v) {
  if (k === 'oak' || k === 'walnut') {
    const g = Math.sin((v * 16 + fbm(u, v, 4, 4, 3) * 3.2) * Math.PI * 2) * .5 + .5;
    return .32 + .55 * g;
  }
  if (k === 'stone' || k === 'marble' || k === 'terrazzo') {
    const turb = fbm(u, v, 5, 6, 9);
    const vein = Math.pow(1 - Math.abs(Math.sin((u * 2.5 + v * 1.8 + turb * 2.2) * Math.PI * 2)), 9);
    const chip = k === 'terrazzo' ? (hash(Math.floor(u * 90), Math.floor(v * 90), 21) > .96 ? .35 : 0) : 0;
    return clamp(.5 + .4 * vein + .12 * fbm(u, v, 3, 12, 5) + chip, 0, 1);
  }
  if (k === 'brass') return .5 + .1 * Math.sin(v * Math.PI * 2 * 140) + .12 * fbm(u, v, 3, 10, 7);
  if (k === 'concrete') return .45 + .4 * fbm(u, v, 5, 24, 11);
  return .5 + .08 * fbm(u, v, 3, 32, 13);
}
function rgbOf(hex) { return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]; }

for (const k of Object.keys(COLORS)) {
  const H = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) H[y * SIZE + x] = heightFor(k, x / SIZE, y / SIZE);
  const base = rgbOf(COLORS[k]);
  const albedo = Buffer.alloc(SIZE * SIZE * 4), normal = Buffer.alloc(SIZE * SIZE * 4);
  const rough = Buffer.alloc(SIZE * SIZE * 4), ao = Buffer.alloc(SIZE * SIZE * 4);
  const at = (x, y) => H[(((y % SIZE) + SIZE) % SIZE) * SIZE + (((x % SIZE) + SIZE) % SIZE)];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4, h = H[y * SIZE + x];
    const shade = .78 + .38 * h;
    for (let c = 0; c < 3; c++) albedo[i + c] = clamp(Math.round(base[c] * shade), 0, 255);
    albedo[i + 3] = 255;
    const dx = (at(x + 1, y) - at(x - 1, y)) * 3, dy = (at(x, y + 1) - at(x, y - 1)) * 3;
    const len = Math.hypot(-dx, -dy, 1);
    normal[i] = Math.round((-dx / len * .5 + .5) * 255);
    normal[i + 1] = Math.round((-dy / len * .5 + .5) * 255);
    normal[i + 2] = Math.round((1 / len * .5 + .5) * 255);
    normal[i + 3] = 255;
    const rv = Math.round(clamp(ROUGH[k] + (1 - h) * .12, .05, 1) * 255);
    rough[i] = rough[i + 1] = rough[i + 2] = rv; rough[i + 3] = 255;
    const av = Math.round(clamp(.82 + .18 * h, 0, 1) * 255);
    ao[i] = ao[i + 1] = ao[i + 2] = av; ao[i + 3] = 255;
  }
  writePNG(path.join(OUT, k + '_albedo.png'), albedo);
  writePNG(path.join(OUT, k + '_normal.png'), normal);
  writePNG(path.join(OUT, k + '_roughness.png'), rough);
  writePNG(path.join(OUT, k + '_ao.png'), ao);
}
console.log('Generated ' + Object.keys(COLORS).length * 4 + ' PBR textures at ' + SIZE + 'px -> ' + OUT);
