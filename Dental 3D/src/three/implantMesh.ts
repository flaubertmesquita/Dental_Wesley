/**
 * Procedural dental implant modelled after the reference artwork (dente.png):
 * a tall, puffy molar crown (two soft cusps + occlusal notch, bulging sides,
 * rounded base), a short metal collar and a tapered, finely threaded screw.
 * Pure TypeScript (no three.js) so it can run inside a Web Worker.
 *
 *  • Crown: signed distance field polygonised with Naive Surface Nets; vertices
 *    projected onto the exact iso-surface, SDF-gradient normals and a soft,
 *    cool-tinted ambient occlusion baked into vertex colours.
 *  • Sparkles: points in a thin shell just outside the crown and on the screw
 *    threads (the cyan glitter of the artwork).
 *  • Fixture: parametric tapered screw — rounded helical thread, smooth
 *    platform, rounded apex — with analytic normals, thread-root occlusion
 *    (vertex colours) and a per-vertex "crest" factor used for edge glow.
 *
 * Object space (crown height ≈ 1): fixture platform at y = 0, apex at
 * y = −FIXTURE_LENGTH, collar from 0 to COLLAR_HEIGHT, crown seat at CROWN_SEAT_Y.
 */

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  index: Uint32Array;
  /** Fixture only: 0 at thread roots → 1 at crests. */
  crest?: Float32Array;
}

export interface ImplantData {
  crown: MeshData;
  fixture: MeshData;
  /** xyz triplets (crown-local) in a thin shell just outside the crown. */
  crownSparkles: Float32Array;
  /** xyz triplets (fixture-local) just above the thread surface. */
  fixtureSparkles: Float32Array;
}

export interface ImplantBuildOptions {
  crownCell: number;
  rowsPerPitch: number;
  radialSegments: number;
  crownSparkles: number;
  fixtureSparkles: number;
}

export const FIXTURE_LENGTH = 0.88;
export const COLLAR_HEIGHT = 0.1;
export const COLLAR_RADIUS = 0.212;
export const CROWN_SEAT_Y = COLLAR_HEIGHT;

const PITCH = 0.05;
const THREAD_DEPTH = 0.032;
const CORE_TOP = 0.15;
const CORE_APEX = 0.088;
const APEX_ROUND = 0.1;
const TAU = Math.PI * 2;

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Small deterministic PRNG (same layout on every load). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smin(a: number, b: number, k: number) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b + (a - b) * h - k * h * (1 - h);
}

function smax(a: number, b: number, k: number) {
  return -smin(-a, -b, k);
}

function len3(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
}

function sdSphere(px: number, py: number, pz: number, cx: number, cy: number, cz: number, r: number) {
  return len3(px - cx, py - cy, pz - cz) - r;
}

function sdRoundBox(px: number, py: number, pz: number, bx: number, by: number, bz: number, r: number) {
  const qx = Math.abs(px) - bx + r;
  const qy = Math.abs(py) - by + r;
  const qz = Math.abs(pz) - bz + r;
  return (
    len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) +
    Math.min(Math.max(qx, Math.max(qy, qz)), 0) -
    r
  );
}

// ───────────────────────────── Crown ─────────────────────────────

/** Signed distance to the crown (crown-local; flat round seat at y = 0, cusp tips ≈ 1). */
export function crownSDF(x: number, y: number, z: number): number {
  // Widest band around y ≈ 0.6; strong taper to a rounded base, slight taper to the top
  const tn = clamp((0.6 - y) / 0.6, 0, 1);
  const tt = clamp((y - 0.78) / 0.22, 0, 1);
  const tn2 = tn * tn;
  const tt2 = tt * tt;
  const sx = 1 + 0.84 * tn2 + 0.1 * tt2;
  const sz = 1 + 0.72 * tn2 + 0.1 * tt2;
  let d = sdRoundBox(x * sx, y - 0.38, z * sz, 0.5, 0.56, 0.44, 0.3) / Math.max(sx, sz);
  // Four soft cusps (two visible from the front, as in the artwork)
  d = smin(d, sdSphere(Math.abs(x), y, Math.abs(z), 0.235, 0.79, 0.19, 0.205), 0.14);
  // Occlusal notch / saddle
  d = smax(d, -sdSphere(x, y, z, 0, 1.17, 0, 0.3), 0.12);
  // Flat seat on the collar
  return smax(d, -y, 0.03);
}

