import React, { useMemo } from "react";
import {
  Audio,
  Img,
  interpolate,
  interpolateColors,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ════════════════════════════════════════════════════════════════════════════
   WORLD2D — "El truco de agricultura que te hará millonario si reencarnas en
   un isekai…" (Sistema Norfolk) · 1080×1920 · 60 fps · 3600 frames = 60 s
   Estética: Light Novel Watercolor / Manga Storytime (acuarela + line-boil)
   ════════════════════════════════════════════════════════════════════════════ */

const W = 1080;
const H = 1920;
const TWO_PI = Math.PI * 2;

/** Hacia dónde mira cada sprite "de fábrica". */
const COW_FACES_RIGHT = false;
const SHEEP_FACES_RIGHT = true;

const SERIF = "'Palatino Linotype','Book Antiqua',Palatino,Georgia,serif";
const HAND = "'Patrick Hand','Segoe Print','Bradley Hand','Comic Sans MS',cursive";

/* ───────────────────────────── PALETA NARRATIVA ───────────────────────────── */
const C = {
  // Mundo moderno
  asphalt: "#2B2D42",
  hoodie: "#8D99AE",
  pale: "#EDF2F4",
  red: "#EF233C",
  beam: "#FFD166",
  // Isekai campesino
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
  // Apoyos
  velvet: "#9E1B32",
  skin: "#F1C9A5",
  pink: "#F4A6B0",
};

/* ──────────────────────────────── ACTIVOS ──────────────────────────────── */
const CH = (n: string) => staticFile(`assets/2d/characters/${n}.png`);
const PR = (n: string) => staticFile(`assets/2d/props/${n}.png`);
const EN = (n: string) => staticFile(`assets/2d/environments/${n}.png`);

const IMG = {
  studentFront: CH("student_front"),
  studentShocked: CH("student_shocked"),
  studentSmug: CH("student_smug"),
  studentSlurping: CH("student_slurping"),
  studentTycoon: CH("student_tycoon"),
  peasant: CH("medieval_peasant"),
  sheep: CH("cloud_sheep"),
  cow: CH("hungry_cow"),
  dragon: CH("baby_dragon"),
  nobles: CH("trembling_nobles"),
  wheat: PR("golden_wheat"),
  turnip: PR("giant_turnip"),
  barley: PR("barley_brew"),
  clover: PR("magic_clover"),
  fallowSign: EN("fallow_land_sign"),
  castle: EN("winter_castle"),
};

// Partículas teñidas con máscara CSS
const VFX = {
  light: staticFile("assets/2d/vfx/particles/light_01.png"),
  star: staticFile("assets/2d/vfx/particles/star_01.png"),
  dirt: staticFile("assets/2d/vfx/particles/dirt_01.png"),
  smoke: staticFile("assets/2d/vfx/smoke/smoke_01.png"),
  fire: staticFile("assets/2d/vfx/particles/fire_01.png"),
};

/* ─────────────────────────────── CRONOGRAMA ─────────────────────────────── */
const SCENE_START = [0, 420, 1080, 2160, 3000];

interface SfxCue {
  at: number;
  file: string;
  volume: number;
  dur?: number;
}
const SFX: SfxCue[] = [
  // Escena 1
  { at: 10, file: "whooshes/whoosh_cinematic.wav", volume: 0.8 },
  { at: 110, file: "impacts/sub_impact_thud.wav", volume: 0.9 },
  { at: 240, file: "impacts/sub_impact_thud.wav", volume: 0.6 }, // aterrizaje en el lodo
  { at: 240, file: "ui/switch1.wav", volume: 0.7 },
  // Escena 2
  { at: 430, file: "ambience/tension_riser.wav", volume: 0.5, dur: 300 },
  { at: 680, file: "ui/mouseclick1.wav", volume: 0.6 },
  { at: 780, file: "ui/mouseclick1.wav", volume: 0.8 }, // goma frota el letrero
  // Escena 3
  { at: 1090, file: "ui/click1.wav", volume: 0.75 },
  { at: 1250, file: "ui/click1.wav", volume: 0.6 },
  { at: 1410, file: "ui/click1.wav", volume: 0.6 },
  { at: 1500, file: "ui/switch5.wav", volume: 0.8 },
  { at: 1580, file: "ui/click1.wav", volume: 0.6 },
  { at: 1750, file: "ui/click1.wav", volume: 0.6 },
  { at: 1900, file: "whooshes/whoosh_fast.wav", volume: 0.7 }, // 1.ª rotación anual
  // Escena 4
  { at: 2170, file: "impacts/sub_impact_thud.wav", volume: 0.85 },
  { at: 2540, file: "ui/switch2.wav", volume: 0.7 }, // llega el invierno
  { at: 2860, file: "whooshes/whoosh_cinematic.wav", volume: 0.9 }, // moneda hacia cámara
  // Escena 5
  { at: 3010, file: "ui/mouseclick1.wav", volume: 0.7 },
  { at: 3560, file: "whooshes/whoosh_fast.wav", volume: 0.9 }, // remolino del loop
];

/* ─────────────────────────────── UTILIDADES ─────────────────────────────── */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const prog = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const SPRING = { damping: 12, stiffness: 100 };

/** Spring seguro (0 antes de `start`). */
const pop = (f: number, start: number, fps: number, config = SPRING) =>
  f < start ? 0 : spring({ frame: f - start, fps, config });

/** Spring + squash & stretch (elongación en subida, aplastamiento al asentarse). */
const springSquash = (f: number, start: number, fps: number) => {
  const g = pop(f, start, fps);
  const gp = pop(f - 1, start, fps);
  const st = Math.max(-0.12, Math.min(0.15, (g - gp) * 3.2));
  return {
    g,
    sx: Math.max(0.001, (0.5 + 0.5 * g) * (1 - st * 0.9)), // 0.90 en subida
    sy: Math.max(0.001, g * (1 + st)), // 1.15 en subida
  };
};

/** Line-boil: vibración de dibujo a mano a 20 fps (cada 3 frames @60). */
const lineBoil = (frame: number, seed = 0, amp = 1.8) => {
  const s = Math.floor(frame / 3);
  return {
    x: Math.sin(s * 17.3 + seed * 3.1) * amp,
    y: Math.cos(s * 23.7 + seed * 5.3) * amp,
    r: (((s + Math.floor(seed)) % 3) - 1) * 0.35,
  };
};

type Pt = [number, number];

/** Mancha de acuarela orgánica (curva cerrada suavizada). */
const blob = (cx: number, cy: number, rx: number, ry: number, seed: number, n = 14, wob = 0.1) => {
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TWO_PI;
    const r = 1 + (rand(seed * 13 + i) - 0.5) * 2 * wob;
    return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r];
  });
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]);
  let d = `M${m0[0].toFixed(1)},${m0[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    d += ` Q${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)}`;
  }
  return d + "Z";
};

/** Borde irregular tipo papel cortado a mano. */
const wobblyRect = (x: number, y: number, w: number, h: number, seed: number, amp = 6, step = 70) => {
  const pts: Pt[] = [];
  const nx = Math.max(2, Math.round(w / step));
  const ny = Math.max(2, Math.round(h / step));
  let k = 0;
  const j = () => (rand(seed * 31 + k++) - 0.5) * 2 * amp;
  for (let i = 0; i < nx; i++) pts.push([x + (w * i) / nx + j(), y + j()]);
  for (let i = 0; i < ny; i++) pts.push([x + w + j(), y + (h * i) / ny + j()]);
  for (let i = 0; i < nx; i++) pts.push([x + w - (w * i) / nx + j(), y + h + j()]);
  for (let i = 0; i < ny; i++) pts.push([x + j(), y + h - (h * i) / ny + j()]);
  return "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L") + "Z";
};

const starPath = (R: number, r: number, n: number) => {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (i / (n * 2)) * TWO_PI - Math.PI / 2;
    pts.push(`${(Math.cos(a) * rad).toFixed(1)},${(Math.sin(a) * rad).toFixed(1)}`);
  }
  return "M" + pts.join(" L") + "Z";
};

const gearPath = (r: number, teeth: number, depth: number) => {
  const step = TWO_PI / teeth;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    ([[0, r - depth], [0.15, r], [0.45, r], [0.6, r - depth]] as Pt[]).forEach(([k, rad]) => {
      const a = a0 + k * step;
      pts.push(`${(Math.cos(a) * rad).toFixed(1)},${(Math.sin(a) * rad).toFixed(1)}`);
    });
  }
  return "M" + pts.join(" L") + "Z";
};

/* ──────────────────────────── PRIMITIVAS VISUALES ──────────────────────────── */
type Blend = React.CSSProperties["mixBlendMode"];

const PaperBase: React.FC<{ color?: string }> = ({ color = C.paper }) => (
  <div style={{ position: "absolute", inset: 0, backgroundColor: color }} />
);

const Layer: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg
    viewBox={`0 0 ${W} ${H}`}
    width={W}
    height={H}
    style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...style }}
  >
    {children}
  </svg>
);

interface SpriteProps {
  src: string;
  frame: number;
  x: number;
  y: number;
  w: number;
  h?: number;
  anchor?: "bottom" | "center";
  origin?: string;
  rot?: number;
  sx?: number;
  sy?: number;
  opacity?: number;
  flip?: boolean;
  seed?: number;
  blend?: Blend;
  filter?: string;
  boil?: number;
}

/** Sprite ilustrado con multiply sobre papel, line-boil y squash & stretch. */
const Sprite: React.FC<SpriteProps> = ({
  src, frame, x, y, w, h, anchor = "bottom", origin, rot = 0, sx = 1, sy = 1,
  opacity = 1, flip = false, seed = 0, blend = "normal", filter, boil = 1.4,
}) => {
  const hh = h ?? w;
  const b = lineBoil(frame, seed, boil);
  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: anchor === "bottom" ? y - hh : y - hh / 2,
        width: w,
        height: hh,
        opacity,
        mixBlendMode: blend,
        filter,
        transformOrigin: origin ?? (anchor === "bottom" ? "50% 100%" : "50% 50%"),
        transform: `translate(${b.x}px, ${b.y}px) rotate(${rot + b.r}deg) scale(${flip ? -sx : sx}, ${sy})`,
      }}
    >
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
};

/** Partícula teñida: usa el PNG blanco como máscara y lo colorea. */
const Glow: React.FC<{
  src: string; x: number; y: number; size: number; color: string;
  opacity?: number; rot?: number; blend?: Blend;
}> = ({ src, x, y, size, color, opacity = 1, rot = 0, blend = "normal" }) => {
  if (opacity <= 0.003 || size <= 0.5) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        opacity,
        mixBlendMode: blend,
        transform: `rotate(${rot}deg)`,
      }}
    />
  );
};

/** Texto caligráfico con halo de papel y boil. */
const Ink: React.FC<{
  text: string; x: number; y: number; size: number; frame: number;
  color?: string; halo?: string; rot?: number; opacity?: number; seed?: number;
  serif?: boolean; weight?: number; scale?: number;
}> = ({
  text, x, y, size, frame, color = C.ink, halo = C.paper, rot = 0, opacity = 1,
  seed = 0, serif = false, weight = 700, scale = 1,
}) => {
  if (opacity <= 0.003 || scale <= 0.001) return null;
  const b = lineBoil(frame, seed, 1.6);
  const hs = `2px 2px 0 ${halo}, -2px -2px 0 ${halo}, 2px -2px 0 ${halo}, -2px 2px 0 ${halo}, 0 4px 0 ${halo}`;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        whiteSpace: "nowrap",
        fontFamily: serif ? SERIF : HAND,
        fontSize: size,
        fontWeight: weight,
        color,
        opacity,
        textShadow: hs,
        transform: `translate(-50%,-50%) translate(${b.x}px,${b.y}px) rotate(${rot + b.r}deg) scale(${scale})`,
      }}
    >
      {text}
    </div>
  );
};

const Sprout: React.FC<{
  x: number; y: number; grow: number; frame: number; seed: number;
  scale?: number; c1?: string; c2?: string;
}> = ({ x, y, grow, frame, seed, scale = 1, c1 = C.forest, c2 = C.clover }) => {
  if (grow <= 0.001) return null;
  const sway = Math.sin(frame * 0.09 + seed) * 5 * scale;
  const h = 90 * grow * scale;
  const stem = `M0,0 Q${sway * 0.6},${-h * 0.5} ${sway},${-h}`;
  const lx = sway - 17 * scale * grow;
  const rx = sway + 17 * scale * grow;
  const ly = -h * 0.88;
  return (
    <g transform={`translate(${x},${y})`}>
      <path d={stem} stroke={C.ink} strokeWidth={9 * scale} fill="none" strokeLinecap="round" />
      <path d={stem} stroke={c1} strokeWidth={5 * scale} fill="none" strokeLinecap="round" />
      <ellipse cx={lx} cy={ly} rx={23 * scale * grow} ry={11 * scale * grow} fill={c2} stroke={C.ink} strokeWidth={3} transform={`rotate(-30 ${lx} ${ly})`} />
      <ellipse cx={rx} cy={ly} rx={23 * scale * grow} ry={11 * scale * grow} fill={c2} stroke={C.ink} strokeWidth={3} transform={`rotate(30 ${rx} ${ly})`} />
    </g>
  );
};

const Coin: React.FC<{ x: number; y: number; r: number; spin: number; opacity?: number }> = ({ x, y, r, spin, opacity = 1 }) => {
  const sx = Math.max(0.08, Math.abs(Math.cos(spin)));
  return (
    <g transform={`translate(${x},${y}) scale(${sx},1)`} opacity={opacity}>
      <circle r={r} fill={C.gold} stroke={C.mud} strokeWidth={r * 0.12} />
      <circle r={r * 0.68} fill="none" stroke={C.mud} strokeWidth={r * 0.07} strokeDasharray={`${r * 0.25} ${r * 0.12}`} />
      <path d={starPath(r * 0.4, r * 0.17, 5)} fill="#FFE08A" stroke={C.mud} strokeWidth={r * 0.04} />
    </g>
  );
};

const Sack: React.FC<{
  x: number; y: number; s: number; sx?: number; sy?: number; rot?: number; color?: string;
}> = ({ x, y, s, sx = 1, sy = 1, rot = 0, color = C.parch }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s * sx},${s * sy})`}>
    <path
      d="M-95,0 Q-125,-70 -90,-135 Q-60,-170 -35,-190 L-45,-215 Q0,-235 45,-215 L35,-190 Q60,-170 90,-135 Q125,-70 95,0 Q0,25 -95,0Z"
      fill={color} stroke={C.ink} strokeWidth={6} strokeLinejoin="round"
    />
    <path d="M-40,-196 Q0,-174 40,-196" stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
    <path d="M-62,-62 Q0,-28 62,-62" stroke={C.ink} strokeWidth={4} fill="none" strokeDasharray="12 9" opacity={0.6} />
    <path d="M0,-130 L0,-78 M-14,-118 L0,-104 M14,-118 L0,-104 M-14,-96 L0,-82 M14,-96 L0,-82" stroke={C.mud} strokeWidth={5} fill="none" strokeLinecap="round" />
  </g>
);

