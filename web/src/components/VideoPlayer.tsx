import { onCleanup, onMount } from "solid-js";
import { useParams } from "@solidjs/router";

const VideoPlayer = () => {
  const params: { uri: string } = useParams();
  let playerRef: HTMLVideoElement | undefined;
  onMount(() => {
    if (playerRef) {
      playerRef.src = `/file_link/${params.uri}`;
    }
  });
  onCleanup(() => {
    if (playerRef) {
      playerRef.src = "";
    }
  });
  return (
    <div class={"bg-black"}>
      <video
        class={"h-[100dvh] w-[100dvw]"}
        autoplay={true}
        muted={true}
        ref={playerRef}
        controls={true}
        loop={true}
      />
    </div>
  );
};

export default VideoPlayer;