/** Voxel pass with a conservative bounding-box early-out (sign preserved). */
function crownField(x: number, y: number, z: number): number {
  const bb = sdRoundBox(x, y - 0.5, z, 0.56, 0.56, 0.5, 0.05);
  return bb > 0.04 ? bb : crownSDF(x, y, z);
}

// Naive Surface Nets (after M. Lysenko)
const cubeEdges = new Int32Array(24);
const edgeTable = new Int32Array(256);
(() => {
  let k = 0;
  for (let i = 0; i < 8; ++i) {
    for (let j = 1; j <= 4; j <<= 1) {
      const p = i ^ j;
      if (i <= p) {
        cubeEdges[k++] = i;
        cubeEdges[k++] = p;
      }
    }
  }
  for (let i = 0; i < 256; ++i) {
    let em = 0;
    for (let j = 0; j < 24; j += 2) {
      const a = !!(i & (1 << cubeEdges[j]));
      const b = !!(i & (1 << cubeEdges[j + 1]));
      em |= a !== b ? 1 << (j >> 1) : 0;
    }
    edgeTable[i] = em;
  }
})();

function surfaceNets(data: Float32Array, dims: [number, number, number]) {
  const vertices: number[] = [];
  const quads: number[] = [];
  const x = new Int32Array(3);
  const R = new Int32Array([1, dims[0] + 1, (dims[0] + 1) * (dims[1] + 1)]);
  const grid = new Float32Array(8);
  const buffer = new Int32Array(R[2] * 2);
  let n = 0;
  let bufNo = 1;

  for (x[2] = 0; x[2] < dims[2] - 1; ++x[2], n += dims[0], bufNo ^= 1, R[2] = -R[2]) {
    let m = 1 + (dims[0] + 1) * (1 + bufNo * (dims[1] + 1));
    for (x[1] = 0; x[1] < dims[1] - 1; ++x[1], ++n, m += 2) {
      for (x[0] = 0; x[0] < dims[0] - 1; ++x[0], ++n, ++m) {
        let mask = 0;
        let g = 0;
        let idx = n;
        for (let k = 0; k < 2; ++k, idx += dims[0] * (dims[1] - 2)) {
          for (let j = 0; j < 2; ++j, idx += dims[0] - 2) {
            for (let i = 0; i < 2; ++i, ++g, ++idx) {
              const p = data[idx];
              grid[g] = p;
              mask |= p < 0 ? 1 << g : 0;
            }
          }
        }
        if (mask === 0 || mask === 0xff) continue;

        const edgeMask = edgeTable[mask];
        let vx = 0, vy = 0, vz = 0, eCount = 0;
        for (let i = 0; i < 12; ++i) {
          if (!(edgeMask & (1 << i))) continue;
          const e0 = cubeEdges[i << 1];
          const e1 = cubeEdges[(i << 1) + 1];
          const g0 = grid[e0];
          const g1 = grid[e1];
          let t = g0 - g1;
          if (Math.abs(t) < 1e-9) continue;
          t = g0 / t;
          ++eCount;
          let a = e0 & 1, b = e1 & 1;
          vx += a !== b ? (a ? 1 - t : t) : a ? 1 : 0;
          a = e0 & 2; b = e1 & 2;
          vy += a !== b ? (a ? 1 - t : t) : a ? 1 : 0;
          a = e0 & 4; b = e1 & 4;
          vz += a !== b ? (a ? 1 - t : t) : a ? 1 : 0;
        }
        if (eCount === 0) continue;
        const s = 1 / eCount;
        buffer[m] = vertices.length / 3;
        vertices.push(x[0] + s * vx, x[1] + s * vy, x[2] + s * vz);

        for (let i = 0; i < 3; ++i) {
          if (!(edgeMask & (1 << i))) continue;
          const iu = (i + 1) % 3;
          const iv = (i + 2) % 3;
          if (x[iu] === 0 || x[iv] === 0) continue;
          const du = R[iu];
          const dv = R[iv];
          if (mask & 1) {
            quads.push(buffer[m], buffer[m - du], buffer[m - du - dv], buffer[m - dv]);
          } else {
            quads.push(buffer[m], buffer[m - dv], buffer[m - du - dv], buffer[m - du]);
          }
        }
      }
    }
  }
  return { vertices, quads };
}

