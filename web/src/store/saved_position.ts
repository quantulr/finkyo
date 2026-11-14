import { createRoot, createSignal } from "solid-js";

const createSavedPositionStore = () => {
  const [savedPositionList, setSavedPositionList] = createSignal<
    Map<string, SavedPositionItem>
  >(new Map());

  const pushSavedPosition = ({
    path,
    top,
    layout,
  }: {
    path: string;
    top?: number;
    layout: LayoutType;
  }) => {
    setSavedPositionList((prev) => {
      const next = new Map(prev);
      next.set(`${path}-${layout}`, { path, top, layout });
      return next;
    });
  };

  return {
    savedPositionList,
    pushSavedPosition,
  };
};

export default createRoot(createSavedPositionStore);
