import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  buildImplantData,
  COLLAR_HEIGHT,
  COLLAR_RADIUS,
  CROWN_SEAT_Y,
  FIXTURE_LENGTH,
  fixtureEnvelope,
  mulberry32,
  type ImplantBuildOptions,
  type ImplantData,
  type MeshData,
} from "../three/implantMesh";
import ImplantWorker from "../three/implant.worker?worker&inline";

type Props = {
  /** Scroll-driven progress (0..1) written by GSAP. */
  progress: MutableRefObject<{ p: number }>;
  className?: string;
};

type Disposable = { dispose: () => void };
type Uniforms = { [key: string]: THREE.IUniform };
type ScanUniforms = {
  uScanY: THREE.IUniform<number>;
  uScanCol: THREE.IUniform<THREE.Color>;
  uScanOn: THREE.IUniform<number>;
};
type Rig = {
  root: THREE.Group;
  rig: THREE.Group;
  spin: THREE.Group;
  crown: THREE.Group;
  abut: THREE.Group;
  fix: THREE.Group;
};
type EnhanceOpts = {
  rim: number;
  rimPow: number;
  rimAmt: number;
  line?: number;
  lineAmt?: number;
  crest?: number;
  crestAmt?: number;
};

const TAU = Math.PI * 2;
const FLOOR_Y = -1.55;
const RIG_Y = -0.12;
const MODEL_SCALE = 1.45;
const CAM_ELEVATION = THREE.MathUtils.degToRad(8);
/** Contour thickness in object units (the artwork's sticker outline). */
const OUTLINE = 0.04;
/** Contour palette — project azure (replaces the artwork's magenta). */
const OUTLINE_DEEP = 0x2763ee;
const OUTLINE_BRIGHT = 0x5ab4ff;
const OUTLINE_EDGE = 0xc2eaff;
const CYAN = 0x45d8ff;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

// ───────────────────────────── GLSL ─────────────────────────────

const FLOOR_FADE = /* glsl */ `
  float floorFade(vec3 wp) {
    float r = length(vec2(wp.x, wp.z * (wp.z > 0.0 ? 1.25 : 0.85)));
    return 1.0 - smoothstep(0.45, 1.3, r);
  }
  float floorReveal(vec3 wp, float reveal) {
    return 1.0 - smoothstep(reveal - 0.35, reveal, length(wp.xz));
  }
`;

/** Screen-space ribbon lines (constant pixel width, soft edges). */
const LINE_VERT = /* glsl */ `
  attribute vec3 aOther;
  attribute float aSide;
  attribute float aT;
  attribute float aRand;
  uniform float uWidth;
  uniform float uAspect;
  varying float vSide;
  varying float vRand;
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    vSide = aSide;
    vRand = aRand;
    mat4 mvp = projectionMatrix * modelViewMatrix;
    vec4 cSelf = mvp * vec4(position, 1.0);
    vec4 cOther = mvp * vec4(aOther, 1.0);
    vec2 sSelf = cSelf.xy / cSelf.w;
    vec2 sOther = cOther.xy / cOther.w;
    vec2 dir = aT < 0.5 ? sOther - sSelf : sSelf - sOther;
    dir.x *= uAspect;
    float len = length(dir);
    dir = len > 1e-6 ? dir / len : vec2(1.0, 0.0);
    vec2 nrm = vec2(-dir.y, dir.x);
    nrm.x /= uAspect;
    cSelf.xy += nrm * aSide * uWidth * cSelf.w;
    gl_Position = cSelf;
  }
`;

const LINE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uReveal;
  varying float vSide;
  varying float vRand;
  varying vec3 vWorld;
  ${FLOOR_FADE}
  void main() {
    float core = 1.0 - smoothstep(0.15, 1.0, abs(vSide));
    float flow = 0.58 + 0.42 * sin(length(vWorld.xz) * 6.5 - uTime * 1.3 + vRand * 6.2832);
    float a = core * floorFade(vWorld) * floorReveal(vWorld, uReveal) * flow * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

const GLOW_POINT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vA;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(c, c);
    if (r2 > 1.0) discard;
    float core = exp(-r2 * 16.0);
    float a = (core + exp(-r2 * 3.5) * 0.4) * vA * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(mix(uColor, vec3(1.0), core * 0.55), a);
    #include <colorspace_fragment>
  }
`;

const FLOOR_POINT_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uScale;
  uniform float uTime;
  uniform float uReveal;
  uniform float uTwinkle;
  varying float vA;
  ${FLOOR_FADE}
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    float tw = mix(1.0, 0.55 + 0.45 * sin(uTime * 1.7 + aPhase), uTwinkle);
    vA = floorFade(wp.xyz) * floorReveal(wp.xyz, uReveal) * tw;
    vec4 mv = viewMatrix * wp;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(aSize * uScale / -mv.z, 1.0);
  }
`;

const SPARKLE_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uScale;
  uniform float uTime;
  uniform float uAnim;
  varying float vA;
  void main() {
    float s = 0.5 + 0.5 * sin(uTime * aSpeed + aPhase);
    vA = mix(0.55, 0.18 + 0.82 * pow(s, 5.0), uAnim);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(aSize * uScale / -mv.z, 1.0);
  }
`;

const DUST_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uScale;
  uniform float uTime;
  uniform float uYMin;
  uniform float uYRange;
  uniform float uAnim;
  varying float vA;
  void main() {
    vec3 p = position;
    p.y = uYMin + mod(p.y - uYMin + uTime * aSpeed * uAnim, uYRange);
    float h = (p.y - uYMin) / uYRange;
    float tw = 0.5 + 0.5 * sin(uTime * 2.1 * uAnim + aPhase);
    vA = smoothstep(0.0, 0.12, h) * smoothstep(1.0, 0.7, h) * (0.3 + 0.7 * tw * tw);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(aSize * uScale / -mv.z, 1.0);
  }
`;

