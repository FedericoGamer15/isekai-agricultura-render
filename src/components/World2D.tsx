/**
 * World2D.tsx
 * "El truco de agricultura que te hará millonario si reencarnas en un isekai..." (Sistema Norfolk 2D)
 *
 * Remotion · React · TypeScript · SVG puro
 * 1080 x 1920 px · 60 fps · 3600 frames exactos (60.0 s)
 * Estética Light Novel Watercolor / Manga Storytime.
 */
import React, { createContext, useContext, useMemo } from "react";
import {
  Audio,
  Easing,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ===================================================================== */
/*  CONSTANTES & TIEMPOS                                                  */
/* ===================================================================== */
export const TOTAL_FRAMES = 3600;
export const SCENE_DURATIONS = [420, 660, 1080, 840, 600];
export const SCENE_START = [0, 420, 1080, 2160, 3000, 3600];

const FPS = 60;
const W = 1080;
const H = 1920;
const TAU = Math.PI * 2;

export const C = {
  // Mundo moderno
  asphalt: "#2B2D42",
  uniform: "#8D99AE",
  skin: "#EDF2F4",
  headlight: "#EF233C",
  beam: "#FFD166",
  // Mundo isekai
  parch: "#DDA15E",
  mud: "#BC6C25",
  forest: "#606C38",
  ink: "#283618",
  paper: "#FEFAE0",
  // Milagro Norfolk
  clover: "#52B788",
  aura: "#74C69D",
  gold: "#FFB703",
  turnip: "#9B5DE5",
  barley: "#FB8500",
  // Auxiliares de acuarela
  pants: "#3D405B",
  hair: "#2B2D42",
  blush: "#F4A6A0",
  wood: "#8A5A2B",
  woodDark: "#5E3B1B",
  snow: "#EAF4FF",
  ice: "#A9D6E5",
  wool: "#FFFDF5",
} as const;

const HAND = "'Caveat', 'Patrick Hand', 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive";
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const FULL = `M -20 -20 L ${W + 20} -20 L ${W + 20} ${H + 20} L -20 ${H + 20} Z`;
const SKY_D = "M -70 -70 C 300 -90, 800 -50, 1150 -80 L 1160 1990 C 800 1960, 300 2000, -80 1970 Z";

/* ===================================================================== */
/*  HELPERS DE ANIMACIÓN & CLOCK                                          */
/* ===================================================================== */
type SprCfg = { damping?: number; stiffness?: number; mass?: number; overshootClamping?: boolean };

const sp = (lf: number, delay = 0, cfg: SprCfg = {}) =>
  spring({ frame: Math.max(0, lf - delay), fps: FPS, config: { damping: 12, stiffness: 100, ...cfg } });

const rng = (v: number, a: number[], b: number[], easing?: (t: number) => number) =>
  interpolate(v, a, b, { ...CL, easing });

const EO = Easing.out(Easing.cubic);
const EI = Easing.in(Easing.cubic);
const EIO = Easing.inOut(Easing.cubic);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const squash = (lf: number, land: number, fallStart = land - 18) => {
  if (lf < land) {
    const s = rng(lf, [fallStart, land], [0, 1]);
    return { sx: 1 - 0.1 * s, sy: 1 + 0.15 * s };
  }
  const k = sp(lf, land);
  return { sx: interpolate(k, [0, 1], [1.18, 1]), sy: interpolate(k, [0, 1], [0.85, 1]) };
};

const Clock = createContext<{ gf: number; step: number }>({ gf: 0, step: 0 });
const useClock = () => useContext(Clock);
const wx = (step: number, seed: number, amp: number) => Math.sin(step * 17.3 + seed * 5.7) * amp;
const wy = (step: number, seed: number, amp: number) => Math.cos(step * 23.7 + seed * 3.1) * amp;

const f1 = (n: number) => n.toFixed(1);

const smooth = (p: number[][], closed = true) => {
  const n = p.length;
  const at = (k: number) => (closed ? p[((k % n) + n) % n] : p[Math.min(Math.max(k, 0), n - 1)]);
  let d = `M ${f1(p[0][0])} ${f1(p[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    d += ` C ${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)}, ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)}, ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return closed ? d + " Z" : d;
};

const blob = (cx: number, cy: number, rx: number, ry: number, seed: string | number, n = 9, amp = 0.09) =>
  smooth(
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * TAU;
      const k = 1 + (random(`b${seed}-${i}`) - 0.5) * 2 * amp;
      return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
    }),
  );

const cloud = (cx: number, cy: number, rx: number, ry: number, seed: string | number, n = 11) => {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const k = 1 + (random(`c${seed}-${i}`) - 0.5) * 0.18;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  let d = `M ${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
    d += ` A ${f1(chord * 0.62)} ${f1(chord * 0.62)} 0 0 1 ${f1(b[0])} ${f1(b[1])}`;
  }
  return d + " Z";
};

const limb = (len: number, w0: number, w1: number) =>
  `M ${-w0 / 2} 0 C ${-w0 / 2 - 2} ${len * 0.35}, ${-w1 / 2 - 1} ${len * 0.7}, ${-w1 / 2} ${len} L ${w1 / 2} ${len} C ${w1 / 2 + 1} ${len * 0.7}, ${w0 / 2 + 2} ${len * 0.35}, ${w0 / 2} 0 Z`;

/* ===================================================================== */
/*  PRIMITIVAS VECTORIALES (LINE-BOIL & WATERCOLOR)                       */
/* ===================================================================== */
const Shape: React.FC<{
  d: string;
  fill?: string;
  w?: number;
  seed?: number;
  stroke?: string;
  opacity?: number;
  nostroke?: boolean;
}> = ({ d, fill = "none", w = 4, seed = 0, stroke = C.ink, opacity = 1, nostroke = false }) => {
  const { step } = useClock();
  const ox = wx(step, seed, 1.2);
  const oy = wy(step, seed, 1.2);
  return (
    <g opacity={opacity}>
      <path d={d} fill={fill} stroke={nostroke ? "none" : stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      {!nostroke && (
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={w * 0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.55}
          transform={`translate(${ox} ${oy})`}
        />
      )}
    </g>
  );
};

const Tube: React.FC<{ d: string; w: number; fill: string; line?: string; opacity?: number }> = ({
  d,
  w,
  fill,
  line = C.ink,
  opacity = 1,
}) => (
  <g opacity={opacity} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke={line} strokeWidth={w + 8} />
    <path d={d} stroke={fill} strokeWidth={w} />
  </g>
);

const Wash: React.FC<{ d: string; fill: string; opacity?: number }> = ({ d, fill, opacity = 1 }) => (
  <path d={d} fill={fill} opacity={opacity} filter="url(#wc)" />
);

const Sparkle: React.FC<{ x: number; y: number; r: number; fill?: string; rot?: number; opacity?: number }> = ({
  x,
  y,
  r,
  fill = C.gold,
  rot = 0,
  opacity = 1,
}) => (
  <path
    d={`M 0 ${-r} Q 0 0 ${r} 0 Q 0 0 0 ${r} Q 0 0 ${-r} 0 Q 0 0 0 ${-r} Z`}
    transform={`translate(${x} ${y}) rotate(${rot})`}
    fill={fill}
    opacity={opacity}
    stroke={C.ink}
    strokeWidth={1.5}
    strokeLinejoin="round"
  />
);

const Coin: React.FC<{ x: number; y: number; r?: number; s?: number; rot?: number; seed?: number; sx?: number }> = ({
  x,
  y,
  r = 22,
  s = 1,
  rot = 0,
  seed = 0,
  sx = 1,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * sx} ${s})`}>
    <Shape d={blob(0, 0, r, r * 1.03, `coin${seed}`, 10, 0.025)} fill={C.gold} w={3.5} seed={seed} />
    <path d={blob(0, 0, r * 0.7, r * 0.72, `coin-in${seed}`, 10, 0.025)} fill="none" stroke={C.barley} strokeWidth={2.5} />
    <path
      d={`M 0 ${r * 0.4} Q ${r * 0.08} 0 0 ${-r * 0.4} M 0 ${-r * 0.1} Q ${-r * 0.3} ${-r * 0.2} ${-r * 0.32} ${-r * 0.36} M 0 ${-r * 0.1} Q ${r * 0.3} ${-r * 0.2} ${r * 0.32} ${-r * 0.36}`}
      stroke={C.barley}
      strokeWidth={2.5}
      fill="none"
      strokeLinecap="round"
    />
    <path
      d={`M ${-r * 0.6} ${-r * 0.25} Q ${-r * 0.45} ${-r * 0.66} ${r * 0.05} ${-r * 0.78}`}
      stroke="#FFF3B0"
      strokeWidth={3.5}
      fill="none"
      strokeLinecap="round"
    />
  </g>
);

