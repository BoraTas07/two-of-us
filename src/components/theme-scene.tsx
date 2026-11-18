import type { ThemeKey } from "@/lib/themes";

// Her temanın ekranın altında duran küçük manzarası (kartların arkasında kalır).

const SNOW = "#ffffff";
const SNOW_EDGE = "#b8c9da";

function Pine({ x, y, s = 1, snow = false, lights = false, star = false, color = "#1f6b45", dark = "#17573a" }: {
  x: number; y: number; s?: number; snow?: boolean; lights?: boolean; star?: boolean; color?: string; dark?: string;
}) {
  const tiers = [
    { ay: -64, by: -38, w: 14 },
    { ay: -50, by: -20, w: 19 },
    { ay: -34, by: 0, w: 25 },
  ];
  const bulbs = ["#e0443e", "#f2c14e", "#4f8fd8", "#e86fb0"];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-3} y={-2} width={6} height={10} fill="#6b4226" />
      {tiers.map((t, i) => (
        <g key={i}>
          <polygon points={`0,${t.ay} ${-t.w},${t.by} ${t.w},${t.by}`} fill={i % 2 ? dark : color} />
          {snow && (
            <>
              <path
                d={`M0 ${t.ay} L${-t.w * 0.42} ${t.ay + (t.by - t.ay) * 0.42} q${t.w * 0.21} 4 ${t.w * 0.42} 0 q${t.w * 0.21} 4 ${t.w * 0.42} 0 Z`}
                fill={SNOW}
              />
              <ellipse cx={0} cy={t.by} rx={t.w * 0.95} ry={2.6} fill={SNOW} />
            </>
          )}
          {lights &&
            [-0.6, -0.15, 0.3, 0.7].map((f, j) => (
              <circle key={j} cx={t.w * f} cy={t.by - 3 - (j % 2) * 3} r={2.1} fill={bulbs[(i + j) % 4]} />
            ))}
        </g>
      ))}
      {star && <polygon points="0,-74 2.6,-67 10,-67 4,-62.5 6.3,-55.5 0,-59.8 -6.3,-55.5 -4,-62.5 -10,-67 -2.6,-67" fill="#f2c14e" />}
    </g>
  );
}

function Snowman({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cy={-12} r={12} fill={SNOW} stroke={SNOW_EDGE} />
      <circle cy={-30} r={9} fill={SNOW} stroke={SNOW_EDGE} />
      <circle cy={-44} r={7} fill={SNOW} stroke={SNOW_EDGE} />
      <rect x={-8} y={-38} width={16} height={4} rx={2} fill="#d0303a" />
      <rect x={3} y={-38} width={4} height={10} rx={2} fill="#d0303a" />
      <circle cx={-2.5} cy={-46} r={1} fill="#333" />
      <circle cx={2.5} cy={-46} r={1} fill="#333" />
      <polygon points="0,-44 8,-43 0,-42" fill="#f08a24" />
      <rect x={-6} y={-56} width={12} height={4} fill="#2b2b2b" />
      <rect x={-4} y={-63} width={8} height={8} fill="#2b2b2b" />
    </g>
  );
}

function Gift({ x, y, w = 16, h = 13, color = "#d0303a", ribbon = "#f2c14e" }: { x: number; y: number; w?: number; h?: number; color?: string; ribbon?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-h} width={w} height={h} rx={1.5} fill={color} />
      <rect x={-1.5} y={-h} width={3} height={h} fill={ribbon} />
      <rect x={-w / 2} y={-h + 4} width={w} height={2.5} fill={ribbon} />
      <path d={`M0 ${-h} q-6 -6 -5 0 M0 ${-h} q6 -6 5 0`} stroke={ribbon} strokeWidth={2} fill="none" />
    </g>
  );
}

function Cabin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-22} y={-26} width={44} height={26} fill="#8a4b2a" />
      <rect x={-22} y={-26} width={44} height={26} fill="url(#logs)" />
      <rect x={6} y={-45} width={7} height={14} fill="#6b3a20" />
      <path d="M-28 -24 L0 -44 L28 -24 Z" fill="#5b2f1a" />
      <path d="M-30 -23 L0 -46 L30 -23 q-6 4 -12 0 q-6 4 -12 0 q-6 4 -12 0 q-6 4 -12 0 q-6 4 -12 0 Z" fill={SNOW} />
      <rect x={-14} y={-18} width={11} height={10} rx={1} fill="#ffcf5c" />
      <rect x={-14} y={-18} width={11} height={10} rx={1} fill="none" stroke="#5b2f1a" strokeWidth={1.4} />
      <rect x={4} y={-17} width={9} height={17} fill="#5b2f1a" />
      <circle cx={-8.5} cy={-13} r={10} fill="#ffcf5c" opacity={0.25} />
      <path d="M9 -48 q-4 -6 1 -11 q5 -5 0 -11" stroke="#ffffff" strokeWidth={3} fill="none" opacity={0.7} strokeLinecap="round" />
    </g>
  );
}

