import {
  useBeforeLeave,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createSignal,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js";
import request from "@/lib/request";
import mime from "mime";
import FileGrid from "@/components/FileGrid";
import createPhotoSwipe from "@/hooks/createPhotoSwipe";
import {
  IconLayoutGrid,
  IconLoader2,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconTable,
} from "@tabler/icons-solidjs";
import FileTable from "@/components/FileTable";
import ContextMenu from "@/components/ContextMenu";
import BottomSheets from "@/components/BottomSheets";
import { useQuery } from "@tanstack/solid-query";
import saved_position from "@/store/saved_position";
import layoutStore, { LayoutType } from "@/store/layout";
import { browseUrl, decodePath, fileLinkUrl, filesUrl, joinPath, playUrl } from "@/lib/path";
import { isDirectoryEntry } from "@/lib/entries";

type SortKey = "name" | "size" | "modified";

const Files = () => {
  // route
  const params: { path?: string } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams<{ q?: string }>();
  const navigate = useNavigate();
  // useParams 返回 URL 原始编码路径，先解码再用于接口与拼接。
  const dirPath = createMemo(() => decodePath(params.path ?? ""));
  const query = useQuery(() => ({
    queryKey: [dirPath()],
    queryFn: ({ queryKey }) =>
      request.get<never, BaseResponse<FileEntryItem[]>>(
        filesUrl(queryKey[0]),
      ),
  }));

  /* 离开时记录路径和滚动距离，返回时滚动到已记录的滚动距离 */
  let scrollRef: HTMLDivElement | undefined;
  const { pushSavedPosition, savedPositionList } = saved_position;
  useBeforeLeave(() => {
    pushSavedPosition({
      path: `${location.pathname}${location.search}`,
      top: scrollRef?.scrollTop,
      layout: layout(),
    });
  });

  createEffect(() => {
    const savedPosition = savedPositionList().get(
      `${location.pathname}${location.search}-${layout()}`,
    );

    if (savedPosition && files()?.length) {
      scrollRef?.scrollTo({
        top: savedPosition.top,
      });
    } else {
      scrollRef?.scrollTo({
        top: 0,
      });
    }
  });
  /* end */

  // fetch file list
  const files = createMemo(() =>
    query.data?.data.filter((entry) =>
      entry.name.toLowerCase().includes(searchParams.q?.toLowerCase() ?? ""),
    ),
  );
  const images = createMemo(() =>
    files()?.filter((entry) => mime.getType(entry.name)?.startsWith("image/")),
  );

  /* 排序 */
  const [sortKey, setSortKey] = createSignal<SortKey>("name");
  const [sortAsc, setSortAsc] = createSignal(true);
  const sortedFiles = createMemo(() => {
    const list = files();
    if (!list) {
      return undefined;
    }

    const direction = sortAsc() ? 1 : -1;
    return [...list].sort((a, b) => {
      const aDir = isDirectoryEntry(a);
      const bDir = isDirectoryEntry(b);
      if (aDir !== bDir) {
        return aDir ? -1 : 1;
      }

      let result: number;
      if (sortKey() === "name") {
        result = a.name.localeCompare(b.name, "zh-CN", {
          numeric: true,
          sensitivity: "base",
        });
      } else if (sortKey() === "size") {
        result = (a.size ?? 0) - (b.size ?? 0);
      } else {
        result = (a.modified ?? 0) - (b.modified ?? 0);
      }
      return result * direction;
    });
  });
  /* 排序 end */

  const errorMessage = () => {
    const error = query.error as
      | { response?: { data?: { message?: string } }; message?: string }
      | null;
    return error?.response?.data?.message ?? error?.message ?? "未知错误";
  };

  /* photo swipe */
  const [openIndex, setOpenIndex] = createSignal<number | undefined>();
  createPhotoSwipe({
    images: images,
    openIndex: openIndex,
    onClose: () => setOpenIndex(undefined),
  });
  /* end */

  // switch grid and table layout
  const { layout, setLayout } = layoutStore;

  /* 搜索 */
  const [showSearchField, setShowSearchField] = createSignal(false);
  let searchFieldRef: HTMLInputElement | undefined;
  const onCtrlF = (ev: KeyboardEvent) => {
    if (ev.ctrlKey && (ev.key === "f" || ev.key === "F")) {
      ev.preventDefault();
      setShowSearchField(true);
      searchFieldRef?.focus();
    }
  };
  onMount(() => {
    document.addEventListener("keydown", onCtrlF);
  });
  onCleanup(() => {
    document.removeEventListener("keydown", onCtrlF);
  });
  /* 搜索 end */

  const onEntryClick = (entry: FileEntryItem) => {
    const fullPath = joinPath(dirPath(), entry.name);

    if (isDirectoryEntry(entry)) {
      navigate(browseUrl(fullPath));
    } else if (mime.getType(entry.name)?.startsWith("image")) {
      const imageIndex = images()?.findIndex(
        (image) => entry.name === image.name,
      );
      if ((imageIndex ?? -1) >= 0) {
        setOpenIndex(imageIndex);
      }
    } else if (
      mime.getType(entry.name)?.startsWith("video") ||
      mime.getType(entry.name)?.startsWith("audio")
    ) {
      window.open(playUrl(fullPath), "_blank", "noopener");
    } else if (
      mime.getType(entry.name)?.startsWith("text") ||
      mime.getType(entry.name)?.startsWith("application/pdf")
    ) {
      window.open(fileLinkUrl(fullPath), "_blank", "noopener");
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
            <select
              value={sortKey()}
              onChange={(ev) => setSortKey(ev.currentTarget.value as SortKey)}
              aria-label="排序字段"
              class={
                "mr-1 h-8 cursor-pointer rounded-lg border-2 border-blue-200 bg-white px-1 text-sm text-blue-600 focus:outline-none"
              }
            >
              <option value="name">名称</option>
              <option value="modified">时间</option>
              <option value="size">大小</option>
            </select>
            <button
              class={"cursor-pointer rounded-lg p-1 active:bg-blue-200"}
              aria-label={sortAsc() ? "升序" : "降序"}
              onClick={() => setSortAsc((value) => !value)}
            >
              <Show
                when={sortAsc()}
                fallback={<IconSortDescending class={"size-6 text-blue-500"} />}
              >
                <IconSortAscending class={"size-6 text-blue-500"} />
              </Show>
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
                  }
                } else if (ev.key === "Escape") {
                  setShowSearchField(false);
                  setSearchParams({ q: undefined });
                }
              }}
            />
            <button
              class={`cursor-pointer rounded-lg transition-all active:bg-blue-200 ${
                showSearchField() || searchParams.q
                  ? "w-0 overflow-hidden"
                  : "ml-2 size-8 p-1"
              }`}
              aria-label="搜索"
              onClick={() => {
                setShowSearchField(true);
                searchFieldRef?.focus();
              }}
            >
              <IconSearch class={`size-6 text-blue-500`} />
            </button>

            <div
              class={
                "ml-2 flex h-8 w-16 justify-between overflow-hidden rounded-lg border-2 border-blue-200"
              }
            >
              <button
                onClick={() => {
                  pushSavedPosition({
                    path: `${location.pathname}${location.search}`,
                    top: scrollRef?.scrollTop,
                    layout: layout(),
                  });
                  setLayout(LayoutType.Grid);
                }}
                aria-label="网格布局"
                class={`flex h-full w-full cursor-pointer items-center justify-center transition-all hover:bg-blue-300 ${layout() === LayoutType.Grid ? "bg-blue-400" : ""}`}
              >
                <IconLayoutGrid class={"size-9/12"} />
              </button>
              <span class={"w-[2px] bg-blue-200"}></span>
              <button
                onClick={() => {
                  pushSavedPosition({
                    path: `${location.pathname}${location.search}`,
                    top: scrollRef?.scrollTop,
                    layout: layout(),
                  });
                  setLayout(LayoutType.Table);
                }}
                aria-label="表格布局"
                class={`flex h-full w-full cursor-pointer items-center justify-center transition-all hover:bg-blue-300 ${layout() === LayoutType.Table ? "bg-blue-400" : ""}`}
              >
                <IconTable class={"size-9/12"} />
              </button>
            </div>
          </div>
        </div>
        <div class={"flex-[1] overflow-auto"} ref={scrollRef}>
          <Switch>
            <Match when={query.isPending}>
              <div class={"flex h-full w-full items-center justify-center"}>
                <IconLoader2 class={"size-12 animate-spin"} />
              </div>
            </Match>
            <Match when={query.isError}>
              <div
                class={
                  "flex h-full flex-col items-center justify-center gap-3 px-4 text-gray-500"
                }
              >
                <p>加载失败：{errorMessage()}</p>
                <button
                  class={
                    "cursor-pointer rounded-lg bg-blue-500 px-4 py-1.5 text-white active:bg-blue-600"
                  }
                  onClick={() => {
                    void query.refetch();
                  }}
                >
                  重试
                </button>
              </div>
            </Match>
            <Match when={sortedFiles()}>
              <Show
                when={(sortedFiles()?.length ?? 0) > 0}
                fallback={
                  <div
                    class={
                      "flex h-full items-center justify-center text-gray-400"
                    }
                  >
                    {searchParams.q ? "没有匹配的文件" : "这里还没有文件"}
                  </div>
                }
              >
                <div class={"p-4"}>
                  <Switch>
                    <Match when={layout() === LayoutType.Grid}>
                      <FileGrid
                        files={sortedFiles}
                        onEntryClick={onEntryClick}
                      />
                    </Match>
                    <Match when={layout() === LayoutType.Table}>
                      <FileTable
                        files={sortedFiles}
                        onEntryClick={onEntryClick}
                      />
                    </Match>
                  </Switch>
                </div>
              </Show>
            </Match>
          </Switch>
        </div>
      </div>
    </>
  );
};

export default Files;