const BOKEH_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uScale;
  uniform float uTime;
  varying float vA;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.13 + aPhase) * 0.1;
    p.y += cos(uTime * 0.11 + aPhase * 1.7) * 0.08;
    vA = 0.6 + 0.4 * sin(uTime * 0.5 + aPhase * 2.3);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / -mv.z;
  }
`;

const BOKEH_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vA;
  void main() {
    float r = length(gl_PointCoord * 2.0 - 1.0);
    if (r > 1.0) discard;
    float a = smoothstep(1.0, 0.84, r) * (0.45 + 0.55 * smoothstep(0.55, 0.92, r)) * vA * uOpacity;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

const SHAFT_VERT = /* glsl */ `
  uniform float uHeight;
  varying vec3 vN;
  varying vec3 vV;
  varying float vH;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vH = position.y / uHeight + 0.5;
    gl_Position = projectionMatrix * mv;
  }
`;

const SHAFT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vV;
  varying float vH;
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float a = facing * facing * smoothstep(0.0, 0.2, vH) * smoothstep(1.0, 0.55, vH) * uOpacity;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

/** Inverted-hull contour: back faces pushed along the normals, azure gradient toward the silhouette. */
const OUTLINE_VERT = /* glsl */ `
  uniform float uPush;
  uniform float uDownFade;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    // Optionally keep downward-facing faces (the crown seat) from spilling over the collar
    float push = uPush * mix(1.0, smoothstep(-0.92, -0.45, normal.y), uDownFade);
    vec4 mv = modelViewMatrix * vec4(position + normal * push, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const OUTLINE_FRAG = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uBright;
  uniform vec3 uEdge;
  uniform float uGlow;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float edge = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    vec3 col = mix(uDeep, uBright, smoothstep(0.15, 0.85, edge));
    col = mix(col, uEdge, smoothstep(0.93, 1.0, edge) * 0.55);
    gl_FragColor = vec4(col * uGlow, 1.0);
    #include <colorspace_fragment>
  }
`;

// ───────────────────────────── Helpers ─────────────────────────────

function radialTexture(stops: Array<[number, string]>, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) grd.addColorStop(o, col);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Dark studio: overhead softbox, white key strips (porcelain highlights) and cyan side strips (edge glow). */
function createEnvironment(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x01040f);
  const geo = new THREE.PlaneGeometry(1, 1);
  const mats: THREE.Material[] = [];
  const panel = (w: number, h: number, hex: number, intensity: number, pos: [number, number, number]) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(intensity), side: THREE.DoubleSide });
    mats.push(m);
    const mesh = new THREE.Mesh(geo, m);
    mesh.scale.set(w, h, 1);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  panel(8, 2.6, 0xffffff, 6, [0, 5.4, 1.2]);
  panel(0.8, 7, 0xffffff, 4.6, [-4.6, 0.6, 2.4]);
  panel(0.8, 7, 0x6fe0ff, 4.4, [4.6, 0.2, 1.4]);
  panel(0.8, 6, 0x45d8ff, 3.2, [-4.4, 0.4, -1.8]);
  panel(3.2, 2.2, 0xffffff, 2.2, [1.8, 1.4, 5.4]);
  panel(3.6, 6, 0xffffff, 1.5, [-2.8, 0, 5]);
  panel(6, 3, 0x2a6dff, 1.8, [0, 1, -5.6]);
  panel(9, 3, 0x0b2a8a, 0.6, [0, -4.6, 0.6]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.02);
  pmrem.dispose();
  geo.dispose();
  mats.forEach((m) => m.dispose());
  return rt;
}

/** Fresnel rim, inner glow line, thread-crest glow and a holographic scan band on a physical material. */
function enhance(mat: THREE.MeshPhysicalMaterial, o: EnhanceOpts, scan: ScanUniforms) {
  const useCrest = o.crest !== undefined;
  const u = {
    uRim: { value: new THREE.Color(o.rim) },
    uRimPow: { value: o.rimPow },
    uRimAmt: { value: o.rimAmt },
    uLine: { value: new THREE.Color(o.line ?? 0x000000) },
    uLineAmt: { value: o.lineAmt ?? 0 },
    uCrest: { value: new THREE.Color(o.crest ?? 0x000000) },
    uCrestAmt: { value: o.crestAmt ?? 0 },
    ...scan,
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vWorldY;
        ${useCrest ? "attribute float aCrest;\nvarying float vCrest;" : ""}`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vWorldY = (modelMatrix * vec4(transformed, 1.0)).y;
        ${useCrest ? "vCrest = aCrest;" : ""}`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vWorldY;
        uniform vec3 uRim;
        uniform float uRimPow;
        uniform float uRimAmt;
        uniform vec3 uLine;
        uniform float uLineAmt;
        uniform vec3 uCrest;
        uniform float uCrestAmt;
        uniform float uScanY;
        uniform vec3 uScanCol;
        uniform float uScanOn;
        ${useCrest ? "varying float vCrest;" : ""}`
      )
      .replace(
        "#include <tonemapping_fragment>",
        `{
          float ndv = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
          float fr = 1.0 - ndv;
          gl_FragColor.rgb += uRim * pow(fr, uRimPow) * uRimAmt;
          float line = smoothstep(0.42, 0.6, fr) * (1.0 - smoothstep(0.66, 0.86, fr));
          gl_FragColor.rgb += uLine * line * uLineAmt;
          ${useCrest ? "gl_FragColor.rgb += uCrest * pow(vCrest, 5.0) * uCrestAmt * (0.45 + 0.55 * fr);" : ""}
          float sd = abs(vWorldY - uScanY);
          gl_FragColor.rgb += uScanCol * (smoothstep(0.03, 0.0, sd) * 1.2 + smoothstep(0.26, 0.0, sd) * 0.15) * uScanOn;
        }
        #include <tonemapping_fragment>`
      );
  };
  mat.customProgramCacheKey = () => (useCrest ? "implant-enhance-crest" : "implant-enhance");
}