type DriftKind = "sparkle" | "snow" | "shaving" | "dust";
const Drift: React.FC<{
  lf: number;
  n: number;
  seed: string;
  kind: DriftKind;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  speed?: number;
  dir?: 1 | -1;
  size?: number;
  color?: string;
  opacity?: number;
}> = ({ lf, n, seed, kind, x0 = 0, x1 = W, y0 = 0, y1 = H, speed = 1, dir = -1, size = 10, color = C.gold, opacity = 1 }) => (
  <g opacity={opacity}>
    {Array.from({ length: n }, (_, i) => {
      const rx = random(`${seed}x${i}`);
      const ry = random(`${seed}y${i}`);
      const rs = random(`${seed}s${i}`);
      const rp = random(`${seed}p${i}`);
      const span = y1 - y0;
      const prog = (((ry + (dir * lf * speed * (0.5 + rs)) / span) % 1) + 1) % 1;
      const px = x0 + rx * (x1 - x0) + Math.sin(lf * 0.025 + rp * TAU) * 26;
      const py = y0 + prog * span;
      const a = Math.min(1, Math.min(prog, 1 - prog) * 8);
      const s = size * (0.55 + rs * 0.9);
      const rot = (lf * (1 + rp * 2) + rp * 360) % 360;
      if (kind === "sparkle") return <Sparkle key={i} x={px} y={py} r={s} fill={color} rot={rot * 0.3} opacity={a} />;
      if (kind === "snow")
        return (
          <path
            key={i}
            d={blob(0, 0, s * 0.5, s * 0.5, i, 6, 0.15)}
            transform={`translate(${px} ${py})`}
            fill="#FFFFFF"
            stroke="#BFD7EA"
            strokeWidth={1}
            opacity={a * 0.9}
          />
        );
      if (kind === "shaving")
        return (
          <path
            key={i}
            d="M 0 0 C 9 -12, 24 -8, 22 4 C 18 14, 4 10, 9 3"
            transform={`translate(${px} ${py}) rotate(${rot})`}
            fill="#F4B6B0"
            stroke={C.ink}
            strokeWidth={1.8}
            opacity={a}
          />
        );
      return (
        <path key={i} d={blob(0, 0, s * 0.4, s * 0.3, i, 6, 0.2)} transform={`translate(${px} ${py})`} fill={color} opacity={a * 0.55} />
      );
    })}
  </g>
);

