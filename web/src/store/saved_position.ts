import { createRoot, createSignal } from "solid-js";

const createSavedPositionStore = () => {
  const [savedPositionList, setSavedPositionList] = createSignal<
    Map<string, SavedPositionItem>
  >(new Map());

  const pushSavedPosition = ({ path, top }: { path: string; top?: number }) => {
    setSavedPositionList((prev) => prev.set(path, { path, top }));
  };
  return {
    savedPositionList,
    pushSavedPosition,
  };
};

export default createRoot(createSavedPositionStore);
