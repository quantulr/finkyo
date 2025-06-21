import FcFolder from "flat-color-icons/svg/folder.svg";
import mime from "mime";
import FcImageFile from "flat-color-icons/svg/image_file.svg";
import FcVideoFile from "flat-color-icons/svg/video_file.svg";
import FcAudioFile from "flat-color-icons/svg/audio_file.svg";
import FcFile from "flat-color-icons/svg/file.svg";

const EntryIcon = ({
  entry,
  size,
}: {
  entry?: FileEntryItem;
  size?: number;
}) => {
  return (
    <>
      {(entry?.entryType as string) === "Directory" ? (
        <img src={FcFolder} class={"size-full"} alt={"folder"} />
      ) : mime.getType(entry?.name ?? "")?.startsWith("image") ? (
        <img src={FcImageFile} class={"size-full"} alt={"image"} />
      ) : mime.getType(entry?.name ?? "")?.startsWith("video") ? (
        <img src={FcVideoFile} class={"size-full"} alt={"video"} />
      ) : mime.getType(entry?.name ?? "")?.startsWith("audio") ? (
        <img src={FcAudioFile} class={"size-full"} alt={"audio"} />
      ) : (
        <div class={"relative size-full"}>
          <p
            class={
              "absolute top-1/2 left-1/2 z-[1] -translate-1/2 truncate text-2xl font-bold text-white"
            }
          >{`${mime.getExtension(mime.getType(entry?.name ?? "") ?? "")}`}</p>
          <img src={FcFile} class={"size-full"} alt={"folder"} />
        </div>
      )}
    </>
  );
};

export default EntryIcon;
