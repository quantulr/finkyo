import {
  IconArrowRight,
  IconChevronRight,
  IconHome,
} from "@tabler/icons-solidjs";
import { useNavigate, useParams } from "@solidjs/router";
import { createMemo, onCleanup, onMount } from "solid-js";

import { createOverlayScrollbars } from "overlayscrollbars-solid";

const BreadcrumbNavigation = () => {
  const navigate = useNavigate();
  const params: { path: string } = useParams();
  let scrollRef: HTMLDivElement | undefined;
  const links = createMemo(
    () =>
      params.path?.split("/")?.map((link) => ({
        path: link,
        label: decodeURIComponent(link),
      })) ?? [],
  );

  const [initialize, instance] = createOverlayScrollbars({
    options: {
      scrollbars: {
        autoHide: "leave",
      },
    },
  });
  onMount(() => {
    if (scrollRef) {
      initialize(scrollRef);
    }
  });
  onCleanup(() => {
    instance()?.destroy();
  });
  return (
    <div ref={scrollRef}>
      <div class={"flex h-10 min-w-max shrink-0 items-center truncate"}>
        <button
          onClick={() => {
            navigate(`/browse`);
          }}
          class={
            "flex cursor-pointer items-center rounded-lg px-1 py-0.5 transition-all hover:bg-gray-300"
          }
        >
          <IconHome />
        </button>
        {links().length && <Separator />}
        {links().length &&
          links()
            .map((link, index) => (
              <BreadcrumbNavigationItem
                path={"txt"}
                label={link.label}
                onClick={() => {
                  const path = links()
                    .slice(0, index + 1)
                    .map((link) => link.path)
                    .join("/");
                  navigate(`/browse/${path}`);
                }}
              />
            ))
            .reduce((prev, cur) => [prev, <Separator />, cur])}
      </div>
    </div>
  );
};

const BreadcrumbNavigationItem = ({
  path,
  label,
  onClick,
}: {
  path: string;
  label: string;
  onClick: () => void;
}) => {
  return (
    <div
      class={
        "flex cursor-pointer items-center rounded-lg px-1 py-0.5 transition-all hover:bg-gray-300"
      }
      onClick={onClick}
    >
      {label}
    </div>
  );
};

const Separator = () => {
  return <IconChevronRight class={"mx-0.5 size-4"} />;
};

export default BreadcrumbNavigation;
