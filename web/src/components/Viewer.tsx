import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onSettled,
} from "solid-js";
import type { MediaItem } from "../types";
import { downloadFile, downloadUrl, rawUrl } from "../lib/api";
import { baseName } from "../lib/path";
import {
  pushSample,
  project,
  prefersReducedMotion,
  rubberband,
  spring,
  velocityOf,
  type MotionSample,
} from "../lib/motion";
import { IconClose, IconDownload, IconExternal } from "../icons";
import IconButton from "./IconButton";

interface ViewerProps {
  items: MediaItem[];
  path: string;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

type GestureMode = "pending" | "horizontal" | "vertical" | "pan" | "pinch";

interface Gesture {
  mode: GestureMode;
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
  startedAt: number;
  samples: MotionSample[];
}

interface Pinch {
  distance: number;
  scale: number;
  midX: number;
  midY: number;
  panX: number;
  panY: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function ViewerImage(props: {
  item: MediaItem | undefined;
  active: boolean;
  zoom: number;
  panX: number;
  panY: number;
  dragging: boolean;
}) {
  const [loaded, setLoaded] = createSignal(false);
  const [failed, setFailed] = createSignal(false);

  createEffect(
    () => props.item?.path,
    () => {
      setLoaded(false);
      setFailed(false);
    },
  );

  return (
    <Show when={props.item}>
      {(item) => (
        <div
          class="viewer-plane"
          style={{
            transform: props.active
              ? `translate3d(${props.panX}px, ${props.panY}px, 0) scale(${props.zoom})`
              : undefined,
            transition: props.dragging ? "none" : undefined,
          }}
        >
          <Show
            when={!failed()}
            fallback={<div class="viewer-image-error">无法显示这张图片</div>}
          >
            <img
              class={["viewer-image", { "viewer-image--loaded": loaded() }]}
              src={rawUrl(item().path)}
              alt={item().name}
              draggable={false}
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          </Show>
        </div>
      )}
    </Show>
  );
}

export default function Viewer(props: ViewerProps) {
  let stage: HTMLDivElement | undefined;
  let closeTimer = 0;

  const initialIndex = Math.max(
    0,
    props.items.findIndex((item) => item.path === props.path),
  );
  const [index, setIndex] = createSignal(initialIndex);
  const [offsetX, setOffsetX] = createSignal(0);
  const [offsetY, setOffsetY] = createSignal(0);
  const [zoom, setZoom] = createSignal(1);
  const [panX, setPanX] = createSignal(0);
  const [panY, setPanY] = createSignal(0);
  const [dragging, setDragging] = createSignal(false);
  const [chromeVisible, setChromeVisible] = createSignal(true);
  const [entered, setEntered] = createSignal(false);
  const [closing, setClosing] = createSignal(false);

  let cancelSpring: (() => void) | null = null;
  let gesture: Gesture | null = null;
  let pinch: Pinch | null = null;
  let chromeWasVisible = true;
  const pointers = new Map<number, { x: number; y: number }>();

  const stopSpring = () => {
    cancelSpring?.();
    cancelSpring = null;
  };

  const stageWidth = () => stage?.clientWidth ?? window.innerWidth;
  const stageHeight = () => stage?.clientHeight ?? window.innerHeight;
  const hasPrev = () => index() > 0;
  const hasNext = () => index() < props.items.length - 1;
  const currentItem = () => props.items[index()];
  const previousItem = () => props.items[index() - 1];
  const nextItem = () => props.items[index() + 1];

  const backdropOpacity = () =>
    Math.max(0.2, 1 - Math.min(1, Math.abs(offsetY()) / 600) * 0.72);

  const chromeOpacity = () => {
    if (!chromeVisible() || closing()) return 0;
    return Math.max(0, 1 - Math.abs(offsetY()) / 260);
  };

  const resetTransform = () => {
    stopSpring();
    setOffsetX(0);
    setOffsetY(0);
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  createEffect(
    () => {
      const signature = props.items.map((item) => item.path).join("\u0000");
      return `${signature}\u0001${props.path}`;
    },
    () => {
      const found = props.items.findIndex((item) => item.path === props.path);
      if (found >= 0 && found !== index()) {
        setIndex(found);
        resetTransform();
      }
    },
  );

  createEffect(
    () => index(),
    (current) => {
      for (const delta of [-1, 1]) {
        const item = props.items[current + delta];
        if (!item) continue;
        const image = new Image();
        image.src = rawUrl(item.path);
      }
    },
  );

  const clampPan = () => {
    const limitX = (stageWidth() * (zoom() - 1)) / 2;
    const limitY = (stageHeight() * (zoom() - 1)) / 2;
    setPanX(clamp(panX(), -limitX, limitX));
    setPanY(clamp(panY(), -limitY, limitY));
  };

  const settleZoom = () => {
    if (zoom() < 1.04) {
      setZoom(1);
      setPanX(0);
      setPanY(0);
    } else {
      clampPan();
    }
  };

  const animateToIndex = (direction: 1 | -1, velocity = 0) => {
    if (direction === 1 ? !hasNext() : !hasPrev()) return;
    const next = index() + direction;
    stopSpring();
    setZoom(1);
    setPanX(0);
    setPanY(0);
    const target = -direction * stageWidth();
    cancelSpring = spring(offsetX(), target, {
      velocity,
      damping: 1,
      response: 0.34,
      onUpdate: setOffsetX,
      onComplete: () => {
        cancelSpring = null;
        setOffsetX(0);
        setIndex(next);
        setChromeVisible(chromeWasVisible);
        const item = props.items[next];
        if (item) props.onNavigate(item.path);
      },
    });
  };

  const dismiss = (velocity = 0) => {
    if (closing()) return;
    setClosing(true);
    const target =
      (offsetY() >= 0 ? 1 : -1) * Math.max(stageHeight() * 0.8, 320);
    stopSpring();
    cancelSpring = spring(offsetY(), target, {
      velocity,
      damping: 0.9,
      response: 0.3,
      onUpdate: setOffsetY,
      onComplete: () => {
        cancelSpring = null;
        props.onClose();
      },
    });
  };

  const close = () => {
    if (closing()) return;
    setClosing(true);
    stopSpring();
    const delay = prefersReducedMotion() ? 0 : 180;
    closeTimer = window.setTimeout(() => props.onClose(), delay);
  };

  const downloadCurrent = () => {
    const item = currentItem();
    if (!item) return;
    downloadFile(downloadUrl(item.path), baseName(item.path));
  };

  const openCurrent = () => {
    const item = currentItem();
    if (!item) return;
    window.open(rawUrl(item.path), "_blank", "noopener,noreferrer");
  };

  const toggleZoom = (clientX: number, clientY: number) => {
    if (zoom() > 1.01) {
      setZoom(1);
      setPanX(0);
      setPanY(0);
      return;
    }
    const rect = stage?.getBoundingClientRect();
    if (!rect) return;
    const scale = 2.2;
    const relativeX = clientX - rect.left - rect.width / 2;
    const relativeY = clientY - rect.top - rect.height / 2;
    setZoom(scale);
    setPanX(-relativeX * (scale - 1));
    setPanY(-relativeY * (scale - 1));
    clampPan();
  };

  const startPinch = () => {
    const points = Array.from(pointers.values());
    if (points.length < 2) return;
    setOffsetX(0);
    setOffsetY(0);
    const [first, second] = points;
    pinch = {
      distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
      scale: zoom(),
      midX: (first.x + second.x) / 2,
      midY: (first.y + second.y) / 2,
      panX: panX(),
      panY: panY(),
    };
    gesture = null;
  };

  const updatePinch = () => {
    if (!pinch) return;
    const points = Array.from(pointers.values());
    if (points.length < 2) return;
    const [first, second] = points;
    const distance = Math.max(
      1,
      Math.hypot(second.x - first.x, second.y - first.y),
    );
    const midX = (first.x + second.x) / 2;
    const midY = (first.y + second.y) / 2;
    const nextScale = clamp(pinch.scale * (distance / pinch.distance), 1, 4);
    setZoom(nextScale);
    setPanX(pinch.panX + (midX - pinch.midX));
    setPanY(pinch.panY + (midY - pinch.midY));
    clampPan();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (closing()) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    stage?.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stopSpring();
    setDragging(true);
    chromeWasVisible = chromeVisible();

    if (pointers.size >= 2) {
      startPinch();
      return;
    }

    gesture = {
      mode: "pending",
      startX: event.clientX,
      startY: event.clientY,
      startPanX: panX(),
      startPanY: panY(),
      startedAt: performance.now(),
      samples: [
        { time: performance.now(), x: event.clientX, y: event.clientY },
      ],
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pinch && pointers.size >= 2) {
      updatePinch();
      return;
    }
    if (!gesture) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    pushSample(gesture.samples, {
      time: performance.now(),
      x: event.clientX,
      y: event.clientY,
    });

    if (gesture.mode === "pending") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (zoom() > 1.01) gesture.mode = "pan";
      else
        gesture.mode = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      if (gesture.mode !== "pan") setChromeVisible(false);
    }

    if (gesture.mode === "pan") {
      const limitX = (stageWidth() * (zoom() - 1)) / 2;
      const limitY = (stageHeight() * (zoom() - 1)) / 2;
      setPanX(clamp(gesture.startPanX + dx, -limitX, limitX));
      setPanY(clamp(gesture.startPanY + dy, -limitY, limitY));
      return;
    }

    if (gesture.mode === "horizontal") {
      let value = dx;
      if ((dx > 0 && !hasPrev()) || (dx < 0 && !hasNext())) {
        value = rubberband(dx, stageWidth());
      }
      setOffsetX(value);
      return;
    }

    if (gesture.mode === "vertical") {
      setOffsetY(dy);
    }
  };

  const beginDragFromRemaining = () => {
    const point = Array.from(pointers.values())[0];
    if (!point) return;
    gesture = {
      mode: "pending",
      startX: point.x,
      startY: point.y,
      startPanX: panX(),
      startPanY: panY(),
      startedAt: performance.now(),
      samples: [{ time: performance.now(), x: point.x, y: point.y }],
    };
  };

  const finishPointer = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);