function gradient(px: number, py: number, pz: number, e: number, out: number[]) {
  out[0] = crownSDF(px + e, py, pz) - crownSDF(px - e, py, pz);
  out[1] = crownSDF(px, py + e, pz) - crownSDF(px, py - e, pz);
  out[2] = crownSDF(px, py, pz + e) - crownSDF(px, py, pz - e);
}

function ambientOcclusion(px: number, py: number, pz: number, nx: number, ny: number, nz: number) {
  let occ = 0;
  let sca = 1;
  for (let i = 1; i <= 5; i++) {
    const h = 0.015 + 0.05 * i;
    const d = crownSDF(px + nx * h, py + ny * h, pz + nz * h);
    occ += (h - d) * sca;
    sca *= 0.7;
  }
  return clamp(1 - 1.6 * occ, 0, 1);
}

/** Makes every triangle's winding agree with its vertex normals (outward). */
function orient(positions: Float32Array, normals: Float32Array, index: Uint32Array) {
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i] * 3, b = index[i + 1] * 3, c = index[i + 2] * 3;
    const e1x = positions[b] - positions[a], e1y = positions[b + 1] - positions[a + 1], e1z = positions[b + 2] - positions[a + 2];
    const e2x = positions[c] - positions[a], e2y = positions[c + 1] - positions[a + 1], e2z = positions[c + 2] - positions[a + 2];
    const fx = e1y * e2z - e1z * e2y;
    const fy = e1z * e2x - e1x * e2z;
    const fz = e1x * e2y - e1y * e2x;
    const nx = normals[a] + normals[b] + normals[c];
    const ny = normals[a + 1] + normals[b + 1] + normals[c + 1];
    const nz = normals[a + 2] + normals[b + 2] + normals[c + 2];
    if (fx * nx + fy * ny + fz * nz < 0) {
      const t = index[i + 1];
      index[i + 1] = index[i + 2];
      index[i + 2] = t;
    }
  }
}

function buildCrown(cell: number): MeshData {
  const minX = -0.58, maxX = 0.58;
  const minY = -0.06, maxY = 1.08;
  const minZ = -0.52, maxZ = 0.52;
  const nx = Math.ceil((maxX - minX) / cell) + 1;
  const ny = Math.ceil((maxY - minY) / cell) + 1;
  const nz = Math.ceil((maxZ - minZ) / cell) + 1;

  const field = new Float32Array(nx * ny * nz);
  let idx = 0;
  for (let k = 0; k < nz; k++) {
    const z = minZ + k * cell;
    for (let j = 0; j < ny; j++) {
      const y = minY + j * cell;
      for (let i = 0; i < nx; i++) field[idx++] = crownField(minX + i * cell, y, z);
    }
  }

  const { vertices, quads } = surfaceNets(field, [nx, ny, nz]);
  const count = vertices.length / 3;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const g = [0, 0, 0];
  const eps = cell * 0.5;

  for (let v = 0; v < count; v++) {
    let px = minX + vertices[v * 3] * cell;
    let py = minY + vertices[v * 3 + 1] * cell;
    let pz = minZ + vertices[v * 3 + 2] * cell;

    // Project onto the exact iso-surface (2 clamped Newton steps)
    for (let it = 0; it < 2; it++) {
      const d = crownSDF(px, py, pz);
      gradient(px, py, pz, eps, g);
      const gx = g[0] / (2 * eps), gy = g[1] / (2 * eps), gz = g[2] / (2 * eps);
      const gl2 = gx * gx + gy * gy + gz * gz;
      if (gl2 < 1e-10) break;
      let sx = (gx * d) / gl2, sy = (gy * d) / gl2, sz = (gz * d) / gl2;
      const sl = len3(sx, sy, sz);
      if (sl > cell) {
        const f = cell / sl;
        sx *= f; sy *= f; sz *= f;
      }
      px -= sx; py -= sy; pz -= sz;
    }

    gradient(px, py, pz, eps, g);
    const gl = len3(g[0], g[1], g[2]) || 1;
    const nxv = g[0] / gl, nyv = g[1] / gl, nzv = g[2] / gl;

    positions[v * 3] = px;
    positions[v * 3 + 1] = py;
    positions[v * 3 + 2] = pz;
    normals[v * 3] = nxv;
    normals[v * 3 + 1] = nyv;
    normals[v * 3 + 2] = nzv;

    // Cool (blue-grey) occlusion, slightly greyer toward the base — linear colour
    const ao = Math.pow(ambientOcclusion(px, py, pz, nxv, nyv, nzv), 0.9);
    const top = smoothstep(0.02, 0.7, py);
    colors[v * 3] = mix(0.55, 1, ao) * mix(0.86, 1, top);
    colors[v * 3 + 1] = mix(0.66, 1, ao) * mix(0.9, 1, top);
    colors[v * 3 + 2] = mix(0.86, 1, ao) * mix(0.95, 1, top);
  }

  const index = new Uint32Array((quads.length / 4) * 6);
  let o = 0;
  for (let q = 0; q < quads.length; q += 4) {
    index[o++] = quads[q]; index[o++] = quads[q + 1]; index[o++] = quads[q + 2];
    index[o++] = quads[q]; index[o++] = quads[q + 2]; index[o++] = quads[q + 3];
  }
  orient(positions, normals, index);
  return { positions, normals, colors, index };
}

