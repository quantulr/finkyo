import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onSettled,
} from "solid-js";
import type { MediaItem } from "../types";
import { downloadFile, downloadUrl, rawUrl } from "../lib/api";
import { formatDuration } from "../lib/format";
import { baseName, mediaKindOf, parentPath } from "../lib/path";
import {
  IconAudio,
  IconCheck,
  IconChevronLeft,
  IconClose,
  IconDownload,
  IconFullscreen,
  IconMusicNote,
  IconNext,
  IconPause,
  IconPlay,
  IconPlaylist,
  IconPrevious,
  IconRepeat,
  IconVideo,
  IconVolume,
  IconVolumeMute,
} from "../icons";
import IconButton from "./IconButton";
import Menu, { type MenuItem } from "./Menu";

interface PlayerProps {
  items: MediaItem[];
  path: string;
  kind: "video" | "audio";
  initialVolume: number;
  onVolumeChange: (volume: number) => void;
  onNavigate: (path: string) => void;
  onClose: () => void;
  onToast: (message: string) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function Player(props: PlayerProps) {
  let root: HTMLDivElement | undefined;
  let media: HTMLVideoElement | undefined;
  let progressBar: HTMLDivElement | undefined;
  let volumeBar: HTMLDivElement | undefined;
  let rateButton: HTMLButtonElement | undefined;

  const [playing, setPlaying] = createSignal(false);
  const [currentTime, setCurrentTime] = createSignal(0);
  const [duration, setDuration] = createSignal(0);
  const [buffered, setBuffered] = createSignal(0);
  const [volume, setVolume] = createSignal(props.initialVolume);
  const [muted, setMuted] = createSignal(false);
  const [rate, setRate] = createSignal(1);
  const [loop, setLoop] = createSignal(false);
  const [buffering, setBuffering] = createSignal(false);
  const [autoplayBlocked, setAutoplayBlocked] = createSignal(false);
  const [playlistOpen, setPlaylistOpen] = createSignal(false);
  const [fullscreen, setFullscreen] = createSignal(false);
  const [scrubbing, setScrubbing] = createSignal(false);
  const [previewTime, setPreviewTime] = createSignal(0);
  const [error, setError] = createSignal<string | null>(null);
  const [rateMenu, setRateMenu] = createSignal<{ x: number; y: number } | null>(
    null,
  );

  const itemIndex = () =>
    props.items.findIndex((item) => item.path === props.path);
  const currentItem = () => props.items[itemIndex()];
  const hasPrevious = () => itemIndex() > 0;
  const hasNext = () =>
    itemIndex() >= 0 && itemIndex() < props.items.length - 1;
  const title = () => currentItem()?.name ?? baseName(props.path);
  const directory = () => parentPath(props.path);
  const progressPercent = () => {
    const total = duration();
    if (total <= 0) return 0;
    const value = scrubbing() ? previewTime() : currentTime();
    return clamp((value / total) * 100, 0, 100);
  };
  const bufferedPercent = () => {
    const total = duration();
    return total > 0 ? clamp((buffered() / total) * 100, 0, 100) : 0;
  };
  const displayedTime = () => (scrubbing() ? previewTime() : currentTime());
  const volumePercent = () => (muted() ? 0 : volume() * 100);

  const errorMessage = (): string => {
    switch (media?.error?.code) {
      case 1:
        return "播放已中止";
      case 2:
        return "读取文件时发生网络错误";
      case 3:
        return "解码失败";
      case 4:
        return "这个格式无法在浏览器中播放";
      default:
        return "无法播放这个文件";
    }
  };

  const requestPlay = () => {
    const element = media;
    if (!element) return;
    const promise = element.play();
    if (promise) {
      promise.catch(() => {
        setAutoplayBlocked(true);
        setBuffering(false);
      });
    }
  };

  const togglePlay = () => {
    const element = media;
    if (!element) return;
    if (element.paused) requestPlay();
    else element.pause();
  };

  const seekTo = (seconds: number) => {
    const element = media;
    if (!element) return;
    const value = clamp(seconds, 0, duration() || 0);
    element.currentTime = value;
    setCurrentTime(value);
  };

  const goPrevious = () => {
    if (!hasPrevious()) return;
    props.onNavigate(props.items[itemIndex() - 1].path);
  };

  const goNext = () => {
    if (!hasNext()) return;
    props.onNavigate(props.items[itemIndex() + 1].path);
  };

  const updateVolume = (value: number) => {
    const next = clamp(value, 0, 1);
    setVolume(next);
    setMuted(false);
    if (media) {
      media.volume = next;
      media.muted = false;
    }
    props.onVolumeChange(next);
  };

  const toggleMute = () => {
    const next = !muted();
    setMuted(next);
    if (media) media.muted = next;
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      root?.requestFullscreen().catch(() => props.onToast("无法进入全屏"));
    }
  };

