import { For, Show, createEffect, createSignal } from "solid-js";
import type { Entry } from "../types";
import { thumbUrl } from "../lib/api";
import { formatBytes, formatDate } from "../lib/format";
import { isDirEntry, isImageName, joinPath } from "../lib/path";
import { EntryIcon, IconMore } from "../icons";

interface FileGridProps {
  path: string;
  entries: Entry[];
  onOpen: (entry: Entry) => void;
  onMenu: (entry: Entry, x: number, y: number) => void;
}

export default function FileGrid(props: FileGridProps) {
  let grid: HTMLDivElement | undefined;
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
      grid
        ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };

  const columns = (): number => {
    if (!grid) return 1;
    const template = getComputedStyle(grid).gridTemplateColumns;
    const count = template.split(" ").filter(Boolean).length;
    return Math.max(1, count);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const count = props.entries.length;
    if (count === 0) return;
    const current = active() < 0 ? 0 : active();
    let next = current;
    if (event.key === "ArrowRight") next = current + 1;
    else if (event.key === "ArrowLeft") next = current - 1;
    else if (event.key === "ArrowDown") next = current + columns();
    else if (event.key === "ArrowUp") next = current - columns();
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else if (event.key === "Enter") {
      event.preventDefault();
      const entry = props.entries[current];
      if (entry) props.onOpen(entry);
      return;
    } else {
      return;
    }
    event.preventDefault();
    reveal(Math.min(count - 1, Math.max(0, next)));
  };

  return (
    <div
      ref={grid}
      class="file-grid"
      role="listbox"
      aria-label="文件网格"
      tabindex={0}
      onKeyDown={onKeyDown}
    >
      <For each={props.entries}>
        {(entry, index) => {
          const fullPath = () => joinPath(props.path, entry.name);
          return (
            <div
              class={[
                "grid-item",
                { "grid-item--active": active() === index() },
              ]}
              role="option"
              aria-selected={active() === index() ? "true" : "false"}
              data-index={index()}
              onClick={() => props.onOpen(entry)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                props.onMenu(entry, event.clientX, event.clientY);
              }}
            >
              <div class="grid-preview">
                <Show when={isImageName(entry.name) && !isDirEntry(entry)}>
                  <img
                    src={thumbUrl(fullPath(), 480)}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </Show>
                <span class="grid-icon">
                  <EntryIcon entry={entry} size={isDirEntry(entry) ? 52 : 44} />
                </span>
                <button
                  type="button"
                  class="grid-more"
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
              <div class="grid-caption">
                <span class="grid-name" title={entry.name}>
                  {entry.name}
                </span>
                <span class="grid-meta">
                  {isDirEntry(entry) ? "文件夹" : formatBytes(entry.size)}
                  <span class="grid-dot">·</span>
                  {formatDate(entry.modified)}
                </span>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
}