    if (pinch) {
      if (pointers.size >= 2) {
        startPinch();
        return;
      }
      pinch = null;
      if (pointers.size === 1) {
        beginDragFromRemaining();
        return;
      }
      setDragging(false);
      settleZoom();
      return;
    }

    if (!gesture) {
      if (pointers.size === 0) setDragging(false);
      return;
    }

    const currentGesture = gesture;
    gesture = null;
    setDragging(false);

    if (currentGesture.mode === "pan") {
      clampPan();
      return;
    }

    if (currentGesture.mode === "horizontal") {
      const velocity = velocityOf(currentGesture.samples, "x");
      const projected = offsetX() + project(velocity);
      const width = stageWidth();
      if (projected < -width * 0.28 && hasNext()) {
        animateToIndex(1, velocity);
      } else if (projected > width * 0.28 && hasPrev()) {
        animateToIndex(-1, velocity);
      } else {
        cancelSpring = spring(offsetX(), 0, {
          velocity,
          damping: 0.86,
          response: 0.32,
          onUpdate: setOffsetX,
          onComplete: () => {
            cancelSpring = null;
            setChromeVisible(chromeWasVisible);
          },
        });
      }
      return;
    }

    if (currentGesture.mode === "vertical") {
      const velocity = velocityOf(currentGesture.samples, "y");
      if (Math.abs(offsetY()) > 140 || Math.abs(velocity) > 900) {
        dismiss(velocity);
      } else {
        cancelSpring = spring(offsetY(), 0, {
          velocity,
          damping: 0.86,
          response: 0.34,
          onUpdate: setOffsetY,
          onComplete: () => {
            cancelSpring = null;
            setChromeVisible(chromeWasVisible);
          },
        });
      }
      return;
    }