  const close = () => {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    props.onClose();
  };

  const downloadCurrent = () => {
    const item = currentItem();
    if (!item) return;
    downloadFile(downloadUrl(item.path), baseName(item.path));
  };

  const seekFromPointer = (event: PointerEvent) => {
    if (!progressBar) return;
    const rect = progressBar.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const target = ratio * duration();
    setPreviewTime(target);
    if (media) media.currentTime = target;
    setCurrentTime(target);
  };

  const onProgressDown = (event: PointerEvent) => {
    if (duration() <= 0) return;
    progressBar?.setPointerCapture(event.pointerId);
    setScrubbing(true);
    seekFromPointer(event);
  };

  const onProgressMove = (event: PointerEvent) => {
    if (!scrubbing()) return;
    seekFromPointer(event);
  };

  const onProgressUp = (event: PointerEvent) => {
    if (scrubbing()) {
      seekFromPointer(event);
      setScrubbing(false);
    }
    if (progressBar?.hasPointerCapture(event.pointerId)) {
      progressBar.releasePointerCapture(event.pointerId);
    }
  };

  const onProgressCancel = (event: PointerEvent) => {
    setScrubbing(false);
    if (progressBar?.hasPointerCapture(event.pointerId)) {
      progressBar.releasePointerCapture(event.pointerId);
    }
  };

  const volumeFromPointer = (event: PointerEvent) => {
    if (!volumeBar) return;
    const rect = volumeBar.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    updateVolume(ratio);
  };

  const onVolumeDown = (event: PointerEvent) => {
    volumeBar?.setPointerCapture(event.pointerId);
    volumeFromPointer(event);
  };

  const onVolumeMove = (event: PointerEvent) => {
    if (!volumeBar?.hasPointerCapture(event.pointerId)) return;
    volumeFromPointer(event);
  };

  const openRateMenu = () => {
    if (!rateButton) return;
    const rect = rateButton.getBoundingClientRect();
    const estimatedHeight = playbackRates.length * 32 + 10;
    setRateMenu({ x: rect.right - 180, y: rect.top - estimatedHeight - 6 });
  };

  const rateItems = (): MenuItem[] =>
    playbackRates.map((value) => ({
      label: value === 1 ? "正常速度" : `${value}×`,
      checked: rate() === value,
      onSelect: () => {
        setRate(value);
        if (media) media.playbackRate = value;
      },
    }));

  const mediaKindIcon = (item: MediaItem) =>
    mediaKindOf(item.name) === "audio" ? (
      <IconAudio size={20} />
    ) : (
      <IconVideo size={20} />
    );

  createEffect(
    () => props.path,
    () => {
      const element = media;
      setError(null);
      setAutoplayBlocked(false);
      setCurrentTime(0);
      setDuration(0);
      setBuffered(0);
      setBuffering(true);
      if (!element) return;
      element.load();
      element.playbackRate = rate();
      element.loop = loop();
      requestPlay();
    },
  );

  createEffect(
    () => loop(),
    (value) => {
      if (media) media.loop = value;
    },
  );

  createEffect(
    () => playlistOpen(),
    (open) => {
      if (!open) return;
      requestAnimationFrame(() => {
        root
          ?.querySelector<HTMLElement>(".playlist-item--current")
          ?.scrollIntoView({ block: "nearest" });
      });
    },
  );

