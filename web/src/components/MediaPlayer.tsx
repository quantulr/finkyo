import isTouchDevice from "@/lib/isTouchDevice";
import request from "@/lib/request";
import { useNavigate, useParams } from "@solidjs/router";
import {
  IconList,
  IconMaximize,
  IconMusic,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerTrackNextFilled,
  IconPlayerTrackPrevFilled,
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
import { decodePath, fileLinkUrl, filesUrl, joinPath, playUrl } from "@/lib/path";

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
  const path = createMemo(() => uri().split("/").slice(0, -1).join("/"));
  const currentName = createMemo(() => uri().split("/").pop() ?? "");

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
  /* 播放列表 end */

  /* 播放器控制 */
  const [showControls, setShowControls] = createSignal(true); // 控制播放器控制栏的显示与隐藏
  let timeout: ReturnType<typeof setTimeout> | undefined; // 用于控制隐藏播放器控制栏的定时器

  const [playerState, setPlayerState] = createSignal({
    playing: false,
    currentTime: 0,
    duration: 0,
    muted: false,
  }); // 播放器状态
  const [playbackError, setPlaybackError] = createSignal(false);
  let videoPlayerRef: HTMLVideoElement | undefined; // 视频播放器引用
  let audioPlayerRef: HTMLAudioElement | undefined; // 音频播放器引用
  /* 播放器控制 end */

  const currentIndex = createMemo(() =>
    mediaFiles().findIndex((file) => file.name === currentName()),
  );

  const playOffset = (offset: number) => {
    const list = mediaFiles();
    if (list.length === 0) {
      return;
    }

    const index = currentIndex();
    const next =
      index < 0
        ? offset > 0
          ? 0
          : list.length - 1
        : (index + offset + list.length) % list.length;
    navigate(playUrl(joinPath(path(), list[next].name)));
  };

  /* 切换媒体 */
  createEffect(() => {
    uri();
    setPlayerState((prev) => ({
      ...prev,
      playing: false,
      currentTime: 0,
      duration: 0,
    }));
    setPlaybackError(false);

    const timer = setTimeout(() => {
      const player = type()?.startsWith("video")
        ? videoPlayerRef
        : audioPlayerRef;
      void player?.play().catch(() => {});
    }, 50);
    onCleanup(() => clearTimeout(timer));
  });
  /* 切换媒体 end */

  /* 在网页标题中显示文件名 */
  createEffect(() => {
    const title = `${playerState().playing ? "正在播放" : "已暂停"}: ${currentName()}`;
    document.title = title;
  });
  /* end */

  /* 切换播放状态 */
  const tooglePlay = () => {
    if (videoPlayerRef && type()?.startsWith("video")) {
      if (playerState().playing) {
        videoPlayerRef.pause();
      } else {
        void videoPlayerRef.play().catch(() => {});
      }
    } else if (audioPlayerRef && type()?.startsWith("audio")) {
      if (playerState().playing) {
        audioPlayerRef.pause();
      } else {
        void audioPlayerRef.play().catch(() => {});
      }
    }
  };
  const handleKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === " ") {
      ev.preventDefault();
      tooglePlay();
    }
  };
  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
  });
  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });
  /* 切换播放状态 end */

  const toggleMute = () => {
    const player = videoPlayerRef ?? audioPlayerRef;
    if (!player) {
      return;
    }
    player.muted = !player.muted;
    setPlayerState((prev) => ({ ...prev, muted: player.muted }));
  };

  const enterFullscreen = () => {
    if (!videoPlayerRef) {
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void videoPlayerRef.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div
      class={"relative h-[100dvh] bg-black"}
      onDblClick={() => {
        if (isTouchDevice()) {
          tooglePlay();
        }
      }}
      onClick={() => {
        if (showPlayList()) {
          setShowPlayList(false);
          return;
        }

        clearTimeout(timeout);
        setShowControls(true);
        timeout = setTimeout(() => {
          setShowControls(false);
        }, 3000);

        if (!isTouchDevice()) {
          tooglePlay();
        }
      }}
    >
      <Show when={playbackError()}>
        <div
          class={
            "pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-6 text-center text-white"
          }
        >
          浏览器无法播放该格式，请下载后查看
        </div>
      </Show>

      <Show when={type()?.startsWith("audio")}>
        <div class={"flex h-[calc(100dvh-120px)] items-center justify-center"}>
          <IconMusic class={"size-20 animate-pulse text-white"} />
        </div>
      </Show>
      <div
        onMouseOver={() => {
          clearTimeout(timeout);
          setShowControls(true);
          timeout = setTimeout(() => {
            setShowControls(false);
          }, 3000);
        }}
        class={
          "controls-wrap fixed bottom-0 left-0 z-10 flex h-30 w-full items-center justify-center duration-700"
        }
      >
        <div
          onClick={(ev) => {
            ev.stopPropagation();
          }}
          style={{
            opacity: showControls() ? 1 : 0,
            visibility: showControls() ? "visible" : "hidden",
          }}
          class={
            "controls w-[90dvw] rounded-3xl bg-gray-400 px-8 py-4 shadow-2xl backdrop-blur-3xl transition-all"
          }
        >
          <div
            class={`fixed bottom-32 left-0 z-50 max-h-[60dvh] overflow-auto rounded-lg bg-white transition-all ${showPlayList() ? "w-[80dvw]" : "invisible w-0 overflow-hidden"}`}
            style={{
              height: showPlayList()
                ? `${40 * mediaFiles().length + (mediaFiles().length - 1) * 2}px`
                : "0px",
            }}
            onScroll={() => {
              clearTimeout(timeout);
              setShowControls(true);
              timeout = setTimeout(() => {
                setShowPlayList(false);
              }, 3000);
            }}
          >
            <ul>
              {mediaFiles()
                .map((file) => (
                  <li class={"overflow-hidden"}>
                    <button
                      class={`flex h-10 w-full cursor-pointer items-center px-2 hover:bg-blue-100 active:bg-blue-200 ${currentName() === file.name ? "bg-blue-300" : ""}`}
                      onClick={() => {
                        navigate(playUrl(joinPath(path(), file.name)));
                        setShowPlayList(false);
                      }}
                    >
                      {mime.getType(file.name)?.startsWith("audio/") ? (
                        <IconMusic class={"size-6 shrink-0 text-blue-500"} />
                      ) : mime.getType(file.name)?.startsWith("video/") ? (
                        <IconVideoFilled
                          class={"size-6 shrink-0 text-blue-500"}
                        />
                      ) : (
                        <IconVolume3
                          class={"size-6 shrink-0 text-blue-500"}
                        />
                      )}
                      <span class={"ml-2 truncate"}>{file.name}</span>
                    </button>
                  </li>
                ))
                .reduce<Array<import("solid-js").JSX.Element>>(
                  (previous, current) => [
                    previous as import("solid-js").JSX.Element,
                    <div class={"h-[2px] w-full bg-blue-100"}></div>,
                    current,
                  ],
                  [],
                )}
            </ul>
          </div>
          <p class={"flex items-center text-sm"}>
            {formatDuration(playerState().currentTime)}
            <span class={"mx-1"}>/</span>
            {formatDuration(playerState().duration)}
          </p>
          <div
            class={
              "progress mx-auto mt-2 h-2 w-full overflow-hidden rounded-full bg-red-100"
            }
            onClick={(ev) => {
              const rect = ev.currentTarget.getBoundingClientRect();
              const clickX = ev.clientX - rect.left; // X position within the element
              const percentage = clickX / rect.width; // Calculate percentage
              if (videoPlayerRef && !audioPlayerRef) {
                videoPlayerRef.currentTime =
                  percentage * videoPlayerRef.duration; // Set new time
              } else if (audioPlayerRef && !videoPlayerRef) {
                audioPlayerRef.currentTime =
                  percentage * audioPlayerRef.duration; // Set new time
              }
            }}
          >
            <div
              class={"complete h-2 w-0 bg-blue-400 transition-all"}
              style={{
                width: `${playerState().duration === 0 ? 0 : (playerState().currentTime / playerState().duration) * 100}%`,
              }}
            ></div>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <div class="left">
              <button
                class={
                  "cursor-pointer rounded-lg transition-colors active:bg-blue-300"
                }
                aria-label="播放列表"
                onClick={() => {
                  setShowPlayList((prev) => !prev);
                }}
              >
                <IconList class="size-8" />
              </button>
            </div>
            <div class="center flex items-center justify-between">
              <button
                class={"rounded-lg transition-colors active:bg-amber-100"}
                aria-label="上一个"
                onClick={() => {
                  playOffset(-1);
                }}
              >
                <IconPlayerTrackPrevFilled class={"size-8"} />
              </button>
              <button
                class={"mx-2 rounded-lg transition-colors active:bg-amber-100"}
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
                class={"rounded-lg transition-colors active:bg-amber-100"}
                aria-label="下一个"
                onClick={() => {
                  playOffset(1);
                }}
              >
                <IconPlayerTrackNextFilled class={"size-8"} />
              </button>
            </div>
            <div class="right flex items-center gap-2">
              <button
                class={"rounded-lg active:bg-amber-100"}
                aria-label={playerState().muted ? "取消静音" : "静音"}
                onClick={toggleMute}
              >
                {playerState().muted ? (
                  <IconVolume3 class={"size-8"} />
                ) : (
                  <IconVolume class={"size-8"} />
                )}
              </button>
              <Show when={type()?.startsWith("video")}>
                <button
                  class={"rounded-lg active:bg-amber-100"}
                  aria-label="全屏"
                  onClick={enterFullscreen}
                >
                  <IconMaximize class={"size-8"} />
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
            ref={audioPlayerRef}
            autoplay={true}
            onError={() => setPlaybackError(true)}
            onPlay={() => {
              setPlayerState((prev) => ({ ...prev, playing: true }));
            }}
            onPause={() => {
              setPlayerState((prev) => ({ ...prev, playing: false }));
            }}
            onLoadedMetadata={(ev) => {
              setPlayerState((prev) => ({
                ...prev,
                duration: ev.currentTarget.duration,
              }));
            }}
            onTimeUpdate={(ev) => {
              if (type()?.startsWith("video")) return;
              setPlayerState((prev) => ({
                ...prev,
                currentTime: isNaN(ev.currentTarget.currentTime)
                  ? 0
                  : ev.currentTarget.currentTime,
                duration: isNaN(ev.currentTarget.duration)
                  ? 0
                  : ev.currentTarget.duration,
              }));
            }}
          />
        </Match>
        <Match when={type()?.startsWith("video")}>
          <video
            onPlay={() => {
              setPlayerState((prev) => ({ ...prev, playing: true }));
            }}
            onPause={() => {
              setPlayerState((prev) => ({ ...prev, playing: false }));
            }}
            onError={() => setPlaybackError(true)}
            onLoadedMetadata={(ev) => {
              setPlayerState((prev) => ({
                ...prev,
                duration: ev.currentTarget.duration,
              }));
            }}
            onTimeUpdate={(ev) => {
              if (type()?.startsWith("audio")) return;

              setPlayerState((prev) => ({
                ...prev,
                currentTime: isNaN(ev.currentTarget.currentTime)
                  ? 0
                  : ev.currentTarget.currentTime,
                duration: isNaN(ev.currentTarget.duration)
                  ? 0
                  : ev.currentTarget.duration,
              }));
            }}
            ref={videoPlayerRef}
            class={`h-[100dvh] w-full`}
            src={fileLinkUrl(uri())}
            autoplay={true}
            playsinline={true}
          />
        </Match>
      </Switch>
    </div>
  );
};

export default MediaPlayer;