function Pumpkin({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={-6} cy={-9} rx={8} ry={9} fill="#e8700f" />
      <ellipse cx={6} cy={-9} rx={8} ry={9} fill="#e8700f" />
      <ellipse cx={0} cy={-9} rx={8} ry={10} fill="#f7891c" />
      <path d="M0 -18 q1 -6 5 -7" stroke="#4f6b1a" strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M2 -21 q6 -4 9 1 q-5 2 -9 -1" fill="#6f9a24" />
    </g>
  );
}

function AutumnTree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-4 0 L-3 -38 L-14 -52 M-3 -38 L8 -56 M-3 -30 L-18 -40" stroke="#6b3a1d" strokeWidth={5} fill="none" strokeLinecap="round" />
      <circle cx={-16} cy={-58} r={15} fill="#e8541c" />
      <circle cx={6} cy={-66} r={18} fill="#f29a1f" />
      <circle cx={-2} cy={-50} r={13} fill="#d93d16" />
      <circle cx={16} cy={-50} r={11} fill="#f5b52e" />
      <circle cx={-24} cy={-44} r={9} fill="#f29a1f" />
    </g>
  );
}

function Tulip({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 V-22" stroke="#2f8a3e" strokeWidth={2} />
      <path d="M0 -8 q-8 -2 -9 -10 q7 1 9 8" fill="#3fa552" />
      <path d="M-6 -24 q0 -10 6 -10 q6 0 6 10 q-3 4 -6 4 q-3 0 -6 -4 Z M-6 -30 l3 4 l3 -6 l3 6 l3 -4" fill={color} />
    </g>
  );
}

function Daisy({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 V-14" stroke="#3a9a48" strokeWidth={1.6} />
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx={0} cy={-19} rx={1.8} ry={4.5} fill="#ffffff" transform={`rotate(${i * 45} 0 -14)`} />
      ))}
      <circle cx={0} cy={-14} r={2.6} fill="#f6c21c" />
    </g>
  );
}

function HeartTree({ x, y, s = 1, color = "#f05a84" }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 V-28" stroke="#7a3b2e" strokeWidth={4} strokeLinecap="round" />
      <path d="M0 -26 C -26 -40 -18 -66 0 -54 C 18 -66 26 -40 0 -26 Z" fill={color} />
    </g>
  );
}

function Palm({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 Q6 -40 -4 -78" stroke="#9b6a3a" strokeWidth={6} fill="none" strokeLinecap="round" />
      {[
        "M-4 -78 q-24 -6 -38 10 q18 -14 38 -10",
        "M-4 -78 q-18 -20 -40 -16 q24 0 40 16",
        "M-4 -78 q8 -22 30 -22 q-20 6 -30 22",
        "M-4 -78 q26 -8 38 8 q-18 -10 -38 -8",
        "M-4 -78 q-2 -22 10 -32 q-6 14 -10 32",
      ].map((d, i) => (
        <path key={i} d={d} fill="#1f9a5a" stroke="#168048" strokeWidth={2} />
      ))}
      <circle cx={-6} cy={-74} r={3.2} fill="#7a4a22" />
      <circle cx={-1} cy={-73} r={3.2} fill="#7a4a22" />
    </g>
  );
}

function Umbrella({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M2 0 L-4 -46" stroke="#7a5a3a" strokeWidth={2.2} />
      <path d="M-34 -40 Q-4 -72 26 -50 Z" fill="#ff5f4a" />
      <path d="M-24 -46 Q-12 -64 -4 -60 L-4 -46 Z M6 -60 Q16 -60 16 -48 L6 -48 Z" fill="#ffffff" opacity={0.9} />
      <ellipse cx={-14} cy={-1} rx={16} ry={3} fill="#ff9a3d" />
      <circle cx={22} cy={-6} r={6} fill="#ffffff" />
      <path d="M16 -6 h12 M22 -12 v12" stroke="#2fa0e0" strokeWidth={2} />
    </g>
  );
}

