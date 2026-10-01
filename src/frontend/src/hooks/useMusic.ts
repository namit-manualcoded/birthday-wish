import { DEFAULT_SONG_URL } from "@/lib/placeholder-content";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseMusicResult {
  /** True once playback has actually begun at least once. */
  hasStarted: boolean;
  isPlaying: boolean;
  /** True when the browser blocked autoplay and a tap is required. */
  needsInteraction: boolean;
  /** 0–1 playback volume. */
  volume: number;
  setVolume: (value: number) => void;
  toggle: () => void;
  /** Called on the visitor's first interaction to begin playback. */
  start: () => void;
}

/**
 * Owns a single <audio> element for the whole site so the song never restarts
 * on scroll or navigation. Autoplay is attempted on mount at maximum volume;
 * when the browser blocks it, `needsInteraction` flips true so the UI can show
 * a tap-to-play prompt and resume on the first visitor interaction.
 */
export function useMusic(songUrl: string | null): UseMusicResult {
  const resolvedUrl = songUrl ?? DEFAULT_SONG_URL;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [volume, setVolumeState] = useState(1);

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 1;
    audioRef.current = audio;

    const handlePlay = () => {
      setIsPlaying(true);
      setHasStarted(true);
      setNeedsInteraction(false);
    };
    const handlePause = () => setIsPlaying(false);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.src !== resolvedUrl) {
      audio.src = resolvedUrl;
      audio.load();
    }
  }, [resolvedUrl]);

  // Attempt autoplay as soon as the source is ready. Browsers commonly reject
  // this before any interaction, so a rejection arms the tap-to-play prompt.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;
    let cancelled = false;
    void audio
      .play()
      .then(() => {
        if (!cancelled) setNeedsInteraction(false);
      })
      .catch(() => {
        if (!cancelled) setNeedsInteraction(true);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedUrl]);

  const start = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    void audio
      .play()
      .then(() => setNeedsInteraction(false))
      .catch(() => setNeedsInteraction(true));
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio
        .play()
        .then(() => setNeedsInteraction(false))
        .catch(() => setNeedsInteraction(true));
    } else {
      audio.pause();
    }
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolumeState(clamped);
    const audio = audioRef.current;
    if (audio) audio.volume = clamped;
  }, []);

  return {
    hasStarted,
    isPlaying,
    needsInteraction,
    volume,
    setVolume,
    toggle,
    start,
  };
}