function sampleCrownSparkles(count: number): Float32Array {
  const rnd = mulberry32(1337);
  const out = new Float32Array(count * 3);
  let n = 0;
  for (let tries = 0; n < count && tries < count * 600; tries++) {
    const x = (rnd() * 2 - 1) * 0.56;
    const y = rnd() * 1.05;
    const z = (rnd() * 2 - 1) * 0.5;
    const d = crownSDF(x, y, z);
    if (d > 0.004 && d < 0.024) {
      out[n * 3] = x;
      out[n * 3 + 1] = y;
      out[n * 3 + 2] = z;
      n++;
    }
  }
  return n === count ? out : out.slice(0, n * 3);
}

// ───────────────────────────── Fixture ─────────────────────────────

function threadWindow(y: number) {
  const L = FIXTURE_LENGTH;
  return smoothstep(-0.006, -0.032, y) * smoothstep(-L + 0.02, -L + 0.13, y);
}

function coreRadius(y: number) {
  return mix(CORE_TOP, CORE_APEX, smoothstep(-0.04, -FIXTURE_LENGTH + 0.05, y));
}

function apexScale(y: number) {
  const ya = -FIXTURE_LENGTH + APEX_ROUND;
  if (y >= ya) return 1;
  const t = (ya - y) / APEX_ROUND;
  return Math.sqrt(Math.max(0, 1 - 0.88 * t * t));
}

/** Outer (crest) envelope radius of the screw at height y — used for the outline hull. */
export function fixtureEnvelope(y: number): number {
  const top = smoothstep(-0.03, 0, y);
  const r = coreRadius(y) + THREAD_DEPTH * Math.max(threadWindow(y), 0.62 * top);
  return r * apexScale(y);
}

/** Fixture radius, thread-root shade and crest factor at angle θ, height y. */
function fixtureProfile(theta: number, y: number): [number, number, number] {
  const tw = threadWindow(y);
  let u = y / PITCH + theta / TAU;
  u -= Math.floor(u);
  // Rounded thread (stacked-ring look of the artwork) with slightly flattened crests
  const prof = Math.pow(0.5 - 0.5 * Math.cos(TAU * u), 0.8);
  let r = coreRadius(y) + THREAD_DEPTH * tw * prof;
  let shade = mix(0.5, 1, prof * tw + (1 - tw));
  // Smooth platform right below the collar
  const top = smoothstep(-0.03, 0, y);
  r = mix(r, CORE_TOP + THREAD_DEPTH * 0.62, top);
  shade = mix(shade, 0.95, top);
  r *= apexScale(y);
  return [r, shade, prof * tw * (1 - top)];
}