function Cake({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-26} y={-20} width={52} height={20} rx={3} fill="#f6b3d4" />
      <rect x={-19} y={-36} width={38} height={16} rx={3} fill="#fbe2ef" />
      <path d="M-26 -20 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0" fill="#ffffff" />
      {[-10, 0, 10].map((cx, i) => (
        <g key={i}>
          <rect x={cx - 1.5} y={-46} width={3} height={10} fill={["#8e3fd6", "#2f8ff0", "#1fa86f"][i]} />
          <ellipse cx={cx} cy={-49} rx={2.4} ry={3.6} fill="#ffb21c" />
        </g>
      ))}
    </g>
  );
}

function House({ x, y, w = 26, h = 22, roof = "#3b2f52" }: { x: number; y: number; w?: number; h?: number; roof?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-h} width={w} height={h} fill="#2d2540" />
      <path d={`M${-w / 2 - 4} ${-h} L0 ${-h - 14} L${w / 2 + 4} ${-h} Z`} fill={roof} />
      <rect x={-w / 4 - 3} y={-h + 6} width={6} height={6} fill="#ffd36b" />
      <rect x={w / 4 - 3} y={-h + 6} width={6} height={6} fill="#ffd36b" opacity={0.8} />
    </g>
  );
}

const hill = (y1: number, y2: number, y3: number) => `M0 150 L0 ${y1} Q100 ${y1 - 30} 200 ${y2} T400 ${y3} L400 150 Z`;