/* ===================================================================== */
/*  OJOS CON OCLUSIÓN SÓLIDA (<clipPath> + fill={skin})                  */
/* ===================================================================== */
const Eye: React.FC<{
  uid: string;
  x: number;
  y: number;
  rx?: number;
  ry?: number;
  blink: number;
  lid?: number;
  skin: string;
  iris?: string;
  look?: [number, number];
  outerLeft?: boolean;
  bag?: number;
  w?: number;
}> = ({ uid, x, y, rx = 21, ry = 25, blink, lid = 0, skin, iris = C.forest, look = [0, 0], outerLeft = false, bag = 0, w = 3 }) => {
  const k = Math.max(blink, lid);
  const c1 = rx * 1.05;
  const cl = ry * (4 / 3) * (1 - 0.35 * k);
  const cu = lerp(-ry * (4 / 3), cl, k);
  const open = `M ${-rx} 0 C ${-c1} ${(-ry * 4) / 3}, ${c1} ${(-ry * 4) / 3}, ${rx} 0 C ${c1} ${(ry * 4) / 3}, ${-c1} ${(ry * 4) / 3}, ${-rx} 0 Z`;
  const upper = `M ${-rx} 0 C ${-c1} ${cu}, ${c1} ${cu}, ${rx} 0`;
  const lower = `M ${rx} 0 C ${c1} ${cl}, ${-c1} ${cl}, ${-rx} 0`;
  const lidTop = `M ${-rx - 10} ${-ry - 14} L ${rx + 10} ${-ry - 14} L ${rx + 10} 0 L ${rx} 0 C ${c1} ${cu}, ${-c1} ${cu}, ${-rx} 0 L ${-rx - 10} 0 Z`;
  const lidBot = `M ${-rx - 10} 0 L ${-rx} 0 C ${-c1} ${cl}, ${c1} ${cl}, ${rx} 0 L ${rx + 10} 0 L ${rx + 10} ${ry + 14} L ${-rx - 10} ${ry + 14} Z`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <clipPath id={uid}>
          <path d={open} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid})`}>
        <path d={open} fill="#FFFEF8" />
        <g transform={`translate(${look[0]} ${look[1]})`}>
          <ellipse cx={0} cy={2} rx={rx * 0.64} ry={ry * 0.8} fill={iris} />
          <ellipse cx={0} cy={3} rx={rx * 0.34} ry={ry * 0.46} fill={C.asphalt} />
          <circle cx={-rx * 0.2} cy={-ry * 0.28} r={rx * 0.17} fill="#fff" />
          <circle cx={rx * 0.2} cy={ry * 0.22} r={rx * 0.09} fill="#fff" opacity={0.9} />
        </g>
        <path d={lidTop} fill={skin} />
        <path d={lidBot} fill={skin} />
      </g>
      <path d={upper} fill="none" stroke={C.ink} strokeWidth={w * 1.8} strokeLinecap="round" />
      <path d={lower} fill="none" stroke={C.ink} strokeWidth={w * 0.8} strokeLinecap="round" opacity={0.8} />
      <path
        d={`M ${rx} 0 q 7 -2 11 -9`}
        transform={outerLeft ? "scale(-1 1)" : undefined}
        stroke={C.ink}
        strokeWidth={w * 1.4}
        fill="none"
        strokeLinecap="round"
      />
      {bag > 0 && (
        <g opacity={bag}>
          <path
            d={`M ${-rx} ${ry} Q 0 ${ry * 1.85} ${rx} ${ry} Q 0 ${ry * 1.4} ${-rx} ${ry} Z`}
            fill="#9D8AB5"
            opacity={0.45}
          />
          <path d={`M ${-rx * 0.9} ${ry * 1.08} Q 0 ${ry * 1.7} ${rx * 0.9} ${ry * 1.08}`} stroke="#7D6B91" strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
};

const HandShape: React.FC<{ skin: string; seed: number; s?: number }> = ({ skin, seed, s = 1 }) => (
  <g transform={`scale(${s})`}>
    <Shape d={blob(0, 8, 15, 18, `hand${seed}`, 8, 0.05)} fill={skin} w={3.5} seed={seed} />
    <path d="M -7 14 q 0 6 -2 10 M 1 18 q 0 6 0 10 M 8 14 q 1 6 3 10" stroke={C.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />
  </g>
);

/* ===================================================================== */
/*  PUPPET RIG COMPLETO: HERO                                             */
/* ===================================================================== */
type Pose = {
  hipL?: number;
  kneeL?: number;
  hipR?: number;
  kneeR?: number;
  shL?: number;
  elL?: number;
  shR?: number;
  elR?: number;
  thigh?: number;
  lean?: number;
  tilt?: number;
};

type HeroProps = {
  uid: string;
  x: number;
  y: number;
  scale?: number;
  rot?: number;
  sx?: number;
  sy?: number;
  flip?: boolean;
  blink: number;
  lid?: number;
  look?: [number, number];
  brow?: number;
  surprise?: number;
  smile?: number;
  open?: number;
  tired?: number;
  sweat?: number;
  mud?: number;
  blush?: number;
  top?: "blazer" | "hoodie";
  cape?: boolean;
  scarf?: boolean;
  pack?: number;
  pose?: Pose;
  heldL?: React.ReactNode;
  heldR?: React.ReactNode;
};

const Hero: React.FC<HeroProps> = ({
  uid,
  x,
  y,
  scale = 1,
  rot = 0,
  sx = 1,
  sy = 1,
  flip = false,
  blink,
  lid = 0,
  look = [0, 0],
  brow = 0,
  surprise = 0,
  smile = 0,
  open = 0,
  tired = 0,
  sweat = 0,
  mud = 0,
  blush = 0,
  top = "blazer",
  cape = false,
  scarf = false,
  pack = -1,
  pose = {},
  heldL,
  heldR,
}) => {
  const { gf } = useClock();
  const {
    hipL = 4,
    kneeL = 0,
    hipR = 4,
    kneeR = 0,
    shL = 8,
    elL = 8,
    shR = 8,
    elR = 8,
    thigh = 170,
    lean = 0,
    tilt = 0,
  } = pose;
  const skin = C.skin;
  const breathe = Math.sin((gf / 120) * TAU);
  const hipY = -(thigh + 190);
  const wag = Math.sin((gf / 90) * TAU) * 6;
  const es = 1 + 0.14 * surprise;
  const mw = 17 - open * 4;
  const mouthD = `M ${-mw} 62 Q 0 ${62 + smile * 14} ${mw} 62 Q 0 ${62 + smile * 14 + open * 34} ${-mw} 62 Z`;
  const bI = -34 - 12 * brow - 11 * surprise;
  const bO = -34 + 4 * brow - 11 * surprise;
  const sc = flip ? -1 : 1;

  const leg = (s: 1 | -1, hip: number, knee: number) => (
    <g transform={`translate(${-s * 36} ${hipY}) rotate(${s * hip})`}>
      <Shape d={limb(thigh, 42, 32)} fill={C.pants} w={4} seed={s + 2} />
      <g transform={`translate(0 ${thigh}) rotate(${s * knee})`}>
        <Shape d={limb(160, 31, 22)} fill={C.pants} w={4} seed={s + 4} />
        <g transform="translate(0 160)">
          <Shape
            d="M -14 -6 L 14 -6 C 18 8, 34 12, 38 28 C 38 36, -38 36, -38 28 C -34 12, -18 8, -14 -6 Z"
            fill={C.skin}
            w={4}
            seed={s + 6}
          />
          <path d="M -37 29 C -26 38, 26 38, 37 29" stroke={C.headlight} strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d="M -8 4 L 8 4 M -9 12 L 9 12" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
        </g>
      </g>
    </g>
  );

  const arm = (s: 1 | -1, sh: number, el: number, held?: React.ReactNode) => (
    <g transform={`translate(${-s * 66} -206) rotate(${s * sh})`}>
      <Shape d={limb(122, 38, 31)} fill={C.uniform} w={4} seed={20 + s} />
      <g transform={`translate(0 122) rotate(${-s * el})`}>
        <Shape d={limb(112, 29, 23)} fill={C.uniform} w={4} seed={22 + s} />
        <path d="M -14 98 L 14 98" stroke="#fff" strokeWidth={6} strokeLinecap="round" />
        <g transform={`translate(0 118) rotate(${-s * (sh - el)})`}>
          {held}
          <HandShape skin={skin} seed={s + 5} />
        </g>
      </g>
    </g>
  );

  return (
    <g>
      {Math.abs(rot) < 5 && (
        <g transform={`translate(${x} ${y})`}>
          <path d={blob(0, 8, 130 * scale, 18 * scale, `hs${uid}`, 8, 0.1)} fill="#000" opacity={0.15} />
        </g>
      )}
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${sx * scale * sc} ${sy * scale})`}>
        {cape && (
          <g transform={`translate(0 ${hipY})`}>
            <Shape
              d="M -72 -226 C -134 -120, -176 70, -196 336 Q 0 392 196 336 C 176 70, 134 -120, 72 -226 Z"
              fill={C.turnip}
              w={4.5}
              seed={30}
            />
            <path d="M -40 -200 C -70 -60, -96 120, -110 330 M 40 -200 C 70 -60, 96 120, 110 330" stroke="#7A3FC0" strokeWidth={5} fill="none" opacity={0.6} />
            <path d="M -196 336 Q 0 392 196 336" stroke={C.gold} strokeWidth={9} fill="none" strokeLinecap="round" />
          </g>
        )}

        {leg(1, hipL, kneeL)}
        {leg(-1, hipR, kneeR)}

        <g transform={`translate(0 ${hipY}) rotate(${lean})`}>
          {pack >= 0 && (
            <g transform={`scale(${1 + 0.18 * Math.sin(pack * Math.PI)})`}>
              <g opacity={1 - pack}>
                <Shape
                  d="M -84 -214 C -118 -196, -122 -60, -92 -6 L 92 -6 C 122 -60, 118 -196, 84 -214 C 40 -236, -40 -236, -84 -214 Z"
                  fill="#4A4E69"
                  w={4.5}
                  seed={14}
                />
                <path d="M -50 -120 L 50 -120 L 46 -40 L -46 -40 Z" fill="#5A5F80" stroke={C.ink} strokeWidth={3} />
                <path d="M -40 -222 Q 0 -240 40 -222" stroke={C.headlight} strokeWidth={5} fill="none" strokeLinecap="round" />
              </g>
              <g opacity={pack}>
                <Shape
                  d="M -86 -212 C -122 -180, -126 -70, -96 -2 L 96 -2 C 126 -70, 122 -180, 86 -212 L 60 -236 L 30 -222 L 0 -240 L -30 -222 L -60 -236 Z"
                  fill={C.parch}
                  w={4.5}
                  seed={15}
                />
                <path d="M -72 -196 Q 0 -180 72 -196" stroke={C.woodDark} strokeWidth={7} fill="none" strokeLinecap="round" />
                <path d="M 40 -70 L 74 -34 L 62 -2 L 30 -12 Z" fill="#7A4412" stroke={C.ink} strokeWidth={3} />
                <path d="M -60 -120 l 16 10 M -20 -140 l 16 12 M 20 -110 l 18 8" stroke={C.woodDark} strokeWidth={3} fill="none" strokeLinecap="round" />
              </g>
            </g>
          )}

          <g transform={`scale(1 ${1 + 0.012 * breathe})`}>
            <Shape d="M -52 22 C -58 -60, -66 -150, -68 -224 C -40 -242, 40 -242, 68 -224 C 66 -150, 58 -60, 52 22 Z" fill={C.uniform} w={4.5} seed={11} />
            <path d="M 22 -230 C 40 -160, 46 -60, 42 22 L 52 22 C 58 -60, 66 -150, 68 -224 Z" fill="#000" opacity={0.1} />
            {top === "blazer" ? (
              <g>
                <path d="M -24 -238 L 0 -148 L 24 -238 Z" fill="#fff" stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
                <path d="M -7 -206 L 7 -206 L 11 -124 L 0 -106 L -11 -124 Z" fill={C.headlight} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
                <path d="M -24 -238 L -38 -150 L -8 -118 M 24 -238 L 38 -150 L 8 -118" stroke={C.ink} strokeWidth={3.5} fill="none" strokeLinecap="round" />
              </g>
            ) : (
              <g>
                <Shape d="M -66 -226 C -86 -266, -40 -284, 0 -266 C 40 -284, 86 -266, 66 -226 C 40 -242, -40 -242, -66 -226 Z" fill="#7A869F" w={4} seed={12} />
                <path d="M -14 -236 L -16 -170 M 14 -236 L 18 -164" stroke={C.paper} strokeWidth={4} strokeLinecap="round" />
                <Shape d="M -46 -84 C -20 -62, 20 -62, 46 -84 L 54 -22 L -54 -22 Z" fill="#7A869F" w={3.5} seed={13} />
              </g>
            )}
            {mud > 0 && (
              <g opacity={mud}>
                <path d={blob(-24, -120, 36, 26, "tm1", 8, 0.2)} fill="#7A4412" />
                <path d={blob(30, -60, 26, 20, "tm2", 8, 0.2)} fill="#7A4412" />
              </g>
            )}
            <Shape d="M -54 -8 Q 0 2 54 -8 L 53 16 Q 0 26 -53 16 Z" fill={C.woodDark} w={4} seed={16} />
            <Shape d="M -11 -1 Q 0 -4 11 -1 L 12 17 Q 0 20 -12 17 Z" fill={C.gold} w={3} seed={17} />
          </g>

          {scarf && (
            <g>
              <Tube d="M -56 -234 C -22 -210, 22 -210, 56 -234" w={26} fill={C.headlight} />
              <Tube d="M 34 -222 C 56 -176, 44 -136, 62 -96" w={20} fill={C.headlight} />
            </g>
          )}
          {cape && (
            <g>
              <Shape d={cloud(0, -236, 86, 28, "fur", 14)} fill={C.wool} w={4} seed={31} />
              <Shape d={blob(0, -226, 11, 11, "clasp", 7, 0.08)} fill={C.gold} w={3} seed={32} />
            </g>
          )}

          {arm(1, shL, elL, heldL)}
          {arm(-1, shR, elR, heldR)}

          <g transform={`translate(0 -345) rotate(${tilt})`}>
            <Shape
              d="M -92 -20 C -100 -110, -50 -135, 0 -134 C 50 -135, 100 -110, 92 -20 C 96 20, 84 40, 78 20 L -78 20 C -84 40, -96 20, -92 -20 Z"
              fill={C.hair}
              w={4}
              seed={40}
            />
            <Shape d="M -78 -4 C -94 -8, -96 26, -78 28 Z" fill={skin} w={3.5} seed={41} />
            <Shape d="M 78 -4 C 94 -8, 96 26, 78 28 Z" fill={skin} w={3.5} seed={42} />
            <Shape
              d="M -78 -10 C -82 -70, -50 -100, 0 -102 C 50 -100, 82 -70, 78 -10 C 76 40, 40 84, 0 90 C -40 84, -76 40, -78 -10 Z"
              fill={skin}
              w={4.5}
              seed={43}
            />
            {blush > 0 && (
              <g opacity={blush * 0.7}>
                <path d={blob(-48, 38, 20, 11, "bl1", 8, 0.1)} fill={C.blush} />
                <path d={blob(48, 38, 20, 11, "bl2", 8, 0.1)} fill={C.blush} />
              </g>
            )}
            <Eye uid={`${uid}-eL`} x={-34} y={8} rx={21 * es} ry={25 * es} blink={blink} lid={lid} skin={skin} look={look} outerLeft bag={tired} />
            <Eye uid={`${uid}-eR`} x={34} y={8} rx={21 * es} ry={25 * es} blink={blink} lid={lid} skin={skin} look={look} bag={tired} />
            <path d={`M -60 ${bO} Q -36 ${bI - 8} -12 ${bI}`} stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
            <path d={`M 60 ${bO} Q 36 ${bI - 8} 12 ${bI}`} stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
            <path d="M -2 40 Q 5 46 9 42" stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
            <path d={mouthD} fill={open > 0.05 ? "#7A2E2E" : "none"} stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
            {mud > 0 && (
              <g opacity={mud}>
                <path d={blob(-40, 36, 24, 16, "fm1", 8, 0.2)} fill="#7A4412" />
                <path d={blob(30, -56, 18, 12, "fm2", 8, 0.2)} fill="#7A4412" />
              </g>
            )}
            {sweat > 0 && (
              <path
                d="M 0 -14 C 8 2, 10 10, 0 16 C -10 10, -8 2, 0 -14 Z"
                transform={`translate(74 ${-40 + sweat * 46})`}
                fill="#BFE3F5"
                stroke={C.ink}
                strokeWidth={2.5}
                opacity={Math.min(1, sweat * 3)}
              />
            )}
            <Shape
              d="M -86 -26 C -92 -100, -40 -122, 0 -118 C 44 -122, 94 -100, 86 -26 C 80 -52, 64 -62, 48 -66 L 38 -42 L 22 -70 L 6 -50 L -10 -72 L -26 -48 L -42 -70 C -60 -62, -76 -50, -86 -26 Z"
              fill={C.hair}
              w={4}
              seed={44}
            />
            <path
              d={`M -4 -118 C ${-10 + wag} -150, ${20 + wag * 1.5} -158, ${14 + wag * 2} -176`}
              stroke={C.ink}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
          </g>
        </g>
      </g>
    </g>
  );
};

