import type { ThemeKey } from "@/lib/themes";

// Her temanın ekranın altında duran küçük manzarası (kartların arkasında kalır).

const SNOW = "#ffffff";

function jit(i: number, seed: number) {
  const x = Math.sin(i * 91.7 + seed * 47.3) * 10000;
  return x - Math.floor(x);
}

/** Katmanlı, dallı çam silueti (üçgen yığını değil). Karlıysa dal üstlerinde kar birikir. */
function Pine({ x, y, h = 70, w, snow = false, color = "#1e3d35", snowColor = "#f7fafc", seed = 1, opacity = 1 }: {
  x: number; y: number; h?: number; w?: number; snow?: boolean; color?: string; snowColor?: string; seed?: number; opacity?: number;
}) {
  const width = w ?? h * 0.62;
  const tiers = Math.max(4, Math.round(h / 11));
  const step = (h * 0.9) / tiers;
  const side = (dir: 1 | -1) =>
    Array.from({ length: tiers }, (_, i) => {
      const frac = 1 - i / tiers;
      const half = (width / 2) * Math.pow(frac, 0.95) * (0.88 + 0.22 * jit(i, seed + (dir > 0 ? 7 : 0)));
      const ty = -i * step + 2;
      return { tip: [dir * half, ty] as const, notch: [dir * half * 0.38, ty - step * 1.12] as const };
    });
  const L = side(-1);
  const R = side(1);
  const f = (p: readonly [number, number]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let d = `M-2 0 `;
  for (const t of L) d += `L${f(t.tip)} L${f(t.notch)} `;
  d += `L0 ${-h} `;
  for (const t of [...R].reverse()) d += `L${f(t.notch)} L${f(t.tip)} `;
  d += "L2 0 Z";
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <rect x={-2} y={-2} width={4} height={8} fill="#3b2a22" />
      <path d={d} fill={color} />
      {snow &&
        [...L, ...R].map((t, i) => {
          // Dalın üst kenarında yumuşak bir kar kütlesi: uca doğru incelir, ortada kalınlaşır
          const [tx, ty] = t.tip;
          const [nx, ny] = t.notch;
          const lerp = (k: number, dy: number) => `${(tx + (nx - tx) * k).toFixed(1)} ${(ty + (ny - ty) * k + dy).toFixed(1)}`;
          const th = Math.min(5.5, step * 0.5);
          return (
            <path
              key={i}
              d={`M${(tx * 1.03).toFixed(1)} ${(ty + 1).toFixed(1)} L${lerp(0.9, 0.6)} L${f(t.notch)} L${lerp(0.85, -th * 0.55)} Q${lerp(0.45, -th * 1.15)} ${lerp(0.12, -th * 0.35)} Z`}
              fill={snowColor}
            />
          );
        })}
    </g>
  );
}

/** Uzakta karlı dağ sırası */
function Mountains({ base = 92, color = "#c5d3e1", cap = "#f4f8fb" }: { base?: number; color?: string; cap?: string }) {
  const peaks = [
    [0, base - 30], [46, base - 52], [92, base - 34], [150, base - 64], [206, base - 40], [258, base - 58], [318, base - 36], [366, base - 54], [400, base - 40],
  ];
  const d = `M0 ${base} ` + peaks.map(([px, py]) => `L${px} ${py}`).join(" ") + ` L400 ${base} Z`;
  return (
    <>
      <path d={d} fill={color} />
      <rect x={0} y={base - 1} width={400} height={16} fill={color} />
      {peaks.slice(1, -1).map(([px, py], i) => {
        if (py > base - 45) return null;
        const hgt = (base - py) * 0.32;
        return (
          <path
            key={i}
            d={`M${px} ${py} L${px - hgt * 0.9} ${py + hgt} L${px - hgt * 0.4} ${py + hgt * 0.7} L${px} ${py + hgt * 1.05} L${px + hgt * 0.45} ${py + hgt * 0.72} L${px + hgt * 0.9} ${py + hgt} Z`}
            fill={cap}
          />
        );
      })}
    </>
  );
}

/** Uzak, sisli orman şeridi */
function FarForest({ y, color, count = 22, seed = 3 }: { y: number; color: string; count?: number; seed?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Pine key={i} x={(i + 0.5) * (400 / count) + (jit(i, seed) - 0.5) * 8} y={y + jit(i, seed + 1) * 4} h={16 + jit(i, seed + 2) * 14} color={color} seed={i + seed} />
      ))}
    </>
  );
}

