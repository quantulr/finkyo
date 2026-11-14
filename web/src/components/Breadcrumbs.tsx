import { For, createMemo } from "solid-js";
import { IconChevronRight, IconHome } from "../icons";

interface BreadcrumbsProps {
  path: string;
  onNavigate: (path: string) => void;
}

interface Crumb {
  label: string;
  path: string;
  current: boolean;
}

export default function Breadcrumbs(props: BreadcrumbsProps) {
  const crumbs = createMemo<Crumb[]>(() => {
    const segments = props.path.split("/").filter(Boolean);
    const list: Crumb[] = [
      { label: "根目录", path: "", current: segments.length === 0 },
    ];
    let accumulated = "";
    for (const segment of segments) {
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;
      list.push({ label: segment, path: accumulated, current: false });
    }
    if (list.length > 1) list[list.length - 1].current = true;
    return list;
  });

  return (
    <nav class="breadcrumbs" aria-label="当前位置">
      <For each={crumbs()}>
        {(crumb, index) => (
          <>
            {index() > 0 ? (
              <span class="crumb-separator" aria-hidden="true">
                <IconChevronRight size={12} />
              </span>
            ) : null}
            {crumb.current ? (
              <span class="crumb crumb--current" aria-current="page">
                {index() === 0 ? <IconHome size={14} /> : null}
                <span class="crumb-label">{crumb.label}</span>
              </span>
            ) : (
              <button
                type="button"
                class="crumb"
                onClick={() => props.onNavigate(crumb.path)}
              >
                {index() === 0 ? <IconHome size={14} /> : null}
                <span class="crumb-label">{crumb.label}</span>
              </button>
            )}
          </>
        )}
      </For>
    </nav>
  );
}
