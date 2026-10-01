import { Music, Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

interface MusicPlayerProps {
  isPlaying: boolean;
  hasStarted: boolean;
  needsInteraction: boolean;
  volume: number;
  onVolumeChange: (value: number) => void;
  onToggle: () => void;
  onStart: () => void;
}

/**
 * Fixed frosted-glass music control with a play/pause toggle and a volume
 * slider. Autoplay is attempted on open; when the browser blocks it, a gentle
 * prompt invites the visitor to begin the song on their first interaction.
 */
export function MusicPlayer({
  isPlaying,
  hasStarted,
  needsInteraction,
  volume,
  onVolumeChange,
  onToggle,
  onStart,
}: MusicPlayerProps) {
  const [promptDismissed, setPromptDismissed] = useState(false);

  useEffect(() => {
    if (hasStarted) setPromptDismissed(true);
  }, [hasStarted]);

  const showPrompt = needsInteraction && !hasStarted && !promptDismissed;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      {showPrompt ? (
        <div
          data-ocid="music.prompt"
          className="glass-panel flex max-w-[16rem] items-center gap-3 rounded-2xl px-4 py-3 shadow-elevated animate-fade-up"
        >
          <Music className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-xs leading-snug text-foreground/80">
            Tap to play the music for the full experience.
          </p>
          <button
            type="button"
            data-ocid="music.start_button"
            onClick={onStart}
            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Play
          </button>
        </div>
      ) : null}

      <div className="glass-panel flex items-center gap-3 rounded-full py-2 pl-2 pr-4 shadow-elevated">
        <button
          type="button"
          data-ocid="music.toggle"
          onClick={onToggle}
          aria-label={
            isPlaying ? "Pause background music" : "Play background music"
          }
          aria-pressed={isPlaying}
          className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-smooth hover:scale-105 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 text-primary" aria-hidden="true" />
          ) : (
            <Play
              className="h-5 w-5 translate-x-[1px] text-primary"
              aria-hidden="true"
            />
          )}
        </button>

        <div className="flex items-center gap-2">
          <Volume2
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            data-ocid="music.volume_slider"
            aria-label="Music volume"
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-secondary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-24"
          />
        </div>
      </div>
    </div>
  );
}