/* ===================================================================== */
/*  ESCENARIOS & ELEMENTOS VISUALES                                       */
/* ===================================================================== */
const Skyline: React.FC<{ seed: string; base: number; hMin: number; hMax: number; fill: string; lit?: boolean }> = ({
  seed,
  base,
  hMin,
  hMax,
  fill,
  lit = false,
}) => {
  const blds = useMemo(() => {
    const out: { x: number; w: number; h: number; tilt: number }[] = [];
    let x = -60;
    let i = 0;
    while (x < W + 60) {
      const w = 140 * (0.7 + random(`${seed}w${i}`) * 0.7);
      const h = hMin + random(`${seed}h${i}`) * (hMax - hMin);
      out.push({ x, w, h, tilt: (random(`${seed}t${i}`) - 0.5) * 16 });
      x += w + 8;
      i++;
    }
    return out;
  }, [seed, base, hMin, hMax]);

  return (
    <g>
      {blds.map((b, i) => (
        <Shape
          key={i}
          d={`M ${b.x} ${base} L ${b.x} ${base - b.h + b.tilt} L ${b.x + b.w} ${base - b.h - b.tilt} L ${b.x + b.w} ${base} Z`}
          fill={fill}
          w={3.5}
          seed={i}
        />
      ))}
    </g>
  );
};

const Castle: React.FC<{ x: number; y: number; s?: number; wall: string; roof: string; snow?: boolean }> = ({
  x,
  y,
  s = 1,
  wall,
  roof,
  snow = false,
}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Shape d="M -120 0 L -120 -140 L 120 -140 L 120 0 Z" fill={wall} w={4} />
    <Shape d="M -160 0 L -160 -240 L -90 -240 L -90 0 Z" fill={wall} w={4} />
    <Shape d="M -170 -240 L -125 -330 L -80 -240 Z" fill={roof} w={4} />
    <Shape d="M 90 0 L 90 -210 L 160 -210 L 160 0 Z" fill={wall} w={4} />
    <Shape d="M 80 -210 L 125 -300 L 170 -210 Z" fill={roof} w={4} />
    <Shape d="M -40 -140 L -40 -280 L 40 -280 L 40 -140 Z" fill={wall} w={4} />
    <Shape d="M -50 -280 L 0 -380 L 50 -280 Z" fill={roof} w={4} />
    <path d="M -20 0 L -20 -50 Q 0 -80 20 -50 L 20 0 Z" fill="#2A1A10" stroke={C.ink} strokeWidth={3} />
  </g>
);

const HILL_FAR =
  "M -800 1250 C -500 1110, -200 1190, 100 1130 C 400 1070, 600 1190, 900 1140 C 1200 1090, 1500 1200, 1900 1160 L 1900 1700 L -800 1700 Z";
const HILL_NEAR =
  "M -800 1420 C -400 1330, 0 1400, 300 1370 C 600 1340, 800 1430, 1100 1390 C 1400 1350, 1600 1420, 1900 1400 L 1900 1800 L -800 1800 Z";
const GROUND_D =
  "M -800 1580 C -300 1550, 200 1600, 700 1570 C 1100 1545, 1500 1590, 1900 1570 L 1900 2000 L -800 2000 Z";

const Backdrop: React.FC<{ tone: "dawn" | "winter" | "sunset"; shift?: number; lf: number }> = ({ tone, shift = 0, lf }) => {
  const winter = tone === "winter";
  const sunset = tone === "sunset";
  const skyFill = tone === "dawn" ? "url(#gDawn)" : winter ? "url(#gWinter)" : "url(#gSunset)";
  const far = winter ? "#BFD3E3" : sunset ? "#C58A4B" : "#93A872";
  const near = winter ? "#E4EFF8" : sunset ? "#8A6232" : C.forest;
  const gnd = winter ? "url(#gSnowG)" : "url(#gMud)";
  return (
    <g>
      <g transform={`translate(${shift * 0.08} 0)`}>
        <Wash d={SKY_D} fill={skyFill} />
        <path
          d={blob(sunset ? 540 : 800, sunset ? 640 : 380, sunset ? 190 : 120, sunset ? 190 : 120, `sun${tone}`, 10, 0.03)}
          fill={winter ? "#F8FBFF" : sunset ? C.barley : "#FFE8A3"}
          opacity={0.9}
          filter="url(#wc)"
        />
      </g>
      <g transform={`translate(${shift * 0.3} 0)`} opacity={0.92}>
        <Castle x={330} y={1260} s={0.8} wall={winter ? "#B7CFE0" : "#9AA5B1"} roof={winter ? C.snow : "#7C8BA0"} snow={winter} />
        <Castle x={880} y={1300} s={0.5} wall={winter ? "#C4D8E8" : "#A5AFBA"} roof={winter ? C.snow : "#8794A8"} snow={winter} />
      </g>
      <g transform={`translate(${shift * 0.6} 0)`}>
        <Wash d={HILL_FAR} fill={far} />
        <Wash d={HILL_NEAR} fill={near} />
      </g>
      <g transform={`translate(${shift} 0)`}>
        <Wash d={GROUND_D} fill={gnd} />
      </g>
    </g>
  );
};

/* ===================================================================== */
/*  LOS 4 CULTIVOS NORFOLK                                               */
/* ===================================================================== */
const WheatCrop: React.FC<{ s?: number; pop?: number }> = ({ s = 1, pop = 1 }) => (
  <g transform={`scale(${s * pop})`}>
    <Tube d="M 0 0 C -12 -60, -8 -130, -22 -200" w={7} fill={C.gold} />
    <Tube d="M 0 0 C 10 -70, 16 -140, 24 -190" w={7} fill={C.gold} />
    {[-180, -150, -120, -90, -60].map((yy, i) => (
      <g key={i}>
        <Shape d={blob(-28, yy, 12, 8, `wgL${i}`, 6, 0.1)} fill={C.gold} w={2.5} />
        <Shape d={blob(28, yy + 10, 12, 8, `wgR${i}`, 6, 0.1)} fill={C.gold} w={2.5} />
      </g>
    ))}
    <Coin x={-35} y={-230} r={18} s={pop} seed={1} />
    <Coin x={35} y={-210} r={16} s={pop} seed={2} />
  </g>
);