/** Additive fresnel shell (glassy cyan edge / soft glow) — vertices pushed along the normals. */
function fresnelShell(color: number, push: number, power: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uStrength: { value: 0 },
      uPush: { value: push },
      uPower: { value: power },
    },
    vertexShader: /* glsl */ `
      uniform float uPush;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position + normal * uPush, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      uniform float uPower;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        gl_FragColor = vec4(uColor, pow(f, uPower) * uStrength);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function outlineMaterial(downFade = 0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uPush: { value: 0 },
      uDownFade: { value: downFade },
      uDeep: { value: new THREE.Color(OUTLINE_DEEP) },
      uBright: { value: new THREE.Color(OUTLINE_BRIGHT) },
      uEdge: { value: new THREE.Color(OUTLINE_EDGE) },
      uGlow: { value: 1 },
    },
    vertexShader: OUTLINE_VERT,
    fragmentShader: OUTLINE_FRAG,
    side: THREE.BackSide,
  });
}

/** Glossy-floor reflection for the mirrored rig: fades with depth below the floor. */
function reflectionMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uFloorY: { value: FLOOR_Y },
      uColorA: { value: new THREE.Color(0x0d3a8a) },
      uColorB: { value: new THREE.Color(0x8fd6ff) },
      uStrength: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uFloorY;
      varying vec3 vN;
      varying vec3 vV;
      varying float vDepth;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDepth = uFloorY - wp.y;
        vec4 mv = viewMatrix * wp;
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uStrength;
      varying vec3 vN;
      varying vec3 vV;
      varying float vDepth;
      void main() {
        if (vDepth < 0.0) discard;
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float fade = 1.0 - smoothstep(0.0, 1.05, vDepth);
        gl_FragColor = vec4(mix(uColorA, uColorB, f), uStrength * fade * fade * (0.22 + 0.78 * pow(f, 1.5)));
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Poisson-ish node layout on the floor + each node linked to its nearest neighbours. */
function buildPlexus(count: number, radius: number, rnd: () => number) {
  const nodes: Array<[number, number]> = [];
  const minD2 = (radius * 0.2) ** 2;
  for (let tries = 0; nodes.length < count && tries < count * 80; tries++) {
    const r = radius * Math.sqrt(rnd());
    const a = rnd() * TAU;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r * 0.92;
    if (nodes.every(([nx, nz]) => (nx - x) ** 2 + (nz - z) ** 2 > minD2)) nodes.push([x, z]);
  }
  const seen = new Set<number>();
  const edges: Array<[number, number]> = [];
  const maxD2 = (radius * 0.6) ** 2;
  nodes.forEach(([x, z], i) => {
    nodes
      .map(([qx, qz], j) => [j, (qx - x) ** 2 + (qz - z) ** 2] as [number, number])
      .filter(([j, d]) => j !== i && d < maxD2)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .forEach(([j]) => {
        const key = i < j ? i * 4096 + j : j * 4096 + i;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([i, j]);
        }
      });
  });
  return { nodes, edges };
}

function ribbonGeometry(nodes: Array<[number, number]>, edges: Array<[number, number]>, rnd: () => number) {
  const n = edges.length;
  const pos = new Float32Array(n * 12);
  const other = new Float32Array(n * 12);
  const side = new Float32Array(n * 4);
  const tt = new Float32Array(n * 4);
  const rand = new Float32Array(n * 4);
  const idx = new Uint32Array(n * 6);
  edges.forEach(([a, b], e) => {
    const A = nodes[a];
    const B = nodes[b];
    const r = rnd();
    const verts: Array<[[number, number], [number, number], number, number]> = [
      [A, B, -1, 0],
      [A, B, 1, 0],
      [B, A, -1, 1],
      [B, A, 1, 1],
    ];
    verts.forEach(([self, oth, s, t], k) => {
      const v = e * 4 + k;
      pos.set([self[0], 0, self[1]], v * 3);
      other.set([oth[0], 0, oth[1]], v * 3);
      side[v] = s;
      tt[v] = t;
      rand[v] = r;
    });
    idx.set([e * 4, e * 4 + 1, e * 4 + 2, e * 4 + 2, e * 4 + 1, e * 4 + 3], e * 6);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aOther", new THREE.BufferAttribute(other, 3));
  g.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  g.setAttribute("aT", new THREE.BufferAttribute(tt, 1));
  g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

function FallbackImplant() {
  return (
    <svg
      viewBox="0 0 220 340"
      className="absolute left-1/2 top-1/2 h-[82%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_28px_rgba(90,180,255,0.6)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="impl-crown" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#dfe9f2" />
          <stop offset="1" stopColor="#a9c3da" />
        </linearGradient>
        <linearGradient id="impl-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4c5866" />
          <stop offset="0.45" stopColor="#c3ccd6" />
          <stop offset="1" stopColor="#465260" />
        </linearGradient>
      </defs>
      <g stroke="#4fa8ff" strokeWidth="9" strokeLinejoin="round">
        <path d="M60 22c-22 0-38 18-38 46 0 30 8 46 14 64 6 20 16 34 34 40h80c18-6 28-20 34-40 6-18 14-34 14-64 0-28-16-46-38-46-16 0-24 9-35 9S76 22 60 22Z" fill="url(#impl-crown)" />
        <path d="M78 172h64v20H78z" fill="url(#impl-metal)" />
        <path d="M82 192h56l-10 124c-4 10-10 14-18 14s-14-4-18-14z" fill="url(#impl-metal)" />
      </g>
      {[206, 222, 238, 254, 270, 286, 302].map((y, i) => (
        <path key={y} d={`M${84 + i * 1.6} ${y}h${52 - i * 3.2}`} stroke="#45d8ff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      ))}
      <path d="M78 172h64" stroke="#7fe6ff" strokeWidth="3" />
    </svg>
  );
}

// ───────────────────────────── Component ─────────────────────────────

export default function Implant3D({ progress, className = "" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const intensity = isMobile ? 0.5 : 1;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        // Static (reduced-motion) mode renders on demand: keep the last frame.
        preserveDrawingBuffer: reduced,
      });
    } catch {
      setFailed(true);
      return;
    }

    let disposed = false;
    const disposables: Disposable[] = [];
    const track = <T extends Disposable>(o: T): T => {
      disposables.push(o);
      return o;
    };

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;

    const scene = new THREE.Scene();
    const envRT = createEnvironment(renderer);
    scene.environment = envRT.texture;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    const camTarget = new THREE.Vector3(0, -0.01, 0);
    const camDir = new THREE.Vector3(0, Math.sin(CAM_ELEVATION), Math.cos(CAM_ELEVATION));
    let camDist = 7;
    const rnd = mulberry32(20260517);

    const pointMats: THREE.ShaderMaterial[] = [];
    const lineMats: Array<{ mat: THREE.ShaderMaterial; half: number }> = [];
    const points = (
      vertexShader: string,
      fragmentShader: string,
      uniforms: Uniforms,
      extra: Partial<THREE.ShaderMaterialParameters> = {}
    ) => {
      const mat = track(
        new THREE.ShaderMaterial({
          uniforms: { uScale: { value: 800 }, uTime: { value: 0 }, uOpacity: { value: 1 }, ...uniforms },
          vertexShader,
          fragmentShader,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          ...extra,
        })
      );
      pointMats.push(mat);
      return mat;
    };
    const additive = (params: THREE.MeshBasicMaterialParameters) =>
      track(
        new THREE.MeshBasicMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
          ...params,
        })
      );

    // ---------- Lights ----------
    scene.add(new THREE.HemisphereLight(0xd6e8ff, 0x061238, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(2.2, 4.2, 4.6);
    const rimL = new THREE.PointLight(CYAN, 24, 0, 2);
    rimL.position.set(-2.4, 1, -1.6);
    const rimR = new THREE.PointLight(0x6fe0ff, 22, 0, 2);
    rimR.position.set(2.5, 0.1, -1.8);
    const under = new THREE.PointLight(0x2a64ff, 6, 0, 2);
    under.position.set(0, FLOOR_Y + 0.25, 1.2);
    scene.add(key, rimL, rimR, under);

    // ---------- Backdrop: glows, horizon, light shaft, bokeh ----------
    const glowTex = track(
      radialTexture([
        [0, "rgba(120,190,255,0.85)"],
        [0.3, "rgba(60,130,255,0.36)"],
        [0.65, "rgba(30,80,255,0.1)"],
        [1, "rgba(20,60,255,0)"],
      ])
    );
    const spriteMat = () =>
      track(
        new THREE.SpriteMaterial({
          map: glowTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
          opacity: 0,
        })
      );
    const backGlow = new THREE.Sprite(spriteMat());
    backGlow.scale.set(3.8, 3.8, 1);
    backGlow.position.set(0, 0.3, -1.6);
    const halo = new THREE.Sprite(spriteMat());
    halo.scale.set(2.5, 3.9, 1);
    halo.position.set(0, 0.05, -0.9);
    const horizon = new THREE.Sprite(spriteMat());
    horizon.scale.set(3.4, 0.62, 1);
    horizon.position.set(0, FLOOR_Y + 0.1, -1.3);
    backGlow.renderOrder = halo.renderOrder = horizon.renderOrder = -2;
    scene.add(backGlow, halo, horizon);

    const SHAFT_H = 3.8;
    const shaftMat = track(
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(0x5fb0ff) }, uOpacity: { value: 0 }, uHeight: { value: SHAFT_H } },
        vertexShader: SHAFT_VERT,
        fragmentShader: SHAFT_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.24, 1.15, SHAFT_H, 48, 1, true)), shaftMat);
    shaft.position.y = FLOOR_Y + SHAFT_H / 2;
    shaft.renderOrder = -1;
    scene.add(shaft);

    const BOKEH = isMobile ? 8 : 16;
    const bokehGeo = track(new THREE.BufferGeometry());
    {
      const bp = new Float32Array(BOKEH * 3);
      const bs = new Float32Array(BOKEH);
      const bph = new Float32Array(BOKEH);
      for (let i = 0; i < BOKEH; i++) {
        bp[i * 3] = (rnd() * 2 - 1) * 1.1;
        bp[i * 3 + 1] = -1 + rnd() * 2.6;
        bp[i * 3 + 2] = -1.4 - rnd() * 1.6;
        bs[i] = 0.14 + rnd() * 0.22;
        bph[i] = rnd() * TAU;
      }
      bokehGeo.setAttribute("position", new THREE.BufferAttribute(bp, 3));
      bokehGeo.setAttribute("aSize", new THREE.BufferAttribute(bs, 1));
      bokehGeo.setAttribute("aPhase", new THREE.BufferAttribute(bph, 1));
    }
    const bokehMat = points(BOKEH_VERT, BOKEH_FRAG, { uColor: { value: new THREE.Color(0x4f9dff) } });
    bokehMat.uniforms.uOpacity.value = 0.14;
    const bokeh = new THREE.Points(bokehGeo, bokehMat);
    bokeh.frustumCulled = false;
    bokeh.renderOrder = -2;
    scene.add(bokeh);

    // ---------- Floor: glossy pool + plexus network + pulses + sonar ----------
    const floor = new THREE.Group();
    floor.position.y = FLOOR_Y;
    scene.add(floor);

    const flat = (m: THREE.Mesh, y: number) => {
      m.rotation.x = -Math.PI / 2;
      m.position.y = y;
      floor.add(m);
      return m;
    };
    const pool = flat(
      new THREE.Mesh(
        track(new THREE.CircleGeometry(1.7, 64)),
        track(
          new THREE.MeshBasicMaterial({
            color: 0x000000,
            map: track(
              radialTexture([
                [0, "rgba(255,255,255,1)"],
                [0.55, "rgba(255,255,255,0.6)"],
                [1, "rgba(255,255,255,0)"],
              ])
            ),
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
          })
        )
      ),
      0
    );
    pool.renderOrder = -3;
    const lightPoolMat = additive({
      map: track(
        radialTexture([
          [0, "rgba(120,200,255,0.75)"],
          [0.35, "rgba(60,140,255,0.28)"],
          [1, "rgba(30,90,255,0)"],
        ])
      ),
      opacity: 0,
    });
    flat(new THREE.Mesh(track(new THREE.CircleGeometry(1.25, 64)), lightPoolMat), 0.003);

    const { nodes, edges } = buildPlexus(isMobile ? 34 : 56, 1.55, rnd);
    const ribbon = track(ribbonGeometry(nodes, edges, rnd));
    const lineMat = (color: number, opacity: number, half: number) => {
      const mat = track(
        new THREE.ShaderMaterial({
          uniforms: {
            uColor: { value: new THREE.Color(color) },
            uOpacity: { value: opacity },
            uTime: { value: 0 },
            uReveal: { value: 0 },
            uWidth: { value: 0.004 },
            uAspect: { value: 1 },
          },
          vertexShader: LINE_VERT,
          fragmentShader: LINE_FRAG,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      );
      lineMats.push({ mat, half });
      return mat;
    };
    for (const m of [
      new THREE.Mesh(ribbon, lineMat(0x3b95ff, 0.3, 3.4)),
      new THREE.Mesh(ribbon, lineMat(0xa8e8ff, 1, 0.9)),
    ]) {
      m.frustumCulled = false;
      m.position.y = 0.006;
      floor.add(m);
    }

    const nodeGeo = track(new THREE.BufferGeometry());
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nodes.flatMap(([x, z]) => [x, 0.01, z])), 3));
    nodeGeo.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(nodes.map(() => 0.045 + rnd() * 0.06)), 1));
    nodeGeo.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(nodes.map(() => rnd() * TAU)), 1));
    const nodeMat = points(FLOOR_POINT_VERT, GLOW_POINT_FRAG, {
      uColor: { value: new THREE.Color(0x8fdcff) },
      uReveal: { value: 0 },
      uTwinkle: { value: reduced ? 0 : 1 },
    });
    const nodePts = new THREE.Points(nodeGeo, nodeMat);
    nodePts.frustumCulled = false;
    floor.add(nodePts);

    // Light pulses travelling node → node (random walk)
    const PULSES = edges.length ? (isMobile ? 4 : 8) : 0;
    const adj: number[][] = nodes.map(() => []);
    for (const [a, b] of edges) {
      adj[a].push(b);
      adj[b].push(a);
    }
    const pulses = Array.from({ length: PULSES }, () => {
      const [a, b] = edges[Math.floor(rnd() * edges.length)];
      return { a, b, k: rnd(), speed: 0.3 + rnd() * 0.35 };
    });
    const pulseCount = Math.max(1, PULSES);
    const pulsePos = new Float32Array(pulseCount * 3);
    const pulseGeo = track(new THREE.BufferGeometry());
    pulseGeo.setAttribute("position", new THREE.BufferAttribute(pulsePos, 3));
    pulseGeo.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(pulseCount).fill(0.06), 1));
    pulseGeo.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(pulseCount), 1));
    const pulseMat = points(FLOOR_POINT_VERT, GLOW_POINT_FRAG, {
      uColor: { value: new THREE.Color(0xd6f4ff) },
      uReveal: { value: 0 },
      uTwinkle: { value: 0 },
    });
    const pulsePts = new THREE.Points(pulseGeo, pulseMat);
    pulsePts.frustumCulled = false;
    pulsePts.visible = PULSES > 0;
    floor.add(pulsePts);

    const ringGeo = track(new THREE.RingGeometry(0.97, 1, 128));
    const sonarMats = [0, 1].map(() => additive({ color: 0x8fd6ff, opacity: 0, side: THREE.DoubleSide }));
    const sonar = sonarMats.map((m) => flat(new THREE.Mesh(ringGeo, m), 0.01));
    const burstMat = additive({ color: 0xbfeaff, opacity: 0, side: THREE.DoubleSide });
    const burst = flat(new THREE.Mesh(track(new THREE.RingGeometry(0.9, 1, 128)), burstMat), 0.012);
    burst.visible = false;

    // ---------- Floating dust ----------
    const DUST = isMobile ? 30 : 60;
    const dustGeo = track(new THREE.BufferGeometry());
    {
      const dp = new Float32Array(DUST * 3);
      const ds = new Float32Array(DUST);
      const dph = new Float32Array(DUST);
      const dsp = new Float32Array(DUST);
      for (let i = 0; i < DUST; i++) {
        const r = 0.75 + rnd() * 0.75;
        const a = rnd() * TAU;
        dp[i * 3] = Math.cos(a) * r;
        dp[i * 3 + 1] = FLOOR_Y + rnd() * 3.3;
        dp[i * 3 + 2] = Math.sin(a) * r * 0.8;
        ds[i] = 0.012 + rnd() * 0.018;
        dph[i] = rnd() * TAU;
        dsp[i] = 0.05 + rnd() * 0.09;
      }
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
      dustGeo.setAttribute("aSize", new THREE.BufferAttribute(ds, 1));
      dustGeo.setAttribute("aPhase", new THREE.BufferAttribute(dph, 1));
      dustGeo.setAttribute("aSpeed", new THREE.BufferAttribute(dsp, 1));
    }
    const dustMat = points(DUST_VERT, GLOW_POINT_FRAG, {
      uColor: { value: new THREE.Color(0xa6e0ff) },
      uYMin: { value: FLOOR_Y },
      uYRange: { value: 3.3 },
      uAnim: { value: reduced ? 0 : 1 },
    });
    dustMat.uniforms.uOpacity.value = 0.8;
    const dust = new THREE.Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    dust.renderOrder = 5;
    scene.add(dust);

    // ---------- Implant materials (styled after the artwork) ----------
    const scan: ScanUniforms = {
      uScanY: { value: -10 },
      uScanCol: { value: new THREE.Color(0x7fe0ff) },
      uScanOn: { value: 0 },
    };
    // Crown: glossy white porcelain, cyan edge line + cyan rim
    const crownMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xf2f6fa,
        vertexColors: true,
        roughness: 0.16,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        sheen: 0.2,
        sheenColor: new THREE.Color(0xcff4ff),
        sheenRoughness: 0.4,
        emissive: new THREE.Color(0x081a2e),
        envMapIntensity: 1,
      })
    );
    enhance(crownMat, { rim: CYAN, rimPow: 2.2, rimAmt: 0.45, line: 0x5fe3ff, lineAmt: 0.75 }, scan);
    // Collar: polished metal ring
    const collarMat = track(
      new THREE.MeshPhysicalMaterial({ color: 0xb5c0cc, metalness: 1, roughness: 0.2, envMapIntensity: 1.4 })
    );
    enhance(collarMat, { rim: CYAN, rimPow: 3, rimAmt: 0.3 }, scan);
    // Screw: graphite titanium with glowing cyan thread crests
    const fixtureMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xb4bdc8,
        vertexColors: true,
        metalness: 0.8,
        roughness: 0.34,
        envMapIntensity: 1.15,
      })
    );
    enhance(fixtureMat, { rim: CYAN, rimPow: 3, rimAmt: 0.3, crest: 0x4fe0ff, crestAmt: 0.36 }, scan);

    const crownShellMat = track(fresnelShell(0x3fd4ff, 0.022, 2.4));
    const outlineMats = [outlineMaterial(1), outlineMaterial(1), outlineMaterial()].map(track);
    const [crownOutlineMat, collarOutlineMat, fixOutlineMat] = outlineMats;
    const reflMat = track(reflectionMaterial());
    const crownSparkMat = points(SPARKLE_VERT, GLOW_POINT_FRAG, {
      uColor: { value: new THREE.Color(0x8ff0ff) },
      uAnim: { value: reduced ? 0 : 1 },
    });
    const fixSparkMat = points(SPARKLE_VERT, GLOW_POINT_FRAG, {
      uColor: { value: new THREE.Color(0x7fe8ff) },
      uAnim: { value: reduced ? 0 : 1 },
    });
    crownSparkMat.uniforms.uOpacity.value = 0;
    fixSparkMat.uniforms.uOpacity.value = 0;

    // ---------- Implant rigs (main + mirrored floor reflection) ----------
    const makeRig = (): Rig => {
      const root = new THREE.Group();
      const rig = new THREE.Group();
      const spin = new THREE.Group();
      const crown = new THREE.Group();
      const abut = new THREE.Group();
      const fix = new THREE.Group();
      root.add(rig);
      rig.add(spin);
      spin.add(crown, abut, fix);
      return { root, rig, spin, crown, abut, fix };
    };
    const main = makeRig();
    main.root.visible = false;
    scene.add(main.root);
    const refl = isMobile ? null : makeRig();
    if (refl) {
      refl.root.scale.y = -1;
      refl.root.position.y = 2 * FLOOR_Y;
      refl.root.visible = false;
      scene.add(refl.root);
    }

    const latheSegs = isMobile ? 64 : 112;
    const v2 = (r: number, y: number) => new THREE.Vector2(r, y);
    // Collar ring
    const collarGeo = track(
      new THREE.LatheGeometry(
        [
          [0, 0], [0.17, 0], [0.198, 0.004], [0.208, 0.014], [COLLAR_RADIUS, 0.03], [COLLAR_RADIUS, 0.074],
          [0.207, 0.09], [0.196, 0.098], [0.17, COLLAR_HEIGHT], [0, COLLAR_HEIGHT],
        ].map(([r, y]) => v2(r, y)),
        latheSegs
      )
    );
    const collarOutlineGeo = track(
      new THREE.LatheGeometry(
        [[0, -0.012], [COLLAR_RADIUS - 0.01, -0.012], [COLLAR_RADIUS, 0.0], [COLLAR_RADIUS, COLLAR_HEIGHT + 0.004], [0, COLLAR_HEIGHT + 0.004]].map(
          ([r, y]) => v2(r, y)
        ),
        latheSegs
      )
    );
    // Smooth envelope of the threaded screw (so the contour is clean, like the artwork)
    const fixOutlinePts: THREE.Vector2[] = [v2(0, -FIXTURE_LENGTH - 0.012)];
    const ENV_STEPS = 90;
    for (let i = 0; i <= ENV_STEPS; i++) {
      const y = -FIXTURE_LENGTH + (FIXTURE_LENGTH * i) / ENV_STEPS;
      fixOutlinePts.push(v2(Math.max(0.02, fixtureEnvelope(y)), y));
    }
    fixOutlinePts.push(v2(0, 0.004));
    const fixOutlineGeo = track(new THREE.LatheGeometry(fixOutlinePts, latheSegs));

    main.abut.add(new THREE.Mesh(collarGeo, collarMat), new THREE.Mesh(collarOutlineGeo, collarOutlineMat));
    main.fix.add(new THREE.Mesh(fixOutlineGeo, fixOutlineMat));
    refl?.abut.add(new THREE.Mesh(collarGeo, reflMat));

    // Light rings on the collar (crown junction + screw junction), as in the artwork
    const ringMatTop = additive({ color: 0x8fefff, opacity: 0 });
    const ringMatBot = additive({ color: 0x5fd8ff, opacity: 0 });
    const ringTop = new THREE.Mesh(track(new THREE.TorusGeometry(0.2, 0.0048, 8, 128)), ringMatTop);
    ringTop.rotation.x = Math.PI / 2;
    ringTop.position.y = COLLAR_HEIGHT - 0.003;
    const ringBot = new THREE.Mesh(track(new THREE.TorusGeometry(0.186, 0.0032, 8, 128)), ringMatBot);
    ringBot.rotation.x = Math.PI / 2;
    ringBot.position.y = 0.004;
    ringTop.renderOrder = ringBot.renderOrder = 3;
    main.abut.add(ringTop, ringBot);

    // ---------- Loop state ----------
    let raf = 0;
    let running = false;
    let lastTime = performance.now();
    let t = 0;
    let since = 0;
    let ready = false;
    let revealed = false;
    let landed = false;
    let landT = 0;
    let autoRot = 0;
    let dragRot = 0;
    let dragVel = 0;
    let dragging = false;
    let lastX = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const copyPose = (src: Rig, dst: Rig) => {
      dst.rig.position.copy(src.rig.position);
      dst.rig.rotation.copy(src.rig.rotation);
      dst.spin.rotation.copy(src.spin.rotation);
      dst.spin.scale.copy(src.spin.scale);
      dst.crown.position.copy(src.crown.position);
      dst.abut.position.copy(src.abut.position);
      dst.fix.position.copy(src.fix.position);
      dst.fix.rotation.copy(src.fix.rotation);
    };

    const update = (dt: number) => {
      t += dt;
      if (ready) since += dt;
      const p = reduced ? 0 : clamp01(progress.current.p) * intensity;
      const tl = reduced ? 99 : since;
      const reveal = ready ? easeOut(tl / 1.7) : 0;
      const appear = ready ? easeOut(tl / 0.9) : 0;
      const asm = ready ? easeOut((tl - 0.3) / 1.9) : 0;
      const eAsm = 1 - asm;
      if (ready && !landed && asm > 0.985) {
        landed = true;
        landT = t;
      }
      const flash = landed && !reduced ? Math.exp(-(t - landT) * 2.4) : 0;

      const k = Math.min(1, dt * 3);
      pointer.x += (pointer.tx - pointer.x) * k;
      pointer.y += (pointer.ty - pointer.y) * k;
      if (!reduced) autoRot += dt * 0.22; // slow: ~28 s per turn
      if (!dragging) {
        dragRot += dragVel * dt;
        dragVel *= Math.exp(-dt * 2.6);
      }

      // Assembly runs only on entrance; scroll transforms the assembled implant as one unit.
      main.crown.position.y = CROWN_SEAT_Y + 0.75 * eAsm;
      main.abut.position.y = 0.32 * eAsm;
      main.fix.position.y = -0.4 * eAsm;
      main.fix.rotation.y = -eAsm * 5.5;
      main.spin.scale.setScalar(MODEL_SCALE * (0.9 + 0.1 * appear));
      main.spin.rotation.y = -0.45 + autoRot + dragRot + p * Math.PI * 0.75 - eAsm * 2.4;
      main.rig.rotation.set(
        0.03 + pointer.y * 0.14 - p * 0.05,
        pointer.x * 0.26,
        -0.06 - pointer.x * 0.04 + (reduced ? 0 : Math.sin(t * 0.6) * 0.02)
      );
      main.rig.position.y = RIG_Y + (reduced ? 0 : Math.sin(t * 0.85) * 0.04);
      if (refl) copyPose(main, refl);

      // Contour grows out of the silhouette, flashes when the crown lands
      const push = OUTLINE * appear;
      for (const m of outlineMats) {
        m.uniforms.uPush.value = push;
        m.uniforms.uGlow.value = 1 + flash * 0.45;
      }
      crownShellMat.uniforms.uStrength.value = 0.85 * appear + flash * 0.6;
      reflMat.uniforms.uStrength.value = 0.3 * appear;
      crownSparkMat.uniforms.uOpacity.value = appear;
      fixSparkMat.uniforms.uOpacity.value = appear * 0.9;
      ringMatTop.opacity = (0.75 + 0.2 * Math.sin(t * 2.2)) * asm + flash;
      ringMatBot.opacity = 0.45 * asm + flash * 0.5;

      // Holographic scan sweep (every 7.5 s once assembled)
      if (landed && !reduced) {
        const s = clamp01((((t - landT) % 7.5) - 1.1) / 2.6);
        scan.uScanY.value = -1.48 + 3.05 * smooth(s) + (main.rig.position.y - RIG_Y);
        scan.uScanOn.value = Math.sin(Math.PI * s);
      } else {
        scan.uScanOn.value = 0;
      }

      // Floor network
      if (!reduced) floor.rotation.y += dt * 0.025;
      for (const { mat } of lineMats) {
        mat.uniforms.uTime.value = t;
        mat.uniforms.uReveal.value = reveal * 2.3;
      }
      nodeMat.uniforms.uReveal.value = reveal * 2.3;
      pulseMat.uniforms.uReveal.value = reveal * 2.3;
      for (let i = 0; i < pulses.length; i++) {
        const pl = pulses[i];
        if (!reduced) {
          const A0 = nodes[pl.a];
          const B0 = nodes[pl.b];
          pl.k += (dt * pl.speed) / (Math.hypot(B0[0] - A0[0], B0[1] - A0[1]) || 0.1);
          while (pl.k >= 1) {
            pl.k -= 1;
            const options = adj[pl.b].filter((nb) => nb !== pl.a);
            const next = options.length ? options[Math.floor(Math.random() * options.length)] : pl.a;
            pl.a = pl.b;
            pl.b = next;
          }
        }
        const A = nodes[pl.a];
        const B = nodes[pl.b];
        pulsePos[i * 3] = A[0] + (B[0] - A[0]) * pl.k;
        pulsePos[i * 3 + 1] = 0.012;
        pulsePos[i * 3 + 2] = A[1] + (B[1] - A[1]) * pl.k;
      }
      if (pulses.length) pulseGeo.attributes.position.needsUpdate = true;
      sonar.forEach((m, i) => {
        const ph = reduced ? 0.35 + i * 0.3 : (t * 0.2 + i * 0.5) % 1;
        m.scale.setScalar(0.25 + ph * 1.05);
        sonarMats[i].opacity = (1 - ph) * (1 - ph) * 0.3 * reveal;
      });
      const bk = landed ? clamp01((t - landT) / 1.5) : 1;
      burst.visible = !reduced && bk < 1;
      burst.scale.setScalar(0.2 + 1.1 * easeOut(bk));
      burstMat.opacity = (1 - bk) * (1 - bk) * 0.9;

      lightPoolMat.opacity = 0.55 * appear + flash * 0.4;
      shaftMat.uniforms.uOpacity.value = 0.07 * appear + flash * 0.05;
      backGlow.material.opacity = (0.66 + Math.sin(t * 1.1) * 0.06) * Math.max(appear, 0.35);
      halo.material.opacity = 0.42 * appear + flash * 0.25;
      horizon.material.opacity = 0.55 * reveal;
      for (const m of pointMats) m.uniforms.uTime.value = t;

      // Gentle cinematic dolly-out without changing the parts' relative positions.
      camera.position.copy(camTarget).addScaledVector(camDir, camDist * (1 + 0.12 * p));
      camera.lookAt(camTarget);
    };

    const renderFrame = () => {
      renderer.render(scene, camera);
      if (ready && !revealed) {
        revealed = true;
        setShown(true);
      }
    };
    const renderOnce = () => {
      update(0);
      renderFrame();
    };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      update(Math.min((now - lastTime) / 1000, 1 / 20));
      lastTime = now;
      renderFrame();
    };
    const start = () => {
      if (running || reduced || disposed) return;
      running = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const dbSize = new THREE.Vector2();
    const fit = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      // Large framing: the implant fills ~80% of the stage height
      camDist = Math.max(3.78 / 2 / half, 2.2 / 2 / (half * camera.aspect));
      camera.updateProjectionMatrix();
      renderer.getDrawingBufferSize(dbSize);
      const scale = dbSize.y / (2 * half);
      for (const m of pointMats) m.uniforms.uScale.value = scale;
      for (const { mat, half: px } of lineMats) {
        mat.uniforms.uWidth.value = (2 * px) / h;
        mat.uniforms.uAspect.value = camera.aspect;
      }
      if (!running) renderOnce();
    };

    // ---------- Implant meshes (built off the main thread) ----------
    const toGeometry = (m: MeshData) => {
      const g = track(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.BufferAttribute(m.positions, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(m.normals, 3));
      g.setAttribute("color", new THREE.BufferAttribute(m.colors, 3));
      if (m.crest) g.setAttribute("aCrest", new THREE.BufferAttribute(m.crest, 1));
      g.setIndex(new THREE.BufferAttribute(m.index, 1));
      g.computeBoundingSphere();
      return g;
    };
    const sparkles = (pos: Float32Array, mat: THREE.ShaderMaterial, sizeMin: number, sizeVar: number) => {
      const n = pos.length / 3;
      const size = new Float32Array(n);
      const phase = new Float32Array(n);
      const speed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        size[i] = sizeMin + rnd() * sizeVar;
        phase[i] = rnd() * TAU;
        speed[i] = 1.2 + rnd() * 2.8;
      }
      const g = track(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
      g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
      g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
      const pts = new THREE.Points(g, mat);
      pts.renderOrder = 4;
      pts.frustumCulled = false;
      return pts;
    };

    const addImplant = (data: ImplantData) => {
      if (disposed) return;
      const crownGeo = toGeometry(data.crown);
      const fixGeo = toGeometry(data.fixture);

      const crownShell = new THREE.Mesh(crownGeo, crownShellMat);
      crownShell.renderOrder = 3;
      main.crown.add(
        new THREE.Mesh(crownGeo, crownMat),
        new THREE.Mesh(crownGeo, crownOutlineMat),
        crownShell,
        sparkles(data.crownSparkles, crownSparkMat, 0.012, 0.018)
      );
      main.fix.add(new THREE.Mesh(fixGeo, fixtureMat), sparkles(data.fixtureSparkles, fixSparkMat, 0.01, 0.014));

      if (refl) {
        refl.crown.add(new THREE.Mesh(crownGeo, reflMat));
        refl.fix.add(new THREE.Mesh(fixGeo, reflMat));
        refl.root.visible = true;
      }
      main.root.visible = true;
      ready = true;
      if (!running) renderOnce();
    };

    const opts: ImplantBuildOptions = isMobile
      ? { crownCell: 0.022, rowsPerPitch: 10, radialSegments: 80, crownSparkles: 130, fixtureSparkles: 70 }
      : { crownCell: 0.015, rowsPerPitch: 16, radialSegments: 120, crownSparkles: 260, fixtureSparkles: 150 };
    let worker: Worker | null = null;
    let fallbackTimer = 0;
    const buildOnMain = () => {
      fallbackTimer = window.setTimeout(() => {
        if (!disposed) addImplant(buildImplantData(opts));
      }, 60);
    };
    try {
      worker = new ImplantWorker();
      worker.onmessage = (e: MessageEvent<ImplantData>) => {
        addImplant(e.data);
        worker?.terminate();
        worker = null;
      };
      worker.onerror = () => {
        worker?.terminate();
        worker = null;
        buildOnMain();
      };
      worker.postMessage(opts);
    } catch {
      buildOnMain();
    }

    // ---------- Observers & interaction ----------
    const ro = new ResizeObserver(() => fit());
    ro.observe(wrap);
    fit();

    let inView = true;
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView && !document.hidden) start();
      else stop();
    });
    io.observe(wrap);
    const onVisibility = () => {
      if (document.hidden) stop();
      else if (inView) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onPointerMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      if (!r.width || !r.height) return;
      pointer.tx = THREE.MathUtils.clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1.3, 1.3) * 0.55;
      pointer.ty = THREE.MathUtils.clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1.3, 1.3) * 0.55;
    };
    if (finePointer && !reduced) window.addEventListener("pointermove", onPointerMove, { passive: true });

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      dragVel = 0;
      canvas.setPointerCapture?.(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      dragRot += dx * 0.01;
      dragVel = dx * 0.55;
      if (reduced) renderOnce();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      canvas.style.cursor = "";
      if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      stop();
      setFailed(true);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      disposed = true;
      stop();
      window.clearTimeout(fallbackTimer);
      worker?.terminate();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      disposables.forEach((d) => d.dispose());
      envRT.dispose();
      renderer.dispose();
    };
  }, [progress]);

  return (
    <div ref={wrapRef} className={className || "relative h-full w-full"} aria-hidden="true">
      <canvas
        ref={canvasRef}
        className={`block h-full w-full cursor-grab touch-pan-y select-none transition-opacity duration-[1400ms] ${
          shown && !failed ? "opacity-100" : "opacity-0"
        }`}
      />
      {failed && <FallbackImplant />}
    </div>
  );
}
