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
    setSavedPositionList((prev) =>
      prev.set(`${path}-${layout}`, { path, top, layout }),
    );
  };
  return {
    savedPositionList,
    pushSavedPosition,
  };
};

export default createRoot(createSavedPositionStore);
