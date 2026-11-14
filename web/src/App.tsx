import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onSettled,
} from "solid-js";
import type {
  Entry,
  Layout,
  ListResponse,
  MediaItem,
  Route,
  SortKey,
  SortState,
} from "./types";
import {
  absoluteUrl,
  downloadFile,
  downloadUrl,
  listDir,
  openExternal,
  rawUrl,
} from "./lib/api";
import {
  baseName,
  browseHash,
  isDirEntry,
  isImageName,
  isTextName,
  joinPath,
  mediaKindOf,
  parentPath,
  parseHash,
  playHash,
  viewHash,
} from "./lib/path";
import {
  loadLayout,
  loadSort,
  loadVolume,
  saveLayout,
  saveSort,
  saveVolume,
} from "./lib/preferences";
import { formatCount } from "./lib/format";
import Toolbar from "./components/Toolbar";
import FileList from "./components/FileList";
import FileGrid from "./components/FileGrid";
import Viewer from "./components/Viewer";
import Player from "./components/Player";
import Menu, { type MenuItem } from "./components/Menu";
import Toast from "./components/Toast";
import {
  IconDownload,
  IconExternal,
  IconFolder,
  IconLink,
  IconRefresh,
  IconSearch,
} from "./icons";

const initialRoute = parseHash(window.location.hash);

