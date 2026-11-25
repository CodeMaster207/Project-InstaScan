export interface Slice {
  label: string;
  value: number;
}

// Navy, yellow and purples from the palette, plus a few extra tones for a ninth slice.
const COLORS = ["#192a51", "#ffdc2e", "#5e4570", "#aaa1c8", "#967aa1", "#f2c40a", "#d5c6e0", "#7d8bb5", "#8a1c3a"];

const CENTER = 100;
const RADIUS = 90;

function point(angle: number): string {
  return `${(CENTER + RADIUS * Math.cos(angle)).toFixed(3)} ${(CENTER + RADIUS * Math.sin(angle)).toFixed(3)}`;
}

/**
 * A pie chart with a legend. The legend lists every slice with its value and percentage as text,
 * so the chart never depends on colour alone.
 */
export function PieChart({ slices, formatValue }: { slices: Slice[]; formatValue: (value: number) => string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return <p className="muted">Nothing to chart yet.</p>;

  const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  let angle = -Math.PI / 2; // start at the top
  const shapes = sorted.map((slice, index) => {
    const fraction = slice.value / total;
    const fill = COLORS[index % COLORS.length];
    if (fraction >= 0.9999) {
      return <circle key={slice.label} cx={CENTER} cy={CENTER} r={RADIUS} fill={fill} />;
    }
    const start = angle;
    angle += fraction * 2 * Math.PI;
    const large = fraction > 0.5 ? 1 : 0;
    return (
      <path
        key={slice.label}
        d={`M ${CENTER} ${CENTER} L ${point(start)} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${point(angle)} Z`}
        fill={fill}
        stroke="#f5e6e8"
        strokeWidth={2}
      />
    );
  });

  const summary = sorted.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(", ");

  return (
    <div className="pie">
      <svg viewBox="0 0 200 200" role="img" aria-label={`Spending by category: ${summary}`} className="pie-svg">
        {shapes}
      </svg>
      <ul className="legend">
        {sorted.map((slice, index) => (
          <li key={slice.label}>
            <span className="swatch" style={{ background: COLORS[index % COLORS.length] }} aria-hidden="true" />
            <span className="legend-label">{slice.label}</span>
            <span className="legend-value">
              {formatValue(slice.value)} ({Math.round((slice.value / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