  onSettled(() => {
    document.body.classList.add("overlay-open");
    if (media) {
      media.volume = volume();
      media.playbackRate = rate();
      media.loop = loop();
    }

    const onFullscreenChange = () =>
      setFullscreen(Boolean(document.fullscreenElement));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.tagName === "BUTTON" && event.key === " ") return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          event.preventDefault();
          seekTo(currentTime() - 5);
          break;
        case "ArrowRight":
          event.preventDefault();
          seekTo(currentTime() + 5);
          break;
        case "ArrowUp":
          event.preventDefault();
          updateVolume(volume() + 0.05);
          break;
        case "ArrowDown":
          event.preventDefault();
          updateVolume(volume() - 0.05);
          break;
        case "m":
        case "M":
          event.preventDefault();
          toggleMute();
          break;
        case "f":
        case "F":
          event.preventDefault();
          toggleFullscreen();
          break;
        case "n":
        case "N":
          event.preventDefault();
          goNext();
          break;
        case "p":
        case "P":
          event.preventDefault();
          goPrevious();
          break;
        case "Escape":
          if (document.fullscreenElement) return;
          event.preventDefault();
          close();
          break;
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("overlay-open");
      if (document.fullscreenElement)
        void document.exitFullscreen().catch(() => {});
    });
  });

  return (
    <div
      ref={root}
      class={["player", { "player--audio": props.kind === "audio" }]}
    >
      <div class="player-glow" aria-hidden="true" />

      <div class="player-shell">
        <header class="player-topbar">
          <IconButton
            label="关闭播放器"
            class="player-icon-button"
            onClick={close}
          >
            <IconChevronLeft size={20} />
          </IconButton>
          <div class="player-heading">
            <span class="player-title" title={title()}>
              {title()}
            </span>
            <span class="player-subtitle">
              {directory() || "根目录"}
              <span class="player-dot">·</span>
              {props.items.length > 0
                ? `${itemIndex() + 1} / ${props.items.length}`
                : ""}
            </span>
          </div>
          <div class="player-top-actions">
            <IconButton
              label="下载"
              class="player-icon-button"
              onClick={downloadCurrent}
            >
              <IconDownload size={18} />
            </IconButton>
            <IconButton
              label="播放列表"
              class="player-icon-button"
              active={playlistOpen()}
              onClick={() => setPlaylistOpen((open) => !open)}
            >
              <IconPlaylist size={19} />
            </IconButton>
          </div>
        </header>

        <div class="player-stage">
          <video
            ref={(element) => {
              media = element;
            }}
            class="player-media"
            src={rawUrl(props.path)}
            playsinline
            preload="metadata"
            onClick={togglePlay}
            onPlay={() => {
              setPlaying(true);
              setAutoplayBlocked(false);
              setBuffering(false);
            }}
            onPause={() => setPlaying(false)}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => setBuffering(false)}
            onCanPlay={() => setBuffering(false)}
            onLoadedMetadata={() => {
              if (!media) return;
              setDuration(Number.isFinite(media.duration) ? media.duration : 0);
              media.volume = volume();
              media.playbackRate = rate();
              media.loop = loop();
            }}
            onDurationChange={() => {
              if (!media) return;
              setDuration(Number.isFinite(media.duration) ? media.duration : 0);
            }}
            onTimeUpdate={() => {
              if (!media || scrubbing()) return;
              setCurrentTime(media.currentTime);
            }}
            onProgress={() => {
              if (!media) return;
              const ranges = media.buffered;
              setBuffered(
                ranges.length > 0 ? ranges.end(ranges.length - 1) : 0,
              );
            }}
            onEnded={() => {
              setPlaying(false);
              if (hasNext()) goNext();
            }}
            onError={() => {
              const message = errorMessage();
              setError(message);
              setBuffering(false);
              props.onToast(message);
            }}
          />

          <Show when={props.kind === "audio"}>
            <div
              class={["player-artwork", { "is-playing": playing() }]}
              onClick={togglePlay}
            >
              <div class="artwork-disc">
                <IconMusicNote size={82} />
              </div>
              <div class="audio-visualizer" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div class="artwork-title">{title()}</div>
              <div class="artwork-subtitle">音频</div>
            </div>
          </Show>

          <Show when={buffering()}>
            <div class="player-spinner" role="status" aria-label="正在载入" />
          </Show>

          <Show when={!playing() && !error() && !buffering()}>
            <button
              type="button"
              class="player-bigplay"
              aria-label={autoplayBlocked() ? "点击播放" : "播放"}
              onClick={togglePlay}
            >
              <IconPlay size={30} />
            </button>
          </Show>

          <Show when={error()}>
            {(message) => (
              <div class="player-error">
                <strong>无法播放</strong>
                <span>{message()}</span>
                <div class="player-error-actions">
                  <button
                    type="button"
                    class="player-text-button"
                    onClick={requestPlay}
                  >
                    重试
                  </button>
                  <button
                    type="button"
                    class="player-text-button"
                    onClick={downloadCurrent}
                  >
                    下载文件
                  </button>
                </div>
              </div>
            )}
          </Show>
        </div>

        <footer class="player-controls">
          <div class="player-progress-row">
            <span class="player-time">{formatDuration(displayedTime())}</span>
            <div
              ref={progressBar}
              class={["player-progress", { "is-scrubbing": scrubbing() }]}
              role="slider"
              aria-label="播放进度"
              aria-valuemin="0"
              aria-valuemax={Math.round(duration())}
              aria-valuenow={Math.round(currentTime())}
              title="拖动调整进度"
              onPointerDown={onProgressDown}
              onPointerMove={onProgressMove}
              onPointerUp={onProgressUp}
              onPointerCancel={onProgressCancel}
            >
              <div class="player-progress-rail">
                <div
                  class="player-progress-buffer"
                  style={{ width: `${bufferedPercent()}%` }}
                />
                <div
                  class="player-progress-fill"
                  style={{ width: `${progressPercent()}%` }}
                />
              </div>
              <span
                class="player-progress-thumb"
                style={{ left: `${progressPercent()}%` }}
              />
            </div>
            <span class="player-time player-time--right">
              {formatDuration(duration())}
            </span>
          </div>

          <div class="player-control-row">
            <div class="player-volume">
              <IconButton
                label={muted() || volume() === 0 ? "取消静音" : "静音"}
                class="player-icon-button"
                onClick={toggleMute}
              >
                <Show
                  when={muted() || volume() === 0}
                  fallback={<IconVolume size={19} />}
                >
                  <IconVolumeMute size={19} />
                </Show>
              </IconButton>
              <div
                ref={volumeBar}
                class="player-volume-bar"
                role="slider"
                aria-label="音量"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={Math.round(volumePercent())}
                onPointerDown={onVolumeDown}
                onPointerMove={onVolumeMove}
              >
                <div class="player-volume-rail">
                  <div
                    class="player-volume-fill"
                    style={{ width: `${volumePercent()}%` }}
                  />
                </div>
                <span
                  class="player-volume-thumb"
                  style={{ left: `${volumePercent()}%` }}
                />
              </div>
            </div>

            <div class="player-transport">
              <IconButton
                label="上一个"
                class="player-icon-button"
                disabled={!hasPrevious()}
                onClick={goPrevious}
              >
                <IconPrevious size={21} />
              </IconButton>
              <button
                type="button"
                class="player-play-button"
                aria-label={playing() ? "暂停" : "播放"}
                onClick={togglePlay}
              >
                <Show when={playing()} fallback={<IconPlay size={22} />}>
                  <IconPause size={22} />
                </Show>
              </button>
              <IconButton
                label="下一个"
                class="player-icon-button"
                disabled={!hasNext()}
                onClick={goNext}
              >
                <IconNext size={21} />
              </IconButton>
            </div>

            <div class="player-flags">
              <button
                ref={rateButton}
                type="button"
                class="player-rate-button"
                aria-haspopup="menu"
                aria-label={`播放速度 ${rate()} 倍`}
                onClick={openRateMenu}
              >
                {rate()}×
              </button>
              <IconButton
                label="循环播放"
                class="player-icon-button"
                active={loop()}
                onClick={() => setLoop((value) => !value)}
              >
                <IconRepeat size={18} />
              </IconButton>
              <IconButton
                label={fullscreen() ? "退出全屏" : "全屏"}
                class="player-icon-button"
                onClick={toggleFullscreen}
              >
                <IconFullscreen size={18} />
              </IconButton>
            </div>
          </div>
        </footer>
      </div>

      <Show when={playlistOpen()}>
        <>
          <div class="playlist-scrim" onClick={() => setPlaylistOpen(false)} />
          <aside class="player-playlist" aria-label="播放列表">
            <header class="playlist-header">
              <div>
                <span class="playlist-title">播放列表</span>
                <span class="playlist-count">
                  {props.items.length} 个媒体文件
                </span>
              </div>
              <button
                type="button"
                class="playlist-close"
                aria-label="关闭播放列表"
                onClick={() => setPlaylistOpen(false)}
              >
                <IconClose size={16} />
              </button>
            </header>
            <div class="playlist-items">
              <For each={props.items}>
                {(item, index) => (
                  <button
                    type="button"
                    class={[
                      "playlist-item",
                      {
                        "playlist-item--current": item.path === props.path,
                      },
                    ]}
                    onClick={() => props.onNavigate(item.path)}
                  >
                    <span class="playlist-icon">{mediaKindIcon(item)}</span>
                    <span class="playlist-text">
                      <span class="playlist-name" title={item.name}>
                        {item.name}
                      </span>
                      <span class="playlist-meta">
                        {mediaKindOf(item.name) === "audio" ? "音频" : "视频"}
                      </span>
                    </span>
                    <Show when={item.path === props.path}>
                      <span class="playlist-current">
                        {playing() ? (
                          <span class="playlist-wave" />
                        ) : (
                          <IconCheck size={16} />
                        )}
                      </span>
                    </Show>
                    <span class="playlist-index">{index() + 1}</span>
                  </button>
                )}
              </For>
            </div>
          </aside>
        </>
      </Show>

      <Show when={rateMenu()}>
        {(position) => (
          <Menu
            x={position().x}
            y={position().y}
            items={rateItems()}
            onClose={() => setRateMenu(null)}
          />
        )}
      </Show>
    </div>
  );
}
