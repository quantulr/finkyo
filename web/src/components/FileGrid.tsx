import { Accessor } from "solid-js";
import contextMenuStore, { OpenType } from "@/store/context_menu";
import { IconDots } from "@tabler/icons-solidjs";
import EntryIcon from "@/components/EntryIcon";

const MENU_WIDTH = 192;
const MENU_HEIGHT = 192;

const FileGrid = ({
  files,
  onEntryClick,
}: {
  files: Accessor<FileEntryItem[] | undefined>;
  onEntryClick?: (file: FileEntryItem) => void;
}) => {
  const { openContextMenu } = contextMenuStore;
  return (
    <div class={"grid grid-cols-3 gap-3 md:grid-cols-6 xl:grid-cols-12"}>
      {files()?.map((file) => (
        <div
          class={
            "relative cursor-pointer rounded-md transition-all hover:bg-blue-100 hover:shadow-md"
          }
          onClick={() => onEntryClick?.(file)}
          onContextMenu={(event) => {
            event.preventDefault();
            const pos = {
              x: event.clientX,
              y: event.clientY,
            };
            if (event.clientX + MENU_WIDTH > window.innerWidth) {
              pos.x = window.innerWidth - MENU_WIDTH - 40;
            }
            if (event.clientY + MENU_HEIGHT > window.innerHeight) {
              pos.y = window.innerHeight - MENU_HEIGHT - 40;
            }
            openContextMenu({
              pos,
              entry: file,
            });
          }}
        >
          <button
            class={
              "absolute top-1 right-1 z-[2] cursor-pointer rounded-full p-1 transition-colors active:bg-blue-300 md:invisible"
            }
            aria-label="文件操作"
            onClick={(ev) => {
              ev.stopPropagation();
              openContextMenu({
                entry: file,
                openType: OpenType.BottomSheets,
              });
            }}
          >
            <IconDots class={`size-5`} />
          </button>
          <div class={"flex aspect-square items-center justify-center"}>
            <EntryIcon entry={file} />
          </div>
          <h3 class={"mt-1 truncate px-2 text-center"}>{file.name}</h3>
        </div>
      ))}
    </div>
  );
};
export default FileGrid;
