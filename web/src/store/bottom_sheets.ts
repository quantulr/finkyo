import { createRoot, createSignal } from "solid-js";

const createBottomSheetsStore = () => {
  const [showBottomSheets, setShowBottomSheets] = createSignal(false);
  return {
    showBottomSheets,
    setShowBottomSheets,
  };
};

export default createRoot(createBottomSheetsStore);
