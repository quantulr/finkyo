import { Accessor } from "solid-js";
import EntryIcon from "@/components/EntryIcon";
import { filesize } from "filesize";
import { IconDots } from "@tabler/icons-solidjs";
import contextMenuStore, { OpenType } from "@/store/context_menu";
// import FcFold from "flat-color-icons/svg/folder.svg";
// import FcFold from "flat-color-icons/svg/file.svg";

const FileTable = ({
  files,
  onEntryClick,
}: {
  files: Accessor<FileEntryItem[] | undefined>;
  onEntryClick?: (file: FileEntryItem) => void;
}) => {
  const { openContextMenu } = contextMenuStore;
  return (
    <table class={"w-full border-separate border-spacing-x-4"}>
      <thead class={"hidden md:block"}>
        <tr>
          <th class={"text-left"}>文件名</th>
          <th class={"text-left"}>大小</th>
          <th class={"md:hidden"}></th>
        </tr>
      </thead>
      <tbody>
        {files()?.map((file) => (
          <tr>
            <td class={"w-2/3 max-w-[200px]"}>
              <div
                class={"flex h-10 cursor-pointer items-center gap-1"}
                onClick={() => onEntryClick?.(file)}
              >
                <div class={"size-8 shrink-0"}>
                  <EntryIcon entry={file} />
                </div>
                <span class={"truncate text-lg"}>{file.name}</span>
              </div>
            </td>
            <td class={"w-3/12"}>
              <span class={"truncate text-lg"}>
                {file.size ? filesize(file.size) : ""}
              </span>
            </td>
            <td class={"w-1/12"}>
              <button
                class={"cursor-pointer rounded-lg p-1 active:bg-blue-200"}
                onClick={() => {
                  openContextMenu({
                    entry: file,
                    openType: OpenType.BottomSheets,
                  });
                }}
              >
                <IconDots class={"size-6"} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default FileTable;