function Scene({ theme }: { theme: ThemeKey }) {
  switch (theme) {
    case "kis":
      return (
        <>
          <path d={hill(82, 76, 70)} fill="#dfe8f2" />
          <Pine x={36} y={112} s={0.8} snow />
          <Pine x={300} y={104} s={0.7} snow />
          <Pine x={372} y={110} s={0.95} snow />
          <path d={hill(112, 104, 110)} fill={SNOW} stroke={SNOW_EDGE} />
          <Cabin x={210} y={122} />
          <Pine x={92} y={132} s={1.05} snow />
          <Snowman x={140} y={134} />
          <Pine x={330} y={140} s={0.85} snow />
        </>
      );
    case "yilbasi":
      return (
        <>
          <path d={hill(84, 78, 72)} fill="#e6eef6" />
          <Pine x={40} y={110} s={0.75} snow />
          <Pine x={360} y={106} s={0.8} snow />
          <path d={hill(112, 106, 110)} fill={SNOW} stroke={SNOW_EDGE} />
          <Pine x={200} y={132} s={1.35} snow lights star />
          <Gift x={160} y={134} />
          <Gift x={240} y={135} w={18} h={12} color="#1f8a4a" ribbon="#e0443e" />
          <Gift x={256} y={136} w={11} h={9} color="#2f7fc0" ribbon="#f2c14e" />
          <Snowman x={80} y={136} />
          <Pine x={330} y={140} s={0.8} snow lights />
        </>
      );
    case "sonbahar":
      return (
        <>
          <path d={hill(86, 80, 74)} fill="#f6b26b" />
          <AutumnTree x={300} y={110} s={0.9} />
          <path d={hill(112, 104, 110)} fill="#e07b2f" />
          <AutumnTree x={70} y={130} s={1.1} />
          <Pumpkin x={150} y={136} s={1.2} />
          <Pumpkin x={176} y={138} s={0.85} />
          <Pumpkin x={350} y={138} s={1} />
          {[118, 128, 206, 224, 248, 268, 384].map((cx, i) => (
            <ellipse key={i} cx={cx} cy={138 + (i % 2) * 3} rx={6} ry={3} fill={["#d93d16", "#f5b52e", "#a8441a", "#f29a1f"][i % 4]} transform={`rotate(${i * 37} ${cx} 138)`} />
          ))}
        </>
      );
    case "ilkbahar":
      return (
        <>
          <path d={hill(86, 80, 74)} fill="#a8dc8e" />
          <path d={hill(112, 104, 110)} fill="#6cc463" />
          {[
            [30, "#ff5c8a"], [52, "#ffb21c"], [74, "#c2408a"], [250, "#ff5c8a"], [272, "#ffd23c"], [356, "#c2408a"], [378, "#ff7a5c"],
          ].map(([x, c], i) => (
            <Tulip key={i} x={x as number} y={136 + (i % 2) * 4} color={c as string} />
          ))}
          {[110, 130, 150, 170, 196, 214, 300, 322].map((x, i) => (
            <Daisy key={i} x={x} y={134 + (i % 3) * 4} s={0.8 + (i % 2) * 0.3} />
          ))}
        </>
      );
    case "yaz":
      return (
        <>
          <circle cx={350} cy={30} r={30} fill="#ffd23c" opacity={0.25} />
          <circle cx={350} cy={30} r={19} fill="#ffc414" />
          <rect x={0} y={70} width={400} height={50} fill="#3cbfe8" />
          <path d="M0 74 q25 -6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#bdeefc" strokeWidth={3} fill="none" />
          <path d="M0 92 q25 -6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#8fdcf5" strokeWidth={3} fill="none" />
          <path d="M280 62 l6 -14 l6 14 Z" fill="#ffffff" />
          <path d="M286 62 V48" stroke="#7a5a3a" />
          <path d="M60 30 q5 -5 10 0 q5 -5 10 0 M110 18 q4 -4 8 0 q4 -4 8 0" stroke="#3a4a55" strokeWidth={1.6} fill="none" />
          <path d="M0 150 L0 112 Q100 96 200 108 T400 104 L400 150 Z" fill="#f7d68f" />
          <Palm x={340} y={136} />
          <Umbrella x={120} y={136} />
          <path d="M228 134 l3 -7 l3 7 l7 1 l-5 5 l2 7 l-7 -4 l-7 4 l2 -7 l-5 -5 Z" fill="#ff7a5c" />
        </>
      );
    case "sevgililer":
      return (
        <>
          <path d={hill(86, 80, 74)} fill="#ffbcd0" />
          <path d={hill(112, 104, 110)} fill="#f58aac" />
          <HeartTree x={60} y={132} s={1.1} />
          <HeartTree x={330} y={128} s={0.9} color="#e0285a" />
          <HeartTree x={196} y={134} s={0.7} color="#ff7aa0" />
        </>
      );
    case "dogumgunu":
      return (
        <>
          <path d={hill(86, 80, 74)} fill="#dcc3f7" />
          <path d={hill(112, 104, 110)} fill="#b98ef0" />
          <Cake x={200} y={136} />
          <Gift x={140} y={136} color="#ec3f8c" ribbon="#ffd23c" />
          <Gift x={262} y={137} w={18} h={14} color="#2f8ff0" ribbon="#ffffff" />
          <Gift x={282} y={137} w={12} h={10} color="#1fa86f" ribbon="#ffd23c" />
        </>
      );
    case "yildonumu":
      return (
        <>
          <path d={hill(86, 80, 74)} fill="#f2c2c4" />
          <path d={hill(112, 104, 110)} fill="#d98a96" />
          <g transform="translate(200 132)">
            <rect x={-30} y={-14} width={60} height={4} rx={2} fill="#7a4a3a" />
            <rect x={-30} y={-24} width={60} height={4} rx={2} fill="#7a4a3a" />
            <rect x={-26} y={-14} width={4} height={14} fill="#5a3428" />
            <rect x={22} y={-14} width={4} height={14} fill="#5a3428" />
            <path d="M-8 -50 C -20 -60 -14 -74 -4 -66 C 6 -74 12 -60 -8 -50 Z" fill="#c23b55" />
            <path d="M10 -44 C -2 -54 4 -68 14 -60 C 24 -68 30 -54 10 -44 Z" fill="#f08aa0" />
          </g>
          <HeartTree x={70} y={130} s={0.9} color="#c23b55" />
          <HeartTree x={330} y={130} s={0.8} color="#e88aa0" />
        </>
      );
    case "gece":
      return (
        <>
          <circle cx={334} cy={30} r={26} fill="#f6e7b8" opacity={0.18} />
          <circle cx={334} cy={30} r={17} fill="#f6e7b8" />
          <circle cx={341} cy={26} r={14} fill="#2a2342" opacity={0.9} />
          <path d={hill(86, 80, 74)} fill="#2a2342" />
          <Pine x={50} y={110} s={0.8} color="#1c2a2a" dark="#162222" />
          <path d={hill(112, 104, 110)} fill="#211b33" />
          <House x={180} y={134} />
          <House x={214} y={136} w={22} h={18} roof="#4a3b66" />
          <Pine x={320} y={138} s={0.9} color="#1c2a2a" dark="#162222" />
        </>
      );
    default:
      return null;
  }
}

export default function ThemeScene({ theme }: { theme: ThemeKey }) {
  const scene = Scene({ theme });
  if (!scene) return null;
  return (
    <>
      <svg className="decor-scene" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <defs>
          <pattern id="logs" width="44" height="6" patternUnits="userSpaceOnUse">
            <rect width="44" height="5" fill="#9a5a34" />
          </pattern>
        </defs>
        {scene}
      </svg>
    </>
  );
}
