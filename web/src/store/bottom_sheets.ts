import { createRoot, createSignal } from "solid-js";

const createBottomSheetsStore = () => {
  const [showBottomSheets, setShowBottomSheets] = createSignal(false);
  const [entry, setEntry] = createSignal<FileEntryItem>();
  const openBottomSheets = ({ file }: { file: FileEntryItem }) => {
    setEntry(entry);
    setShowBottomSheets(true);
  };
  const closeBottomSheets = () => {
    setEntry(undefined);
    setShowBottomSheets(false);
  };
  return {
    showBottomSheets,
    entry,
    openBottomSheets,
    closeBottomSheets,
  };
};

export default createRoot(createBottomSheetsStore);
