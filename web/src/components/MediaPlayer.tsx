import { useParams } from "@solidjs/router";
import {
  IconList,
  IconMusic,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerTrackNextFilled,
  IconPlayerTrackPrevFilled,
  IconVolume,
  IconVolume2,
  IconVolume3,
} from "@tabler/icons-solidjs";
import mime from "mime";
import { createSignal, Match, onMount, Show, Switch } from "solid-js";

const MediaPlayer = () => {
  const params: { uri: string } = useParams();
  const type = mime.getType(params.uri);
  const [playerState, setPlayerState] = createSignal({
    playing: false,
    currentTime: 0,
    duration: 0,
    muted: type?.startsWith("video") ? true : false,
  });
  let videoPlayerRef: HTMLVideoElement | undefined;
  let audioPlayerRef: HTMLAudioElement | undefined;
  onMount(() => {
    window.addEventListener("keydown", (ev) => {
      if (ev.key === " ") {
        ev.preventDefault();
        if (videoPlayerRef && !audioPlayerRef) {
          if (playerState().playing) {
            videoPlayerRef.pause();
          } else {
            videoPlayerRef.play();
          }
        } else if (audioPlayerRef && !videoPlayerRef) {
          if (playerState().playing) {
            audioPlayerRef.pause();
          } else {
            audioPlayerRef.play();
          }
        }
      }
    });
  });
  return (
    <div class={"h-[100dvh] bg-black"}>
      <Show when={type?.startsWith("audio")}>
        <div class={"flex h-[calc(100dvh-120px)] items-center justify-center"}>
          <IconMusic class={"size-20 animate-pulse text-white"} />
        </div>
      </Show>
      <div
        class={
          "controls-wrap fixed bottom-0 left-0 z-10 flex h-30 w-[100dvw] items-center justify-center"
        }
      >
        <div
          class={
            "controls w-[90dvw] rounded-3xl bg-gray-400 px-8 py-4 shadow-2xl backdrop-blur-3xl"
          }
        >
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
                width: `${(playerState().currentTime / playerState().duration) * 100}%`,
              }}
            ></div>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <div class="left">
              <IconList class="size-8" />
            </div>
            <div class="center flex items-center justify-between">
              <IconPlayerTrackPrevFilled class={"size-8"} />
              <button
                class={"mx-2 rounded-lg transition-colors active:bg-amber-100"}
                onClick={() => {
                  if (videoPlayerRef && !audioPlayerRef) {
                    if (playerState().playing) {
                      videoPlayerRef.pause();
                    } else {
                      videoPlayerRef.play();
                    }
                  } else if (audioPlayerRef && !videoPlayerRef) {
                    if (playerState().playing) {
                      audioPlayerRef.pause();
                    } else {
                      audioPlayerRef.play();
                    }
                  }
                }}
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
        <Match when={type?.startsWith("audio")}>
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
              setPlayerState((prev) => ({
                ...prev,
                currentTime: ev.currentTarget.currentTime,
                duration: ev.currentTarget.duration,
              }));
            }}
          />
        </Match>
        <Match when={type?.startsWith("video")}>
          <video
            onPlay={() => {
              setPlayerState((prev) => ({ ...prev, playing: true }));
            }}
            onPause={() => {
              setPlayerState((prev) => ({ ...prev, playing: false }));
            }}
            onTimeUpdate={(ev) => {
              setPlayerState((prev) => ({
                ...prev,
                currentTime: ev.currentTarget.currentTime,
                duration: ev.currentTarget.duration,
              }));
            }}
            ref={videoPlayerRef}
            class={"h-[100dvh] w-[100dvw] md:h-screen md:w-screen"}
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