function Lantern({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={0} cy={-11} r={16} fill="#ffd98a" opacity={0.22} />
      <rect x={-5.5} y={-19} width={11} height={16} rx={1.5} fill="#ffe3a3" />
      <path d="M-5.5 -19 h11 v16 h-11 Z M0 -19 v16 M-5.5 -11 h11" stroke="#2b2522" strokeWidth={1.3} fill="none" />
      <path d="M-7 -19 L0 -25 L7 -19 Z" fill="#2b2522" />
      <path d="M-3 -27 q3 -5 6 0" stroke="#2b2522" strokeWidth={1.2} fill="none" />
      <rect x={-7} y={-3} width={14} height={3} fill="#2b2522" />
    </g>
  );
}

/** Yılbaşı ağacı: sıcak beyaz ışıklar ve ince altın yıldız */
function XmasTree({ x, y, h = 100 }: { x: number; y: number; h?: number }) {
  const w = h * 0.66;
  const rows = 6;
  const lights: [number, number][] = [];
  for (let r = 1; r <= rows; r++) {
    const ry = -h * (r / (rows + 1.3));
    const half = (w / 2) * (1 - r / (rows + 1.3)) * 0.92;
    const n = rows + 2 - r;
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n;
      lights.push([-half + 2 * half * t, ry + 5 * Math.sin(Math.PI * t) + (r % 2 ? 2 : -1)]);
    }
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <Pine x={0} y={0} h={h} w={w} color="#1b4334" snow seed={11} />
      {lights.map(([lx, ly], i) => (
        <g key={i}>
          <circle cx={lx} cy={ly} r={3.6} fill="#ffe29a" opacity={0.28} />
          <circle cx={lx} cy={ly} r={1.25} fill="#fff6d8" />
        </g>
      ))}
      <g transform={`translate(0 ${-h - 4})`}>
        <circle r={9} fill="#f6d77a" opacity={0.25} />
        <path d="M0 -7 L1.4 -1.4 L7 0 L1.4 1.4 L0 7 L-1.4 1.4 L-7 0 L-1.4 -1.4 Z" fill="#f3cf6a" />
      </g>
    </g>
  );
}

function Gift({ x, y, w = 16, h = 13, color = "#d0303a", ribbon = "#f2c14e" }: { x: number; y: number; w?: number; h?: number; color?: string; ribbon?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-h} width={w} height={h} rx={1.5} fill={color} />
      <rect x={-1.5} y={-h} width={3} height={h} fill={ribbon} />
      <rect x={-w / 2} y={-h + 4} width={w} height={2.5} fill={ribbon} />
      <path d={`M0 ${-h} q-5 -5 -4 0 M0 ${-h} q5 -5 4 0`} stroke={ribbon} strokeWidth={1.4} fill="none" />
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
          <Mountains />
          <FarForest y={100} color="#8ea4b4" />
          <path d="M0 150 L0 104 Q90 92 190 102 T400 98 L400 150 Z" fill="#eef3f8" />
          <Cabin x={236} y={122} />
          <path d="M0 150 L0 120 Q110 108 220 122 T400 116 L400 150 Z" fill="#fbfdff" />
          <path d="M0 122 Q110 110 220 124 T400 118" stroke="#d3dee9" strokeWidth={1.2} fill="none" />
          <Pine x={34} y={134} h={92} snow seed={2} />
          <Pine x={74} y={136} h={62} snow seed={5} color="#24493f" />
          <Pine x={352} y={134} h={84} snow seed={8} />
          <Pine x={386} y={138} h={56} snow seed={9} color="#24493f" />
        </>
      );
    case "yilbasi":
      return (
        <>
          <Mountains color="#d4c9d3" />
          <FarForest y={100} color="#9a9aa8" />
          <path d="M0 150 L0 104 Q90 92 190 102 T400 98 L400 150 Z" fill="#f1eef2" />
          <path d="M0 150 L0 120 Q110 108 220 122 T400 116 L400 150 Z" fill="#fdfcfd" />
          <path d="M0 122 Q110 110 220 124 T400 118" stroke="#e0d8e0" strokeWidth={1.2} fill="none" />
          <Pine x={30} y={134} h={86} snow seed={4} />
          <Pine x={366} y={134} h={80} snow seed={6} />
          <XmasTree x={200} y={136} h={104} />
          <Gift x={160} y={137} w={18} h={14} color="#6e1d28" ribbon="#d8b46a" />
          <Gift x={176} y={138} w={11} h={9} color="#c9a57c" ribbon="#1f4a3a" />
          <Gift x={236} y={138} w={16} h={12} color="#efe6d8" ribbon="#8e2333" />
          <Lantern x={110} y={138} />
          <Lantern x={290} y={139} />
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
          <Pine x={50} y={110} h={60} color="#151b26" seed={3} />
          <path d={hill(112, 104, 110)} fill="#211b33" />
          <House x={180} y={134} />
          <House x={214} y={136} w={22} h={18} roof="#4a3b66" />
          <Pine x={320} y={138} h={70} color="#151b26" seed={7} />
          <Pine x={350} y={140} h={48} color="#151b26" seed={8} />
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
