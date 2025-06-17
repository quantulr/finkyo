import contextMenuStore, { OpenType } from "@/store/context_menu";
import { menus } from "@/components/ContextMenu";
import { useParams } from "@solidjs/router";
import EntryIcon from "@/components/EntryIcon";

const BottomSheets = () => {
  const { showContextMenu, openType, entry, closeContextMenu, actions } =
    contextMenuStore;
  const params = useParams();
  return (
    <>
      <div
        class={`fixed left-0 z-40 h-[100dvh] w-[100dvw] bg-[#45454512] transition-all duration-500 ${showContextMenu() && openType() === OpenType.BottomSheets ? "bottom-0" : "-bottom-full"}`}
        onClick={() => {
          closeContextMenu();
        }}
      ></div>
      <div
        class={`fixed z-50 rounded-t-3xl bg-[#f5f5f3] px-6 pt-6 shadow-2xl ${showContextMenu() ? "bottom-0" : "-bottom-full"} left-0 h-[60dvh] w-screen transition-all duration-500`}
      >
        <div class={"flex items-center"}>
          <div class={"size-20"}>
            {entry() && <EntryIcon entry={entry()} />}
          </div>
          <p class={"ml-2 line-clamp-2 text-xl break-words"}>{entry()?.name}</p>
        </div>
        <ul class={"actions mt-6 overflow-hidden rounded-lg bg-white"}>
          {actions()?.length &&
            menus
              .filter((item) => actions()?.includes(item.action))
              .map((item) => (
                <li>
                  <button
                    class={
                      "flex h-12 w-full cursor-pointer items-center px-4 active:bg-gray-200"
                    }
                    onClick={() => {
                      const file_link = params.path
                        ? `/file_link/${params.path}/${entry()?.name}`
                        : `/file_link/${entry()?.name}`;
                      // return
                      if (item.action === "delete") {
                        console.log("delete item");
                      } else if (item.action === "open") {
                        window.open(file_link);
                      } else if (item.action === "download") {
                        const link = document.createElement("a");
                        link.href = file_link;
                        link.download = entry()?.name ?? "download";
                        link.click();
                      }
                    }}
                  >
                    {<item.icon class={"size-6"} />}
                    <span class={"ml-1"}>{item.label}</span>
                  </button>
                </li>
              ))
              .reduce((prev, curr) => [
                prev,
                <div class={"h-[2px] w-full bg-gray-200"}></div>,
                curr,
              ])}
        </ul>
      </div>
    </>
  );
};

export default BottomSheets;
