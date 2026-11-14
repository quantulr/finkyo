export type EntryKind =
  "file" | "directory" | "symlink" | "symlinkDir" | "symlinkFile";

export interface Entry {
  name: string;
  type: EntryKind;
  size: number;
  modified: number;
}

export interface ListResponse {
  path: string;
  parent: string | null;
  entries: Entry[];
}

export type SortKey = "name" | "size" | "modified";

export interface SortState {
  key: SortKey;
  asc: boolean;
}

export type Layout = "list" | "grid";

export type Route =
  | { kind: "browse"; path: string }
  | { kind: "view"; path: string }
  | { kind: "play"; path: string };

export interface MediaItem {
  name: string;
  path: string;
}