export default function App() {
  let main: HTMLElement | undefined;
  let controller: AbortController | null = null;
  let loadToken = 0;
  const cache = new Map<string, ListResponse>();

  const [route, setRoute] = createSignal<Route>(initialRoute);
  const [navStack, setNavStack] = createSignal<string[]>([]);
  const [data, setData] = createSignal<ListResponse | null>(null);
  const [dataDirectory, setDataDirectory] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [query, setQuery] = createSignal("");
  const [sort, setSort] = createSignal<SortState>(loadSort());
  const [layout, setLayout] = createSignal<Layout>(loadLayout());
  const [volume, setVolume] = createSignal(loadVolume());
  const [scrolled, setScrolled] = createSignal(false);
  const [menu, setMenu] = createSignal<{
    entry: Entry;
    x: number;
    y: number;
  } | null>(null);
  const [toast, setToast] = createSignal<string | null>(null);

  const directory = createMemo(() =>
    route().kind === "browse" ? route().path : parentPath(route().path),
  );

  const overlayOpen = () => route().kind !== "browse";

  const loadDirectory = (path: string, force = false) => {
    const token = ++loadToken;
    controller?.abort();
    const nextController = new AbortController();
    controller = nextController;

    const cached = force ? undefined : cache.get(path);
    if (cached) {
      setData(cached);
      setDataDirectory(path);
    } else if (dataDirectory() !== path) {
      setData(null);
      setDataDirectory(path);
    }

    setLoading(true);
    setError(null);

    listDir(path, nextController.signal)
      .then((response) => {
        if (token !== loadToken) return;
        cache.set(path, response);
        setData(response);
        setDataDirectory(path);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (token !== loadToken || nextController.signal.aborted) return;
        setLoading(false);
        const message =
          reason instanceof Error ? reason.message : "无法读取这个文件夹";
        if (dataDirectory() === path && data()) {
          setToast(message);
        } else {
          setError(message);
        }
      });
  };

  const compareEntries = (first: Entry, second: Entry): number => {
    const firstDir = isDirEntry(first) ? 0 : 1;
    const secondDir = isDirEntry(second) ? 0 : 1;
    if (firstDir !== secondDir) return firstDir - secondDir;

    const current = sort();
    let result = 0;
    if (current.key === "name") {
      result = first.name.localeCompare(second.name, "zh-CN", {
        numeric: true,
        sensitivity: "base",
      });
    } else if (current.key === "size") {
      result = first.size - second.size;
    } else {
      result = first.modified - second.modified;
    }
    if (result === 0) {
      result = first.name.localeCompare(second.name, "zh-CN", {
        numeric: true,
        sensitivity: "base",
      });
    }
    return current.asc ? result : -result;
  };

  const visibleEntries = createMemo<Entry[]>(() => {
    const response = data();
    if (!response) return [];
    const needle = query().trim().toLocaleLowerCase("zh-CN");
    const entries = needle
      ? response.entries.filter((entry) =>
          entry.name.toLocaleLowerCase("zh-CN").includes(needle),
        )
      : response.entries;
    return entries.slice().sort(compareEntries);
  });

  const imageItems = createMemo<MediaItem[]>(() => {
    const current = route();
    if (current.kind !== "view") return [];
    const entries = data()?.entries ?? [];
    const items = entries
      .filter((entry) => !isDirEntry(entry) && isImageName(entry.name))
      .map((entry) => ({
        name: entry.name,
        path: joinPath(directory(), entry.name),
      }));
    if (!items.some((item) => item.path === current.path)) {
      items.push({ name: baseName(current.path), path: current.path });
    }
    items.sort((first, second) =>
      first.name.localeCompare(second.name, "zh-CN", {
        numeric: true,
        sensitivity: "base",
      }),
    );
    return items;
  });

  const mediaItems = createMemo<MediaItem[]>(() => {
    const current = route();
    if (current.kind !== "play") return [];
    const entries = data()?.entries ?? [];
    const items = entries
      .filter((entry) => !isDirEntry(entry) && mediaKindOf(entry.name) !== "")
      .map((entry) => ({
        name: entry.name,
        path: joinPath(directory(), entry.name),
      }));
    if (!items.some((item) => item.path === current.path)) {
      items.push({ name: baseName(current.path), path: current.path });
    }
    items.sort((first, second) =>
      first.name.localeCompare(second.name, "zh-CN", {
        numeric: true,
        sensitivity: "base",
      }),
    );
    return items;
  });

  const playerKind = (): "video" | "audio" => {
    const current = route();
    return mediaKindOf(baseName(current.path)) === "audio" ? "audio" : "video";
  };

  const pageTitle = (): string => {
    const name = baseName(route().path);
    return name === "根目录" ? "finkyo" : `${name} · finkyo`;
  };

  createEffect(
    () => pageTitle(),
    (title) => {
      document.title = title;
    },
  );

  createEffect(
    () => directory(),
    (path) => {
      setQuery("");
      setError(null);
      setScrolled(false);
      if (main) main.scrollTop = 0;
      loadDirectory(path);
    },
  );

  const navigateHash = (hash: string) => {
    if (window.location.hash === hash) return;
    window.location.hash = hash;
  };

  const replaceHash = (hash: string) => {
    if (window.location.hash === hash) return;
    window.location.replace(hash);
  };

  const goBrowse = (path: string) => {
    const current = route();
    if (current.kind === "browse" && current.path === path) return;
    if (current.kind === "browse") {
      setNavStack((stack) => [...stack, current.path]);
    }
    navigateHash(browseHash(path));
  };

  const closeOverlay = () => {
    replaceHash(browseHash(directory()));
  };

  const goBack = () => {
    if (overlayOpen()) {
      closeOverlay();
      return;
    }
    const stack = navStack();
    if (stack.length > 0) {
      const previous = stack[stack.length - 1];
      setNavStack(stack.slice(0, -1));
      replaceHash(browseHash(previous));
      return;
    }
    if (route().path !== "") replaceHash(browseHash(parentPath(route().path)));
  };

  const goUp = () => {
    if (overlayOpen()) {
      closeOverlay();
      return;
    }
    if (route().path === "") return;
    goBrowse(parentPath(route().path));
  };

  const openViewer = (path: string) => {
    if (route().kind === "view") replaceHash(viewHash(path));
    else navigateHash(viewHash(path));
  };

  const openPlayer = (path: string) => {
    if (route().kind === "play") replaceHash(playHash(path));
    else navigateHash(playHash(path));
  };

  const openEntry = (entry: Entry) => {
    const fullPath = joinPath(directory(), entry.name);
    if (isDirEntry(entry)) {
      goBrowse(fullPath);
      return;
    }
    if (isImageName(entry.name)) {
      openViewer(fullPath);
      return;
    }
    if (mediaKindOf(entry.name) !== "") {
      openPlayer(fullPath);
      return;
    }
    if (isTextName(entry.name)) {
      openExternal(rawUrl(fullPath));
      return;
    }
    downloadFile(downloadUrl(fullPath), entry.name);
    setToast("已开始下载");
  };

  const changeSort = (next: SortState) => {
    setSort(next);
    saveSort(next.key, next.asc);
  };

  const changeLayout = (next: Layout) => {
    setLayout(next);
    saveLayout(next);
  };

  const copyText = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand("copy");
        area.remove();
        if (!copied) throw new Error("copy failed");
      }
      setToast("链接已复制");
    } catch {
      setToast("无法复制链接");
    }
  };

  const shareLink = (path: string, directoryEntry: boolean) => {
    if (directoryEntry) {
      return `${window.location.origin}${window.location.pathname}${browseHash(path)}`;
    }
    return absoluteUrl(rawUrl(path));
  };

  const entryMenuItems = (entry: Entry): MenuItem[] => {
    const fullPath = joinPath(directory(), entry.name);
    const directoryEntry = isDirEntry(entry);
    const items: MenuItem[] = [
      {
        label: directoryEntry ? "打开文件夹" : "打开",
        icon: directoryEntry ? (
          <IconFolder size={17} />
        ) : (
          <IconExternal size={17} />
        ),
        onSelect: () => openEntry(entry),
      },
    ];

    if (!directoryEntry) {
      items.push({
        label: "下载",
        icon: <IconDownload size={17} />,
        onSelect: () => {
          downloadFile(downloadUrl(fullPath), entry.name);
          setToast("已开始下载");
        },
      });
    }

    items.push({
      label: "复制链接",
      icon: <IconLink size={17} />,
      onSelect: () => {
        void copyText(shareLink(fullPath, directoryEntry));
      },
    });

    if (!directoryEntry) {
      items.push({
        label: "在新标签页打开",
        icon: <IconExternal size={17} />,
        onSelect: () => openExternal(rawUrl(fullPath)),
      });
    }

    return items;
  };

  onSettled(() => {
    const syncRoute = () => setRoute(parseHash(window.location.hash));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (route().kind !== "browse") return;
      const target = event.target as HTMLElement | null;
      const typing = Boolean(
        target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName),
      );
      if (event.key === "/" && !typing) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".search input")?.focus();
        return;
      }
      if (event.key === "Backspace" && !typing && !menu()) {
        event.preventDefault();
        goUp();
      }
    };

    window.addEventListener("hashchange", syncRoute);
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => {
      window.removeEventListener("hashchange", syncRoute);
      document.removeEventListener("keydown", onKeyDown);
      controller?.abort();
    });
  });

  return (
    <div class="app">
      <main
        ref={(element) => {
          main = element;
        }}
        class="app-main"
        onScroll={(event) => {
          setScrolled(event.currentTarget.scrollTop > 4);
        }}
      >
        <Toolbar
          path={directory()}
          loading={loading()}
          query={query()}
          sort={sort()}
          layout={layout()}
          canBack={
            overlayOpen() || navStack().length > 0 || route().path !== ""
          }
          scrolled={scrolled()}
          onBack={goBack}
          onUp={goUp}
          onQuery={setQuery}
          onSortKey={(key: SortKey) => changeSort({ ...sort(), key })}
          onToggleOrder={() => changeSort({ ...sort(), asc: !sort().asc })}
          onRefresh={() => loadDirectory(directory(), true)}
          onLayout={changeLayout}
          onNavigate={goBrowse}
        />

        <div class="content">
          <Show when={!data() && !error()}>
            <Show
              when={layout() === "grid"}
              fallback={
                <div class="skeleton-list" aria-label="正在载入">
                  <For each={Array.from({ length: 8 })}>
                    {() => (
                      <div class="skeleton-row">
                        <span class="skeleton-block skeleton-icon" />
                        <span class="skeleton-block skeleton-name" />
                        <span class="skeleton-block skeleton-size" />
                        <span class="skeleton-block skeleton-date" />
                      </div>
                    )}
                  </For>
                </div>
              }
            >
              <div class="skeleton-grid" aria-label="正在载入">
                <For each={Array.from({ length: 12 })}>
                  {() => (
                    <div class="skeleton-card">
                      <span class="skeleton-block skeleton-preview" />
                      <span class="skeleton-block skeleton-caption" />
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>

          <Show when={!data() && error()}>
            {(message) => (
              <section class="state">
                <span class="state-icon">
                  <IconRefresh size={30} />
                </span>
                <h1>无法读取这个文件夹</h1>
                <p>{message()}</p>
                <button
                  type="button"
                  class="state-action"
                  onClick={() => loadDirectory(directory(), true)}
                >
                  重试
                </button>
              </section>
            )}
          </Show>

          <Show when={data()}>
            <Show
              when={visibleEntries().length > 0}
              fallback={
                <section class="state">
                  <span class="state-icon">
                    <Show
                      when={query() !== ""}
                      fallback={<IconFolder size={46} />}
                    >
                      <IconSearch size={34} />
                    </Show>
                  </span>
                  <h1>
                    {query() !== "" ? "没有匹配的项目" : "这个文件夹是空的"}
                  </h1>
                  <p>
                    {query() !== ""
                      ? `没有名称包含“${query()}”的项目。`
                      : "把文件放进来后刷新即可看到。"}
                  </p>
                  <Show when={query() !== ""}>
                    <button
                      type="button"
                      class="state-action"
                      onClick={() => setQuery("")}
                    >
                      清除搜索
                    </button>
                  </Show>
                </section>
              }
            >
              <Show
                when={layout() === "grid"}
                fallback={
                  <FileList
                    path={directory()}
                    entries={visibleEntries()}
                    onOpen={openEntry}
                    onMenu={(entry, x, y) => setMenu({ entry, x, y })}
                  />
                }
              >
                <FileGrid
                  path={directory()}
                  entries={visibleEntries()}
                  onOpen={openEntry}
                  onMenu={(entry, x, y) => setMenu({ entry, x, y })}
                />
              </Show>
            </Show>
          </Show>

          <footer class="app-footer">
            <span>
              {loading() && data()
                ? "正在更新…"
                : query() !== "" && data()
                  ? `${visibleEntries().length} / ${formatCount(data()!.entries.length)}`
                  : formatCount(visibleEntries().length)}
            </span>
            <span class="app-wordmark">finkyo</span>
          </footer>
        </div>
      </main>

      <Show when={menu()}>
        {(state) => (
          <Menu
            x={state().x}
            y={state().y}
            items={entryMenuItems(state().entry)}
            onClose={() => setMenu(null)}
          />
        )}
      </Show>

      <Show when={route().kind === "view"}>
        <Viewer
          items={imageItems()}
          path={route().path}
          onNavigate={openViewer}
          onClose={closeOverlay}
        />
      </Show>

      <Show when={route().kind === "play"}>
        <Player
          items={mediaItems()}
          path={route().path}
          kind={playerKind()}
          initialVolume={volume()}
          onVolumeChange={(value) => {
            setVolume(value);
            saveVolume(value);
          }}
          onNavigate={openPlayer}
          onClose={closeOverlay}
          onToast={setToast}
        />
      </Show>

      <Toast message={toast()} onDone={() => setToast(null)} />
    </div>
  );
}