const TurnipCrop: React.FC<{ s?: number; pop?: number }> = ({ s = 1, pop = 1 }) => (
  <g transform={`scale(${s * pop})`}>
    <Shape d={blob(0, -60, 68, 62, "turnipB", 8, 0.08)} fill={C.turnip} w={4.5} />
    <path d={blob(0, -32, 54, 30, "turnipW", 7, 0.1)} fill="#FFFFFF" opacity={0.88} />
    <Tube d="M -16 -115 C -36 -170, -60 -210, -90 -230" w={11} fill={C.clover} />
    <Tube d="M 0 -120 C 0 -180, 4 -220, 6 -260" w={12} fill={C.clover} />
    <Tube d="M 16 -115 C 36 -170, 60 -210, 90 -230" w={11} fill={C.clover} />
    <Tube d="M 0 0 Q -8 34 -4 60 M 0 0 Q 10 30 16 56" w={5} fill="#DDA15E" />
  </g>
);

const BarleyCrop: React.FC<{ s?: number; pop?: number }> = ({ s = 1, pop = 1 }) => (
  <g transform={`scale(${s * pop})`}>
    <Tube d="M 0 0 C -6 -60, -14 -120, -18 -180" w={6} fill={C.barley} />
    <Tube d="M 0 0 C 8 -70, 12 -130, 20 -190" w={6} fill={C.barley} />
    {[-160, -130, -100, -70].map((yy, i) => (
      <g key={i}>
        <path d={`M -18 ${yy} L ${-38 - i * 4} ${yy - 24}`} stroke={C.barley} strokeWidth={3} strokeLinecap="round" />
        <path d={`M 20 ${yy + 12} L ${40 + i * 4} ${yy - 12}`} stroke={C.barley} strokeWidth={3} strokeLinecap="round" />
      </g>
    ))}
    {/* Jarra de cerveza espumosa */}
    <g transform="translate(42 -140) scale(0.65)">
      <Shape d="M -24 -36 L 24 -36 L 18 36 L -18 36 Z" fill={C.barley} w={3.5} />
      <Shape d={cloud(0, -42, 28, 14, "foam", 8)} fill="#FFFFFF" w={3} />
      <path d="M 22 -18 Q 42 -18 40 12 Q 38 24 18 24" stroke={C.ink} strokeWidth={3.5} fill="none" strokeLinecap="round" />
    </g>
  </g>
);

const CloverCrop: React.FC<{ s?: number; pop?: number; pulse?: number }> = ({ s = 1, pop = 1, pulse = 1 }) => (
  <g transform={`scale(${s * pop})`}>
    {/* Hojas aéreas del trébol */}
    {[0, 90, 180, 270].map((ang, i) => (
      <g key={i} transform={`translate(0 -90) rotate(${ang})`}>
        <path d="M 0 0 C -22 -32, -34 -10, 0 8 C 34 -10, 22 -32, 0 0 Z" fill={C.clover} stroke={C.ink} strokeWidth={2.5} />
      </g>
    ))}
    <Tube d="M 0 0 L 0 -90" w={6} fill={C.forest} />

    {/* Raíces subterráneas con nódulos bio-luminosos */}
    <Tube d="M 0 0 C -18 40, -40 80, -60 130" w={5} fill="#C58A4B" />
    <Tube d="M 0 0 C 14 44, 30 90, 52 140" w={5} fill="#C58A4B" />
    <Tube d="M 0 0 L 0 110" w={4} fill="#C58A4B" />

    {/* Nódulos que inyectan luz esmeralda */}
    {[
      [-36, 68],
      [-54, 116],
      [24, 60],
      [44, 110],
      [-6, 85],
    ].map(([nx, ny], i) => (
      <g key={i} transform={`translate(${nx} ${ny}) scale(${pulse})`}>
        <circle cx={0} cy={0} r={16} fill="url(#gGlowG)" opacity={0.85} />
        <circle cx={0} cy={0} r={6} fill={C.aura} stroke={C.ink} strokeWidth={1.5} />
      </g>
    ))}
  </g>
);

/* ===================================================================== */
/*  PERSONAJES SECUNDARIOS (FARMER, NOBLE, DRAGON)                        */
/* ===================================================================== */
const Farmer: React.FC<{ x: number; y: number; s?: number; blink: number }> = ({ x, y, s = 1, blink }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d={blob(0, 8, 110, 14, "fsh", 8, 0.1)} fill="#000" opacity={0.14} />
    <Tube d="M -20 -200 L -24 -10 M 20 -200 L 24 -10" w={16} fill="#E3C9A8" />
    <Shape d="M -46 -220 C -52 -340, 52 -340, 46 -220 Z" fill="#9A7B4F" w={4} />
    <Tube d="M -8 -480 L -8 10" w={8} fill={C.wood} />
    {[-30, -8, 14].map((px, i) => (
      <Tube key={i} d={`M ${px} -550 L ${px} -480`} w={6} fill="#8D99AE" />
    ))}
    <g transform="translate(0 -400)">
      <Shape d={blob(0, 0, 42, 48, "fh", 8, 0.05)} fill="#E3C9A8" w={3.5} />
      <Shape d={blob(0, -44, 76, 18, "fhat", 8, 0.06)} fill="#E9C46A" w={3.5} />
      <Eye uid="fm-eL" x={-16} y={-6} rx={9} ry={11} blink={blink} lid={0.4} skin="#E3C9A8" outerLeft w={2} />
      <Eye uid="fm-eR" x={16} y={-6} rx={9} ry={11} blink={blink} lid={0.4} skin="#E3C9A8" w={2} />
      <path d="M -14 34 Q 0 24 14 34" stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
  </g>
);

const Noble: React.FC<{ x: number; y: number; s?: number; k: number; lf: number; blink: number }> = ({
  x,
  y,
  s = 1,
  k,
  lf,
  blink,
}) => {
  const shiver = Math.sin(lf * 1.6 + k) * 2.5;
  return (
    <g transform={`translate(${x + shiver} ${y}) scale(${s})`}>
      <Shape d="M -50 -60 C -60 -180, 60 -180, 50 -60 Z" fill={k % 2 === 0 ? "#6A040F" : "#1D3557"} w={4} />
      <Shape d={cloud(0, -180, 42, 16, `nfur${k}`, 8)} fill={C.wool} w={3.5} />
      <g transform="translate(0 -220)">
        <Shape d={blob(0, 0, 32, 36, `nh${k}`, 8, 0.05)} fill="#E3EDF5" w={3.5} />
        <path d={blob(0, 8, 7, 6, `nnose${k}`, 6, 0.1)} fill="#EF233C" />
        <Shape d="M -24 -28 L -24 -56 L -12 -42 L 0 -62 L 12 -42 L 24 -56 L 24 -28 Z" fill={C.gold} w={3} />
        <Eye uid={`nb-eL${k}`} x={-12} y={-6} rx={7} ry={8} blink={blink} skin="#E3EDF5" w={1.8} />
        <Eye uid={`nb-eR${k}`} x={12} y={-6} rx={7} ry={8} blink={blink} skin="#E3EDF5" w={1.8} />
      </g>
      {/* Bolsa de oro en manos temblorosas */}
      <g transform="translate(0 -110)">
        <Shape d={blob(0, 0, 24, 28, `bag${k}`, 8, 0.08)} fill={C.parch} w={3} />
        <Coin x={0} y={-8} r={12} seed={k} />
      </g>
    </g>
  );
};

const Dragon: React.FC<{ x: number; y: number; s?: number; blink: number }> = ({ x, y, s = 1, blink }) => {
  const { gf } = useClock();
  const flap = Math.sin((gf / 18) * TAU);
  const fan = Math.sin((gf / 40) * TAU) * 22;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shape d={blob(0, 0, 64, 76, "dbody", 8, 0.05)} fill={C.aura} w={4} />
      <path d={blob(10, 10, 36, 50, "dbelly", 7, 0.05)} fill="#E8F5D8" />
      {/* Abanico con hoja gigante de nabo */}
      <g transform={`translate(52 -50) rotate(${fan})`}>
        <Tube d="M 0 0 L 26 -28" w={6} fill={C.wood} />
        <Shape d="M 26 -28 C 60 -100, 160 -120, 220 -60 C 180 -10, 80 10, 26 -28 Z" fill={C.clover} w={4} />
      </g>
      <g transform="translate(38 -80)">
        <Shape d={blob(0, 0, 42, 38, "dh", 8, 0.05)} fill={C.aura} w={4} />
        <Shape d={blob(28, 10, 24, 18, "dsn", 7, 0.06)} fill={C.aura} w={3.5} />
        <Eye uid="dr-eye" x={0} y={-4} rx={11} ry={13} blink={blink} skin={C.aura} iris={C.gold} w={2.5} />
      </g>
    </g>
  );
};

