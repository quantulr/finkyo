import isTouchDevice from "@/lib/isTouchDevice";
import request from "@/lib/request";
import { useNavigate, useParams } from "@solidjs/router";
import {
  IconList,
  IconMusic,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerTrackNextFilled,
  IconPlayerTrackPrevFilled,
  IconVideoFilled,
  IconVolume,
  IconVolume2,
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

// dayjs.extend(duration);

const MediaPlayer = () => {
  const params: { uri: string } = useParams();
  const type = createMemo(() => mime.getType(params.uri));
  const path = createMemo(() => params.uri.split("/").slice(0, -1).join("/"));

  /* 播放列表 */
  const query = useQuery(() => ({
    queryKey: [path() ?? ""],
    queryFn: ({ queryKey }) =>
      request.get<never, BaseResponse<FileEntryItem[]>>(
        `/files/${queryKey[0]}`,
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
  let timeout: any | undefined; // 用于控制隐藏播放器控制栏的定时器

  const [playerState, setPlayerState] = createSignal({
    playing: false,
    currentTime: 0,
    duration: 0,
    muted: type()?.startsWith("video") ? true : false,
  }); // 播放器状态
  let videoPlayerRef: HTMLVideoElement | undefined; // 视频播放器引用
  let audioPlayerRef: HTMLAudioElement | undefined; // 音频播放器引用
  /* 播放器控制 end */

  /* 切换媒体 */
  const navigate = useNavigate();
  createEffect(() => {
    if (mime.getType(params.uri)?.startsWith("audio/")) {
      videoPlayerRef = undefined;
      setPlayerState((prev) => ({
        ...prev,
        playing: false,
        currentTime: 0,
        duration: 0,
      }));
    } else if (mime.getType(params.uri)?.startsWith("video/")) {
      audioPlayerRef = undefined;
      setPlayerState((prev) => ({
        ...prev,
        playing: false,
        currentTime: 0,
        duration: 0,
        muted: videoPlayerRef?.muted ?? true,
      }));
    }
  });
  /* 切换媒体 end */

  /* 切换播放状态 */
  const tooglePlay = () => {
    if (videoPlayerRef && type()?.startsWith("video")) {
      if (playerState().playing) {
        videoPlayerRef.pause();
      } else {
        videoPlayerRef.play();
      }
    } else if (audioPlayerRef && type()?.startsWith("audio")) {
      if (playerState().playing) {
        audioPlayerRef.pause();
      } else {
        audioPlayerRef.play();
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

  return (
    <div
      class={"h-[100dvh] bg-black"}
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
          "controls-wrap fixed bottom-0 left-0 z-10 flex h-30 w-[100dvw] items-center justify-center duration-700"
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
            class={`fixed bottom-24 left-0 z-50 max-h-[60dvh] overflow-auto rounded-lg bg-white transition-all ${showPlayList() ? "w-[80dvw]" : "invisible w-0 overflow-hidden"}`}
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
              {mediaFiles().length &&
                mediaFiles()
                  .map((file) => (
                    <li class={"overflow-hidden"}>
                      <button
                        class={`flex h-10 w-full cursor-pointer items-center px-2 hover:bg-blue-100 active:bg-blue-200 ${decodeURIComponent(params.uri.split("/").pop() ?? "") === file.name ? "bg-blue-300" : ""}`}
                        onClick={() => {
                          if (type()?.startsWith("audio")) {
                            if (audioPlayerRef) audioPlayerRef.autoplay = true;
                          }
                          navigate(
                            `/play/${path() ? `${path()}/` : ""}${file.name}`,
                          );
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
                  .reduce((prev, curr) => [
                    prev,
                    <div class={"h-[2px] w-full bg-blue-100"}></div>,
                    curr,
                  ])}
            </ul>
          </div>
          <div
            class={
              "progress mx-auto h-2 w-full overflow-hidden rounded-full bg-red-100"
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
                onClick={() => {
                  setShowPlayList((prev) => !prev);
                }}
              >
                <IconList class="size-8" />
              </button>
            </div>
            <div class="center flex items-center justify-between">
              <IconPlayerTrackPrevFilled
                class={"size-8"}
                onClick={() => {
                  videoPlayerRef?.requestFullscreen();
                  if (videoPlayerRef) videoPlayerRef.controls = true;
                }}
              />
              <button
                class={"mx-2 rounded-lg transition-colors active:bg-amber-100"}
                onClick={tooglePlay}
              >
                {playerState().playing ? (
                  <IconPlayerPauseFilled class={"size-8"} />
                ) : (
                  <IconPlayerPlayFilled class={"size-8"} />
                )}
              </button>
              <IconPlayerTrackNextFilled class={"size-8"} />
            </div>
            <div class="right">
              <button
                class={"rounded-lg active:bg-amber-100"}
                onClick={() => {
                  if (videoPlayerRef && !audioPlayerRef) {
                    if (videoPlayerRef.muted) {
                      videoPlayerRef.muted = false;
                      setPlayerState((prev) => ({ ...prev, muted: false }));
                    } else {
                      videoPlayerRef.muted = true;
                      setPlayerState((prev) => ({ ...prev, muted: true }));
                    }
                  } else if (audioPlayerRef && !videoPlayerRef) {
                    if (audioPlayerRef.muted) {
                      audioPlayerRef.muted = false;
                      setPlayerState((prev) => ({ ...prev, muted: false }));
                    } else {
                      audioPlayerRef.muted = true;
                      setPlayerState((prev) => ({ ...prev, muted: true }));
                    }
                  }
                }}
              >
                <Switch>
                  <Match when={playerState().muted}>
                    <IconVolume3 class={"size-8"} />
                  </Match>
                  <Match when={playerState().muted === false}>
                    <IconVolume class={"size-8"} />
                  </Match>
                </Switch>
              </button>
            </div>
          </div>
        </div>
      </div>
      <Switch>
        <Match when={type()?.startsWith("audio")}>
          <audio
            src={`/file_link/${params.uri}`}
            ref={audioPlayerRef}
            onPlay={() => {
              setPlayerState((prev) => ({ ...prev, playing: true }));
            }}
            onPause={() => {
              setPlayerState((prev) => ({ ...prev, playing: false }));
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
            class={"h-[100dvh] w-[100dvw]"}
            src={`/file_link/${params.uri}`}
            autoplay={true}
            muted={true}
            playsinline={true}
          />
        </Match>
      </Switch>
    </div>
  );
};

export default MediaPlayer;