    if (
      currentGesture.mode === "pending" &&
      event.type === "pointerup" &&
      performance.now() - currentGesture.startedAt < 400
    ) {
      setChromeVisible((visible) => !visible);
    }
  };

  const onPointerCancel = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    gesture = null;
    pinch = null;
    setDragging(false);
    stopSpring();
    const cancelX = spring(offsetX(), 0, {
      damping: 0.9,
      response: 0.3,
      onUpdate: setOffsetX,
    });
    const cancelY = spring(offsetY(), 0, {
      damping: 0.9,
      response: 0.3,
      onUpdate: setOffsetY,
      onComplete: () => {
        setChromeVisible(true);
      },
    });
    cancelSpring = () => {
      cancelX();
      cancelY();
    };
  };

  const onDoubleClick = (event: MouseEvent) => {
    event.preventDefault();
    toggleZoom(event.clientX, event.clientY);
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const nextScale = clamp(zoom() * Math.exp(-event.deltaY * 0.0016), 1, 4);
    if (nextScale < 1.05) {
      setZoom(1);
      setPanX(0);
      setPanY(0);
    } else {
      setZoom(nextScale);
      clampPan();
    }
  };

  onSettled(() => {
    document.body.classList.add("overlay-open");
    stage?.focus({ preventScroll: true });
    requestAnimationFrame(() => setEntered(true));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          close();
          break;
        case "ArrowLeft":
          event.preventDefault();
          if (zoom() > 1.01) setPanX((value) => value + 80);
          else animateToIndex(-1);
          break;
        case "ArrowRight":
          event.preventDefault();
          if (zoom() > 1.01) setPanX((value) => value - 80);
          else animateToIndex(1);
          break;
        case "+":
        case "=":
          event.preventDefault();
          setZoom((value) => clamp(value * 1.3, 1, 4));
          clampPan();
          break;
        case "-":
          event.preventDefault();
          setZoom((value) => clamp(value / 1.3, 1, 4));
          if (zoom() < 1.05) {
            setZoom(1);
            setPanX(0);
            setPanY(0);
          } else {
            clampPan();
          }
          break;
        case "0":
          event.preventDefault();
          resetTransform();
          break;
        case "d":
        case "D":
          event.preventDefault();
          downloadCurrent();
          break;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("overlay-open");
      window.clearTimeout(closeTimer);
      stopSpring();
    });
  });

  return (
    <div
      class={[
        "viewer",
        { "viewer--open": entered(), "viewer--closing": closing() },
      ]}
      role="dialog"
      aria-modal="true"
      aria-label="图片查看器"
    >
      <div
        class="viewer-backdrop"
        style={{ opacity: String(backdropOpacity()) }}
      />

      <div
        ref={stage}
        class="viewer-stage"
        tabindex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={onPointerCancel}
        onDblClick={onDoubleClick}
        onWheel={onWheel}
      >
        <div
          class="viewer-track"
          style={{
            transform: `translate3d(calc(-33.3333% + ${offsetX()}px), ${offsetY()}px, 0)`,
          }}
        >
          <div class="viewer-slot">
            <ViewerImage
              item={previousItem()}
              active={false}
              zoom={1}
              panX={0}
              panY={0}
              dragging={dragging()}
            />
          </div>
          <div class="viewer-slot">
            <ViewerImage
              item={currentItem()}
              active={true}
              zoom={zoom()}
              panX={panX()}
              panY={panY()}
              dragging={dragging()}
            />
          </div>
          <div class="viewer-slot">
            <ViewerImage
              item={nextItem()}
              active={false}
              zoom={1}
              panX={0}
              panY={0}
              dragging={dragging()}
            />
          </div>
        </div>
      </div>

      <div
        class="viewer-chrome"
        style={{ opacity: String(chromeOpacity()) }}
        aria-hidden={chromeVisible() ? "false" : "true"}
      >
        <div class="viewer-bar viewer-bar--top">
          <IconButton label="关闭" class="viewer-button" onClick={close}>
            <IconClose size={19} />
          </IconButton>
          <div class="viewer-heading">
            <span class="viewer-name">{currentItem()?.name ?? ""}</span>
            <span class="viewer-count">
              {props.items.length > 0
                ? `${index() + 1} / ${props.items.length}`
                : ""}
            </span>
          </div>
          <div class="viewer-actions">
            <IconButton
              label="在新标签页打开"
              class="viewer-button"
              onClick={openCurrent}
            >
              <IconExternal size={18} />
            </IconButton>
            <IconButton
              label="下载"
              class="viewer-button"
              onClick={downloadCurrent}
            >
              <IconDownload size={18} />
            </IconButton>
          </div>
        </div>

        <div class="viewer-bar viewer-bar--bottom">
          <span class="viewer-hint">拖动切换 · 双击缩放 · Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
