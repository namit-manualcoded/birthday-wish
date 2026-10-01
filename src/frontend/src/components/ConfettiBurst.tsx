import { useEffect, useState } from "react";

const COLORS = [
  "oklch(0.72 0.105 58)",
  "oklch(0.66 0.095 30)",
  "oklch(0.60 0.105 350)",
  "oklch(0.80 0.08 85)",
  "oklch(0.70 0.09 320)",
];

const PIECES = Array.from({ length: 28 }, (_, i) => ({
  id: `confetti-${i}`,
  left: `${(i * 37) % 100}%`,
  delay: `${(i % 7) * 0.18}s`,
  duration: `${2.8 + (i % 5) * 0.35}s`,
  color: COLORS[i % COLORS.length],
  width: i % 3 === 0 ? 10 : 7,
  height: i % 4 === 0 ? 14 : 9,
  rotate: (i * 47) % 360,
}));

/**
 * A one-shot confetti burst that plays when the visitor first arrives, then
 * removes itself. Decorative only.
 */
export function ConfettiBurst() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden motion-reduce:hidden"
    >
      {PIECES.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 animate-confetti-fall rounded-[2px]"
          style={{
            left: piece.left,
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            transform: `rotate(${piece.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
