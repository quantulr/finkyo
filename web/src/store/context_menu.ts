import { createRoot, createSignal } from "solid-js";

export enum OpenType {
  BottomSheets = "BottomSheets",
  ContextMenu = "ContextMenu",
}

const createContextMenuStore = () => {
  const [pos, setPos] = createSignal({
    x: 0,
    y: 0,
  });
  const [entry, setEntry] = createSignal<FileEntryItem>();
  const [actions, setActions] = createSignal<string[]>();
  const [openType, setOpenType] = createSignal<OpenType>(OpenType.ContextMenu);
  const [showContextMenu, setShowContextMenu] = createSignal<boolean>(false);
  const closeContextMenu = () => {
    setEntry(undefined);
    setActions(undefined);
    setShowContextMenu(false);
  };
  const openContextMenu = ({
    pos,
    entry,
    // actions,
    openType = OpenType.ContextMenu,
  }: {
    pos?: {
      x: number;
      y: number;
    };
    entry: FileEntryItem;
    // actions: string[];
    openType?: OpenType;
  }) => {
    if (openType === OpenType.ContextMenu) {
      setPos(pos!);
    }
    let actions: string[];
    // actions
    if ((entry.entryType as string) === "Directory") {
      actions = [];
    } else {
      actions = ["download"];
    }
    setOpenType(openType);
    setEntry(entry);
    setActions(actions);
    setShowContextMenu(true);
  };
  return {
    pos,
    showContextMenu,
    closeContextMenu,
    openContextMenu,
    openType,
    actions,
    entry,
  };
};

export default createRoot(createContextMenuStore);
