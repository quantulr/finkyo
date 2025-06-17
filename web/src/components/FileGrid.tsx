import { Accessor } from "solid-js";
import FcFolder from "flat-color-icons/svg/folder.svg";
import FcFile from "flat-color-icons/svg/file.svg";
import FcImageFile from "flat-color-icons/svg/image_file.svg";
import FcVideoFile from "flat-color-icons/svg/video_file.svg";
import FcAudioFile from "flat-color-icons/svg/audio_file.svg";
import mime from "mime";
import contextMenuStore from "@/store/context_menu";
import bottomSheetsStore from "@/store/bottom_sheets";
import { IconDots } from "@tabler/icons-solidjs";
import bottomSheets from "@/components/BottomSheets";

enum EntryType {
  File = "File",
  Directory = "Directory",
}

const FileGrid = ({
  files,
  onEntryClick,
}: {
  files: Accessor<FileEntryItem[] | undefined>;
  onEntryClick?: (file: FileEntryItem) => void;
}) => {
  const { openContextMenu } = contextMenuStore;
  const { openBottomSheets } = bottomSheetsStore;
  return (
    <div class={"grid grid-cols-3 gap-3 md:grid-cols-6 xl:grid-cols-12"}>
      {files()?.map((file, index) => (
        <div
          class={
            "relative cursor-pointer rounded-md transition-all hover:bg-blue-100"
          }
          onClick={() => onEntryClick?.(file)}
          onContextMenu={(event) => {
            event.preventDefault();
            let actions: string[];
            if ((file.entryType as string) === EntryType.Directory) {
              actions = [];
            } else if ((file.entryType as string) === EntryType.File) {
              actions = ["download"];
            } else {
              actions = ["detail"];
            }
            let pos: { x: number; y: number } = {
              x: event.clientX,
              y: event.clientY,
            };
            if (event.clientX + 192 > window.innerWidth) {
              pos.x = window.innerWidth - 192 - 40;
            }

            if (
              event.clientY +
                (40 * actions.length > 192 ? 40 * actions.length : 192) >
              window.innerHeight
            ) {
              pos.y =
                window.innerHeight -
                (40 * actions.length > 192 ? 40 * actions.length : 192) -
                40;
            }
            openContextMenu({
              pos /*: {
                x: event.clientX,
                y: event.clientY,
              }*/,
              actions: actions,
              entry: file,
            });
          }}
        >
          <button
            class={
              "absolute top-1 right-1 cursor-pointer rounded-full p-1 transition-colors active:bg-blue-300 md:invisible"
            }
            onClick={(ev) => {
              ev.stopPropagation();
              openBottomSheets({ file });
            }}
          >
            <IconDots class={`size-5`} />
          </button>
          <div class={"flex aspect-square items-center justify-center"}>
            {(file.entryType as string) === "Directory" ? (
              <img src={FcFolder} class={"size-full"} alt={"folder"} />
            ) : mime.getType(file.name)?.startsWith("image") ? (
              <img src={FcImageFile} class={"size-full"} alt={"image"} />
            ) : mime.getType(file.name)?.startsWith("video") ? (
              <img src={FcVideoFile} class={"size-full"} alt={"video"} />
            ) : mime.getType(file.name)?.startsWith("audio") ? (
              <img src={FcAudioFile} class={"size-full"} alt={"audio"} />
            ) : (
              <div class={"relative size-full"}>
                <p
                  class={
                    "absolute top-1/2 left-1/2 z-[1] -translate-1/2 truncate text-2xl font-bold text-white"
                  }
                >{`${mime.getExtension(mime.getType(file.name) ?? "")}`}</p>
                <img src={FcFile} class={"size-full"} alt={"folder"} />
              </div>
            )}
          </div>
          <h3 class={"mt-1 truncate px-2 text-center"}>{file.name}</h3>
        </div>
      ))}
    </div>
  );
};
export default FileGrid;
