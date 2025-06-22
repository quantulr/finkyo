declare enum LayoutType {
  Table = "table",
  Grid = "grid",
}

declare interface SavedPositionItem {
  path: string;
  top?: number;
  layout: LayoutType;
}