/* ===================================================================== */
/*  ESCENA 1: EL GANCHO ISEKAI (00:00 - 00:07 | Frames 0 - 420)           */
/* ===================================================================== */
const Scene1IsekaiHook: React.FC<{ localFrame: number; blink: number }> = ({ localFrame, blink }) => {
  const lf = localFrame;
  const isNight = lf < 140;

  // Faros de Camión-Kun (frames 50-130)
  const truckBeam = rng(lf, [50, 110, 140], [0, 1, 0]);
  const truckX = rng(lf, [50, 130], [W + 400, W - 150]);

  // Transición de rasgado de papel (frames 110-180)
  const tearProg = rng(lf, [110, 170], [0, 1]);

  // Impacto en lodo (frames 140-200)
  const heroSquash = squash(lf, 160, 130);
  const mudSplash = rng(lf, [155, 175, 230], [0, 1, 0]);

  // Ventana RPG (frames 220-420)
  const rpgPop = sp(lf, 220);

  return (
    <g>
      {/* 1. Fondo Mundo Moderno */}
      {isNight && (
        <g opacity={1 - tearProg}>
          <Wash d={FULL} fill="url(#gNight)" />
          <Skyline seed="city1" base={1300} hMin={400} hMax={800} fill={C.asphalt} lit />
          <path d={`M -50 1300 L ${W + 50} 1300 L ${W + 50} 1950 L -50 1950 Z`} fill="#1E202E" />
          {/* Postes y cruce de calle */}
          <path d="M 220 1300 L 220 700" stroke="#4A4E69" strokeWidth={12} strokeLinecap="round" />
          <path d="M 200 710 L 280 710" stroke={C.beam} strokeWidth={8} strokeLinecap="round" />
        </g>
      )}

      {/* 2. Fondo Mundo Medieval (aparece detrás del rasgado) */}
      <g opacity={tearProg}>
        <Backdrop tone="dawn" lf={lf} />
      </g>

      {/* 3. Luces Camión-Kun */}
      {truckBeam > 0.01 && (
        <g opacity={truckBeam}>
          <polygon points={`${truckX},800 -200,400 -200,1600`} fill="url(#gBeam)" />
          <polygon points={`${truckX},950 -200,700 -200,1800`} fill="url(#gBeam)" />
          <circle cx={truckX} cy={850} r={90} fill={C.headlight} filter="url(#wc)" />
          <circle cx={truckX} cy={970} r={90} fill={C.headlight} filter="url(#wc)" />
        </g>
      )}

      {/* 4. Protagonista */}
      {lf < 140 ? (
        <Hero
          uid="sc1-hero-night"
          x={540}
          y={1500}
          scale={1.3}
          blink={blink}
          tired={1}
          top="hoodie"
          pack={0}
          surprise={truckBeam}
          open={truckBeam > 0.5 ? 0.8 : 0}
        />
      ) : (
        <g>
          {/* Splash de lodo */}
          {mudSplash > 0.05 && (
            <g transform="translate(540 1620) scale(1.6)" opacity={mudSplash}>
              <path d={blob(0, 0, 160, 50, "splash", 9, 0.3)} fill={C.mud} />
              <path d={blob(-120, -60, 40, 30, "spL", 7, 0.2)} fill={C.mud} />
              <path d={blob(120, -50, 44, 34, "spR", 7, 0.2)} fill={C.mud} />
            </g>
          )}
          <Hero
            uid="sc1-hero-isekai"
            x={540}
            y={1640}
            scale={1.3}
            rot={-42}
            sx={heroSquash.sx}
            sy={heroSquash.sy}
            blink={blink}
            mud={1}
            top="hoodie"
            pack={rng(lf, [180, 240], [0, 1])}
            brow={1}
            open={0.6}
          />
        </g>
      )}

      {/* 5. Ventana RPG Status flotante dibujada a mano */}
      {rpgPop > 0.01 && (
        <g transform={`translate(540 820) scale(${rpgPop})`}>
          <Shape d={blob(0, 0, 420, 180, "rpgbox", 10, 0.03)} fill={C.paper} w={5} stroke={C.ink} />
          <path d="M -390 -90 L 390 -90" stroke={C.mud} strokeWidth={4} strokeLinecap="round" />
          <text
            x={0}
            y={-110}
            textAnchor="middle"
            fill={C.ink}
            style={{ fontFamily: HAND, fontSize: 44, fontWeight: "bold" }}
          >
            ⚡ ESTADO DE REENCARNACIÓN ⚡
          </text>
          <text
            x={0}
            y={-20}
            textAnchor="middle"
            fill={C.headlight}
            style={{ fontFamily: HAND, fontSize: 48, fontWeight: "bold" }}
          >
            MAGIA: 0 | FUERZA: 2
          </text>
          <text
            x={0}
            y={60}
            textAnchor="middle"
            fill={C.forest}
            style={{ fontFamily: HAND, fontSize: 56, fontWeight: "bold" }}
          >
            CLASE: CAMPESINO
          </text>
        </g>
      )}
    </g>
  );
};

/* ===================================================================== */
/*  ESCENA 2: LA INEFICIENCIA MEDIEVAL (00:07 - 00:18 | Frames 420-1080)  */
/* ===================================================================== */
const Scene2MedievalInefficiency: React.FC<{ localFrame: number; blink: number }> = ({ localFrame, blink }) => {
  const lf = localFrame;
  const panX = rng(lf, [0, 400], [0, -180]);

  // Borrado con goma gigante (frames 360-600)
  const eraseProg = rng(lf, [360, 520], [0, 1]);
  const handY = rng(lf, [340, 390, 520, 600], [-300, 700, 750, -300]);
  const handX = rng(lf, [360, 520], [680, 520]);

  return (
    <g>
      <Backdrop tone="sunset" shift={panX} lf={lf} />

      {/* Campesino medieval con horca */}
      <Farmer x={260 + panX} y={1580} s={1.1} blink={blink} />

      {/* Parcela 1: Trigo raquítico y amarillo */}
      <g transform={`translate(${480 + panX} 1600)`}>
        <path d={blob(0, 0, 140, 50, "p1soil", 8, 0.08)} fill={C.mud} />
        <text x={0} y={-140} textAnchor="middle" fill={C.gold} style={{ fontFamily: HAND, fontSize: 38, fontWeight: "bold" }}>
          Parcela A (Trigo Triste)
        </text>
        <WheatCrop s={0.65} pop={0.8} />
      </g>

      {/* Parcela 2: Tierra vacía descansando */}
      <g transform={`translate(${840 + panX} 1600)`}>
        {eraseProg < 0.95 && (
          <g opacity={1 - eraseProg}>
            <path d={blob(0, 0, 160, 56, "p2dry", 8, 0.08)} fill="#7A7870" />
            {/* Grietas secas */}
            <path d="M -80 -10 L 0 10 L 70 -16 M -20 -24 L 20 20" stroke="#4A4944" strokeWidth={3} fill="none" />
            {/* Caritas chibi exhaustas */}
            {[-60, 0, 60].map((cx, i) => (
              <text key={i} x={cx} y={-30} fill="#D3D0C7" style={{ fontFamily: HAND, fontSize: 32 }}>
                x_x Zzz
              </text>
            ))}
            {/* Cartel de madera */}
            <g transform="translate(0 -160)">
              <Tube d="M 0 0 L 0 120" w={8} fill={C.woodDark} />
              <Shape d={blob(0, 0, 160, 60, "sign", 7, 0.06)} fill={C.wood} w={4} />
              <text x={0} y={-6} textAnchor="middle" fill={C.paper} style={{ fontFamily: HAND, fontSize: 32, fontWeight: "bold" }}>
                DESCANSANDO
              </text>
              <text x={0} y={26} textAnchor="middle" fill="#FFCDB2" style={{ fontFamily: HAND, fontSize: 26 }}>
                (No tocar por 1 año)
              </text>
            </g>
          </g>
        )}

        {/* Al borrar: brotes verdes nuevos */}
        {eraseProg > 0.3 && (
          <g opacity={eraseProg}>
            <path d={blob(0, 0, 170, 60, "p2fresh", 8, 0.08)} fill={C.clover} />
            <CloverCrop s={0.7} pop={eraseProg} />
          </g>
        )}
      </g>

      {/* Virutas de goma de borrar cayendo */}
      {eraseProg > 0.1 && eraseProg < 0.95 && (
        <Drift lf={lf} n={18} seed="eraser" kind="shaving" x0={500} x1={900} y0={600} y1={1600} speed={4} />
      )}

      {/* Mano ilustrada gigante con goma de borrar */}
      {handY > -200 && (
        <g transform={`translate(${handX} ${handY}) rotate(-25)`}>
          {/* Brazo boceto */}
          <Shape d="M -80 -600 L -50 0 L 50 0 L 80 -600 Z" fill={C.skin} w={6} />
          {/* Mano */}
          <Shape d={blob(0, 40, 90, 70, "bighand", 8, 0.08)} fill={C.skin} w={6} />
          {/* Goma de borrar blanca */}
          <Shape d="M -70 80 L 70 80 L 50 160 L -50 160 Z" fill="#FFFFFF" w={5} />
          <path d="M -70 80 L 70 80" stroke={C.ink} strokeWidth={4} />
          <text x={0} y={130} textAnchor="middle" fill="#888" style={{ fontFamily: HAND, fontSize: 28, fontWeight: "bold" }}>
            ERASER
          </text>
        </g>
      )}
    </g>
  );
};