function buildFixture(rowsPerPitch: number, cols: number): MeshData {
  const L = FIXTURE_LENGTH;
  const rows = Math.ceil((L / PITCH) * rowsPerPitch);
  const ring = cols + 1;
  const total = (rows + 1) * ring + 2 * (ring + 1);
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  const crest = new Float32Array(total);
  const e = 1e-4;
  let v = 0;

  const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number, s: number, c: number) => {
    const o = v * 3;
    positions[o] = x; positions[o + 1] = y; positions[o + 2] = z;
    normals[o] = nx; normals[o + 1] = ny; normals[o + 2] = nz;
    colors[o] = s * 0.96; colors[o + 1] = s * 0.98; colors[o + 2] = s;
    crest[v] = c;
    return v++;
  };

  for (let j = 0; j <= rows; j++) {
    const y = -(j / rows) * L;
    for (let i = 0; i <= cols; i++) {
      const th = (i / cols) * TAU;
      const [r, shade, cr] = fixtureProfile(th, y);
      const rth = (fixtureProfile(th + e, y)[0] - fixtureProfile(th - e, y)[0]) / (2 * e);
      const ry = (fixtureProfile(th, y + e)[0] - fixtureProfile(th, y - e)[0]) / (2 * e);
      const c = Math.cos(th);
      const s = Math.sin(th);
      // n = ∂P/∂y × ∂P/∂θ  (outward)
      const nx = r * c + rth * s;
      const ny = -r * ry;
      const nz = r * s - rth * c;
      const nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-9) put(r * c, y, r * s, 0, -1, 0, shade, cr);
      else put(r * c, y, r * s, nx / nl, ny / nl, nz / nl, shade, cr);
    }
  }

  // Caps: platform on top (hidden under the collar), domed apex below
  const capTop = v;
  for (let i = 0; i <= cols; i++) put(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2], 0, 1, 0, 0.9, 0);
  const topCenter = put(0, 0, 0, 0, 1, 0, 0.9, 0);
  const capBot = v;
  for (let i = 0; i <= cols; i++) {
    const o = (rows * ring + i) * 3;
    put(positions[o], positions[o + 1], positions[o + 2], 0, -1, 0, 0.55, 0);
  }
  const botCenter = put(0, -L - 0.01, 0, 0, -1, 0, 0.55, 0);

  const index = new Uint32Array(rows * cols * 6 + cols * 6);
  let k = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * ring + i;
      const b = a + 1;
      const c = a + ring;
      const d = c + 1;
      index[k++] = a; index[k++] = b; index[k++] = c;
      index[k++] = b; index[k++] = d; index[k++] = c;
    }
  }
  for (let i = 0; i < cols; i++) {
    index[k++] = topCenter; index[k++] = capTop + i; index[k++] = capTop + i + 1;
    index[k++] = botCenter; index[k++] = capBot + i; index[k++] = capBot + i + 1;
  }
  orient(positions, normals, index);
  return { positions, normals, colors, index, crest };
}

function sampleFixtureSparkles(count: number): Float32Array {
  const rnd = mulberry32(4242);
  const out = new Float32Array(count * 3);
  for (let n = 0; n < count; n++) {
    const th = rnd() * TAU;
    const y = -0.03 - rnd() * (FIXTURE_LENGTH - 0.1);
    const r = fixtureProfile(th, y)[0] + 0.006;
    out[n * 3] = Math.cos(th) * r;
    out[n * 3 + 1] = y;
    out[n * 3 + 2] = Math.sin(th) * r;
  }
  return out;
}

export function buildImplantData(opts: ImplantBuildOptions): ImplantData {
  return {
    crown: buildCrown(opts.crownCell),
    fixture: buildFixture(opts.rowsPerPitch, opts.radialSegments),
    crownSparkles: sampleCrownSparkles(opts.crownSparkles),
    fixtureSparkles: sampleFixtureSparkles(opts.fixtureSparkles),
  };
}
