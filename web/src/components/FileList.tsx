import { For, Show, createEffect, createSignal } from "solid-js";
import type { Entry } from "../types";
import { thumbUrl } from "../lib/api";
import { formatBytes, formatDate } from "../lib/format";
import { isDirEntry, isImageName, joinPath } from "../lib/path";
import { EntryIcon, IconMore } from "../icons";

interface FileListProps {
  path: string;
  entries: Entry[];
  onOpen: (entry: Entry) => void;
  onMenu: (entry: Entry, x: number, y: number) => void;
}

export default function FileList(props: FileListProps) {
  let list: HTMLDivElement | undefined;
  const [active, setActive] = createSignal(-1);

  createEffect(
    () => props.entries.length,
    (length) => {
      setActive((current) =>
        current >= length ? (length > 0 ? 0 : -1) : current,
      );
    },
  );

  const reveal = (index: number) => {
    setActive(index);
    requestAnimationFrame(() => {
      list
        ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
  };

  const openMenu = (entry: Entry, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    props.onMenu(entry, event.clientX, event.clientY);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const count = props.entries.length;
    if (count === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      reveal(Math.min(count - 1, active() + 1 < 0 ? 0 : active() + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      reveal(Math.max(0, active() <= 0 ? 0 : active() - 1));
      return;
    }
    if (event.key === "Enter" && active() >= 0) {
      event.preventDefault();
      const entry = props.entries[active()];
      if (entry) props.onOpen(entry);
    }
  };

  return (
    <div
      ref={list}
      class="file-list"
      role="listbox"
      aria-label="文件列表"
      tabindex={0}
      onKeyDown={onKeyDown}
    >
      <div class="file-list-header" aria-hidden="true">
        <span class="col-name">名称</span>
        <span class="col-size">大小</span>
        <span class="col-date">修改时间</span>
        <span class="col-more" />
      </div>

      <For each={props.entries}>
        {(entry, index) => {
          const fullPath = () => joinPath(props.path, entry.name);
          return (
            <div
              class={["file-row", { "file-row--active": active() === index() }]}
              role="option"
              aria-selected={active() === index() ? "true" : "false"}
              data-index={index()}
              onClick={() => props.onOpen(entry)}
              onContextMenu={(event) => openMenu(entry, event)}
            >
              <span class="file-name">
                <span class="file-thumb">
                  <Show when={isImageName(entry.name) && !isDirEntry(entry)}>
                    <img
                      src={thumbUrl(fullPath(), 128)}
                      alt=""
                      loading="lazy"
                      draggable={false}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </Show>
                  <EntryIcon entry={entry} size={26} />
                </span>
                <span class="file-name-text" title={entry.name}>
                  {entry.name}
                </span>
                <Show
                  when={
                    entry.type === "symlink" ||
                    entry.type === "symlinkDir" ||
                    entry.type === "symlinkFile"
                  }
                >
                  <span class="file-badge">链接</span>
                </Show>
              </span>
              <span class="file-size">
                {isDirEntry(entry) ? "—" : formatBytes(entry.size)}
              </span>
              <span class="file-date">{formatDate(entry.modified)}</span>
              <button
                type="button"
                class="row-more"
                aria-label={`${entry.name} 的更多操作`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  const rect = event.currentTarget.getBoundingClientRect();
                  props.onMenu(entry, rect.right, rect.bottom + 4);
                }}
              >
                <IconMore size={16} />
              </button>
            </div>
          );
        }}
      </For>
    </div>
  );
}