/* ===================================================================== */
/*  ESCENA 3: EL SECRETO NORFOLK (00:18 - 00:36 | Frames 1080-2160)       */
/* ===================================================================== */
const Scene3NorfolkFourFields: React.FC<{ localFrame: number }> = ({ localFrame }) => {
  const lf = localFrame;

  // Apertura del pergamino (frames 0-120)
  const mapPop = sp(lf, 0);

  // Brote secuencial de los 4 cultivos
  const popWheat = sp(lf, 120);
  const popBarley = sp(lf, 220);
  const popTurnip = sp(lf, 320);
  const popClover = sp(lf, 420);

  // Pulso bio-luminoso en raíces
  const pulse = 1 + 0.18 * Math.sin((lf / 20) * TAU);

  // Carrusel rotación orbital (frames 600-1080)
  const orbitAngle = rng(lf, [600, 1020], [0, 360], EIO);

  return (
    <g>
      <Wash d={FULL} fill="#545B38" />

      {/* Pergamino / cuaderno de apuntes */}
      <g transform={`translate(540 960) scale(${mapPop})`}>
        <Shape d={blob(0, 0, 480, 720, "parchmap", 10, 0.04)} fill={C.paper} w={6} stroke={C.mud} />
        <path d="M -440 -640 L 440 -640" stroke={C.woodDark} strokeWidth={4} strokeLinecap="round" />
        <text
          x={0}
          y={-660}
          textAnchor="middle"
          fill={C.ink}
          style={{ fontFamily: HAND, fontSize: 48, fontWeight: "bold" }}
        >
          📜 PLAN AGRÍCOLA NORFOLK (ROTACIÓN DE 4 CAMPOS)
        </text>

        {/* Grupo orbital de las 4 parcelas cuadradas */}
        <g transform={`rotate(${orbitAngle})`}>
          {/* Cuadrícula divisoria */}
          <path d="M -380 0 L 380 0 M 0 -540 L 0 540" stroke={C.ink} strokeWidth={5} strokeDasharray="12 8" />

          {/* Campo 1 (NO): TRIGO */}
          <g transform="translate(-190 -270)">
            <Shape d={blob(0, 0, 160, 200, "f1", 8, 0.06)} fill="#FFF3CD" w={4} />
            <text x={0} y={-140} textAnchor="middle" fill={C.gold} style={{ fontFamily: HAND, fontSize: 36, fontWeight: "bold" }}>
              1. TRIGO (Venta)
            </text>
            <WheatCrop s={0.8} pop={popWheat} />
          </g>

          {/* Campo 2 (NE): CEBADA */}
          <g transform="translate(190 -270)">
            <Shape d={blob(0, 0, 160, 200, "f2", 8, 0.06)} fill="#FFE5D9" w={4} />
            <text x={0} y={-140} textAnchor="middle" fill={C.barley} style={{ fontFamily: HAND, fontSize: 36, fontWeight: "bold" }}>
              2. CEBADA (Cerveza)
            </text>
            <BarleyCrop s={0.8} pop={popBarley} />
          </g>

          {/* Campo 3 (SO): NABOS */}
          <g transform="translate(-190 270)">
            <Shape d={blob(0, 0, 160, 200, "f3", 8, 0.06)} fill="#F3E8FF" w={4} />
            <text x={0} y={-140} textAnchor="middle" fill={C.turnip} style={{ fontFamily: HAND, fontSize: 36, fontWeight: "bold" }}>
              3. NABOS (Limpia)
            </text>
            <TurnipCrop s={0.85} pop={popTurnip} />
          </g>

          {/* Campo 4 (SE): TRÉBOLES (RECARGA NITROGENO) */}
          <g transform="translate(190 270)">
            <Shape d={blob(0, 0, 160, 200, "f4", 8, 0.06)} fill="#D8F3DC" w={4} />
            <text x={0} y={-140} textAnchor="middle" fill={C.clover} style={{ fontFamily: HAND, fontSize: 36, fontWeight: "bold" }}>
              4. TRÉBOL (Recarga)
            </text>
            <CloverCrop s={0.9} pop={popClover} pulse={pulse} />
          </g>
        </g>
      </g>
    </g>
  );
};

/* ===================================================================== */
/*  ESCENA 4: EL COMBO GANADERO & INVIERNO (00:36 - 00:50 | 2160-3000)   */
/* ===================================================================== */
const Scene4LivestockWinterBoom: React.FC<{ localFrame: number; blink: number }> = ({ localFrame, blink }) => {
  const lf = localFrame;

  // Entrada de ovejas y vacas felices (frames 0-380)
  const animIn = sp(lf, 0);
  const inflate = rng(lf, [80, 240], [0, 1]);

  // Transición a invierno (frames 360-600)
  const winterProg = rng(lf, [360, 480], [0, 1]);

  // Fila de nobles tiritando con bolsas de oro (frames 440-840)
  const noblesIn = sp(lf, 440);

  // Moneda dorada girando hacia cámara (frames 720-840)
  const coinPop = rng(lf, [720, 840], [0, 1]);
  const coinScale = rng(lf, [720, 840], [0.2, 12]);
  const coinRot = rng(lf, [720, 840], [0, 720]);

  return (
    <g>
      <Backdrop tone={winterProg > 0.5 ? "winter" : "dawn"} lf={lf} />

      {/* Granero lleno */}
      <g transform="translate(240 1480)">
        <Shape d="M -160 0 L -160 -200 L 0 -280 L 160 -200 L 160 0 Z" fill="#9C3D2E" w={5} />
        <Shape d="M -80 0 L -80 -140 L 80 -140 L 80 0 Z" fill="#E9C46A" w={4} />
        <text x={0} y={-160} textAnchor="middle" fill={C.paper} style={{ fontFamily: HAND, fontSize: 32, fontWeight: "bold" }}>
          GRANERO LLENO
        </text>
      </g>

      {/* Ganado esponjoso (Oveja + Vaca) comiendo nabos y tréboles */}
      <g transform={`translate(540 1620) scale(${animIn})`}>
        {/* Oveja esponjosa */}
        <g transform="translate(-160 -40) scale(1.15)">
          <Shape d={cloud(0, -60, 110, 75, "sheepb", 12)} fill={C.wool} w={4.5} />
          <Shape d={blob(70, -40, 36, 42, "sheeph", 8, 0.05)} fill="#6B6F8A" w={3.5} />
          <Eye uid="sh-e" x={70} y={-45} rx={8} ry={9} blink={blink} skin="#6B6F8A" w={2} />
          {/* Masticando trébol */}
          <path d="M 90 -25 Q 110 -35 125 -20" stroke={C.clover} strokeWidth={6} fill="none" strokeLinecap="round" />
        </g>

        {/* Vaca feliz */}
        <g transform="translate(180 0) scale(1.1)">
          <Shape d={blob(0, -80, 140, 85, "cowb", 10, 0.05)} fill={C.wool} w={4.5} />
          <path d={blob(-40, -100, 50, 40, "cspot", 8, 0.15)} fill="#8A5A2B" />
          <Shape d={blob(120, -50, 50, 45, "cowh", 8, 0.05)} fill={C.wool} w={4} />
          <Eye uid="cow-e" x={120} y={-55} rx={9} ry={10} blink={blink} skin={C.wool} w={2} />
          {/* Masticando nabo */}
          <path d="M 140 -35 L 165 -25" stroke={C.turnip} strokeWidth={8} strokeLinecap="round" />
        </g>
      </g>

      {/* Partículas doradas de fertilidad */}
      <Drift lf={lf} n={16} seed="abono" kind="sparkle" x0={200} x1={900} y0={1400} y1={1750} speed={2} color={C.gold} />

      {/* Nieve invernal */}
      {winterProg > 0.1 && (
        <Drift lf={lf} n={30} seed="snowfall" kind="snow" x0={0} x1={W} y0={0} y1={H} speed={3} />
      )}

      {/* Fila de nobles tiritando para comprar comida */}
      {winterProg > 0.4 && (
        <g transform={`translate(780 1560) scale(${noblesIn})`}>
          <Noble x={0} y={0} s={0.9} k={1} lf={lf} blink={blink} />
          <Noble x={140} y={10} s={0.85} k={2} lf={lf} blink={blink} />
        </g>
      )}

      {/* Moneda de oro gigante de transición */}
      {coinPop > 0.01 && (
        <g transform={`translate(540 960) scale(${coinScale}) rotate(${coinRot})`} opacity={coinPop}>
          <Coin x={0} y={0} r={50} seed={99} />
        </g>
      )}
    </g>
  );
};