/* ═══════════════════════════════════════════════════════════════════════════
   ESCENA 1 — EL GANCHO ISEKAI (frames 0–420)
   ═══════════════════════════════════════════════════════════════════════════ */
interface SceneProps {
  localFrame: number;
  fps: number;
}

const TEAR_PTS: Pt[] = Array.from({ length: 17 }, (_, i) => [
  540 + (i % 2 === 0 ? -1 : 1) * (14 + rand(i + 3) * 40),
  i * 120,
]);
const tearList = TEAR_PTS.map(([x, y]) => `${x.toFixed(0)}px ${y}px`).join(", ");
const CLIP_LEFT = `polygon(0px 0px, ${tearList}, 0px ${H}px)`;
const CLIP_RIGHT = `polygon(${W}px 0px, ${tearList}, ${W}px ${H}px)`;

const CityNight: React.FC<{ frame: number; truckT: number }> = ({ frame, truckT }) => {
  const s = 0.12 + 3.4 * Math.pow(truckT, 3);
  const flick = 0.75 + 0.25 * Math.sin(frame * 0.7 + 2);
  const bld: [number, number, number][] = [
    [-20, 220, 760], [190, 160, 560], [330, 240, 880], [580, 180, 640], [740, 260, 820], [980, 200, 600],
  ];
  return (
    <Layer>
      <defs>
        <linearGradient id="c1-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.asphalt} />
          <stop offset="1" stopColor="#5C6078" />
        </linearGradient>
        <radialGradient id="c1-beam">
          <stop offset="0" stopColor="#FFF8E1" stopOpacity="1" />
          <stop offset="0.35" stopColor={C.beam} stopOpacity="0.85" />
          <stop offset="1" stopColor={C.beam} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#c1-sky)" />
      <path d={blob(820, 300, 90, 90, 4, 12, 0.03)} fill="#EDF2F4" opacity={0.25} />
      {/* Siluetas lejanas (capa 2) */}
      {bld.map(([x, w, h], i) => (
        <g key={i}>
          <path d={`M${x},1200 L${x},${1200 - h} L${x + w * 0.5},${1200 - h - 30 + rand(i) * 20} L${x + w},${1200 - h} L${x + w},1200Z`} fill={i % 2 ? "#1E2033" : "#252840"} stroke={C.ink} strokeWidth={4} opacity={0.95} />
          {Array.from({ length: 12 }, (_, k) => (
            <rect key={k} x={x + 24 + (k % 3) * (w / 3.4)} y={1200 - h + 60 + Math.floor(k / 3) * 130} width={22} height={34} fill={C.beam} opacity={rand(i * 10 + k) > 0.45 ? 0.75 : 0.08} />
          ))}
        </g>
      ))}
      {/* Calle */}
      <path d={`M0,1180 L${W},1180 L${W},${H} L0,${H}Z`} fill="#1B1D2E" />
      <path d={`M0,1180 L${W},1180`} stroke={C.hoodie} strokeWidth={5} opacity={0.5} />
      {Array.from({ length: 8 }, (_, i) => {
        const t = (i / 8 + frame * 0.004) % 1;
        const y = 1190 + t * t * 730;
        const wd = 8 + t * 40;
        return <path key={i} d={`M${540 - wd},${y} L${540 + wd},${y}`} stroke={C.pale} strokeWidth={4 + t * 14} strokeLinecap="round" opacity={0.5} />;
      })}
      {/* Farolas */}
      {[130, 950].map((x, i) => (
        <g key={i}>
          <path d={`M${x},1200 L${x},760 Q${x},700 ${i ? x - 70 : x + 70},700`} stroke={C.ink} strokeWidth={14} fill="none" strokeLinecap="round" />
          <circle cx={i ? x - 70 : x + 70} cy={716} r={170} fill={C.beam} opacity={0.18 * flick} />
          <circle cx={i ? x - 70 : x + 70} cy={716} r={26} fill={C.beam} stroke={C.ink} strokeWidth={5} />
        </g>
      ))}
      {/* Camión-kun */}
      {truckT > 0 && (
        <g transform={`translate(540,1320) scale(${s})`}>
          <path d="M-170,-10 L-170,-250 L40,-250 L40,-10Z" fill="#14152a" stroke={C.ink} strokeWidth={6 / s + 2} />
          <path d="M40,-10 L40,-190 L120,-190 L170,-120 L170,-10Z" fill="#1d1f38" stroke={C.ink} strokeWidth={6 / s + 2} />
          <path d="M58,-175 L112,-175 L148,-124 L58,-124Z" fill={C.hoodie} opacity={0.7} />
          <path d="M-60,-16 Q0,-34 60,-16" stroke={C.hoodie} strokeWidth={5} fill="none" />
          <circle cx={-132} cy={0} r={34} fill="#0c0c18" stroke={C.ink} strokeWidth={5} />
          <circle cx={110} cy={0} r={34} fill="#0c0c18" stroke={C.ink} strokeWidth={5} />
          <circle cx={150} cy={-60} r={22} fill={C.beam} stroke={C.ink} strokeWidth={4} />
          <circle cx={-150} cy={-60} r={22} fill={C.beam} stroke={C.ink} strokeWidth={4} />
          <circle cx={-60} cy={-262} r={10} fill={C.red} />
          <circle cx={0} cy={-262} r={10} fill={C.red} />
          <circle cx={150} cy={-60} r={230} fill="url(#c1-beam)" opacity={truckT} />
          <circle cx={-150} cy={-60} r={230} fill="url(#c1-beam)" opacity={truckT} />
        </g>
      )}
      <path d={`M${TEAR_PTS.map(([x, y]) => `${x},${y}`).join(" L")}`} stroke={C.paper} strokeWidth={20} fill="none" strokeLinejoin="round" opacity={0.95} />
      <path d={`M${TEAR_PTS.map(([x, y]) => `${x},${y}`).join(" L")}`} stroke={C.ink} strokeWidth={3} fill="none" strokeDasharray="14 10" />
    </Layer>
  );
};

const IsekaiMud: React.FC<{ frame: number }> = ({ frame }) => {
  const bs = Math.floor(frame / 3) % 3;
  return (
    <Layer>
      <defs>
        <linearGradient id="i1-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE8B0" />
          <stop offset="1" stopColor={C.paper} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#i1-sky)" />
      <path d={blob(780, 420, 130, 130, 6 + bs, 12, 0.04)} fill={C.gold} opacity={0.35} />
      <path d={blob(240, 1180, 520, 190, 8 + bs, 14, 0.08)} fill={C.forest} opacity={0.55} />
      <path d={blob(880, 1210, 480, 160, 9 + bs, 14, 0.08)} fill={C.aura} opacity={0.5} />
      <path d={blob(540, 1790, 880, 560, 11 + bs, 18, 0.06)} fill={C.mud} />
      <path d={blob(540, 1700, 760, 420, 12 + bs, 18, 0.07)} fill={C.parch} opacity={0.5} />
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} d={`M${-40},${1320 + i * 80} Q${540},${1290 + i * 80 + (i % 2) * 24} ${1120},${1320 + i * 80}`} stroke={C.ink} strokeWidth={3} fill="none" opacity={0.25} />
      ))}
    </Layer>
  );
};

