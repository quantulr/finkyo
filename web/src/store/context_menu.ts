import { createRoot, createSignal } from "solid-js";

const createContextMenuStore = () => {
  const [pos, setPos] = createSignal({
    x: 0,
    y: 0,
  });
  const [entry, setEntry] = createSignal<string>();
  const [actions, setActions] = createSignal<string[]>();
  const [showContextMenu, setShowContextMenu] = createSignal<boolean>(false);
  const closeContextMenu = () => {
    setShowContextMenu(false);
  };
  const openContextMenu = ({
    pos,
    entry,
    actions,
  }: {
    pos: {
      x: number;
      y: number;
    };
    entry: string;
    actions: string[];
  }) => {
    setPos(pos);
    setEntry(entry);
    setActions(actions);
    setShowContextMenu(true);
  };
  return {
    pos,
    showContextMenu,
    closeContextMenu,
    openContextMenu,
    actions,
    entry,
  };
};

export default createRoot(createContextMenuStore);