/* ===================================================================== */
/*  ESCENA 5: CONCLUSIÓN Y LOOP PERFECTO (00:50 - 01:00 | 3000-3600)      */
/* ===================================================================== */
const Scene5TycoonLoop: React.FC<{ localFrame: number; blink: number }> = ({ localFrame, blink }) => {
  const lf = localFrame;

  // Protagonista magnate en trono de trigo
  const heroIn = sp(lf, 0);

  // Enrollado de pergamino final (frames 520-600) para loop perfecto
  const loopRoll = rng(lf, [530, 600], [0, W + 100]);

  return (
    <g>
      {/* Fondo de corte imperial / castillo del estudiante */}
      <Wash d={FULL} fill="#FFFDF0" />
      <Backdrop tone="sunset" lf={lf} />

      {/* Trono construido con sacos colosales de trigo */}
      <g transform={`translate(540 1600) scale(${heroIn})`}>
        {/* Sacos de trigo apilados */}
        {[-180, 0, 180].map((bx, i) => (
          <g key={i} transform={`translate(${bx} 0)`}>
            <Shape d={blob(0, -60, 110, 80, `sackB${i}`, 8, 0.06)} fill={C.parch} w={5} />
            <path d="M -60 -40 L 60 -40" stroke={C.woodDark} strokeWidth={6} strokeLinecap="round" />
            <WheatCrop s={0.5} pop={1} />
          </g>
        ))}
        {[-90, 90].map((bx, i) => (
          <g key={i} transform={`translate(${bx} -120)`}>
            <Shape d={blob(0, -60, 100, 75, `sackT${i}`, 8, 0.06)} fill={C.parch} w={5} />
            <path d="M -50 -40 L 50 -40" stroke={C.woodDark} strokeWidth={6} strokeLinecap="round" />
          </g>
        ))}

        {/* Protagonista con capa de comerciante sobre sudadera escolar */}
        <Hero
          uid="sc5-tycoon"
          x={0}
          y={-140}
          scale={1.35}
          blink={blink}
          top="hoodie"
          cape={true}
          smile={1}
          heldL={
            /* Jugo en cajita con pajita */
            <g transform="translate(0 30)">
              <Shape d="M -16 -24 L 16 -24 L 14 24 L -14 24 Z" fill="#FF5964" w={3} />
              <Tube d="M 0 -24 L 0 -44 L 12 -54" w={5} fill="#FFFFFF" />
            </g>
          }
        />

        {/* Mini-dragón tierno abanicándole */}
        <Dragon x={280} y={-240} s={0.9} blink={blink} />
      </g>

      {/* Corona de laurel y lluvia de monedas */}
      <Drift lf={lf} n={20} seed="goldrain" kind="sparkle" x0={100} x1={980} y0={100} y1={1700} speed={2.5} />

      {/* ENROLLADO DE PERGAMINO (SEAMLESS LOOP HACIA FRAME 0) */}
      {loopRoll > 0 && (
        <g>
          <clipPath id="loop-clip">
            <rect x={0} y={0} width={loopRoll} height={H} />
          </clipPath>
          <g clipPath="url(#loop-clip)">
            {/* Reproduce la calle nocturna del Frame 0 */}
            <Wash d={FULL} fill="url(#gNight)" />
            <Skyline seed="city1" base={1300} hMin={400} hMax={800} fill={C.asphalt} lit />
            <Hero uid="sc5-loop-hero" x={540} y={1500} scale={1.3} blink={blink} tired={1} top="hoodie" pack={0} />
          </g>
          {/* Borde del cilindro de papel enrollándose */}
          <rect x={loopRoll - 30} y={0} width={40} height={H} fill="url(#gRoll)" opacity={0.9} />
        </g>
      )}
    </g>
  );
};

/* ===================================================================== */
/*  COMPONENTE PRINCIPAL: WORLD2D                                         */
/* ===================================================================== */
interface World2DProps {
  currentScene: number;
  sceneLocalFrame: number;
}

export const World2D: React.FC<World2DProps> = ({ currentScene, sceneLocalFrame }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Modulador de Line-Boil para acabado artesanal de lápiz/pluma (20 fps)
  const step = Math.floor(frame / 3);
  const boilX = Math.sin(step * 17.3) * 1.5;
  const boilY = Math.cos(step * 23.7) * 1.5;
  const boilRot = ((step % 3) - 1) * 0.3;

  // Parpadeo periódico (cada 90 frames, dura 6 frames)
  const blinkCycle = frame % 90;
  const blink = interpolate(blinkCycle, [0, 3, 6], [0, 1, 0], CL);

  return (
    <Clock.Provider value={{ gf: frame, step }}>
      <div
        style={{
          width,
          height,
          backgroundColor: C.paper,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* DEFS GLOBALES */}
        <Defs step={step} />

        {/* CAPA 1: Textura de Papel Acuarela y Grano */}
        <svg
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 60,
            opacity: 0.12,
            mixBlendMode: "multiply",
          }}
        >
          <filter id="paper-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={4} result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.8 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#paper-noise)" />
        </svg>

        {/* RENDERIZADO VECTORIAL SVG CON LINE-BOIL */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{
            width: "100%",
            height: "100%",
            transform: `translate(${boilX}px, ${boilY}px) rotate(${boilRot}deg)`,
            transformOrigin: "center center",
          }}
        >
          {currentScene === 0 && <Scene1IsekaiHook localFrame={sceneLocalFrame} blink={blink} />}
          {currentScene === 1 && <Scene2MedievalInefficiency localFrame={sceneLocalFrame} blink={blink} />}
          {currentScene === 2 && <Scene3NorfolkFourFields localFrame={sceneLocalFrame} />}
          {currentScene === 3 && <Scene4LivestockWinterBoom localFrame={sceneLocalFrame} blink={blink} />}
          {currentScene === 4 && <Scene5TycoonLoop localFrame={sceneLocalFrame} blink={blink} />}
        </svg>

        {/* SFX TÁCTILES SINCRONIZADOS A BEATS CLAVE */}
        {frame === 10 && (
          <Sequence from={10} durationInFrames={60}>
            <Audio src={staticFile("assets/audio/sfx/whooshes/whoosh_cinematic.wav")} volume={0.8} />
          </Sequence>
        )}
        {frame === 150 && (
          <Sequence from={150} durationInFrames={60}>
            <Audio src={staticFile("assets/audio/sfx/impacts/sub_impact_thud.wav")} volume={0.9} />
          </Sequence>
        )}
        {frame === 230 && (
          <Sequence from={230} durationInFrames={60}>
            <Audio src={staticFile("assets/audio/sfx/ui/switch1.wav")} volume={0.7} />
          </Sequence>
        )}
        {frame === 430 && (
          <Sequence from={430} durationInFrames={90}>
            <Audio src={staticFile("assets/audio/sfx/ambience/tension_riser.wav")} volume={0.5} />
          </Sequence>
        )}
        {frame === 780 && (
          <Sequence from={780} durationInFrames={40}>
            <Audio src={staticFile("assets/audio/sfx/ui/mouseclick1.wav")} volume={0.8} />
          </Sequence>
        )}
        {frame === 1090 && (
          <Sequence from={1090} durationInFrames={40}>
            <Audio src={staticFile("assets/audio/sfx/ui/click1.wav")} volume={0.75} />
          </Sequence>
        )}
        {frame === 1500 && (
          <Sequence from={1500} durationInFrames={50}>
            <Audio src={staticFile("assets/audio/sfx/ui/switch5.wav")} volume={0.8} />
          </Sequence>
        )}
        {frame === 2170 && (
          <Sequence from={2170} durationInFrames={60}>
            <Audio src={staticFile("assets/audio/sfx/impacts/sub_impact_thud.wav")} volume={0.85} />
          </Sequence>
        )}
        {frame === 3010 && (
          <Sequence from={3010} durationInFrames={40}>
            <Audio src={staticFile("assets/audio/sfx/ui/mouseclick1.wav")} volume={0.7} />
          </Sequence>
        )}
        {frame === 3540 && (
          <Sequence from={3540} durationInFrames={50}>
            <Audio src={staticFile("assets/audio/sfx/whooshes/whoosh_fast.wav")} volume={0.9} />
          </Sequence>
        )}
      </div>
    </Clock.Provider>
  );
};
