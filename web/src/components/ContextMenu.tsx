import contextMenuStore from "@/store/context_menu";
import {
  IconCopy,
  IconFileDownload,
  IconFolderOpen,
  IconTrash,
} from "@tabler/icons-solidjs";
import { useParams } from "@solidjs/router";

const menus: {
  icon: any;
  label: string;
  action: string;
}[] = [
  { icon: IconFolderOpen, label: "打开", action: "open" },
  { icon: IconFileDownload, label: "下载", action: "download" },
  { icon: IconTrash, label: "删除", action: "delete" },
  { icon: IconCopy, label: "复制", action: "copy" },
];

const ContextMenu = () => {
  const { path }: { path?: string } = useParams();

  const { showContextMenu, pos, closeContextMenu, entry, actions } =
    contextMenuStore;
  return (
    <div
      class={`fixed top-0 left-0 z-10 h-[100dvh] w-[100dvw] opacity-100 ${showContextMenu() ? "block" : "hidden"}`}
      onClick={() => {
        closeContextMenu();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      <div
        style={{
          top: `${pos().y}px`,
          left: `${pos().x}px`,
        }}
        onClick={(ev) => {
          ev.stopPropagation();
        }}
        class={`fixed z-50 overflow-hidden rounded-lg shadow-2xl backdrop-blur-3xl transition-all`}
      >
        <div class={"min-h-48 w-48 p-2"}>
          <ul>
            {menus
              .filter((item) => actions()?.includes(item.action))
              .map((item) => (
                <li
                  onClick={(ev) => {
                    ev.stopPropagation();
                    const file_link = path
                      ? `/file_link/${path}/${entry()}`
                      : `/file_link/${entry()}`;
                    if (item.action === "delete") {
                      console.log("delete item");
                    } else if (item.action === "open") {
                      console.log(entry());
                      window.open(file_link);
                    } else if (item.action === "download") {
                      const link = document.createElement("a");
                      link.href = file_link;
                      link.download = entry() ?? "download";
                      link.click();
                    }
                  }}
                  class={
                    "flex h-10 cursor-pointer items-center px-2 transition-all hover:bg-blue-300 rounded-lg"
                  }
                >
                  {<item.icon class={"size-6"} />}
                  <span class={"ml-1"}>{item.label}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ContextMenu;
