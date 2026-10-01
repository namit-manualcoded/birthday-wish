import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface TypewriterProps {
  /** Full text to reveal one character at a time. */
  text: string;
  /** Milliseconds between characters. */
  speed?: number;
  /** Delay before typing starts, in milliseconds. */
  startDelay?: number;
  /** Extra classes applied to the wrapping element. */
  className?: string;
  /** When false, the text is rendered instantly (e.g. off-screen). */
  active?: boolean;
}

/**
 * Reveals `text` one character at a time with a blinking caret. Honors the
 * user's reduced-motion preference by rendering the full text immediately.
 */
export function Typewriter({
  text,
  speed = 28,
  startDelay = 0,
  className,
  active = true,
}: TypewriterProps) {
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion || !active) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let index = 0;
    let interval: number | null = null;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        index += 1;
        setCount(index);
        if (index >= text.length && interval !== null) {
          window.clearInterval(interval);
          interval = null;
        }
      }, speed);
      timerRef.current = interval;
    }, startDelay);

    return () => {
      window.clearTimeout(start);
      if (interval !== null) window.clearInterval(interval);
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [text, speed, startDelay, reduceMotion, active]);

  const done = count >= text.length;

  return (
    <span className={className}>
      {text.slice(0, count)}
      {!reduceMotion && !done ? (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block w-[0.06em] animate-type-caret bg-current align-baseline"
          style={{ height: "1em" }}
        />
      ) : null}
    </span>
  );
}
