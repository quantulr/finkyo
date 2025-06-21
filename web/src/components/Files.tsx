import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { createMemo, createSignal, Match, Switch } from "solid-js";
import request from "@/lib/request";
import mime from "mime";
import FileGrid from "@/components/FileGrid";
import createPhotoSwipe from "@/hooks/createPhotoSwipe";
import {
  IconLayoutGrid,
  IconLoader2,
  IconSearch,
  IconSortDescending,
  IconTable,
} from "@tabler/icons-solidjs";
import FileTable from "@/components/FileTable";
import ContextMenu from "@/components/ContextMenu";
import BottomSheets from "@/components/BottomSheets";
import { useQuery } from "@tanstack/solid-query";

enum LayoutType {
  Table = "table",
  Grid = "grid",
}

const Files = () => {
  // route
  const params: { path?: string } = useParams();
  const [searchParams, setSearchParams] = useSearchParams<{ q?: string }>();
  const navigate = useNavigate();
  const query = useQuery(() => ({
    queryKey: [params.path ?? ""],
    queryFn: ({ queryKey }) =>
      request.get<never, BaseResponse<FileEntryItem[]>>(
        `/files/${queryKey[0]}`,
      ),
  }));

  // fetch file list
  /*  const [filesResponse] = createResource(
      () => params.path ?? "",
      (key) => request.get<never, BaseResponse<FileEntryItem[]>>(`/files/${key}`),
    );*/
  const files = createMemo(() =>
    query.data?.data.filter((entry) =>
      entry.name.includes(searchParams.q ?? ""),
    ),
  );
  const images = createMemo(() =>
    files()?.filter((entry) => mime.getType(entry.name)?.startsWith("image/")),
  );

  // photo swipe
  const [openIndex, setOpenIndex] = createSignal<number | undefined>();
  createPhotoSwipe({
    images: images,
    openIndex: openIndex,
    onClose: () => setOpenIndex(undefined),
  });

  // switch grid and table layout
  const [layout, setLayout] = createSignal<LayoutType>(LayoutType.Grid);

  /* 搜索 */
  const [showSearchField, setShowSearchField] = createSignal(false);
  let searchFieldRef: HTMLInputElement | undefined;
  /* 搜索 end */

  /*
  let scrollRef: HTMLDivElement | undefined;
  const [initialize, instance] = createOverlayScrollbars({
    options: {
      scrollbars: {
        autoHide: "leave",
      },
    },
  });

  createEffect(() => {
    onMount(() => {
      if (scrollRef) {
        console.log("initialize scrollRef", scrollRef);

        initialize(scrollRef);
      }
    });
    onCleanup(() => {
      instance()?.destroy();
    });
  });
*/

  const onEntryClick = (entry: FileEntryItem) => {
    if ((entry.entryType as string) === "Directory") {
      navigate(
        params.path
          ? `/browse/${params.path}/${entry.name}`
          : `/browse/${entry.name}`,
      );
    } else if (mime.getType(entry.name)?.startsWith("image")) {
      const imageIndex = images()?.findIndex(
        (image) => entry.name === image.name,
      );
      (imageIndex ?? -1) >= 0 && setOpenIndex(imageIndex);
    } else if (
      mime.getType(entry.name)?.startsWith("video") ||
      mime.getType(entry.name)?.startsWith("audio")
    ) {
      const mediaPlayUrl = params.path
        ? `/play/${params.path}/${entry.name}`
        : `/play/${entry.name}`;
      window.open(mediaPlayUrl);
    } else if (
      mime.getType(entry.name)?.startsWith("text") ||
      mime.getType(entry.name)?.startsWith("application/pdf")
    ) {
      window.open(
        params.path
          ? `/file_link/${params.path}/${entry.name}`
          : `/file_link/${entry.name}`,
      );
    }
  };
  return (
    <>
      <ContextMenu />
      <BottomSheets />
      <div
        class={
          "flex flex-[1] flex-col overflow-auto rounded-md bg-white shadow-sm"
        }
      >
        <div class={"flex h-10 items-center justify-between px-4"}>
          <div class={"left"}></div>

          <div class={"right flex items-center"}>
            <button
              class={"cursor-pointer rounded-lg p-1 active:bg-blue-200"}
              onClick={() => {}}
            >
              <IconSortDescending class={"size-6 text-blue-500"} />
            </button>
            <input
              ref={searchFieldRef}
              value={searchParams.q ?? ""}
              class={`${
                showSearchField() || searchParams.q
                  ? "w-64 border-2 px-2"
                  : "w-0"
              } h-8 rounded-lg border-blue-200 bg-white transition-all focus:outline-none`}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") {
                  setShowSearchField(false);
                  const searchValue = (ev.target as HTMLInputElement).value;
                  if (searchValue.trim() !== "") {
                    setSearchParams({ q: searchValue.trim() });
                    // navigate(
                    //   params.path
                    //     ? `?q=${searchValue.trim()}`
                    //     : `?q=${searchValue.trim()}`,
                    // );
                  }
                } else if (ev.key === "Escape") {
                  setShowSearchField(false);
                  // navigate(params.path ? `/browse/${params.path}` : `/browse`);
                  setSearchParams({ q: undefined });
                }
              }}
            />
            <button
              class={`cursor-pointer rounded-lg transition-all active:bg-blue-200 ${
                showSearchField() || searchParams.q
                  ? "size-0"
                  : "ml-2 size-8 p-1"
              }`}
              onClick={() => {
                setShowSearchField(true);
                searchFieldRef?.focus();
              }}
            >
              <IconSearch
                class={`text-blue-500 ${
                  showSearchField() || searchParams.q ? "size-0" : "size-6"
                }`}
              />
            </button>

            <div
              class={
                "ml-2 flex h-8 w-16 justify-between overflow-hidden rounded-lg border-2 border-blue-200"
              }
            >
              <button
                onClick={() => {
                  setLayout(LayoutType.Grid);
                }}
                class={`flex h-full w-full cursor-pointer items-center justify-center transition-all hover:bg-blue-300 ${layout() === LayoutType.Grid ? "bg-blue-400" : ""}`}
              >
                <IconLayoutGrid class={"size-9/12"} />
              </button>
              <span class={"w-[2px] bg-blue-200"}></span>
              <button
                onClick={() => {
                  setLayout(LayoutType.Table);
                }}
                class={`flex h-full w-full cursor-pointer items-center justify-center transition-all hover:bg-blue-300 ${layout() === LayoutType.Table ? "bg-blue-400" : ""}`}
              >
                <IconTable class={"size-9/12"} />
              </button>
            </div>
          </div>
        </div>
        <div class={"flex-[1] overflow-auto"}>
          <Switch>
            <Match when={query.isPending}>
              <div class={"flex h-full w-full items-center justify-center"}>
                <IconLoader2 class={"size-12 animate-spin"} />
              </div>
            </Match>
            <Match when={files()}>
              <div class={"p-4"}>
                <Switch>
                  <Match when={layout() === LayoutType.Grid}>
                    <FileGrid files={files} onEntryClick={onEntryClick} />
                  </Match>
                  <Match when={layout() === LayoutType.Table}>
                    <FileTable files={files} onEntryClick={onEntryClick} />
                  </Match>
                </Switch>
              </div>
            </Match>
          </Switch>
        </div>
      </div>
    </>
  );
};

export default Files;
