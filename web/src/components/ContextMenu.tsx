import contextMenuStore, { OpenType } from "@/store/context_menu";
import {
  IconFileDownload,
  IconFolderOpen,
  IconLink,
} from "@tabler/icons-solidjs";
import { useNavigate, useParams } from "@solidjs/router";
import { runFileAction, type FileAction } from "@/lib/fileActions";
import { decodePath } from "@/lib/path";

export const menus: {
  icon: any;
  label: string;
  action: FileAction;
}[] = [
  { icon: IconFolderOpen, label: "打开", action: "open" },
  { icon: IconFileDownload, label: "下载", action: "download" },
  { icon: IconLink, label: "复制链接", action: "copyLink" },
];

const ContextMenu = () => {
  const params: { path?: string } = useParams();
  const navigate = useNavigate();
  const { showContextMenu, pos, closeContextMenu, entry, actions, openType } =
    contextMenuStore;

  return (
    <div
      class={`fixed top-0 left-0 z-10 h-[100dvh] w-[100dvw] opacity-100 ${showContextMenu() && openType() === OpenType.ContextMenu ? "block" : "hidden"}`}
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
                    const currentEntry = entry();
                    if (!currentEntry) {
                      return;
                    }
                    runFileAction(
                      item.action,
                      currentEntry,
                      decodePath(params.path ?? ""),
                      navigate,
                    );
                    closeContextMenu();
                  }}
                  class={
                    "flex h-10 cursor-pointer items-center rounded-lg px-2 transition-all hover:bg-blue-300"
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
