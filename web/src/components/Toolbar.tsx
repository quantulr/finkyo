import { Show, createSignal } from "solid-js";
import type { Layout, SortKey, SortState } from "../types";
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronLeft,
  IconClose,
  IconGrid,
  IconList,
  IconRefresh,
  IconSearch,
  IconSort,
} from "../icons";
import Breadcrumbs from "./Breadcrumbs";
import IconButton from "./IconButton";
import Menu, { type MenuItem } from "./Menu";

interface ToolbarProps {
  path: string;
  loading: boolean;
  query: string;
  sort: SortState;
  layout: Layout;
  canBack: boolean;
  scrolled: boolean;
  onBack: () => void;
  onUp: () => void;
  onQuery: (value: string) => void;
  onSortKey: (key: SortKey) => void;
  onToggleOrder: () => void;
  onRefresh: () => void;
  onLayout: (layout: Layout) => void;
  onNavigate: (path: string) => void;
}

const sortLabels: Record<SortKey, string> = {
  name: "名称",
  size: "大小",
  modified: "日期",
};

export default function Toolbar(props: ToolbarProps) {
  let sortButton: HTMLButtonElement | undefined;
  const [sortMenu, setSortMenu] = createSignal<{ x: number; y: number } | null>(
    null,
  );

  const openSortMenu = () => {
    if (!sortButton) return;
    const rect = sortButton.getBoundingClientRect();
    setSortMenu({ x: rect.right - 220, y: rect.bottom + 6 });
  };

  const sortItems = (): MenuItem[] => [
    {
      label: "名称",
      checked: props.sort.key === "name",
      onSelect: () => props.onSortKey("name"),
    },
    {
      label: "大小",
      checked: props.sort.key === "size",
      onSelect: () => props.onSortKey("size"),
    },
    {
      label: "修改时间",
      checked: props.sort.key === "modified",
      onSelect: () => props.onSortKey("modified"),
    },
    {
      label: props.sort.asc ? "升序排列" : "降序排列",
      icon: props.sort.asc ? (
        <IconArrowUp size={16} />
      ) : (
        <IconArrowDown size={16} />
      ),
      onSelect: () => props.onToggleOrder(),
    },
  ];

  return (
    <>
      <header class={["topbar", { "topbar--scrolled": props.scrolled }]}>
        <div class="topbar-row">
          <div class="toolbar-nav">
            <IconButton
              label="后退"
              disabled={!props.canBack}
              onClick={props.onBack}
            >
              <IconChevronLeft size={18} />
            </IconButton>
            <IconButton
              label="上一级"
              disabled={props.path === ""}
              onClick={props.onUp}
            >
              <IconArrowUp size={18} />
            </IconButton>
          </div>

          <Breadcrumbs path={props.path} onNavigate={props.onNavigate} />

          <div class="toolbar-actions">
            <label class="search">
              <IconSearch size={15} />
              <input
                type="search"
                value={props.query}
                placeholder="搜索当前目录"
                aria-label="搜索当前目录"
                spellcheck={false}
                onInput={(event) => props.onQuery(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    props.onQuery("");
                    event.currentTarget.blur();
                  }
                }}
              />
              <Show when={props.query !== ""}>
                <button
                  type="button"
                  class="search-clear"
                  aria-label="清除搜索"
                  onClick={() => props.onQuery("")}
                >
                  <IconClose size={11} />
                </button>
              </Show>
            </label>

            <button
              ref={sortButton}
              type="button"
              class="toolbar-button sort-button"
              aria-haspopup="menu"
              aria-label={`排序：${sortLabels[props.sort.key]}，${props.sort.asc ? "升序" : "降序"}`}
              onClick={openSortMenu}
            >
              <IconSort size={16} />
              <span class="sort-label">{sortLabels[props.sort.key]}</span>
              {props.sort.asc ? (
                <IconArrowUp size={12} />
              ) : (
                <IconArrowDown size={12} />
              )}
            </button>

            <div class="segmented" role="group" aria-label="视图方式">
              <span
                class={[
                  "segmented-indicator",
                  { "segmented-indicator--grid": props.layout === "grid" },
                ]}
              />
              <button
                type="button"
                class={["segment", { active: props.layout === "list" }]}
                aria-pressed={props.layout === "list" ? "true" : "false"}
                aria-label="列表视图"
                title="列表"
                onClick={() => props.onLayout("list")}
              >
                <IconList size={16} />
              </button>
              <button
                type="button"
                class={["segment", { active: props.layout === "grid" }]}
                aria-pressed={props.layout === "grid" ? "true" : "false"}
                aria-label="网格视图"
                title="网格"
                onClick={() => props.onLayout("grid")}
              >
                <IconGrid size={16} />
              </button>
            </div>

            <IconButton
              label="重新载入"
              class={props.loading ? "is-loading" : undefined}
              onClick={props.onRefresh}
            >
              <IconRefresh size={17} />
            </IconButton>
          </div>
        </div>
      </header>

      <Show when={sortMenu()}>
        {(position) => (
          <Menu
            x={position().x}
            y={position().y}
            items={sortItems()}
            onClose={() => setSortMenu(null)}
          />
        )}
      </Show>
    </>
  );
}
