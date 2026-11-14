export type RepeatMode = "off" | "all" | "one";

export interface PlayerPreferences {
  volume: number;
  muted: boolean;
  playbackRate: number;
  repeatMode: RepeatMode;
}

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

const PREFERENCES_KEY = "finkyo:player-preferences";
const PROGRESS_PREFIX = "finkyo:progress:";
const REPEAT_MODES: RepeatMode[] = ["off", "all", "one"];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const loadPlayerPreferences = (): PlayerPreferences => {
  const defaults: PlayerPreferences = {
    volume: 1,
    muted: false,
    playbackRate: 1,
    repeatMode: "off",
  };

  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Partial<PlayerPreferences>;
    const volume = Number(parsed.volume);
    const playbackRate = Number(parsed.playbackRate);

    return {
      volume: Number.isFinite(volume) ? clamp(volume, 0, 1) : defaults.volume,
      muted: typeof parsed.muted === "boolean" ? parsed.muted : defaults.muted,
      playbackRate: (PLAYBACK_RATES as readonly number[]).includes(playbackRate)
        ? playbackRate
        : defaults.playbackRate,
      repeatMode: REPEAT_MODES.includes(parsed.repeatMode as RepeatMode)
        ? (parsed.repeatMode as RepeatMode)
        : defaults.repeatMode,
    };
  } catch {
    return defaults;
  }
};

export const savePlayerPreferences = (preferences: PlayerPreferences) => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // 隐私模式下 localStorage 可能不可用，忽略即可。
  }
};

export const loadPlaybackProgress = (uri: string): number => {
  try {
    const value = Number(localStorage.getItem(PROGRESS_PREFIX + uri));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
};

export const savePlaybackProgress = (uri: string, time: number) => {
  if (!Number.isFinite(time) || time <= 0) {
    return;
  }
  try {
    localStorage.setItem(PROGRESS_PREFIX + uri, String(time));
  } catch {
    // 忽略存储失败。
  }
};

export const clearPlaybackProgress = (uri: string) => {
  try {
    localStorage.removeItem(PROGRESS_PREFIX + uri);
  } catch {
    // 忽略存储失败。
  }
};
