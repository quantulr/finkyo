import { createSign } from "crypto";
import { createRoot, createSignal } from "solid-js";
export enum LayoutType {
  Table = "table",
  Grid = "grid",
}
const createLayoutTypeStore = () => {
  const [layout, setLayout] = createSignal<LayoutType>(LayoutType.Grid);
  return {
    layout,
    setLayout,
  };
};

export default createRoot(createLayoutTypeStore);
