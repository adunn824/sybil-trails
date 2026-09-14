// Procedural contour lines — deterministic so the server and client agree.
export default function Topo({ seed = 7 }: { seed?: number }) {
  const paths: string[] = [];
  const cx = 720;
  const cy = 420;
  const rings = 14;
  for (let i = 1; i <= rings; i++) {
    const base = 46 * i;
    const pts: string[] = [];
    const steps = 72;
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * Math.PI * 2;
      const wobble =
        Math.sin(t * 3 + seed + i * 0.4) * 18 * (1 + i * 0.12) +
        Math.sin(t * 5 - seed * 0.7 + i) * 9 +
        Math.cos(t * 2 + i * 0.9) * 26;
      const r = base + wobble;
      const x = cx + Math.cos(t) * r * 1.35;
      const y = cy + Math.sin(t) * r * 0.78;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    paths.push(`M${pts.join("L")}Z`);
  }
  return (
    <svg className="hero__topo" viewBox="0 0 1440 840" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} style={{ opacity: 0.7 - i * 0.035 }} />
      ))}
    </svg>
  );
}
