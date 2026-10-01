import { Heart } from "lucide-react";

const HEARTS = [
  { left: "6%", delay: "0s", duration: "8s", size: 18, opacity: 0.5 },
  { left: "18%", delay: "1.4s", duration: "9.5s", size: 12, opacity: 0.4 },
  { left: "31%", delay: "3.1s", duration: "7.5s", size: 22, opacity: 0.55 },
  { left: "44%", delay: "0.8s", duration: "10s", size: 14, opacity: 0.35 },
  { left: "58%", delay: "2.2s", duration: "8.5s", size: 20, opacity: 0.5 },
  { left: "71%", delay: "4s", duration: "9s", size: 13, opacity: 0.4 },
  { left: "84%", delay: "1.1s", duration: "7.8s", size: 24, opacity: 0.55 },
  { left: "93%", delay: "3.6s", duration: "10.5s", size: 15, opacity: 0.35 },
];

/**
 * Ambient hearts drifting upward behind the content. Purely decorative, so it
 * is hidden from assistive technology and disabled for reduced motion.
 */
export function FloatingHearts() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden motion-reduce:hidden"
    >
      {HEARTS.map((heart) => (
        <Heart
          key={heart.left}
          className="absolute bottom-[-10%] animate-float-heart fill-accent/40 text-accent/50"
          style={{
            left: heart.left,
            width: heart.size,
            height: heart.size,
            animationDelay: heart.delay,
            animationDuration: heart.duration,
            opacity: heart.opacity,
          }}
        />
      ))}
    </div>
  );
}
