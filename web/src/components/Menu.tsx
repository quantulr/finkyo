import { For, onSettled } from "solid-js";
import type { JSX } from "@solidjs/web";
import { IconCheck } from "../icons";

export interface MenuItem {
  label: string;
  icon?: JSX.Element;
  shortcut?: string;
  checked?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

interface MenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function Menu(props: MenuProps) {
  let menu: HTMLDivElement | undefined;

  onSettled(() => {
    const element = menu;
    if (!element) return;

    const padding = 8;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const left = Math.min(
      Math.max(padding, props.x),
      Math.max(padding, window.innerWidth - width - padding),
    );
    const top = Math.min(
      Math.max(padding, props.y),
      Math.max(padding, window.innerHeight - height - padding),
    );
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;

    const buttons = () =>
      Array.from(element.querySelectorAll<HTMLButtonElement>(".menu-item"));
    buttons()[0]?.focus({ preventScroll: true });

    const onPointerDown = (event: PointerEvent) => {
      if (!element.contains(event.target as Node)) props.onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        props.onClose();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const list = buttons();
      const index = list.indexOf(document.activeElement as HTMLButtonElement);
      const delta = event.key === "ArrowDown" ? 1 : -1;
      list[(index + delta + list.length) % list.length]?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  });

  return (
    <>
      <div class="menu-scrim" />
      <div
        ref={menu}
        class="menu"
        role="menu"
        style={{ left: `${props.x}px`, top: `${props.y}px` }}
      >
        <For each={props.items}>
          {(item) => (
            <button
              type="button"
              class={["menu-item", { danger: item.danger }]}
              role="menuitem"
              onClick={() => {
                props.onClose();
                item.onSelect();
              }}
            >
              <span class="menu-icon">{item.icon}</span>
              <span class="menu-label">{item.label}</span>
              {item.checked ? (
                <span class="menu-check">
                  <IconCheck size={15} />
                </span>
              ) : item.shortcut ? (
                <span class="menu-shortcut">{item.shortcut}</span>
              ) : null}
            </button>
          )}
        </For>
      </div>
    </>
  );
}
