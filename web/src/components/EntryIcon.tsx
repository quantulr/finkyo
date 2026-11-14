import FcFolder from "flat-color-icons/svg/folder.svg";
import mime from "mime";
import FcImageFile from "flat-color-icons/svg/image_file.svg";
import FcVideoFile from "flat-color-icons/svg/video_file.svg";
import FcAudioFile from "flat-color-icons/svg/audio_file.svg";
import FcFile from "flat-color-icons/svg/file.svg";
import { isDirectoryEntry } from "@/lib/entries";

const EntryIcon = ({ entry }: { entry?: FileEntryItem }) => {
  const name = entry?.name ?? "";
  const type = mime.getType(name);
  const extension = type
    ? (mime.getExtension(type) ?? name.split(".").pop() ?? "")
    : (name.split(".").pop() ?? "");

  return (
    <>
      {isDirectoryEntry(entry) ? (
        <img src={FcFolder} class={"size-full"} alt={"文件夹"} />
      ) : type?.startsWith("image") ? (
        <img src={FcImageFile} class={"size-full"} alt={"图片"} />
      ) : type?.startsWith("video") ? (
        <img src={FcVideoFile} class={"size-full"} alt={"视频"} />
      ) : type?.startsWith("audio") ? (
        <img src={FcAudioFile} class={"size-full"} alt={"音频"} />
      ) : (
        <div class={"relative size-full"}>
          <p
            class={
              "absolute top-1/2 left-1/2 z-[1] -translate-1/2 truncate text-2xl font-bold text-white"
            }
          >
            {extension.slice(0, 4).toUpperCase()}
          </p>
          <img
            src={FcFile}
            class={"size-full"}
            alt={name ? `${name} 文件` : "文件"}
          />
        </div>
      )}
    </>
  );
};

export default EntryIcon;