export const Scene1IsekaiHook: React.FC<SceneProps & { blink: number }> = ({ localFrame: f, fps, blink }) => {
  const truckT = prog(f, 36, 110);
  const tear = easeInOut(prog(f, 124, 214));
  const launch = prog(f, 118, 240);
  const arc = 4 * launch * (1 - launch);
  const landed = f >= 240;
  const land = pop(f, 240, fps);
  const afraid = f > 60 && f < 110 ? Math.sin(f * 2.4) * 3 : 0;

  // Squash & stretch del estudiante
  let sxv = 1;
  let syv = 1;
  if (f < 110) {
    syv = 1 + 0.012 * Math.sin(f * 0.12) - blink * 0.014;
  } else if (!landed) {
    const st = launch > 0.5 ? 0.14 * prog(launch, 0.6, 1) : 0.08 * (1 - prog(launch, 0, 0.2));
    syv = 1 + st;
    sxv = 1 - st * 0.7;
  } else {
    sxv = 1 + 0.3 * (1 - land); // 1.3 → 1
    syv = 1 - 0.3 * (1 - land); // 0.7 → 1
  }
  const feetY = f < 118 ? 1540 : 1540 - arc * 800;
  const px = 540 + afraid + (f >= 118 && !landed ? Math.sin(launch * TWO_PI) * 110 : 0);
  const rot = f < 118 ? 0 : landed ? 12 * (1 - land) : launch * 720;
  const studentSrc = f < 110 ? IMG.studentFront : f < 330 ? IMG.studentShocked : IMG.studentFront;
  const studentBlend: Blend = "normal";

  // Destellos / flash
  const yellow = prog(f, 86, 110) * 0.85 * (1 - prog(f, 112, 134));
  const white = interpolate(f, [108, 111, 136], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const honk = springSquash(f, 104, fps);

  // RPG
  const ui = springSquash(f, 246, fps);
  const uiBob = Math.sin(f * 0.06) * 10;
  const lines = [
    { t: "Magia: 0", y: -30, s: 262 },
    { t: "Fuerza: 2", y: 58, s: 282 },
    { t: "Clase: Campesino", y: 146, s: 302 },
  ];

  // Mochila → saco de semillas
  const bpT = prog(f, 336, 366);
  const sackPop = springSquash(f, 366, fps);

  return (
    <>
      <PaperBase />
      <IsekaiMud frame={f} />
      {/* Fondo urbano rasgado en dos mitades irregulares con sombra proyectada */}
      <div style={{ position: "absolute", inset: 0, transformOrigin: "0% 60%", transform: `translateX(${-tear * 700}px) rotate(${-tear * 9}deg)`, filter: tear > 0 ? "drop-shadow(12px 0 16px rgba(40,54,24,0.5))" : undefined }}>
        <div style={{ position: "absolute", inset: 0, clipPath: CLIP_LEFT }}>
          <CityNight frame={f} truckT={truckT} />
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "100% 60%", transform: `translateX(${tear * 700}px) rotate(${tear * 9}deg)`, filter: tear > 0 ? "drop-shadow(-12px 0 16px rgba(40,54,24,0.5))" : undefined }}>
        <div style={{ position: "absolute", inset: 0, clipPath: CLIP_RIGHT }}>
          <CityNight frame={f} truckT={truckT} />
        </div>
      </div>

      {/* Charco de lodo + mochila/saco */}
      <Layer>
        {landed && (
          <g>
            <ellipse cx={540} cy={1548} rx={270 * land} ry={58 * land} fill={C.mud} stroke={C.ink} strokeWidth={5} />
            <ellipse cx={540} cy={1540} rx={190 * land} ry={36 * land} fill="#8c4f17" opacity={0.6} />
          </g>
        )}
        {f >= 330 && (
          <g transform={`translate(190,1560)`}>
            {f < 366 && (
              <g transform={`scale(${1 - bpT * 0.4},${1 + Math.sin(bpT * Math.PI) * 0.15})`} opacity={1 - bpT}>
                <path d="M-70,0 Q-82,-120 -40,-150 Q0,-172 40,-150 Q82,-120 70,0 Z" fill={C.hoodie} stroke={C.ink} strokeWidth={6} />
                <path d="M-40,-60 Q0,-40 40,-60 L40,-20 Q0,0 -40,-20Z" fill="#6f7a92" stroke={C.ink} strokeWidth={4} />
                <path d="M-30,-150 Q0,-210 30,-150" stroke={C.ink} strokeWidth={8} fill="none" />
              </g>
            )}
            {f >= 366 && (
              <g>
                <Sack x={0} y={0} s={0.85} sx={sackPop.sx} sy={sackPop.sy} color={C.parch} />
                <text x={0} y={-60 * sackPop.g} textAnchor="middle" fontFamily={HAND} fontSize={30} fontWeight={700} fill={C.ink} opacity={sackPop.g}>SEMILLAS</text>
              </g>
            )}
          </g>
        )}
      </Layer>

      {f >= 366 && f < 420 &&
        Array.from({ length: 6 }, (_, i) => {
          const t = (f - 366) / 54;
          const a = (i / 6) * TWO_PI;
          return <Glow key={i} src={VFX.star} x={190 + Math.cos(a) * 170 * t} y={1440 + Math.sin(a) * 140 * t} size={60 * (1 - t * 0.4)} color={C.gold} opacity={1 - t} rot={t * 180} />;
        })}

      {/* Capa 4: protagonista */}
      <Sprite
        src={studentSrc} frame={f} x={px} y={feetY} w={520} h={780} rot={rot}
        sx={sxv} sy={syv} blend={studentBlend} seed={1}
        origin={landed || f < 118 ? "50% 100%" : "50% 55%"}
      />

      {/* Salpicaduras de barro */}
      {Array.from({ length: 14 }, (_, i) => {
        const t = f - 240;
        if (t < 0 || t > 70) return null;
        const a = ((200 + (i / 13) * 140) * Math.PI) / 180;
        const sp = 12 + rand(i) * 14;
        return (
          <Glow key={i} src={VFX.dirt} x={540 + Math.cos(a) * sp * t} y={1520 + Math.sin(a) * sp * t + 0.42 * t * t}
            size={50 + rand(i + 4) * 36} color={C.mud} opacity={1 - t / 70} rot={t * 8 * (i % 2 ? 1 : -1)} />
        );
      })}

      {/* Interfaz RPG flotante */}
      {f >= 246 && (
        <Layer>
          <g transform={`translate(540,${560 + uiBob}) scale(${ui.sx},${ui.sy}) rotate(${Math.sin(f * 0.05) * 1.2})`}>
            <path d={wobblyRect(-390, -210, 780, 420, 3 + (Math.floor(f / 3) % 3), 7)} fill="rgba(40,54,24,0.25)" transform="translate(14,18)" />
            <line x1={-420} y1={-212} x2={420} y2={-212} stroke={C.ink} strokeWidth={52} strokeLinecap="round" />
            <line x1={-420} y1={-212} x2={420} y2={-212} stroke={C.parch} strokeWidth={42} strokeLinecap="round" />
            <line x1={-420} y1={212} x2={420} y2={212} stroke={C.ink} strokeWidth={52} strokeLinecap="round" />
            <line x1={-420} y1={212} x2={420} y2={212} stroke={C.parch} strokeWidth={42} strokeLinecap="round" />
            <path d={wobblyRect(-390, -210, 780, 420, 3 + (Math.floor(f / 3) % 3), 7)} fill={C.paper} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
            <path d={wobblyRect(-362, -182, 724, 364, 5, 5)} fill="none" stroke={C.mud} strokeWidth={3} strokeDasharray="16 9" opacity={0.7} />
            <text x={0} y={-118} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={34} fill={C.ink} opacity={0.7}>— Ficha de personaje —</text>
            {lines.map((l, i) => {
              const n = Math.max(0, Math.floor((f - l.s) * 0.9));
              return (
                <g key={i}>
                  <text x={-320} y={l.y + 20} fontFamily={SERIF} fontStyle="italic" fontWeight={700} fontSize={62} fill={C.ink}>{l.t.slice(0, n)}</text>
                  {i < 2 && n >= l.t.length && (
                    <path d={`M-320,${l.y + 38} Q-200,${l.y + 26} -80,${l.y + 40} T160,${l.y + 36}`} stroke={C.red} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={400} strokeDashoffset={400 * (1 - prog(f, l.s + 14, l.s + 30))} />
                  )}
                </g>
              );
            })}
            <path d={starPath(20, 8, 4)} transform="translate(-355,-150)" fill={C.gold} stroke={C.ink} strokeWidth={3} />
            <path d={starPath(20, 8, 4)} transform="translate(355,150)" fill={C.gold} stroke={C.ink} strokeWidth={3} />
          </g>
        </Layer>
      )}

      {/* Claxon */}
      <Ink text="¡¡PIIIIIIIII!!" x={540} y={420} size={118} frame={f} color={C.red} halo={C.beam} rot={-6} seed={7}
        scale={f >= 104 && f < 150 ? honk.sy : 0} opacity={1 - prog(f, 138, 150)} />

      {/* Faros cegadores */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: C.beam, opacity: yellow, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#FFF8E1", opacity: white, pointerEvents: "none" }} />
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ESCENA 2 — LA INEFICIENCIA MEDIEVAL (frames 420–1080)
   ═══════════════════════════════════════════════════════════════════════════ */
export const Scene2MedievalInefficiency: React.FC<SceneProps> = ({ localFrame: f, fps }) => {
  const bs = Math.floor(f / 3) % 3;
  const pan = (1 - easeInOut(prog(f, 0, 60))) * 900;
  const o1 = pan * 0.15;
  const o2 = pan * 0.4;
  const o3 = pan * 0.75;
  const o4 = pan;

  // Goma de borrar
  const enterT = easeOut(prog(f, 190, 250));
  const exitT = easeIn(prog(f, 400, 452));
  const rubbing = f >= 250 && f < 400;
  const rub = rubbing ? Math.sin((f - 250) * 0.55) : 0;
  const plotX = 270 + o3;
  const hx = plotX + rub * 110;
  const hy = -800 + 2050 * enterT * (1 - exitT);
  const signOpacity = 1 - prog(f, 262, 392);
  const grass = prog(f, 350, 470);

  // Reacción del campesino
  const jump = Math.max(0, Math.sin(prog(f, 330, 362) * Math.PI)) * 46;
  const caption = f < 300 ? "Barbecho: 1/3 de la tierra DORMIDA" : "¡Borrón y cuenta nueva!";
  const capStart = f < 300 ? 120 : 306;
  const capN = Math.max(0, Math.floor((f - capStart) * 0.8));
  const capText = caption.slice(0, capN);

  const shavings = Array.from({ length: 16 }, (_, i) => {
    const s = 262 + i * 8;
    const x0 = plotX + (rand(i) - 0.5) * 260;
    const y0 = 1240 + rand(i + 5) * 80;
    const vx = (rand(i + 9) - 0.5) * 3;
    const gy = 1380 + rand(i + 2) * 90;
    const landT = Math.sqrt((2 * (gy - y0)) / 0.45);
    return { s, x0, y0, vx, gy, landT, i };
  });

  return (
    <>
      <PaperBase />
      {/* Capa 1 + 2: cielo y siluetas */}
      <Layer>
        <defs>
          <linearGradient id="s2-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F2E2B6" />
            <stop offset="1" stopColor={C.paper} />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#s2-sky)" />
        <path d={blob(790 + o1, 360, 120, 120, 3 + bs, 12, 0.04)} fill={C.gold} opacity={0.3} />
        <path d={blob(260 + o2, 1110, 560, 190, 14 + bs, 14, 0.08)} fill={C.forest} opacity={0.5} />
        <path d={blob(900 + o2, 1130, 520, 170, 15 + bs, 14, 0.08)} fill={C.forest} opacity={0.38} />
        {/* Capa 3: tierra */}
        <path d={blob(540 + o3, 1650, 1500, 700, 16 + bs, 20, 0.05)} fill={C.mud} />
        <path d={blob(540 + o3, 1560, 1300, 520, 17 + bs, 20, 0.06)} fill={C.parch} opacity={0.55} />
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M${-300 + o3},${1300 + i * 90} Q${540 + o3},${1270 + i * 90 + (i % 2) * 30} ${1500 + o3},${1300 + i * 90}`} stroke={C.ink} strokeWidth={3} fill="none" opacity={0.22} />
        ))}
        {/* Parcela vacía */}
        <path d={blob(plotX, 1345, 270, 125, 21 + bs, 14, 0.06)} fill="#c98f4a" stroke={C.ink} strokeWidth={4} opacity={0.95} />
        {[-150, -60, 40, 130].map((dx, i) => (
          <path key={i} d={`M${plotX + dx},1310 l14,22 l-12,16 l16,24`} stroke={C.ink} strokeWidth={3} fill="none" opacity={0.45} />
        ))}
        <path d={blob(plotX, 1345, 250, 112, 22 + bs, 14, 0.06)} fill={C.aura} opacity={0.75 * grass} />
        {/* Caritas durmiendo */}
        {[[-110, 1338], [10, 1372], [120, 1332]].map(([dx, dy], i) => {
          const fo = 1 - prog(f, 300, 350);
          const ph = ((f + i * 40) % 120) / 120;
          return (
            <g key={i} opacity={fo * prog(f, 70 + i * 10, 90 + i * 10)}>
              <circle cx={plotX + dx} cy={dy + Math.sin(f * 0.05 + i) * 3} r={36} fill={C.pale} stroke={C.ink} strokeWidth={4} />
              <path d={`M${plotX + dx - 18},${dy - 2} q8,8 16,0 M${plotX + dx + 4},${dy - 2} q8,8 16,0`} stroke={C.ink} strokeWidth={3.5} fill="none" strokeLinecap="round" />
              <path d={`M${plotX + dx - 8},${dy + 16} q8,6 16,0`} stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
              <text x={plotX + dx + 36 + ph * 22} y={dy - 36 - ph * 60} fontFamily={HAND} fontWeight={700} fontSize={34 + i * 4} fill={C.ink} opacity={1 - ph}>z</text>
            </g>
          );
        })}
      </Layer>

      <Sprite src={IMG.castle} frame={f} x={780 + o2} y={1090} w={520} h={470} opacity={1} filter="grayscale(0.4)" seed={2} />

      {/* Cartel "Fallow Land" */}
      <Sprite src={IMG.fallowSign} frame={f} x={plotX} y={1390} w={340} h={380} opacity={signOpacity}
        rot={rubbing ? rub * 1.6 : 0} sy={1 - 0.03 * Math.abs(rub)} seed={3} />

      {/* Trigo raquítico */}
      {[0, 1, 2].map((i) => (
        <Sprite key={i} src={IMG.wheat} frame={f} x={[900, 985, 830][i] + o4} y={[1500, 1545, 1560][i]} w={[150, 120, 110][i]} h={[210, 170, 160][i]}
          rot={[14, -10, 18][i] + Math.sin(f * 0.05 + i) * 2} filter="grayscale(0.55) brightness(0.95)" seed={4 + i} />
      ))}

      {/* Capa 4: campesino */}
      <Sprite src={IMG.peasant} frame={f} x={730 + o4} y={1600 - jump} w={520} h={800}
        rot={-2 + Math.sin(f * 0.04) * 1.2} sy={1 + 0.012 * Math.sin(f * 0.07) + (jump > 0 ? 0.06 : 0)} sx={jump > 0 ? 0.95 : 1} seed={8} />
      {[0, 1].map((k) => {
        const t = ((f + k * 45) % 90) / 90;
        return <Glow key={k} src={VFX.smoke} x={690 + o4 - t * 40} y={930 - t * 80} size={70 + t * 70} color={C.hoodie} opacity={0.5 * Math.sin(t * Math.PI) * (1 - prog(f, 300, 330))} rot={t * 40} />;
      })}

      <Layer>
        {/* Brotes de las virutas y césped renacido */}
        {shavings.map(({ s, x0, vx, gy, landT, i }) => {
          const sl = s + landT;
          return <Sprout key={i} x={x0 + vx * landT} y={gy} grow={pop(f, sl, fps)} frame={f} seed={i} scale={0.9} />;
        })}
        {Array.from({ length: 9 }, (_, k) => (
          <Sprout key={`g${k}`} x={plotX - 200 + k * 50} y={1390 + (k % 3) * 22} grow={pop(f, 380 + k * 6, fps)} frame={f} seed={k + 20} scale={1.3} c1={C.forest} c2={C.aura} />
        ))}
        {/* Virutas cayendo */}
        {shavings.map(({ s, x0, y0, vx, gy, i }) => {
          const t = f - s;
          if (t < 0) return null;
          const y = Math.min(gy, y0 + 0.5 * 0.45 * t * t);
          const onGround = y >= gy;
          return (
            <g key={`v${i}`} transform={`translate(${x0 + vx * t},${y}) rotate(${onGround ? 20 : t * 9})`} opacity={onGround ? Math.max(0, 1 - (t - 60) / 80) : 1}>
              <path d="M-12,0 Q-5,-14 7,-7 Q16,0 9,9" stroke={C.pink} strokeWidth={7} fill="none" strokeLinecap="round" />
              <path d="M-12,0 Q-5,-14 7,-7 Q16,0 9,9" stroke={C.ink} strokeWidth={2} fill="none" opacity={0.5} />
            </g>
          );
        })}
        {/* Mano gigante con goma de borrar */}
        {f >= 190 && f < 460 && (
          <g transform={`translate(${hx},${hy}) rotate(${-14 + rub * 5}) scale(1.5)`}>
            <path d="M-130,-1500 L130,-1500 L112,-330 L-112,-330Z" fill={C.hoodie} stroke={C.ink} strokeWidth={6} />
            <path d="M-128,-360 Q0,-300 128,-360 L122,-296 Q0,-246 -122,-296Z" fill={C.pale} stroke={C.ink} strokeWidth={5} />
            <path d="M-112,-300 Q-136,-150 -84,-84 L84,-84 Q136,-150 112,-300Z" fill={C.skin} stroke={C.ink} strokeWidth={6} />
            <path d="M-92,-90 L-66,-26 M-34,-84 L-22,-18 M22,-84 L30,-18 M74,-90 L58,-30" stroke={C.ink} strokeWidth={50} strokeLinecap="round" />
            <path d="M-92,-90 L-66,-26 M-34,-84 L-22,-18 M22,-84 L30,-18 M74,-90 L58,-30" stroke={C.skin} strokeWidth={40} strokeLinecap="round" />
            <path d="M-118,-190 Q-170,-120 -122,-40" stroke={C.ink} strokeWidth={50} strokeLinecap="round" fill="none" />
            <path d="M-118,-190 Q-170,-120 -122,-40" stroke={C.skin} strokeWidth={40} strokeLinecap="round" fill="none" />
            <path d="M-118,-30 Q-118,-60 -92,-60 L92,-60 Q118,-60 118,-30 L118,34 Q118,62 92,62 L-92,62 Q-118,62 -118,34Z" fill={C.pink} stroke={C.ink} strokeWidth={6} />
            <path d="M-118,-6 L118,-6 L118,28 L-118,28Z" fill={C.hoodie} opacity={0.85} />
            <path d="M-118,-6 L118,-6 M-118,28 L118,28" stroke={C.ink} strokeWidth={3} />
          </g>
        )}
      </Layer>

      {/* Capa 5: motas de polvo y rótulo */}
      {Array.from({ length: 9 }, (_, i) => (
        <Glow key={i} src={VFX.star} x={(rand(i) * W + f * (0.4 + rand(i + 3))) % W} y={500 + rand(i + 6) * 900 + Math.sin(f * 0.03 + i) * 20}
          size={18 + rand(i + 8) * 18} color={C.parch} opacity={0.5} rot={f * 0.5 + i * 40} />
      ))}
      <Ink text={capText} x={540} y={720} size={f < 300 ? 56 : 70} frame={f} serif={false} seed={11} rot={-2} opacity={prog(f, 120, 130) * (f > 300 && f < 306 ? 0 : 1)} />
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ESCENA 3 — EL SECRETO NORFOLK: 4 PARCELAS (frames 1080–2160)
   ═══════════════════════════════════════════════════════════════════════════ */
const BC = { x: 540, y: 930 };
const PLOT_START = [170, 330, 500, 670];
const PLOT_OFF: Pt[] = [[-215, -215], [215, -215], [215, 215], [-215, 215]];
const PLOT_COL = [C.gold, C.turnip, C.barley, C.clover];
const PLOT_NAME = ["Trigo", "Nabo", "Cebada", "Trébol"];
const WEEDS: Pt[] = [[-150, 40], [-110, -90], [140, 60], [120, -100], [-30, -140], [60, 150], [-140, 130]];

export const Scene3NorfolkFourFields: React.FC<SceneProps> = ({ localFrame: f, fps }) => {
  const bs = Math.floor(f / 3) % 3;
  const rotCfg = { damping: 14, stiffness: 70 };
  const rotSteps = [820, 900, 980].map((st) => pop(f, st, fps, rotCfg));
  const rotDeg = 90 * (rotSteps[0] + rotSteps[1] + rotSteps[2]);
  const rotRad = (rotDeg * Math.PI) / 180;
  const year = 1 + (f >= 820 ? 1 : 0) + (f >= 900 ? 1 : 0) + (f >= 980 ? 1 : 0);
  const arrowsOn = springSquash(f, 780, fps);

  const plotPos = (i: number): Pt => {
    const [dx, dy] = PLOT_OFF[i];
    return [BC.x + dx * Math.cos(rotRad) - dy * Math.sin(rotRad), BC.y + dx * Math.sin(rotRad) + dy * Math.cos(rotRad)];
  };
  const sq = PLOT_START.map((s) => springSquash(f, s, fps));

  // Pluma: trazado de la cruz dorada
  const vP = easeInOut(prog(f, 30, 85));
  const hP = easeInOut(prog(f, 95, 150));
  const penX = interpolate(f, [0, 30, 85, 95, 150, 185], [900, 540, 540, 110, 970, 1140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const penY = interpolate(f, [0, 30, 85, 95, 150, 185], [250, 500, 1360, 930, 930, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const penOp = 1 - prog(f, 170, 190);

  const [x0p, y0p] = plotPos(0);
  const [x1p, y1p] = plotPos(1);
  const [x2p, y2p] = plotPos(2);
  const [x3p, y3p] = plotPos(3);
  const P = [[x0p, y0p], [x1p, y1p], [x2p, y2p], [x3p, y3p]];

  return (
    <>
      <PaperBase color={C.parch} />
      {/* Capa 1: escritorio de madera y utensilios */}
      <Layer>
        <defs>
          <linearGradient id="s3-wood" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c58a45" />
            <stop offset="1" stopColor={C.mud} />
          </linearGradient>
          <linearGradient id="s3-parch" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={C.paper} />
            <stop offset="1" stopColor="#EBD9A4" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#s3-wood)" />
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d={`M-20,${60 + i * 125} Q270,${30 + i * 125 + (i % 3) * 16} 540,${70 + i * 125} T1100,${50 + i * 125}`} stroke={C.ink} strokeWidth={3} fill="none" opacity={0.14} />
        ))}
        <circle cx={170} cy={1620} r={78} fill={C.ink} stroke="#14200b" strokeWidth={6} />
        <ellipse cx={150} cy={1596} rx={26} ry={14} fill={C.paper} opacity={0.25} />
        <circle cx={170} cy={1620} r={42} fill="#0c1307" />
        <circle cx={930} cy={1640} r={64} fill="none" stroke={C.gold} strokeWidth={10} />
        <path d="M930,1640 L930,1590 M930,1640 L966,1660" stroke={C.gold} strokeWidth={8} strokeLinecap="round" />

        {/* Pergamino */}
        <path d={wobblyRect(120, 520, 860, 860, 40 + bs, 7)} fill="rgba(40,24,6,0.35)" transform="translate(16,22)" />
        <line x1={92} y1={514} x2={988} y2={514} stroke={C.ink} strokeWidth={70} strokeLinecap="round" />
        <line x1={92} y1={514} x2={988} y2={514} stroke={C.parch} strokeWidth={58} strokeLinecap="round" />
        <line x1={92} y1={1386} x2={988} y2={1386} stroke={C.ink} strokeWidth={70} strokeLinecap="round" />
        <line x1={92} y1={1386} x2={988} y2={1386} stroke={C.parch} strokeWidth={58} strokeLinecap="round" />
        <path d={wobblyRect(120, 520, 860, 860, 40 + bs, 7)} fill="url(#s3-parch)" stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />

        {/* Lavados de acuarela + surcos por parcela (siguen la rotación) */}
        {P.map(([px, py], i) => {
          const g = sq[i].g;
          return (
            <g key={i} opacity={clamp01(g)}>
              <path d={blob(px, py, 188, 188, i * 7 + bs, 16, 0.07)} fill={PLOT_COL[i]} opacity={0.24} />
              <path d={blob(px, py + 20, 160, 150, i * 7 + 2 + bs, 16, 0.08)} fill={C.mud} opacity={0.22} />
              {[0, 1, 2, 3].map((k) => (
                <path key={k} d={`M${px - 150},${py + 40 + k * 34} Q${px},${py + 18 + k * 34} ${px + 150},${py + 40 + k * 34}`} stroke={C.ink} strokeWidth={3} fill="none" opacity={0.22} />
              ))}
            </g>
          );
        })}

        {/* Maleza que el nabo se come */}
        {WEEDS.map(([dx, dy], k) => {
          const st = PLOT_START[1] + 40 + k * 10;
          const eat = prog(f, st, st + 36);
          const appear = clamp01(sq[1].g);
          const wx = lerp(x1p + dx, x1p, easeIn(eat) * 0.7);
          const wy = lerp(y1p + dy, y1p + 60, easeIn(eat) * 0.7);
          const sc = (1 - eat) * appear;
          if (sc <= 0.01) return null;
          const d = "M-14,0 Q-18,-30 -26,-50 M0,0 Q0,-40 4,-62 M14,0 Q20,-28 30,-46";
          return (
            <g key={k} transform={`translate(${wx},${wy}) scale(${sc})`}>
              <path d={d} stroke={C.ink} strokeWidth={11} fill="none" strokeLinecap="round" />
              <path d={d} stroke={C.forest} strokeWidth={6} fill="none" strokeLinecap="round" />
            </g>
          );
        })}

        {/* Cruz dorada trazada por la pluma */}
        <path d={`M540,520 L540,1380`} stroke={C.ink} strokeWidth={24} strokeLinecap="round" pathLength={1000} strokeDasharray={1000} strokeDashoffset={1000 * (1 - vP)} fill="none" />
        <path d={`M120,930 L980,930`} stroke={C.ink} strokeWidth={24} strokeLinecap="round" pathLength={1000} strokeDasharray={1000} strokeDashoffset={1000 * (1 - hP)} fill="none" />
        <path d={`M540,520 L540,1380`} stroke={C.gold} strokeWidth={14} strokeLinecap="round" pathLength={1000} strokeDasharray={1000} strokeDashoffset={1000 * (1 - vP)} fill="none" />
        <path d={`M120,930 L980,930`} stroke={C.gold} strokeWidth={14} strokeLinecap="round" pathLength={1000} strokeDasharray={1000} strokeDashoffset={1000 * (1 - hP)} fill="none" />
      </Layer>

      {/* Capa 4: cultivos que brotan con spring */}
      <Sprite src={IMG.wheat} frame={f} x={x0p - 105} y={y0p + 132} w={150} h={210} sx={sq[0].sx} sy={sq[0].sy} seed={1} />
      <Sprite src={IMG.wheat} frame={f} x={x0p + 105} y={y0p + 132} w={150} h={210} sx={sq[0].sx} sy={sq[0].sy} seed={2} />
      <Sprite src={IMG.wheat} frame={f} x={x0p} y={y0p + 122} w={250} h={330} sx={sq[0].sx} sy={sq[0].sy} seed={3} />
      <Sprite src={IMG.turnip} frame={f} x={x1p} y={y1p + 112} w={270} h={300}
        sx={sq[1].sx * (1 + 0.04 * Math.max(0, Math.sin((f - 370) * 0.5)) * (1 - prog(f, 470, 480)))}
        sy={sq[1].sy * (1 - 0.04 * Math.max(0, Math.sin((f - 370) * 0.5)) * (1 - prog(f, 470, 480)))} seed={4} />
      <Sprite src={IMG.barley} frame={f} x={x2p - 58} y={y2p + 122} w={230} h={320} sx={sq[2].sx} sy={sq[2].sy} seed={5} />
      <Sprite src={IMG.clover} frame={f} x={x3p} y={y3p + 112} w={280} h={260} sx={sq[3].sx} sy={sq[3].sy} seed={6} />

      <Layer>
        {/* Monedas de oro flotando sobre el trigo */}
        {[0, 1, 2, 3, 4].map((k) => {
          const ph = (f - PLOT_START[0] - 30 - k * 22) / 110;
          if (ph < 0) return null;
          const p = ph % 1;
          return <Coin key={k} x={x0p + (k - 2) * 48 + Math.sin(p * 6) * 14} y={y0p + 40 - p * 270} r={26} spin={f * 0.2 + k} opacity={Math.sin(p * Math.PI)} />;
        })}
        {/* Jarra espumosa de cebada */}
        {(() => {
          const g = pop(f, PLOT_START[2] + 25, fps);
          if (g < 0.02) return null;
          return (
            <g transform={`translate(${x2p + 108},${y2p + 120}) scale(${g},${g}) rotate(${Math.sin(f * 0.1) * 3})`}>
              <path d="M36,-60 Q86,-60 76,-26 Q68,-4 38,-14" stroke={C.ink} strokeWidth={16} fill="none" strokeLinecap="round" />
              <path d="M36,-60 Q86,-60 76,-26 Q68,-4 38,-14" stroke={C.barley} strokeWidth={8} fill="none" strokeLinecap="round" />
              <path d="M-38,-78 L-44,0 Q-44,12 -32,12 L32,12 Q44,12 44,0 L38,-78Z" fill={C.barley} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
              <path d="M-24,-60 L-28,-6" stroke="#FFD27A" strokeWidth={8} strokeLinecap="round" opacity={0.8} />
              {[[-26, -92, 24], [0, -104, 28], [26, -92, 24], [-10, -122, 18], [16, -118, 20]].map(([bx, by, br], k) => (
                <circle key={k} cx={bx} cy={by - Math.abs(Math.sin(f * 0.12 + k)) * 8} r={br} fill="#FFF3C4" stroke={C.ink} strokeWidth={4} />
              ))}
              {[0, 1, 2].map((k) => {
                const p = ((f * 0.02 + k / 3) % 1);
                return <circle key={k} cx={-18 + k * 18} cy={-10 - p * 60} r={4} fill="#FFD27A" opacity={1 - p} />;
              })}
            </g>
          );
        })()}
        {/* Raíces luminosas del trébol */}
        {sq[3].g > 0.05 && (
          <g opacity={clamp01(sq[3].g)}>
            {[[-70, 70], [-25, 85], [30, 80], [75, 66]].map(([dx, dy], k) => (
              <path key={k} d={`M${x3p},${y3p + 118} Q${x3p + dx * 0.5},${y3p + 118 + dy * 0.4} ${x3p + dx},${y3p + 118 + dy}`}
                stroke={C.aura} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray="10 8" strokeDashoffset={-f * 1.4} opacity={0.6 + 0.4 * Math.sin(f * 0.1 + k)} />
            ))}
          </g>
        )}
        {/* Mecanismo de relojería: flechas y engranaje central */}
        <g transform={`translate(${BC.x},${BC.y})`} opacity={clamp01(arrowsOn.g)}>
          {[0, 1, 2, 3].map((k) => {
            const a0 = 8 + k * 90 + rotDeg;
            const rad = 372;
            const p0: Pt = [Math.cos((a0 * Math.PI) / 180) * rad, Math.sin((a0 * Math.PI) / 180) * rad];
            const p1: Pt = [Math.cos(((a0 + 60) * Math.PI) / 180) * rad, Math.sin(((a0 + 60) * Math.PI) / 180) * rad];
            const ea = ((a0 + 60) * Math.PI) / 180;
            const head = `${(Math.cos(ea + 0.22) * (rad + 22)).toFixed(1)},${(Math.sin(ea + 0.22) * (rad + 22)).toFixed(1)} ${(Math.cos(ea + 0.22) * (rad - 22)).toFixed(1)},${(Math.sin(ea + 0.22) * (rad - 22)).toFixed(1)} ${(Math.cos(ea + 0.46) * rad).toFixed(1)},${(Math.sin(ea + 0.46) * rad).toFixed(1)}`;
            const d = `M${p0[0]},${p0[1]} A${rad},${rad} 0 0 1 ${p1[0]},${p1[1]}`;
            return (
              <g key={k}>
                <path d={d} stroke={C.ink} strokeWidth={24} fill="none" strokeLinecap="round" />
                <path d={d} stroke={C.gold} strokeWidth={13} fill="none" strokeLinecap="round" />
                <polygon points={head} fill={C.gold} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
              </g>
            );
          })}
          <g transform={`rotate(${rotDeg * 2})`}>
            <path d={gearPath(64, 12, 16)} fill={C.gold} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
            <circle r={22} fill={C.paper} stroke={C.ink} strokeWidth={5} />
          </g>
        </g>
        {/* Etiquetas de cada parcela */}
        {P.map(([px, py], i) => (
          <g key={i} opacity={clamp01(sq[i].g)}>
            <text x={px} y={py + 176} textAnchor="middle" fontFamily={HAND} fontWeight={700} fontSize={40} fill={C.ink}>{PLOT_NAME[i]}</text>
            <path d={`M${px - 54},${py + 186} Q${px},${py + 178} ${px + 54},${py + 187}`} stroke={PLOT_COL[i]} strokeWidth={7} fill="none" strokeLinecap="round" />
          </g>
        ))}
      </Layer>

      {/* Orbes de bio-fertilizante brotando de las raíces del trébol */}
      {sq[3].g > 0.3 &&
        Array.from({ length: 6 }, (_, k) => {
          const p = ((f - PLOT_START[3] + k * 22) % 120) / 120;
          return (
            <Glow key={k} src={VFX.light} x={x3p + Math.sin(k * 2.1) * (40 + p * 110)} y={y3p + 170 - p * 230}
              size={50 + 70 * Math.sin(p * Math.PI)} color={C.aura} opacity={0.9 * Math.sin(p * Math.PI)} />
          );
        })}

      {/* Pluma */}
      {penOp > 0 && (
        <Layer style={{ opacity: penOp }}>
          <g transform={`translate(${penX},${penY}) rotate(24)`}>
            <path d="M0,0 L-7,-34 L7,-34Z" fill={C.ink} />
            <path d="M-6,-30 Q-52,-176 34,-340 Q76,-190 10,-48Z" fill={C.paper} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
            <path d="M0,-34 Q6,-170 30,-330" stroke={C.ink} strokeWidth={4} fill="none" />
            {[-80, -130, -180, -230, -280].map((yy, k) => (
              <path key={k} d={`M${4 + k * 4},${yy} l-${26 - k * 2},-12 M${4 + k * 4},${yy} l${24 - k * 2},-10`} stroke={C.ink} strokeWidth={2.5} fill="none" opacity={0.6} />
            ))}
          </g>
        </Layer>
      )}

      {/* Capa 5: centellas doradas */}
      {f > 200 &&
        Array.from({ length: 12 }, (_, i) => (
          <Glow key={i} src={VFX.star} x={80 + rand(i) * 920} y={(560 + rand(i + 4) * 800 - (f - 200) * (0.3 + rand(i + 9) * 0.4) + 3000) % 1000 + 460}
            size={26 + rand(i + 7) * 30} color={C.gold} opacity={0.45 + 0.4 * Math.sin(f * 0.1 + i)} rot={f * 0.7 + i * 30} />
        ))}

      {/* Títulos */}
      <Ink text="SISTEMA NORFOLK" x={540} y={300} size={92} frame={f} serif halo={C.ink} color={C.paper} seed={1}
        scale={Math.max(0.001, pop(f, 6, fps))} />
      <Ink text="4 parcelas · 1 rotación · cero barbecho" x={540} y={392} size={42} frame={f} halo={C.ink} color={C.paper} seed={2}
        opacity={prog(f, 26, 40)} />
      <Ink text={`Año ${year}`} x={540} y={1530} size={84} frame={f} serif halo={C.ink} color={C.paper} seed={3}
        scale={Math.max(0.001, pop(f, f >= 980 ? 980 : f >= 900 ? 900 : f >= 820 ? 820 : 760, fps))} opacity={prog(f, 760, 770)} />
      <Ink text="Trigo → Nabo → Cebada → Trébol" x={540} y={1620} size={44} frame={f} halo={C.ink} color={C.gold} seed={4}
        opacity={prog(f, 790, 810)} />
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ESCENA 4 — EL COMBO GANADERO & INVIERNO (frames 2160–3000)
   ═══════════════════════════════════════════════════════════════════════════ */
export const Scene4LivestockWinterBoom: React.FC<SceneProps> = ({ localFrame: f, fps }) => {
  const bs = Math.floor(f / 3) % 3;
  const winter = prog(f, 380, 470);
  const skyTop = interpolateColors(f, [380, 470], ["#9BD3E0", C.hoodie]);
  const skyBot = interpolateColors(f, [380, 470], [C.paper, C.pale]);
  const gnd = interpolateColors(f, [380, 470], [C.forest, "#DCE6EA"]);
  const gnd2 = interpolateColors(f, [380, 470], [C.clover, C.pale]);

  // Cultivos y ganado
  const cowEat = prog(f, 110, 300);
  const sheepEat = prog(f, 150, 300);
  const cowX0 = interpolate(f, [0, 100], [-340, 215], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cowX = f < 430 ? cowX0 : lerp(215, 800, easeInOut(prog(f, 430, 490)));
  const sheepX0 = interpolate(f, [20, 140], [1420, 480], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sheepX = f < 430 ? sheepX0 : lerp(480, 790, easeInOut(prog(f, 430, 490)));
  const cowRunning = f < 100 || f >= 430;
  const sheepRunning = f < 140 || f >= 430;
  const bounce = (k: number) => Math.abs(Math.sin(f * 0.42 + k));
  const chew = f >= 105 && f < 310 ? Math.sin(f * 0.9) : 0;
  const happy = f >= 310 && f < 430 ? Math.abs(Math.sin((f - 310) * 0.12)) : 0;
  const fadeAnimals = 1 - prog(f, 470, 500);
  const animalScale = 1 - 0.3 * prog(f, 430, 490);

  const cowGrow = 1 + 0.3 * easeOut(cowEat);
  const sheepGrow = 1 + 0.3 * easeOut(sheepEat);

  // Nobles
  const nobX = f < 440 ? -420 : f < 540 ? lerp(-420, 250, easeOut(prog(f, 440, 540))) : 250;
  const walking = f >= 440 && f < 540;
  const shiver = f >= 540 ? Math.sin(f * 2.3) * 3.5 : 0;

  // Estudiante pícaro en el granero
  const smug = springSquash(f, 520, fps);

  // Moneda gigante
  const cT = prog(f, 700, 840);
  const cs = 0.25 + 7.5 * easeIn(cT);

  return (
    <>
      <PaperBase />
      <Layer>
        <defs>
          <linearGradient id="s4-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="1" stopColor={skyBot} />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#s4-sky)" />
        <path d={blob(840, 330, 120, 120, 5 + bs, 12, 0.04)} fill={C.gold} opacity={0.4 * (1 - winter)} />
        <path d={blob(220, 1130, 560, 200, 30 + bs, 14, 0.08)} fill={gnd} opacity={0.65} />
        <path d={blob(900, 1150, 520, 180, 31 + bs, 14, 0.08)} fill={gnd} opacity={0.5} />
        <path d={blob(540, 1700, 1200, 620, 32 + bs, 20, 0.05)} fill={gnd} />
        <path d={blob(540, 1640, 1000, 480, 33 + bs, 20, 0.06)} fill={gnd2} opacity={0.65} />
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M-40,${1440 + i * 85} Q540,${1410 + i * 85 + (i % 2) * 24} 1120,${1440 + i * 85}`} stroke={C.ink} strokeWidth={3} fill="none" opacity={0.2 * (1 - winter * 0.7)} />
        ))}
        {/* nieve acumulada */}
        <path d={blob(300, 1560, 440, 120, 40 + bs, 12, 0.1)} fill="#FFFFFF" opacity={winter * 0.9} />
        <path d={blob(880, 1700, 460, 140, 41 + bs, 12, 0.1)} fill="#FFFFFF" opacity={winter * 0.9} />
      </Layer>

      {/* Castillo congelado (capa 2) */}
      <Sprite src={IMG.castle} frame={f} x={300} y={1150} w={640} h={600} opacity={1}
        filter={`hue-rotate(${-20 * winter}deg) saturate(${1 - 0.4 * winter}) brightness(${1 + 0.1 * winter})`} seed={2} />

      {/* Granero del protagonista */}
      <Layer>
        <g transform="translate(800,1400)">
          <path d="M-210,0 L-210,-170 L-120,-290 L120,-290 L210,-170 L210,0Z" fill={C.mud} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M${-168 + i * 42},-8 L${-168 + i * 42},-176`} stroke={C.ink} strokeWidth={3} opacity={0.3} />
          ))}
          <path d="M-232,-165 L-126,-312 L126,-312 L232,-165" stroke={C.ink} strokeWidth={30} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M-232,-165 L-126,-312 L126,-312 L232,-165" stroke={C.forest} strokeWidth={20} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M-236,-170 L-130,-316 L130,-316 L236,-170 Q150,-300 0,-300 Q-150,-300 -236,-170Z" fill="#FFFFFF" stroke={C.ink} strokeWidth={4} opacity={winter} />
          <path d="M-78,0 L-78,-150 L78,-150 L78,0Z" fill="#1b2410" stroke={C.ink} strokeWidth={6} />
          <path d="M-78,0 L0,-150 M78,0 L0,-150 M-78,-150 L0,0 M78,-150 L0,0" stroke={C.parch} strokeWidth={4} opacity={0.55} />
          <text x={0} y={-215} textAnchor="middle" fontFamily={HAND} fontWeight={700} fontSize={44} fill={C.paper} stroke={C.ink} strokeWidth={9} paintOrder="stroke">GRANERO</text>
        </g>
      </Layer>

      {/* Cultivos (capa 3) que el ganado devora */}
      {[0, 1].map((i) => (
        <Sprite key={`t${i}`} src={IMG.turnip} frame={f} x={[130, 260][i]} y={1420} w={150} h={170}
          sx={Math.max(0.12, 1 - 0.88 * cowEat) * pop(f, 5 + i * 8, fps)} sy={Math.max(0.12, 1 - 0.88 * cowEat) * pop(f, 5 + i * 8, fps)} opacity={1 - prog(f, 300, 320)} seed={10 + i} />
      ))}
      {[0, 1].map((i) => (
        <Sprite key={`c${i}`} src={IMG.clover} frame={f} x={[390, 510][i]} y={1420} w={160} h={150}
          sx={Math.max(0.12, 1 - 0.88 * sheepEat) * pop(f, 12 + i * 8, fps)} sy={Math.max(0.12, 1 - 0.88 * sheepEat) * pop(f, 12 + i * 8, fps)} opacity={1 - prog(f, 300, 320)} seed={14 + i} />
      ))}

      {/* Capa 4: ganado feliz */}
      <Sprite src={IMG.cow} frame={f} x={cowX} y={1500 - (cowRunning ? bounce(0) * 34 : happy * 40)} w={400} h={360}
        flip={COW_FACES_RIGHT} rot={chew * 2.5} opacity={fadeAnimals}
        sx={(cowRunning ? 1.08 - 0.14 * bounce(0) : 1 + 0.02 * chew) * cowGrow * animalScale}
        sy={(cowRunning ? 0.92 + 0.16 * bounce(0) : 1 - 0.02 * chew) * cowGrow * animalScale} seed={20} />
      <Sprite src={IMG.sheep} frame={f} x={sheepX} y={1490 - (sheepRunning ? bounce(1.5) * 34 : happy * 44) - Math.sin(f * 0.05) * 6} w={340} h={320}
        flip={!SHEEP_FACES_RIGHT} rot={-chew * 2.5} opacity={fadeAnimals}
        sx={(sheepRunning ? 1.08 - 0.14 * bounce(1.5) : 1 - 0.02 * chew) * sheepGrow * animalScale}
        sy={(sheepRunning ? 0.92 + 0.16 * bounce(1.5) : 1 + 0.02 * chew) * sheepGrow * animalScale} seed={21} />

      {/* Estudiante pícaro vendiendo comida */}
      {f >= 520 && (
        <Sprite src={IMG.studentSmug} frame={f} x={800} y={1400} w={230} h={340} sx={smug.sx} sy={smug.sy} rot={Math.sin(f * 0.05) * 1.5} seed={22} />
      )}

      {/* Nobles tiritando */}
      <Sprite src={IMG.nobles} frame={f} x={nobX + shiver} y={1690 - (walking ? bounce(0.8) * 22 : 0)} w={640} h={560}
        rot={f >= 540 ? Math.sin(f * 2.9) * 1.3 : 0} sy={walking ? 0.96 + 0.06 * bounce(0.8) : 1} seed={23} />
      {f >= 560 &&
        [0, 1, 2].map((k) => {
          const p = ((f + k * 30) % 90) / 90;
          return <Glow key={k} src={VFX.smoke} x={nobX - 150 + k * 150} y={1250 - p * 80} size={46 + p * 50} color="#C9D6DF" opacity={0.7 * Math.sin(p * Math.PI) * winter} rot={p * 60} />;
        })}

      <Layer>
        {/* Monedas de los nobles volando al granero */}
        {Array.from({ length: 6 }, (_, k) => {
          const s = 570 + k * 18;
          const t = prog(f, s, s + 50);
          if (t <= 0 || t >= 1) return null;
          const x = lerp(400, 790, t);
          const y = lerp(1420, 1300, t) - Math.sin(t * Math.PI) * 220;
          return <Coin key={k} x={x} y={y} r={30} spin={f * 0.35 + k} />;
        })}
        {/* Abono mágico: brotes donde cae cada destello */}
        {Array.from({ length: 18 }, (_, i) => {
          const s = 150 + i * 14;
          const x = (i % 2 === 0 ? 120 : 560) + rand(i) * 70;
          const landT = Math.sqrt(2 * (1560 - 1380) / 0.5);
          return <Sprout key={i} x={x} y={1560 + (i % 3) * 6} grow={pop(f, s + landT, fps) * (1 - winter)} frame={f} seed={i + 40} scale={0.7} c1={C.clover} c2={C.aura} />;
        })}
      </Layer>

      {/* Destellos dorados cayendo como abono */}
      {Array.from({ length: 18 }, (_, i) => {
        const s = 150 + i * 14;
        const t = f - s;
        if (t < 0 || t > 160) return null;
        const x = (i % 2 === 0 ? 120 : 560) + rand(i) * 70;
        const y = Math.min(1560, 1380 + 0.25 * t * t);
        const onG = y >= 1560;
        return <Glow key={i} src={VFX.star} x={x + Math.sin(t * 0.1) * 8} y={y} size={onG ? 44 : 58} color={C.gold}
          opacity={onG ? Math.max(0, 1 - (t - 27) / 50) : 1} rot={t * 6} />;
      })}

      {/* Monedas al llegar */}
      {Array.from({ length: 6 }, (_, k) => {
        const s = 570 + k * 18 + 50;
        const t = f - s;
        if (t < 0 || t > 24) return null;
        return <Glow key={k} src={VFX.star} x={790} y={1300} size={90 * (1 - t / 24) + 20} color={C.gold} opacity={1 - t / 24} rot={t * 12} />;
      })}

      {/* Nieve cayendo */}
      {Array.from({ length: 70 }, (_, i) => {
        const sp = 4 + rand(i + 1) * 6;
        const y = (rand(i + 50) * H + f * sp) % H;
        const x = (rand(i) * W + Math.sin(f * 0.03 + i) * 40 + W) % W;
        const r = 4 + rand(i + 20) * 9;
        return (
          <svg key={i} style={{ position: "absolute", left: x - r - 2, top: y - r - 2, overflow: "visible", opacity: winter }} width={2 * r + 4} height={2 * r + 4}>
            <circle cx={r + 2} cy={r + 2} r={r} fill="#FFFFFF" stroke={C.hoodie} strokeWidth={1.6} />
          </svg>
        );
      })}

      {/* Rótulos */}
      <Ink text="¡Ñam ñam! Abono gratis" x={540} y={380} size={62} frame={f} seed={5} rot={-3} opacity={prog(f, 130, 145) * (1 - prog(f, 330, 345))} />
      <Ink text="Invierno: todos tienen hambre..." x={540} y={420} size={60} frame={f} seed={6} rot={2} color={C.ink}
        opacity={prog(f, 470, 490) * (1 - prog(f, 680, 700))} />
      <Ink text="Menos mal que el granero está lleno" x={540} y={500} size={44} frame={f} seed={7} rot={-1}
        opacity={prog(f, 560, 580) * (1 - prog(f, 680, 700))} />

      {/* Moneda dorada gigante hacia la cámara */}
      {f >= 700 && (
        <>
          <Glow src={VFX.star} x={540} y={960} size={900 * (0.4 + cT)} color={C.gold} opacity={0.5 * prog(f, 710, 740)} rot={f * 2} />
          <Layer>
            <g transform={`translate(540,960) scale(${cs})`}>
              <Coin x={0} y={0} r={150} spin={(f - 700) * 0.28} />
            </g>
            <rect width={W} height={H} fill={C.gold} opacity={prog(f, 815, 840)} />
          </Layer>
        </>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ESCENA 5 — CONCLUSIÓN Y LOOP INFINITO (frames 3000–3600)
   ═══════════════════════════════════════════════════════════════════════════ */
export const Scene5TycoonLoop: React.FC<SceneProps & { blink: number }> = ({ localFrame: f, fps, blink }) => {
  const bs = Math.floor(f / 3) % 3;
  const hero = springSquash(f, 8, fps);
  const swap = pop(f, 200, fps);
  const slurp = f >= 200;
  const dragonIn = pop(f, 70, fps);
  const dragonX = lerp(1400, 860, Math.min(1, dragonIn));
  const leafRot = Math.sin(f * 0.18) * 26;
  const watchT = springSquash(f, 340, fps);
  const rollT = prog(f, 480, 598);
  const R = 1250 * Math.pow(1 - rollT, 1.6);
  const rotWipe = easeIn(rollT) * 900;
  const minuteA = f < 470 ? (f - 340) * 14 : 0;
  const speedLines = f >= 340 && f < 480;

  const sackBack: Pt[] = [[330, 1240], [750, 1240], [190, 1400], [880, 1400]];
  const sackFront: Pt[] = [[170, 1690], [420, 1720], [700, 1720], [920, 1690]];

  const content = (
    <>
      <PaperBase color={C.paper} />
      <Layer>
        <defs>
          <linearGradient id="s5-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFE08A" />
            <stop offset="1" stopColor={C.paper} />
          </linearGradient>
          <linearGradient id="s5-view" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF1C2" />
            <stop offset="1" stopColor={C.aura} />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#s5-wall)" />
        {/* Capa 2: ventanal con campos de trigo */}
        <path d="M240,1180 L240,600 Q540,230 840,600 L840,1180Z" fill="url(#s5-view)" stroke={C.ink} strokeWidth={8} />
        <path d={blob(540, 640, 70, 70, 3 + bs, 12, 0.04)} fill={C.gold} opacity={0.9} />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M240,${900 + i * 70} Q540,${860 + i * 70 + (i % 2) * 20} 840,${900 + i * 70}`} stroke={i % 2 ? C.gold : C.parch} strokeWidth={34} fill="none" opacity={0.7} />
        ))}
        <path d="M540,330 L540,1180 M240,820 L840,820" stroke={C.ink} strokeWidth={6} opacity={0.6} />
        {/* Cortinas de terciopelo */}
        <path d="M0,0 L310,0 Q230,500 280,980 Q120,1100 0,1180Z" fill={C.velvet} stroke={C.ink} strokeWidth={6} />
        <path d={`M${W},0 L${W - 310},0 Q${W - 230},500 ${W - 280},980 Q${W - 120},1100 ${W},1180Z`} fill={C.velvet} stroke={C.ink} strokeWidth={6} />
        {[70, 140, 210].map((x, i) => (
          <React.Fragment key={i}>
            <path d={`M${x},0 Q${x - 20 + Math.sin(f * 0.04 + i) * 4},560 ${x + 20},1100`} stroke="#6d1121" strokeWidth={8} fill="none" opacity={0.7} />
            <path d={`M${W - x},0 Q${W - x + 20 - Math.sin(f * 0.04 + i) * 4},560 ${W - x - 20},1100`} stroke="#6d1121" strokeWidth={8} fill="none" opacity={0.7} />
          </React.Fragment>
        ))}
        <path d="M270,990 Q250,1040 270,1090 M810,990 Q830,1040 810,1090" stroke={C.gold} strokeWidth={10} fill="none" strokeLinecap="round" />
        <circle cx={270} cy={1100} r={26} fill={C.gold} stroke={C.ink} strokeWidth={5} />
        <circle cx={810} cy={1100} r={26} fill={C.gold} stroke={C.ink} strokeWidth={5} />
        {/* Suelo */}
        <path d={blob(540, 1820, 1000, 380, 50 + bs, 18, 0.05)} fill="#7a1424" stroke={C.ink} strokeWidth={5} />
        <path d={blob(540, 1830, 900, 320, 51 + bs, 18, 0.05)} fill="none" stroke={C.gold} strokeWidth={8} strokeDasharray="22 14" />
        {/* Sacos de trigo: respaldo del trono */}
        {sackBack.map(([x, y], i) => {
          const s = springSquash(f, 2 + i * 5, fps);
          return <Sack key={i} x={x} y={y} s={0.95} sx={s.sx} sy={s.sy} rot={[-6, 6, -4, 5][i]} />;
        })}
      </Layer>

      {/* Capa 4: magnate y mini-dragón */}
      <Sprite
        src={slurp ? IMG.studentSlurping : IMG.studentTycoon} frame={f} x={540} y={1440} w={620} h={900}
        sx={hero.sx * (slurp ? 1 + 0.08 * (1 - swap) : 1)} sy={hero.sy * (slurp ? 1 - 0.08 * (1 - swap) : 1) * (1 - blink * 0.01)}
        rot={f >= 340 ? -3 * Math.min(1, watchT.g) : Math.sin(f * 0.04) * 0.8} seed={30}
      />
      <Sprite src={IMG.dragon} frame={f} x={dragonX} y={1360 + Math.sin(f * 0.1) * 16} w={340} h={380}
        rot={Math.sin(f * 0.1) * 3} sy={1 + 0.03 * Math.sin(f * 0.2)} sx={1 - 0.03 * Math.sin(f * 0.2)} seed={31} />
      <Layer>
        {/* Hoja de palma gigante */}
        {dragonIn > 0.6 && (
          <g transform={`translate(${dragonX - 110},1180) rotate(${-30 + leafRot})`}>
            <path d="M0,0 L0,-300" stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
            <path d="M0,0 L0,-300" stroke={C.forest} strokeWidth={7} strokeLinecap="round" />
            {Array.from({ length: 7 }, (_, k) => {
              const y = -70 - k * 32;
              const len = 120 - k * 8;
              return (
                <g key={k}>
                  <path d={`M0,${y} Q${-len * 0.6},${y - 40} ${-len},${y - 10}`} stroke={C.ink} strokeWidth={22} fill="none" strokeLinecap="round" />
                  <path d={`M0,${y} Q${len * 0.6},${y - 40} ${len},${y - 10}`} stroke={C.ink} strokeWidth={22} fill="none" strokeLinecap="round" />
                  <path d={`M0,${y} Q${-len * 0.6},${y - 40} ${-len},${y - 10}`} stroke={C.clover} strokeWidth={14} fill="none" strokeLinecap="round" />
                  <path d={`M0,${y} Q${len * 0.6},${y - 40} ${len},${y - 10}`} stroke={C.clover} strokeWidth={14} fill="none" strokeLinecap="round" />
                </g>
              );
            })}
          </g>
        )}
        {/* Aire del abanico */}
        {dragonIn > 0.8 && [0, 1, 2].map((k) => {
          const p = ((f * 0.03 + k / 3) % 1);
          return <path key={k} d={`M${dragonX - 200 - p * 160},${1100 + k * 40} q-40,-16 -80,0`} stroke={C.hoodie} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.7 * Math.sin(p * Math.PI)} />;
        })}
        {/* Sacos del primer plano */}
        {sackFront.map(([x, y], i) => {
          const s = springSquash(f, 10 + i * 6, fps);
          return <Sack key={i} x={x} y={y} s={1.05} sx={s.sx} sy={s.sy} rot={[5, -4, 3, -6][i]} color={i % 2 ? C.parch : "#E9B872"} />;
        })}
      </Layer>
      {[0, 1].map((i) => (
        <Sprite key={i} src={IMG.wheat} frame={f} x={[170, 920][i]} y={[1560, 1560][i]} w={130} h={200} rot={[-10, 12][i] + Math.sin(f * 0.06 + i) * 3} seed={32 + i} />
      ))}

      {/* Capa 5: destellos dorados */}
      {Array.from({ length: 10 }, (_, i) => (
        <Glow key={i} src={VFX.star} x={80 + rand(i) * 920} y={300 + rand(i + 5) * 1200 + Math.sin(f * 0.04 + i) * 24}
          size={24 + rand(i + 7) * 32} color={C.gold} opacity={0.4 + 0.4 * Math.sin(f * 0.1 + i * 2)} rot={f * 0.8 + i * 30} />
      ))}
      <Ink text="¡SLUUURP!" x={780} y={790} size={78} frame={f} color={C.barley} rot={5} seed={4}
        scale={f >= 204 && f < 270 ? springSquash(f, 204, fps).sy : 0} opacity={1 - prog(f, 255, 270)} />

      {/* Primer plano del reloj de pulsera */}
      {f >= 340 && (
        <>
          <div style={{ position: "absolute", inset: 0, backgroundColor: C.ink, opacity: 0.5 * clamp01(watchT.g) * (1 - prog(f, 470, 490)) }} />
          <Layer>
            {speedLines &&
              Array.from({ length: 24 }, (_, k) => {
                const a = (k / 24) * TWO_PI + f * 0.01;
                return <path key={k} d={`M${540 + Math.cos(a) * 360},${960 + Math.sin(a) * 360} L${540 + Math.cos(a) * 920},${960 + Math.sin(a) * 920}`} stroke={C.paper} strokeWidth={5} opacity={0.35} />;
              })}
            <g transform={`translate(540,960) scale(${watchT.sx},${watchT.sy})`}>
              <path d="M-90,-200 L-70,-520 L70,-520 L90,-200Z M-90,200 L-70,520 L70,520 L90,200Z" fill={C.velvet} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
              <circle r={238} fill={C.gold} stroke={C.ink} strokeWidth={10} />
              <circle r={204} fill={C.paper} stroke={C.ink} strokeWidth={7} />
              {Array.from({ length: 12 }, (_, k) => {
                const a = (k / 12) * TWO_PI - Math.PI / 2;
                return <path key={k} d={`M${Math.cos(a) * 172},${Math.sin(a) * 172} L${Math.cos(a) * 194},${Math.sin(a) * 194}`} stroke={C.ink} strokeWidth={k % 3 === 0 ? 9 : 4} strokeLinecap="round" />;
              })}
              <g transform={`rotate(${minuteA / 12})`}>
                <path d="M0,10 L0,-100" stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
              </g>
              <g transform={`rotate(${minuteA})`}>
                <path d="M0,16 L0,-158" stroke={C.red} strokeWidth={8} strokeLinecap="round" />
              </g>
              <circle r={13} fill={C.ink} />
            </g>
          </Layer>
          <Ink text="…y otra vez desde el principio" x={540} y={1530} size={52} frame={f} seed={9} serif rot={-2}
            opacity={prog(f, 380, 400) * (1 - prog(f, 470, 485))} />
        </>
      )}
      {/* El flash de la moneda de la escena anterior se disuelve */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: C.gold, opacity: 1 - prog(f, 0, 26), pointerEvents: "none" }} />
    </>
  );

  return (
    <>
      {/* Frame 0 asomando por debajo del remolino → loop perfecto */}
      {rollT > 0 && (
        <div style={{ position: "absolute", inset: 0 }}>
          <Scene1IsekaiHook localFrame={0} fps={fps} blink={0} />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "540px 960px",
          transform: `rotate(${rotWipe}deg)`,
          clipPath: rollT > 0 ? `circle(${R}px at 540px 960px)` : undefined,
        }}
      >
        {content}
      </div>
      {rollT > 0 && R > 6 && (
        <Layer>
          <g transform={`translate(540,960) rotate(${rotWipe})`}>
            <circle r={R} fill="none" stroke={C.ink} strokeWidth={46} />
            <circle r={R} fill="none" stroke={C.parch} strokeWidth={36} />
            <circle r={R - 6} fill="none" stroke={C.mud} strokeWidth={5} strokeDasharray="30 18" />
            {[0, 1, 2].map((arm) => {
              const pts: string[] = [];
              for (let k = 0; k <= 30; k++) {
                const t = k / 30;
                const rr = R * (1 + 0.55 * t);
                const a = (arm * TWO_PI) / 3 + t * 2.4;
                pts.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`);
              }
              return (
                <g key={arm}>
                  <path d={`M${pts.join(" L")}`} stroke={C.ink} strokeWidth={30 * (1 - rollT * 0.5)} fill="none" strokeLinecap="round" />
                  <path d={`M${pts.join(" L")}`} stroke={C.parch} strokeWidth={20 * (1 - rollT * 0.5)} fill="none" strokeLinecap="round" opacity={0.95} />
                </g>
              );
            })}
          </g>
        </Layer>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSICIÓN ENTRE ESCENAS (barrido tipo "pasar de página")
   ═══════════════════════════════════════════════════════════════════════════ */
const Shell: React.FC<{ f: number; enter: boolean; children: React.ReactNode }> = ({ f, enter, children }) => {
  const t = enter ? easeOut(prog(f, 0, 14)) : 1;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `translateX(${(1 - t) * W * 0.55}px)`,
        filter: t < 1 ? `blur(${(1 - t) * 10}px)` : undefined,
        opacity: 0.4 + 0.6 * t,
      }}
    >
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE RAÍZ
   ═══════════════════════════════════════════════════════════════════════════ */
export interface World2DProps {
  currentScene?: number;
  sceneLocalFrame?: number;
  absoluteTimeline?: boolean;
}

export const World2D: React.FC<World2DProps> = ({
  currentScene: propScene,
  sceneLocalFrame: propLocalFrame,
  absoluteTimeline = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Line-boil global (15–20 fps) para el acabado artesanal de lápiz/pluma
  const stepFrame = Math.floor(frame / 3);
  const boilX = Math.sin(stepFrame * 17.3) * 1.8;
  const boilY = Math.cos(stepFrame * 23.7) * 1.8;
  const boilRot = ((stepFrame % 3) - 1) * 0.35;

  // Parpadeo periódico (cada 90 frames, dura 6)
  const blinkCycle = frame % 90;
  const blink = interpolate(blinkCycle, [0, 3, 6], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const calculatedScene = useMemo(() => {
    if (frame < 420) return 0;
    if (frame < 1080) return 1;
    if (frame < 2160) return 2;
    if (frame < 3000) return 3;
    return 4;
  }, [frame]);

  const activeScene = propScene !== undefined ? propScene : absoluteTimeline ? calculatedScene : 0;

  const localFrame = useMemo(() => {
    if (propLocalFrame !== undefined) return propLocalFrame;
    if (!absoluteTimeline) return frame;
    return frame - SCENE_START[activeScene];
  }, [frame, activeScene, propLocalFrame, absoluteTimeline]);

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: "#FEFAE0",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* CONTENEDOR CON JITTER ORGÁNICO LINE-BOIL (el papel va dentro para que multiply funcione) */}
      <div
        style={{
          position: "absolute",
          inset: -8,
          width: width + 16,
          height: height + 16,
          transform: `translate(${boilX}px, ${boilY}px) rotate(${boilRot}deg)`,
          transformOrigin: "center center",
        }}
      >
        <div style={{ position: "absolute", left: 8, top: 8, width, height }}>
          {activeScene === 0 && (
            <Shell f={localFrame} enter={false}>
              <Scene1IsekaiHook localFrame={localFrame} fps={fps} blink={blink} />
            </Shell>
          )}
          {activeScene === 1 && (
            <Shell f={localFrame} enter>
              <Scene2MedievalInefficiency localFrame={localFrame} fps={fps} />
            </Shell>
          )}
          {activeScene === 2 && (
            <Shell f={localFrame} enter>
              <Scene3NorfolkFourFields localFrame={localFrame} fps={fps} />
            </Shell>
          )}
          {activeScene === 3 && (
            <Shell f={localFrame} enter>
              <Scene4LivestockWinterBoom localFrame={localFrame} fps={fps} />
            </Shell>
          )}
          {activeScene === 4 && (
            <Shell f={localFrame} enter={false}>
              <Scene5TycoonLoop localFrame={localFrame} fps={fps} blink={blink} />
            </Shell>
          )}
        </div>
      </div>

      {/* CAPA 5: grano de papel acuarela cold-press (también "hierve" a 15 fps) */}
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
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed={stepFrame % 6} result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.8 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-noise)" />
      </svg>

      {/* Viñeta suave de acuarela */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 61,
          background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(40,54,24,0.18) 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* EFECTOS DE SONIDO MICRO-SINCRONIZADOS (cada uno en su propio <Sequence>) */}
      {absoluteTimeline &&
        propScene === undefined &&
        SFX.map((s, i) => (
          <Sequence key={i} from={s.at} durationInFrames={s.dur ?? 150} layout="none">
            <Audio src={staticFile(`assets/audio/sfx/${s.file}`)} volume={s.volume} />
          </Sequence>
        ))}
    </div>
  );
};

export default World2D;
