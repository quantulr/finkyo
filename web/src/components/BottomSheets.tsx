import contextMenuStore, { OpenType } from "@/store/context_menu";
import { menus } from "@/components/ContextMenu";
import { useNavigate, useParams } from "@solidjs/router";
import EntryIcon from "@/components/EntryIcon";
import { runFileAction } from "@/lib/fileActions";

const BottomSheets = () => {
  const { showContextMenu, openType, entry, closeContextMenu, actions } =
    contextMenuStore;
  const params: { path?: string } = useParams();
  const navigate = useNavigate();

  return (
    <div
      class={`fixed left-0 z-40 h-[100dvh] w-[100dvw] bg-[#45454512] transition-all duration-500 ${showContextMenu() && openType() === OpenType.BottomSheets ? "bottom-0" : "-bottom-full"}`}
      onClick={() => {
        closeContextMenu();
      }}
    >
      <div
        class={`fixed z-50 rounded-t-3xl bg-[#f5f5f3] px-6 pt-6 shadow-2xl ${showContextMenu() && openType() === OpenType.BottomSheets ? "bottom-0" : "-bottom-full"} left-0 h-[60dvh] w-screen transition-all duration-500`}
        onClick={(ev) => {
          ev.stopPropagation();
        }}
      >
        <div class={"flex items-center"}>
          <div class={"size-20"}>
            {entry() && <EntryIcon entry={entry()} />}
          </div>
          <p class={"ml-2 line-clamp-2 text-xl break-words"}>{entry()?.name}</p>
        </div>
        <ul class={"actions mt-6 overflow-hidden rounded-lg bg-white"}>
          {actions()
            ?.map((action) => menus.find((item) => item.action === action))
            .filter(
              (item): item is (typeof menus)[number] => item !== undefined,
            )
            .map((item) => (
              <li>
                <button
                  class={
                    "flex h-12 w-full cursor-pointer items-center px-4 active:bg-gray-200"
                  }
                  onClick={() => {
                    const currentEntry = entry();
                    if (!currentEntry) {
                      return;
                    }
                    runFileAction(
                      item.action,
                      currentEntry,
                      params.path,
                      navigate,
                    );
                    closeContextMenu();
                  }}
                >
                  {<item.icon class={"size-6"} />}
                  <span class={"ml-1"}>{item.label}</span>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default BottomSheets;
