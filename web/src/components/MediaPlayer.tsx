import isTouchDevice from "@/lib/isTouchDevice";
import request from "@/lib/request";
import { useNavigate, useParams } from "@solidjs/router";
import {
  IconArrowLeft,
  IconList,
  IconLoader2,
  IconMaximize,
  IconMusic,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerTrackNextFilled,
  IconPlayerTrackPrevFilled,
  IconRepeat,
  IconRepeatOnce,
  IconVideoFilled,
  IconVolume,
  IconVolume3,
} from "@tabler/icons-solidjs";
import { useQuery } from "@tanstack/solid-query";
import mime from "mime";
import {
  createEffect,
  createMemo,
  createSignal,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js";
import {
  browseUrl,
  decodePath,
  fileLinkUrl,
  filesUrl,
  joinPath,
  playUrl,
} from "@/lib/path";
import {
  clearPlaybackProgress,
  loadPlaybackProgress,
  loadPlayerPreferences,
  PLAYBACK_RATES,
  savePlaybackProgress,
  savePlayerPreferences,
  type RepeatMode,
} from "@/lib/playerPreferences";

function formatDuration(seconds: number) {
  // 确保秒数为非负数
  const sec = Math.max(0, seconds);
  // 计算分钟（向下取整）
  const minutes = Math.floor(sec / 60);
  // 计算剩余秒数（补零到两位数）
  const remainingSeconds = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

const MediaPlayer = () => {
  const params: { uri: string } = useParams();
  const navigate = useNavigate();
  // useParams 返回 URL 原始编码路径，先解码再用于接口与拼接。
  const uri = createMemo(() => decodePath(params.uri));
  const type = createMemo(() => mime.getType(uri()));
  const isVideo = createMemo(() => type()?.startsWith("video") === true);
  const path = createMemo(() => uri().split("/").slice(0, -1).join("/"));
  const currentName = createMemo(() => uri().split("/").pop() ?? "");
  const originalTitle = document.title;

  /* 播放列表 */
  const query = useQuery(() => ({
    queryKey: [path()],
    queryFn: ({ queryKey }) =>
      request.get<never, BaseResponse<FileEntryItem[]>>(
        filesUrl(queryKey[0]),
      ),
  }));

  const mediaFiles = createMemo(() =>
    (query.data?.data ?? []).filter(
      (entry) =>
        mime.getType(entry.name)?.startsWith("audio/") ||
        mime.getType(entry.name)?.startsWith("video/"),
    ),
  );
  const [showPlayList, setShowPlayList] = createSignal(false);
  let playListRef: HTMLDivElement | undefined;
  /* 播放列表 end */

  /* 播放器控制 */
  const preferences = loadPlayerPreferences();
  const [showControls, setShowControls] = createSignal(true); // 控制播放器控制栏的显示与隐藏
  let hideTimer: ReturnType<typeof setTimeout> | undefined; // 用于控制隐藏播放器控制栏的定时器

  const [playerState, setPlayerState] = createSignal({
    playing: false,
    currentTime: 0,
    duration: 0,
    waiting: false,
  }); // 播放器状态
  const [volume, setVolume] = createSignal(preferences.volume);
  const [muted, setMuted] = createSignal(preferences.muted);
  const [playbackRate, setPlaybackRate] = createSignal(preferences.playbackRate);
  const [repeatMode, setRepeatMode] = createSignal<RepeatMode>(
    preferences.repeatMode,
  );
  const [playbackError, setPlaybackError] = createSignal<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = createSignal(false);
  const [autoplayMuted, setAutoplayMuted] = createSignal(false);
  let videoPlayerRef: HTMLVideoElement | undefined; // 视频播放器引用
  let audioPlayerRef: HTMLAudioElement | undefined; // 音频播放器引用
  let progressRestored = false;
  let lastProgressSave = 0;
  /* 播放器控制 end */

  const activePlayer = (): HTMLMediaElement | undefined =>
    isVideo() ? videoPlayerRef : audioPlayerRef;

  const currentIndex = createMemo(() =>
    mediaFiles().findIndex((file) => file.name === currentName()),
  );

  const persistPreferences = () => {
    savePlayerPreferences({
      volume: volume(),
      muted: muted(),
      playbackRate: playbackRate(),
      repeatMode: repeatMode(),
    });
  };

  const clearHideTimer = () => {
    if (hideTimer !== undefined) {
      clearTimeout(hideTimer);
      hideTimer = undefined;
    }
  };

  const scheduleHide = () => {
    clearHideTimer();
    if (
      !playerState().playing ||
      showPlayList() ||
      autoplayBlocked() ||
      playbackError()
    ) {
      return;
    }
    hideTimer = setTimeout(() => setShowControls(false), 3000);
  };

  const revealControls = () => {
    setShowControls(true);
    scheduleHide();
  };

  /* 进度记忆 */
  const progressUri = (element: HTMLMediaElement) => {
    try {
      const pathname = new URL(element.currentSrc || element.src).pathname;
      const prefix = "/file_link/";
      return pathname.startsWith(prefix)
        ? decodePath(pathname.slice(prefix.length))
        : uri();
    } catch {
      return uri();
    }
  };

  const saveProgressFor = (element: HTMLMediaElement) => {
    if (element.ended) {
      return;
    }
    savePlaybackProgress(progressUri(element), element.currentTime);
  };

  const saveCurrentProgress = () => {
    const player = activePlayer();
    if (player) {
      saveProgressFor(player);
    }
  };
  /* 进度记忆 end */

  const playOffset = (offset: number) => {
    const list = mediaFiles();
    if (list.length === 0) {
      return;
    }

    saveCurrentProgress();
    const index = currentIndex();
    const next =
      index < 0
        ? offset > 0
          ? 0
          : list.length - 1
        : (index + offset + list.length) % list.length;
    navigate(playUrl(joinPath(path(), list[next].name)));
  };

  const seekTo = (time: number) => {
    const player = activePlayer();
    if (!player || !Number.isFinite(player.duration)) {
      return;
    }
    const next = Math.min(Math.max(time, 0), player.duration);
    player.currentTime = next;
    setPlayerState((prev) => ({ ...prev, currentTime: next }));
  };

  const seekBy = (delta: number) => {
    const player = activePlayer();
    if (player) {
      seekTo(player.currentTime + delta);
    }
  };

  const setPlayerVolume = (value: number) => {
    const player = activePlayer();
    if (!player) {
      return;
    }
    const next = Math.min(1, Math.max(0, value));
    player.volume = next;
    player.muted = next === 0;
    setVolume(next);
    setMuted(player.muted);
    persistPreferences();
  };

  const toggleMute = () => {
    const player = activePlayer();
    if (!player) {
      return;
    }
    player.muted = !player.muted;
    setMuted(player.muted);
    setAutoplayMuted(false);
    persistPreferences();
  };

  const unmute = () => {
    const player = activePlayer();
    if (!player) {
      return;
    }
    player.muted = false;
    if (player.volume === 0) {
      player.volume = 1;
    }
    setMuted(false);
    setVolume(player.volume);
    setAutoplayMuted(false);
    persistPreferences();
  };

  const cyclePlaybackRate = () => {
    const current = playbackRate() as (typeof PLAYBACK_RATES)[number];
    const index = Math.max(PLAYBACK_RATES.indexOf(current), 0);
    const next = PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length];
    const player = activePlayer();
    if (player) {
      player.playbackRate = next;
    }
    setPlaybackRate(next);
    persistPreferences();
  };

  const cycleRepeatMode = () => {
    const modes: RepeatMode[] = ["off", "all", "one"];
    const next = modes[(modes.indexOf(repeatMode()) + 1) % modes.length];
    setRepeatMode(next);
    persistPreferences();
  };

  const applyPreferences = (player: HTMLMediaElement) => {
    player.volume = volume();
    player.muted = muted();
    player.playbackRate = playbackRate();
  };

  const tryAutoplay = async (player: HTMLMediaElement) => {
    try {
      await player.play();
    } catch {
      // 有声自动播放被浏览器拦截时，先静音播放并提示用户。
      player.muted = true;
      setMuted(true);
      try {
        await player.play();
        setAutoplayMuted(true);
      } catch {
        setAutoplayBlocked(true);
        setShowControls(true);
      }
    }
  };

  /* 切换媒体 */
  createEffect(() => {
    uri();
    setPlayerState((prev) => ({
      ...prev,
      playing: false,
      currentTime: 0,
      duration: 0,
      waiting: false,
    }));
    setPlaybackError(null);
    setAutoplayBlocked(false);
    setAutoplayMuted(false);
    setShowPlayList(false);
    setShowControls(true);
    progressRestored = false;
    lastProgressSave = 0;

    const timer = setTimeout(() => {
      const player = activePlayer();
      if (player) {
        void tryAutoplay(player);
      }
    }, 50);
    onCleanup(() => clearTimeout(timer));
  });
  /* 切换媒体 end */

  /* 在网页标题中显示文件名 */
  createEffect(() => {
    document.title = `${playerState().playing ? "正在播放" : "已暂停"}: ${currentName()}`;
  });
  /* end */

  /* 播放列表打开时滚动到当前项 */
  createEffect(() => {
    if (!showPlayList()) {
      return;
    }
    currentName();
    mediaFiles();
    queueMicrotask(() => {
      playListRef
        ?.querySelector<HTMLElement>('[data-current="true"]')
        ?.scrollIntoView({ block: "nearest" });
    });
  });
  /* end */

  /* 切换播放状态 */
  const tooglePlay = () => {
    const player = activePlayer();
    if (!player) {
      return;
    }
    if (player.paused) {
      void player.play().catch(() => setAutoplayBlocked(true));
    } else {
      player.pause();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
    ) {
      return;
    }

    switch (event.key) {
      case " ":
      case "k":
      case "K":
        event.preventDefault();
        tooglePlay();
        break;
      case "ArrowLeft":
        event.preventDefault();
        seekBy(-5);
        break;
      case "ArrowRight":
        event.preventDefault();
        seekBy(5);
        break;
      case "ArrowUp":
        event.preventDefault();
        setPlayerVolume((activePlayer()?.volume ?? volume()) + 0.1);
        break;
      case "ArrowDown":
        event.preventDefault();
        setPlayerVolume((activePlayer()?.volume ?? volume()) - 0.1);
        break;
      case "m":
      case "M":
        toggleMute();
        break;
      case "f":
      case "F":
        enterFullscreen();
        break;
      case "n":
      case "N":
        playOffset(1);
        break;
      case "p":
      case "P":
        playOffset(-1);
        break;
      case "Escape":
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        }
        break;
    }
  };
  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
  });
  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });
  /* 切换播放状态 end */

  const enterFullscreen = () => {
    const player = videoPlayerRef;
    if (!player) {
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    const legacy = player as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
    };
    if (typeof player.requestFullscreen === "function") {
      void player
        .requestFullscreen()
        .catch(() => legacy.webkitEnterFullscreen?.());
    } else {
      legacy.webkitEnterFullscreen?.();
    }
  };

  const handleLoadedMetadata = (element: HTMLMediaElement) => {
    const duration = Number.isFinite(element.duration) ? element.duration : 0;
    setPlayerState((prev) => ({ ...prev, duration }));
    element.playbackRate = playbackRate();

    if (!progressRestored) {
      const saved = loadPlaybackProgress(progressUri(element));
      if (saved > 0 && duration > 0 && saved < duration - 2) {
        element.currentTime = saved;
      }
      progressRestored = true;
    }
  };

  const handleTimeUpdate = (element: HTMLMediaElement) => {
    const duration = Number.isFinite(element.duration) ? element.duration : 0;
    setPlayerState((prev) => ({
      ...prev,
      currentTime: Number.isFinite(element.currentTime)
        ? element.currentTime
        : 0,
      duration,
    }));

    const now = Date.now();
    if (now - lastProgressSave > 5000) {
      lastProgressSave = now;
      saveProgressFor(element);
    }
  };

  const handleEnded = (element: HTMLMediaElement) => {
    setPlayerState((prev) => ({ ...prev, playing: false }));
    clearPlaybackProgress(progressUri(element));

    if (repeatMode() === "one") {
      element.currentTime = 0;
      void element.play().catch(() => {});
      return;
    }

    const list = mediaFiles();
    if (list.length <= 1) {
      if (repeatMode() === "all") {
        element.currentTime = 0;
        void element.play().catch(() => {});
      } else {
        setShowControls(true);
        clearHideTimer();
      }
      return;
    }

    const index = currentIndex();
    if (repeatMode() === "all" || (index >= 0 && index < list.length - 1)) {
      playOffset(1);
      return;
    }

    setShowControls(true);
    clearHideTimer();
  };

  const handleMediaError = (element: HTMLMediaElement) => {
    const code = element.error?.code;
    const message =
      code === 4
        ? "浏览器不支持该文件格式"
        : code === 2
          ? "网络错误，无法加载文件"
          : code === 3
            ? "文件解码失败"
            : "无法播放该文件";
    setPlaybackError(message);
    setPlayerState((prev) => ({ ...prev, playing: false, waiting: false }));
    setShowControls(true);
    clearHideTimer();
  };

  const togglePlayList = () => {
    const next = !showPlayList();
    setShowPlayList(next);
    if (next) {
      clearHideTimer();
      setShowControls(true);
    } else {
      scheduleHide();
    }
  };

  onCleanup(() => {
    saveCurrentProgress();
    document.title = originalTitle;
    clearHideTimer();
  });

  return (
    <div
      class={"relative h-[100dvh] w-full overflow-hidden bg-black text-white"}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      onDblClick={() => {
        if (isTouchDevice()) {
          tooglePlay();
        }
      }}
      onClick={() => {
        if (showPlayList()) {
          setShowPlayList(false);
          scheduleHide();
          return;
        }

        revealControls();
        if (!isTouchDevice()) {
          tooglePlay();
        }
      }}
    >
      <button
        class={
          "absolute top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] z-30 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
        }
        aria-label="返回文件列表"
        onClick={(ev) => {
          ev.stopPropagation();
          saveCurrentProgress();
          navigate(browseUrl(path()));
        }}
      >
        <IconArrowLeft class={"size-6"} />
      </button>

      <Show when={autoplayMuted()}>
        <button
          class={
            "absolute top-[max(1rem,env(safe-area-inset-top))] left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow-lg"
          }
          onClick={(ev) => {
            ev.stopPropagation();
            unmute();
          }}
        >
          已静音播放，点击开启声音
        </button>
      </Show>

      <Show when={playbackError()}>
        <div
          class={
            "absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center text-white"
          }
          onClick={(ev) => ev.stopPropagation()}
        >
          <p>{playbackError()}</p>
          <a
            href={fileLinkUrl(uri())}
            download={currentName()}
            class={
              "rounded-lg bg-blue-500 px-4 py-2 text-white active:bg-blue-600"
            }
            onClick={(ev) => ev.stopPropagation()}
          >
            下载文件
          </a>
        </div>
      </Show>

      <Show when={playerState().waiting && !playbackError()}>
        <div
          class={
            "pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          }
        >
          <IconLoader2 class={"size-10 animate-spin text-white/80"} />
        </div>
      </Show>

      <Show when={autoplayBlocked() && !playbackError()}>
        <button
          class={
            "absolute inset-0 z-20 flex items-center justify-center"
          }
          aria-label="播放"
          onClick={(ev) => {
            ev.stopPropagation();
            setAutoplayBlocked(false);
            tooglePlay();
          }}
        >
          <span class={"rounded-full bg-black/60 p-6"}>
            <IconPlayerPlayFilled class={"size-12 text-white"} />
          </span>
        </button>
      </Show>

      <Show when={type()?.startsWith("audio")}>
        <div
          class={
            "flex h-[calc(100dvh-140px)] flex-col items-center justify-center gap-4 px-6"
          }
        >
          <IconMusic class={"size-20 animate-pulse text-white"} />
          <p class={"max-w-[80vw] truncate text-lg"}>{currentName()}</p>
        </div>
      </Show>

      <div
        class={
          "controls-wrap fixed bottom-0 left-0 z-10 flex w-full justify-center px-3 pb-[env(safe-area-inset-bottom)]"
        }
      >
        <div
          onClick={(ev) => {
            ev.stopPropagation();
          }}
          onMouseOver={revealControls}
          style={{
            opacity: showControls() ? 1 : 0,
            visibility: showControls() ? "visible" : "hidden",
          }}
          class={
            "controls relative w-full max-w-3xl rounded-2xl bg-black/55 px-4 py-3 text-white shadow-2xl backdrop-blur-md transition-all duration-300 md:px-6"
          }
        >
          <div
            ref={playListRef}
            class={`absolute bottom-[calc(100%+8px)] left-0 z-50 max-h-[50dvh] w-full overflow-auto rounded-xl bg-white text-gray-900 shadow-xl transition-all duration-200 ${showPlayList() ? "visible opacity-100" : "invisible opacity-0"}`}
          >
            {mediaFiles().length === 0 ? (
              <p class={"p-4 text-sm text-gray-500"}>没有可播放的文件</p>
            ) : (
              <ul>
                {mediaFiles().map((file) => (
                  <li class={"border-t border-gray-100 first:border-t-0"}>
                    <button
                      data-current={
                        currentName() === file.name ? "true" : undefined
                      }
                      aria-current={
                        currentName() === file.name ? "true" : undefined
                      }
                      class={`flex h-10 w-full cursor-pointer items-center px-3 text-left transition-colors ${currentName() === file.name ? "bg-blue-100 font-medium" : "hover:bg-blue-50 active:bg-blue-100"}`}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        saveCurrentProgress();
                        navigate(playUrl(joinPath(path(), file.name)));
                        setShowPlayList(false);
                      }}
                    >
                      {mime.getType(file.name)?.startsWith("audio/") ? (
                        <IconMusic class={"size-5 shrink-0 text-blue-500"} />
                      ) : (
                        <IconVideoFilled
                          class={"size-5 shrink-0 text-blue-500"}
                        />
                      )}
                      <span class={"ml-2 truncate"}>{file.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div class={"flex items-center gap-2 text-xs tabular-nums"}>
            <span class={"w-10 text-right"}>
              {formatDuration(playerState().currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={Math.max(playerState().duration, 0)}
              step="0.1"
              value={playerState().currentTime}
              aria-label="播放进度"
              onInput={(ev) => seekTo(Number(ev.currentTarget.value))}
              class={"h-1.5 flex-1 cursor-pointer accent-blue-500"}
            />
            <span class={"w-10"}>
              {formatDuration(playerState().duration)}
            </span>
          </div>

          <div class="mt-2 flex items-center justify-between">
            <div class="flex items-center gap-1">
              <button
                class={
                  "cursor-pointer rounded-lg p-1 transition-colors hover:bg-white/15 active:bg-white/25"
                }
                aria-label="播放列表"
                aria-expanded={showPlayList()}
                onClick={togglePlayList}
              >
                <IconList class="size-6" />
              </button>
              <button
                class={
                  "cursor-pointer rounded-lg p-1 transition-colors hover:bg-white/15 active:bg-white/25"
                }
                aria-label={
                  repeatMode() === "off"
                    ? "开启列表循环"
                    : repeatMode() === "all"
                      ? "切换单曲循环"
                      : "关闭循环"
                }
                onClick={cycleRepeatMode}
              >
                <Show
                  when={repeatMode() === "one"}
                  fallback={
                    <IconRepeat
                      class={`size-6 ${repeatMode() === "off" ? "opacity-40" : ""}`}
                    />
                  }
                >
                  <IconRepeatOnce class="size-6" />
                </Show>
              </button>
            </div>

            <div class="flex items-center gap-1">
              <button
                class={
                  "rounded-lg p-1 transition-colors hover:bg-white/15 active:bg-white/25"
                }
                aria-label="上一个"
                onClick={() => {
                  playOffset(-1);
                }}
              >
                <IconPlayerTrackPrevFilled class={"size-7"} />
              </button>
              <button
                class={
                  "mx-1 rounded-lg p-1 transition-colors hover:bg-white/15 active:bg-white/25"
                }
                aria-label={playerState().playing ? "暂停" : "播放"}
                onClick={tooglePlay}
              >
                {playerState().playing ? (
                  <IconPlayerPauseFilled class={"size-8"} />
                ) : (
                  <IconPlayerPlayFilled class={"size-8"} />
                )}
              </button>
              <button
                class={
                  "rounded-lg p-1 transition-colors hover:bg-white/15 active:bg-white/25"
                }
                aria-label="下一个"
                onClick={() => {
                  playOffset(1);
                }}
              >
                <IconPlayerTrackNextFilled class={"size-7"} />
              </button>
            </div>

            <div class="flex items-center gap-1">
              <button
                class={
                  "min-w-10 rounded-lg px-1 py-1 text-xs transition-colors hover:bg-white/15 active:bg-white/25"
                }
                aria-label={`播放速度 ${playbackRate()} 倍`}
                onClick={cyclePlaybackRate}
              >
                {playbackRate()}x
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted() ? 0 : volume()}
                aria-label="音量"
                onInput={(ev) =>
                  setPlayerVolume(Number(ev.currentTarget.value))
                }
                class={"hidden w-20 cursor-pointer accent-blue-500 md:block"}
              />
              <button
                class={
                  "rounded-lg p-1 transition-colors hover:bg-white/15 active:bg-white/25"
                }
                aria-label={muted() ? "取消静音" : "静音"}
                onClick={toggleMute}
              >
                {muted() ? (
                  <IconVolume3 class={"size-6"} />
                ) : (
                  <IconVolume class={"size-6"} />
                )}
              </button>
              <Show when={isVideo()}>
                <button
                  class={
                    "rounded-lg p-1 transition-colors hover:bg-white/15 active:bg-white/25"
                  }
                  aria-label="全屏"
                  onClick={enterFullscreen}
                >
                  <IconMaximize class={"size-6"} />
                </button>
              </Show>
            </div>
          </div>
        </div>
      </div>

      <Switch>
        <Match when={type()?.startsWith("audio")}>
          <audio
            src={fileLinkUrl(uri())}
            ref={(element) => {
              audioPlayerRef = element;
              applyPreferences(element);
            }}
            preload="metadata"
            autoplay={true}
            onPlay={() => {
              setPlayerState((prev) => ({
                ...prev,
                playing: true,
                waiting: false,
              }));
              setAutoplayBlocked(false);
              setShowControls(true);
              scheduleHide();
            }}
            onPause={(ev) => {
              setPlayerState((prev) => ({ ...prev, playing: false }));
              setShowControls(true);
              clearHideTimer();
              saveProgressFor(ev.currentTarget);
            }}
            onEnded={(ev) => handleEnded(ev.currentTarget)}
            onError={(ev) => handleMediaError(ev.currentTarget)}
            onLoadedMetadata={(ev) => handleLoadedMetadata(ev.currentTarget)}
            onTimeUpdate={(ev) => handleTimeUpdate(ev.currentTarget)}
            onWaiting={() =>
              setPlayerState((prev) => ({ ...prev, waiting: true }))
            }
            onPlaying={() =>
              setPlayerState((prev) => ({ ...prev, waiting: false }))
            }
            onCanPlay={() =>
              setPlayerState((prev) => ({ ...prev, waiting: false }))
            }
          />
        </Match>
        <Match when={isVideo()}>
          <video
            ref={(element) => {
              videoPlayerRef = element;
              applyPreferences(element);
            }}
            class={"h-[100dvh] w-full bg-black object-contain"}
            src={fileLinkUrl(uri())}
            preload="metadata"
            autoplay={true}
            playsinline={true}
            onPlay={() => {
              setPlayerState((prev) => ({
                ...prev,
                playing: true,
                waiting: false,
              }));
              setAutoplayBlocked(false);
              setShowControls(true);
              scheduleHide();
            }}
            onPause={(ev) => {
              setPlayerState((prev) => ({ ...prev, playing: false }));
              setShowControls(true);
              clearHideTimer();
              saveProgressFor(ev.currentTarget);
            }}
            onEnded={(ev) => handleEnded(ev.currentTarget)}
            onError={(ev) => handleMediaError(ev.currentTarget)}
            onLoadedMetadata={(ev) => handleLoadedMetadata(ev.currentTarget)}
            onTimeUpdate={(ev) => handleTimeUpdate(ev.currentTarget)}
            onWaiting={() =>
              setPlayerState((prev) => ({ ...prev, waiting: true }))
            }
            onPlaying={() =>
              setPlayerState((prev) => ({ ...prev, waiting: false }))
            }
            onCanPlay={() =>
              setPlayerState((prev) => ({ ...prev, waiting: false }))
            }
          />
        </Match>
      </Switch>
    </div>
  );
};

export default MediaPlayer;
